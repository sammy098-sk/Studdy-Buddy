import React, { useState, useEffect } from 'react';
import { BookOpen, Search, Sparkles, Clock, ArrowRight, Book, Award, TrendingUp, Loader2, Play, CheckCircle2, ChevronRight, Compass } from 'lucide-react';
import { supabase } from '../supabase';

// Rich emoji map for instant visual recognition
const SUBJECT_EMOJIS = {
  'Biology': '🧬',
  'Chemistry': '🧪',
  'Mathematics': '📐',
  'Physics': '⚡',
  'Economics': '📊',
  'English': '📖',
  'Geography': '🌍',
  'ICT': '💻',
  'Government': '🏛️',
  'Agricultural Science': '🌱',
  'Literature': '📚',
  'Accounting': '📈',
  'History': '⏳'
};

// Pastel styling for compact subject cards
const SUBJECT_PASTELE_STYLES = {
  'Biology': 'from-emerald-50 to-green-100/80 border-emerald-200/80 text-emerald-950 hover:border-emerald-400',
  'Chemistry': 'from-purple-50 to-violet-100/80 border-purple-200/80 text-purple-950 hover:border-purple-400',
  'Mathematics': 'from-blue-50 to-indigo-100/80 border-blue-200/80 text-blue-950 hover:border-blue-400',
  'Physics': 'from-amber-50 to-orange-100/80 border-amber-200/80 text-amber-950 hover:border-amber-400',
  'Economics': 'from-yellow-50 to-amber-100/80 border-yellow-200/80 text-yellow-950 hover:border-yellow-400',
  'English': 'from-rose-50 to-pink-100/80 border-rose-200/80 text-rose-950 hover:border-rose-400',
  'ICT': 'from-cyan-50 to-sky-100/80 border-cyan-200/80 text-cyan-950 hover:border-cyan-400',
  'Geography': 'from-teal-50 to-emerald-100/80 border-teal-200/80 text-teal-950 hover:border-teal-400',
  'default': 'from-slate-50 to-indigo-50/80 border-slate-200/80 text-slate-900 hover:border-slate-400'
};

const getSubjectPastel = (subject) => {
  return SUBJECT_PASTELE_STYLES[subject] || SUBJECT_PASTELE_STYLES['default'];
};

const getSubjectColor = (subject) => {
  const colors = {
    'Biology': 'from-green-600 to-emerald-800',
    'Physics': 'from-blue-600 to-indigo-800',
    'Chemistry': 'from-purple-600 to-fuchsia-800',
    'Mathematics': 'from-red-600 to-rose-800',
    'Economics': 'from-amber-600 to-orange-800',
    'default': 'from-slate-800 to-indigo-950'
  };
  return colors[subject] || colors['default'];
};

