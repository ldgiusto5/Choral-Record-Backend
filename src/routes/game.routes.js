import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import {
  getGuessNoteStatus,
  finishGuessNoteGame,
  getGuessNoteRanking
} from '../controllers/game.controller.js';

const router = Router();

router.get('/guess-note/status', authMiddleware, getGuessNoteStatus);
router.post('/guess-note/finish', authMiddleware, finishGuessNoteGame);
router.get('/guess-note/ranking', getGuessNoteRanking);

export default router;
