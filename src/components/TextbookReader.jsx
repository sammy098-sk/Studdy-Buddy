import React, { useState, useEffect } from 'react';
import { BookOpen, ChevronLeft, ChevronRight, Volume2, VolumeX, Pause, Play, CheckCircle2, List, Sun, Moon, Book } from 'lucide-react';
import { supabase } from '../supabase';
import useSpeech from '../hooks/useSpeech';
import BackToHomeButton from './BackToHomeButton';
import Footer from './Footer';

export default function TextbookReader({ subject, onNavigate, user }) {
  const [textbooks, setTextbooks] = useState([]);
  const [selectedTextbook, setSelectedTextbook] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Reader Customizations
  const [theme, setTheme] = useState('light'); // 'light' | 'sepia' | 'dark'
  const [fontSize, setFontSize] = useState('base'); // 'sm' | 'base' | 'lg' | 'xl'

  const { speak, pause, resume, stop, speaking, paused, loading: ttsLoading } = useSpeech();

  // Fetch available textbooks for subject (or all if subject not specified)
  useEffect(() => {
    const fetchTextbooks = async () => {
      setLoading(true);
      let query = supabase.from('textbooks').select('*').order('created_at', { ascending: false });
      if (subject) {
        query = query.eq('subject', subject);
      }

      const { data, error } = await query;
      if (data && data.length > 0) {
        setTextbooks(data);
        setSelectedTextbook(data[0]);
      } else {
        setTextbooks([]);
        setSelectedTextbook(null);
      }
      setLoading(false);
    };

    fetchTextbooks();
  }, [subject]);

  // Fetch chapters when selectedTextbook changes
  useEffect(() => {
    if (!selectedTextbook) {
      setChapters([]);
      return;
    }

    const fetchChapters = async () => {
      setLoadingChapters(true);
      const { data, error } = await supabase
        .from('textbook_chapters')
        .select('*')
        .eq('textbook_id', selectedTextbook.id)
        .order('chapter_number', { ascending: true });

      if (data) {
        setChapters(data);
        setActiveChapterIndex(0);
      } else {
        setChapters([]);
      }
      setLoadingChapters(false);
    };

    fetchChapters();
  }, [selectedTextbook]);

  const activeChapter = chapters[activeChapterIndex];

  // Theme styling configurations
  const themeStyles = {
    light: { bg: '#FFFFFF', text: '#101C34', cardBg: '#FAFBFF', border: '#D8E3F8' },
    sepia: { bg: '#FBF0D9', text: '#433422', cardBg: '#F4E4C1', border: '#E2D1A9' },
    dark: { bg: '#0F172A', text: '#F8FAFC', cardBg: '#1E293B', border: '#334155' },
  };

  const fontSizeClasses = {
    sm: 'text-sm leading-relaxed',
    base: 'text-base leading-relaxed',
    lg: 'text-lg leading-loose',
    xl: 'text-xl leading-loose',
  };

  const currentTheme = themeStyles[theme];

  return (
    <div className="flex-1 overflow-y-auto flex flex-col transition-colors" style={{ background: currentTheme.bg, color: currentTheme.text }}>
      <div className="flex-1 px-4 sm:px-8 py-8">
        <div className="max-w-4xl mx-auto">

          <BackToHomeButton onNavigate={onNavigate} />

          {/* Reader Toolbar */}
          <div className="flex items-center justify-between gap-4 mb-6 pb-4 border-b flex-wrap" style={{ borderColor: currentTheme.border }}>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen((prev) => !prev)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border"
                style={{ borderColor: currentTheme.border }}
              >
                <List size={15} /> Table of Contents
              </button>

              {/* Textbook Selector Dropdown */}
              {textbooks.length > 1 && (
                <select
                  value={selectedTextbook?.id || ''}
                  onChange={(e) => {
                    const found = textbooks.find((t) => t.id === e.target.value);
                    if (found) setSelectedTextbook(found);
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border bg-transparent"
                  style={{ borderColor: currentTheme.border, color: currentTheme.text }}
                >
                  {textbooks.map((tb) => (
                    <option key={tb.id} value={tb.id}>{tb.title}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Controls: Theme & Font Size */}
            <div className="flex items-center gap-3">
              {/* Theme toggle */}
              <div className="flex items-center border rounded-lg overflow-hidden" style={{ borderColor: currentTheme.border }}>
                <button
                  onClick={() => setTheme('light')}
                  className={`p-1.5 ${theme === 'light' ? 'bg-blue-600 text-white' : ''}`}
                  title="Light mode"
                >
                  <Sun size={14} />
                </button>
                <button
                  onClick={() => setTheme('sepia')}
                  className={`px-2 py-1 text-xs font-serif font-bold ${theme === 'sepia' ? 'bg-amber-700 text-white' : ''}`}
                  title="Sepia mode"
                >
                  Aa
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  className={`p-1.5 ${theme === 'dark' ? 'bg-slate-700 text-white' : ''}`}
                  title="Dark mode"
                >
                  <Moon size={14} />
                </button>
              </div>

              {/* Font size toggle */}
              <div className="flex items-center border rounded-lg overflow-hidden text-xs" style={{ borderColor: currentTheme.border }}>
                {['sm', 'base', 'lg', 'xl'].map((sz) => (
                  <button
                    key={sz}
                    onClick={() => setFontSize(sz)}
                    className={`px-2 py-1 font-semibold uppercase ${fontSize === sz ? 'bg-blue-600 text-white' : ''}`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {loading && (
            <div className="py-20 text-center text-sm opacity-70">Loading textbooks...</div>
          )}

          {!loading && !selectedTextbook && (
            <div className="py-16 text-center flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-blue-100 text-blue-600">
                <Book size={24} />
              </div>
              <p className="font-semibold text-base">No Textbooks Available Yet</p>
              <p className="text-sm opacity-70 max-w-md">
                No uploaded textbooks found for {subject || 'this subject'}. Admins can upload textbooks using the PDF Importer!
              </p>
            </div>
          )}

          {selectedTextbook && (
            <div className="flex flex-col md:flex-row gap-6">
              
              {/* TOC Drawer / Sidebar */}
              {(sidebarOpen || window.innerWidth >= 768) && (
                <div className={`w-full md:w-64 shrink-0 rounded-2xl border p-4 mb-4 md:mb-0`} style={{ background: currentTheme.cardBg, borderColor: currentTheme.border }}>
                  <h3 className="text-xs font-bold uppercase tracking-wider mb-3 opacity-70">
                    {selectedTextbook.title}
                  </h3>
                  <div className="flex flex-col gap-1 max-h-[500px] overflow-y-auto pr-1">
                    {chapters.map((ch, idx) => (
                      <button
                        key={ch.id || idx}
                        onClick={() => {
                          setActiveChapterIndex(idx);
                          setSidebarOpen(false);
                        }}
                        className={`text-left px-3 py-2 rounded-xl text-xs font-medium transition-colors truncate ${
                          activeChapterIndex === idx ? 'bg-blue-600 text-white' : 'hover:opacity-80'
                        }`}
                      >
                        {ch.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Chapter Reading Canvas */}
              <div className="flex-1 min-w-0">
                {loadingChapters && (
                  <div className="py-16 text-center text-sm opacity-70">Loading chapter content...</div>
                )}

                {!loadingChapters && activeChapter && (
                  <div className="flex flex-col gap-6">
                    
                    {/* Chapter Header */}
                    <div className="p-6 rounded-2xl border flex flex-col gap-4" style={{ background: currentTheme.cardBg, borderColor: currentTheme.border }}>
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="text-xs font-bold uppercase tracking-wide px-2.5 py-1 rounded bg-blue-100 text-blue-700">
                          Chapter {activeChapter.chapter_number} of {chapters.length}
                        </span>

                        {/* Speech Listen Controls */}
                        <div className="flex items-center gap-1">
                          {!speaking && (
                            <button
                              onClick={() => speak(activeChapter.content, { subject: selectedTextbook.subject, label: activeChapter.title })}
                              disabled={ttsLoading}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-opacity hover:opacity-80"
                              style={{ borderColor: currentTheme.border }}
                            >
                              <Volume2 size={14} /> Listen to Chapter
                            </button>
                          )}
                          {speaking && !paused && (
                            <button onClick={pause} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border" style={{ borderColor: currentTheme.border }}>
                              <Pause size={14} /> Pause
                            </button>
                          )}
                          {speaking && paused && (
                            <button onClick={resume} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border" style={{ borderColor: currentTheme.border }}>
                              <Play size={14} /> Resume
                            </button>
                          )}
                          {speaking && (
                            <button onClick={stop} className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-semibold text-red-600 border border-red-200 bg-red-50">
                              <VolumeX size={14} />
                            </button>
                          )}
                        </div>
                      </div>

                      <h1 className="text-2xl font-bold font-serif">{activeChapter.title}</h1>
                    </div>

                    {/* Main Reading Text */}
                    <div className={`p-6 sm:p-8 rounded-2xl border whitespace-pre-wrap ${fontSizeClasses[fontSize]}`} style={{ background: currentTheme.cardBg, borderColor: currentTheme.border }}>
                      {activeChapter.content}
                    </div>

                    {/* Pagination Controls */}
                    <div className="flex items-center justify-between pt-4">
                      <button
                        onClick={() => setActiveChapterIndex((i) => Math.max(0, i - 1))}
                        disabled={activeChapterIndex === 0}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border disabled:opacity-30"
                        style={{ borderColor: currentTheme.border }}
                      >
                        <ChevronLeft size={16} /> Previous Chapter
                      </button>

                      <button
                        onClick={() => setActiveChapterIndex((i) => Math.min(chapters.length - 1, i + 1))}
                        disabled={activeChapterIndex === chapters.length - 1}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 disabled:opacity-30"
                      >
                        Next Chapter <ChevronRight size={16} />
                      </button>
                    </div>

                  </div>
                )}
              </div>

            </div>
          )}

        </div>
      </div>
      <Footer onNavigate={onNavigate} />
    </div>
  );
}
