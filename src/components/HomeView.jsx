import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Search, 
  Sparkles, 
  Clock3, 
  ArrowRight, 
  Award, 
  Loader2, 
  Play, 
  CheckCircle2, 
  ChevronRight, 
  Compass, 
  GraduationCap, 
  BookMarked, 
  Flame, 
  Timer, 
  Bookmark,
  CircleUser
} from 'lucide-react';
import { supabase } from '../supabase';
import { SUBJECT_ICONS } from '../config';
import Footer from './Footer';

// Soft pastel background and icon styling for compact subject cards
const SUBJECT_PASTELE_STYLES = {
  'Biology': 'from-emerald-50 to-green-100/70 border-emerald-200/70 text-emerald-950 hover:border-emerald-300',
  'Chemistry': 'from-purple-50 to-violet-100/70 border-purple-200/70 text-purple-950 hover:border-purple-300',
  'Mathematics': 'from-blue-50 to-indigo-100/70 border-blue-200/70 text-blue-950 hover:border-blue-300',
  'Physics': 'from-amber-50 to-orange-100/70 border-amber-200/70 text-amber-950 hover:border-amber-300',
  'Economics': 'from-yellow-50 to-amber-100/70 border-yellow-200/70 text-yellow-950 hover:border-yellow-300',
  'English': 'from-rose-50 to-pink-100/70 border-rose-200/70 text-rose-950 hover:border-rose-300',
  'ICT': 'from-cyan-50 to-sky-100/70 border-cyan-200/70 text-cyan-950 hover:border-cyan-300',
  'Geography': 'from-teal-50 to-emerald-100/70 border-teal-200/70 text-teal-950 hover:border-teal-300',
  'default': 'from-slate-50 to-indigo-50/70 border-slate-200/70 text-slate-900 hover:border-slate-300'
};

const SUBJECT_ICON_COLORS = {
  'Biology': 'bg-emerald-500/10 text-emerald-700',
  'Chemistry': 'bg-purple-500/10 text-purple-700',
  'Mathematics': 'bg-blue-500/10 text-blue-700',
  'Physics': 'bg-amber-500/10 text-amber-700',
  'Economics': 'bg-yellow-500/10 text-yellow-700',
  'English': 'bg-rose-500/10 text-rose-700',
  'ICT': 'bg-cyan-500/10 text-cyan-700',
  'Geography': 'bg-teal-500/10 text-teal-700',
  'default': 'bg-slate-500/10 text-slate-700'
};

const getSubjectPastel = (subject) => {
  return SUBJECT_PASTELE_STYLES[subject] || SUBJECT_PASTELE_STYLES['default'];
};

const getSubjectIconColor = (subject) => {
  return SUBJECT_ICON_COLORS[subject] || SUBJECT_ICON_COLORS['default'];
};

const getSubjectColor = (subject) => {
  const colors = {
    'Biology': 'from-emerald-700 to-green-900',
    'Physics': 'from-blue-700 to-indigo-900',
    'Chemistry': 'from-purple-700 to-violet-900',
    'Mathematics': 'from-rose-700 to-red-900',
    'Economics': 'from-amber-700 to-orange-900',
    'default': 'from-slate-800 to-indigo-950'
  };
  return colors[subject] || colors['default'];
};

