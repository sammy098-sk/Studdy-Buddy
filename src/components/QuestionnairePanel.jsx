import React, { useState, useEffect } from 'react';
import { ChevronLeft, Loader2, Plus, Sparkles, Database, CheckCircle2 } from 'lucide-react';
import { studyToolsService } from '../services/StudyToolsService';

export default function QuestionnairePanel({ subject = "General Subject", topic = "Topic Chapter", bookId, pageNumber, onBack }) {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [error, setError] = useState(null);
  const [loadingBatch, setLoadingBatch] = useState(true);
  const [isCached, setIsCached] = useState(false);
  const MAX_QUESTIONS = 50;
  const BATCH_SIZE = 10;

  const fetchBatch = async (excludeList) => {
    setLoadingBatch(true);
    setError(null);
    try {
      const res = await studyToolsService.generateQuestions({
        bookId,
        pageNumber,
        subject,
        topic,
        count: BATCH_SIZE,
        excludeList
      });
      if (Array.isArray(res.questions)) {
        setQuestions((prev) => [...prev, ...res.questions]);
        setIsCached(Boolean(res.isCached));
      }
    } catch (e) {
      setError("Couldn't load practice questions right now — " + (e.message || "try again later."));
    } finally {
      setLoadingBatch(false);
    }
  };

  useEffect(() => {
    setQuestions([]);
    setAnswers({});
    setIsCached(false);
    fetchBatch([]);
  }, [subject, topic, bookId, pageNumber]);

  const updateAnswer = (idx, field, value) => {
    setAnswers((prev) => ({ ...prev, [idx]: { ...prev[idx], [field]: value } }));
  };

  const checkAnswer = async (idx, question) => {
    const studentAnswer = (answers[idx]?.text || "").trim();
    if (!studentAnswer) return;
    updateAnswer(idx, "checking", true);
    try {
      const feedback = await studyToolsService.checkAnswer({
        topic: topic || `Page ${pageNumber}`,
        question,
        studentAnswer
      });
      updateAnswer(idx, "feedback", feedback);
    } catch (e) {
      updateAnswer(idx, "feedback", "Couldn't evaluate answer right now — try again in a moment.");
    } finally {
      updateAnswer(idx, "checking", false);
    }
  };

  const loadMore = () => fetchBatch(questions);
  const canLoadMore = questions.length < MAX_QUESTIONS && !loadingBatch;

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 w-full">
      <div className="max-w-2xl mx-auto">
        {onBack && (
          <button onClick={onBack} className="flex items-center gap-1 text-sm mb-5 hover:text-blue-600 transition-colors font-medium" style={{ color: "#5A6B8C" }}>
            <ChevronLeft size={16} /> Back to Study Tools
          </button>
        )}

        <div className="flex items-center gap-2 mb-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border shadow-2xs" style={{ background: "#E8F1FE", borderColor: "#D4E5FA" }}>
            <Sparkles size={12} className="text-blue-600" />
            <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "#2954E5", fontFamily: "'IBM Plex Mono', monospace" }}>
              {pageNumber ? `Page ${pageNumber} Practice` : 'Questionnaire'}
            </span>
          </div>

          {isCached && (
            <div title="Served instantly from browser session cache" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-medium">
              <Database size={11} />
              <span>Cached</span>
            </div>
          )}
        </div>

        <h2 className="text-xl sm:text-2xl font-semibold mb-1" style={{ color: "#101C34", fontFamily: "'Montserrat', sans-serif" }}>
          {topic}
        </h2>
        <p className="text-sm mb-6" style={{ color: "#8493B0" }}>{questions.length} practice items prepared for your interactive revision</p>

        {error && <div className="text-sm px-4 py-3 rounded-xl border mb-4" style={{ background: "#FEF2F2", borderColor: "#FECACA", color: "#B91C1C" }}>{error}</div>}

        <div className="flex flex-col gap-4 mb-6">
          {questions.map((q, idx) => (
            <div key={idx} className="rounded-2xl border p-5 shadow-2xs transition-all hover:shadow-xs" style={{ borderColor: "#D8E3F8", background: "#FFFFFF" }}>
              <p className="text-[14px] font-semibold mb-3.5 leading-snug" style={{ color: "#101C34" }}>
                {idx + 1}. {q}
              </p>
              <div className="flex items-end gap-2">
                <textarea
                  rows={2}
                  value={answers[idx]?.text || ""}
                  onChange={(e) => updateAnswer(idx, "text", e.target.value)}
                  placeholder="Type your explanation or calculation..."
                  className="flex-1 resize-none px-3.5 py-2.5 rounded-xl text-sm outline-none border transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  style={{ borderColor: "#D8E3F8", color: "#101C34", background: "#FAFBFF" }}
                />
                <button
                  onClick={() => checkAnswer(idx, q)}
                  disabled={answers[idx]?.checking || !answers[idx]?.text?.trim()}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white transition-all shadow-2xs disabled:opacity-40 shrink-0 hover:opacity-90 active:scale-95"
                  style={{ background: "#2954E5" }}
                >
                  {answers[idx]?.checking ? <Loader2 size={15} className="animate-spin" /> : "Check Answer"}
                </button>
              </div>
              {answers[idx]?.feedback && (
                <div className="mt-3.5 p-3.5 rounded-xl text-sm bg-blue-50/70 border border-blue-100 flex items-start gap-2.5 text-blue-950">
                  <CheckCircle2 size={16} className="text-blue-600 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">{answers[idx].feedback}</div>
                </div>
              )}
            </div>
          ))}
        </div>

        {loadingBatch && (
          <div className="flex flex-col items-center gap-2 text-sm py-10 justify-center text-slate-500">
            <Loader2 size={24} className="animate-spin text-blue-600" /> 
            <span>Generating practice questions from study context...</span>
          </div>
        )}

        {canLoadMore && questions.length > 0 && (
          <button
            onClick={loadMore}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold border transition-all shadow-2xs hover:bg-blue-50/50"
            style={{ borderColor: "#D8E3F8", color: "#2954E5" }}
          >
            <Plus size={16} /> Load {Math.min(BATCH_SIZE, MAX_QUESTIONS - questions.length)} more questions
          </button>
        )}
      </div>
    </div>
  );
}
