import React, { useEffect, useState } from 'react';
import { ChevronLeft, BookOpen, Clock, History, ChevronRight, Trash2, AlertTriangle, X } from 'lucide-react';
import { supabase } from '../supabase';
import { SUBJECT_ICONS } from '../config';
import Footer from './Footer';
import BackToHomeButton from './BackToHomeButton';

function formatDuration(started, ended) {
  if (!started || !ended) return null;
  const mins = Math.round((new Date(ended) - new Date(started)) / 60000);
  if (mins < 1) return '< 1 min';
  if (mins < 60) return `${mins} min${mins !== 1 ? 's' : ''}`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m > 0 ? m + 'm' : ''}`.trim();
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });
}

function groupByDate(sessions) {
  const groups = {};
  sessions.forEach((s) => {
    const label = formatDate(s.started_at);
    if (!groups[label]) groups[label] = [];
    groups[label].push(s);
  });
  return groups;
}

const MODE_LABELS = {
  textbook: 'Textbook',
  summary: 'Summary',
  questionnaire: 'Quiz',
};

const MODE_COLORS = {
  textbook: { bg: '#E8F1FE', color: '#2954E5' },
  summary: { bg: '#FEF9E8', color: '#B45309' },
  questionnaire: { bg: '#F0FFF4', color: '#16A34A' },
};

export default function SessionsPage({ userId, onNavigate, onResume }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [sessionMsgs, setSessionMsgs] = useState({});
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [clearing, setClearing] = useState(false);

  const handleClearHistory = async () => {
    setClearing(true);
    try {
      // Aggressively wipe all user history records to fix ghost state bugs
      const [sessionsRes, studyRes, readingRes] = await Promise.all([
        supabase.from('study_sessions').delete().eq('user_id', userId),
        supabase.from('study_progress').delete().eq('user_id', userId),
        supabase.from('reading_progress').delete().eq('user_id', userId)
      ]);
      
      if (sessionsRes.error) throw sessionsRes.error;
      if (studyRes.error) throw studyRes.error;
      if (readingRes.error) throw readingRes.error;

      // Immediately reflect clean state in frontend without requiring page refresh
      setSessions([]);
      setSessionMsgs({});
      setShowConfirmModal(false);
    } catch (err) {
      console.error('Failed to clear history:', err.message);
      alert('Could not clear history: ' + err.message);
    } finally {
      setClearing(false);
    }
  };

  useEffect(() => {
    const fetchSessions = async () => {
      const { data } = await supabase
        .from('study_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('started_at', { ascending: false });
      setSessions(data || []);
      setLoading(false);
    };
    if (userId) fetchSessions();
  }, [userId]);

  const toggleExpand = async (session) => {
    const id = session.id;
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    if (sessionMsgs[id]) return; // already loaded
    const { data } = await supabase
      .from('messages')
      .select('role, content, created_at')
      .eq('session_id', id)
      .order('created_at', { ascending: true });
    setSessionMsgs((prev) => ({ ...prev, [id]: data || [] }));
  };

  const grouped = groupByDate(sessions);

  return (
    <div className="flex-1 overflow-y-auto flex flex-col" style={{ background: '#edf5f1' }}>
      <div className="flex-1 px-4 sm:px-8 lg:px-12 py-10">
        <div className="max-w-2xl lg:max-w-4xl xl:max-w-5xl mx-auto">

          <BackToHomeButton onNavigate={onNavigate} />

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 lg:mb-12">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 lg:w-14 lg:h-14 rounded-xl lg:rounded-2xl flex items-center justify-center shrink-0 shadow-sm" style={{ background: 'linear-gradient(135deg,#2954E5,#4f46e5)' }}>
                <History size={20} color="#FFFFFF" className="lg:w-7 lg:h-7" />
              </div>
              <div>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold" style={{ color: '#101C34', fontFamily: "'Montserrat', sans-serif" }}>
                  Study History
                </h2>
                <p className="text-sm sm:text-base lg:text-lg font-medium" style={{ color: '#8493B0' }}>
                  All your past study sessions
                </p>
              </div>
            </div>

            {sessions.length > 0 && (
              <button
                onClick={() => setShowConfirmModal(true)}
                className="flex items-center justify-center gap-2 px-4 py-2.5 lg:px-5 lg:py-3 rounded-xl lg:rounded-2xl border border-red-200 bg-red-50 text-red-600 font-bold text-xs sm:text-sm lg:text-base hover:bg-red-600 hover:text-white hover:border-red-600 transition-all duration-200 shadow-sm self-start sm:self-auto"
              >
                <Trash2 size={18} className="shrink-0 lg:w-5 lg:h-5" />
                <span>Clear History</span>
              </button>
            )}
          </div>

          {loading && (
            <div className="text-center py-16 text-sm" style={{ color: '#8493B0' }}>Loading your sessions…</div>
          )}

          {!loading && sessions.length === 0 && (
            <div className="text-center py-16 flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: '#E8F1FE' }}>
                <BookOpen size={24} style={{ color: '#2954E5' }} />
              </div>
              <p className="font-medium" style={{ color: '#101C34' }}>No sessions yet</p>
              <p className="text-sm" style={{ color: '#8493B0' }}>
                Pick a subject on the home page to start studying!
              </p>
              <button
                onClick={() => onNavigate('study')}
                className="mt-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white"
                style={{ background: '#2954E5' }}
              >
                Go to Home
              </button>
            </div>
          )}

          {/* Grouped sessions */}
          {Object.entries(grouped).map(([dateLabel, daySessions]) => (
            <div key={dateLabel} className="mb-8">
              <h3 className="text-[11px] font-semibold uppercase tracking-wide mb-3" style={{ color: '#8493B0', fontFamily: "'IBM Plex Mono', monospace" }}>
                {dateLabel}
              </h3>
              <div className="flex flex-col gap-3">
                {daySessions.map((session) => {
                  const Icon = SUBJECT_ICONS[session.subject] || BookOpen;
                  const modeStyle = MODE_COLORS[session.mode] || { bg: '#F0F4FF', color: '#5A6B8C' };
                  const duration = formatDuration(session.started_at, session.ended_at);
                  const msgs = sessionMsgs[session.id];
                  const isExpanded = expandedId === session.id;

                  return (
                    <div
                      key={session.id}
                      className="rounded-2xl lg:rounded-3xl border overflow-hidden transition-all hover:border-blue-200/80"
                      style={{ borderColor: '#D8E3F8', background: '#FFFFFF', boxShadow: '0 4px 16px -4px rgba(41,84,229,0.07)' }}
                    >
                      {/* Session card header */}
                      <div className="flex items-center gap-3 lg:gap-4 p-4 lg:p-6">
                        <div className="w-10 h-10 lg:w-14 lg:h-14 rounded-xl lg:rounded-2xl flex items-center justify-center shrink-0" style={{ background: '#E8F1FE' }}>
                          <Icon size={20} style={{ color: '#2954E5' }} className="lg:w-7 lg:h-7" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 lg:gap-3 flex-wrap">
                            <span className="text-[15px] sm:text-base lg:text-xl font-extrabold truncate" style={{ color: '#101C34' }}>
                              {session.subject}
                            </span>
                            {session.mode && (
                              <span className="text-[11px] lg:text-xs px-2.5 py-0.5 rounded-full font-bold" style={{ background: modeStyle.bg, color: modeStyle.color }}>
                                {MODE_LABELS[session.mode] || session.mode}
                              </span>
                            )}
                          </div>
                          {session.topic && (
                            <div className="text-xs sm:text-sm lg:text-base font-medium truncate mt-0.5 lg:mt-1" style={{ color: '#8493B0' }}>{session.topic}</div>
                          )}
                          {duration && (
                            <div className="flex items-center gap-1.5 text-xs lg:text-sm font-semibold mt-1 lg:mt-1.5" style={{ color: '#B7C3DA' }}>
                              <Clock size={13} className="lg:w-4 lg:h-4" /> {duration}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 lg:gap-3 shrink-0">
                          {/* Resume button */}
                          <button
                            onClick={() => onResume(session)}
                            className="text-xs sm:text-sm lg:text-base px-3.5 py-1.5 lg:px-5 lg:py-2.5 rounded-lg lg:rounded-xl font-bold text-white shadow-xs hover:opacity-95 transition-opacity"
                            style={{ background: '#2954E5' }}
                          >
                            Resume
                          </button>
                          {/* Expand for messages */}
                          <button
                            onClick={() => toggleExpand(session)}
                            className="w-8 h-8 lg:w-10 lg:h-10 flex items-center justify-center rounded-lg lg:rounded-xl transition-colors hover:bg-slate-50"
                            style={{ background: isExpanded ? '#E8F1FE' : 'transparent' }}
                            aria-label="Show messages"
                          >
                            <ChevronRight
                              size={18}
                              className="lg:w-6 lg:h-6"
                              style={{ color: '#8493B0', transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}
                            />
                          </button>
                        </div>
                      </div>

                      {/* Expanded messages */}
                      {isExpanded && (
                        <div className="px-4 pb-4 flex flex-col gap-2 border-t" style={{ borderColor: '#F0F4FF' }}>
                          {!msgs && (
                            <p className="text-xs pt-3 text-center" style={{ color: '#8493B0' }}>Loading…</p>
                          )}
                          {msgs && msgs.length === 0 && (
                            <p className="text-xs pt-3 text-center" style={{ color: '#B7C3DA' }}>No chat messages in this session.</p>
                          )}
                          {msgs && msgs.length > 0 && (
                            <div className="pt-3 flex flex-col gap-2">
                              {msgs.map((m, i) => (
                                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                  <div
                                    className="px-3 py-2 rounded-xl text-[12px] leading-relaxed whitespace-pre-wrap"
                                    style={{
                                      maxWidth: '82%',
                                      ...(m.role === 'user'
                                        ? { background: '#2954E5', color: '#FFFFFF', borderBottomRightRadius: '4px' }
                                        : { background: '#F0F4FF', color: '#101C34', borderBottomLeftRadius: '4px' }),
                                    }}
                                  >
                                    {m.content}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 sm:p-8 lg:p-10 max-w-md lg:max-w-lg w-full shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between mb-4 lg:mb-5">
              <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                <AlertTriangle size={24} className="lg:w-7 lg:h-7" />
              </div>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <h3 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-slate-900 mb-2 font-['Montserrat']">
              Clear all history?
            </h3>
            <p className="text-sm lg:text-base font-medium text-slate-600 leading-relaxed mb-6 lg:mb-8">
              This will permanently remove your reading history, AI conversations, and activity history. This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3 lg:gap-4">
              <button
                onClick={() => setShowConfirmModal(false)}
                disabled={clearing}
                className="px-5 py-2.5 lg:px-6 lg:py-3 rounded-xl lg:rounded-2xl text-sm lg:text-base font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleClearHistory}
                disabled={clearing}
                className="px-5 py-2.5 lg:px-6 lg:py-3 rounded-xl lg:rounded-2xl text-sm lg:text-base font-bold text-white bg-red-600 hover:bg-red-700 shadow-md shadow-red-600/20 transition-all"
              >
                {clearing ? 'Clearing...' : 'Yes, Clear History'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer onNavigate={onNavigate} />
    </div>
  );
}
