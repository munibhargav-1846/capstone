import { Card, List, Board, Checklist, Comment, Attachment, Activity, Notification } from '../models/index.js';
import { getBoardRole, canEdit } from '../utils/permissions.js';

export async function createCard(req, res) {
  try {
    const { title, listId, boardId, description = '' } = req.body;
    if (!title || !title.trim() || !listId || !boardId) {
      return res.status(400).json({ message: 'Card title, listId, and boardId are required' });
    }
    const role = await getBoardRole(boardId, req.user._id);
    if (!canEdit(role)) return res.status(403).json({ message: 'Viewers cannot create cards' });

    const existing = await Card.find({ listId, isArchived: false });
    const maxPos = existing.reduce((max, c) => Math.max(max, c.position ?? 0), -1);
    const card = await Card.create({
      title: title.trim(),
      description,
      boardId,
      listId,
      position: maxPos + 1,
      createdBy: req.user._id,
    });

    const list = await List.findById(listId);
    await Activity.create({
      boardId,
      cardId: card._id,
      userId: req.user._id,
      action: `added "${card.title}" to ${list?.title || 'list'}`,
      entityType: 'card',
    });

    const enrichedCard = {
      ...card.toObject(),
      checklistSummary: { total: 0, completed: 0 },
      commentsCount: 0,
      attachmentsCount: 0,
    };
    req.io.to(`board:${boardId}`).emit('card:created', { card: enrichedCard });
    res.status(201).json({ card: enrichedCard });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function reorderCards(req, res) {
  try {
    const { boardId, updates, movedCardId, fromListId, toListId } = req.body;
    if (!boardId || !Array.isArray(updates)) {
      return res.status(400).json({ message: 'boardId and updates array required' });
    }
    const role = await getBoardRole(boardId, req.user._id);
    if (!canEdit(role)) return res.status(403).json({ message: 'Viewers cannot reorder cards' });

    await Promise.all(
      updates.map((u) => Card.findByIdAndUpdate(u._id, { listId: u.listId, position: u.position }))
    );

    if (movedCardId && fromListId && toListId && String(fromListId) !== String(toListId)) {
      const [card, fromList, toList] = await Promise.all([
        Card.findById(movedCardId),
        List.findById(fromListId),
        List.findById(toListId),
      ]);
      if (card && fromList && toList) {
        await Activity.create({
          boardId,
          cardId: card._id,
          userId: req.user._id,
          action: `moved "${card.title}" from ${fromList.title} to ${toList.title}`,
          entityType: 'card',
        });
      }
    }

    req.io.to(`board:${boardId}`).emit('cards:reordered', { updates });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function getCard(req, res) {
  try {
    const card = await Card.findById(req.params.id).lean();
    if (!card) return res.status(404).json({ message: 'Card not found' });

    const role = await getBoardRole(card.boardId, req.user._id);
    if (!role) return res.status(403).json({ message: 'Access denied' });

    const [checklists, comments, attachments, activities] = await Promise.all([
      Checklist.find({ cardId: card._id }).sort({ createdAt: 1 }).lean(),
      Comment.find({ cardId: card._id }).populate('authorId', '-passwordHash').sort({ createdAt: -1 }).lean(),
      Attachment.find({ cardId: card._id }).populate('uploadedBy', '-passwordHash').sort({ createdAt: -1 }).lean(),
      Activity.find({ cardId: card._id }).populate('userId', '-passwordHash').sort({ createdAt: -1 }).lean(),
    ]);

    res.json({
      card,
      checklists,
      comments: comments.map((c) => ({ ...c, author: c.authorId, authorId: c.authorId?._id || c.authorId })),
      attachments: attachments.map((a) => ({ ...a, uploader: a.uploadedBy })),
      activities: activities.map((a) => ({ ...a, user: a.userId })),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function updateCard(req, res) {
  try {
    const existing = await Card.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Card not found' });

    const role = await getBoardRole(existing.boardId, req.user._id);
    if (!canEdit(role)) return res.status(403).json({ message: 'Viewers cannot edit cards' });

    const { title, description, assignees, labels, dueDate, isCompleted, isArchived, coverColor } = req.body;
    const updates = {};
    if (title !== undefined) {
      if (!title.trim()) return res.status(400).json({ message: 'Card title cannot be empty' });
      updates.title = title.trim();
    }
    if (description !== undefined) updates.description = description;
    if (Array.isArray(assignees)) updates.assignees = assignees;
    if (Array.isArray(labels)) updates.labels = labels;
    if (dueDate !== undefined) updates.dueDate = dueDate;
    if (isCompleted !== undefined) updates.isCompleted = Boolean(isCompleted);
    if (isArchived !== undefined) updates.isArchived = Boolean(isArchived);
    if (coverColor !== undefined) updates.coverColor = coverColor;

    const updated = await Card.findByIdAndUpdate(existing._id, updates, { new: true });

    if (Array.isArray(assignees)) {
      const oldSet = new Set(existing.assignees.map(String));
      const board = await Board.findById(existing.boardId);
      for (const uid of assignees) {
        if (!oldSet.has(String(uid)) && String(uid) !== String(req.user._id)) {
          const notif = await Notification.create({
            recipientId: uid,
            senderId: req.user._id,
            type: 'assign',
            title: `Assigned to "${updated.title}"`,
            message: `${req.user.name} assigned you to "${updated.title}" on ${board?.title || 'a board'}.`,
            link: `/board/${existing.boardId}?card=${existing._id}`,
            boardId: existing.boardId,
            cardId: existing._id,
          });
          req.io.to(`user:${uid}`).emit('notification:new', notif);
        }
      }
    }

    req.io.to(`board:${existing.boardId}`).emit('card:updated', { card: updated });
    res.json({ card: updated });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function deleteCard(req, res) {
  try {
    const existing = await Card.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Card not found' });

    const role = await getBoardRole(existing.boardId, req.user._id);
    if (!canEdit(role)) return res.status(403).json({ message: 'Viewers cannot delete cards' });

    await Promise.all([
      Checklist.deleteMany({ cardId: existing._id }),
      Comment.deleteMany({ cardId: existing._id }),
      Attachment.deleteMany({ cardId: existing._id }),
      Card.findByIdAndDelete(existing._id),
    ]);

    await Activity.create({
      boardId: existing.boardId,
      userId: req.user._id,
      action: `deleted card "${existing.title}"`,
      entityType: 'card',
    });
    req.io.to(`board:${existing.boardId}`).emit('card:deleted', { cardId: existing._id });
    res.json({ message: 'Card deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}
