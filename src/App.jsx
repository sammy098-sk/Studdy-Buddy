import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, Navigate, useParams } from 'react-router-dom';
import { Home, Bell, User, Menu, BookOpen, History, Plus, Search } from 'lucide-react';
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
    <div className="h-screen flex flex-col w-full" style={{ fontFamily: "'Inter', sans-serif" }}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@500&display=swap" rel="stylesheet" />

      {/* Hide global nav if in reader */}
      {!isReaderRoute && (
        <nav className="flex items-center justify-between px-5 sm:px-8 py-4 border-b shrink-0 bg-white" style={{ borderColor: "#E2E8F0" }}>
          {/* Desktop: show logo brand */}
          <button onClick={() => navigate('/library')} className="hidden md:flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#2954E5" }}>
              <BookOpen size={15} color="#FFFFFF" />
            </div>
            <span className="font-semibold text-[15px]" style={{ color: "#101C34", fontFamily: "'Montserrat', sans-serif" }}>
              StudyBuddy
            </span>
          </button>

          {/* Mobile: show greeting */}
          <div className="flex flex-col md:hidden">
            <span className="text-[11px] font-medium" style={{ color: "#8493B0" }}>{getGreeting()}</span>
            <span className="text-[15px] font-semibold" style={{ color: "#101C34", fontFamily: "'Montserrat', sans-serif" }}>
              {user.name || "Student"} 👋
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/study')}
              className="hidden md:flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors text-slate-600 hover:bg-slate-50"
            >
              <Home size={15} /> Home
            </button>
            <button
              onClick={() => navigate('/library')}
              className="hidden md:flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors text-slate-600 hover:bg-slate-50"
            >
              <BookOpen size={15} /> My Library
            </button>
            {user.role === 'admin' && (
              <button
                onClick={() => navigate('/upload')}
                className="hidden md:flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors text-slate-600 hover:bg-slate-50"
              >
                <Plus size={15} /> Upload
              </button>
            )}
            <button
              onClick={() => navigate('/profile')}
              className="hidden md:flex items-center justify-center w-9 h-9 rounded-lg transition-colors text-slate-600 hover:bg-slate-50"
              aria-label="Profile"
            >
              <User size={17} />
            </button>

            {/* Mobile-only: hamburger opens side drawer */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg transition-colors text-slate-600"
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
          </div>
        </nav>
      )}

      {mobileMenuOpen && <MobileMenuDrawer onClose={() => setMobileMenuOpen(false)} onNavigate={navigateTo} currentPage={window.location.pathname.slice(1)} user={user} />}

      <div className="flex-1 overflow-hidden relative flex flex-col">
        <Routes>
          <Route path="/" element={<Navigate to="/study" replace />} />
          <Route path="/library" element={<LibraryPage user={user} onNavigate={navigateTo} />} />
          <Route path="/upload" element={<TextbookImporter onNavigate={navigateTo} user={user} />} />
          <Route path="/book/:id" element={<Navigate to="read" replace />} />
          <Route path="/book/:id/read" element={<ReaderRouteWrapper user={user} />} />
          <Route path="/study" element={<HomeView user={user} onNavigate={navigateTo} />} />
          {/* Legacy route kept for backward compatibility if needed */}
          <Route path="/legacy-study" element={<ChatView key={resetKey} completed={completed} setCompleted={setCompleted} onNavigate={navigateTo} user={user} resumeSession={resumeSession} />} />
          <Route path="/sessions" element={<SessionsPage userId={user.id} onNavigate={navigateTo} onResume={handleResume} />} />
          <Route path="/notifications" element={<NotificationsPage onNavigate={navigateTo} />} />
          <Route path="/profile" element={
            <ProfilePage
              user={user}
              onLogout={handleLogout}
              onNavigate={navigateTo}
              onUpdateUser={(updates) => setUser((prev) => ({ ...prev, ...updates }))}
            />
          } />
          {/* Default fallback */}
          <Route path="*" element={<Navigate to="/study" replace />} />
        </Routes>
      </div>

      {/* Persistent Native Mobile Bottom Navigation Bar */}
      {!isReaderRoute && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-t border-slate-200 px-2 py-1.5 flex items-center justify-around shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
          <button
            onClick={() => navigate('/study')}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-colors ${
              window.location.pathname === '/study' || window.location.pathname === '/' 
                ? 'text-blue-600 font-bold' 
                : 'text-slate-500 hover:text-slate-800 font-medium'
            }`}
            aria-label="Home"
          >
            <Home size={21} className={window.location.pathname === '/study' || window.location.pathname === '/' ? 'text-blue-600 fill-blue-50' : 'text-slate-500'} />
            <span className="text-[10px] mt-1 tracking-tight">Home</span>
          </button>

          <button
            onClick={() => navigate('/library')}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-colors ${
              window.location.pathname === '/library' 
                ? 'text-blue-600 font-bold' 
                : 'text-slate-500 hover:text-slate-800 font-medium'
            }`}
            aria-label="Library"
          >
            <BookOpen size={21} className={window.location.pathname === '/library' ? 'text-blue-600 fill-blue-50' : 'text-slate-500'} />
            <span className="text-[10px] mt-1 tracking-tight">Library</span>
          </button>

          <button
            onClick={() => {
              navigate('/study');
              setTimeout(() => {
                const searchInput = document.querySelector('input[placeholder*="Search textbooks"]');
                if (searchInput) {
                  searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  searchInput.focus();
                }
              }, 150);
            }}
            className="flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-colors text-slate-500 hover:text-blue-600 font-medium"
            aria-label="Search"
          >
            <Search size={21} />
            <span className="text-[10px] mt-1 tracking-tight">Search</span>
          </button>

          <button
            onClick={() => navigate('/profile')}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-colors ${
              window.location.pathname === '/profile' 
                ? 'text-blue-600 font-bold' 
                : 'text-slate-500 hover:text-slate-800 font-medium'
            }`}
            aria-label="Profile"
          >
            <User size={21} className={window.location.pathname === '/profile' ? 'text-blue-600 fill-blue-50' : 'text-slate-500'} />
            <span className="text-[10px] mt-1 tracking-tight">Profile</span>
          </button>
        </div>
      )}

      {!isReaderRoute && <NowPlayingBar />}
    </div>
  );
}
