import { supabase } from '../database/connection.js';

/**
 * Gets game status for user, including whether they played today
 */
export const getGuessNoteStatusService = async (userId) => {
  const { data: user, error } = await supabase
    .from('users')
    .select('id, guess_note_score, guess_note_streak, guess_note_last_date, guess_note_perfect_pitch')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!user) throw new Error('Usuario no encontrado');

  const todayStr = new Date().toISOString().split('T')[0];
  const lastDateStr = user.guess_note_last_date ? String(user.guess_note_last_date).split('T')[0] : null;
  const playedToday = lastDateStr === todayStr;

  return {
    score: user.guess_note_score || 0,
    streak: user.guess_note_streak || 0,
    lastDate: lastDateStr,
    perfectPitchToday: playedToday ? Boolean(user.guess_note_perfect_pitch) : false,
    playedToday
  };
};

/**
 * Submits game result for today's Guess Note game
 */
export const finishGuessNoteGameService = async (userId, gameResult) => {
  const { score = 0, isPerfectPitch = false } = gameResult;

  const { data: user, error: userErr } = await supabase
    .from('users')
    .select('id, guess_note_score, guess_note_streak, guess_note_last_date, guess_note_perfect_pitch')
    .eq('id', userId)
    .maybeSingle();

  if (userErr) throw userErr;
  if (!user) throw new Error('Usuario no encontrado');

  const todayStr = new Date().toISOString().split('T')[0];
  const lastDateStr = user.guess_note_last_date ? String(user.guess_note_last_date).split('T')[0] : null;

  // Check if already played today
  if (lastDateStr === todayStr) {
    return {
      alreadyPlayed: true,
      score: user.guess_note_score || 0,
      streak: user.guess_note_streak || 0,
      perfectPitchToday: Boolean(user.guess_note_perfect_pitch),
      playedToday: true,
      message: 'Ya has completado tu partida de hoy.'
    };
  }

  // Calculate streak: check if yesterday was last played date
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  let newStreak = 1;
  if (lastDateStr === yesterdayStr) {
    newStreak = (user.guess_note_streak || 0) + 1;
  }

  const newScore = (user.guess_note_score || 0) + Number(score);

  // Update user in Supabase
  const { error: updateErr } = await supabase
    .from('users')
    .update({
      guess_note_score: newScore,
      guess_note_streak: newStreak,
      guess_note_last_date: todayStr,
      guess_note_perfect_pitch: Boolean(isPerfectPitch)
    })
    .eq('id', userId);

  if (updateErr) throw updateErr;

  return {
    alreadyPlayed: false,
    score: newScore,
    streak: newStreak,
    perfectPitchToday: Boolean(isPerfectPitch),
    playedToday: true,
    pointsAdded: Number(score)
  };
};

/**
 * Gets top ranking of players ordered by guess_note_score
 */
export const getGuessNoteRankingService = async (limit = 10) => {
  const { data, error } = await supabase
    .from('users')
    .select('id, username, name, user_image, guess_note_score, guess_note_streak, guess_note_perfect_pitch')
    .order('guess_note_score', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
};
