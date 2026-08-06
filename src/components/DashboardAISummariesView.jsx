import React, { useState } from 'react';
import { Sparkles, Search, Loader2, BookOpen, Copy, Check, ArrowRight, FileText } from 'lucide-react';
import BackToHomeButton from './BackToHomeButton';
import Footer from './Footer';
import { getAIProvider } from '../services/ai/AIProviderFactory';

const SAMPLE_TOPICS = [
  "Introduction to Chemistry",
  "Chemical Bonding & Compounds",
  "Elasticity of Demand & Supply",
  "Scientific Method & SI Units",
  "Cell Division (Mitosis vs Meiosis)",
  "Newton's Laws & Force Derivations"
];

export default function DashboardAISummariesView({ user, onNavigate }) {
  const [topic, setTopic] = useState('');
  const [customNotes, setCustomNotes] = useState('');
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);

  const handleSummarize = async (targetTopic) => {
    const inputTopic = (targetTopic || topic).trim();
    if (!inputTopic) return;

    if (targetTopic && typeof targetTopic === 'string') {
      setTopic(targetTopic);
    }

    setLoading(true);
    setError(null);
    setSummary(null);

    try {
      const ai = getAIProvider();
      const result = await ai.generateGeneralSummary({
        topic: inputTopic,
        userPrompt: customNotes.trim() ? `${inputTopic} (${customNotes.trim()})` : inputTopic
      });
      setSummary(result);
    } catch (err) {
      console.error('[DashboardAIStudyNotes] Error generating notes:', err);
      setError("We encountered an issue generating your study notes. Please verify your connection or AI provider setup in settings and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!summary) return;
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col min-h-screen" style={{ background: '#F4F7FC' }}>
      <div className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8">
        <BackToHomeButton onNavigate={onNavigate} />

        {/* Hero Section */}
        <div 
          className="rounded-3xl p-6 sm:p-10 text-white mb-8 relative overflow-hidden shadow-xl"
          style={{ background: 'linear-gradient(135deg, #2954E5 0%, #4D72EA 60%, #7E9DF3 100%)' }}
        >
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-md text-sm font-semibold mb-4 text-white">
              <FileText size={15} className="text-amber-300" />
              <span>Intelligent Educational Note Generator</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold mb-3 tracking-tight" style={{ fontFamily: "'Montserrat', sans-serif" }}>
              AI Study Notes Generator
            </h1>
            <p className="text-sm sm:text-base text-blue-100 leading-relaxed">
              Enter any academic concept or subject area. Get comprehensive, teacher-level study notes with definitions, worked examples, formulas, and recursive sub-topic expansions—detailed enough to master directly without consulting another textbook.
            </p>
          </div>
          <div className="absolute right-0 bottom-0 pointer-events-none opacity-20 transform translate-x-10 translate-y-10 sm:translate-x-4 sm:translate-y-4">
            <BookOpen size={280} />
          </div>
        </div>

        {/* Input & Control Box */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border mb-8" style={{ borderColor: '#E2EAFA' }}>
          <label className="block text-sm font-bold text-gray-800 mb-2 uppercase tracking-wider" style={{ fontFamily: "'IBM Plex Mono', monospace", color: '#5A6B8C' }}>
            What topic do you need complete study notes for?
          </label>
          
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSummarize()}
                placeholder="e.g. Introduction to Chemistry, Electrolysis, Elasticity of Demand, Cell Division..."
                className="w-full pl-11 pr-4 py-3.5 rounded-xl border text-base font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                style={{ borderColor: '#D8E3F8', background: '#FAFBFF' }}
              />
              <Search size={20} className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>
            
            <button
              onClick={() => handleSummarize()}
              disabled={loading || !topic.trim()}
              className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl text-white font-bold shadow-md transition-all duration-200 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: '#2954E5' }}
            >
              {loading ? <Loader2 size={19} className="animate-spin" /> : <Sparkles size={19} />}
              <span>{loading ? 'Writing Study Notes...' : 'Generate Study Notes'}</span>
            </button>
          </div>

          <div className="mb-2">
            <span className="text-xs font-semibold text-gray-500 block mb-2">Try an authoritative study topic:</span>
            <div className="flex flex-wrap gap-2">
              {SAMPLE_TOPICS.map((item) => (
                <button
                  key={item}
                  onClick={() => handleSummarize(item)}
                  disabled={loading}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all hover:border-blue-400 hover:bg-blue-50/60"
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
        {summary && (
          <div className="bg-white rounded-2xl p-6 sm:p-10 shadow-md border animate-fade-in transition-all" style={{ borderColor: '#E2EAFA' }}>
            <div className="flex items-center justify-between border-b pb-4 mb-6" style={{ borderColor: '#EDF2FD' }}>
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 block mb-0.5">Comprehensive Study Notes</span>
                <h2 className="text-lg sm:text-2xl font-bold text-gray-900" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  {topic || 'Academic Study Notes'}
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
              {summary}
            </div>

            <div className="mt-8 pt-5 border-t flex items-center justify-between text-xs text-gray-500" style={{ borderColor: '#EDF2FD' }}>
              <span>Exhaustive educational notes structured directly around your topic without brevity constraints.</span>
              <button 
                onClick={() => onNavigate('jamb-practice')}
                className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:underline"
              >
                Ready to practice questions? Try JAMB Practice <ArrowRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
