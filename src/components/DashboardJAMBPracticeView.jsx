import React, { useState, useEffect, useRef } from 'react';
import { ClipboardCheck, Play, RotateCcw, Loader2, CheckCircle2, XCircle, AlertCircle, ArrowLeft, ArrowRight, Clock, Award, Check } from 'lucide-react';
import BackToHomeButton from './BackToHomeButton';
import Footer from './Footer';
import alocService, { SUPPORTED_ALOC_SUBJECTS } from '../services/alocService';

export default function DashboardJAMBPracticeView({ user, onNavigate }) {
  // Navigation States: 'setup' | 'loading' | 'error' | 'testing' | 'results'
  const [viewState, setViewState] = useState('setup');
  
  // Test Configuration
  const [selectedSubject, setSelectedSubject] = useState(SUPPORTED_ALOC_SUBJECTS[0].key);
  const [questionCount, setQuestionCount] = useState(10);
  
  // Session Data
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [errorMsg, setErrorMsg] = useState('');

  // Timer state
  const [timeRemaining, setTimeRemaining] = useState(0); // in seconds
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleStartPractice = async () => {
    setViewState('loading');
    setErrorMsg('');
    setQuestions([]);
    setUserAnswers({});
    setCurrentIndex(0);

    const result = await alocService.fetchPracticeQuestions({
      subject: selectedSubject,
      count: questionCount
    });

    if (!result.success || !result.questions || result.questions.length === 0) {
      setErrorMsg(result.error || "JAMB Practice is temporarily unavailable. Please try again in a few moments.");
      setViewState('error');
      return;
    }

    setQuestions(result.questions);
    
    // Set timer: 1 minute per question standard JAMB pace
    const totalSeconds = result.questions.length * 60;
    setTimeRemaining(totalSeconds);

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleSubmitTest();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    setViewState('testing');
  };

  const handleSelectOption = (questionId, optionKey) => {
    setUserAnswers(prev => ({ ...prev, [questionId]: optionKey }));
  };

  const handleSubmitTest = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setViewState('results');
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const calculateScore = () => {
    let correct = 0;
    questions.forEach(q => {
      if (userAnswers[q.id] === q.correctAnswerKey) {
        correct++;
      }
    });
    return {
      correct,
      total: questions.length,
      percentage: Math.round((correct / (questions.length || 1)) * 100)
    };
  };

  const activeSubjectObj = SUPPORTED_ALOC_SUBJECTS.find(s => s.key === selectedSubject) || SUPPORTED_ALOC_SUBJECTS[0];

  return (
    <div className="flex flex-col min-h-screen" style={{ background: '#F4F7FC' }}>
      <div className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8">
        {viewState === 'setup' && <BackToHomeButton onNavigate={onNavigate} />}
        {viewState === 'error' && <BackToHomeButton onNavigate={onNavigate} />}

        {/* Hero Header */}
        {(viewState === 'setup' || viewState === 'error') && (
          <div 
            className="rounded-3xl p-6 sm:p-10 text-white mb-8 relative overflow-hidden shadow-xl"
            style={{ background: 'linear-gradient(135deg, #101C34 0%, #1E315A 60%, #304982 100%)' }}
          >
            <div className="relative z-10 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/20 backdrop-blur-md border border-blue-400/30 text-sm font-semibold mb-4 text-blue-200">
                <ClipboardCheck size={16} className="text-blue-400" />
                <span>Powered exclusively by ALOC Nigerian Exam API</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold mb-3 tracking-tight" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                JAMB UTME CBT Practice
              </h1>
              <p className="text-sm sm:text-base text-gray-300 leading-relaxed">
                Practice authentic past JAMB examination questions under live CBT timer rules. Sourced directly from verified national examination endpoints—independent of textbook uploads or AI generation.
              </p>
            </div>
          </div>
        )}

        {/* STAGE 1: SETUP VIEW */}
        {viewState === 'setup' && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border mb-8" style={{ borderColor: '#E2EAFA' }}>
            <h2 className="text-lg font-bold text-gray-900 mb-4" style={{ fontFamily: "'Montserrat', sans-serif" }}>
              1. Select Your Examination Subject
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-8">
              {SUPPORTED_ALOC_SUBJECTS.map((sub) => {
                const isSelected = selectedSubject === sub.key;
                return (
                  <button
                    key={sub.key}
                    onClick={() => setSelectedSubject(sub.key)}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border text-center transition-all duration-150 ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/80 text-blue-950 font-bold shadow-sm ring-2 ring-blue-500/20'
                        : 'border-gray-200 bg-gray-50/50 text-gray-700 hover:border-blue-300 hover:bg-gray-50 font-medium'
                    }`}
                    style={isSelected ? { borderColor: '#2954E5', background: '#F0F5FF' } : { borderColor: '#E2EAFA' }}
                  >
                    <span className="text-xs sm:text-sm">{sub.label}</span>
                    {isSelected && <Check size={14} className="text-blue-600 mt-1" />}
                  </button>
                );
              })}
            </div>

            <h2 className="text-lg font-bold text-gray-900 mb-3" style={{ fontFamily: "'Montserrat', sans-serif" }}>
              2. Select Number of Questions
            </h2>
            <div className="flex flex-wrap gap-3 mb-10">
              {[5, 10, 20, 40].map((count) => {
                const active = questionCount === count;
                return (
                  <button
                    key={count}
                    onClick={() => setQuestionCount(count)}
                    className={`px-6 py-2.5 rounded-xl font-bold text-sm border transition-all ${
                      active
                        ? 'border-blue-600 bg-blue-600 text-white shadow-md'
                        : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                    }`}
                    style={active ? { background: '#2954E5', borderColor: '#2954E5' } : { borderColor: '#D8E3F8' }}
                  >
                    {count} Questions
                  </button>
                );
              })}
            </div>

            <div className="pt-6 border-t flex items-center justify-end" style={{ borderColor: '#EDF2FD' }}>
              <button
                onClick={handleStartPractice}
                className="flex items-center gap-2.5 px-8 py-4 rounded-xl text-white font-bold text-base shadow-lg transition-transform transform active:scale-95 hover:bg-blue-700"
                style={{ background: '#2954E5' }}
              >
                <Play size={18} className="fill-white" />
                <span>Start Authentic JAMB Practice</span>
              </button>
            </div>
          </div>
        )}

        {/* LOADING STATE */}
        {viewState === 'loading' && (
          <div className="bg-white rounded-2xl p-12 shadow-sm border text-center my-12 max-w-lg mx-auto" style={{ borderColor: '#E2EAFA' }}>
            <Loader2 size={44} className="animate-spin text-blue-600 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900 mb-1">Connecting to ALOC Exam Repository...</h3>
            <p className="text-sm text-gray-500">Fetching verified UTME {activeSubjectObj.label} questions.</p>
          </div>
        )}

        {/* ERROR STATE WITH RETRY (Strict user instruction compliance) */}
        {viewState === 'error' && (
          <div className="bg-white rounded-2xl p-8 sm:p-12 shadow-md border border-amber-200 text-center my-6 max-w-xl mx-auto">
            <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-5 border border-amber-200">
              <AlertCircle size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-3" style={{ fontFamily: "'Montserrat', sans-serif" }}>
              Practice Unavailable
            </h3>
            <p className="text-base text-gray-600 mb-8 leading-relaxed font-medium">
              {errorMsg || "JAMB Practice is temporarily unavailable. Please try again in a few moments."}
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={handleStartPractice}
                className="flex items-center gap-2 px-8 py-3.5 rounded-xl font-bold text-white shadow-md transition-all hover:opacity-90"
                style={{ background: '#2954E5' }}
              >
                <RotateCcw size={18} />
                <span>Retry Now</span>
              </button>
              <button
                onClick={() => setViewState('setup')}
                className="px-6 py-3.5 rounded-xl font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all text-sm"
              >
                Change Subject
              </button>
            </div>
          </div>
        )}

        {/* STAGE 2: LIVE TESTING VIEW */}
        {viewState === 'testing' && questions.length > 0 && (
          <div className="flex flex-col gap-6">
            {/* Top Bar */}
            <div className="bg-white rounded-2xl p-4 sm:px-6 border shadow-sm flex items-center justify-between" style={{ borderColor: '#E2EAFA' }}>
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider text-blue-700 bg-blue-50">
                  {activeSubjectObj.label}
                </span>
                <span className="text-sm font-semibold text-gray-600">
                  Question {currentIndex + 1} of {questions.length}
                </span>
              </div>

              <div className="flex items-center gap-2 font-mono font-bold px-3 py-1.5 rounded-xl bg-gray-900 text-amber-400 text-sm shadow-inner">
                <Clock size={16} />
                <span>{formatTime(timeRemaining)}</span>
              </div>
            </div>

            {/* Question Card */}
            {(() => {
              const currentQ = questions[currentIndex];
              return (
                <div className="bg-white rounded-2xl p-6 sm:p-10 border shadow-sm" style={{ borderColor: '#E2EAFA' }}>
                  <div className="flex items-center justify-between mb-4 text-xs font-semibold text-gray-400 uppercase">
                    <span>UTME Past Question ({currentQ.examYear})</span>
                    <span>Single Choice (A-D)</span>
                  </div>
                  
                  <p className="text-base sm:text-lg font-semibold text-gray-900 mb-6 leading-relaxed">
                    {currentQ.questionText}
                  </p>

                  {currentQ.imageUrl && (
                    <div className="mb-6 rounded-xl overflow-hidden border max-w-md bg-gray-50 p-2">
                      <img src={currentQ.imageUrl} alt="Question Diagram" className="w-full h-auto object-contain max-h-60" />
                    </div>
                  )}

                  <div className="flex flex-col gap-3 mb-8">
                    {currentQ.options.map((opt) => {
                      const selected = userAnswers[currentQ.id] === opt.key;
                      return (
                        <button
                          key={opt.key}
                          onClick={() => handleSelectOption(currentQ.id, opt.key)}
                          className={`flex items-center gap-4 p-4 rounded-xl border text-left transition-all duration-150 ${
                            selected
                              ? 'border-blue-600 bg-blue-50 text-blue-950 font-bold ring-2 ring-blue-500/20'
                              : 'border-gray-200 hover:border-gray-300 bg-white text-gray-800 font-medium'
                          }`}
                          style={selected ? { borderColor: '#2954E5', background: '#F0F5FF' } : { borderColor: '#E2EAFA' }}
                        >
                          <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                            selected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
                          }`} style={selected ? { background: '#2954E5' } : {}}>
                            {opt.label}
                          </span>
                          <span className="flex-1 text-sm sm:text-base leading-normal">{opt.text}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Navigation Footer */}
                  <div className="pt-6 border-t flex items-center justify-between" style={{ borderColor: '#EDF2FD' }}>
                    <button
                      onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                      disabled={currentIndex === 0}
                      className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl font-semibold text-sm border text-gray-700 bg-gray-50 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{ borderColor: '#D8E3F8' }}
                    >
                      <ArrowLeft size={16} /> Previous
                    </button>

                    <div className="flex gap-2">
                      {currentIndex < questions.length - 1 ? (
                        <button
                          onClick={() => setCurrentIndex(prev => Math.min(questions.length - 1, prev + 1))}
                          className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl font-bold text-sm text-white shadow-md transition-all hover:bg-blue-700"
                          style={{ background: '#2954E5' }}
                        >
                          Next Question <ArrowRight size={16} />
                        </button>
                      ) : (
                        <button
                          onClick={handleSubmitTest}
                          className="flex items-center gap-2 px-8 py-2.5 rounded-xl font-bold text-sm text-white shadow-lg bg-emerald-600 hover:bg-emerald-700"
                        >
                          <Check size={17} /> Submit & Score Test
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Question Navigator Grid */}
            <div className="bg-white rounded-2xl p-6 border shadow-sm" style={{ borderColor: '#E2EAFA' }}>
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500 block mb-3">
                Question Navigator ({Object.keys(userAnswers).length}/{questions.length} answered)
              </span>
              <div className="flex flex-wrap gap-2">
                {questions.map((q, idx) => {
                  const answered = Boolean(userAnswers[q.id]);
                  const isCur = idx === currentIndex;
                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentIndex(idx)}
                      className={`w-9 h-9 rounded-lg font-bold text-xs transition-all flex items-center justify-center ${
                        isCur
                          ? 'ring-2 ring-blue-600 bg-blue-600 text-white shadow-sm'
                          : answered
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* STAGE 3: RESULTS & DIAGNOSIS VIEW */}
        {viewState === 'results' && (
          <div className="flex flex-col gap-8 animate-fade-in">
            {/* Score Card */}
            {(() => {
              const score = calculateScore();
              return (
                <div 
                  className="rounded-3xl p-8 sm:p-10 text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6"
                  style={{ background: 'linear-gradient(135deg, #101C34 0%, #1A2B52 70%, #2954E5 100%)' }}
                >
                  <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold mb-3">
                      <Award size={15} />
                      <span>Authentic JAMB UTME Evaluation</span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                      {activeSubjectObj.label} Test Completed!
                    </h2>
                    <p className="text-sm text-gray-300">
                      You scored <strong className="text-white font-bold">{score.correct}</strong> out of <strong className="text-white font-bold">{score.total}</strong> verified ALOC past questions.
                    </p>
                  </div>

                  <div className="flex flex-col items-center bg-white/10 backdrop-blur-md px-8 py-5 rounded-2xl border border-white/20">
                    <span className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-amber-300 mb-1">
                      {score.percentage}%
                    </span>
                    <span className="text-xs uppercase font-bold text-gray-200 tracking-wider">Accuracy Score</span>
                  </div>
                </div>
              );
            })()}

            {/* Diagnostic Question Breakdown */}
            <div className="bg-white rounded-2xl p-6 sm:p-8 border shadow-sm" style={{ borderColor: '#E2EAFA' }}>
              <h3 className="text-lg font-bold text-gray-900 mb-6 border-b pb-4" style={{ borderColor: '#EDF2FD', fontFamily: "'Montserrat', sans-serif" }}>
                Detailed Question Review & Explanations
              </h3>

              <div className="flex flex-col gap-8">
                {questions.map((q, idx) => {
                  const userChoice = userAnswers[q.id];
                  const isCorrect = userChoice === q.correctAnswerKey;
                  const correctOpt = q.options.find(o => o.key === q.correctAnswerKey);

                  return (
                    <div key={q.id} className="p-6 rounded-xl border bg-gray-50/50" style={{ borderColor: '#E8EFFC' }}>
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <span className="font-bold text-sm text-gray-800">
                          Q{idx + 1}. {q.questionText}
                        </span>
                        <div className="flex-shrink-0">
                          {isCorrect ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                              <CheckCircle2 size={14} /> Correct
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-800">
                              <XCircle size={14} /> {userChoice ? 'Incorrect' : 'Skipped'}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 text-xs">
                        <div className={`p-3 rounded-lg border font-medium ${isCorrect ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-red-50 border-red-200 text-red-900'}`}>
                          <span className="block text-gray-500 text-[11px] mb-0.5 uppercase font-bold">Your Answer:</span>
                          {userChoice ? `Option ${userChoice.toUpperCase()}` : 'No option selected'}
                        </div>
                        <div className="p-3 rounded-lg border bg-emerald-50/60 border-emerald-200 text-emerald-900 font-medium">
                          <span className="block text-emerald-700 text-[11px] mb-0.5 uppercase font-bold">Correct ALOC Answer:</span>
                          Option {q.correctAnswerKey.toUpperCase()} {correctOpt ? `(${correctOpt.text})` : ''}
                        </div>
                      </div>

                      {q.solution && (
                        <div className="mt-4 p-4 rounded-xl bg-blue-50/70 border border-blue-200/60 text-xs sm:text-sm text-blue-950">
                          <strong className="font-bold uppercase text-blue-800 text-[11px] block mb-1">Official Solution / Explanation:</strong>
                          <p className="leading-relaxed whitespace-pre-wrap">{q.solution}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Controls */}
            <div className="flex items-center justify-between pb-6">
              <button
                onClick={() => onNavigate('study')}
                className="px-6 py-3.5 rounded-xl font-semibold text-gray-700 bg-white border shadow-sm hover:bg-gray-50"
                style={{ borderColor: '#D8E3F8' }}
              >
                Return to Dashboard
              </button>
              <button
                onClick={() => setViewState('setup')}
                className="flex items-center gap-2 px-8 py-3.5 rounded-xl text-white font-bold shadow-md hover:bg-blue-700 transition-all"
                style={{ background: '#2954E5' }}
              >
                <RotateCcw size={17} />
                <span>Practice Another Subject</span>
              </button>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
