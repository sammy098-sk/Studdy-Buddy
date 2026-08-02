import React, { useState, useEffect } from 'react';
import { ChevronLeft, Loader2, Plus, Sparkles, Database, CheckCircle2, XCircle, RefreshCw, Award, HelpCircle } from 'lucide-react';
import { studyToolsService } from '../services/StudyToolsService';
import { quizEngineService } from '../services/QuizEngineService';
import ScopeSelector from './ScopeSelector';

export default function QuestionnairePanel({ subject = "General Subject", topic = "Topic Chapter", bookId, pageNumber, initialScope = "page", onScopeChange, onBack }) {
  const [scope, setScope] = useState(initialScope);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [error, setError] = useState(null);
  const [loadingBatch, setLoadingBatch] = useState(true);
  const [isCached, setIsCached] = useState(false);
  const [sessionId, setSessionId] = useState(`quiz_${Date.now()}`);
  const [diagnostics, setDiagnostics] = useState({ correct: 0, checkedCount: 0, percentage: 0 });

  const MAX_QUESTIONS = 30;
  const BATCH_SIZE = 5;

  const handleScopeChange = (newScope) => {
    setScope(newScope);
    if (onScopeChange) onScopeChange(newScope);
  };

  const fetchBatch = async (excludeList, currentScope = scope) => {
    setLoadingBatch(true);
    setError(null);
    try {
      const res = await studyToolsService.generateQuestions({
        bookId,
        pageNumber,
        subject,
        topic,
        scope: currentScope,
        count: BATCH_SIZE,
        examMode: true,
        excludeList
      });
      if (Array.isArray(res.questions)) {
        const updatedQuestions = [...questions, ...res.questions];
        setQuestions(updatedQuestions);
        setIsCached(Boolean(res.isCached));
        
        // Register or sync with QuizEngineService
        quizEngineService.createSession({
          sessionId,
          questions: updatedQuestions,
          examMode: true
        });
      }
    } catch (e) {
      setError("Couldn't load practice questions right now — " + (e.message || "try again later."));
    } finally {
      setLoadingBatch(false);
    }
  };

  useEffect(() => {
    const newId = `quiz_${Date.now()}`;
    setSessionId(newId);
    setQuestions([]);
    setAnswers({});
    setIsCached(false);
    setDiagnostics({ correct: 0, checkedCount: 0, percentage: 0 });
    fetchBatch([], scope);
  }, [subject, topic, bookId, pageNumber, scope]);

  const handleMCQSelect = (idx, optionId) => {
    if (answers[idx]?.checked) return; // already locked
    const ans = quizEngineService.submitMCQAnswer(sessionId, idx, optionId);
    if (ans) {
      setAnswers((prev) => ({ ...prev, [idx]: ans }));
      setDiagnostics(quizEngineService.getDiagnostics(sessionId));
    }
  };

  const checkOpenAnswer = async (idx, questionText) => {
    const studentAnswer = (answers[idx]?.text || "").trim();
    if (!studentAnswer) return;
    setAnswers((prev) => ({ ...prev, [idx]: { ...prev[idx], checking: true } }));
    try {
      const feedback = await studyToolsService.checkAnswer({
        topic: topic || `Scope: ${scope}`,
        question: questionText,
        studentAnswer
      });
      const ans = quizEngineService.submitOpenAnswer(sessionId, idx, studentAnswer, feedback);
      setAnswers((prev) => ({ ...prev, [idx]: { ...ans, text: studentAnswer, checking: false } }));
      setDiagnostics(quizEngineService.getDiagnostics(sessionId));
    } catch (e) {
      setAnswers((prev) => ({
        ...prev,
        [idx]: { ...prev[idx], checking: false, feedback: "Couldn't evaluate answer right now — try again in a moment." }
      }));
    }
  };

  const loadMore = () => fetchBatch(questions.map(q => typeof q === 'string' ? q : q.question));
  const canLoadMore = questions.length < MAX_QUESTIONS && !loadingBatch;

  const handleRetryMissed = () => {
    const newId = `retry_${Date.now()}`;
    const retrySession = quizEngineService.createRetryMiniQuiz(sessionId, newId);
    if (retrySession && retrySession.questions.length > 0) {
      setSessionId(newId);
      setQuestions(retrySession.questions);
      setAnswers({});
      setDiagnostics({ correct: 0, checkedCount: 0, percentage: 0 });
    }
  };

  const missedCount = diagnostics.checkedCount - diagnostics.correct;

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 w-full">
      <div className="max-w-2xl mx-auto">
        {onBack && (
          <button onClick={onBack} className="flex items-center gap-1 text-sm mb-4 hover:text-blue-600 transition-colors font-medium cursor-pointer" style={{ color: "#5A6B8C" }}>
            <ChevronLeft size={16} /> Back to Study Tools
          </button>
        )}

        <ScopeSelector scope={scope} onChange={handleScopeChange} disabled={loadingBatch && questions.length === 0} />

        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border shadow-2xs" style={{ background: "#E8F1FE", borderColor: "#D4E5FA" }}>
              <Sparkles size={12} className="text-blue-600" />
              <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "#2954E5", fontFamily: "'IBM Plex Mono', monospace" }}>
                JAMB Interactive Quiz
              </span>
            </div>

            {isCached && (
              <div title="Served instantly from browser session cache" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-medium">
                <Database size={11} />
                <span>Cached</span>
              </div>
            )}
          </div>

          {diagnostics.checkedCount > 0 && (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold shadow-2xs">
              <Award size={14} className="text-blue-600" />
              <span>Score: {diagnostics.correct} / {diagnostics.checkedCount} ({diagnostics.percentage}%)</span>
            </div>
          )}
        </div>

        <h2 className="text-xl sm:text-2xl font-semibold mb-1" style={{ color: "#101C34", fontFamily: "'Montserrat', sans-serif" }}>
          {topic}
        </h2>
        <p className="text-sm mb-5" style={{ color: "#8493B0" }}>
          {questions.length} diagnostic practice items prepared for your active {scope} revision
        </p>

        {error && <div className="text-sm px-4 py-3 rounded-xl border mb-4" style={{ background: "#FEF2F2", borderColor: "#FECACA", color: "#B91C1C" }}>{error}</div>}

        <div className="flex flex-col gap-5 mb-6">
          {questions.map((qObj, idx) => {
            const isMCQ = qObj && typeof qObj === 'object' && Array.isArray(qObj.options);
            const qText = isMCQ ? qObj.question : (typeof qObj === 'string' ? qObj : qObj.question || "Practice drill question");
            const ans = answers[idx] || {};

            return (
              <div key={idx} className="rounded-2xl border p-5 shadow-2xs transition-all hover:shadow-xs" style={{ borderColor: "#D8E3F8", background: "#FFFFFF" }}>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <p className="text-[14px] font-semibold leading-snug text-slate-900 flex-1">
                    <span className="inline-block text-blue-600 font-bold mr-1.5">{idx + 1}.</span>
                    {qText}
                  </p>
                  {ans.checked && (
                    <div className="shrink-0 pt-0.5">
                      {ans.isCorrect ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          <CheckCircle2 size={13} /> Correct
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                          <XCircle size={13} /> Incorrect
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {isMCQ ? (
                  <div className="grid grid-cols-1 gap-2.5">
                    {qObj.options.map((opt) => {
                      const isSelected = ans.selectedOptionId === opt.id;
                      const isCorrect = opt.isCorrect;
                      let btnStyle = "bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100/60";
                      
                      if (ans.checked) {
                        if (isCorrect) {
                          btnStyle = "bg-emerald-50/90 border-emerald-300 text-emerald-900 font-medium ring-1 ring-emerald-400/30";
                        } else if (isSelected) {
                          btnStyle = "bg-rose-50/90 border-rose-300 text-rose-900 opacity-90";
                        } else {
                          btnStyle = "bg-slate-50/40 border-slate-200/60 text-slate-400 opacity-60";
                        }
                      } else if (isSelected) {
                        btnStyle = "bg-blue-50 border-blue-400 text-blue-900 font-medium";
                      }

                      return (
                        <button
                          key={opt.id}
                          type="button"
                          disabled={ans.checked}
                          onClick={() => handleMCQSelect(idx, opt.id)}
                          className={`flex items-start text-left px-3.5 py-2.5 rounded-xl border transition-all cursor-pointer disabled:cursor-default ${btnStyle}`}
                        >
                          <span className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-xs font-bold mr-3 shrink-0 border ${
                            ans.checked && isCorrect ? 'bg-emerald-600 border-emerald-600 text-white' :
                            ans.checked && isSelected && !isCorrect ? 'bg-rose-600 border-rose-600 text-white' :
                            'bg-white border-slate-300 text-slate-600'
                          }`}>
                            {opt.id}
                          </span>
                          <span className="text-sm leading-tight py-0.5">{opt.text}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex items-end gap-2">
                    <textarea
                      rows={2}
                      value={ans.text || ""}
                      onChange={(e) => setAnswers(prev => ({ ...prev, [idx]: { ...prev[idx], text: e.target.value } }))}
                      disabled={ans.checked && !ans.checking}
                      placeholder="Type your explanation or working step-by-step..."
                      className="flex-1 resize-none px-3.5 py-2.5 rounded-xl text-sm outline-none border transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-75 disabled:bg-slate-100"
                      style={{ borderColor: "#D8E3F8", color: "#101C34", background: "#FAFBFF" }}
                    />
                    {!ans.checked && (
                      <button
                        onClick={() => checkOpenAnswer(idx, qText)}
                        disabled={ans.checking || !ans.text?.trim()}
                        className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white transition-all shadow-2xs disabled:opacity-40 shrink-0 hover:opacity-90 active:scale-95 cursor-pointer"
                        style={{ background: "#2954E5" }}
                      >
                        {ans.checking ? <Loader2 size={15} className="animate-spin" /> : "Check Answer"}
                      </button>
                    )}
                  </div>
                )}

                {ans.feedback && (
                  <div className={`mt-4 p-3.5 rounded-xl text-sm border flex items-start gap-3 ${
                    ans.isCorrect ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950' : 'bg-amber-50/80 border-amber-200/90 text-amber-950'
                  }`}>
                    <HelpCircle size={17} className={ans.isCorrect ? 'text-emerald-600 shrink-0 mt-0.5' : 'text-amber-600 shrink-0 mt-0.5'} />
                    <div className="leading-relaxed font-normal text-[13px] flex-1">
                      <span className="font-bold block mb-0.5 uppercase tracking-wider text-[10px]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                        Pedagogical Explanation & Feedback
                      </span>
                      {ans.feedback}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {loadingBatch && (
          <div className="flex flex-col items-center gap-2 text-sm py-10 justify-center text-slate-500">
            <Loader2 size={24} className="animate-spin text-blue-600" /> 
            <span>Generating JAMB practice exam questions from active {scope} context...</span>
          </div>
        )}

        {diagnostics.checkedCount > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 mb-6">
            <div>
              <span className="text-xs font-bold text-slate-500 block uppercase tracking-wide">Quiz Diagnostic Status</span>
              <span className="text-sm font-semibold text-slate-800">
                You correctly mastered {diagnostics.correct} of {diagnostics.checkedCount} checked items.
              </span>
            </div>
            {missedCount > 0 && (
              <button
                type="button"
                onClick={handleRetryMissed}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-2xs transition-all active:scale-95 cursor-pointer"
              >
                <RefreshCw size={14} /> Retry {missedCount} Missed Concept{missedCount > 1 ? 's' : ''}
              </button>
            )}
          </div>
        )}

        {canLoadMore && questions.length > 0 && (
          <button
            onClick={loadMore}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold border transition-all shadow-2xs hover:bg-blue-50/50 cursor-pointer"
            style={{ borderColor: "#D8E3F8", color: "#2954E5" }}
          >
            <Plus size={16} /> Load {Math.min(BATCH_SIZE, MAX_QUESTIONS - questions.length)} more questions
          </button>
        )}
      </div>
    </div>
  );
}
