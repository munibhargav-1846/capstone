import {
  Board,
  BoardMember,
  Workspace,
  List,
  Card,
  Label,
  Checklist,
  Comment,
  Attachment,
  Activity,
  User,
  Notification,
} from '../models/index.js';
import { getBoardRole, getWorkspaceRole, canEdit, isAdmin } from '../utils/permissions.js';

export async function listBoards(req, res) {
  try {
    const userId = req.user._id;
    const workspaces = await Workspace.find({
      $or: [{ ownerId: userId }, { 'members.userId': userId }],
    }).lean();
    const wsIds = workspaces.map((w) => w._id);
    const wsMap = new Map(workspaces.map((w) => [String(w._id), w.name]));

    const memberships = await BoardMember.find({ userId }).lean();
    const memberBoardIds = memberships.map((m) => m.boardId);

    const boards = await Board.find({
      $or: [{ ownerId: userId }, { workspaceId: { $in: wsIds } }, { _id: { $in: memberBoardIds } }],
    })
      .sort({ lastViewedAt: -1 })
      .lean();

    res.json({
      boards: boards.map((b) => ({
        ...b,
        workspaceName: wsMap.get(String(b.workspaceId)) || 'Workspace',
      })),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function createBoard(req, res) {
  try {
    const { title, description = '', workspaceId, background } = req.body;
    if (!title || !title.trim() || !workspaceId) {
      return res.status(400).json({ message: 'Board title and workspace are required' });
    }
    const wsRole = await getWorkspaceRole(workspaceId, req.user._id);
    if (!canEdit(wsRole)) {
      return res.status(403).json({ message: 'Member or Admin permission required to create boards' });
    }

    const board = await Board.create({
      title: title.trim(),
      description: description.trim(),
      workspaceId,
      ownerId: req.user._id,
      background: background || { type: 'color', value: '#F1F5F9', label: 'Slate Mist' },
    });

    await BoardMember.create({ boardId: board._id, userId: req.user._id, role: 'admin', invitedBy: req.user._id });

    await Label.insertMany([
      { boardId: board._id, name: 'Feature', color: '#2563EB' },
      { boardId: board._id, name: 'Design', color: '#0D9488' },
      { boardId: board._id, name: 'Priority', color: '#DC2626' },
      { boardId: board._id, name: 'Review', color: '#D97706' },
    ]);

    await List.insertMany([
      { title: 'To Do', boardId: board._id, position: 0 },
      { title: 'In Progress', boardId: board._id, position: 1 },
      { title: 'Done', boardId: board._id, position: 2 },
    ]);

    await Activity.create({
      boardId: board._id,
      userId: req.user._id,
      action: `created board "${board.title}"`,
      entityType: 'board',
    });

    res.status(201).json({ board });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function getBoard(req, res) {
  try {
    const role = await getBoardRole(req.params.id, req.user._id);
    if (!role) return res.status(403).json({ message: 'Access denied to this board' });

    const board = await Board.findByIdAndUpdate(
      req.params.id,
      { lastViewedAt: new Date() },
      { new: true }
    ).lean();
    if (!board) return res.status(404).json({ message: 'Board not found' });

    const [workspace, lists, cards, labels, checklists, comments, attachments, activities, boardMembers] =
      await Promise.all([
        Workspace.findById(board.workspaceId).populate('members.userId', '-passwordHash').lean(),
        List.find({ boardId: board._id }).sort({ position: 1 }).lean(),
        Card.find({ boardId: board._id }).sort({ position: 1 }).lean(),
        Label.find({ boardId: board._id }).lean(),
        Checklist.find({ boardId: board._id }).lean(),
        Comment.find({ boardId: board._id }).lean(),
        Attachment.find({ boardId: board._id }).lean(),
        Activity.find({ boardId: board._id }).populate('userId', '-passwordHash').sort({ createdAt: -1 }).limit(60).lean(),
        BoardMember.find({ boardId: board._id }).populate('userId', '-passwordHash').lean(),
      ]);

    const memberMap = new Map();
    if (workspace) {
      for (const wm of workspace.members || []) {
        if (wm.userId && typeof wm.userId === 'object') {
          memberMap.set(String(wm.userId._id), {
            userId: String(wm.userId._id),
            role: wm.role,
            user: wm.userId,
            source: 'workspace',
          });
        }
      }
    }
    for (const bm of boardMembers) {
      if (bm.userId && typeof bm.userId === 'object') {
        memberMap.set(String(bm.userId._id), {
          userId: String(bm.userId._id),
          role: bm.role,
          user: bm.userId,
          source: 'board',
        });
      }
    }

    const enrichedCards = cards.map((card) => {
      const cls = checklists.filter((c) => String(c.cardId) === String(card._id));
      const total = cls.reduce((acc, cl) => acc + (cl.items?.length || 0), 0);
      const completed = cls.reduce((acc, cl) => acc + cl.items.filter((i) => i.isCompleted).length, 0);
      return {
        ...card,
        checklistSummary: { total, completed },
        commentsCount: comments.filter((cm) => String(cm.cardId) === String(card._id)).length,
        attachmentsCount: attachments.filter((at) => String(at.cardId) === String(card._id)).length,
      };
    });

    res.json({
      board,
      workspace,
      role,
      members: Array.from(memberMap.values()),
      lists,
      cards: enrichedCards,
      labels,
      activities: activities.map((a) => ({ ...a, user: a.userId })),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function updateBoard(req, res) {
  try {
    const role = await getBoardRole(req.params.id, req.user._id);
    if (!canEdit(role)) return res.status(403).json({ message: 'Viewers cannot modify board settings' });

    const { title, description, background, isArchived } = req.body;
    const updates = {};
    if (title !== undefined) {
      if (!title.trim()) return res.status(400).json({ message: 'Board title cannot be empty' });
      updates.title = title.trim();
    }
    if (description !== undefined) updates.description = description;
    if (background !== undefined) updates.background = background;
    if (isArchived !== undefined) updates.isArchived = Boolean(isArchived);

    const board = await Board.findByIdAndUpdate(req.params.id, updates, { new: true });
    await Activity.create({ boardId: board._id, userId: req.user._id, action: 'updated board settings', entityType: 'board' });
    req.io.to(`board:${board._id}`).emit('board:updated', { board });
    res.json({ board });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function toggleStarBoard(req, res) {
  try {
    const role = await getBoardRole(req.params.id, req.user._id);
    if (!role) return res.status(403).json({ message: 'Access denied' });

    const board = await Board.findById(req.params.id);
    const uid = String(req.user._id);
    const exists = board.isStarredBy.some((id) => String(id) === uid);
    board.isStarredBy = exists
      ? board.isStarredBy.filter((id) => String(id) !== uid)
      : [...board.isStarredBy, req.user._id];
    await board.save();
    res.json({ board });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function deleteBoard(req, res) {
  try {
    const role = await getBoardRole(req.params.id, req.user._id);
    if (!isAdmin(role)) return res.status(403).json({ message: 'Only board admins can delete this board' });

    const boardId = req.params.id;
    await Promise.all([
      List.deleteMany({ boardId }),
      Card.deleteMany({ boardId }),
      Label.deleteMany({ boardId }),
      Checklist.deleteMany({ boardId }),
      Comment.deleteMany({ boardId }),
      Attachment.deleteMany({ boardId }),
      BoardMember.deleteMany({ boardId }),
      Activity.deleteMany({ boardId }),
      Board.findByIdAndDelete(boardId),
    ]);
    req.io.to(`board:${boardId}`).emit('board:deleted', { boardId });
    res.json({ message: 'Board deleted permanently' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function inviteBoardMember(req, res) {
  try {
    const role = await getBoardRole(req.params.id, req.user._id);
    if (!isAdmin(role)) return res.status(403).json({ message: 'Only board admins can invite members' });

    const { email, memberRole = 'member' } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });
    const targetUser = await User.findOne({ email: email.trim().toLowerCase() }).select('-passwordHash');
    if (!targetUser) return res.status(404).json({ message: 'No registered user found with that email' });

    const board = await Board.findById(req.params.id);
    await BoardMember.findOneAndUpdate(
      { boardId: board._id, userId: targetUser._id },
      { role: memberRole, invitedBy: req.user._id },
      { upsert: true, new: true }
    );

    const notif = await Notification.create({
      recipientId: targetUser._id,
      senderId: req.user._id,
      type: 'invite',
      title: `Invited to "${board.title}"`,
      message: `${req.user.name} invited you to board "${board.title}" with ${memberRole} access.`,
      link: `/board/${board._id}`,
      boardId: board._id,
    });
    req.io.to(`user:${targetUser._id}`).emit('notification:new', notif);

    await Activity.create({
      boardId: board._id,
      userId: req.user._id,
      action: `added ${targetUser.name} as ${memberRole}`,
      entityType: 'member',
    });
    req.io.to(`board:${board._id}`).emit('board:refresh', { boardId: board._id });

    res.status(201).json({
      member: { userId: targetUser._id, role: memberRole, user: targetUser, source: 'board' },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function updateBoardMemberRole(req, res) {
  try {
    const role = await getBoardRole(req.params.id, req.user._id);
    if (!isAdmin(role)) return res.status(403).json({ message: 'Only board admins can update permissions' });

    const { memberRole } = req.body;
    if (!['admin', 'member', 'viewer'].includes(memberRole)) {
      return res.status(400).json({ message: 'Invalid role' });
    }
    await BoardMember.findOneAndUpdate(
      { boardId: req.params.id, userId: req.params.userId },
      { role: memberRole, invitedBy: req.user._id },
      { upsert: true }
    );
    req.io.to(`board:${req.params.id}`).emit('board:refresh', { boardId: req.params.id });
    res.json({ message: 'Permission updated' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function removeBoardMember(req, res) {
  try {
    const role = await getBoardRole(req.params.id, req.user._id);
    if (!isAdmin(role)) return res.status(403).json({ message: 'Only board admins can remove members' });

    const board = await Board.findById(req.params.id);
    if (String(board.ownerId) === String(req.params.userId)) {
      return res.status(400).json({ message: 'Cannot remove board owner' });
    }
    await BoardMember.deleteMany({ boardId: req.params.id, userId: req.params.userId });
    req.io.to(`board:${req.params.id}`).emit('board:refresh', { boardId: req.params.id });
    res.json({ message: 'Member removed from board' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}
