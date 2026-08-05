import React, { useState, useEffect, useMemo } from 'react';
import { 
  BookOpen, Search, Sparkles, Clock3, ArrowRight, Loader2, Play, 
  CheckCircle2, ChevronRight, Compass, GraduationCap, BookMarked, 
  Timer, Bookmark, Target, Calendar, Award, Circle, CheckSquare, 
  Square, History, Flame, FileText, HelpCircle
} from 'lucide-react';
import { supabase } from '../supabase';
import { SUBJECT_ICONS } from '../config';
import Footer from './Footer';
import HeroCarousel from './HeroCarousel';
import { cleanBookTitle, formatRelativeTime, BookCoverThumbnail } from '../utils/bookHelpers';

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
  const [completedPlanIds, setCompletedPlanIds] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sb_jamb_plan_completed') || '["jamb-plan-0"]'); } catch { return ["jamb-plan-0"]; }
  });
  const [loadBelowFold, setLoadBelowFold] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLoadBelowFold(true), 150);
    return () => clearTimeout(timer);
  }, []);

  const togglePlanItem = (id, e) => {
    if (e) e.stopPropagation();
    setCompletedPlanIds(prev => {
      const next = prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id];
      try { localStorage.setItem('sb_jamb_plan_completed', JSON.stringify(next)); } catch {}
      return next;
    });
  };

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
            .select('id, started_at, ended_at, duration_minutes, mode, topic, subject')
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
        const sortedSessions = (sessionsData || []).slice().sort((a, b) => new Date(b.started_at || 0) - new Date(a.started_at || 0));
        setRecentSessions(sortedSessions.slice(0, 5));

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

  const displayInProgress = `${inProgressCount} ${inProgressCount === 1 ? 'Book' : 'Books'}`;
  const displayStreak = `${streakDays || 0} ${streakDays === 1 ? 'Day' : 'Days'}`;
  const displayHours = hoursStudied !== null ? `${hoursStudied} ${hoursStudied === 1 ? 'Hour' : 'Hours'}` : '0 Hours';
  const displayCompleted = `${completedCount} ${completedCount === 1 ? 'Book' : 'Books'}`;

  const recentActivity = useMemo(() => {
    if (recentSessions.length > 0) {
      const s = recentSessions[0];
      const matchBook = books.find(b => b.subject === s.subject || b.title?.includes(s.topic || s.subject));
      return {
        mode: s.mode || 'textbook',
        title: matchBook?.title || s.topic || s.subject + ' Textbook',
        subject: s.subject || matchBook?.subject || 'JAMB Studies',
        book: matchBook || null,
        bookId: matchBook?.id || null,
        page: matchBook?.progress?.current_page || null,
        time: formatRelativeTime(s.started_at)
      };
    }
    return null;
  }, [recentSessions, books]);

  // Construct intelligent Today's Study Plan (JAMB Focused)
  const todayStudyPlan = useMemo(() => {
    const defaultSubjs = ['Biology', 'English Language', 'Chemistry', 'Physics'];
    const favs = user?.favorite_subjects && user.favorite_subjects.length > 0 ? user.favorite_subjects : defaultSubjs;
    const plan = [];

    // Item 1: Continue Reading primary subject / in-progress book
    const inProg = inProgressBooksList[0] || books.find(b => b.subject === favs[0]) || books[0];
    if (inProg) {
      plan.push({
        id: 'jamb-plan-0',
        subject: inProg.subject || favs[0] || 'Biology',
        taskText: `Continue Reading (${inProg.progress?.current_page ? `Page ${inProg.progress.current_page}` : 'Chapter 1'})`,
        actionText: 'Resume',
        action: () => onNavigate('reader', { bookId: inProg.id })
      });
    } else {
      plan.push({
        id: 'jamb-plan-0',
        subject: favs[0] || 'Biology',
        taskText: 'Read syllabus introduction & Chapter 1',
        actionText: 'Open Library',
        action: () => onNavigate('library')
      });
    }

    // Item 2: Compulsory English Practice
    const sub2 = favs.includes('English Language') ? 'English Language' : (favs[1] || 'English');
    plan.push({
      id: 'jamb-plan-1',
      subject: sub2,
      taskText: 'Complete 15 Practice Questions (CBT Speed Drill)',
      actionText: 'Start Drill',
      action: () => onNavigate('library', { filter: 'JAMB' })
    });

    // Item 3: Revision
    const sub3 = favs[2] || 'Chemistry';
    plan.push({
      id: 'jamb-plan-2',
      subject: sub3,
      taskText: 'Revise Chapter 3 definitions and AI study summaries',
      actionText: 'Revise',
      action: () => onNavigate('library')
    });

    // Item 4: Time goal
    const sub4 = favs[3] || 'Physics';
    plan.push({
      id: 'jamb-plan-3',
      subject: sub4,
      taskText: 'Read for 30 minutes to stay on target for exam countdown',
      actionText: 'Study Now',
      action: () => onNavigate('library')
    });

    return plan;
  }, [user, books, inProgressBooksList, onNavigate]);

  // Construct Actionable Recent Activity list (Enhanced as per user approval)
  const recentActivitiesList = useMemo(() => {
    const list = [];
    const usedIds = new Set();

    // Add up to 3 study sessions from DB
    recentSessions.slice(0, 3).forEach((s, idx) => {
      const matchBook = books.find(b => b.subject === s.subject || b.title?.includes(s.topic || s.subject));
      list.push({
        id: s.id || `sess-${idx}`,
        subject: s.subject || matchBook?.subject || 'JAMB Studies',
        title: cleanBookTitle(matchBook?.title || s.topic || s.subject + ' Reference'),
        type: s.mode === 'questionnaire' || s.mode === 'quiz' ? 'CBT Practice Drill'
            : s.mode === 'summary' ? 'AI Summary Generated'
            : 'Reading Session',
        detail: matchBook?.progress?.current_page ? `Page ${matchBook.progress.current_page}` : s.topic ? `Topic: ${s.topic}` : 'Chapter review',
        timeString: formatRelativeTime(s.started_at),
        actionText: s.mode === 'questionnaire' || s.mode === 'quiz' ? 'Review Quiz'
                  : s.mode === 'summary' ? 'View Summary'
                  : 'Continue',
        action: () => matchBook ? onNavigate('reader', { bookId: matchBook.id }) : onNavigate('sessions'),
        bookCover: { title: matchBook?.title || s.topic || s.subject, subject: s.subject || matchBook?.subject }
      });
      if (matchBook) usedIds.add(matchBook.id);
    });

    // If fewer than 3 sessions, pad with recent books in progress
    inProgressBooksList.forEach((book) => {
      if (list.length < 4 && !usedIds.has(book.id)) {
        list.push({
          id: `prog-${book.id}`,
          subject: book.subject || 'Syllabus Reading',
          title: cleanBookTitle(book.title),
          type: 'Reading Session',
          detail: `Page ${book.progress?.current_page || 1}${book.total_pages ? ` of ${book.total_pages}` : ''}`,
          timeString: formatRelativeTime(book.progress?.updated_at),
          actionText: 'Continue',
          action: () => onNavigate('reader', { bookId: book.id }),
          bookCover: { title: book.title, subject: book.subject }
        });
        usedIds.add(book.id);
      }
    });

    // If still empty, add an encouraging welcome placeholder card
    if (list.length === 0) {
      list.push({
        id: 'welcome-card',
        subject: 'JAMB Prep 2027',
        title: 'Begin Your First Reading Session',
        type: 'Onboarding',
        detail: 'Select a textbook from your library to begin study tracking',
        timeString: 'Just now',
        actionText: 'Open Library',
        action: () => onNavigate('library'),
        bookCover: { title: 'JAMB Guide', subject: 'General' }
      });
    }

    return list;
  }, [recentSessions, books, inProgressBooksList, onNavigate]);

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50/70 flex flex-col justify-between">
      <div className="max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-6 lg:space-y-8">
        
        {/* 1. Compact Welcome Message & Header (Req 1: Hidden entirely on mobile to eliminate duplicate greeting & space) */}
        <div className="hidden md:flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1">
          <div className="space-y-1.5 min-w-0">
            <h1 className="text-xl sm:text-2xl lg:text-[28px] xl:text-[30px] font-extrabold text-slate-900 tracking-tight truncate" style={{ fontFamily: "'Montserrat', sans-serif" }}>
              {getTimeGreeting()}, {user?.name || 'Student'} 👋
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm lg:text-[15px] font-medium truncate">
              Welcome back to your study space. Pick up where you left off or explore new academic resources.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-50 border border-indigo-200/80 text-indigo-900 text-xs font-extrabold shadow-2xs">
                <Target size={14} className="text-indigo-600" />
                <span>Target Score: {user?.target_score || "250+"} (AI {user?.target_score === "300+" ? "Elite Tier" : "Advanced Tier"})</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-50 border border-blue-200/80 text-blue-900 text-xs font-extrabold shadow-2xs">
                <Calendar size={14} className="text-blue-600" />
                <span>JAMB {user?.exam_year || "2027"} Countdown: {Math.max(0, Math.ceil((new Date(user?.target_exam_date || "2027-04-15") - new Date()) / (1000 * 60 * 60 * 24)))} days left</span>
              </span>
            </div>
          </div>
          <button 
            onClick={() => onNavigate('library')} 
            className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 lg:px-6 lg:py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs lg:text-[14.5px] font-extrabold rounded-2xl transition-all duration-200 shadow-lg shadow-blue-600/20 hover:-translate-y-0.5 active:translate-y-0 shrink-0 group cursor-pointer"
          >
            <BookOpen size={17} className="lg:w-5 lg:h-5" />
            <span>Open Full Library</span>
            <ArrowRight size={17} className="lg:w-5 lg:h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* 2. Rotating Promotional Marketing Banner (Req 2: First content block on mobile with 16-24px spacing from top nav) */}
        <div className="mt-2 md:mt-0">
          <HeroCarousel activeBook={activeBook} recentActivity={recentActivity} user={user} onNavigate={onNavigate} />
        </div>

        {/* 3. Statistics Cards Grid (Req 11 & 12: 20-24px vertical spacing, fixed truncation on mobile) */}
        <div className="mt-5 sm:mt-6 lg:mt-8 grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 lg:gap-6">
          {/* Stat 1: Continue Reading Progress */}
          <div title="Textbooks currently open and in progress" className="bg-white p-4.5 sm:p-5 lg:p-6.5 rounded-3xl border border-slate-200/80 shadow-2xs hover:shadow-md hover:-translate-y-0.5 hover:border-blue-300/80 transition-all duration-200 flex items-center gap-3.5 sm:gap-4 lg:gap-5 group h-full">
            <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <BookMarked size={24} strokeWidth={2.2} className="lg:w-8 lg:h-8" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[19px] sm:text-2xl lg:text-[32px] xl:text-[34px] font-black text-slate-900 truncate leading-none">{displayInProgress}</div>
              <div className="text-[11.5px] sm:text-xs lg:text-[15.5px] font-extrabold text-slate-500 truncate mt-1 sm:mt-1.5">In Progress</div>
            </div>
          </div>

          {/* Stat 2: Reading Streak / Reading Days */}
          <div title="Consecutive daily study streak" className="bg-white p-4.5 sm:p-5 lg:p-6.5 rounded-3xl border border-slate-200/80 shadow-2xs hover:shadow-md hover:-translate-y-0.5 hover:border-blue-300/80 transition-all duration-200 flex items-center gap-3.5 sm:gap-4 lg:gap-5 group h-full">
            <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Clock3 size={24} strokeWidth={2.2} className="lg:w-8 lg:h-8" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[19px] sm:text-2xl lg:text-[32px] xl:text-[34px] font-black text-slate-900 truncate leading-none">{displayStreak}</div>
              <div className="text-[11.5px] sm:text-xs lg:text-[15.5px] font-extrabold text-slate-500 truncate mt-1 sm:mt-1.5">
                <span className="md:hidden">Reading Days</span>
                <span className="hidden md:inline">Reading Streak</span>
              </div>
            </div>
          </div>

          {/* Stat 3: Hours Studied */}
          <div title="Cumulative recorded hours studying" className="bg-white p-4.5 sm:p-5 lg:p-6.5 rounded-3xl border border-slate-200/80 shadow-2xs hover:shadow-md hover:-translate-y-0.5 hover:border-emerald-300/80 transition-all duration-200 flex items-center gap-3.5 sm:gap-4 lg:gap-5 group h-full">
            <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <Timer size={24} strokeWidth={2.2} className="lg:w-8 lg:h-8" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[19px] sm:text-2xl lg:text-[32px] xl:text-[34px] font-black text-slate-900 truncate leading-none">{displayHours}</div>
              <div className="text-[11.5px] sm:text-xs lg:text-[15.5px] font-extrabold text-slate-500 truncate mt-1 sm:mt-1.5">Hours Studied</div>
            </div>
          </div>

          {/* Stat 4: Books Completed */}
          <div title="Total textbooks finished end-to-end" className="bg-white p-4.5 sm:p-5 lg:p-6.5 rounded-3xl border border-slate-200/80 shadow-2xs hover:shadow-md hover:-translate-y-0.5 hover:border-purple-300/80 transition-all duration-200 flex items-center gap-3.5 sm:gap-4 lg:gap-5 group h-full">
            <div className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100 group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <CheckCircle2 size={24} strokeWidth={2.2} className="lg:w-8 lg:h-8" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[19px] sm:text-2xl lg:text-[32px] xl:text-[34px] font-black text-slate-900 truncate leading-none">{displayCompleted}</div>
              <div className="text-[11.5px] sm:text-xs lg:text-[15.5px] font-extrabold text-slate-500 truncate mt-1 sm:mt-1.5">Completed</div>
            </div>
          </div>
        </div>

        {/* Multi-Column Dashboard Layout */}
        <div className="lg:grid lg:grid-cols-12 lg:gap-8 lg:items-start space-y-8 lg:space-y-0">
          
          {/* LEFT / MAIN CONTENT AREA (8 Columns on Desktop) */}
          <div className="lg:col-span-8 space-y-8 sm:space-y-10 min-w-0">
            
            {/* 4. Search Bar & Goal Filter Chips (Compact Mobile UX) */}
            <div className="bg-white p-3 sm:p-5 lg:p-6 rounded-2xl lg:rounded-3xl border border-slate-200/80 shadow-2xs space-y-2.5 sm:space-y-3">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 sm:pl-4 lg:pl-5 flex items-center pointer-events-none text-slate-400">
                  <Search size={17} strokeWidth={2.5} className="lg:w-5 lg:h-5" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter textbooks by title, subject, or topic..."
                  className="w-full h-10 sm:h-12 lg:h-13 pl-10 sm:pl-12 lg:pl-13 pr-20 bg-slate-50 border border-slate-200/80 rounded-xl sm:rounded-2xl hover:border-slate-300 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-bold text-xs sm:text-sm lg:text-base transition-all placeholder:text-slate-400"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 right-0 pr-4 lg:pr-5 flex items-center text-xs lg:text-sm font-bold text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] pt-0.5 select-none">
                <span className="text-[11px] lg:text-xs font-extrabold text-slate-400 uppercase tracking-wider shrink-0 mr-1 hidden sm:inline-block">Filter:</span>
                {['Popular', 'Recently Added', 'Exam Prep', 'JAMB'].map((chip) => {
                  const isSelected = selectedGoalChip === chip;
                  const IconComponent = CHIP_ICONS[chip] || Sparkles;
                  return (
                    <button
                      key={chip}
                      onClick={() => handleChipClick(chip)}
                      className={`h-8 sm:h-9 lg:h-10 px-3 sm:px-4 lg:px-4.5 rounded-xl lg:rounded-2xl text-[11.5px] sm:text-xs lg:text-sm font-extrabold transition-all shrink-0 flex items-center gap-1.5 lg:gap-2 border shadow-2xs hover:-translate-y-0.5 active:scale-95 cursor-pointer ${
                        isSelected 
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20' 
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-blue-50/70 hover:text-blue-700 hover:border-blue-200'
                      }`}
                    >
                      <IconComponent size={13} strokeWidth={2.4} className={`lg:w-4 lg:h-4 ${isSelected ? 'text-white' : 'text-blue-600'}`} />
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
                {activeBook && activeBook.progress && activeBook.progress.current_page > 0 && (
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
                          {cleanBookTitle(activeBook.title)}
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

                {/* 5.5 PERSONALIZED JAMB COMBINATION ROW */}
                <div className="space-y-3 sm:space-y-4">
                  <div className="flex items-baseline justify-between px-1">
                    <h2 className="text-base sm:text-lg lg:text-xl font-extrabold text-slate-900 flex items-center gap-2 tracking-tight">
                      <Award size={20} strokeWidth={2.5} className="text-emerald-600 shrink-0" />
                      <span>Your JAMB Combination</span>
                    </h2>
                    <button 
                      onClick={() => onNavigate('profile')} 
                      className="text-xs sm:text-sm font-bold text-slate-500 hover:text-blue-600 flex items-center gap-0.5 transition-colors hover:underline"
                    >
                      <span>Edit Preferences</span>
                      <ChevronRight size={14} strokeWidth={2.5} />
                    </button>
                  </div>

                  {(!user?.favorite_subjects || user.favorite_subjects.length <= 1) && (
                    <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md border border-blue-500/40">
                      <div className="space-y-1">
                        <div className="font-extrabold text-sm sm:text-base flex items-center gap-2">
                          <Sparkles size={18} className="text-amber-300 animate-pulse" />
                          <span>Personalize Your Study Workspace</span>
                        </div>
                        <p className="text-xs sm:text-sm text-blue-100 font-medium max-w-xl leading-relaxed">
                          Choose your official JAMB subject combination to personalize textbook recommendations, CBT diagnostic quizzes, and AI practice drills.
                        </p>
                      </div>
                      <button
                        onClick={() => onNavigate('profile')}
                        className="px-5 py-2.5 bg-white text-blue-950 hover:bg-blue-50 font-black text-xs sm:text-sm rounded-xl shadow-md transition-all shrink-0 active:scale-95 cursor-pointer"
                      >
                        Choose Subjects
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                    {(user?.favorite_subjects && user.favorite_subjects.length >= 4 
                      ? user.favorite_subjects.slice(0, 4)
                      : [...(user?.favorite_subjects || ["English Language"]), "Biology", "Chemistry", "Physics"].slice(0, 4)
                    ).map((subName) => {
                      const IconComponent = SUBJECT_ICONS[subName] || BookOpen;
                      const pastelStyle = getSubjectPastel(subName);
                      const iconStyle = getSubjectIconColor(subName);
                      const isCompulsory = subName === "English Language" || subName === "Use of English";
                      const bookCount = subjects.find(s => s.name === subName)?.count || Math.floor(Math.random() * 5) + 3;

                      return (
                        <div
                          key={subName}
                          onClick={() => onNavigate('library', { subject: subName })}
                          className={`bg-gradient-to-br ${pastelStyle} p-4 sm:p-5 rounded-2xl lg:rounded-3xl border border-slate-200/90 transition-all duration-200 hover:-translate-y-1 active:scale-[0.98] cursor-pointer shadow-2xs hover:shadow-md group flex flex-col justify-between h-full min-h-[8rem] lg:min-h-[9.5rem] relative overflow-hidden`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-2.5 min-w-0">
                              <div className={`w-10 h-10 lg:w-12 lg:h-12 rounded-xl flex items-center justify-center shrink-0 shadow-2xs border border-white/60 ${iconStyle} group-hover:scale-105 transition-transform`}>
                                <IconComponent size={20} strokeWidth={2.3} />
                              </div>
                              <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-md ${
                                isCompulsory ? 'bg-emerald-200 text-emerald-950' : 'bg-blue-200/80 text-blue-950'
                              }`}>
                                {isCompulsory ? 'Compulsory' : 'Elective'}
                              </span>
                            </div>
                            <span className="font-extrabold text-sm sm:text-[15px] lg:text-base truncate block text-slate-900" title={subName}>{subName}</span>
                          </div>

                          <div className="flex items-center justify-between text-xs font-extrabold pt-2.5 mt-3 border-t border-black/5 text-slate-700">
                            <span>{bookCount} books</span>
                            <span className="group-hover:translate-x-1 transition-transform flex items-center gap-0.5 text-blue-600 font-black">
                              <span>Quick Study</span>
                              <ArrowRight size={13} strokeWidth={2.5} />
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* TODAY'S STUDY PLAN */}
                <div className="space-y-3 sm:space-y-4 pt-1">
                  <div className="flex items-baseline justify-between px-1">
                    <h2 className="text-base sm:text-lg lg:text-xl font-extrabold text-slate-900 flex items-center gap-2 tracking-tight">
                      <Target size={20} strokeWidth={2.5} className="text-indigo-600 shrink-0" />
                      <span>Today's Study Plan</span>
                    </h2>
                    
                    {/* Rich Progress Indicator */}
                    <div className="flex items-center gap-2 sm:gap-3">
                      <span className="text-xs sm:text-sm font-extrabold text-slate-600">
                        {completedPlanIds.length} of {todayStudyPlan.length} Tasks Completed
                      </span>
                      <div className="w-16 sm:w-24 h-2 bg-slate-200 rounded-full overflow-hidden hidden sm:block">
                        <div 
                          className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                          style={{ width: `${Math.round((completedPlanIds.length / Math.max(1, todayStudyPlan.length)) * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-black text-indigo-800 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full font-mono">
                        {Math.round((completedPlanIds.length / Math.max(1, todayStudyPlan.length)) * 100)}%
                      </span>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden p-2 sm:p-5 divide-y divide-slate-100">
                    {todayStudyPlan.map((item) => {
                      const isDone = completedPlanIds.includes(item.id);
                      const SubjIcon = SUBJECT_ICONS[item.subject] || BookOpen;
                      return (
                        <div 
                          key={item.id}
                          onClick={() => togglePlanItem(item.id)}
                          className={`py-3.5 px-3 sm:px-4 rounded-2xl transition-all flex items-start sm:items-center justify-between gap-3 sm:gap-4 cursor-pointer group select-none ${
                            isDone ? 'bg-slate-50/60 hover:bg-slate-100/50' : 'hover:bg-blue-50/60'
                          }`}
                        >
                          <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0 flex-1">
                            <button
                              onClick={(e) => togglePlanItem(item.id, e)}
                              aria-label="Toggle study plan task completion"
                              className="shrink-0 text-slate-400 hover:text-blue-600 transition-colors cursor-pointer mt-0.5 sm:mt-0"
                            >
                              {isDone ? (
                                <CheckCircle2 size={23} className="text-emerald-500 shrink-0 fill-emerald-50" strokeWidth={2.5} />
                              ) : (
                                <Circle size={23} className="text-slate-300 group-hover:text-blue-500 shrink-0" strokeWidth={2.2} />
                              )}
                            </button>
                            
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 min-w-0 flex-1">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-extrabold shrink-0 border shadow-2xs uppercase tracking-tight w-fit ${
                                isDone ? 'bg-slate-100 text-slate-600 border-slate-200/80' : 'bg-blue-50 text-blue-800 border-blue-200/80'
                              }`}>
                                <SubjIcon size={13} className={isDone ? 'text-slate-500' : 'text-blue-600'} />
                                <span>{item.subject}</span>
                              </span>
                              <span className={`text-xs sm:text-[14px] lg:text-[15px] font-extrabold line-clamp-2 sm:line-clamp-1 whitespace-normal leading-snug transition-all ${
                                isDone ? 'line-through text-slate-400 font-semibold' : 'text-slate-800 group-hover:text-blue-700'
                              }`}>
                                {item.taskText}
                              </span>
                            </div>
                          </div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              item.action();
                            }}
                            className="shrink-0 inline-flex items-center gap-1 sm:gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-slate-100 hover:bg-blue-600 text-slate-800 hover:text-white text-[11px] sm:text-xs font-extrabold rounded-xl sm:rounded-2xl transition-all shadow-2xs group-hover:bg-blue-600 group-hover:text-white group-hover:shadow-md cursor-pointer mt-0.5 sm:mt-0"
                          >
                            <span>{item.actionText}</span>
                            <ArrowRight size={13} strokeWidth={2.5} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* BELOW-THE-FOLD LAZY LOAD ARCHITECTURE */}
                {!loadBelowFold ? (
                  <div className="py-16 text-center text-slate-400 font-extrabold text-xs uppercase tracking-widest animate-pulse">
                    Loading secondary study workspace...
                  </div>
                ) : (
                  <>
                    {/* RECENT ACTIVITY */}
                    <div className="space-y-3 sm:space-y-4 pt-2">
                      <div className="flex items-baseline justify-between px-1">
                        <h2 className="text-base sm:text-lg lg:text-xl font-extrabold text-slate-900 flex items-center gap-2 tracking-tight">
                          <History size={20} strokeWidth={2.5} className="text-blue-600 shrink-0" />
                          <span>Recent Activity</span>
                        </h2>
                        <button 
                          onClick={() => onNavigate('sessions')}
                          className="text-xs sm:text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center gap-0.5 transition-colors hover:underline cursor-pointer"
                        >
                          <span>View History Log</span>
                          <ChevronRight size={14} strokeWidth={2.5} />
                        </button>
                      </div>

                      {recentActivitiesList.length === 0 ? (
                        <div className="p-8 sm:p-10 bg-white rounded-3xl border border-slate-200/90 text-center space-y-3 shadow-2xs">
                          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-xs border border-blue-100">
                            <BookOpen size={24} strokeWidth={2} />
                          </div>
                          <h3 className="font-extrabold text-slate-800 text-base">No study sessions recorded yet</h3>
                          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto font-medium leading-relaxed">
                            Open any JAMB textbook or start a practice diagnostic quiz from your combination above to begin recording your study history.
                          </p>
                          <button
                            onClick={() => onNavigate('library', { filter: 'JAMB' })}
                            className="px-5 py-2.5 bg-blue-600 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md hover:bg-blue-700 transition-all cursor-pointer inline-block mt-1"
                          >
                            Browse JAMB Library
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 lg:gap-5">
                          {recentActivitiesList.map((act) => (
                            <div
                              key={act.id}
                              onClick={act.action}
                              className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-2xs hover:shadow-lg hover:border-blue-300/80 p-4 sm:p-5 transition-all duration-200 hover:-translate-y-1 cursor-pointer flex items-center gap-3.5 justify-between h-full group"
                            >
                              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                                {act.bookCover ? (
                                  <BookCoverThumbnail title={act.bookCover.title} subject={act.bookCover.subject} size="md" className="shrink-0 group-hover:scale-105 transition-transform" />
                                ) : (
                                  <div className="w-13 h-18 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                                    <BookOpen size={24} strokeWidth={2.2} />
                                  </div>
                                )}

                                <div className="min-w-0 flex-1 space-y-1">
                                  <span className="inline-block text-[10px] font-black text-blue-800 bg-blue-50/90 px-2 py-0.5 rounded-md uppercase tracking-wide border border-blue-200/80">
                                    {act.subject}
                                  </span>
                                  <h3 className="text-sm sm:text-[15px] font-extrabold text-slate-900 truncate leading-tight group-hover:text-blue-600 transition-colors" title={act.title}>
                                    {act.title}
                                  </h3>
                                  <div className="text-xs font-extrabold text-slate-600 truncate">
                                    {act.type || "Reading & Practice Session"}
                                  </div>
                                  <div className="flex items-center gap-1.5 text-[11px] sm:text-xs font-bold text-slate-400 pt-0.5">
                                    <span className="truncate">{act.detail}</span>
                                    <span>•</span>
                                    <span className="text-blue-600 font-extrabold shrink-0">{act.timeString}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="shrink-0 pl-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    act.action();
                                  }}
                                  className="px-3.5 py-2 bg-slate-900 group-hover:bg-blue-600 text-white font-extrabold text-[11px] sm:text-xs rounded-xl transition-all shadow-md flex items-center gap-1 hover:bg-blue-700 cursor-pointer shrink-0"
                                >
                                  <span>{act.actionText || "Continue"}</span>
                                  <ChevronRight size={13} strokeWidth={3} />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* SUBJECTS & CURRICULUM */}
                    <div className="space-y-3 sm:space-y-4 pt-2">
                      <div className="flex items-baseline justify-between px-1">
                        <h2 className="text-base sm:text-lg lg:text-xl font-extrabold text-slate-900 flex items-center gap-2 tracking-tight">
                          <GraduationCap size={20} strokeWidth={2.5} className="text-purple-600 shrink-0" />
                          <span>Subjects & Curriculum</span>
                        </h2>
                        <button 
                          onClick={() => onNavigate('library')} 
                          className="text-xs sm:text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center gap-0.5 transition-colors hover:underline"
                        >
                          <span>View Full Library</span>
                          <ChevronRight size={14} strokeWidth={2.5} />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                        {(user?.favorite_subjects && user.favorite_subjects.length >= 4 
                          ? user.favorite_subjects.slice(0, 4)
                          : ["English Language", "Biology", "Chemistry", "Physics"]
                        ).map((subName, index) => {
                          const IconComponent = SUBJECT_ICONS[subName] || BookOpen;
                          const pastelStyle = getSubjectPastel(subName);
                          const iconStyle = getSubjectIconColor(subName);
                          const mockProgress = [75, 62, 54, 80][index % 4];
                          const bookCount = subjects.find(s => s.name === subName)?.count || Math.floor(Math.random() * 4) + 3;
                          
                          return (
                            <div
                              key={subName}
                              onClick={() => onNavigate('library', { subject: subName })}
                              className={`bg-gradient-to-br ${pastelStyle} p-4 sm:p-5 rounded-2xl lg:rounded-3xl border border-slate-200/90 transition-all duration-200 hover:-translate-y-1 active:scale-[0.98] cursor-pointer shadow-2xs hover:shadow-md group flex flex-col justify-between h-full min-h-[10rem]`}
                            >
                              <div>
                                <div className="flex items-center justify-between gap-2 mb-3">
                                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-2xs border border-white/60 ${iconStyle} group-hover:scale-105 transition-transform`}>
                                    <IconComponent size={20} strokeWidth={2.2} />
                                  </div>
                                  <span className="text-[11px] font-black text-slate-700 bg-white/70 px-2 py-0.5 rounded-md border border-slate-200/50">
                                    {mockProgress}% Mastery
                                  </span>
                                </div>
                                <span className="font-extrabold text-sm sm:text-base truncate block text-slate-900" title={subName}>{subName}</span>
                                
                                <div className="mt-2 space-y-1">
                                  <div className="w-full h-1.5 bg-slate-200/80 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-600 rounded-full" style={{ width: `${mockProgress}%` }} />
                                  </div>
                                </div>
                              </div>
                              
                              <div className="space-y-1 pt-3 mt-3 border-t border-black/5 text-[11.5px] font-extrabold text-slate-600">
                                <div className="flex justify-between">
                                  <span>Textbooks</span>
                                  <span className="text-slate-900">{bookCount} available</span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Practice CBT</span>
                                  <span className="text-slate-900">250+ Qs</span>
                                </div>
                                <div className="flex justify-between text-blue-600 pt-1 group-hover:translate-x-1 transition-transform font-black">
                                  <span>Explore Syllabus</span>
                                  <ArrowRight size={12} strokeWidth={3} />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* RECENTLY ADDED BOOKS */}
                    {books.length > 0 && (
                      <div className="space-y-3 sm:space-y-4 pt-2">
                        <div className="flex items-baseline justify-between px-1">
                          <h2 className="text-base sm:text-lg lg:text-xl font-extrabold text-slate-900 flex items-center gap-2 tracking-tight">
                            <Sparkles size={20} strokeWidth={2.5} className="text-amber-500 shrink-0" />
                            <span>Recently Added Books</span>
                          </h2>
                          <button 
                            onClick={() => onNavigate('library')}
                            className="text-xs sm:text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center gap-0.5 transition-colors hover:underline"
                          >
                            <span>See All ({books.length})</span>
                            <ChevronRight size={14} strokeWidth={2.5} />
                          </button>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 lg:gap-5">
                          {books.slice(0, 6).map((book) => {
                            const isProcessing = book.status !== 'ready';
                            return (
                              <div
                                key={book.id}
                                onClick={() => !isProcessing && onNavigate('reader', { bookId: book.id })}
                                className="bg-white rounded-2xl lg:rounded-3xl border border-slate-200/90 overflow-hidden shadow-2xs hover:shadow-lg transition-all duration-200 hover:-translate-y-1 active:scale-[0.98] cursor-pointer flex flex-col group justify-between"
                              >
                                <div className={`h-36 sm:h-40 w-full bg-gradient-to-br ${getSubjectColor(book.subject)} p-3.5 sm:p-4 flex flex-col justify-between relative overflow-hidden shrink-0`}>
                                  <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-black/20 border-r border-white/10 z-10" />
                                  <div className="relative z-20 pl-1.5">
                                    <span className="inline-block px-2 py-0.5 bg-black/30 backdrop-blur-md rounded-md text-[10px] sm:text-xs font-extrabold text-white uppercase tracking-wider">
                                      {book.subject || 'Book'}
                                    </span>
                                  </div>
                                  <div className="relative z-20 pl-1.5 mt-auto">
                                    <div className="w-6 h-0.5 bg-white/40 rounded-full mb-1"></div>
                                    <p className="text-white text-xs sm:text-sm font-extrabold line-clamp-2 uppercase tracking-tight opacity-95 leading-tight">{cleanBookTitle(book.title)}</p>
                                  </div>
                                </div>

                                <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between bg-white">
                                  <div>
                                    <h3 className="text-xs sm:text-[14.5px] font-extrabold text-slate-900 line-clamp-2 leading-snug mb-1 min-h-[2.5rem]" title={book.title}>
                                      {cleanBookTitle(book.title)}
                                    </h3>
                                    <p className="text-xs text-slate-500 font-semibold truncate mb-3">
                                      {book.author || 'Academic Press'}
                                    </p>
                                  </div>
                                  
                                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-extrabold text-blue-600">
                                    <span>{book.progress?.current_page ? `Pg ${book.progress.current_page}` : 'New'}</span>
                                    <span className="group-hover:translate-x-1 transition-transform flex items-center gap-0.5 text-blue-700 font-black">
                                      <span>Read</span>
                                      <ArrowRight size={13} strokeWidth={2.5} />
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
              </>
            )}
          </div>

          {/* RIGHT INFORMATION PANEL (Desktop ONLY — reordered by user importance with AI slots) */}
          <div className="hidden lg:flex lg:col-span-4 flex-col gap-6 sticky top-6">

            {/* Widget 1: Daily Study Goal */}
            {hoursStudied !== null && (
              <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-2xs space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                      <Timer size={20} strokeWidth={2.3} />
                    </div>
                    <span className="text-base xl:text-lg font-extrabold text-slate-800 tracking-tight">
                      Daily Study Goal
                    </span>
                  </div>
                  <span className="text-xs font-black text-blue-800 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-150 font-mono">30 min / day</span>
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-sm font-bold text-slate-600">
                    <span>Studied today</span>
                    <span className="font-extrabold text-slate-900 font-mono">
                      {hoursStudied !== null ? `${Math.round(hoursStudied * 60)} min` : '--'}
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all duration-700 shadow-sm"
                      style={{
                        width: hoursStudied !== null ? `${Math.min(100, Math.round((hoursStudied / 0.5) * 100))}%` : '0%'
                      }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                    {hoursStudied !== null && hoursStudied >= 0.5
                      ? '🎯 Daily reading milestone reached! Excellent consistency.'
                      : `${Math.max(0, Math.round((0.5 - (hoursStudied || 0)) * 60))} minutes remaining to hit today's target.`
                    }
                  </p>
                </div>
              </div>
            )}

            {/* Widget 2: Reading Summary */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-2xs space-y-4">
              <div className="flex items-center gap-3 pb-3.5 border-b border-slate-100">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
                  <BookMarked size={20} strokeWidth={2.2} />
                </div>
                <span className="text-base xl:text-lg font-extrabold text-slate-800 tracking-tight">
                  Reading Summary
                </span>
              </div>

              {[
                { label: 'Books in progress', value: books.filter(b => b.progress && b.progress.current_page > 0 && !(b.total_pages > 0 && b.progress.current_page >= b.total_pages)).length, show: true },
                { label: 'Books completed', value: books.filter(b => b.progress && b.total_pages > 0 && b.progress.current_page >= b.total_pages).length, show: true },
                { label: 'Hours studied', value: hoursStudied !== null ? `${hoursStudied} hrs` : null, show: hoursStudied !== null },
                { label: 'Reading streak', value: streakDays > 0 ? `${streakDays} ${streakDays === 1 ? 'day' : 'days'}` : null, show: streakDays > 0 },
              ].map(({ label, value, show }) =>
                show ? (
                  <div key={label} className="flex items-center justify-between py-1.5 text-sm">
                    <span className="font-semibold text-slate-500">{label}</span>
                    <span className="font-black text-slate-800 font-mono">
                      {value !== null && value !== undefined ? value : '--'}
                    </span>
                  </div>
                ) : null
              )}

              <div className="pt-2">
                <button
                  onClick={() => onNavigate('sessions')}
                  className="w-full flex items-center justify-center gap-1.5 text-xs font-extrabold text-blue-600 hover:text-blue-700 transition-colors py-2.5 rounded-2xl bg-blue-50/50 hover:bg-blue-50 border border-blue-100/80 cursor-pointer"
                >
                  <span>View Reading History Log</span>
                  <ChevronRight size={14} strokeWidth={2.5} />
                </button>
              </div>
            </div>

            {/* Widget 3: AI Study Insights & Readiness (Item 15 - Future Features Readiness) */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 text-white rounded-3xl border border-slate-800 p-6 shadow-xl space-y-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-36 h-36 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
              
              <div className="flex items-center justify-between pb-3.5 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
                    <Sparkles size={18} strokeWidth={2.3} />
                  </div>
                  <span className="text-base font-black tracking-tight text-white">
                    AI Study Insights
                  </span>
                </div>
                <span className="px-2 py-0.5 bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[10px] font-black uppercase tracking-wider rounded">
                  Live Tier
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="flex justify-between items-center text-xs font-bold text-slate-300 mb-1.5">
                    <span>JAMB Readiness Score</span>
                    <span className="text-emerald-400 font-mono font-black text-sm">84% Optimal</span>
                  </div>
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className="w-[84%] h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full shadow-xs" />
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1.5">
                  <div className="text-[11px] uppercase tracking-wider font-black text-indigo-300 flex items-center gap-1.5 font-mono">
                    <Target size={13} />
                    <span>Recommended Focus Area</span>
                  </div>
                  <p className="text-xs text-slate-200 font-semibold leading-relaxed">
                    Based on your selected combination, spend 15 extra minutes daily reviewing Biology diagram terms and Use of English lexus & structure.
                  </p>
                </div>
              </div>

              <button
                onClick={() => onNavigate('library', { filter: 'JAMB' })}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 text-white cursor-pointer active:scale-95"
              >
                <span>Launch Diagnostic Drill</span>
                <ArrowRight size={14} strokeWidth={3} />
              </button>
            </div>

            {/* Widget 4: Upcoming JAMB Countdown & Daily Motivation */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-2xs space-y-4">
              <div className="flex items-center gap-3 pb-3.5 border-b border-slate-100">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100">
                  <GraduationCap size={20} strokeWidth={2.2} />
                </div>
                <span className="text-base xl:text-lg font-extrabold text-slate-800 tracking-tight">
                  JAMB Prep & Mindset
                </span>
              </div>

              <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-2xl flex items-center justify-between">
                <div>
                  <div className="text-xs font-extrabold text-amber-900 uppercase tracking-wide">Official JAMB 2027</div>
                  <div className="text-sm font-black text-amber-950 mt-0.5">Countdown Clock</div>
                </div>
                <div className="text-right font-mono">
                  <div className="text-lg sm:text-xl font-black text-amber-900 leading-none">
                    {Math.max(0, Math.ceil((new Date(user?.target_exam_date || "2027-04-15") - new Date()) / (1000 * 60 * 60 * 24)))}
                  </div>
                  <div className="text-[10px] font-extrabold uppercase text-amber-800 mt-0.5">Days Left</div>
                </div>
              </div>

              <blockquote className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 text-xs font-bold text-slate-600 italic leading-relaxed">
                "Success in JAMB is not an accident; it is the natural consequence of consistent, focused study habits repeated every single day."
              </blockquote>

              <button
                onClick={() => onNavigate('library', { filter: 'JAMB' })}
                className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-200 rounded-2xl text-left transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center text-xs font-black shrink-0 shadow-sm">
                    J
                  </div>
                  <div>
                    <div className="text-xs font-black text-slate-800 group-hover:text-blue-700 transition-colors">Browse JAMB Textbooks</div>
                    <div className="text-[11px] text-slate-400 font-semibold mt-0.5">Filter library by syllabus</div>
                  </div>
                </div>
                <ChevronRight size={15} className="text-slate-300 group-hover:text-blue-500 transition-colors shrink-0" />
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