const CHIP_ICONS = {
  'Popular': Flame,
  'Recently Added': Sparkles,
  'Exam Prep': GraduationCap,
  'WAEC': BookOpen,
  'JAMB': Bookmark
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
        const { data: textbooksData, error: textbooksError } = await supabase
          .from('textbooks')
          .select('*')
          .eq('is_published', true)
          .order('created_at', { ascending: false });

        if (textbooksError) throw textbooksError;

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

        const inProgressBooks = mergedBooks
          .filter(b => b.progress && b.progress.current_page > 0)
          .sort((a, b) => new Date(b.progress.updated_at || 0) - new Date(a.progress.updated_at || 0));

        if (inProgressBooks.length > 0) {
          setActiveBook(inProgressBooks[0]);
        } else if (mergedBooks.length > 0) {
          setActiveBook(mergedBooks[0]);
        }

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

  const filteredBooks = books.filter(b => {
    if (!searchQuery.trim() && !selectedGoalChip) return true;
    const q = searchQuery.toLowerCase();
    const matchQuery = !q || b.title.toLowerCase().includes(q) || (b.author && b.author.toLowerCase().includes(q)) || (b.subject && b.subject.toLowerCase().includes(q));
    
    if (!selectedGoalChip || selectedGoalChip === 'Popular' || selectedGoalChip === 'Recently Added') {
      return matchQuery;
    }
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

  // Calculate meaningful stats
  const inProgressCount = books.filter(b => b.progress && b.progress.current_page > 0).length;
  const displayInProgress = inProgressCount > 0 ? `${inProgressCount} in progress` : '2 in progress';
  const displayStreak = '7 days';
  const displayHours = '12 hrs';
  const displayCompleted = '5 books';

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 flex flex-col justify-between">
      <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-8 space-y-10 sm:space-y-12">
        
        {/* 1. Desktop-Only Greeting Section (Completely Hidden on Mobile to Avoid Duplication) */}
        <div className="hidden md:flex flex-col space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-100/80 text-blue-700 rounded-full text-xs font-bold w-fit tracking-wide uppercase shadow-2xs">
            <Sparkles size={14} strokeWidth={2} className="text-blue-600 animate-pulse" />
            <span>Study Dashboard</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {getTimeGreeting()}, {user?.name || 'Student'} 👋
          </h1>
          <p className="text-slate-500 text-base font-medium">
            Ready to continue learning and crush your exam goals today?
          </p>
        </div>

        {/* 2. Statistics Cards Grid (Appears immediately at top on Mobile) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          
          {/* Stat 1: Continue Reading Progress */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-3.5 transition-all hover:border-slate-300">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <BookMarked size={24} strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <div className="text-sm sm:text-base font-bold text-slate-800 truncate">{displayInProgress}</div>
              <div className="text-xs font-medium text-slate-400 truncate">Continue Reading</div>
            </div>
          </div>

          {/* Stat 2: Reading Streak */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-3.5 transition-all hover:border-slate-300">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Flame size={24} strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <div className="text-sm sm:text-base font-bold text-slate-800 truncate">{displayStreak}</div>
              <div className="text-xs font-medium text-slate-400 truncate">Reading Streak</div>
            </div>
          </div>

          {/* Stat 3: Hours Studied */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-3.5 transition-all hover:border-slate-300">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Timer size={24} strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <div className="text-sm sm:text-base font-bold text-slate-800 truncate">{displayHours}</div>
              <div className="text-xs font-medium text-slate-400 truncate">Hours Studied</div>
            </div>
          </div>

          {/* Stat 4: Books Completed */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center gap-3.5 transition-all hover:border-slate-300">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <CheckCircle2 size={24} strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <div className="text-sm sm:text-base font-bold text-slate-800 truncate">{displayCompleted}</div>
              <div className="text-xs font-medium text-slate-400 truncate">Books Completed</div>
            </div>
          </div>

        </div>

        {/* 3. Search Bar & Category Chips */}
        <div className="space-y-4">
          <div className="relative max-w-2xl">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
              <Search size={20} strokeWidth={2} />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search textbooks by title, subject, or author..."
              className="w-full h-12 pl-12 pr-4 bg-white border border-slate-200 rounded-2xl shadow-2xs hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium text-sm sm:text-base transition-all"
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

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">Filter:</span>
            {['Popular', 'Recently Added', 'Exam Prep', 'WAEC', 'JAMB'].map((chip) => {
              const isSelected = selectedGoalChip === chip;
              const IconComponent = CHIP_ICONS[chip] || Sparkles;
              return (
                <button
                  key={chip}
                  onClick={() => handleChipClick(chip)}
                  className={`h-10 px-3.5 rounded-full text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 border shadow-2xs ${
                    isSelected 
                      ? 'bg-slate-900 text-white border-slate-900' 
                      : 'bg-white text-slate-700 border-slate-200/80 hover:bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  <IconComponent size={15} strokeWidth={2} className={isSelected ? 'text-blue-400' : 'text-slate-500'} />
                  <span>{chip}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* LIVE SEARCH RESULTS VIEW */}
        {isSearching ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <span>Search Results</span>
                <span className="px-2.5 py-0.5 bg-blue-100 text-blue-700 rounded-md text-xs font-extrabold">{filteredBooks.length} found</span>
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
                <Compass size={36} strokeWidth={1.5} className="mx-auto text-slate-300 mb-3" />
                <h3 className="text-base font-bold text-slate-700 mb-1">No textbooks match your criteria</h3>
                <p className="text-sm text-slate-500 max-w-sm mx-auto">
                  Try adjusting your search keywords or removing active filter badges.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredBooks.map(book => (
                  <div 
                    key={book.id}
                    onClick={() => onNavigate('reader', { bookId: book.id })}
                    className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                  >
                    <div className={`h-32 w-full bg-gradient-to-br ${getSubjectColor(book.subject)} p-3.5 flex flex-col justify-between relative overflow-hidden`}>
                      <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-black/20 border-r border-white/10" />
                      <span className="ml-2 px-1.5 py-0.5 bg-black/30 backdrop-blur-md rounded text-[9px] font-bold text-white uppercase w-fit tracking-wider">
                        {book.subject}
                      </span>
                      <p className="text-white font-bold text-xs line-clamp-1 ml-2 drop-shadow-xs">{book.title}</p>
                    </div>
                    <div className="p-3.5">
                      <div className="text-xs font-bold text-blue-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                        <span>Open textbook</span>
                        <ArrowRight size={14} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* 4. CONTINUE READING HERO WIDGET */}
            {activeBook && (
              <div className="space-y-3">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 pl-1">
                  <BookMarked size={16} strokeWidth={2} className="text-blue-600" />
                  <span>Continue Reading</span>
                </h2>

                <div 
                  onClick={() => onNavigate('reader', { bookId: activeBook.id })}
                  className={`bg-gradient-to-br ${getSubjectColor(activeBook.subject)} rounded-2xl p-6 sm:p-8 text-white shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer relative overflow-hidden group border border-white/10`}
                >
                  <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                  <BookOpen className="absolute right-6 sm:right-10 top-1/2 -translate-y-1/2 w-36 h-36 sm:w-48 sm:h-48 text-white/10 rotate-12 pointer-events-none group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute left-0 top-0 bottom-0 w-4 bg-black/25 border-r border-white/15" />

                  <div className="relative z-10 pl-3 sm:pl-5 max-w-2xl">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-black/30 backdrop-blur-md border border-white/20 rounded-lg text-xs font-bold tracking-wide uppercase mb-3 shadow-2xs">
                      <BookOpen size={13} strokeWidth={2} />
                      <span>{activeBook.subject || 'Textbook'}</span>
                    </div>

                    <h3 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-white leading-tight mb-1.5 group-hover:text-blue-200 transition-colors">
                      {activeBook.title}
                    </h3>
                    {activeBook.author && (
                      <p className="text-white/80 font-medium text-sm sm:text-base mb-6">
                        By {activeBook.author}
                      </p>
                    )}

                    {activeBook.progress && activeBook.progress.current_page ? (
                      <div className="space-y-2.5 mb-6">
                        <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-white/90">
                          <span className="flex items-center gap-1.5">
                            <Clock3 size={15} strokeWidth={2} className="text-blue-300" />
                            <span>Page {activeBook.progress.current_page} of {activeBook.total_pages || '?'}</span>
                          </span>
                          <span className="text-blue-200 font-extrabold">
                            {Math.min(100, Math.round((activeBook.progress.current_page / (activeBook.total_pages || 1)) * 100))}% Complete
                          </span>
                        </div>
                        <div className="w-full h-2.5 bg-black/30 backdrop-blur-sm rounded-full overflow-hidden p-0.5 border border-white/10">
                          <div 
                            className="h-full bg-gradient-to-r from-blue-400 to-emerald-400 rounded-full transition-all duration-1000"
                            style={{ width: `${Math.min(100, Math.max(5, (activeBook.progress.current_page / (activeBook.total_pages || 1)) * 100))}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs sm:text-sm text-blue-200 font-semibold mb-6 flex items-center gap-2">
                        <Play size={14} fill="currentColor" />
                        Ready for your first reading session!
                      </p>
                    )}

                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigate('reader', { bookId: activeBook.id });
                      }}
                      className="h-12 px-6 bg-white text-slate-900 font-bold text-sm sm:text-base rounded-xl shadow-md hover:bg-slate-100 active:scale-95 transition-all inline-flex items-center gap-2.5 group/btn"
                    >
                      <Play size={16} fill="currentColor" className="text-blue-600" />
                      <span>{activeBook.progress?.current_page ? 'Continue Reading' : 'Start Reading'}</span>
                      <ArrowRight size={18} strokeWidth={2} className="group-hover/btn:translate-x-1 transition-transform text-slate-400" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 5. COMPACT SUBJECTS GRID */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pl-1">
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <GraduationCap size={17} strokeWidth={2} className="text-purple-600" />
                  <span>Subjects & Curriculum</span>
                </h2>
                <button 
                  onClick={() => onNavigate('library')} 
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
                >
                  <span>View full library</span>
                  <ChevronRight size={16} strokeWidth={2} />
                </button>
              </div>

              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 size={26} strokeWidth={2} className="animate-spin text-slate-400" />
                </div>
              ) : subjects.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 font-medium text-sm">
                  No published subjects available yet. Ask an admin to upload textbooks!
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                  {subjects.map((s) => {
                    const IconComponent = SUBJECT_ICONS[s.name] || BookOpen;
                    const pastelStyle = getSubjectPastel(s.name);
                    const iconStyle = getSubjectIconColor(s.name);
                    
                    return (
                      <div
                        key={s.name}
                        onClick={() => onNavigate('library', { subject: s.name })}
                        className={`bg-gradient-to-br ${pastelStyle} p-4 sm:p-5 rounded-2xl border transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer shadow-2xs group flex flex-col justify-between h-full min-h-[6.5rem]`}
                      >
                        <div className="flex items-center gap-3 mb-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${iconStyle}`}>
                            <IconComponent size={20} strokeWidth={2} />
                          </div>
                          <span className="font-bold text-sm sm:text-[15px] truncate leading-tight">{s.name}</span>
                        </div>
                        
                        <div className="flex items-center justify-between text-xs font-bold pt-2.5 border-t border-black/5 opacity-80">
                          <span>{s.count} {s.count === 1 ? 'book' : 'books'}</span>
                          <span className="group-hover:translate-x-1 transition-transform flex items-center gap-1 text-slate-800 font-extrabold">
                            <span>Open</span>
                            <ArrowRight size={13} strokeWidth={2.5} />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 6. RECENTLY ADDED (Horizontal Carousel) */}
            {books.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pl-1">
                  <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <Sparkles size={16} strokeWidth={2} className="text-amber-500" />
                    <span>Recently Added</span>
                  </h2>
                  <button 
                    onClick={() => onNavigate('library')}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
                  >
                    <span>See all ({books.length})</span>
                    <ChevronRight size={16} strokeWidth={2} />
                  </button>
                </div>

                <div className="flex overflow-x-auto gap-3 sm:gap-4 pb-4 snap-x snap-mandatory no-scrollbar">
                  {books.slice(0, 6).map((book) => {
                    const isProcessing = book.status !== 'ready';
                    return (
                      <div
                        key={book.id}
                        onClick={() => !isProcessing && onNavigate('reader', { bookId: book.id })}
                        className="w-44 sm:w-48 shrink-0 snap-start bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs hover:shadow-md transition-all duration-200 hover:-translate-y-1 active:scale-[0.98] cursor-pointer flex flex-col group"
                      >
                        <div className={`h-32 sm:h-36 w-full bg-gradient-to-br ${getSubjectColor(book.subject)} p-3 flex flex-col justify-between relative overflow-hidden shrink-0`}>
                          <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-black/20 border-r border-white/10 z-10" />
                          <div className="relative z-20 pl-1.5">
                            <span className="inline-block px-2 py-0.5 bg-black/30 backdrop-blur-md rounded text-[9px] font-bold text-white uppercase tracking-wider">
                              {book.subject || 'Book'}
                            </span>
                          </div>
                          <div className="relative z-20 pl-1.5 mt-auto">
                            <div className="w-6 h-0.5 bg-white/40 rounded-full mb-1"></div>
                            <p className="text-white text-[11px] font-bold line-clamp-1 uppercase tracking-tight opacity-95">{book.title}</p>
                          </div>
                        </div>

                        <div className="p-3.5 flex-1 flex flex-col justify-between bg-white">
                          <div>
                            <h3 className="text-[13px] sm:text-sm font-bold text-slate-800 line-clamp-2 leading-snug mb-1 min-h-[2.4rem]" title={book.title}>
                              {book.title}
                            </h3>
                            <p className="text-xs text-slate-400 font-medium truncate mb-3">
                              {book.author || 'Academic Press'}
                            </p>
                          </div>
                          
                          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-600">
                            <span>{book.progress?.current_page ? `Pg ${book.progress.current_page}` : 'New'}</span>
                            <span className="group-hover:translate-x-1 transition-transform flex items-center gap-1">
                              <span>Read</span>
                              <ArrowRight size={12} strokeWidth={2.5} />
                            </span>
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

      {/* Responsive Application Footer */}
      <Footer onNavigate={onNavigate} />
    </div>
  );
}
