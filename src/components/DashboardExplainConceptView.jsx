import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lightbulb, Search, Loader2, GraduationCap, Copy, Check, ArrowRight, Sparkles, MessageCircle, X, Send, Bot, User } from 'lucide-react';
import BackToHomeButton from './BackToHomeButton';
import Footer from './Footer';
import { getAIProvider } from '../services/ai/AIProviderFactory';

const SAMPLE_CONCEPTS = [
  "Debentures & Bond Valuations",
  "Thermodynamic Equilibrium",
  "Price Elasticity of Supply",
  "Membrane Transport & Diffusion",
  "Kinetic Molecular Theory",
  "Balance of Payments"
];

export default function DashboardExplainConceptView({ user, onNavigate }) {
  const navigate = useNavigate();
  const [concept, setConcept] = useState('');
  const [focusNotes, setFocusNotes] = useState('');
  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);

  // Removed inline chat state variables

  const handleExplain = async (targetConcept) => {
    const inputConcept = (targetConcept || concept).trim();
    if (!inputConcept) return;

    if (targetConcept && typeof targetConcept === 'string') {
      setConcept(targetConcept);
    }

    setLoading(true);
    setError(null);
    setLesson(null);
    setCopied(false);

    try {
      const ai = getAIProvider();
      const result = await ai.explainGeneralConcept({
        topic: inputConcept,
        userPrompt: focusNotes.trim() ? `${inputConcept} (Focus specifically on: ${focusNotes.trim()})` : inputConcept
      });
      setLesson(result);
    } catch (err) {
      console.error('[DashboardExplainConcept] Error explaining concept:', err);
      setError("We encountered an issue preparing your lesson. Please check your network connection or active AI provider settings and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!lesson) return;
    navigator.clipboard.writeText(lesson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col min-h-screen" style={{ background: '#edf5f1' }}>
      <div className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8">
        <BackToHomeButton onNavigate={onNavigate} />

        {/* Hero Section */}
        <div 
          className="rounded-3xl p-6 sm:p-10 text-white mb-8 relative overflow-hidden shadow-xl"
          style={{ background: 'linear-gradient(135deg, #0D7A5F 0%, #179978 60%, #30C49F 100%)' }}
        >
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-md text-sm font-semibold mb-4 text-white">
              <GraduationCap size={16} className="text-amber-300" />
              <span>Master Teacher Concept Explanations</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold mb-3 tracking-tight" style={{ fontFamily: "'Montserrat', sans-serif" }}>
              Explain This Concept
            </h1>
            <p className="text-sm sm:text-base text-emerald-100 leading-relaxed">
              Experience learning from a compassionate master teacher. Get complete, simple, step-by-step lessons on any challenging academic concept using everyday language and relatable analogies—with zero rigid revision templates or unsolicited clutter.
            </p>
          </div>
          <div className="absolute right-0 bottom-0 pointer-events-none opacity-20 transform translate-x-10 translate-y-10 sm:translate-x-4 sm:translate-y-4">
            <Lightbulb size={280} />
          </div>
        </div>

        {/* Input Box */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border mb-8" style={{ borderColor: '#E2EAFA' }}>
          <label className="block text-sm font-bold text-gray-800 mb-2 uppercase tracking-wider" style={{ fontFamily: "'IBM Plex Mono', monospace", color: '#5A6B8C' }}>
            What challenging concept should we teach you today?
          </label>
          
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <input
                type="text"
                value={concept}
                onChange={(e) => setConcept(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleExplain()}
                placeholder="e.g. Debentures, Osmotic Pressure, Le Chatelier's Principle, Depreciation..."
                className="w-full pl-11 pr-4 py-3.5 rounded-xl border text-base font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow"
                style={{ borderColor: '#D8E3F8', background: '#FAFBFF' }}
              />
              <Search size={20} className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>
            
            <button
              onClick={() => handleExplain()}
              disabled={loading || !concept.trim()}
              className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl text-white font-bold shadow-md transition-all duration-200 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed bg-emerald-700 hover:bg-emerald-800"
            >
              {loading ? <Loader2 size={19} className="animate-spin" /> : <Sparkles size={19} />}
              <span>{loading ? 'Preparing Lesson...' : 'Explain Like a Teacher'}</span>
            </button>
          </div>

          <div className="mb-2">
            <span className="text-xs font-semibold text-gray-500 block mb-2">Try an advanced concept:</span>
            <div className="flex flex-wrap gap-2">
              {SAMPLE_CONCEPTS.map((item) => (
                <button
                  key={item}
                  onClick={() => handleExplain(item)}
                  disabled={loading}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all hover:border-emerald-500 hover:bg-emerald-50/60"
                  style={{ borderColor: '#E2EAFA', background: '#F7F9FF', color: '#3A4D70' }}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Error Feedback */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800 font-medium mb-8">
            {error}
          </div>
        )}

        {/* Results Area */}
        {lesson && (
          <div className="bg-white rounded-2xl p-6 sm:p-10 shadow-md border animate-fade-in transition-all" style={{ borderColor: '#E2EAFA' }}>
            <div className="flex items-center justify-between border-b pb-4 mb-6" style={{ borderColor: '#EDF2FD' }}>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 block mb-0.5">Master Teacher Lesson</span>
                <h2 className="text-lg sm:text-2xl font-bold text-gray-900" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  {concept || 'Concept Explanation'}
                </h2>
              </div>
              
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors hover:bg-gray-50"
                style={{ borderColor: '#D8E3F8', color: '#5A6B8C' }}
              >
                {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                <span>{copied ? 'Copied to Clipboard' : 'Copy'}</span>
              </button>
            </div>

            <div className="prose max-w-none text-gray-800 text-[15px] sm:text-[16px] leading-relaxed whitespace-pre-wrap font-sans">
              {lesson}
            </div>

            <div className="mt-8 pt-5 border-t flex flex-col sm:flex-row gap-4 items-center justify-between text-xs text-gray-500" style={{ borderColor: '#EDF2FD' }}>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate('/chat', { state: { topic: concept } })}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-700 text-white font-bold shadow hover:bg-emerald-800 transition-colors transform hover:scale-[1.02]"
                >
                  <MessageCircle size={15} />
                  <span>Ask StudyBuddy</span>
                </button>
                <span className="hidden sm:inline">Ask follow-up questions while it's fresh!</span>
              </div>
              <button 
                onClick={() => onNavigate('study')}
                className="inline-flex items-center gap-1 font-semibold text-emerald-700 hover:underline"
              >
                Return to Home Dashboard <ArrowRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
