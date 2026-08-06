import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Search, Loader2, BookOpen, Bookmark, Star, Share2, CheckCircle2, Circle, ChevronDown, ChevronUp, ArrowRight, FileText, RefreshCw, Trophy, MessageCircle, X, Send, Bot, User } from 'lucide-react';
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

// Helper to render distinct pedagogical content blocks
function BlockRenderer({ block, index }) {
  if (!block || !block.type) return null;

  switch (block.type) {
    case 'paragraph':
      return (
        <p key={index} className="text-slate-700 leading-relaxed text-[16px] mb-4 font-normal">
          {block.content}
        </p>
      );

    case 'definition':
      return (
        <div key={index} className="bg-blue-50/80 border-l-4 border-blue-600 p-4.5 rounded-r-xl my-4 text-slate-800 shadow-xs">
          <div className="flex items-center gap-1.5 text-blue-700 font-bold text-xs uppercase tracking-wider mb-1.5">
            <span className="text-base">🟦</span>
            <span>Definition</span>
          </div>
          <p className="font-medium text-[15px] leading-relaxed italic text-blue-950">
            {typeof block.content === 'string' ? `"${block.content}"` : JSON.stringify(block.content)}
          </p>
        </div>
      );

    case 'jamb_fact':
      return (
        <div key={index} className="bg-amber-50/90 border-l-4 border-amber-500 p-4.5 rounded-r-xl my-4 text-slate-900 shadow-xs">
          <div className="flex items-center gap-1.5 text-amber-800 font-bold text-xs uppercase tracking-wider mb-1">
            <span className="text-base">🟨</span>
            <span>JAMB Focus & Exam Tip</span>
          </div>
          <p className="font-semibold text-[15px] text-amber-950 leading-relaxed">
            {block.content}
          </p>
        </div>
      );

    case 'example':
      const contentObj = typeof block.content === 'object' && block.content !== null ? block.content : { title: "Practical Example", details: [String(block.content)] };
      return (
        <div key={index} className="bg-emerald-50/80 border-l-4 border-emerald-600 p-4.5 rounded-r-xl my-4 text-slate-800 shadow-xs">
          <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-xs uppercase tracking-wider mb-2">
            <span className="text-base">🟩</span>
            <span>Example & Real-World Applications</span>
          </div>
          {contentObj.title && (
            <h4 className="font-bold text-sm text-emerald-950 mb-1.5">{contentObj.title}</h4>
          )}
          {Array.isArray(contentObj.details) ? (
            <ul className="list-disc list-inside text-sm space-y-1 text-emerald-900 font-medium">
              {contentObj.details.map((dt, idx) => (
                <li key={idx} className="leading-relaxed">{dt}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-emerald-900 font-medium">{String(contentObj.details || contentObj)}</p>
          )}
        </div>
      );

    case 'list':
      const items = Array.isArray(block.content) ? block.content : [String(block.content)];
      return (
        <ul key={index} className="list-disc list-inside text-slate-700 space-y-2 mb-4 text-[15px] pl-2 font-medium">
          {items.map((it, i) => (
            <li key={i} className="leading-relaxed">{it}</li>
          ))}
        </ul>
      );

    case 'table':
      const tableData = block.content || {};
      const headers = Array.isArray(tableData.headers) ? tableData.headers : [];
      const rows = Array.isArray(tableData.rows) ? tableData.rows : [];
      return (
        <div key={index} className="overflow-x-auto my-5 rounded-xl border border-slate-200 shadow-sm">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-800">
                {headers.map((hdr, hIdx) => (
                  <th key={hIdx} className="p-3.5 font-bold tracking-tight text-xs uppercase text-slate-700">
                    {hdr}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {rows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-slate-50/80 transition-colors">
                  {Array.isArray(row) && row.map((cell, cIdx) => (
                    <td key={cIdx} className="p-3.5 text-slate-700 font-medium">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    default:
      return (
        <div key={index} className="text-slate-700 text-base mb-4">
          {typeof block.content === 'string' ? block.content : JSON.stringify(block.content)}
        </div>
      );
  }
}

export default function DashboardAISummariesView({ user, onNavigate }) {
  const [topic, setTopic] = useState('');
  const [notesData, setNotesData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // UX State tracking for interactive Notion experience
  const [expandedSections, setExpandedSections] = useState({ 1: true }); // Section 1 open by default
  const [completedSections, setCompletedSections] = useState([]);
  const [saved, setSaved] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [shared, setShared] = useState(false);

  // Contextual Chat State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isChatOpen) {
      scrollToBottom();
    }
  }, [chatHistory, isChatOpen]);

  const handleGenerate = async (targetTopic) => {
    const inputTopic = (targetTopic || topic).trim();
    if (!inputTopic) return;

    if (typeof targetTopic === 'string') {
      setTopic(targetTopic);
    }

    setLoading(true);
    setError(null);
    setNotesData(null);
    setCompletedSections([]);
    setExpandedSections({ 1: true });
    setSaved(false);
    setBookmarked(false);
    setIsChatOpen(false);
    setChatHistory([]);
    setChatInput('');

    try {
      const ai = getAIProvider();
      const result = await ai.generateStudyNotes({
        topic: inputTopic,
        userPrompt: inputTopic
      });

      // Guard against malformed structure
      if (!result || typeof result !== 'object' || !Array.isArray(result.sections)) {
        throw new Error("Received malformed content structure.");
      }

      setNotesData(result);
    } catch (err) {
      console.error('[DashboardAIStudyNotes] Generation Error:', err);
      setError("We couldn't generate your study notes right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (id) => {
    setExpandedSections(prev => {
      const isCurrentlyOpen = !!prev[id];
      const nextState = { ...prev, [id]: !isCurrentlyOpen };
      // Automatically check off section in Roadmap if opened for the first time
      if (!isCurrentlyOpen && !completedSections.includes(id)) {
        setCompletedSections(old => [...old, id]);
      }
      return nextState;
    });
  };

  const toggleCheckSection = (id, e) => {
    e.stopPropagation();
    setCompletedSections(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleShare = () => {
    setShared(true);
    if (navigator.share) {
      navigator.share({ title: notesData?.title || 'Study Buddy Notes', text: `Check out these study notes on ${notesData?.title} from StudyBuddy!` }).catch(() => {});
    }
    setTimeout(() => setShared(false), 2500);
  };

  const handleChatSubmit = async (e, textOverride) => {
    if (e) e.preventDefault();
    const textToSubmit = (textOverride || chatInput).trim();
    if (!textToSubmit || isChatLoading) return;

    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', content: textToSubmit }]);
    setIsChatLoading(true);

    try {
      const ai = getAIProvider();
      const response = await ai.chatAboutTopic({
        topic: notesData?.title || topic,
        userMessage: textToSubmit,
        chatHistory: chatHistory
      });

      setChatHistory(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (err) {
      setChatHistory(prev => [...prev, { role: 'assistant', content: "Sorry, I had trouble processing that question. Please try again." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const SUGGESTED_CHIPS = [
    { icon: '🧪', text: 'Explain atoms again' },
    { icon: '⚛️', text: 'Difference between atom & molecule' },
    { icon: '🧬', text: 'Explain chemical bonding' },
    { icon: '👶', text: "Explain like I'm 10" },
    { icon: '📝', text: 'Give me JAMB likely questions' }
  ];

  const totalSections = notesData?.sections?.length || 0;
  const completedCount = completedSections.length;
  const progressPercent = totalSections > 0 ? Math.round((completedCount / totalSections) * 100) : 0;
  const allCompleted = totalSections > 0 && completedCount === totalSections;

  return (
    <div className="flex flex-col min-h-screen font-sans" style={{ background: '#F8FAFC' }}>
      <div className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-8">
        <BackToHomeButton onNavigate={onNavigate} />

        {/* Input & Hero Search Area */}
        {!notesData && (
          <>
            <div 
              className="rounded-3xl p-6 sm:p-10 text-white mb-8 relative overflow-hidden shadow-xl"
              style={{ background: 'linear-gradient(135deg, #1E40AF 0%, #3B82F6 60%, #60A5FA 100%)' }}
            >
              <div className="relative z-10 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-semibold mb-3">
                  <FileText size={14} className="text-amber-300" />
                  <span>Notion-Style Interactive Learning</span>
                </div>
                <h1 className="text-2xl sm:text-4xl font-extrabold mb-3 tracking-tight">
                  AI Study Notes Generator
                </h1>
                <p className="text-sm sm:text-base text-blue-100 leading-relaxed">
                  Enter any academic concept to generate beautiful, structured study notes with collapsible sections, highlighted JAMB exam traps, and an interactive Learning Roadmap.
                </p>
              </div>
              <div className="absolute right-0 bottom-0 pointer-events-none opacity-20 transform translate-x-10 translate-y-10 sm:translate-x-4 sm:translate-y-4">
                <BookOpen size={260} />
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 mb-8">
              <label className="block text-xs font-extrabold text-slate-500 mb-2 uppercase tracking-wider">
                What topic are you mastering today?
              </label>
              
              <div className="flex flex-col sm:flex-row gap-3 mb-5">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                    placeholder="e.g. Introduction to Chemistry, Chemical Bonding, Electrolysis..."
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-slate-300 text-base font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50"
                  />
                  <Search size={20} className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400" />
                </div>
                
                <button
                  onClick={() => handleGenerate()}
                  disabled={loading || !topic.trim()}
                  className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl text-white font-bold shadow-md transition-all duration-200 hover:shadow-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                >
                  {loading ? <Loader2 size={19} className="animate-spin" /> : <Sparkles size={19} />}
                  <span>{loading ? 'Generating Notes...' : 'Generate Study Notes'}</span>
                </button>
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-400 block mb-2">Popular JAMB study topics:</span>
                <div className="flex flex-wrap gap-2">
                  {SAMPLE_TOPICS.map((item) => (
                    <button
                      key={item}
                      onClick={() => handleGenerate(item)}
                      disabled={loading}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 bg-slate-100/70 text-slate-700 transition-all hover:border-blue-400 hover:bg-blue-50"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Error Feedback */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center my-8 shadow-sm">
            <p className="text-base font-semibold text-red-800 mb-4">
              {error}
            </p>
            <button
              onClick={() => handleGenerate()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold shadow hover:bg-red-700 transition-colors"
            >
              <RefreshCw size={15} />
              <span>Try Again</span>
            </button>
          </div>
        )}

        {/* Notion / Medium Style Results Area */}
        {notesData && !loading && (
          <div className="animate-fade-in pb-12">
            {/* Minimalist Top Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6 mb-8">
              <div>
                <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight mb-2">
                  {notesData.title}
                </h1>
                <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-500">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700">
                    📚 {notesData.subjectCategory || 'JAMB Study Profile'}
                  </span>
                  <span className="flex items-center gap-1">
                    ⏱ {notesData.estimatedTimeMinutes || 15} min read
                  </span>
                </div>
              </div>

              {/* Floating Action Buttons */}
              <div className="flex items-center gap-2 self-start sm:self-center">
                <button
                  onClick={() => setSaved(!saved)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${saved ? 'bg-amber-50 border-amber-300 text-amber-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                  title="Save to library"
                >
                  <Star size={14} className={saved ? 'fill-amber-500 text-amber-500' : ''} />
                  <span>{saved ? 'Saved' : 'Save'}</span>
                </button>
                <button
                  onClick={() => setBookmarked(!bookmarked)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${bookmarked ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                  title="Bookmark topic"
                >
                  <Bookmark size={14} className={bookmarked ? 'fill-blue-600 text-blue-600' : ''} />
                  <span>{bookmarked ? 'Bookmarked' : 'Bookmark'}</span>
                </button>
                <button
                  onClick={handleShare}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all"
                  title="Share notes"
                >
                  <Share2 size={14} />
                  <span>{shared ? 'Shared!' : 'Share'}</span>
                </button>
                <button
                  onClick={() => setNotesData(null)}
                  className="ml-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                >
                  New Topic
                </button>
              </div>
            </div>

            {/* Learning Roadmap Feature Card */}
            <div className="bg-gradient-to-r from-blue-900 to-indigo-950 rounded-2xl p-6 sm:p-7 text-white mb-10 shadow-lg relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-blue-800/80 pb-4 mb-4">
                <div>
                  <div className="text-amber-400 text-xs font-black uppercase tracking-widest flex items-center gap-1.5 mb-1">
                    <Trophy size={14} />
                    <span>Today's Lesson Roadmap</span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-white">
                    Mastery Checklist ({completedCount} of {totalSections} completed)
                  </h3>
                </div>

                {/* Progress Visual */}
                <div className="w-full sm:w-48">
                  <div className="flex items-center justify-between text-xs font-bold text-blue-200 mb-1.5">
                    <span>Progress</span>
                    <span className="text-white">{progressPercent}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-blue-950 rounded-full overflow-hidden border border-blue-700">
                    <div 
                      className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-all duration-500 rounded-full" 
                      style={{ width: `${progressPercent}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-sm">
                {notesData.sections && notesData.sections.map((sec, idx) => {
                  const isDone = completedSections.includes(sec.id);
                  return (
                    <div 
                      key={sec.id || idx}
                      onClick={(e) => toggleCheckSection(sec.id, e)}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${isDone ? 'bg-emerald-900/40 border-emerald-500/60 text-emerald-200' : 'bg-white/5 border-white/10 text-blue-100 hover:bg-white/10'}`}
                    >
                      {isDone ? (
                        <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
                      ) : (
                        <Circle size={18} className="text-blue-300/50 shrink-0" />
                      )}
                      <span className={`font-semibold ${isDone ? 'line-through opacity-90 text-emerald-200' : ''}`}>
                        {sec.title}
                      </span>
                    </div>
                  );
                })}
              </div>

              <p className="text-xs text-blue-200/70 mt-4 font-medium">
                Tip: Tap any item above or expand sections below as you finish reading to track your study progress.
              </p>
            </div>

            {/* Collapsible Section Cards (No monolithic markdown wall!) */}
            <div className="space-y-4 mb-12">
              {notesData.sections && notesData.sections.map((sec, sIdx) => {
                const isOpen = !!expandedSections[sec.id];
                const isChecked = completedSections.includes(sec.id);

                return (
                  <div 
                    key={sec.id || sIdx} 
                    className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all duration-200 hover:border-slate-300"
                  >
                    {/* Accordion Header */}
                    <button
                      onClick={() => toggleSection(sec.id)}
                      className="w-full px-6 py-4.5 flex items-center justify-between gap-4 text-left bg-white hover:bg-slate-50/50 transition-colors focus:outline-none"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 text-slate-600 font-extrabold text-xs shrink-0">
                          {sIdx + 1}
                        </span>
                        <h3 className="text-lg font-bold text-slate-900 tracking-tight truncate">
                          {sec.title}
                        </h3>
                        {isChecked && (
                          <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold inline-flex items-center gap-1 shrink-0 border border-emerald-200">
                            ✓ Done
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 shrink-0 text-slate-400">
                        <span className="text-xs font-semibold hidden sm:inline text-slate-500">
                          {isOpen ? 'Collapse' : 'Expand'}
                        </span>
                        {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </div>
                    </button>

                    {/* Accordion Body */}
                    {isOpen && (
                      <div className="px-6 pb-8 pt-4 border-t border-slate-100 bg-white">
                        <div className="max-w-prose">
                          {sec.blocks && sec.blocks.map((blk, bIdx) => (
                            <BlockRenderer key={bIdx} block={blk} index={bIdx} />
                          ))}
                        </div>

                        {/* Section Completion Toggle Footing */}
                        <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
                          <button
                            onClick={(e) => toggleCheckSection(sec.id, e)}
                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${isChecked ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                          >
                            {isChecked ? <CheckCircle2 size={15} /> : <Circle size={15} />}
                            <span>{isChecked ? 'Completed Section' : 'Mark as Completed'}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Contextual Ask StudyBuddy CTA */}
            <div className="bg-white rounded-2xl p-6 sm:p-8 text-center shadow-sm border border-slate-200 mb-8 transition-all hover:shadow-md hover:border-slate-300">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-50 text-blue-600 mb-4">
                <MessageCircle size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                Still confused about this topic?
              </h3>
              <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto font-medium">
                Ask anything about "{notesData.title || 'this topic'}" and get a simple, friendly explanation while the material is fresh!
              </p>
              <button
                onClick={() => setIsChatOpen(true)}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-slate-900 text-white font-bold shadow hover:bg-slate-800 transition-colors hover:scale-[1.02] transform"
              >
                <span>💬 Have questions? Ask StudyBuddy</span>
              </button>
            </div>

            {/* Final Call to Action Box */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-8 sm:p-10 text-white text-center shadow-xl relative overflow-hidden">
              <div className="max-w-xl mx-auto relative z-10">
                <span className="inline-block text-4xl mb-3">🎉</span>
                <h2 className="text-2xl sm:text-3xl font-black mb-3">
                  You've completed the study notes!
                </h2>
                <p className="text-blue-100 text-sm sm:text-base mb-6 font-medium">
                  Put your comprehension to the test with real JAMB questions designed around this subject.
                </p>

                <button
                  onClick={() => onNavigate('jamb-practice')}
                  className="inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-2xl bg-white text-blue-700 font-black text-base shadow-lg hover:bg-blue-50 transition-all transform hover:-translate-y-0.5"
                >
                  <span>🟦 Test Your Understanding</span>
                  <span className="text-xs font-bold bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full ml-1">
                    10 JAMB Questions
                  </span>
                  <ArrowRight size={18} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Contextual Chat Bottom Sheet / Modal */}
        {isChatOpen && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm sm:p-4 transition-opacity">
            <div className="bg-white w-full sm:w-[500px] h-[85vh] sm:h-[650px] rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden transform animate-fade-in">
              {/* Chat Header */}
              <div className="bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between shrink-0 shadow-sm z-10">
                <div>
                  <div className="text-xs font-black uppercase tracking-wider text-blue-600 mb-0.5 flex items-center gap-1.5"><Bot size={13}/> Ask StudyBuddy</div>
                  <h3 className="text-[15px] font-bold text-slate-900 truncate pr-4">Topic: {notesData?.title || 'Current Topic'}</h3>
                </div>
                <button onClick={() => setIsChatOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors shrink-0">
                  <X size={18} strokeWidth={2.5} />
                </button>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50 flex flex-col gap-5">
                {chatHistory.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-blue-100 text-blue-600 mb-4 shadow-sm">
                      <Bot size={28} />
                    </div>
                    <p className="text-[15px] font-bold text-slate-800 mb-1">Ask me anything about this topic!</p>
                    <p className="text-xs font-medium text-slate-500 mb-8">I'm here to clarify concepts and give examples.</p>
                    
                    <div className="flex flex-wrap justify-center gap-2">
                      {SUGGESTED_CHIPS.map((chip, idx) => (
                        <button
                          key={idx}
                          onClick={(e) => handleChatSubmit(e, chip.text)}
                          className="px-3.5 py-2 rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-colors shadow-sm text-left flex items-center hover:scale-[1.02] transform"
                        >
                          <span className="mr-2 text-base">{chip.icon}</span>
                          {chip.text}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col gap-6">
                      {chatHistory.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`flex max-w-[85%] gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${msg.role === 'user' ? 'bg-slate-200 text-slate-500' : 'bg-blue-600 text-white'}`}>
                              {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                            </div>
                            <div className={`px-4.5 py-3 rounded-2xl text-[15px] font-medium leading-relaxed ${msg.role === 'user' ? 'bg-slate-900 text-white rounded-tr-sm shadow-md' : 'bg-white border border-slate-200 text-slate-800 shadow-sm rounded-tl-sm'}`}>
                              {msg.content}
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {isChatLoading && (
                        <div className="flex justify-start">
                          <div className="flex max-w-[85%] gap-2.5 flex-row">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm bg-blue-600 text-white">
                              <Bot size={16} />
                            </div>
                            <div className="px-5 py-4 rounded-2xl bg-white border border-slate-200 text-slate-400 shadow-sm rounded-tl-sm flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                            </div>
                          </div>
                        </div>
                      )}
                      <div ref={messagesEndRef} className="h-2" />
                    </div>
                  </>
                )}
              </div>

              {/* Chat Input */}
              <div className="bg-white border-t border-slate-200 p-4 shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)]">
                <form onSubmit={handleChatSubmit} className="relative">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Type your question..."
                    disabled={isChatLoading}
                    className="w-full pl-5 pr-14 py-3.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50/50 text-[15px] font-medium disabled:opacity-50 transition-all shadow-inner"
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim() || isChatLoading}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-lg bg-blue-600 text-white disabled:opacity-40 disabled:bg-slate-400 hover:bg-blue-700 transition-all shadow-sm"
                  >
                    <Send size={16} className={chatInput.trim() && !isChatLoading ? "ml-1" : ""} strokeWidth={2.5} />
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
