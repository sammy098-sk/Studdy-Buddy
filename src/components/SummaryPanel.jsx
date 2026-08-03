import React, { useState, useEffect } from 'react';
import { ChevronLeft, Loader2, Volume2, VolumeX, Pause, Play, Sparkles, Database, Bookmark, FileText, Zap, BookOpen, Key, Target, Hash, Layers, Book, ChevronRight, CheckCircle } from 'lucide-react';
import useSpeech from '../hooks/useSpeech';
import { studyToolsService } from '../services/StudyToolsService';
import ScopeSelector from './ScopeSelector';

export default function SummaryPanel({ subject = "General Subject", topic = "Topic Chapter", bookId, pageNumber, initialScope = "page", onScopeChange, onBack }) {
  const [scope, setScope] = useState(initialScope);
  const [style, setStyle] = useState('quick');
  const [summary, setSummary] = useState(null);
  const [isCached, setIsCached] = useState(false);
  const [providerInfo, setProviderInfo] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bookModules, setBookModules] = useState([]);
  const [selectedModule, setSelectedModule] = useState('overview');
  const { speak, pause, resume, stop, speaking, paused, loading: ttsLoading } = useSpeech();

  const summaryStyles = [
    { id: 'quick', label: 'Quick Revision', icon: Zap, tooltip: '2-3 high-yield subtopics with concise points' },
    { id: 'detailed', label: 'Detailed Summary', icon: FileText, tooltip: 'Comprehensive outline covering core logic in depth' },
    { id: 'exam_notes', label: 'Exam Revision Notes', icon: Target, tooltip: 'JAMB syllabus focus and examiner testing traps' },
    { id: 'definitions', label: 'Key Definitions', icon: Bookmark, tooltip: 'Glossary of primary academic terms & definitions' },
    { id: 'formulas', label: 'Important Formulas', icon: Hash, tooltip: 'Governing equations and variable relationships' },
    { id: 'concepts', label: 'Key Concepts', icon: BookOpen, tooltip: 'Mental models explaining foundational intuition' },
    { id: 'frequent_topics', label: 'Frequently Tested', icon: Key, tooltip: 'Recurring exam drills and problem patterns' }
  ];

  const handleScopeChange = (newScope) => {
    setScope(newScope);
    if (newScope !== 'book') {
      setSelectedModule('overview');
    }
    if (onScopeChange) onScopeChange(newScope);
  };

  // Load Book Modules when scope switches to entire textbook
  useEffect(() => {
    let active = true;
    if (scope === 'book') {
      studyToolsService.getBookModules(bookId, subject || topic).then(mods => {
        if (active) setBookModules(mods || []);
      });
    }
    return () => { active = false; };
  }, [scope, bookId, subject, topic]);

  useEffect(() => {
    let cancelled = false;
    setSummary(null);
    setError(null);
    setIsCached(false);
    setLoading(true);

    (async () => {
      try {
        const moduleToPass = scope === 'book'
          ? (selectedModule === 'overview' ? 'Entire Textbook Overview & Master Schema' : selectedModule)
          : null;

        const res = await studyToolsService.generateSummary({
          bookId,
          pageNumber,
          subject,
          topic: moduleToPass || topic,
          scope,
          style,
          moduleTitle: moduleToPass
        });
        if (!cancelled) {
          setSummary(res.summary);
          setIsCached(Boolean(res.isCached));
          setProviderInfo(res.providerName);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError("Couldn't generate summary right now — " + (e.message || "check your connection and try again."));
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [subject, topic, bookId, pageNumber, scope, style, selectedModule]);

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 w-full">
      <div className="max-w-3xl mx-auto">
        {onBack && (
          <button onClick={onBack} className="flex items-center gap-1 text-sm mb-4 hover:text-blue-600 transition-colors font-medium cursor-pointer" style={{ color: "#5A6B8C" }}>
            <ChevronLeft size={16} /> Back to Study Tools
          </button>
        )}

        <ScopeSelector scope={scope} onChange={handleScopeChange} disabled={loading && !summary} />

        {/* ── REVISION BOOK CHAPTER NAVIGATION (Visible when Scope is 'book') ── */}
        {scope === 'book' && (
          <div className="mb-6 rounded-2xl border p-4 sm:p-5 shadow-xs transition-all" style={{ background: "linear-gradient(135deg, #F8FAFD 0%, #EFF4FC 100%)", borderColor: "#D4E2F9" }}>
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg bg-blue-600 text-white shadow-xs">
                <Book size={16} />
              </div>
              <div>
                <h3 className="text-[14px] font-bold text-slate-800 tracking-tight" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  AI Teacher Revision Book
                </h3>
                <p className="text-[11px] text-slate-600">
                  Select an overview or individual chapter module to load comprehensive teacher study notes without token truncation.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-1.5 max-h-52 overflow-y-auto pr-1 mt-2">
              <button
                onClick={() => setSelectedModule('overview')}
                disabled={loading && selectedModule === 'overview'}
                className={`flex items-center justify-between text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  selectedModule === 'overview'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-slate-700 hover:bg-blue-50/70 border border-slate-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Layers size={14} className={selectedModule === 'overview' ? 'text-blue-100' : 'text-blue-600'} />
                  <span>Textbook Overview & Master Synthesis</span>
                </div>
                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${selectedModule === 'overview' ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  Overview
                </span>
              </button>

              {bookModules.map((mod, idx) => {
                const isActive = selectedModule === mod.title;
                return (
                  <button
                    key={mod.id || idx}
                    onClick={() => setSelectedModule(mod.title)}
                    disabled={loading && isActive}
                    className={`flex items-center justify-between text-left px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                      isActive
                        ? 'bg-blue-600 text-white font-semibold shadow-xs'
                        : 'bg-white text-slate-700 hover:bg-blue-50/70 border border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <ChevronRight size={14} className={isActive ? 'text-white' : 'text-slate-400'} />
                      <span className="truncate">{mod.title}</span>
                    </div>
                    {mod.startPage && (
                      <span className={`text-[10px] shrink-0 font-medium px-2 py-0.5 rounded-md ${isActive ? 'bg-blue-700 text-blue-100' : 'bg-slate-100 text-slate-500'}`}>
                        Pg {mod.startPage}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── 7 SUMMARY STYLE SELECTORS ── */}
        <div className="mb-5">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-2" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
            Select Revision Style Format
          </span>
          <div className="flex flex-wrap gap-1.5">
            {summaryStyles.map((s) => {
              const Icon = s.icon;
              const isSelected = style === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setStyle(s.id)}
                  disabled={loading && isSelected}
                  title={s.tooltip}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white font-semibold shadow-xs ring-2 ring-blue-600/20'
                      : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 font-medium'
                  }`}
                >
                  <Icon size={13} className={isSelected ? 'text-white' : 'text-slate-500'} />
                  <span>{s.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {loading && (
          <div className="flex flex-col items-center justify-center gap-3 text-sm py-16 text-slate-500">
            <Loader2 size={24} className="animate-spin text-blue-600" /> 
            <span className="font-medium text-center px-4">
              {scope === 'book'
                ? `Generating comprehensive teacher lecture notes for "${selectedModule === 'overview' ? 'Textbook Overview' : selectedModule}"...`
                : `Generating ${summaryStyles.find(s => s.id === style)?.label} across ${scope === 'page' ? `Page ${pageNumber || 1}` : 'Current Chapter'}...`}
            </span>
          </div>
        )}

        {error && <div className="text-sm px-4 py-3 rounded-xl shadow-2xs border my-4" style={{ background: "#FEF2F2", borderColor: "#FECACA", color: "#B91C1C" }}>{error}</div>}

        {!loading && summary && (
          <>
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border shadow-2xs" style={{ background: "#E8F1FE", borderColor: "#D4E5FA" }}>
                  <Sparkles size={12} className="text-blue-600" />
                  <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "#2954E5", fontFamily: "'IBM Plex Mono', monospace" }}>
                    {summaryStyles.find(s => s.id === style)?.label || 'Summary'}
                  </span>
                </div>

                {isCached && (
                  <div title="Served instantly from browser session cache" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-medium">
                    <Database size={11} />
                    <span>Cached</span>
                  </div>
                )}
              </div>

              {/* ── LISTEN CONTROLS (READ ALOUD) ── */}
              <div className="flex items-center gap-1.5">
                {!speaking && (
                  <button
                    onClick={() => {
                      const fullText = (summary.subtopics || []).map(
                        (st) => `${st.name}. ${(st.points || []).join('. ')}`
                      ).join('. ');
                      speak(fullText, { subject, label: `${scope === 'book' ? selectedModule : topic} · ${style} Summary` });
                    }}
                    disabled={ttsLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all shadow-2xs hover:bg-slate-50 active:scale-95 disabled:opacity-60 cursor-pointer"
                    style={{ borderColor: "#D8E3F8", color: "#2954E5", background: "#FFFFFF" }}
                    aria-label="Listen to summary"
                  >
                    {ttsLoading ? <Loader2 size={13} className="animate-spin" /> : <Volume2 size={13} />}
                    {ttsLoading ? 'Loading…' : 'Read Aloud'}
                  </button>
                )}
                {speaking && !paused && (
                  <button
                    onClick={pause}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all shadow-2xs hover:bg-slate-50 cursor-pointer"
                    style={{ borderColor: "#D8E3F8", color: "#2954E5", background: "#FFFFFF" }}
                    aria-label="Pause"
                  >
                    <Pause size={13} /> Pause
                  </button>
                )}
                {speaking && paused && (
                  <button
                    onClick={resume}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all shadow-2xs hover:bg-slate-50 cursor-pointer"
                    style={{ borderColor: "#D8E3F8", color: "#2954E5", background: "#FFFFFF" }}
                    aria-label="Resume"
                  >
                    <Play size={13} /> Resume
                  </button>
                )}
                {speaking && (
                  <button
                    onClick={stop}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all shadow-2xs hover:opacity-80 cursor-pointer"
                    style={{ borderColor: "#FECACA", color: "#B91C1C", background: "#FEF2F2" }}
                    aria-label="Stop"
                  >
                    <VolumeX size={13} />
                  </button>
                )}
              </div>
            </div>

            <h2 className="text-xl sm:text-2xl font-semibold mb-6" style={{ color: "#101C34", fontFamily: "'Montserrat', sans-serif" }}>
              {scope === 'book' ? (selectedModule === 'overview' ? `Textbook Overview: ${subject || topic}` : selectedModule) : topic}
            </h2>

            <div className="flex flex-col gap-5">
              {(summary.subtopics || []).map((st, idx) => (
                <div key={idx} className="rounded-2xl border p-5 sm:p-6 shadow-2xs transition-all hover:shadow-xs" style={{ borderColor: "#D8E3F8", background: "#FFFFFF" }}>
                  <h3 className="text-[16px] font-bold mb-3 pb-2 border-b border-slate-100" style={{ color: "#101C34", fontFamily: "'Montserrat', sans-serif" }}>
                    {st.name}
                  </h3>
                  <div className="flex flex-col gap-3.5">
                    {(st.points || []).map((pt, i) => (
                      <div key={i} className="flex items-start gap-3 text-sm sm:text-[14.5px] leading-relaxed" style={{ color: "#2B3A55" }}>
                        <span className="mt-2 w-2 h-2 rounded-full shrink-0 shadow-2xs" style={{ background: "#2954E5" }} />
                        <p className="flex-1">{pt}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
