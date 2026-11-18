import express from 'express';
import { protect } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import {
  createLabel,
  deleteLabel,
  createChecklist,
  deleteChecklist,
  addChecklistItem,
  updateChecklistItem,
  deleteChecklistItem,
  createComment,
  deleteComment,
  uploadAttachment,
  deleteAttachment,
  listNotifications,
  checkDueReminders,
  markNotificationRead,
  markAllNotificationsRead,
  clearReadNotifications,
  globalSearch,
} from '../controllers/collaborationController.js';

const router = express.Router();

router.use(protect);

// Labels
router.post('/labels', createLabel);
router.delete('/labels/:id', deleteLabel);

// Checklists
router.post('/checklists', createChecklist);
router.delete('/checklists/:id', deleteChecklist);
router.post('/checklists/:id/items', addChecklistItem);
router.put('/checklists/:id/items/:itemId', updateChecklistItem);
router.delete('/checklists/:id/items/:itemId', deleteChecklistItem);

// Comments
router.post('/comments', createComment);
router.delete('/comments/:id', deleteComment);

// Attachments
router.post('/attachments/:cardId', upload.single('file'), uploadAttachment);
router.delete('/attachments/:id', deleteAttachment);

// Notifications
router.get('/notifications', listNotifications);
router.post('/notifications/check-reminders', checkDueReminders);
router.put('/notifications/read-all', markAllNotificationsRead);
router.put('/notifications/:id/read', markNotificationRead);
router.delete('/notifications/clear-read', clearReadNotifications);

// Global search
router.get('/search', globalSearch);

export default router;
