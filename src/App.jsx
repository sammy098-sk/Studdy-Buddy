import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, Navigate, useParams } from 'react-router-dom';
import { Home, Bell, User, Menu, BookOpen, History, Plus, Search, Settings, Sparkles, Sun, Moon } from 'lucide-react';
import { supabase } from './supabase';
import DesktopLanding from './components/DesktopLanding';
import OnboardingFlow from './components/OnboardingFlow';
import AuthFlow from './components/AuthFlow';
import ExamSetupWizard from './components/ExamSetupWizard';
import ChatView from './components/ChatView';
import HomeView from './components/HomeView';
import ProfilePage from './components/ProfilePage';
import NotificationsPage from './components/NotificationsPage';
import SessionsPage from './components/SessionsPage';
import FullAITutorPage from './components/FullAITutorPage';
import TextbookImporter from './components/TextbookImporter';
import TextbookReader from './components/TextbookReader';
import LibraryPage from './components/LibraryPage';
import InfoPage from './components/InfoPage';
import ContactPage from './components/ContactPage';
import MobileMenuDrawer from './components/MobileMenuDrawer';
import NowPlayingBar from './components/NowPlayingBar';
import DesktopSidebar from './components/DesktopSidebar';
import DashboardAISummariesView from './components/DashboardAISummariesView';
import DashboardJAMBPracticeView from './components/DashboardJAMBPracticeView';
import DashboardExplainConceptView from './components/DashboardExplainConceptView';
import { readerPreferencesService } from './services/ReaderPreferencesService';

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(min-width: 768px)").matches : false
  );
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const handler = (e) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isDesktop;
}

// Wrapper to parse params for reader
function ReaderRouteWrapper({ user }) {
  const { id } = useParams();
  const navigate = useNavigate();
  // We use navigate('/library') instead of letting TextbookReader guess
  return <TextbookReader bookId={id} user={user} onNavigate={() => navigate('/library')} />;
}

export default function App() {
  return (
    <Router>
      <MainApp />
    </Router>
  );
}

