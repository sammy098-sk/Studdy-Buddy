import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, Navigate, useParams } from 'react-router-dom';
import { Home, Bell, User, Menu, BookOpen, History, Plus, Search, Settings, Sparkles } from 'lucide-react';
import { supabase } from './supabase';
import DesktopLanding from './components/DesktopLanding';
import OnboardingFlow from './components/OnboardingFlow';
import AuthFlow from './components/AuthFlow';
import ChatView from './components/ChatView';
import HomeView from './components/HomeView';
import ProfilePage from './components/ProfilePage';
import NotificationsPage from './components/NotificationsPage';
import SessionsPage from './components/SessionsPage';
import TextbookImporter from './components/TextbookImporter';
import TextbookReader from './components/TextbookReader';
import LibraryPage from './components/LibraryPage';
import InfoPage from './components/InfoPage';
import ContactPage from './components/ContactPage';
import MobileMenuDrawer from './components/MobileMenuDrawer';
import NowPlayingBar from './components/NowPlayingBar';
import DesktopSidebar from './components/DesktopSidebar';
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

  useEffect(() => {
    const fetchProfile = async (session) => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      const userMeta = session.user.user_metadata || {};
      
      setUser({ 
        id: session.user.id,
        name: data?.full_name || userMeta.full_name || session.user.email.split("@")[0], 
        email: session.user.email,
        favorite_subjects: data?.favorite_subjects || [],
        daily_goal: data?.daily_goal || "30",
        role: data?.role || 'student'
      });

      // Fetch today's completed topics
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      
      const { data: progressData } = await supabase
        .from('study_progress')
        .select('topic_label')
        .eq('user_id', session.user.id)
        .gte('created_at', todayStart.toISOString());
        
      if (progressData) {
        setCompleted(progressData.map(p => p.topic_label));
      }
      
      setStage("app");
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
          setUser(u);
          setStage("app");
          navigate('/library');
        }}
      />
    );
  }

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
  
  // Custom navigation wrapper to support legacy string routes
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
    // Legacy: we used to navigate to study for chat
    navigate('/study');
  };

  const isReaderRoute = window.location.pathname.startsWith('/book/');

  return (
    <div className="h-screen flex flex-col w-full bg-slate-100/60" style={{ fontFamily: "'Inter', sans-serif" }}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600;700;800&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500&display=swap" rel="stylesheet" />

      {/* Expanded Desktop Header (Hidden on Reader route) */}
      {!isReaderRoute && (
        <header className="bg-white border-b shrink-0 z-30 shadow-2xs" style={{ borderColor: "#E2E8F0" }}>
          <div className="max-w-[1400px] mx-auto w-full flex items-center justify-between px-4 sm:px-6 lg:px-8 py-3.5 gap-4">
            {/* Brand Logo & Name / Mobile Greeting */}
            <button onClick={() => navigate('/study')} className="flex items-center gap-2.5 group shrink-0 focus-visible:outline-none min-w-0">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-105 shadow-2xs shrink-0" style={{ background: "#2954E5" }}>
                <BookOpen size={17} color="#FFFFFF" />
              </div>
              {/* Desktop Branding (Hidden on mobile) */}
              <div className="hidden md:flex flex-col text-left">
                <span className="font-extrabold text-[16px] leading-none tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  StudyBuddy
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 font-mono">Platform</span>
              </div>
              {/* Mobile Greeting (Replaces branding text on mobile) */}
              <div className="flex flex-col md:hidden text-left min-w-0">
                <span className="text-[11px] font-medium text-slate-400 truncate">{getGreeting()}</span>
                <span className="text-[14px] font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  {user?.name || "Student"} 👋
                </span>
              </div>
            </button>

            {/* Desktop Quick Search Bar */}
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                const q = e.target.elements.topSearch?.value?.trim();
                if (q) navigate(`/library?search=${encodeURIComponent(q)}`);
                else navigate('/library');
              }} 
              className="hidden md:flex flex-1 max-w-md mx-6 relative"
            >
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search size={16} />
              </div>
              <input 
                name="topSearch"
                type="text" 
                placeholder="Search study library, textbooks, or subjects..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200/80 hover:border-slate-300 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 rounded-xl text-xs sm:text-sm font-medium text-slate-800 placeholder:text-slate-400 outline-none transition-all"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono bg-white text-slate-400 border border-slate-200 px-1.5 py-0.5 rounded shadow-2xs">
                Library
              </span>
            </form>

            {/* Right Header Shortcuts */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Notifications */}
              <button
                onClick={() => navigate('/notifications')}
                title="Notifications"
                className="hidden md:flex items-center justify-center w-10 h-10 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all shadow-2xs hover:shadow-sm"
              >
                <Bell size={18} />
              </button>

              {/* Settings Shortcut */}
              <button
                onClick={() => navigate('/notifications')}
                title="Account Settings"
                className="hidden md:flex items-center justify-center w-10 h-10 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all shadow-2xs hover:shadow-sm"
              >
                <Settings size={18} />
              </button>

              {/* Profile User Chip */}
              <button
                onClick={() => navigate('/profile')}
                title="View Profile"
                className="hidden md:flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-slate-200/80 bg-white hover:border-blue-300 hover:shadow-sm transition-all text-left group"
              >
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 font-extrabold text-xs flex items-center justify-center border border-blue-100 uppercase group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  {(user?.name || "S")[0]}
                </div>
                <div className="min-w-0 pr-1">
                  <div className="text-[12.5px] font-bold text-slate-800 leading-tight truncate max-w-[120px] group-hover:text-blue-600 transition-colors">
                    {user?.name || "Student"}
                  </div>
                  <div className="text-[10px] font-medium text-slate-400 capitalize">{user?.role || "Student"}</div>
                </div>
              </button>

              {/* Mobile hamburger opens side drawer */}
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="md:hidden flex items-center justify-center w-10 h-10 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                aria-label="Open menu"
              >
                <Menu size={20} />
              </button>
            </div>
          </div>
        </header>
      )}

      {mobileMenuOpen && <MobileMenuDrawer onClose={() => setMobileMenuOpen(false)} onNavigate={navigateTo} currentPage={window.location.pathname.slice(1)} user={user} />}

      {/* Main Application Container: Centered (max-w-[1400px]) on standard routes, Full Screen on Reader */}
      <div className={`flex-1 overflow-hidden relative flex flex-col md:flex-row ${!isReaderRoute ? 'max-w-[1400px] w-full mx-auto' : 'w-full'}`}>
        {!isReaderRoute && (
          <DesktopSidebar user={user} currentPath={window.location.pathname} onNavigate={navigateTo} />
        )}

        <div className="flex-1 overflow-y-auto flex flex-col min-w-0 w-full relative">
          <Routes>
            <Route path="/" element={<Navigate to="/study" replace />} />
            <Route path="/library" element={<LibraryPage user={user} onNavigate={navigateTo} />} />
            <Route path="/upload" element={<TextbookImporter onNavigate={navigateTo} user={user} />} />
            <Route path="/book/:id" element={<Navigate to="read" replace />} />
            <Route path="/book/:id/read" element={<ReaderRouteWrapper user={user} />} />
            <Route path="/study" element={<HomeView user={user} onNavigate={navigateTo} />} />
            <Route path="/about" element={<InfoPage bgVariant="about" onNavigate={navigateTo} />} />
            <Route path="/how-it-works" element={<InfoPage bgVariant="how-it-works" onNavigate={navigateTo} />} />
            <Route path="/help" element={<InfoPage bgVariant="help" onNavigate={navigateTo} />} />
            <Route path="/privacy" element={<InfoPage bgVariant="privacy" onNavigate={navigateTo} />} />
            <Route path="/terms" element={<InfoPage bgVariant="terms" onNavigate={navigateTo} />} />
            <Route path="/contact" element={<ContactPage onNavigate={navigateTo} />} />
            <Route path="/legacy-study" element={<ChatView key={resetKey} completed={completed} setCompleted={setCompleted} onNavigate={navigateTo} user={user} resumeSession={resumeSession} />} />
            <Route path="/sessions" element={<SessionsPage userId={user.id} onNavigate={navigateTo} onResume={handleResume} />} />
            <Route path="/notifications" element={<NotificationsPage user={user} onNavigate={navigateTo} />} />
            <Route path="/profile" element={
              <ProfilePage
                user={user}
                onLogout={handleLogout}
                onNavigate={navigateTo}
                onUpdateUser={(updates) => setUser((prev) => ({ ...prev, ...updates }))}
              />
            } />
            <Route path="*" element={<Navigate to="/study" replace />} />
          </Routes>
        </div>
      </div>

      {!isReaderRoute && <NowPlayingBar />}
    </div>
  );
}
