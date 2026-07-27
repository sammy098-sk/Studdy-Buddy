import React, { useEffect, useState } from 'react';
import { ChevronLeft, BookOpen, Clock, History, ChevronRight } from 'lucide-react';
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
    <div className="flex-1 overflow-y-auto flex flex-col" style={{ background: '#F0F4FF' }}>
      <div className="flex-1 px-4 sm:px-8 py-10">
        <div className="max-w-2xl mx-auto">

          <BackToHomeButton onNavigate={onNavigate} />

          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#2954E5,#4f46e5)' }}>
              <History size={18} color="#FFFFFF" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold" style={{ color: '#101C34', fontFamily: "'Montserrat', sans-serif" }}>
                Study History
              </h2>
              <p className="text-sm" style={{ color: '#8493B0' }}>
                All your past study sessions
              </p>
            </div>
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
                      className="rounded-2xl border overflow-hidden"
                      style={{ borderColor: '#D8E3F8', background: '#FFFFFF', boxShadow: '0 4px 16px -4px rgba(41,84,229,0.07)' }}
                    >
                      {/* Session card header */}
                      <div className="flex items-center gap-3 p-4">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#E8F1FE' }}>
                          <Icon size={18} style={{ color: '#2954E5' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[14px] font-semibold truncate" style={{ color: '#101C34' }}>
                              {session.subject}
                            </span>
                            {session.mode && (
                              <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ background: modeStyle.bg, color: modeStyle.color }}>
                                {MODE_LABELS[session.mode] || session.mode}
                              </span>
                            )}
                          </div>
                          {session.topic && (
                            <div className="text-xs truncate mt-0.5" style={{ color: '#8493B0' }}>{session.topic}</div>
                          )}
                          {duration && (
                            <div className="flex items-center gap-1 text-xs mt-1" style={{ color: '#B7C3DA' }}>
                              <Clock size={11} /> {duration}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {/* Resume button */}
                          <button
                            onClick={() => onResume(session)}
                            className="text-xs px-3 py-1.5 rounded-lg font-medium text-white"
                            style={{ background: '#2954E5' }}
                          >
                            Resume
                          </button>
                          {/* Expand for messages */}
                          <button
                            onClick={() => toggleExpand(session)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
                            style={{ background: isExpanded ? '#E8F1FE' : 'transparent' }}
                            aria-label="Show messages"
                          >
                            <ChevronRight
                              size={16}
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
      <Footer onNavigate={onNavigate} />
    </div>
  );
}