function MainApp() {
  const isDesktop = useIsDesktop();
  const [stage, setStage] = useState("loading"); // loading | onboarding | auth | app
  const [user, setUser] = useState({ name: "", email: "" });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  
  // Legacy ChatView state
  const [resetKey, setResetKey] = useState(0);
  const [completed, setCompleted] = useState([]);
  const [resumeSession, setResumeSession] = useState(null);

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('studybuddy_theme') || 'light';
  });

  const toggleTheme = (newTheme) => {
    const targetTheme = newTheme || (theme === 'dark' ? 'light' : 'dark');
    setTheme(targetTheme);
    localStorage.setItem('studybuddy_theme', targetTheme);
  };

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    const fetchProfile = async (session) => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      const userMeta = session.user.user_metadata || {};
      
      const favSubjects = data?.favorite_subjects || userMeta.subject_combination || JSON.parse(localStorage.getItem(`sb_subjects_${session.user.id}`) || "null") || [];
      const examGoal = userMeta.exam_goal || localStorage.getItem(`sb_exam_goal_${session.user.id}`) || "JAMB";
      const examYear = userMeta.exam_year || localStorage.getItem(`sb_exam_year_${session.user.id}`) || "2027";
      const targetScore = userMeta.target_score || localStorage.getItem(`sb_target_score_${session.user.id}`) || "250+";
      const targetDate = userMeta.target_exam_date || localStorage.getItem(`sb_target_date_${session.user.id}`) || new Date("2027-04-15T09:00:00Z").toISOString();
      const isSetupCompleted = localStorage.getItem(`sb_setup_completed_${session.user.id}`) === "true" || (favSubjects.length >= 3 && userMeta.target_score);

      const updatedUser = { 
        id: session.user.id,
        name: data?.full_name || userMeta.full_name || session.user.email.split("@")[0], 
        email: session.user.email,
        favorite_subjects: favSubjects,
        daily_goal: data?.daily_goal || "30",
        role: data?.role || 'student',
        exam_goal: examGoal,
        exam_year: examYear,
        target_score: targetScore,
        target_exam_date: targetDate,
        subject_combination: favSubjects,
        avatar_url: data?.avatar_url || null
      };
      
      setUser(updatedUser);

      // Fetch today's completed topics & log daily app engagement check-in if none exist today
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      
      const { data: progressData } = await supabase
        .from('study_progress')
        .select('topic_label')
        .eq('user_id', session.user.id)
        .gte('created_at', todayStart.toISOString());
        
      if (progressData && progressData.length > 0) {
        setCompleted(progressData.map(p => p.topic_label));
      } else {
        const { error: checkinErr } = await supabase
          .from('study_progress')
          .insert({ user_id: session.user.id, topic_label: 'Daily Check-in' });
        if (!checkinErr) {
          setCompleted(['Daily Check-in']);
        }
      }
      
      setStage(isSetupCompleted ? "app" : "exam_setup");
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
         fetchProfile(session);
      } else {
         setStage("onboarding");
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        fetchProfile(session);
      } else if (event === 'SIGNED_OUT') {
        setUser({ name: "", email: "" });
        setStage("auth");
        navigate('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    if (user?.id) {
      readerPreferencesService.clearUserCache(user.id);
    }
    await supabase.auth.signOut();
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning,";
    if (hour < 17) return "Good afternoon,";
    return "Good evening,";
  };

  const navigateTo = (key, payload = null) => {
    setMobileMenuOpen(false);
    if (key === 'reader' && payload?.bookId) {
      navigate(`/book/${payload.bookId}/read`);
    } else if (key === 'importer') {
      navigate('/upload');
    } else if (key === 'library' && payload?.subject) {
      navigate(`/library?subject=${encodeURIComponent(payload.subject)}`);
    } else {
      navigate(`/${key}`);
    }
  };

  const handleResume = (session) => {
    setResumeSession(session);
    setResetKey((k) => k + 1);
    navigate('/study');
  };

  if (stage === "loading") {
    return <div className="h-screen w-full flex items-center justify-center bg-slate-50"><div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div></div>;
  }

  if (stage === "onboarding") {
    return isDesktop ? (
      <DesktopLanding onFinish={() => setStage("auth")} />
    ) : (
      <OnboardingFlow onFinish={() => setStage("auth")} />
    );
  }

  if (stage === "auth") {
    return (
      <AuthFlow
        onAuthenticated={(u) => {
          const isSetupDone = localStorage.getItem(`sb_setup_completed_${u.id}`) === "true" || u.favorite_subjects?.length >= 3;
          setUser(u);
          setStage(isSetupDone ? "app" : "exam_setup");
          if (isSetupDone) navigate('/library');
        }}
      />
    );
  }

  if (stage === "exam_setup") {
    return (
      <ExamSetupWizard
        user={user}
        onFinish={(updatedPrefs) => {
          if (user?.id) {
            localStorage.setItem(`sb_setup_completed_${user.id}`, "true");
          }
          setUser(prev => ({
            ...prev,
            ...updatedPrefs
          }));
          setStage("app");
          navigate('/library');
        }}
      />
    );
  }

  const isReaderRoute = window.location.pathname.startsWith('/book/');

  return (
    <div className={`h-screen flex flex-col w-full ${theme === 'dark' ? 'bg-[#090D16] text-white' : 'bg-[#edf5f1] text-slate-900'}`} style={{ fontFamily: "'Inter', sans-serif" }}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600;700;800&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500&display=swap" rel="stylesheet" />

      {/* Expanded Desktop Header (Hidden on Reader route) */}
      {!isReaderRoute && (
        <header className={`${theme === 'dark' ? 'bg-slate-900/95 border-slate-800' : 'bg-white border-slate-200'} border-b shrink-0 z-30 shadow-2xs w-full`}>
          <div className="w-full flex items-center justify-between px-4 lg:px-6 py-3.5 gap-4">
            {/* Brand Logo & Name / Mobile Greeting */}
            <button onClick={() => navigate('/study')} className="flex items-center gap-2.5 group shrink-0 focus-visible:outline-none min-w-0">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-105 shadow-2xs shrink-0 bg-indigo-600 md:bg-[#2954E5]">
                <BookOpen size={17} color="#FFFFFF" />
              </div>
              {/* Desktop Branding (Hidden on mobile) */}
              <div className="hidden md:flex flex-col text-left">
                <span className={`font-extrabold text-[18px] lg:text-[20px] leading-none tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'} group-hover:text-blue-600 transition-colors`} style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  StudyBuddy
                </span>
                <span className="text-[11px] lg:text-[12px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 font-mono">Platform</span>
              </div>
              {/* Mobile Greeting (Replaces branding text on mobile) */}
              <div className="flex flex-col md:hidden text-left min-w-0">
                <span className="text-[11px] font-medium text-slate-400 truncate">{getGreeting()}</span>
                <span className={`text-[14px] font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'} truncate group-hover:text-indigo-600 transition-colors`} style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  {user?.name || "Student"} 👋
                </span>
              </div>
            </button>

            {/* Desktop Center Search Bar */}
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                const q = e.target.elements.topSearch?.value?.trim();
                if (q) navigate(`/library?search=${encodeURIComponent(q)}`);
                else navigate('/library');
              }} 
              className="hidden md:flex flex-1 max-w-md lg:max-w-xl mx-6 relative"
            >
              <div className="absolute inset-y-0 left-0 pl-3.5 lg:pl-4 flex items-center pointer-events-none text-slate-400">
                <Search size={18} className="lg:w-5 lg:h-5" />
              </div>
              <input 
                name="topSearch"
                type="text" 
                placeholder="Search study library, textbooks, or subjects..."
                className={`w-full pl-10 lg:pl-12 pr-16 py-2.5 lg:py-3.5 ${theme === 'dark' ? 'bg-slate-800/80 border-slate-700 text-white placeholder:text-slate-400' : 'bg-slate-50 border-slate-200/80 text-slate-800 placeholder:text-slate-400'} hover:border-slate-300 focus:outline-none rounded-xl lg:rounded-2xl text-sm lg:text-[16px] xl:text-[17px] font-bold transition-all`}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] lg:text-[13px] font-mono font-bold bg-indigo-600 text-white px-2.5 py-1 rounded-lg shadow-2xs">
                Library
              </span>
            </form>

            {/* Right Header Shortcuts */}
            <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-3 shrink-0">
              {/* Quick Light / Dark Theme Switcher */}
              <button
                onClick={() => toggleTheme()}
                title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
                className={`flex items-center justify-center w-9 h-9 lg:w-10 lg:h-10 rounded-xl transition-all border ${theme === 'dark' ? 'bg-slate-800 text-amber-400 border-slate-700 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'} cursor-pointer`}
              >
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </button>

              {/* Notifications */}
              <button
                onClick={() => navigate('/notifications')}
                title="Notifications"
                className={`hidden md:flex items-center justify-center w-10 h-10 lg:w-11 lg:h-11 rounded-xl lg:rounded-2xl ${theme === 'dark' ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-50'} border border-transparent hover:border-slate-200 transition-all shadow-2xs cursor-pointer`}
              >
                <Bell size={20} className="lg:w-5 lg:h-5" />
              </button>

              {/* Settings Shortcut */}
              <button
                onClick={() => navigate('/profile')}
                title="Account Settings"
                className={`hidden md:flex items-center justify-center w-10 h-10 lg:w-11 lg:h-11 rounded-xl lg:rounded-2xl ${theme === 'dark' ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-50'} border border-transparent hover:border-slate-200 transition-all shadow-2xs cursor-pointer`}
              >
                <Settings size={20} className="lg:w-5 lg:h-5" />
              </button>

              {/* Profile User Chip */}
              <button
                onClick={() => navigate('/profile')}
                title="View Profile"
                className={`hidden md:flex items-center gap-2.5 lg:gap-3 px-3 py-1.5 lg:px-4 lg:py-2 rounded-xl lg:rounded-2xl border ${theme === 'dark' ? 'border-slate-800 bg-slate-900 text-white' : 'border-slate-200/80 bg-white text-slate-900'} hover:border-blue-300 hover:shadow-sm transition-all text-left group cursor-pointer`}
              >
                <div className="w-7 h-7 lg:w-9 lg:h-9 rounded-lg lg:rounded-xl bg-blue-50 text-blue-700 font-extrabold text-xs lg:text-sm flex items-center justify-center border border-blue-100 uppercase group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  {(user?.name || "S")[0]}
                </div>
                <div className="min-w-0 pr-1">
                  <div className={`text-[13px] lg:text-[16px] font-extrabold ${theme === 'dark' ? 'text-white' : 'text-slate-900'} leading-tight truncate max-w-[120px] lg:max-w-[170px] group-hover:text-blue-600 transition-colors`}>
                    {user?.name || "Student"}
                  </div>
                  <div className="text-[11px] lg:text-[13px] font-bold text-slate-400 capitalize">{user?.role || "Student"}</div>
                </div>
              </button>

              {/* Mobile hamburger opens side drawer */}
              <button
                onClick={() => setMobileMenuOpen(true)}
                className={`md:hidden flex items-center justify-center w-10 h-10 rounded-xl ${theme === 'dark' ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-700'} hover:opacity-80 transition-colors`}
                aria-label="Open menu"
              >
                <Menu size={20} />
              </button>
            </div>
          </div>
        </header>
      )}

      {mobileMenuOpen && <MobileMenuDrawer onClose={() => setMobileMenuOpen(false)} onNavigate={navigateTo} currentPage={window.location.pathname.slice(1)} user={user} onLogout={handleLogout} theme={theme} toggleTheme={toggleTheme} />}

      {/* Main Application Container */}
      <div className="flex-1 overflow-hidden relative flex flex-col md:flex-row w-full">
        {!isReaderRoute && (
          <DesktopSidebar user={user} currentPath={window.location.pathname} onNavigate={navigateTo} theme={theme} />
        )}

        <div className="flex-1 overflow-y-auto flex flex-col min-w-0 w-full relative">
          <Routes>
            <Route path="/" element={<Navigate to="/study" replace />} />
            <Route path="/library" element={<LibraryPage user={user} onNavigate={navigateTo} theme={theme} />} />
            <Route path="/upload" element={<TextbookImporter onNavigate={navigateTo} user={user} theme={theme} />} />
            <Route path="/book/:id" element={<Navigate to="read" replace />} />
            <Route path="/book/:id/read" element={<ReaderRouteWrapper user={user} />} />
            <Route path="/study" element={<HomeView user={user} onNavigate={navigateTo} mobileMenuOpen={mobileMenuOpen} theme={theme} toggleTheme={toggleTheme} />} />
            <Route path="/ai-summaries" element={<DashboardAISummariesView user={user} onNavigate={navigateTo} theme={theme} />} />
            <Route path="/jamb-practice" element={<DashboardJAMBPracticeView user={user} onNavigate={navigateTo} theme={theme} />} />
            <Route path="/explain-concept" element={<DashboardExplainConceptView user={user} onNavigate={navigateTo} theme={theme} />} />
            <Route path="/chat" element={<FullAITutorPage user={user} onNavigate={navigateTo} theme={theme} />} />
            <Route path="/about" element={<InfoPage bgVariant="about" onNavigate={navigateTo} theme={theme} />} />
            <Route path="/how-it-works" element={<InfoPage bgVariant="how-it-works" onNavigate={navigateTo} theme={theme} />} />
            <Route path="/help" element={<InfoPage bgVariant="help" onNavigate={navigateTo} theme={theme} />} />
            <Route path="/privacy" element={<InfoPage bgVariant="privacy" onNavigate={navigateTo} theme={theme} />} />
            <Route path="/terms" element={<InfoPage bgVariant="terms" onNavigate={navigateTo} theme={theme} />} />
            <Route path="/contact" element={<ContactPage onNavigate={navigateTo} theme={theme} />} />
            <Route path="/legacy-study" element={<ChatView key={resetKey} completed={completed} setCompleted={setCompleted} onNavigate={navigateTo} user={user} resumeSession={resumeSession} theme={theme} />} />
            <Route path="/sessions" element={<SessionsPage userId={user.id} onNavigate={navigateTo} onResume={handleResume} theme={theme} />} />
            <Route path="/notifications" element={<NotificationsPage user={user} onNavigate={navigateTo} theme={theme} />} />
            <Route path="/profile" element={
              <ProfilePage
                user={user}
                onLogout={handleLogout}
                onNavigate={navigateTo}
                onUpdateUser={(updates) => setUser((prev) => ({ ...prev, ...updates }))}
                theme={theme}
                toggleTheme={toggleTheme}
              />
            } />
            <Route path="*" element={<Navigate to="/study" replace />} />
          </Routes>
        </div>
      </div>

      {!isReaderRoute && <NowPlayingBar theme={theme} />}
    </div>
  );
}
