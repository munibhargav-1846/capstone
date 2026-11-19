import express from 'express';
import { protect } from '../middleware/auth.js';
import {
  listBoards,
  createBoard,
  getBoard,
  updateBoard,
  toggleStarBoard,
  deleteBoard,
  inviteBoardMember,
  updateBoardMemberRole,
  removeBoardMember,
} from '../controllers/boardController.js';

const router = express.Router();

router.use(protect);
router.get('/', listBoards);
router.post('/', createBoard);
router.get('/:id', getBoard);
router.put('/:id', updateBoard);
router.post('/:id/star', toggleStarBoard);
router.delete('/:id', deleteBoard);
router.post('/:id/members', inviteBoardMember);
router.put('/:id/members/:userId', updateBoardMemberRole);
router.delete('/:id/members/:userId', removeBoardMember);

export default router;
