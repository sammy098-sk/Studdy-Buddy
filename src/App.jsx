import React, { useState, useEffect } from 'react';
import { Home, Bell, User, Menu, BookOpen, History } from 'lucide-react';
import { supabase } from './supabase';
import DesktopLanding from './components/DesktopLanding';
import OnboardingFlow from './components/OnboardingFlow';
import AuthFlow from './components/AuthFlow';
import ChatView from './components/ChatView';
import ProfilePage from './components/ProfilePage';
import NotificationsPage from './components/NotificationsPage';
import SessionsPage from './components/SessionsPage';
import TextbookImporter from './components/TextbookImporter';
import TextbookReader from './components/TextbookReader';
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

export default function App() {
  const isDesktop = useIsDesktop();
  const [stage, setStage] = useState("onboarding"); // onboarding | auth | app
  const [resetKey, setResetKey] = useState(0);
  const [completed, setCompleted] = useState([]);
  const [user, setUser] = useState({ name: "", email: "" });
  const [page, setPage] = useState("study");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [resumeSession, setResumeSession] = useState(null);
  const [currentBookId, setCurrentBookId] = useState(null);

  useEffect(() => {
    const fetchProfile = async (session) => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      const userMeta = session.user.user_metadata || {};
      
      setUser({ 
        id: session.user.id,
        name: data?.full_name || userMeta.full_name || session.user.email.split("@")[0], 
        email: session.user.email,
        favorite_subjects: data?.favorite_subjects || [],
        daily_goal: data?.daily_goal || "30"
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
      if (session) fetchProfile(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        fetchProfile(session);
      } else if (event === 'SIGNED_OUT') {
        setUser({ name: "", email: "" });
        setStage("auth");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

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
          // Handled by onAuthStateChange above, but kept here as backup
          setUser(u);
          setStage("app");
        }}
      />
    );
  }

  const goHome = () => {
    setPage("study");
    setResetKey((k) => k + 1);
    setResumeSession(null);
  };

  const handleResume = (session) => {
    setResumeSession(session);
    setResetKey((k) => k + 1);
    setPage("study");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const navigateTo = (key, payload = null) => {
    setPage(key);
    setMobileMenuOpen(false);
    if (key === 'reader' && payload?.bookId) {
      setCurrentBookId(payload.bookId);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning,";
    if (hour < 17) return "Good afternoon,";
    return "Good evening,";
  };

  return (
    <div className="h-screen flex flex-col w-full" style={{ fontFamily: "'Inter', sans-serif" }}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@500&display=swap" rel="stylesheet" />

      <nav className="flex items-center justify-between px-5 sm:px-8 py-4 border-b shrink-0" style={{ background: "#FFFFFF", borderColor: "#E2E8F0" }}>
        {/* Desktop: show logo brand */}
        <button onClick={goHome} className="hidden md:flex items-center gap-2">
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
          {/* Desktop-only: Home + profile + notifications icons */}
          <button
            onClick={goHome}
            className="hidden md:flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors"
            style={page === "study" ? { background: "#E8F1FE", color: "#2954E5" } : { color: "#5A6B8C" }}
          >
            <Home size={15} /> Home
          </button>

          <button
            onClick={() => setPage("reader")}
            className="hidden md:flex items-center justify-center w-9 h-9 rounded-lg transition-colors"
            style={page === "reader" ? { background: "#E8F1FE", color: "#2954E5" } : { color: "#5A6B8C" }}
            aria-label="Library"
          >
            <BookOpen size={17} />
          </button>
          <button
            onClick={() => setPage("sessions")}
            className="hidden md:flex items-center justify-center w-9 h-9 rounded-lg transition-colors"
            style={page === "sessions" ? { background: "#E8F1FE", color: "#2954E5" } : { color: "#5A6B8C" }}
            aria-label="Study History"
          >
            <History size={17} />
          </button>
          <button
            onClick={() => setPage("notifications")}
            className="hidden md:flex items-center justify-center w-9 h-9 rounded-lg transition-colors"
            style={page === "notifications" ? { background: "#E8F1FE", color: "#2954E5" } : { color: "#5A6B8C" }}
            aria-label="Notifications"
          >
            <Bell size={17} />
          </button>
          <button
            onClick={() => setPage("profile")}
            className="hidden md:flex items-center justify-center w-9 h-9 rounded-lg transition-colors"
            style={page === "profile" ? { background: "#E8F1FE", color: "#2954E5" } : { color: "#5A6B8C" }}
            aria-label="Profile"
          >
            <User size={17} />
          </button>

          {/* Mobile-only: hamburger opens side drawer */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg transition-colors"
            style={{ color: "#5A6B8C" }}
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
        </div>
      </nav>

      {mobileMenuOpen && <MobileMenuDrawer onClose={() => setMobileMenuOpen(false)} onNavigate={navigateTo} currentPage={page} user={user} />}

      {page === "study" && <ChatView key={resetKey} completed={completed} setCompleted={setCompleted} onNavigate={navigateTo} user={user} resumeSession={resumeSession} />}
      {page === "profile" && (
        <ProfilePage
          user={user}
          onLogout={handleLogout}
          onNavigate={navigateTo}
          onUpdateUser={(updates) => setUser((prev) => ({ ...prev, ...updates }))}
        />
      )}
      {page === "notifications" && <NotificationsPage onNavigate={navigateTo} />}
      {page === "sessions" && (
        <SessionsPage userId={user.id} onNavigate={navigateTo} onResume={handleResume} />
      )}
      {page === "importer" && <TextbookImporter onNavigate={navigateTo} user={user} />}
      {page === "reader" && <TextbookReader onNavigate={navigateTo} user={user} bookId={currentBookId} />}

      {page === "how-it-works" && (
        <InfoPage
          onNavigate={navigateTo}
          title="How StudyBuddy Works"
          subtitle="Three ways to study, all built around the real JAMB syllabus."
          sections={[
            {
              heading: "1. Pick a subject",
              body: "Start from the subjects grid and choose any of the 9 JAMB Subjects covered — each one is broken down into the actual topics on the syllabus.",
            },
            {
              heading: "2. Choose how you want to study",
              body: [
                "Full Textbook Mode — comprehensive, unabridged coverage of a topic, broken into subsections, written in plain English with worked examples.",
                "Summary Mode — key-points-only breakdown of a topic, organized by subtopic, built for quick revision.",
                "Questionnaire Mode — practice questions on a topic, up to 50 at a time, with instant peer-tone feedback on each answer.",
              ],
            },
            {
              heading: "3. Drill into topics and subsections",
              body: "Full Textbook Mode goes one level deeper — each topic breaks into subsections so you can study in focused, bite-sized sessions instead of one long chapter.",
            },
            {
              heading: "4. Track what you've studied",
              body: "Topics and subsections you complete are marked in your session, and your progress shows up right in the sidebar as you go.",
            },
          ]}
        />
      )}

      {page === "about" && (
        <InfoPage
          onNavigate={navigateTo}
          title="About StudyBuddy"
          sections={[
            {
              heading: "Why we built this",
              body: "Textbooks are expensive, physical classes cost more than many families can spare, and most study apps aren't built around JAMB's actual syllabus. StudyBuddy exists to close that gap — a study partner that's always available, always patient, and always anchored to what JAMB actually tests.",
            },
            {
              heading: "What makes it different",
              body: [
                "Built specifically around the JAMB syllabus, not generic curricula.",
                "Explanations lead with real past questions, not abstract theory.",
                "A peer tone, not a lecture — built to feel like texting a smart friend.",
                "Three ways to study: full textbook depth, quick summaries, or practice questions.",
              ],
            },
            {
              heading: "Who it's for",
              body: "Any student preparing for JAMB who wants a study companion that meets them where they are — whether that's a full read-through of a topic or a fast summary the night before an exam.",
            },
          ]}
        />
      )}

      {page === "contact" && <ContactPage onNavigate={navigateTo} />}

      {page === "privacy" && (
        <InfoPage
          onNavigate={navigateTo}
          title="Privacy Policy"
          disclaimer="This is placeholder policy text for a prototype. Before real launch, have this reviewed and finalized by a qualified lawyer familiar with the Nigeria Data Protection Regulation (NDPR) and any other applicable law — especially given many users will be minors."
          sections={[
            {
              heading: "Information we collect",
              body: [
                "Account details you provide, like your name and email address.",
                "Study activity — the subjects and topics you engage with — to power your progress tracking.",
                "Basic device and usage data needed to keep the app working reliably.",
              ],
            },
            {
              heading: "How we use it",
              body: [
                "To provide and improve the tutoring experience.",
                "To personalize study suggestions and track your progress.",
                "To respond to support requests and important updates.",
              ],
            },
            {
              heading: "Data sharing",
              body: "We do not sell personal information. Data may be shared with service providers who help operate StudyBuddy (such as hosting or AI processing), under confidentiality obligations.",
            },
            {
              heading: "If you're a minor",
              body: "Many StudyBuddy users are secondary school students preparing for JAMB. We aim to collect only what's needed to provide the service, and we encourage parents or guardians to stay aware of how the app is used.",
            },
            {
              heading: "Your rights",
              body: [
                "You can request access to the personal data we hold about you.",
                "You can request correction of inaccurate data.",
                "You can request deletion of your account and associated data.",
              ],
            },
            {
              heading: "Changes to this policy",
              body: "We may update this policy as the product evolves. Continued use of StudyBuddy after changes means you accept the updated policy.",
            },
            {
              heading: "Contact",
              body: "Questions about this policy can be directed to the contact page.",
            },
          ]}
        />
      )}

      {page === "terms" && (
        <InfoPage
          onNavigate={navigateTo}
          title="Terms & Conditions"
          disclaimer="This is placeholder terms text for a prototype. Before real launch, have this reviewed and finalized by a qualified lawyer before publishing it as a binding agreement."
          sections={[
            {
              heading: "Acceptance of terms",
              body: "By using StudyBuddy, you agree to these terms. If you don't agree, please don't use the app.",
            },
            {
              heading: "Using StudyBuddy",
              body: [
                "StudyBuddy is a study aid — it's meant to build understanding, not to replace the exam process.",
                "StudyBuddy will not help with live/ongoing exam sittings or claim to provide leaked exam papers.",
                "You're responsible for keeping your account credentials secure.",
              ],
            },
            {
              heading: "Accounts",
              body: "You must provide accurate information when creating an account. You're responsible for all activity under your account.",
            },
            {
              heading: "Subscriptions & payment",
              body: "Any paid plans, pricing, and billing terms will be listed clearly at checkout when introduced. This prototype does not currently process real payments.",
            },
            {
              heading: "Intellectual property",
              body: "StudyBuddy's content, design, and branding belong to StudyBuddy. Lesson content is generated to match JAMB's syllabus depth but is original — not copied from any specific textbook.",
            },
            {
              heading: "Disclaimer",
              body: "StudyBuddy is an independent study tool and is not affiliated with JAMB). AI-generated explanations may occasionally contain errors — always cross-check against official JAMB syllabus materials.",
            },
            {
              heading: "Limitation of liability",
              body: "StudyBuddy is provided \"as is\" without warranties of any kind. We aren't liable for exam outcomes or decisions made based on app content.",
            },
            {
              heading: "Changes to these terms",
              body: "We may update these terms as the product evolves. Continued use after changes means you accept the updated terms.",
            },
          ]}
        />
      )}
      <NowPlayingBar />
    </div>
  );
}
