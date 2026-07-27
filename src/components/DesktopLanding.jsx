import React, { useState } from 'react';
import { 
  BookOpen, 
  ArrowRight, 
  CheckCircle2, 
  GraduationCap, 
  Sparkles, 
  Clock, 
  MessageCircle, 
  Users, 
  ChevronRight 
} from 'lucide-react';
import { SUBJECTS, CURRICULUM, SUBJECT_ICONS } from '../config';
import Footer from './Footer';
import InfoPage from './InfoPage';
import ContactPage from './ContactPage';

export default function DesktopLanding({ onFinish }) {
  const totalTopics = SUBJECTS.reduce((sum, s) => sum + CURRICULUM[s].length, 0);
  const previewSubjects = SUBJECTS.slice(0, 4);
  const [subPage, setSubPage] = useState(null); // null | 'how-it-works' | 'about' | 'contact' | 'privacy' | 'terms'
  const navigateSub = (key) => setSubPage(key === "study" ? null : key);

  return (
    <div className="min-h-screen overflow-y-auto w-full" style={{ background: "#FFFFFF", fontFamily: "'Inter', sans-serif" }}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@500&display=swap" rel="stylesheet" />

      <div className="flex items-center justify-between px-10 py-5">
        <button onClick={() => setSubPage(null)} className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#2954E5" }}>
            <BookOpen size={16} color="#FFFFFF" />
          </div>
          <span className="font-semibold text-lg" style={{ color: "#101C34", fontFamily: "'Montserrat', sans-serif" }}>
            StudyBuddy
          </span>
        </button>
        <button onClick={onFinish} className="px-5 py-2.5 rounded-lg text-sm font-medium text-white" style={{ background: "#2954E5" }}>
          Start Studying
        </button>
      </div>

      {subPage === "how-it-works" && (
        <InfoPage
          onNavigate={navigateSub}
          bgVariant="how-it-works"
          title="How StudyBuddy Works"
          subtitle="Three ways to study, all built around the real JAMB syllabus."
          sections={[
            { heading: "1. Pick a subject", body: "Choose any of the 9 JAMB Subjects covered — each broken down into the actual topics on the syllabus." },
            {
              heading: "2. Choose how you want to study",
              body: [
                "Full Textbook Mode — comprehensive, unabridged coverage of a topic, broken into subsections.",
                "Summary Mode — key-points-only breakdown of a topic, condensed for quick revision.",
                "Questionnaire Mode — practice questions on a topic, up to 50 at a time, with instant feedback.",
              ],
            },
            { heading: "3. Drill into topics and subsections", body: "Full Textbook Mode goes one level deeper, so you can study in focused, bite-sized sessions." },
            { heading: "4. Track what you've studied", body: "Completed topics and subsections show up right in your session progress as you go." },
          ]}
        />
      )}

      {subPage === "about" && (
        <InfoPage
          onNavigate={navigateSub}
          bgVariant="about"
          title="About StudyBuddy"
          sections={[
            { heading: "Why we built this", body: "Textbooks are expensive, physical classes cost more than many families can spare, and most study apps aren't built around JAMB's actual syllabus. StudyBuddy exists to close that gap." },
            {
              heading: "What makes it different",
              body: [
                "Built specifically around the JAMB syllabus, not generic curricula.",
                "Explanations lead with real past questions, not abstract theory.",
                "A peer tone, not a lecture.",
                "Three ways to study: full textbook depth, quick summaries, or practice questions.",
              ],
            },
            { heading: "Who it's for", body: "Any student preparing for JAMB who wants a study companion that meets them where they are." },
          ]}
        />
      )}

      {subPage === "contact" && <ContactPage onNavigate={navigateSub} />}

      {subPage === "privacy" && (
        <InfoPage
          onNavigate={navigateSub}
          bgVariant="privacy"
          title="Privacy Policy"
          disclaimer="This is placeholder policy text for a prototype. Before real launch, have this reviewed by a qualified lawyer familiar with the Nigeria Data Protection Regulation (NDPR) — especially given many users will be minors."
          sections={[
            { heading: "Information we collect", body: ["Account details you provide, like your name and email address.", "Study activity, to power your progress tracking.", "Basic device and usage data."] },
            { heading: "How we use it", body: ["To provide and improve the tutoring experience.", "To personalize study suggestions.", "To respond to support requests."] },
            { heading: "Data sharing", body: "We do not sell personal information. Data may be shared with service providers who help operate StudyBuddy, under confidentiality obligations." },
            { heading: "If you're a minor", body: "Many users are secondary school students. We aim to collect only what's needed, and encourage parents or guardians to stay aware of app usage." },
            { heading: "Your rights", body: ["Request access to your data.", "Request correction of inaccurate data.", "Request deletion of your account and data."] },
          ]}
        />
      )}

      {subPage === "terms" && (
        <InfoPage
          onNavigate={navigateSub}
          bgVariant="terms"
          title="Terms & Conditions"
          disclaimer="This is placeholder terms text for a prototype. Before real launch, have this reviewed by a qualified lawyer."
          sections={[
            { heading: "Acceptance of terms", body: "By using StudyBuddy, you agree to these terms." },
            { heading: "Using StudyBuddy", body: ["A study aid — meant to build understanding, not replace the exam process.", "Will not help with live exams or claim to provide leaked papers.", "You're responsible for keeping your account secure."] },
            { heading: "Disclaimer", body: "StudyBuddy is independent and not affiliated with JAMB. AI-generated explanations may occasionally contain errors." },
            { heading: "Limitation of liability", body: "StudyBuddy is provided \"as is\" without warranties. We aren't liable for exam outcomes." },
          ]}
        />
      )}

      {!subPage && (
        <>
          <div className="relative overflow-hidden">
            {/* Subtle asymmetric 3D decorations — spread across the full banner, intentionally low-opacity */}
            <div
              className="absolute -top-14 -left-20 w-80 h-80 rounded-full pointer-events-none"
              style={{ background: "radial-gradient(circle at 32% 32%, rgba(41,84,229,0.09), rgba(41,84,229,0.015) 70%)" }}
            />
            <div
              className="absolute top-16 right-[6%] w-36 h-36 rounded-[1.75rem] pointer-events-none"
              style={{
                background: "linear-gradient(135deg, rgba(41,84,229,0.07), rgba(41,84,229,0.02))",
                transform: "rotate(21deg)",
                boxShadow: "0 40px 70px -30px rgba(41,84,229,0.18)",
              }}
            />
            <div
              className="absolute bottom-4 left-[38%] w-20 h-20 rounded-full pointer-events-none"
              style={{ background: "radial-gradient(circle at 40% 40%, rgba(41,84,229,0.06), transparent 70%)" }}
            />
            <div
              className="absolute top-1/3 left-[8%] w-10 h-10 rounded-xl pointer-events-none"
              style={{
                background: "linear-gradient(135deg, rgba(41,84,229,0.06), rgba(41,84,229,0.015))",
                transform: "rotate(-12deg)",
                boxShadow: "0 20px 35px -18px rgba(41,84,229,0.15)",
              }}
            />
            <div
              className="absolute top-6 left-[46%] w-14 h-14 rounded-2xl pointer-events-none"
              style={{
                background: "linear-gradient(135deg, rgba(41,84,229,0.055), rgba(41,84,229,0.01))",
                transform: "rotate(9deg)",
                boxShadow: "0 25px 45px -22px rgba(41,84,229,0.14)",
              }}
            />
            <div
              className="absolute -right-16 top-1/2 w-64 h-64 rounded-full pointer-events-none"
              style={{ background: "radial-gradient(circle at 60% 40%, rgba(41,84,229,0.07), rgba(41,84,229,0.01) 70%)" }}
            />
            <div
              className="absolute bottom-10 right-[16%] w-24 h-24 rounded-[1.5rem] pointer-events-none"
              style={{
                background: "linear-gradient(135deg, rgba(41,84,229,0.06), rgba(41,84,229,0.015))",
                transform: "rotate(-18deg)",
                boxShadow: "0 30px 55px -25px rgba(41,84,229,0.16)",
              }}
            />
            <div
              className="absolute bottom-0 right-[38%] w-8 h-8 rounded-lg pointer-events-none"
              style={{
                background: "linear-gradient(135deg, rgba(41,84,229,0.06), rgba(41,84,229,0.015))",
                transform: "rotate(14deg)",
              }}
            />
            <div
              className="absolute top-2 right-[32%] w-6 h-6 rounded-full pointer-events-none"
              style={{ background: "radial-gradient(circle at 40% 40%, rgba(41,84,229,0.08), transparent 70%)" }}
            />

            <div className="relative z-10 grid md:grid-cols-2 gap-10 items-center px-10 lg:px-20 py-16 max-w-7xl mx-auto">
              <div>
                <div className="flex items-center gap-1.5 mb-4">
                  <span className="w-6 h-px" style={{ background: "#2954E5" }} />
                  <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#2954E5", fontFamily: "'IBM Plex Mono', monospace" }}>
                    JAMB Exam Prep
                  </span>
                </div>
                <h1 className="text-5xl font-semibold leading-tight animate-fade-in" style={{ color: "#101C34", fontFamily: "'Montserrat', sans-serif" }}>
                  Study Smarter,
                </h1>
                <h1 className="text-5xl font-semibold leading-tight mb-5" style={{ color: "#2954E5", fontFamily: "'Montserrat', sans-serif" }}>
                  Pass With Confidence
                </h1>
                <p className="text-base mb-7 max-w-md" style={{ color: "#5A6B8C" }}>
                  StudyBuddy breaks every JAMB subject into bite-sized lessons, explains past questions like a
                  patient friend, and checks your understanding along the way.
                </p>

                <div className="flex items-center gap-4 mb-8">
                  <button onClick={onFinish} className="flex items-center gap-2 px-6 py-3.5 rounded-xl font-medium text-white transition-transform hover:scale-[1.02] active:scale-[0.98]" style={{ background: "#2954E5" }}>
                    Start Studying <ArrowRight size={17} />
                  </button>
                  <button onClick={onFinish} className="px-6 py-3.5 rounded-xl font-medium border transition-transform hover:scale-[1.02] active:scale-[0.98]" style={{ borderColor: "#D8E3F8", color: "#101C34" }}>
                    Explore Subjects
                  </button>
                </div>

                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-1.5 text-sm" style={{ color: "#5A6B8C" }}>
                    <CheckCircle2 size={15} style={{ color: "#2954E5" }} /> Free to start
                  </div>
                  <div className="flex items-center gap-1.5 text-sm" style={{ color: "#5A6B8C" }}>
                    <CheckCircle2 size={15} style={{ color: "#2954E5" }} /> JAMB-mapped
                  </div>
                </div>
              </div>

              <div className="relative flex items-center justify-center py-6">
                <div className="absolute w-72 h-72 rounded-full border-2 animate-pulse" style={{ borderColor: "#DCE7FE" }} />
                <div className="relative w-64 h-80 rounded-[2rem] flex items-center justify-center transition-transform hover:scale-[1.03]" style={{ background: "#E8F1FE" }}>
                  <GraduationCap size={90} style={{ color: "#2954E5" }} />
                </div>

                <div className="absolute left-0 bottom-6 rounded-2xl px-4 py-3 shadow-sm border flex items-center gap-2" style={{ background: "#FFFFFF", borderColor: "#D8E3F8" }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#2954E5" }}>
                    <BookOpen size={15} color="#FFFFFF" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold" style={{ color: "#101C34" }}>{SUBJECTS.length}</div>
                    <div className="text-[11px]" style={{ color: "#8493B0" }}>JAMB Subjects</div>
                  </div>
                </div>

                <div className="absolute right-0 top-2 rounded-2xl px-4 py-3 shadow-sm border flex items-center gap-2" style={{ background: "#FFFFFF", borderColor: "#D8E3F8" }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#E8F1FE" }}>
                    <Sparkles size={15} style={{ color: "#2954E5" }} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold" style={{ color: "#101C34" }}>{totalTopics}+</div>
                    <div className="text-[11px]" style={{ color: "#8493B0" }}>Topics Covered</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="py-8 px-10 border-y" style={{ borderColor: "#F1F5F9" }}>
            <div className="max-w-6xl mx-auto flex flex-wrap justify-center gap-x-12 gap-y-4">
              {[
                { icon: BookOpen, label: `${SUBJECTS.length} JAMB Subjects` },
                { icon: Clock, label: "Always Available" },
                { icon: Sparkles, label: "Free To Start" },
                { icon: MessageCircle, label: "24/7 Study Buddy" },
                { icon: Users, label: "Peer-Tone Tutor" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "#E8F1FE" }}>
                    <Icon size={16} style={{ color: "#2954E5" }} />
                  </div>
                  <span className="text-sm font-medium" style={{ color: "#101C34" }}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center px-10 lg:px-20 py-20 max-w-7xl mx-auto">
            <div className="relative">
              <div className="rounded-3xl h-72 flex items-center justify-center" style={{ background: "#E8F1FE" }}>
                <BookOpen size={64} style={{ color: "#2954E5" }} />
              </div>
              <div className="absolute -bottom-6 -right-6 rounded-2xl h-40 w-52 flex items-center justify-center border" style={{ background: "#FFFFFF", borderColor: "#D8E3F8" }}>
                <MessageCircle size={44} style={{ color: "#2954E5" }} />
              </div>
              <div className="absolute -top-5 -left-5 w-16 h-16 rounded-full flex items-center justify-center text-center" style={{ background: "#2954E5" }}>
                <span className="text-[9px] font-semibold text-white leading-tight">24/7<br />Access</span>
              </div>
            </div>

            <div>
              <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#2954E5", fontFamily: "'IBM Plex Mono', monospace" }}>
                Get To Know StudyBuddy
              </span>
              <h2 className="text-3xl font-semibold mt-3 mb-4 leading-snug" style={{ color: "#101C34", fontFamily: "'Montserrat', sans-serif" }}>
                Break every topic down<br />and master it, one step at a time
              </h2>
              <p className="text-sm mb-6 max-w-md" style={{ color: "#5A6B8C" }}>
                Every subject is mapped to the real JAMB syllabus, split into topics, and broken further into
                bite-sized lessons — so nothing ever feels overwhelming.
              </p>

              <div className="flex flex-col gap-3 mb-7">
                {[
                  "Lessons explained like to a first-time learner",
                  "Real JAMB past questions worked through, step by step",
                  "Check-yourself questions after every lesson",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2.5">
                    <CheckCircle2 size={17} style={{ color: "#2954E5" }} className="mt-0.5 shrink-0" />
                    <span className="text-sm" style={{ color: "#2B3A55" }}>{item}</span>
                  </div>
                ))}
              </div>

              <button onClick={onFinish} className="flex items-center gap-2 px-6 py-3 rounded-xl font-medium text-white w-fit transition-transform hover:scale-[1.02] active:scale-[0.98]" style={{ background: "#2954E5" }}>
                See How It Works <ArrowRight size={16} />
              </button>
            </div>
          </div>

          <div className="py-20 px-10 lg:px-20" style={{ background: "#FAFBFF" }}>
            <div className="max-w-6xl mx-auto">
              <div className="text-center mb-10">
                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "#2954E5", fontFamily: "'IBM Plex Mono', monospace" }}>
                  Popular Subjects
                </span>
                <h2 className="text-3xl font-semibold mt-2" style={{ color: "#101C34", fontFamily: "'Montserrat', sans-serif" }}>
                  Explore JAMB Subjects
                </h2>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                {previewSubjects.map((s) => {
                  const Icon = SUBJECT_ICONS[s] || BookOpen;
                  return (
                    <button
                      key={s}
                      onClick={onFinish}
                      className="text-left rounded-2xl border p-5 transition-shadow hover:shadow-md hover:border-blue-400"
                      style={{ background: "#FFFFFF", borderColor: "#D8E3F8" }}
                    >
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4" style={{ background: "#E8F1FE" }}>
                        <Icon size={20} style={{ color: "#2954E5" }} />
                      </div>
                      <div className="text-[15px] font-medium mb-1" style={{ color: "#101C34" }}>{s}</div>
                      <div className="text-xs mb-4" style={{ color: "#8493B0" }}>{CURRICULUM[s].length} topics</div>
                      <div className="flex items-center gap-1 text-sm font-medium" style={{ color: "#2954E5" }}>
                        Start studying <ChevronRight size={14} />
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="text-center mt-10">
                <button onClick={onFinish} className="px-6 py-3 rounded-xl font-medium text-white transition-transform hover:scale-[1.02]" style={{ background: "#2954E5" }}>
                  View All Subjects
                </button>
              </div>
            </div>
          </div>

          <Footer onNavigate={navigateSub} />
        </>
      )}
    </div>
  );
}
