import {
  getGuessNoteStatusService,
  finishGuessNoteGameService,
  getGuessNoteRankingService
} from '../services/game.service.js';

export const getGuessNoteStatus = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const status = await getGuessNoteStatusService(userId);
    res.json(status);
  } catch (error) {
    next(error);
  }
};

export const finishGuessNoteGame = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { score, isPerfectPitch } = req.body;
    const result = await finishGuessNoteGameService(userId, { score, isPerfectPitch });
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const getGuessNoteRanking = async (req, res, next) => {
  try {
    const ranking = await getGuessNoteRankingService(10);
    res.json(ranking);
  } catch (error) {
    next(error);
  }
};
