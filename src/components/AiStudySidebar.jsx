import React, { useState, useEffect } from 'react';
import { 
  X, Bot, FileText, BrainCircuit, Lightbulb, Bookmark, MessageSquare, 
  ChevronRight, ChevronLeft, Loader2, Send, Sparkles, Volume2, VolumeX, 
  Pause, Play, Database, Check, Info, RefreshCw 
} from 'lucide-react';
import studyToolsService from '../services/StudyToolsService';
import SummaryPanel from './SummaryPanel';
import QuestionnairePanel from './QuestionnairePanel';
import useSpeech from '../hooks/useSpeech';

export default function AiStudySidebar({ isOpen, onClose, currentPage, bookId, bookTitle = 'Textbook', user }) {
  const [activeView, setActiveView] = useState('menu'); // 'menu' | 'ask' | 'summary' | 'quiz' | 'explain'
  const [bookmarkedPages, setBookmarkedPages] = useState({});
  const [bookmarkMessage, setBookmarkMessage] = useState(null);

  // Reset to menu when page changes or sidebar re-opens if desired, or let user stay on current tab
  useEffect(() => {
    if (!isOpen) {
      setBookmarkMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBookmark = async () => {
    try {
      const res = await studyToolsService.bookmarkPage({
        userId: user?.id,
        bookId,
        pageNumber: currentPage,
        bookTitle
      });
      setBookmarkedPages((prev) => ({ ...prev, [currentPage]: true }));
      setBookmarkMessage(res.message);
      setTimeout(() => setBookmarkMessage(null), 3000);
    } catch (e) {
      console.warn("Bookmark failed:", e);
    }
  };

  const isCurrentBookmarked = Boolean(bookmarkedPages[currentPage]);
  const statusInfo = studyToolsService.getStatus();

  // Determine dynamic width: expand to comfortable reading size when a tool is active
  const sidebarWidth = activeView === 'menu' ? 'w-80 sm:w-[350px]' : 'w-full sm:w-[460px] md:w-[500px]';

  return (
    <div className={`absolute inset-y-0 right-0 ${sidebarWidth} bg-white border-l flex flex-col z-30 shadow-2xl transition-all duration-200 transform`} style={{ borderColor: '#E2E8F0', background: '#FAFBFF' }}>
      {/* Top Header */}
      <div className="flex items-center justify-between p-4 border-b shrink-0 bg-white shadow-2xs" style={{ borderColor: '#E2E8F0' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-2xs">
            <Bot size={18} />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900 text-sm flex items-center gap-1.5">
              <span>StudyBuddy AI</span>
              <span className="text-[10px] bg-blue-50 text-blue-700 font-medium px-2 py-0.5 rounded-full border border-blue-100">
                {statusInfo.provider}
              </span>
            </h2>
            <p className="text-[11px] text-slate-500 font-medium">Study Tools for Page {currentPage}</p>
          </div>
        </div>
        <button onClick={onClose} aria-label="Close AI Sidebar" className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 hover:text-slate-800 transition-colors">
          <X size={18} />
        </button>
      </div>
      
      {/* Body Area */}
      <div className="flex-1 overflow-y-auto flex flex-col">
        {activeView === 'menu' && (
          <div className="p-5 flex-1 flex flex-col justify-between gap-6">
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">
                Select Interactive Tool (Page {currentPage})
              </div>
              
              <div className="flex flex-col gap-2.5">
                <AiActionBtn icon={MessageSquare} label="Ask AI about this page" desc="Q&A scoped to current text" onClick={() => setActiveView('ask')} />
                <AiActionBtn icon={FileText} label="Generate Summary" desc="Bulleted revision points" onClick={() => setActiveView('summary')} />
                <AiActionBtn icon={BrainCircuit} label="Practice Questions" desc="Diagnostic test & answers" onClick={() => setActiveView('quiz')} />
                <AiActionBtn icon={Lightbulb} label="Explain this page" desc="Plain English concept breakdown" onClick={() => setActiveView('explain')} />
                <AiActionBtn 
                  icon={isCurrentBookmarked ? Check : Bookmark} 
                  label={isCurrentBookmarked ? "Page Bookmarked!" : "Bookmark Page"} 
                  desc="Save for instant retrieval"
                  highlight={isCurrentBookmarked}
                  onClick={handleBookmark} 
                />
              </div>

              {bookmarkMessage && (
                <div className="mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2 animate-in fade-in">
                  <Check size={14} className="text-emerald-600 shrink-0" />
                  <span>{bookmarkMessage}</span>
                </div>
              )}
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-indigo-50/50 border border-blue-100/80 rounded-2xl p-4 shadow-2xs">
              <div className="flex items-center gap-2 mb-2 text-blue-900 font-semibold text-xs">
                <Sparkles size={14} className="text-blue-600" />
                <span>Phase 1 Provider Architecture</span>
              </div>
              <p className="text-xs text-blue-950/80 leading-relaxed">
                Study tools are decoupled via the reusable <code className="bg-white/80 px-1 py-0.5 rounded font-mono text-blue-700 font-bold">AIProvider</code> framework. In development mode, mock offline responses are served without calling external AI APIs.
              </p>
            </div>
          </div>
        )}

        {activeView === 'ask' && (
          <AskAiView 
            bookId={bookId} 
            currentPage={currentPage} 
            onBack={() => setActiveView('menu')} 
          />
        )}

        {activeView === 'summary' && (
          <SummaryPanel 
            subject={bookTitle} 
            topic={`Page ${currentPage} Key Points`} 
            bookId={bookId} 
            pageNumber={currentPage} 
            onBack={() => setActiveView('menu')} 
          />
        )}

        {activeView === 'quiz' && (
          <QuestionnairePanel 
            subject={bookTitle} 
            topic={`Page ${currentPage} Diagnostic Quiz`} 
            bookId={bookId} 
            pageNumber={currentPage} 
            onBack={() => setActiveView('menu')} 
          />
        )}

        {activeView === 'explain' && (
          <ExplainPageView 
            bookId={bookId} 
            currentPage={currentPage} 
            bookTitle={bookTitle} 
            onBack={() => setActiveView('menu')} 
          />
        )}
      </div>
    </div>
  );
}

function AiActionBtn({ icon: Icon, label, desc, onClick, highlight = false }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center justify-between p-3.5 bg-white border rounded-xl transition-all group text-left shadow-2xs ${
        highlight ? 'border-emerald-300 bg-emerald-50/30' : 'border-slate-200 hover:border-blue-400 hover:shadow-sm hover:bg-blue-50/40'
      }`}
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors shrink-0 ${
          highlight ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 group-hover:bg-blue-100 text-slate-600 group-hover:text-blue-600'
        }`}>
          <Icon size={18} />
        </div>
        <div className="min-w-0">
          <div className={`font-semibold text-sm truncate ${highlight ? 'text-emerald-900' : 'text-slate-800 group-hover:text-blue-900'}`}>
            {label}
          </div>
          {desc && <div className="text-xs text-slate-500 truncate mt-0.5">{desc}</div>}
        </div>
      </div>
      <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-500 shrink-0 ml-2" />
    </button>
  );
}

/**
 * Subview: Ask AI Q&A Scoped to Page N
 */
function AskAiView({ bookId, currentPage, onBack }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [pageContext, setPageContext] = useState(null);
  const [contextLoading, setContextLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setContextLoading(true);
    (async () => {
      try {
        const ctx = await studyToolsService.extractPageText(bookId, currentPage);
        if (active) {
          setPageContext(ctx);
          setMessages([
            { sender: 'ai', text: `Hello! I have extracted the context for Page ${currentPage} (${ctx.chapterTitle}). What question can I answer about this material?` }
          ]);
        }
      } catch (e) {
        if (active) setPageContext({ chapterTitle: `Page ${currentPage}`, text: 'No specific OCR text available.' });
      } finally {
        if (active) setContextLoading(false);
      }
    })();
    return () => { active = false; };
  }, [bookId, currentPage]);

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { sender: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const reply = await studyToolsService.askAI({
        prompt: userMsg,
        bookId,
        pageNumber: currentPage,
        contextText: pageContext?.text
      });
      setMessages((prev) => [...prev, { sender: 'ai', text: reply }]);
    } catch (err) {
      setMessages((prev) => [...prev, { sender: 'ai', text: `Sorry, I couldn't process that question right now: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50/50 h-full overflow-hidden">
      {/* Header Bar */}
      <div className="p-3.5 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
        <button onClick={onBack} className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors">
          <ChevronLeft size={16} /> Back to Tools
        </button>
        <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full">
          Ask AI · Page {currentPage}
        </span>
      </div>

      {/* Context preview banner */}
      <div className="p-3 bg-blue-50/80 border-b border-blue-100 text-xs text-blue-900 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-2 overflow-hidden">
          <Info size={14} className="text-blue-600 shrink-0" />
          <span className="font-medium truncate">
            {contextLoading ? 'Extracting page content...' : `Scoped to: ${pageContext?.chapterTitle || `Page ${currentPage}`}`}
          </span>
        </div>
      </div>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {messages.map((m, idx) => (
          <div key={idx} className={`max-w-[85%] rounded-2xl p-3.5 text-sm leading-relaxed shadow-2xs ${
            m.sender === 'user' ? 'bg-blue-600 text-white self-end rounded-br-xs' : 'bg-white text-slate-800 border border-slate-200 self-start rounded-bl-xs'
          }`}>
            {m.text}
          </div>
        ))}

        {loading && (
          <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-xs p-3 self-start flex items-center gap-2 text-slate-500 text-xs font-medium shadow-2xs">
            <Loader2 size={14} className="animate-spin text-blue-600" />
            <span>Analyzing textbook text and generating response...</span>
          </div>
        )}
      </div>

      {/* Input bar */}
      <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0">
        <input 
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Ask about concepts on Page ${currentPage}...`}
          className="flex-1 px-3.5 py-2 rounded-xl text-sm bg-slate-50 border border-slate-200 outline-none focus:border-blue-500 focus:bg-white transition-all"
        />
        <button 
          type="submit" 
          disabled={!input.trim() || loading}
          className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-40 transition-colors shadow-2xs shrink-0"
          aria-label="Send message"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}

/**
 * Subview: Explain This Page with Read Aloud & Caching
 */
function ExplainPageView({ bookId, currentPage, bookTitle, onBack }) {
  const [explanation, setExplanation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isCached, setIsCached] = useState(false);
  const [chapterTitle, setChapterTitle] = useState('');
  const { speak, pause, resume, stop, speaking, paused, loading: ttsLoading } = useSpeech();

  const fetchExplanation = async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    if (forceRefresh) {
      studyToolsService.clearPageCache(bookId, currentPage);
    }
    try {
      const res = await studyToolsService.explainPage({ bookId, pageNumber: currentPage });
      setExplanation(res.explanation);
      setIsCached(Boolean(res.isCached));
      setChapterTitle(res.chapterTitle);
    } catch (e) {
      setError("Failed to generate page explanation: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExplanation();
  }, [bookId, currentPage]);

  return (
    <div className="flex-1 overflow-y-auto flex flex-col bg-slate-50/40 w-full">
      <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
        <button onClick={onBack} className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors">
          <ChevronLeft size={16} /> Back to Tools
        </button>
        <div className="flex items-center gap-2">
          {isCached && (
            <span title="Loaded instantly from session memory" className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Database size={10} /> Cached
            </span>
          )}
          <button 
            onClick={() => fetchExplanation(true)} 
            disabled={loading}
            title="Refresh explanation" 
            className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-40"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="p-5 max-w-2xl mx-auto flex-1 w-full">
        <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">
            Page {currentPage} Explanation
          </span>

          {/* Read Aloud controls */}
          {explanation && (
            <div className="flex items-center gap-1.5">
              {!speaking && (
                <button
                  onClick={() => speak(explanation.replace(/#/g, ''), { subject: bookTitle, label: `Page ${currentPage} Explanation` })}
                  disabled={ttsLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all shadow-2xs bg-white hover:bg-slate-50 text-blue-600 disabled:opacity-60"
                >
                  {ttsLoading ? <Loader2 size={13} className="animate-spin" /> : <Volume2 size={13} />}
                  <span>Read Aloud</span>
                </button>
              )}
              {speaking && !paused && (
                <button onClick={pause} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all bg-white text-blue-600 shadow-2xs">
                  <Pause size={13} /> Pause
                </button>
              )}
              {speaking && paused && (
                <button onClick={resume} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all bg-white text-blue-600 shadow-2xs">
                  <Play size={13} /> Resume
                </button>
              )}
              {speaking && (
                <button onClick={stop} className="px-2.5 py-1.5 rounded-xl text-xs font-semibold border bg-red-50 border-red-200 text-red-600 hover:opacity-80 shadow-2xs">
                  <VolumeX size={13} />
                </button>
              )}
            </div>
          )}
        </div>

        <h3 className="font-bold text-slate-900 text-lg sm:text-xl mb-1">{chapterTitle || `Section at Page ${currentPage}`}</h3>
        <p className="text-xs text-slate-500 mb-5">Broken down into simple, student-friendly terms for fast comprehension</p>

        {loading && (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-sm text-slate-500">
            <Loader2 size={24} className="animate-spin text-blue-600" />
            <span className="font-medium">Extracting Page {currentPage} OCR context and analyzing concepts...</span>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
            {error}
          </div>
        )}

        {explanation && !loading && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs whitespace-pre-line text-sm text-slate-800 leading-relaxed font-normal">
            {explanation}
          </div>
        )}
      </div>
    </div>
  );
}
