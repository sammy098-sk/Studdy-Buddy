import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Loader2, Plus, Sparkles, Database, CheckCircle2, XCircle, RefreshCw, Award, HelpCircle, ArrowRight, ArrowLeft, BarChart3, BookOpen } from 'lucide-react';
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
  
  // CBT One-by-One Engine state
  const [currentQIdx, setCurrentQIdx] = useState(0);
  const [showBatchSummary, setShowBatchSummary] = useState(false);

  const MAX_QUESTIONS = 75;
  const BATCH_SIZE = 15;

  const handleScopeChange = (newScope) => {
    setScope(newScope);
    if (onScopeChange) onScopeChange(newScope);
  };

  const fetchBatch = async (excludeList, currentScope = scope, currentSessionId = sessionId) => {
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
      if (Array.isArray(res.questions) && res.questions.length > 0) {
        const prevLength = questions.length;
        const updatedQuestions = [...questions, ...res.questions];
        setQuestions(updatedQuestions);
        setIsCached(Boolean(res.isCached));
        
        // Register or sync with QuizEngineService
        quizEngineService.createSession({
          sessionId: currentSessionId,
          questions: updatedQuestions,
          examMode: true
        });

        // If loading additional questions after summary, advance directly to the new batch
        if (prevLength > 0 && showBatchSummary) {
          setShowBatchSummary(false);
          setCurrentQIdx(prevLength);
        } else if (prevLength === 0) {
          setCurrentQIdx(0);
          setShowBatchSummary(false);
        }
      } else if (res.error) {
        setError(res.error);
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
    setCurrentQIdx(0);
    setShowBatchSummary(false);
    fetchBatch([], scope, newId);
  }, [subject, topic, bookId, pageNumber, scope]);

  const handleMCQSelect = (idx, optionId) => {
    if (answers[idx]?.checked) return; // Lock: only one option can be selected per question
    let ans = quizEngineService.submitMCQAnswer(sessionId, idx, optionId);
    if (!ans) {
      // Unbreakable synchronization: rebuild session if memory was cleared or re-mounted
      quizEngineService.createSession({ sessionId, questions, examMode: true });
      ans = quizEngineService.submitMCQAnswer(sessionId, idx, optionId);
    }
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

  const loadMore = () => {
    fetchBatch(questions.map(q => typeof q === 'string' ? q : q.question), scope, sessionId);
  };

  const handleRetryMissed = () => {
    const newId = `retry_${Date.now()}`;
    const retrySession = quizEngineService.createRetryMiniQuiz(sessionId, newId);
    if (retrySession && retrySession.questions.length > 0) {
      setSessionId(newId);
      setQuestions(retrySession.questions);
      setAnswers({});
      setDiagnostics({ correct: 0, checkedCount: 0, percentage: 0 });
      setCurrentQIdx(0);
      setShowBatchSummary(false);
    }
  };

  const missedCount = diagnostics.checkedCount - diagnostics.correct;
  const canLoadMore = questions.length < MAX_QUESTIONS && !loadingBatch;

  // Active question logic
  const currentQ = questions[currentQIdx];
  const currentAns = answers[currentQIdx] || {};
  const isMCQ = currentQ && typeof currentQ === 'object' && Array.isArray(currentQ.options);
  const qText = isMCQ ? currentQ.question : (typeof currentQ === 'string' ? currentQ : currentQ?.question || "Practice drill question");

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-8 lg:px-12 py-6 w-full bg-slate-50/30">
      <div className="max-w-2xl lg:max-w-3xl mx-auto">
        {onBack && (
          <button onClick={onBack} className="flex items-center gap-1 text-sm lg:text-base mb-4 hover:text-blue-600 transition-colors font-medium cursor-pointer text-slate-600">
            <ChevronLeft size={18} /> Back to Study Tools
          </button>
        )}

        <ScopeSelector scope={scope} onChange={handleScopeChange} disabled={loadingBatch && questions.length === 0} />

        {/* Top bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4 mt-2">
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border shadow-2xs bg-blue-50/80 border-blue-200 text-blue-700">
              <Sparkles size={14} className="text-blue-600" />
              <span className="text-xs lg:text-sm font-bold uppercase tracking-wide font-['IBM_Plex_Mono']">
                JAMB CBT Practice Exam
              </span>
            </div>

            {isCached && (
              <div title="Served instantly from session cache" className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
                <Database size={12} />
                <span>Cached</span>
              </div>
            )}
          </div>

          {diagnostics.checkedCount > 0 && (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs lg:text-sm font-bold shadow-xs">
              <Award size={16} className="text-blue-600" />
              <span>Score: {diagnostics.correct} / {diagnostics.checkedCount} ({diagnostics.percentage}%)</span>
            </div>
          )}
        </div>

        <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold mb-1 text-slate-900 font-['Montserrat']">
          {topic}
        </h2>
        <p className="text-sm lg:text-base font-medium mb-6 text-slate-500">
          Interactive diagnostic test strictly grounded in your active {scope} revision scope
        </p>

        {error && <div className="text-sm px-4 py-3.5 rounded-2xl border mb-6 font-medium bg-rose-50 border-rose-200 text-rose-800">{error}</div>}

        {/* Initial loading screen */}
        {loadingBatch && questions.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-16 justify-center text-slate-600 bg-white rounded-3xl border border-slate-200 shadow-sm p-8 text-center">
            <Loader2 size={32} className="animate-spin text-blue-600" /> 
            <span className="text-base font-bold text-slate-800">Constructing CBT Practice Exam...</span>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md">
              Generating 15 rigorous A–D multiple-choice practice questions and step-by-step distractor explanations from your {scope === 'page' ? `Page ${pageNumber || 1}` : scope === 'chapter' ? 'Current Chapter' : 'Entire Textbook'} textbook data...
            </p>
          </div>
        )}

        {/* Final Score & Performance Analysis Screen (shown after Question 15) */}
        {!loadingBatch && showBatchSummary && questions.length > 0 && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-lg p-6 sm:p-8 lg:p-10 text-center animate-in fade-in duration-200">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-5 shadow-sm border border-blue-100">
              <BarChart3 size={32} />
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2 font-['Montserrat']">
              Batch Performance Analysis
            </h3>
            <p className="text-slate-600 text-sm sm:text-base font-medium mb-8 max-w-lg mx-auto">
              You have completed this 15-question CBT diagnostic module. Review your scores and continue your revision streak!
            </p>

            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-xs font-bold text-slate-400 uppercase block mb-1">Checked Items</span>
                <span className="text-2xl sm:text-3xl font-extrabold text-slate-800">{diagnostics.checkedCount}</span>
              </div>
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
                <span className="text-xs font-bold text-emerald-600 uppercase block mb-1">Correct</span>
                <span className="text-2xl sm:text-3xl font-extrabold text-emerald-700">{diagnostics.correct}</span>
              </div>
              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100">
                <span className="text-xs font-bold text-blue-600 uppercase block mb-1">Mastery Score</span>
                <span className="text-2xl sm:text-3xl font-extrabold text-blue-700">{diagnostics.percentage}%</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left mb-8">
              <h4 className="font-bold text-slate-800 text-sm mb-1">Teacher's Diagnostic Recommendation:</h4>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                {diagnostics.percentage >= 80 
                  ? "Outstanding command of the theory! You have successfully internalized the core definitions and mathematical principles for this revision scope."
                  : "Good effort! Take a moment to review the option explanations for the items you missed before moving to the next section or loading another question drill."}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5">
              <button
                onClick={() => { setShowBatchSummary(false); setCurrentQIdx(0); }}
                className="w-full sm:w-auto px-5 py-3 rounded-2xl font-bold text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer"
              >
                Review All Questions
              </button>
              
              {missedCount > 0 && (
                <button
                  type="button"
                  onClick={handleRetryMissed}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/20 transition-all cursor-pointer"
                >
                  <RefreshCw size={16} /> Retry {missedCount} Missed Concept{missedCount > 1 ? 's' : ''}
                </button>
              )}

              {canLoadMore && (
                <button
                  onClick={loadMore}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/25 transition-all cursor-pointer"
                >
                  <Plus size={18} /> Load 15 More Questions
                </button>
              )}
            </div>
          </div>
        )}

        {/* CBT One-by-One Question Screen */}
        {!showBatchSummary && questions.length > 0 && currentQ && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-md overflow-hidden mb-8 transition-all">
            {/* Header / Progress pill */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <span className="text-xs sm:text-sm font-extrabold text-blue-700 bg-blue-100/80 px-3 py-1 rounded-xl border border-blue-200">
                Question {currentQIdx + 1} of {questions.length}
              </span>
              {currentAns.checked && (
                <div className="shrink-0">
                  {currentAns.isCorrect ? (
                    <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200">
                      <CheckCircle2 size={15} className="text-emerald-600" /> Correct
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-rose-700 bg-rose-50 px-3 py-1 rounded-xl border border-rose-200">
                      <XCircle size={15} className="text-rose-600" /> Incorrect
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Question Stem */}
            <div className="p-6 sm:p-8">
              <p className="text-base sm:text-lg lg:text-xl font-extrabold leading-relaxed text-slate-900 mb-6 font-['Montserrat']">
                {qText}
              </p>

              {/* Options */}
              {isMCQ ? (
                <div className="grid grid-cols-1 gap-3 mb-6">
                  {currentQ.options.map((opt) => {
                    const isSelected = currentAns.selectedOptionId === opt.id;
                    const isCorrect = opt.isCorrect;
                    let btnStyle = "bg-white border-slate-200 text-slate-800 hover:bg-blue-50/50 hover:border-blue-300 shadow-2xs";
                    
                    if (currentAns.checked) {
                      if (isCorrect) {
                        btnStyle = "bg-emerald-50/90 border-emerald-400 text-emerald-950 font-bold ring-2 ring-emerald-400/25 shadow-sm";
                      } else if (isSelected) {
                        btnStyle = "bg-rose-50/90 border-rose-400 text-rose-950 font-bold ring-2 ring-rose-400/25 shadow-sm";
                      } else {
                        btnStyle = "bg-slate-50/50 border-slate-200 text-slate-400 opacity-60";
                      }
                    } else if (isSelected) {
                      btnStyle = "bg-blue-50 border-blue-500 text-blue-950 font-bold ring-2 ring-blue-500/20";
                    }

                    return (
                      <button
                        key={opt.id}
                        type="button"
                        disabled={currentAns.checked}
                        onClick={() => handleMCQSelect(currentQIdx, opt.id)}
                        className={`flex items-start text-left p-4 sm:p-4.5 rounded-2xl border transition-all cursor-pointer disabled:cursor-default ${btnStyle}`}
                      >
                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-xl text-xs sm:text-sm font-extrabold mr-3.5 shrink-0 border transition-all ${
                          currentAns.checked && isCorrect ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs' :
                          currentAns.checked && isSelected && !isCorrect ? 'bg-rose-600 border-rose-600 text-white shadow-xs' :
                          'bg-slate-100 border-slate-200 text-slate-700'
                        }`}>
                          {opt.id}
                        </span>
                        <span className="text-sm sm:text-base leading-snug py-1 flex-1 font-medium">{opt.text}</span>
                        {currentAns.checked && isCorrect && <CheckCircle2 size={20} className="text-emerald-600 self-center ml-2 shrink-0" />}
                        {currentAns.checked && isSelected && !isCorrect && <XCircle size={20} className="text-rose-600 self-center ml-2 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col gap-3 mb-6">
                  <textarea
                    rows={4}
                    value={currentAns.text || ""}
                    onChange={(e) => setAnswers(prev => ({ ...prev, [currentQIdx]: { ...prev[currentQIdx], text: e.target.value } }))}
                    disabled={currentAns.checked && !currentAns.checking}
                    placeholder="Type your structured explanation or calculation working step-by-step..."
                    className="w-full resize-none p-4 rounded-2xl text-sm sm:text-base outline-none border transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-80 disabled:bg-slate-50 border-slate-300 text-slate-900"
                  />
                  {!currentAns.checked && (
                    <button
                      onClick={() => checkOpenAnswer(currentQIdx, qText)}
                      disabled={currentAns.checking || !currentAns.text?.trim()}
                      className="self-end px-6 py-3 rounded-2xl text-sm font-bold text-white transition-all shadow-md bg-blue-600 hover:bg-blue-700 disabled:opacity-40 shrink-0 cursor-pointer"
                    >
                      {currentAns.checking ? <Loader2 size={18} className="animate-spin" /> : "Submit & Evaluate Answer"}
                    </button>
                  )}
                </div>
              )}

              {/* Immediate Teacher Diagnostic Explanation (only shown after option is selected) */}
              {currentAns.checked && (
                <div className="mt-6 p-5 sm:p-6 rounded-3xl border bg-slate-50/80 border-slate-200/90 shadow-2xs animate-in slide-in-from-top-3 duration-200">
                  <div className="flex items-start gap-3.5 mb-4">
                    <div className={`p-2 rounded-xl shrink-0 ${currentAns.isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                      <HelpCircle size={22} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-extrabold text-xs sm:text-sm block mb-1 uppercase tracking-wider font-['IBM_Plex_Mono'] text-slate-800">
                        {currentAns.isCorrect ? '✅ Correct Choice Analysis' : '❌ Distractor Diagnosis & Correction'}
                      </span>
                      <p className="text-sm sm:text-base leading-relaxed text-slate-800 font-semibold">
                        {currentAns.selectedExplanation || currentAns.feedback || "Review the reading passage definitions to confirm the governing variables."}
                      </p>
                    </div>
                  </div>

                  {/* Why each remaining option is incorrect */}
                  {currentAns.optionsBreakdown && Array.isArray(currentAns.optionsBreakdown) && (
                    <div className="mt-5 pt-5 border-t border-slate-200">
                      <span className="font-bold block mb-3 text-xs uppercase tracking-wide text-slate-500 font-['IBM_Plex_Mono']">
                        Why Every Option is Right or Wrong:
                      </span>
                      <div className="flex flex-col gap-2.5">
                        {currentAns.optionsBreakdown.map((opt) => (
                          <div
                            key={opt.id}
                            className={`p-3.5 rounded-2xl border text-xs sm:text-sm leading-relaxed ${
                              opt.isCorrect
                                ? 'bg-emerald-50/70 border-emerald-200/80 text-emerald-950'
                                : 'bg-white border-slate-200/70 text-slate-700'
                            }`}
                          >
                            <span className={`font-extrabold px-2 py-0.5 rounded-md text-xs mr-2 border ${
                              opt.isCorrect ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-slate-100 border-slate-200 text-slate-700'
                            }`}>
                              Option {opt.id}
                            </span>
                            <span className="font-semibold text-slate-900">
                              {opt.explanation || (opt.isCorrect ? "Correct answer supported by chapter text." : "Incorrect distractor that contradicts theoretical definitions.")}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* CBT Bottom Navigation Bar */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => setCurrentQIdx(Math.max(0, currentQIdx - 1))}
                disabled={currentQIdx === 0}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
              >
                <ArrowLeft size={16} /> Previous Question
              </button>

              {/* Requirement: Only enable Next Question AFTER answer is selected / checked */}
              {currentAns.checked ? (
                <button
                  type="button"
                  onClick={() => {
                    if (currentQIdx < questions.length - 1) {
                      setCurrentQIdx(currentQIdx + 1);
                    } else {
                      setShowBatchSummary(true);
                    }
                  }}
                  className="flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-xs sm:text-sm bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/25 transition-all cursor-pointer animate-in fade-in zoom-in-95 duration-150"
                >
                  <span>{currentQIdx < questions.length - 1 ? 'Next Question' : 'View Final Performance & Summary'}</span>
                  <ArrowRight size={16} />
                </button>
              ) : (
                <div className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 italic">
                  <HelpCircle size={14} className="text-amber-500" />
                  <span>Select an answer above to reveal diagnostic explanation & proceed</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Loading overlay when clicking load more */}
        {loadingBatch && questions.length > 0 && (
          <div className="flex flex-col items-center gap-2 text-sm py-12 justify-center text-slate-600 bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
            <Loader2 size={28} className="animate-spin text-blue-600" /> 
            <span className="font-bold">Generating next batch of 15 practice items...</span>
          </div>
        )}
      </div>
    </div>
  );
}