export default function HomeView({ user, onNavigate }) {
  const [subjects, setSubjects] = useState([]);
  const [books, setBooks] = useState([]);
  const [activeBook, setActiveBook] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGoalChip, setSelectedGoalChip] = useState(null);
  const [loading, setLoading] = useState(true);

  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  useEffect(() => {
    async function fetchDashboardData() {
      setLoading(true);
      try {
        // 1. Fetch all published textbooks
        const { data: textbooksData, error: textbooksError } = await supabase
          .from('textbooks')
          .select('*')
          .eq('is_published', true)
          .order('created_at', { ascending: false });

        if (textbooksError) throw textbooksError;

        // 2. Fetch user's reading progress if logged in
        let progressMap = {};
        if (user?.id) {
          const { data: progressData } = await supabase
            .from('reading_progress')
            .select('*')
            .eq('user_id', user.id)
            .order('updated_at', { ascending: false });

          if (progressData && progressData.length > 0) {
            progressData.forEach(p => {
              progressMap[p.book_id] = p;
            });
          }
        }

        const mergedBooks = (textbooksData || []).map(book => ({
          ...book,
          progress: progressMap[book.id] || null
        }));

        setBooks(mergedBooks);

        // Determine most relevant active book for "Continue Reading" hero card
        const inProgressBooks = mergedBooks
          .filter(b => b.progress && b.progress.current_page > 0)
          .sort((a, b) => new Date(b.progress.updated_at || 0) - new Date(a.progress.updated_at || 0));

        if (inProgressBooks.length > 0) {
          setActiveBook(inProgressBooks[0]);
        } else if (mergedBooks.length > 0) {
          setActiveBook(mergedBooks[0]); // Default to most recent book if no progress yet
        }

        // Group subjects compactly
        const counts = {};
        mergedBooks.forEach(book => {
          if (book.subject) {
            counts[book.subject] = (counts[book.subject] || 0) + 1;
          }
        });

        const subjectArray = Object.keys(counts).map(sub => ({
          name: sub,
          count: counts[sub]
        }));
        subjectArray.sort((a, b) => a.name.localeCompare(b.name));
        setSubjects(subjectArray);

      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, [user]);

  // Filter books dynamically by search query and chips
  const filteredBooks = books.filter(b => {
    if (!searchQuery.trim() && !selectedGoalChip) return true;
    const q = searchQuery.toLowerCase();
    const matchQuery = !q || b.title.toLowerCase().includes(q) || (b.author && b.author.toLowerCase().includes(q)) || (b.subject && b.subject.toLowerCase().includes(q));
    
    if (!selectedGoalChip || selectedGoalChip === 'Popular' || selectedGoalChip === 'Recently Added') {
      return matchQuery;
    }
    // Match chip keywords
    return matchQuery && (
      b.title.toLowerCase().includes(selectedGoalChip.toLowerCase()) ||
      (b.subject && b.subject.toLowerCase().includes(selectedGoalChip.toLowerCase()))
    );
  });

  const handleChipClick = (chip) => {
    if (selectedGoalChip === chip) {
      setSelectedGoalChip(null);
    } else {
      setSelectedGoalChip(chip);
      if (chip === 'Recently Added') {
        setSearchQuery('');
      }
    }
  };

  const isSearching = searchQuery.trim().length > 0 || selectedGoalChip !== null;

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 pb-24 md:pb-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-8 space-y-8">
        
        {/* 1. Header & Dynamic Welcome */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100/80 text-blue-700 rounded-full text-xs font-bold mb-2 tracking-wide uppercase shadow-2xs">
              <Sparkles size={13} className="text-blue-600 animate-pulse" />
              <span>Study Dashboard</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {getTimeGreeting()}, {user?.name || 'Samson'} 👋
            </h1>
            <p className="text-slate-500 text-sm sm:text-base mt-0.5 font-medium">
              Ready to continue learning and crush your study goals today?
            </p>
          </div>

          {/* Quick Stats Widget */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="bg-white px-3 py-2 rounded-xl border border-slate-200/80 shadow-2xs flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-sm">
                📚
              </div>
              <div>
                <div className="text-xs font-bold text-slate-800">{books.length} Books</div>
                <div className="text-[10px] font-semibold text-slate-400">Library</div>
              </div>
            </div>
            <div className="bg-white px-3 py-2 rounded-xl border border-slate-200/80 shadow-2xs flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600 font-bold text-sm">
                🎯
              </div>
              <div>
                <div className="text-xs font-bold text-slate-800">{subjects.length} Subjects</div>
                <div className="text-[10px] font-semibold text-slate-400">Available</div>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Instant Search Bar */}
        <div className="relative max-w-2xl">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
            <Search size={19} />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search textbooks by title, subject, or author..."
            className="w-full pl-11 pr-4 py-3 sm:py-3.5 bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium text-sm sm:text-base transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-xs font-bold text-slate-400 hover:text-slate-600"
            >
              Clear
            </button>
          )}
        </div>

        {/* Recommended Exam Study Goals Chips */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">Recommended:</span>
          {['Popular', 'Recently Added', 'Exam Prep', 'WAEC', 'JAMB'].map((chip) => {
            const isSelected = selectedGoalChip === chip;
            return (
              <button
                key={chip}
                onClick={() => handleChipClick(chip)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 flex items-center gap-1 shadow-2xs border ${
                  isSelected 
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md scale-[1.02]' 
                    : 'bg-white text-slate-700 border-slate-200/80 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                <span className="text-[13px]">⭐</span>
                <span>{chip}</span>
              </button>
            );
          })}
        </div>

        {/* LIVE SEARCH RESULTS VIEW */}
        {isSearching ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <span>Search Results</span>
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-md text-xs">{filteredBooks.length} found</span>
              </h2>
              <button
                onClick={() => { setSearchQuery(''); setSelectedGoalChip(null); }}
                className="text-xs font-bold text-blue-600 hover:underline"
              >
                Reset filter
              </button>
            </div>

            {filteredBooks.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 border-dashed">
                <Compass size={36} className="mx-auto text-slate-300 mb-3" />
                <h3 className="text-base font-bold text-slate-700 mb-1">No textbooks match your search</h3>
                <p className="text-sm text-slate-500 max-w-sm mx-auto">
                  Try broadening your keywords or clearing selected tags.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredBooks.map(book => (
                  <div 
                    key={book.id}
                    onClick={() => onNavigate('reader', { bookId: book.id })}
                    className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                  >
                    <div className={`h-32 w-full bg-gradient-to-br ${getSubjectColor(book.subject)} p-3 flex flex-col justify-between relative overflow-hidden`}>
                      <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-black/20 border-r border-white/10" />
                      <span className="ml-2 px-1.5 py-0.5 bg-black/30 backdrop-blur-md rounded text-[9px] font-bold text-white uppercase w-fit">
                        {book.subject}
                      </span>
                      <p className="text-white font-bold text-xs line-clamp-1 ml-2 drop-shadow-xs">{book.title}</p>
                    </div>
                    <div className="p-3">
                      <div className="text-xs font-bold text-blue-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                        <span>▶ Open book</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* 3. 📚 CONTINUE READING HERO WIDGET */}
            {activeBook && (
              <div className="space-y-2.5">
                <h2 className="text-sm font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 pl-1">
                  <span>📚</span>
                  <span>Continue Reading</span>
                </h2>

                <div 
                  onClick={() => onNavigate('reader', { bookId: activeBook.id })}
                  className={`bg-gradient-to-br ${getSubjectColor(activeBook.subject)} rounded-3xl p-6 sm:p-8 text-white shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer relative overflow-hidden group border border-white/10`}
                >
                  {/* Decorative ambient lighting and book texture */}
                  <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                  <BookOpen className="absolute right-6 sm:right-10 top-1/2 -translate-y-1/2 w-36 h-36 sm:w-48 sm:h-48 text-white/10 rotate-12 pointer-events-none group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute left-0 top-0 bottom-0 w-4 bg-black/25 border-r border-white/15" />

                  <div className="relative z-10 pl-3 sm:pl-5 max-w-2xl">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-black/30 backdrop-blur-md border border-white/20 rounded-lg text-xs font-extrabold tracking-wider uppercase mb-3 shadow-xs">
                      <span>{SUBJECT_EMOJIS[activeBook.subject] || '📖'}</span>
                      <span>{activeBook.subject || 'Textbook'}</span>
                    </div>

                    <h3 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white leading-tight mb-2 group-hover:text-blue-200 transition-colors">
                      {activeBook.title}
                    </h3>
                    {activeBook.author && (
                      <p className="text-white/80 font-medium text-sm sm:text-base mb-6">
                        By {activeBook.author}
                      </p>
                    )}

                    {/* Progress Bar Section */}
                    {activeBook.progress && activeBook.progress.current_page ? (
                      <div className="space-y-2 mb-6">
                        <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-white/90">
                          <span className="flex items-center gap-1.5">
                            <Clock size={15} className="text-blue-300" />
                            <span>Page {activeBook.progress.current_page} of {activeBook.total_pages || '?'}</span>
                          </span>
                          <span className="text-blue-200 font-extrabold">
                            {Math.min(100, Math.round((activeBook.progress.current_page / (activeBook.total_pages || 1)) * 100))}% Complete
                          </span>
                        </div>
                        <div className="w-full h-3 bg-black/30 backdrop-blur-sm rounded-full overflow-hidden p-0.5 border border-white/10">
                          <div 
                            className="h-full bg-gradient-to-r from-blue-400 to-emerald-400 rounded-full transition-all duration-1000 shadow-sm"
                            style={{ width: `${Math.min(100, Math.max(5, (activeBook.progress.current_page / (activeBook.total_pages || 1)) * 100))}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs sm:text-sm text-blue-200 font-semibold mb-6 flex items-center gap-1.5">
                        <Play size={14} className="fill-blue-200" />
                        Ready for your first reading session!
                      </p>
                    )}

                    {/* Action Button */}
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigate('reader', { bookId: activeBook.id });
                      }}
                      className="px-6 py-3.5 bg-white text-blue-900 font-extrabold text-sm sm:text-base rounded-2xl shadow-lg hover:bg-blue-50 active:scale-95 transition-all inline-flex items-center gap-2 group/btn"
                    >
                      <span>▶</span>
                      <span>{activeBook.progress?.current_page ? 'Continue Reading' : 'Start Reading'}</span>
                      <ArrowRight size={18} className="group-hover/btn:translate-x-1.5 transition-transform text-blue-600" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 4. COMPACT SUBJECTS GRID (Soft Pastel Colors) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between pl-1">
                <h2 className="text-sm font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <span>🎯</span>
                  <span>Subjects</span>
                </h2>
                <button 
                  onClick={() => onNavigate('library')} 
                  className="text-xs font-extrabold text-blue-600 hover:text-blue-700 flex items-center gap-0.5"
                >
                  <span>View full library</span>
                  <ChevronRight size={15} />
                </button>
              </div>

              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 size={24} className="animate-spin text-slate-400" />
                </div>
              ) : subjects.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 font-medium text-sm">
                  No published subjects available yet. Ask an admin to upload textbooks!
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                  {subjects.map((s) => {
                    const emoji = SUBJECT_EMOJIS[s.name] || '📚';
                    const pastelStyle = getSubjectPastel(s.name);
                    
                    return (
                      <div
                        key={s.name}
                        onClick={() => onNavigate('library', { subject: s.name })}
                        className={`bg-gradient-to-br ${pastelStyle} p-4 sm:p-4 rounded-2xl border transition-all duration-200 hover:-translate-y-1 active:scale-[0.98] cursor-pointer shadow-xs group flex flex-col justify-between h-full min-h-[5.5rem]`}
                      >
                        <div className="flex items-center gap-2.5 mb-3">
                          <span className="text-xl sm:text-2xl drop-shadow-xs shrink-0">{emoji}</span>
                          <span className="font-extrabold text-sm sm:text-[15px] truncate leading-tight">{s.name}</span>
                        </div>
                        
                        <div className="flex items-center justify-between text-[11px] sm:text-xs font-bold pt-2 border-t border-black/5 opacity-90">
                          <span>{s.count} {s.count === 1 ? 'textbook' : 'textbooks'}</span>
                          <span className="group-hover:translate-x-1 transition-transform flex items-center gap-0.5 text-blue-700 font-extrabold">
                            <span>Open</span>
                            <span>→</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 5. RECENTLY ADDED (Horizontal Scroll Carousel) */}
            {books.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between pl-1">
                  <h2 className="text-sm font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <span>✨</span>
                    <span>Recently Added Textbooks</span>
                  </h2>
                  <button 
                    onClick={() => onNavigate('library')}
                    className="text-xs font-extrabold text-blue-600 hover:text-blue-700 flex items-center gap-0.5"
                  >
                    <span>See all ({books.length})</span>
                    <ChevronRight size={15} />
                  </button>
                </div>

                <div className="flex overflow-x-auto gap-3 sm:gap-4 pb-4 pt-1 snap-x snap-mandatory no-scrollbar">
                  {books.slice(0, 6).map((book) => {
                    const isProcessing = book.status !== 'ready';
                    return (
                      <div
                        key={book.id}
                        onClick={() => !isProcessing && onNavigate('reader', { bookId: book.id })}
                        className="w-40 sm:w-48 shrink-0 snap-start bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-1 active:scale-[0.98] cursor-pointer flex flex-col group"
                      >
                        {/* Mini Kindle Cover Header */}
                        <div className={`h-28 sm:h-32 w-full bg-gradient-to-br ${getSubjectColor(book.subject)} p-3 flex flex-col justify-between relative overflow-hidden shrink-0`}>
                          <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-black/20 border-r border-white/10 z-10" />
                          <div className="relative z-20 pl-1.5">
                            <span className="inline-block px-1.5 py-0.5 bg-black/30 backdrop-blur-md rounded text-[9px] font-extrabold text-white uppercase tracking-wider">
                              {book.subject || 'Book'}
                            </span>
                          </div>
                          <div className="relative z-20 pl-1.5 mt-auto">
                            <div className="w-6 h-0.5 bg-white/40 rounded-full mb-1"></div>
                            <p className="text-white text-[10px] font-bold line-clamp-1 uppercase tracking-tight opacity-95">{book.title}</p>
                          </div>
                        </div>

                        {/* Mini Card Body */}
                        <div className="p-3 flex-1 flex flex-col justify-between bg-white">
                          <div>
                            <h3 className="text-[13px] sm:text-sm font-bold text-slate-800 line-clamp-2 leading-snug mb-1 min-h-[2.3rem]" title={book.title}>
                              {book.title}
                            </h3>
                            <p className="text-[11px] text-slate-400 font-medium truncate mb-2.5">
                              {book.author || 'Academic Press'}
                            </p>
                          </div>
                          
                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-extrabold text-blue-600">
                            <span>{book.progress?.current_page ? `Pg ${book.progress.current_page}` : 'New'}</span>
                            <span className="group-hover:translate-x-1 transition-transform">▶ Read</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
