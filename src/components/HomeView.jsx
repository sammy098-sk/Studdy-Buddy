import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Search, Sparkles, Clock3, ArrowRight, Loader2, Play, 
  CheckCircle2, ChevronRight, Compass, GraduationCap, BookMarked, 
  Timer, Bookmark
} from 'lucide-react';
import { supabase } from '../supabase';
import { SUBJECT_ICONS } from '../config';
import Footer from './Footer';
import HeroCarousel from './HeroCarousel';

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
  'Popular': Sparkles,
  'Recently Added': Sparkles,
  'Exam Prep': GraduationCap,
  'JAMB': Bookmark
};

export default function HomeView({ user, onNavigate }) {
  const [subjects, setSubjects] = useState([]);
  const [books, setBooks] = useState([]);
  const [activeBook, setActiveBook] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGoalChip, setSelectedGoalChip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [streakDays, setStreakDays] = useState(0);
  const [hoursStudied, setHoursStudied] = useState(null);

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
        let streak = 0;
        let computedHours = null;

        if (user?.id) {
          const { data: progressData, error: progressError } = await supabase
            .from('reading_progress')
            .select('*')
            .eq('user_id', user.id)
            .order('updated_at', { ascending: false });

          if (progressError) {
            console.error("Supabase reading_progress query failed in HomeView:", progressError.message);
          } else if (progressData && progressData.length > 0) {
            progressData.forEach(p => {
              progressMap[p.book_id] = p;
            });
          }

          // Fetch study progress for streak calculation
          const { data: studyProgressData } = await supabase
            .from('study_progress')
            .select('topic_label, created_at')
            .eq('user_id', user.id);

          // Fetch study sessions for real hours studied and streak calculation
          const { data: sessionsData, error: sessionsError } = await supabase
            .from('study_sessions')
            .select('started_at, ended_at, duration_minutes')
            .eq('user_id', user.id);

          if (!sessionsError && sessionsData && sessionsData.length > 0) {
            let totalMinutes = 0;
            let countValid = 0;
            sessionsData.forEach(s => {
              if (typeof s.duration_minutes === 'number' && s.duration_minutes > 0) {
                totalMinutes += s.duration_minutes;
                countValid++;
              } else if (s.started_at && s.ended_at) {
                const diffMs = new Date(s.ended_at) - new Date(s.started_at);
                if (diffMs > 0) {
                  totalMinutes += Math.round(diffMs / 60000);
                  countValid++;
                }
              }
            });
            if (countValid > 0 || totalMinutes > 0) {
              computedHours = Math.round((totalMinutes / 60) * 10) / 10;
            }
          }

          // Compute Reading Streak: consecutive calendar days ending today or yesterday
          const activeDates = new Set();
          (progressData || []).forEach(p => {
            if (p.updated_at || p.last_read_at) {
              activeDates.add(new Date(p.updated_at || p.last_read_at).toISOString().split('T')[0]);
            }
          });
          (studyProgressData || []).forEach(p => {
            if (p.created_at) {
              activeDates.add(new Date(p.created_at).toISOString().split('T')[0]);
            }
          });
          (sessionsData || []).forEach(s => {
            if (s.started_at) {
              activeDates.add(new Date(s.started_at).toISOString().split('T')[0]);
            }
          });

          const todayStr = new Date().toISOString().split('T')[0];
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split('T')[0];

          let checkDate = null;
          if (activeDates.has(todayStr)) {
            checkDate = new Date(todayStr);
          } else if (activeDates.has(yesterdayStr)) {
            checkDate = new Date(yesterdayStr);
          }

          if (checkDate) {
            while (true) {
              const dStr = checkDate.toISOString().split('T')[0];
              if (activeDates.has(dStr)) {
                streak += 1;
                checkDate.setDate(checkDate.getDate() - 1);
              } else {
                break;
              }
            }
          }
        }

        setStreakDays(streak);
        setHoursStudied(computedHours);

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
      (b.subject && b.subject.toLowerCase().includes(selectedGoalChip.toLowerCase())) ||
      (b.category && b.category.toLowerCase().includes(selectedGoalChip.toLowerCase()))
    );
  });

  const handleChipClick = (chip) => {
    if (selectedGoalChip === chip) {
      setSelectedGoalChip(null);
      setSearchQuery('');
    } else {
      setSelectedGoalChip(chip);
      if (chip === 'Recently Added') {
        setSearchQuery('');
      }
    }
  };

  const isSearching = searchQuery.trim().length > 0 || selectedGoalChip !== null;

  // Calculate meaningful real statistics from actual database records (Never fabricate values)
  const completedBooksList = books.filter(b => b.progress && b.total_pages > 0 && b.progress.current_page >= b.total_pages);
  const completedCount = completedBooksList.length;

  const inProgressBooksList = books.filter(b => b.progress && b.progress.current_page > 0 && !(b.total_pages > 0 && b.progress.current_page >= b.total_pages));
  const inProgressCount = inProgressBooksList.length;

  const displayInProgress = `${inProgressCount} in progress`;
  const displayStreak = `${streakDays || 0} ${streakDays === 1 ? 'day' : 'days'}`;
  const displayHours = hoursStudied !== null ? `${hoursStudied} hrs` : '--';
  const displayCompleted = `${completedCount} completed`;

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50/70 flex flex-col justify-between">
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10 space-y-8 sm:space-y-10">
        
        {/* 1. Greeting & Dashboard Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 lg:p-8 rounded-3xl border border-slate-200/80 shadow-2xs">
          <div className="space-y-1.5 min-w-0">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-100/80 rounded-lg text-[11px] lg:text-xs font-bold tracking-wider uppercase font-mono shadow-2xs">
              <Sparkles size={13} strokeWidth={2.5} className="text-blue-600 animate-pulse lg:w-4 lg:h-4" />
              <span>Study Dashboard</span>
            </div>
            <h1 className="hidden md:block text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-extrabold text-slate-900 tracking-tight truncate" style={{ fontFamily: "'Montserrat', sans-serif" }}>
              {getTimeGreeting()}, {user?.name || 'Student'} 👋
            </h1>
            <p className="hidden md:block text-slate-500 text-xs sm:text-sm lg:text-base xl:text-lg font-medium">
              Your academic library, continuous progress tracking, and AI revision tools in one unified space.
            </p>
            {/* Mobile Hero Explanation (Avoiding duplicate greeting on mobile) */}
            <p className="md:hidden text-slate-700 text-xs sm:text-sm font-semibold leading-relaxed pt-0.5">
              Your all-in-one learning platform for reading textbooks, tracking study progress, generating AI summaries, practicing questions, and preparing for exams.
            </p>
          </div>
          <button 
            onClick={() => onNavigate('library')} 
            className="hidden sm:inline-flex items-center gap-2 px-5 py-3 lg:px-6 lg:py-3.5 bg-blue-600 hover:bg-blue-700 text-white text-xs lg:text-sm xl:text-base font-extrabold rounded-2xl transition-all duration-200 shadow-lg shadow-blue-600/25 hover:-translate-y-0.5 active:translate-y-0 shrink-0 group"
          >
            <BookOpen size={16} className="lg:w-5 lg:h-5" />
            <span>Open Full Library</span>
            <ArrowRight size={16} className="lg:w-5 lg:h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* 2. Rotating Hero Carousel */}
        <HeroCarousel onNavigate={onNavigate} />

        {/* 3. Statistics Cards Grid (Moved below Hero Carousel; Desktop typography and hierarchy enhanced) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
          {/* Stat 1: Continue Reading Progress */}
          <div title="Textbooks currently open and in progress" className="bg-white p-4 sm:p-5 lg:p-6 rounded-2xl lg:rounded-3xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:-translate-y-0.5 hover:border-blue-300/80 transition-all duration-200 flex items-center gap-3.5 lg:gap-5 group">
            <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <BookMarked size={22} strokeWidth={2} className="lg:w-7 lg:h-7" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm sm:text-lg lg:text-2xl xl:text-3xl font-extrabold text-slate-800 truncate leading-tight">{displayInProgress}</div>
              <div className="text-[11px] sm:text-xs lg:text-sm xl:text-base font-semibold text-slate-400 truncate mt-0.5">In Progress</div>
            </div>
          </div>

          {/* Stat 2: Reading Streak */}
          <div title="Consecutive daily study streak" className="bg-white p-4 sm:p-5 lg:p-6 rounded-2xl lg:rounded-3xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:-translate-y-0.5 hover:border-blue-300/80 transition-all duration-200 flex items-center gap-3.5 lg:gap-5 group">
            <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Clock3 size={22} strokeWidth={2} className="lg:w-7 lg:h-7" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm sm:text-lg lg:text-2xl xl:text-3xl font-extrabold text-slate-800 truncate leading-tight">{displayStreak}</div>
              <div className="text-[11px] sm:text-xs lg:text-sm xl:text-base font-semibold text-slate-400 truncate mt-0.5">Reading Streak</div>
            </div>
          </div>

          {/* Stat 3: Hours Studied */}
          <div title="Cumulative recorded hours studying" className="bg-white p-4 sm:p-5 lg:p-6 rounded-2xl lg:rounded-3xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:-translate-y-0.5 hover:border-emerald-300/80 transition-all duration-200 flex items-center gap-3.5 lg:gap-5 group">
            <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <Timer size={22} strokeWidth={2} className="lg:w-7 lg:h-7" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm sm:text-lg lg:text-2xl xl:text-3xl font-extrabold text-slate-800 truncate leading-tight">{displayHours}</div>
              <div className="text-[11px] sm:text-xs lg:text-sm xl:text-base font-semibold text-slate-400 truncate mt-0.5">Hours Studied</div>
            </div>
          </div>

          {/* Stat 4: Books Completed */}
          <div title="Total textbooks finished end-to-end" className="bg-white p-4 sm:p-5 lg:p-6 rounded-2xl lg:rounded-3xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:-translate-y-0.5 hover:border-purple-300/80 transition-all duration-200 flex items-center gap-3.5 lg:gap-5 group">
            <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100 group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <CheckCircle2 size={22} strokeWidth={2} className="lg:w-7 lg:h-7" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm sm:text-lg lg:text-2xl xl:text-3xl font-extrabold text-slate-800 truncate leading-tight">{displayCompleted}</div>
              <div className="text-[11px] sm:text-xs lg:text-sm xl:text-base font-semibold text-slate-400 truncate mt-0.5">Books Completed</div>
            </div>
          </div>
        </div>

        {/* Multi-Column Dashboard Layout */}
        <div className="lg:grid lg:grid-cols-12 lg:gap-8 lg:items-start space-y-8 lg:space-y-0">
          
          {/* LEFT / MAIN CONTENT AREA (8 Columns on Desktop) */}
          <div className="lg:col-span-8 space-y-8 sm:space-y-10 min-w-0">
            
            {/* 4. Search Bar & Goal Filter Chips */}
            <div className="space-y-3.5 bg-white p-5 lg:p-7 rounded-3xl border border-slate-200/80 shadow-2xs">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 lg:pl-5 flex items-center pointer-events-none text-slate-400">
                  <Search size={18} strokeWidth={2.5} className="lg:w-6 lg:h-6" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter textbooks by title, subject, or topic..."
                  className="w-full h-11 lg:h-14 pl-11 lg:pl-14 pr-20 bg-slate-50 border border-slate-200/80 rounded-xl lg:rounded-2xl hover:border-slate-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium text-sm lg:text-base xl:text-lg transition-all placeholder:text-slate-400"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 right-0 pr-4 lg:pr-6 flex items-center text-xs lg:text-sm font-bold text-slate-400 hover:text-slate-700"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-0.5">
                <span className="text-[11px] lg:text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">Filter:</span>
                {['Popular', 'Recently Added', 'Exam Prep', 'JAMB'].map((chip) => {
                  const isSelected = selectedGoalChip === chip;
                  const IconComponent = CHIP_ICONS[chip] || Sparkles;
                  return (
                    <button
                      key={chip}
                      onClick={() => handleChipClick(chip)}
                      className={`h-9 lg:h-11 px-3.5 lg:px-5 rounded-xl lg:rounded-2xl text-xs lg:text-sm font-bold transition-all shrink-0 flex items-center gap-1.5 lg:gap-2 border shadow-2xs ${
                        isSelected 
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20' 
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300'
                      }`}
                    >
                      <IconComponent size={14} strokeWidth={2.2} className={`lg:w-4 lg:h-4 ${isSelected ? 'text-white' : 'text-blue-500'}`} />
                      <span>{chip}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* LIVE SEARCH RESULTS VIEW */}
            {isSearching ? (
              <div className="space-y-6 bg-white p-6 lg:p-8 rounded-3xl border border-slate-200/80 shadow-2xs">
                <div className="flex items-center justify-between">
                  <h2 className="text-base sm:text-lg lg:text-2xl font-extrabold text-slate-800 flex items-center gap-2">
                    <span>Search & Filter Results</span>
                    <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg text-xs lg:text-sm font-extrabold">{filteredBooks.length} found</span>
                  </h2>
                  <button
                    onClick={() => { setSearchQuery(''); setSelectedGoalChip(null); }}
                    className="text-xs lg:text-sm font-bold text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <span>Reset filters</span>
                  </button>
                </div>

                {filteredBooks.length === 0 ? (
                  <div className="p-12 text-center bg-slate-50 rounded-2xl border border-slate-200 border-dashed">
                    <Compass size={36} strokeWidth={1.5} className="mx-auto text-slate-300 mb-3 lg:w-12 lg:h-12" />
                    <h3 className="text-base lg:text-lg font-bold text-slate-700 mb-1">No textbooks match your criteria</h3>
                    <p className="text-sm lg:text-base text-slate-500 max-w-sm mx-auto">
                      Try adjusting your search keywords or clearing active filter badges.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4 lg:gap-6">
                    {filteredBooks.map(book => (
                      <div 
                        key={book.id}
                        onClick={() => onNavigate('reader', { bookId: book.id })}
                        className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs hover:shadow-md hover:-translate-y-1 transition-all duration-200 cursor-pointer group flex flex-col justify-between"
                      >
                        <div className={`h-36 lg:h-44 w-full bg-gradient-to-br ${getSubjectColor(book.subject)} p-3.5 lg:p-4 flex flex-col justify-between relative overflow-hidden shrink-0`}>
                          <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-black/20 border-r border-white/10" />
                          <span className="ml-1.5 px-2 py-0.5 bg-black/30 backdrop-blur-md rounded-md text-[9px] lg:text-xs font-extrabold text-white uppercase w-fit tracking-wider">
                            {book.subject}
                          </span>
                          <p className="text-white font-extrabold text-[13px] lg:text-base line-clamp-2 ml-1.5 leading-tight drop-shadow-sm">{book.title}</p>
                        </div>
                        <div className="p-3.5 lg:p-4 bg-white">
                          <div className="text-xs lg:text-sm font-extrabold text-blue-600 flex items-center justify-between group-hover:text-blue-700 transition-colors">
                            <span>Open textbook</span>
                            <ArrowRight size={14} className="lg:w-4 lg:h-4 group-hover:translate-x-1 transition-transform" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* 5. CONTINUE READING HERO WIDGET */}
                {activeBook && (
                  <div className="space-y-3 lg:space-y-4">
                    <div className="flex items-center justify-between px-1">
                      <h2 className="text-xs lg:text-sm xl:text-base font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-2 font-mono">
                        <BookMarked size={16} strokeWidth={2.2} className="text-blue-600 lg:w-5 lg:h-5" />
                        <span>Continue Reading</span>
                      </h2>
                      <button onClick={() => onNavigate('sessions')} className="text-xs lg:text-sm font-bold text-blue-600 hover:underline flex items-center gap-1">
                        <span>View reading sessions</span>
                        <ChevronRight size={14} className="lg:w-4 lg:h-4" />
                      </button>
                    </div>

                    <div 
                      onClick={() => onNavigate('reader', { bookId: activeBook.id })}
                      className={`bg-gradient-to-br ${getSubjectColor(activeBook.subject)} rounded-3xl p-6 sm:p-8 lg:p-10 text-white shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer relative overflow-hidden group border border-white/15 hover:-translate-y-0.5`}
                    >
                      <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 lg:w-96 lg:h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
                      <BookOpen className="absolute right-6 sm:right-10 top-1/2 -translate-y-1/2 w-36 h-36 sm:w-52 sm:h-52 lg:w-64 lg:h-64 text-white/10 rotate-12 pointer-events-none group-hover:scale-110 transition-transform duration-500" />
                      <div className="absolute left-0 top-0 bottom-0 w-4 bg-black/25 border-r border-white/15" />

                      <div className="relative z-10 pl-3 sm:pl-5 max-w-2xl lg:max-w-3xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-black/30 backdrop-blur-md border border-white/20 rounded-xl text-xs lg:text-sm font-extrabold tracking-wide uppercase mb-3.5 shadow-2xs">
                          <BookOpen size={13} strokeWidth={2.5} className="text-blue-300 lg:w-4 lg:h-4" />
                          <span>{activeBook.subject || 'Textbook'}</span>
                        </div>

                        <h3 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-extrabold text-white leading-tight mb-2 group-hover:text-blue-200 transition-colors" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                          {activeBook.title}
                        </h3>
                        {activeBook.author && (
                          <p className="text-white/80 font-medium text-sm sm:text-base lg:text-lg xl:text-xl mb-6">
                            By {activeBook.author}
                          </p>
                        )}

                        {activeBook.progress && activeBook.progress.current_page ? (
                          <div className="space-y-2.5 mb-6">
                            <div className="flex items-center justify-between text-xs sm:text-sm lg:text-base font-bold text-white/90">
                              <span className="flex items-center gap-1.5">
                                <Clock3 size={15} strokeWidth={2.5} className="text-blue-300 lg:w-5 lg:h-5" />
                                <span>Page {activeBook.progress.current_page} of {activeBook.total_pages || '?'}</span>
                              </span>
                              <span className="text-blue-200 font-extrabold">
                                {Math.min(100, Math.round((activeBook.progress.current_page / (activeBook.total_pages || 1)) * 100))}% Complete
                              </span>
                            </div>
                            <div className="w-full h-3 lg:h-3.5 bg-black/40 backdrop-blur-sm rounded-full overflow-hidden p-0.5 border border-white/15">
                              <div 
                                className="h-full bg-gradient-to-r from-blue-400 via-indigo-300 to-emerald-400 rounded-full transition-all duration-1000 shadow-sm"
                                style={{ width: `${Math.min(100, Math.max(5, (activeBook.progress.current_page / (activeBook.total_pages || 1)) * 100))}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs sm:text-sm lg:text-base text-blue-200 font-bold mb-6 flex items-center gap-2">
                            <Play size={14} fill="currentColor" className="lg:w-5 lg:h-5" />
                            Ready for your first interactive reading session!
                          </p>
                        )}

                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            onNavigate('reader', { bookId: activeBook.id });
                          }}
                          className="h-12 lg:h-14 px-6 lg:px-8 bg-white text-slate-900 font-extrabold text-sm sm:text-base lg:text-lg rounded-2xl shadow-lg hover:bg-slate-100 active:scale-95 transition-all inline-flex items-center gap-2.5 group/btn border border-slate-200"
                        >
                          <Play size={16} fill="currentColor" className="text-blue-600 lg:w-5 lg:h-5" />
                          <span>{activeBook.progress?.current_page ? 'Continue Reading' : 'Start Reading'}</span>
                          <ArrowRight size={18} strokeWidth={2.5} className="lg:w-5 lg:h-5 group-hover/btn:translate-x-1 transition-transform text-slate-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 6. SUBJECTS & CURRICULUM GRID */}
                <div className="space-y-4 lg:space-y-5">
                  <div className="flex items-center justify-between px-1">
                    <h2 className="text-xs lg:text-sm xl:text-base font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-2 font-mono">
                      <GraduationCap size={17} strokeWidth={2.2} className="text-purple-600 lg:w-5 lg:h-5" />
                      <span>Subjects & Curriculum</span>
                    </h2>
                    <button 
                      onClick={() => onNavigate('library')} 
                      className="text-xs lg:text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors hover:underline"
                    >
                      <span>View full library</span>
                      <ChevronRight size={15} strokeWidth={2.5} className="lg:w-4 lg:h-4" />
                    </button>
                  </div>

                  {loading ? (
                    <div className="flex justify-center py-12 bg-white rounded-3xl border border-slate-200/80">
                      <Loader2 size={26} strokeWidth={2} className="animate-spin text-blue-600" />
                    </div>
                  ) : subjects.length === 0 ? (
                    <div className="p-8 text-center bg-white rounded-3xl border border-slate-200/80 text-slate-500 font-medium text-sm lg:text-base">
                      No published subjects available yet. Ask an admin to upload textbooks!
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 sm:gap-4 lg:gap-6">
                      {subjects.map((s) => {
                        const IconComponent = SUBJECT_ICONS[s.name] || BookOpen;
                        const pastelStyle = getSubjectPastel(s.name);
                        const iconStyle = getSubjectIconColor(s.name);
                        
                        return (
                          <div
                            key={s.name}
                            onClick={() => onNavigate('library', { subject: s.name })}
                            className={`bg-gradient-to-br ${pastelStyle} p-4 sm:p-5 lg:p-6 rounded-2xl lg:rounded-3xl border transition-all duration-200 hover:-translate-y-1 active:scale-[0.98] cursor-pointer shadow-2xs hover:shadow-md group flex flex-col justify-between h-full min-h-[7rem] lg:min-h-[9rem]`}
                          >
                            <div className="flex items-center gap-3 lg:gap-4 mb-4 min-w-0">
                              <div className={`w-11 h-11 lg:w-14 lg:h-14 rounded-xl lg:rounded-2xl flex items-center justify-center shrink-0 shadow-2xs border border-white/60 ${iconStyle} group-hover:scale-105 transition-transform`}>
                                <IconComponent size={22} strokeWidth={2} className="lg:w-7 lg:h-7" />
                              </div>
                              <span className="font-extrabold text-sm sm:text-[15.5px] lg:text-lg xl:text-xl truncate leading-tight" style={{ fontFamily: "'Montserrat', sans-serif" }}>{s.name}</span>
                            </div>
                            
                            <div className="flex items-center justify-between text-xs lg:text-sm font-extrabold pt-3 border-t border-black/5 opacity-90">
                              <span>{s.count} {s.count === 1 ? 'book' : 'books'}</span>
                              <span className="group-hover:translate-x-1.5 transition-transform flex items-center gap-1 text-slate-900">
                                <span>Explore</span>
                                <ArrowRight size={13} strokeWidth={2.5} className="lg:w-4 lg:h-4" />
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* RECENTLY ADDED BOOKS */}
                {books.length > 0 && (
                  <div className="space-y-4 lg:space-y-5">
                    <div className="flex items-center justify-between px-1">
                      <h2 className="text-xs lg:text-sm xl:text-base font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-2 font-mono">
                        <Sparkles size={16} strokeWidth={2.2} className="text-amber-500 lg:w-5 lg:h-5" />
                        <span>Recently Added Books</span>
                      </h2>
                      <button 
                        onClick={() => onNavigate('library')}
                        className="text-xs lg:text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors hover:underline"
                      >
                        <span>See all ({books.length})</span>
                        <ChevronRight size={15} strokeWidth={2.5} className="lg:w-4 lg:h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4 lg:gap-6">
                      {books.slice(0, 6).map((book) => {
                        const isProcessing = book.status !== 'ready';
                        return (
                          <div
                            key={book.id}
                            onClick={() => !isProcessing && onNavigate('reader', { bookId: book.id })}
                            className="bg-white rounded-2xl lg:rounded-3xl border border-slate-200/90 overflow-hidden shadow-2xs hover:shadow-lg transition-all duration-200 hover:-translate-y-1 active:scale-[0.98] cursor-pointer flex flex-col group justify-between"
                          >
                            <div className={`h-36 lg:h-44 w-full bg-gradient-to-br ${getSubjectColor(book.subject)} p-3.5 lg:p-5 flex flex-col justify-between relative overflow-hidden shrink-0`}>
                              <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-black/20 border-r border-white/10 z-10" />
                              <div className="relative z-20 pl-1.5">
                                <span className="inline-block px-2 py-0.5 bg-black/30 backdrop-blur-md rounded-md text-[9px] lg:text-xs font-extrabold text-white uppercase tracking-wider">
                                  {book.subject || 'Book'}
                                </span>
                              </div>
                              <div className="relative z-20 pl-1.5 mt-auto">
                                <div className="w-6 h-0.5 bg-white/40 rounded-full mb-1"></div>
                                <p className="text-white text-[12px] lg:text-base font-extrabold line-clamp-2 uppercase tracking-tight opacity-95 leading-tight">{book.title}</p>
                              </div>
                            </div>

                            <div className="p-4 lg:p-5 flex-1 flex flex-col justify-between bg-white">
                              <div>
                                <h3 className="text-[13px] sm:text-sm lg:text-base xl:text-lg font-bold text-slate-800 line-clamp-2 leading-snug mb-1 min-h-[2.4rem] lg:min-h-[3.2rem]" title={book.title}>
                                  {book.title}
                                </h3>
                                <p className="text-xs lg:text-sm text-slate-400 font-medium truncate mb-3">
                                  {book.author || 'Academic Press'}
                                </p>
                              </div>
                              
                              <div className="pt-2.5 lg:pt-3 border-t border-slate-100 flex items-center justify-between text-xs lg:text-sm font-extrabold text-blue-600">
                                <span>{book.progress?.current_page ? `Pg ${book.progress.current_page}` : 'New'}</span>
                                <span className="group-hover:translate-x-1.5 transition-transform flex items-center gap-1 text-blue-700">
                                  <span>Read</span>
                                  <ArrowRight size={13} strokeWidth={2.5} className="lg:w-4 lg:h-4" />
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

          {/* RIGHT INFORMATION PANEL (Desktop ONLY — real data, no gamification) */}
          <div className="hidden lg:flex lg:col-span-4 flex-col gap-6 sticky top-6">

            {/* Widget 1: Daily Study Goal */}
            {hoursStudied !== null && (
              <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-2xs space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                      <Timer size={20} strokeWidth={2} />
                    </div>
                    <span className="text-base xl:text-lg font-extrabold text-slate-800" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                      Daily Study Goal
                    </span>
                  </div>
                  <span className="text-sm font-bold text-slate-500 font-mono">30 min / day</span>
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-sm font-semibold text-slate-600">
                    <span>Studied today</span>
                    <span className="font-bold text-slate-800">
                      {hoursStudied !== null ? `${Math.round(hoursStudied * 60)} min` : '--'}
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all duration-700"
                      style={{
                        width: hoursStudied !== null
                          ? `${Math.min(100, Math.round((hoursStudied / 0.5) * 100))}%`
                          : '0%'
                      }}
                    />
                  </div>
                  <p className="text-xs text-slate-400 font-medium leading-relaxed">
                    {hoursStudied !== null && hoursStudied >= 0.5
                      ? 'Goal reached for today.'
                      : `${Math.max(0, Math.round((0.5 - (hoursStudied || 0)) * 60))} minutes remaining to reach today's goal.`
                    }
                  </p>
                </div>
              </div>
            )}

            {/* Widget 2: Reading Stats */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-2xs space-y-4">
              <div className="flex items-center gap-3 pb-3.5 border-b border-slate-100">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                  <BookMarked size={20} strokeWidth={2} />
                </div>
                <span className="text-base xl:text-lg font-extrabold text-slate-800" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  Reading Summary
                </span>
              </div>

              {[
                {
                  label: 'Books in progress',
                  value: books.filter(b => b.progress && b.progress.current_page > 0 && !(b.total_pages > 0 && b.progress.current_page >= b.total_pages)).length,
                  show: true,
                },
                {
                  label: 'Books completed',
                  value: books.filter(b => b.progress && b.total_pages > 0 && b.progress.current_page >= b.total_pages).length,
                  show: true,
                },
                {
                  label: 'Hours studied',
                  value: hoursStudied !== null ? `${hoursStudied} hrs` : null,
                  show: hoursStudied !== null,
                },
                {
                  label: 'Reading streak',
                  value: streakDays > 0 ? `${streakDays} ${streakDays === 1 ? 'day' : 'days'}` : null,
                  show: streakDays > 0,
                },
              ].map(({ label, value, show }) =>
                show ? (
                  <div key={label} className="flex items-center justify-between py-1.5">
                    <span className="text-sm font-medium text-slate-500">{label}</span>
                    <span className="text-sm xl:text-[15px] font-extrabold text-slate-800">
                      {value !== null && value !== undefined ? value : '--'}
                    </span>
                  </div>
                ) : null
              )}

              <div className="pt-3">
                <button
                  onClick={() => onNavigate('sessions')}
                  className="w-full flex items-center justify-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors py-2.5 rounded-2xl hover:bg-blue-50 border border-transparent hover:border-blue-100"
                >
                  <span>View reading history</span>
                  <ChevronRight size={16} strokeWidth={2.5} />
                </button>
              </div>
            </div>

            {/* Widget 3: JAMB Resources */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-2xs space-y-4">
              <div className="flex items-center gap-3 pb-3.5 border-b border-slate-100">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                  <GraduationCap size={20} strokeWidth={2} />
                </div>
                <span className="text-base xl:text-lg font-extrabold text-slate-800" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  Exam Preparation
                </span>
              </div>

              <button
                onClick={() => handleChipClick('JAMB')}
                className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-2xl text-left transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center text-sm font-extrabold shrink-0 shadow-sm">
                    J
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-800 group-hover:text-blue-700 transition-colors">JAMB Textbooks</div>
                    <div className="text-xs text-slate-400 mt-0.5">Filter library by exam</div>
                  </div>
                </div>
                <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-500 transition-colors shrink-0" />
              </button>

              <button
                onClick={() => onNavigate('library')}
                className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-2xl text-left transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 group-hover:bg-blue-100 group-hover:text-blue-700 flex items-center justify-center shrink-0 transition-colors">
                    <BookOpen size={18} strokeWidth={2} />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-800 group-hover:text-blue-700 transition-colors">Browse Full Library</div>
                    <div className="text-xs text-slate-400 mt-0.5">All subjects & textbooks</div>
                  </div>
                </div>
                <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-500 transition-colors shrink-0" />
              </button>
            </div>

          </div>

        </div>
      </div>

      {/* Responsive Application Footer */}
      <Footer onNavigate={onNavigate} />
    </div>
  );
}
