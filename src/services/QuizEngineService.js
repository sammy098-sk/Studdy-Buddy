/**
 * Quiz Engine Service for Study Buddy AI.
 * Centralizes grading, timer management, score tracking, and retry mini-quiz logic
 * to ensure zero code duplication across Questionnaire Mode and Reader Practice sessions.
 */

class QuizEngineService {
  constructor() {
    this.activeSessions = new Map(); // sessionId -> sessionState
  }

  /**
   * Create a new interactive quiz session.
   */
  createSession({ sessionId = `quiz_${Date.now()}`, questions = [], examMode = true }) {
    const session = {
      sessionId,
      questions,
      examMode,
      answers: {}, // idx -> { selectedOptionId, text, isCorrect, checked, feedback }
      startTime: Date.now(),
      endTime: null,
      score: 0,
      completed: false
    };
    this.activeSessions.set(sessionId, session);
    return session;
  }

  /**
   * Get session by ID.
   */
  getSession(sessionId) {
    return this.activeSessions.get(sessionId) || null;
  }

  /**
   * Submit an option selection for an A-D MCQ question.
   */
  submitMCQAnswer(sessionId, questionIdx, optionId) {
    const session = this.getSession(sessionId);
    if (!session || !session.questions[questionIdx]) return null;

    const q = session.questions[questionIdx];
    // Find option
    let isCorrect = false;
    let feedback = '';

    if (q && Array.isArray(q.options)) {
      const selectedOpt = q.options.find(opt => opt.id === optionId);
      isCorrect = Boolean(selectedOpt?.isCorrect);
      feedback = q.explanation || (isCorrect ? "Correct! Well done." : "Incorrect. Review the textbook reading passage for core definitions.");
    }

    session.answers[questionIdx] = {
      selectedOptionId: optionId,
      isCorrect,
      checked: true,
      feedback
    };

    this.#recalculateScore(session);
    return session.answers[questionIdx];
  }

  /**
   * Submit an open-ended explanation or calculation answer.
   */
  submitOpenAnswer(sessionId, questionIdx, text, feedback, isCorrect = null) {
    const session = this.getSession(sessionId);
    if (!session || !session.questions[questionIdx]) return null;

    session.answers[questionIdx] = {
      text,
      isCorrect: isCorrect !== null ? isCorrect : text.trim().length > 10,
      checked: true,
      feedback
    };

    this.#recalculateScore(session);
    return session.answers[questionIdx];
  }

  /**
   * Internal calculation of session score and completion rate.
   */
  #recalculateScore(session) {
    let correctCount = 0;
    let checkedCount = 0;
    const total = session.questions.length;

    for (let i = 0; i < total; i++) {
      const ans = session.answers[i];
      if (ans && ans.checked) {
        checkedCount++;
        if (ans.isCorrect) correctCount++;
      }
    }

    session.score = correctCount;
    if (checkedCount === total && total > 0) {
      session.completed = true;
      if (!session.endTime) session.endTime = Date.now();
    }
  }

  /**
   * Generate a targeted retry mini-quiz containing only previously incorrect or missed items.
   */
  createRetryMiniQuiz(sessionId, newSessionId = `retry_${Date.now()}`) {
    const orig = this.getSession(sessionId);
    if (!orig) return null;

    const missedQuestions = [];
    orig.questions.forEach((q, idx) => {
      const ans = orig.answers[idx];
      if (!ans || !ans.isCorrect) {
        missedQuestions.push(q);
      }
    });

    if (missedQuestions.length === 0) return null; // Perfect score!

    return this.createSession({
      sessionId: newSessionId,
      questions: missedQuestions,
      examMode: orig.examMode
    });
  }

  /**
   * Get comprehensive summary diagnostics for a completed or in-progress quiz session.
   */
  getDiagnostics(sessionId) {
    const session = this.getSession(sessionId);
    if (!session) return { error: "Session not found" };

    const total = session.questions.length;
    const checkedCount = Object.keys(session.answers).length;
    const correct = session.score;
    const durationSeconds = Math.round(((session.endTime || Date.now()) - session.startTime) / 1000);

    return {
      sessionId,
      total,
      checkedCount,
      correct,
      percentage: total > 0 ? Math.round((correct / total) * 100) : 0,
      durationSeconds,
      completed: checkedCount === total && total > 0
    };
  }
}

export const quizEngineService = new QuizEngineService();
export default quizEngineService;
