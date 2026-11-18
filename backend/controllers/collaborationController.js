import fs from 'fs';
import path from 'path';
import {
  Label,
  Checklist,
  Comment,
  Attachment,
  Card,
  Board,
  BoardMember,
  Workspace,
  Notification,
  Activity,
} from '../models/index.js';
import { getBoardRole, canEdit, isAdmin } from '../utils/permissions.js';
import { UPLOADS_DIR } from '../middleware/upload.js';

// Labels
export async function createLabel(req, res) {
  try {
    const { boardId, name, color } = req.body;
    if (!boardId || !name || !name.trim() || !color) {
      return res.status(400).json({ message: 'boardId, name, and color are required' });
    }
    const role = await getBoardRole(boardId, req.user._id);
    if (!canEdit(role)) return res.status(403).json({ message: 'Permission denied' });

    const label = await Label.create({ boardId, name: name.trim(), color });
    req.io.to(`board:${boardId}`).emit('board:refresh', { boardId });
    res.status(201).json({ label });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function deleteLabel(req, res) {
  try {
    const label = await Label.findById(req.params.id);
    if (!label) return res.status(404).json({ message: 'Label not found' });

    const role = await getBoardRole(label.boardId, req.user._id);
    if (!canEdit(role)) return res.status(403).json({ message: 'Permission denied' });

    await Card.updateMany({ boardId: label.boardId }, { $pull: { labels: label._id } });
    await Label.findByIdAndDelete(label._id);
    req.io.to(`board:${label.boardId}`).emit('board:refresh', { boardId: label.boardId });
    res.json({ message: 'Label deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// Checklists
export async function createChecklist(req, res) {
  try {
    const { cardId, boardId, title } = req.body;
    if (!cardId || !boardId || !title || !title.trim()) {
      return res.status(400).json({ message: 'cardId, boardId, and title required' });
    }
    const role = await getBoardRole(boardId, req.user._id);
    if (!canEdit(role)) return res.status(403).json({ message: 'Permission denied' });

    const checklist = await Checklist.create({ cardId, boardId, title: title.trim(), items: [] });
    await Activity.create({ boardId, cardId, userId: req.user._id, action: `added checklist "${checklist.title}"`, entityType: 'checklist' });
    req.io.to(`board:${boardId}`).emit('board:refresh', { boardId });
    res.status(201).json({ checklist });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function deleteChecklist(req, res) {
  try {
    const cl = await Checklist.findById(req.params.id);
    if (!cl) return res.status(404).json({ message: 'Checklist not found' });
    const role = await getBoardRole(cl.boardId, req.user._id);
    if (!canEdit(role)) return res.status(403).json({ message: 'Permission denied' });
    await Checklist.findByIdAndDelete(cl._id);
    req.io.to(`board:${cl.boardId}`).emit('board:refresh', { boardId: cl.boardId });
    res.json({ message: 'Checklist deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function addChecklistItem(req, res) {
  try {
    const cl = await Checklist.findById(req.params.id);
    if (!cl) return res.status(404).json({ message: 'Checklist not found' });
    const role = await getBoardRole(cl.boardId, req.user._id);
    if (!canEdit(role)) return res.status(403).json({ message: 'Permission denied' });

    const { text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ message: 'Item text required' });

    cl.items.push({ text: text.trim(), isCompleted: false, position: cl.items.length });
    await cl.save();
    req.io.to(`board:${cl.boardId}`).emit('board:refresh', { boardId: cl.boardId });
    res.status(201).json({ checklist: cl });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function updateChecklistItem(req, res) {
  try {
    const cl = await Checklist.findById(req.params.id);
    if (!cl) return res.status(404).json({ message: 'Checklist not found' });
    const role = await getBoardRole(cl.boardId, req.user._id);
    if (!canEdit(role)) return res.status(403).json({ message: 'Permission denied' });

    const item = cl.items.id(req.params.itemId);
    if (!item) return res.status(404).json({ message: 'Item not found' });
    if (req.body.isCompleted !== undefined) item.isCompleted = Boolean(req.body.isCompleted);
    if (req.body.text !== undefined) item.text = req.body.text.trim();
    await cl.save();
    req.io.to(`board:${cl.boardId}`).emit('board:refresh', { boardId: cl.boardId });
    res.json({ checklist: cl });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function deleteChecklistItem(req, res) {
  try {
    const cl = await Checklist.findById(req.params.id);
    if (!cl) return res.status(404).json({ message: 'Checklist not found' });
    const role = await getBoardRole(cl.boardId, req.user._id);
    if (!canEdit(role)) return res.status(403).json({ message: 'Permission denied' });

    cl.items.pull({ _id: req.params.itemId });
    await cl.save();
    req.io.to(`board:${cl.boardId}`).emit('board:refresh', { boardId: cl.boardId });
    res.json({ checklist: cl });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// Comments
export async function createComment(req, res) {
  try {
    const { cardId, boardId, text } = req.body;
    if (!cardId || !boardId || !text || !text.trim()) {
      return res.status(400).json({ message: 'Comment text, cardId, and boardId required' });
    }
    const role = await getBoardRole(boardId, req.user._id);
    if (!canEdit(role)) return res.status(403).json({ message: 'Viewers cannot post comments' });

    const comment = await Comment.create({ cardId, boardId, authorId: req.user._id, text: text.trim() });
    const card = await Card.findById(cardId);
    await Activity.create({ boardId, cardId, userId: req.user._id, action: `commented on "${card?.title || 'card'}"`, entityType: 'comment' });

    if (card) {
      for (const uid of card.assignees || []) {
        if (String(uid) !== String(req.user._id)) {
          const notif = await Notification.create({
            recipientId: uid,
            senderId: req.user._id,
            type: 'comment',
            title: `New comment on "${card.title}"`,
            message: `${req.user.name}: "${text.trim().slice(0, 80)}"`,
            link: `/board/${boardId}?card=${cardId}`,
            boardId,
            cardId,
          });
          req.io.to(`user:${uid}`).emit('notification:new', notif);
        }
      }
    }

    req.io.to(`board:${boardId}`).emit('board:refresh', { boardId });
    res.status(201).json({ comment: { ...comment.toObject(), author: req.user } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function deleteComment(req, res) {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });
    const role = await getBoardRole(comment.boardId, req.user._id);
    if (String(comment.authorId) !== String(req.user._id) && !isAdmin(role)) {
      return res.status(403).json({ message: 'You can only delete your own comments' });
    }
    await Comment.findByIdAndDelete(comment._id);
    req.io.to(`board:${comment.boardId}`).emit('board:refresh', { boardId: comment.boardId });
    res.json({ message: 'Comment deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// Attachments
export async function uploadAttachment(req, res) {
  try {
    const card = await Card.findById(req.params.cardId);
    if (!card) return res.status(404).json({ message: 'Card not found' });
    const role = await getBoardRole(card.boardId, req.user._id);
    if (!canEdit(role)) return res.status(403).json({ message: 'Viewers cannot upload attachments' });
    if (!req.file) return res.status(400).json({ message: 'File upload required' });

    const attachment = await Attachment.create({
      cardId: card._id,
      boardId: card.boardId,
      uploadedBy: req.user._id,
      originalName: req.file.originalname,
      filename: req.file.filename,
      mimeType: req.file.mimetype,
      size: req.file.size,
      url: `/uploads/${req.file.filename}`,
    });

    await Activity.create({
      boardId: card.boardId,
      cardId: card._id,
      userId: req.user._id,
      action: `attached "${req.file.originalname}" to "${card.title}"`,
      entityType: 'attachment',
    });
    req.io.to(`board:${card.boardId}`).emit('board:refresh', { boardId: card.boardId });
    res.status(201).json({ attachment: { ...attachment.toObject(), uploader: req.user } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function deleteAttachment(req, res) {
  try {
    const att = await Attachment.findById(req.params.id);
    if (!att) return res.status(404).json({ message: 'Attachment not found' });
    const role = await getBoardRole(att.boardId, req.user._id);
    if (!canEdit(role)) return res.status(403).json({ message: 'Permission denied' });

    const filePath = path.join(UPLOADS_DIR, att.filename);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    await Attachment.findByIdAndDelete(att._id);
    req.io.to(`board:${att.boardId}`).emit('board:refresh', { boardId: att.boardId });
    res.json({ message: 'Attachment removed' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// Notifications & Due-Date Reminders
export async function listNotifications(req, res) {
  try {
    const notifications = await Notification.find({ recipientId: req.user._id }).sort({ createdAt: -1 }).lean();
    res.json({ notifications });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function checkDueReminders(req, res) {
  try {
    const userId = req.user._id;
    const cards = await Card.find({ assignees: userId, isArchived: false, isCompleted: false }).lean();
    const existing = await Notification.find({ recipientId: userId, type: 'due_reminder' }).lean();
    const now = Date.now();
    let createdCount = 0;

    for (const card of cards) {
      if (!card.dueDate) continue;
      const diffHours = (new Date(card.dueDate).getTime() - now) / (1000 * 60 * 60);
      if (diffHours <= 24) {
        const recent = existing.some(
          (n) => String(n.cardId) === String(card._id) && now - new Date(n.createdAt).getTime() < 1000 * 60 * 60 * 12
        );
        if (!recent) {
          const notif = await Notification.create({
            recipientId: userId,
            type: 'due_reminder',
            title: `Due date reminder: ${card.title}`,
            message: `Card "${card.title}" ${diffHours < 0 ? 'is overdue' : 'is due within 24 hours'}.`,
            link: `/board/${card.boardId}?card=${card._id}`,
            boardId: card.boardId,
            cardId: card._id,
          });
          req.io.to(`user:${userId}`).emit('notification:new', notif);
          createdCount++;
        }
      }
    }
    res.json({ createdCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function markNotificationRead(req, res) {
  try {
    const notif = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipientId: req.user._id },
      { isRead: true },
      { new: true }
    );
    if (!notif) return res.status(404).json({ message: 'Notification not found' });
    res.json({ notification: notif });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function markAllNotificationsRead(req, res) {
  try {
    await Notification.updateMany({ recipientId: req.user._id }, { isRead: true });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function clearReadNotifications(req, res) {
  try {
    await Notification.deleteMany({ recipientId: req.user._id, isRead: true });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// Global Search
export async function globalSearch(req, res) {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) return res.json({ boards: [], cards: [], workspaces: [] });

    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const userId = req.user._id;

    const workspaces = await Workspace.find({
      $or: [{ ownerId: userId }, { 'members.userId': userId }],
    }).lean();
    const wsIds = workspaces.map((w) => w._id);
    const memberships = await BoardMember.find({ userId }).lean();
    const memberBoardIds = memberships.map((m) => m.boardId);

    const accessibleBoards = await Board.find({
      isArchived: false,
      $or: [{ ownerId: userId }, { workspaceId: { $in: wsIds } }, { _id: { $in: memberBoardIds } }],
    }).lean();
    const boardIds = accessibleBoards.map((b) => b._id);
    const boardMap = new Map(accessibleBoards.map((b) => [String(b._id), b]));

    const matchedWorkspaces = workspaces.filter((w) => regex.test(w.name) || regex.test(w.description || '')).slice(0, 8);
    const matchedBoards = accessibleBoards.filter((b) => regex.test(b.title) || regex.test(b.description || '')).slice(0, 10);
    const matchedCards = await Card.find({
      boardId: { $in: boardIds },
      isArchived: false,
      $or: [{ title: regex }, { description: regex }],
    })
      .limit(20)
      .lean();

    res.json({
      workspaces: matchedWorkspaces,
      boards: matchedBoards,
      cards: matchedCards.map((c) => ({ ...c, boardTitle: boardMap.get(String(c.boardId))?.title || 'Board' })),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}
