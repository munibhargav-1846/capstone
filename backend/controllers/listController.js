import { List, Card, Checklist, Comment, Attachment, Activity } from '../models/index.js';
import { getBoardRole, canEdit } from '../utils/permissions.js';

export async function createList(req, res) {
  try {
    const { title, boardId } = req.body;
    if (!title || !title.trim() || !boardId) {
      return res.status(400).json({ message: 'List title and boardId are required' });
    }
    const role = await getBoardRole(boardId, req.user._id);
    if (!canEdit(role)) return res.status(403).json({ message: 'Viewers cannot create lists' });

    const existing = await List.find({ boardId, isArchived: false });
    const maxPos = existing.reduce((max, l) => Math.max(max, l.position ?? 0), -1);
    const list = await List.create({ title: title.trim(), boardId, position: maxPos + 1 });

    await Activity.create({ boardId, userId: req.user._id, action: `added list "${list.title}"`, entityType: 'list' });
    req.io.to(`board:${boardId}`).emit('list:created', { list });
    res.status(201).json({ list });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function reorderLists(req, res) {
  try {
    const { boardId, orderedIds } = req.body;
    if (!boardId || !Array.isArray(orderedIds)) {
      return res.status(400).json({ message: 'boardId and orderedIds array required' });
    }
    const role = await getBoardRole(boardId, req.user._id);
    if (!canEdit(role)) return res.status(403).json({ message: 'Viewers cannot reorder lists' });

    await Promise.all(orderedIds.map((id, i) => List.findByIdAndUpdate(id, { position: i })));
    req.io.to(`board:${boardId}`).emit('lists:reordered', { orderedIds });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function updateList(req, res) {
  try {
    const existing = await List.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'List not found' });

    const role = await getBoardRole(existing.boardId, req.user._id);
    if (!canEdit(role)) return res.status(403).json({ message: 'Viewers cannot update lists' });

    const { title, isArchived } = req.body;
    const updates = {};
    if (title !== undefined) {
      if (!title.trim()) return res.status(400).json({ message: 'List title cannot be empty' });
      updates.title = title.trim();
    }
    if (isArchived !== undefined) updates.isArchived = Boolean(isArchived);

    const list = await List.findByIdAndUpdate(existing._id, updates, { new: true });
    if (isArchived !== undefined) {
      await Activity.create({
        boardId: existing.boardId,
        userId: req.user._id,
        action: `${isArchived ? 'archived' : 'restored'} list "${list.title}"`,
        entityType: 'list',
      });
    }
    req.io.to(`board:${existing.boardId}`).emit('list:updated', { list });
    res.json({ list });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function deleteList(req, res) {
  try {
    const existing = await List.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'List not found' });

    const role = await getBoardRole(existing.boardId, req.user._id);
    if (!canEdit(role)) return res.status(403).json({ message: 'Viewers cannot delete lists' });

    const cards = await Card.find({ listId: existing._id });
    const cardIds = cards.map((c) => c._id);
    await Promise.all([
      Checklist.deleteMany({ cardId: { $in: cardIds } }),
      Comment.deleteMany({ cardId: { $in: cardIds } }),
      Attachment.deleteMany({ cardId: { $in: cardIds } }),
      Card.deleteMany({ listId: existing._id }),
      List.findByIdAndDelete(existing._id),
    ]);

    await Activity.create({
      boardId: existing.boardId,
      userId: req.user._id,
      action: `deleted list "${existing.title}"`,
      entityType: 'list',
    });
    req.io.to(`board:${existing.boardId}`).emit('list:deleted', { listId: existing._id });
    res.json({ message: 'List deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}
