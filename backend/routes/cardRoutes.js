import express from 'express';
import { protect } from '../middleware/auth.js';
import { createCard, reorderCards, getCard, updateCard, deleteCard } from '../controllers/cardController.js';

const router = express.Router();

router.use(protect);
router.post('/', createCard);
router.put('/reorder', reorderCards);
router.get('/:id', getCard);
router.put('/:id', updateCard);
router.delete('/:id', deleteCard);

export default router;
