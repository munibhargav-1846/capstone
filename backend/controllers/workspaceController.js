import {
  Workspace,
  Board,
  List,
  Card,
  Label,
  Checklist,
  Comment,
  Attachment,
  BoardMember,
  Activity,
  User,
  Notification,
} from '../models/index.js';
import { getWorkspaceRole, isAdmin } from '../utils/permissions.js';

export async function listWorkspaces(req, res) {
  try {
    const userId = req.user._id;
    const workspaces = await Workspace.find({
      $or: [{ ownerId: userId }, { 'members.userId': userId }],
    })
      .populate('members.userId', '-passwordHash')
      .sort({ createdAt: -1 })
      .lean();

    const boards = await Board.find({ workspaceId: { $in: workspaces.map((w) => w._id) }, isArchived: false }).lean();

    const enriched = workspaces.map((ws) => ({
      ...ws,
      members: ws.members.map((m) => ({
        userId: m.userId?._id || m.userId,
        role: m.role,
        joinedAt: m.joinedAt,
        user: m.userId && typeof m.userId === 'object' ? m.userId : null,
      })),
      boardCount: boards.filter((b) => String(b.workspaceId) === String(ws._id)).length,
    }));

    res.json({ workspaces: enriched });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function createWorkspace(req, res) {
  try {
    const { name, description = '', visibility = 'team' } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Workspace name is required' });
    }
    const slug = `${name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString().slice(-4)}`;
    const workspace = await Workspace.create({
      name: name.trim(),
      description: description.trim(),
      slug,
      ownerId: req.user._id,
      visibility,
      members: [{ userId: req.user._id, role: 'admin', joinedAt: new Date() }],
    });
    res.status(201).json({ workspace });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function getWorkspace(req, res) {
  try {
    const role = await getWorkspaceRole(req.params.id, req.user._id);
    if (!role) return res.status(403).json({ message: 'Access denied to workspace' });

    const ws = await Workspace.findById(req.params.id).populate('members.userId', '-passwordHash').lean();
    const boards = await Board.find({ workspaceId: ws._id }).sort({ updatedAt: -1 }).lean();

    const formattedWs = {
      ...ws,
      members: ws.members.map((m) => ({
        userId: m.userId?._id || m.userId,
        role: m.role,
        joinedAt: m.joinedAt,
        user: m.userId && typeof m.userId === 'object' ? m.userId : null,
      })),
    };

    res.json({ workspace: formattedWs, boards, role });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function updateWorkspace(req, res) {
  try {
    const role = await getWorkspaceRole(req.params.id, req.user._id);
    if (!isAdmin(role)) return res.status(403).json({ message: 'Only workspace admins can update settings' });

    const { name, description, visibility } = req.body;
    const updates = {};
    if (name !== undefined) {
      if (!name.trim()) return res.status(400).json({ message: 'Workspace name cannot be empty' });
      updates.name = name.trim();
    }
    if (description !== undefined) updates.description = description;
    if (visibility === 'private' || visibility === 'team') updates.visibility = visibility;

    const workspace = await Workspace.findByIdAndUpdate(req.params.id, updates, { new: true });
    res.json({ workspace });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function deleteWorkspace(req, res) {
  try {
    const role = await getWorkspaceRole(req.params.id, req.user._id);
    if (!isAdmin(role)) return res.status(403).json({ message: 'Only workspace admins can delete this workspace' });

    const boards = await Board.find({ workspaceId: req.params.id });
    const boardIds = boards.map((b) => b._id);
    await Promise.all([
      List.deleteMany({ boardId: { $in: boardIds } }),
      Card.deleteMany({ boardId: { $in: boardIds } }),
      Label.deleteMany({ boardId: { $in: boardIds } }),
      Checklist.deleteMany({ boardId: { $in: boardIds } }),
      Comment.deleteMany({ boardId: { $in: boardIds } }),
      Attachment.deleteMany({ boardId: { $in: boardIds } }),
      BoardMember.deleteMany({ boardId: { $in: boardIds } }),
      Activity.deleteMany({ boardId: { $in: boardIds } }),
      Board.deleteMany({ _id: { $in: boardIds } }),
      Workspace.findByIdAndDelete(req.params.id),
    ]);
    res.json({ message: 'Workspace deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function inviteWorkspaceMember(req, res) {
  try {
    const role = await getWorkspaceRole(req.params.id, req.user._id);
    if (!isAdmin(role)) return res.status(403).json({ message: 'Only workspace admins can invite members' });

    const { email, memberRole = 'member' } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });
    const targetUser = await User.findOne({ email: email.trim().toLowerCase() }).select('-passwordHash');
    if (!targetUser) return res.status(404).json({ message: 'No registered user found with that email' });

    const ws = await Workspace.findById(req.params.id);
    if (ws.members.some((m) => String(m.userId) === String(targetUser._id))) {
      return res.status(409).json({ message: 'User is already a member of this workspace' });
    }

    ws.members.push({ userId: targetUser._id, role: memberRole, joinedAt: new Date() });
    await ws.save();

    const notif = await Notification.create({
      recipientId: targetUser._id,
      senderId: req.user._id,
      type: 'invite',
      title: `Invited to ${ws.name}`,
      message: `${req.user.name} added you to workspace "${ws.name}" as ${memberRole}.`,
      link: `/workspace/${ws._id}`,
    });
    req.io.to(`user:${targetUser._id}`).emit('notification:new', notif);

    res.status(201).json({ member: { userId: targetUser._id, role: memberRole, user: targetUser } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function updateWorkspaceMemberRole(req, res) {
  try {
    const role = await getWorkspaceRole(req.params.id, req.user._id);
    if (!isAdmin(role)) return res.status(403).json({ message: 'Only workspace admins can update roles' });

    const { memberRole } = req.body;
    if (!['admin', 'member', 'viewer'].includes(memberRole)) {
      return res.status(400).json({ message: 'Invalid role' });
    }
    const ws = await Workspace.findById(req.params.id);
    const member = ws.members.find((m) => String(m.userId) === String(req.params.userId));
    if (!member) return res.status(404).json({ message: 'Member not found' });
    member.role = memberRole;
    await ws.save();
    res.json({ message: 'Member role updated' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function removeWorkspaceMember(req, res) {
  try {
    const role = await getWorkspaceRole(req.params.id, req.user._id);
    if (!isAdmin(role) && String(req.user._id) !== String(req.params.userId)) {
      return res.status(403).json({ message: 'Permission denied' });
    }
    const ws = await Workspace.findById(req.params.id);
    if (String(ws.ownerId) === String(req.params.userId)) {
      return res.status(400).json({ message: 'Cannot remove workspace owner' });
    }
    ws.members = ws.members.filter((m) => String(m.userId) !== String(req.params.userId));
    await ws.save();
    res.json({ message: 'Member removed' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}
