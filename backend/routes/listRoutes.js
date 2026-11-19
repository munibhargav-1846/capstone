import express from 'express';
import { protect } from '../middleware/auth.js';
import { createList, reorderLists, updateList, deleteList } from '../controllers/listController.js';

const router = express.Router();

router.use(protect);
router.post('/', createList);
router.put('/reorder', reorderLists);
router.put('/:id', updateList);
router.delete('/:id', deleteList);

export default router;
