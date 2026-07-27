import React, { useState, useEffect } from 'react';
import { ChevronLeft, Loader2, Plus } from 'lucide-react';
import { callClaude, parseJsonLoose } from '../utils/api';
import { STUDYBUDDY_PERSONA } from '../config';

export default function QuestionnairePanel({ subject, topic, onBack }) {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [error, setError] = useState(null);
  const [loadingBatch, setLoadingBatch] = useState(true);
  const MAX_QUESTIONS = 50;
  const BATCH_SIZE = 10;

  const fetchBatch = async (excludeList) => {
    setLoadingBatch(true);
    setError(null);
    try {
      const raw = await callClaude(
        `You are a JAMB question-bank writer. Respond ONLY with a valid JSON array of ${BATCH_SIZE} short-answer practice question strings on the given topic — no prose, no markdown fences, no numbering inside the strings. Vary difficulty from easy to hard. Do not repeat any question in this exclude list: ${JSON.stringify(excludeList)}`,
        [{ role: "user", content: `Subject: ${subject}\nTopic: ${topic}\nGenerate ${BATCH_SIZE} practice questions.` }],
        1200
      );
      const parsed = parseJsonLoose(raw);
      if (Array.isArray(parsed)) setQuestions((prev) => [...prev, ...parsed]);
    } catch (e) {
      setError("Couldn't load questions — check your connection and try again.");
    } finally {
      setLoadingBatch(false);
    }
  };

  useEffect(() => {
    setQuestions([]);
    setAnswers({});
    fetchBatch([]);
  }, [subject, topic]);

  const updateAnswer = (idx, field, value) => {
    setAnswers((prev) => ({ ...prev, [idx]: { ...prev[idx], [field]: value } }));
  };

  const checkAnswer = async (idx, question) => {
    const studentAnswer = (answers[idx]?.text || "").trim();
    if (!studentAnswer) return;
    updateAnswer(idx, "checking", true);
    try {
      const feedback = await callClaude(
        STUDYBUDDY_PERSONA + `\n\n### Task\nA student just answered a practice question. Give brief (2-3 sentences), peer-tone feedback: say whether they're right, partly right, or off track, and why. If wrong, guide them toward the right idea without just stating the answer outright first.`,
        [{ role: "user", content: `Topic: ${topic}\nQuestion: ${question}\nStudent's answer: ${studentAnswer}` }],
        300
      );
      updateAnswer(idx, "feedback", feedback);
    } catch (e) {
      updateAnswer(idx, "feedback", "Couldn't check that just now — try again in a moment.");
    } finally {
      updateAnswer(idx, "checking", false);
    }
  };

  const loadMore = () => fetchBatch(questions);
  const canLoadMore = questions.length < MAX_QUESTIONS && !loadingBatch;

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6">
      <div className="max-w-2xl mx-auto">
        <button onClick={onBack} className="flex items-center gap-1 text-sm mb-5" style={{ color: "#5A6B8C" }}>
          <ChevronLeft size={16} /> {subject} topics
        </button>

        <div className="inline-flex items-center gap-2 mb-2 px-2.5 py-1 rounded-md" style={{ background: "#E8F1FE" }}>
          <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "#2954E5", fontFamily: "'IBM Plex Mono', monospace" }}>
            Questionnaire
          </span>
        </div>
        <h2 className="text-2xl font-semibold mb-1" style={{ color: "#101C34", fontFamily: "'Montserrat', sans-serif" }}>
          {topic}
        </h2>
        <p className="text-sm mb-6" style={{ color: "#8493B0" }}>{questions.length} of up to {MAX_QUESTIONS} questions loaded</p>

        {error && <div className="text-sm px-4 py-3 rounded-lg mb-4" style={{ background: "#FEF2F2", color: "#B91C1C" }}>{error}</div>}

        <div className="flex flex-col gap-4 mb-6">
          {questions.map((q, idx) => (
            <div key={idx} className="rounded-xl border p-4" style={{ borderColor: "#D8E3F8", background: "#FAFBFF" }}>
              <p className="text-[14px] font-medium mb-3" style={{ color: "#101C34" }}>
                {idx + 1}. {q}
              </p>
              <div className="flex items-end gap-2">
                <textarea
                  rows={1}
                  value={answers[idx]?.text || ""}
                  onChange={(e) => updateAnswer(idx, "text", e.target.value)}
                  placeholder="Type your answer..."
                  className="flex-1 resize-none px-3 py-2 rounded-lg text-sm outline-none border"
                  style={{ borderColor: "#D8E3F8", color: "#101C34", background: "#FFFFFF" }}
                />
                <button
                  onClick={() => checkAnswer(idx, q)}
                  disabled={answers[idx]?.checking || !answers[idx]?.text?.trim()}
                  className="px-3 py-2 rounded-lg text-xs font-medium text-white disabled:opacity-40 shrink-0"
                  style={{ background: "#2954E5" }}
                >
                  {answers[idx]?.checking ? <Loader2 size={14} className="animate-spin" /> : "Check"}
                </button>
              </div>
              {answers[idx]?.feedback && (
                <p className="text-sm mt-3 px-3 py-2 rounded-lg" style={{ background: "#E8F1FE", color: "#101C34" }}>
                  {answers[idx].feedback}
                </p>
              )}
            </div>
          ))}
        </div>

        {loadingBatch && (
          <div className="flex items-center gap-2 text-sm py-4 justify-center" style={{ color: "#8493B0" }}>
            <Loader2 size={16} className="animate-spin" /> Generating questions...
          </div>
        )}

        {canLoadMore && questions.length > 0 && (
          <button
            onClick={loadMore}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium border"
            style={{ borderColor: "#D8E3F8", color: "#2954E5" }}
          >
            <Plus size={16} /> Load {Math.min(BATCH_SIZE, MAX_QUESTIONS - questions.length)} more questions
          </button>
        )}
      </div>
    </div>
  );
}
