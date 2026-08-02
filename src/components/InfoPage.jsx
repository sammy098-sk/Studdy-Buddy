import React from 'react';
import Footer from './Footer';
import BackToHomeButton from './BackToHomeButton';

/* ─────────────────────────────────────────────
   BACKGROUND VARIANTS
   Each variant is a completely unique decorative
   layer — different colours, shapes, compositions.
───────────────────────────────────────────────── */

function BgAbout() {
  // Warm amber / gold — personal, human, story-like
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
      {/* Wide warm radial bloom — top left */}
      <div
        className="absolute -top-16 -left-16 w-[28rem] h-[28rem] rounded-full"
        style={{ background: "radial-gradient(circle at 38% 38%, rgba(245,158,11,0.10), rgba(245,158,11,0.01) 68%)" }}
      />
      {/* Tilted wide pill — bottom right */}
      <div
        className="absolute bottom-10 right-[-4%] w-64 h-32 rounded-[4rem]"
        style={{
          background: "linear-gradient(135deg, rgba(245,158,11,0.08), rgba(251,191,36,0.02))",
          transform: "rotate(-14deg)",
          boxShadow: "0 40px 80px -30px rgba(245,158,11,0.18)",
        }}
      />
      {/* Small amber square — mid left */}
      <div
        className="absolute top-[38%] left-[5%] w-14 h-14 rounded-2xl"
        style={{
          background: "linear-gradient(135deg, rgba(251,191,36,0.10), rgba(245,158,11,0.02))",
          transform: "rotate(22deg)",
          boxShadow: "0 18px 36px -16px rgba(245,158,11,0.20)",
        }}
      />
      {/* Accent circle — upper centre */}
      <div
        className="absolute top-10 left-[42%] w-16 h-16 rounded-full"
        style={{ background: "radial-gradient(circle at 45% 45%, rgba(251,191,36,0.09), transparent 65%)" }}
      />
      {/* Large soft glow — right mid */}
      <div
        className="absolute top-[30%] -right-24 w-80 h-80 rounded-full"
        style={{ background: "radial-gradient(circle at 55% 45%, rgba(245,158,11,0.07), rgba(245,158,11,0.008) 68%)" }}
      />
      {/* Tiny rotated square — upper right */}
      <div
        className="absolute top-6 right-[22%] w-8 h-8 rounded-lg"
        style={{
          background: "linear-gradient(135deg, rgba(251,191,36,0.10), rgba(245,158,11,0.02))",
          transform: "rotate(38deg)",
        }}
      />
      {/* Soft horizontal band — lower middle */}
      <div
        className="absolute bottom-28 left-[20%] w-48 h-20 rounded-[3rem]"
        style={{
          background: "linear-gradient(90deg, rgba(245,158,11,0.06), transparent)",
          transform: "rotate(-5deg)",
        }}
      />
      {/* Tiny dot — bottom left */}
      <div
        className="absolute bottom-10 left-[12%] w-6 h-6 rounded-full"
        style={{ background: "radial-gradient(circle, rgba(251,191,36,0.12), transparent 70%)" }}
      />
    </div>
  );
}

function BgHowItWorks() {
  // Teal / emerald — structured, step-by-step, process feel
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
      {/* Diagonal bar — top left to centre */}
      <div
        className="absolute -top-8 -left-12 w-80 h-16 rounded-full"
        style={{
          background: "linear-gradient(90deg, rgba(16,185,129,0.10), transparent)",
          transform: "rotate(18deg)",
        }}
      />
      {/* Large teal radial — top right */}
      <div
        className="absolute -top-20 right-[-6%] w-[26rem] h-[26rem] rounded-full"
        style={{ background: "radial-gradient(circle at 62% 36%, rgba(16,185,129,0.08), rgba(16,185,129,0.008) 68%)" }}
      />
      {/* Step-like stacked rectangles — left */}
      <div
        className="absolute top-[20%] left-[3%] w-10 h-28 rounded-2xl"
        style={{
          background: "linear-gradient(180deg, rgba(16,185,129,0.09), rgba(16,185,129,0.02))",
          boxShadow: "0 20px 40px -18px rgba(16,185,129,0.18)",
        }}
      />
      <div
        className="absolute top-[28%] left-[8%] w-10 h-20 rounded-2xl"
        style={{
          background: "linear-gradient(180deg, rgba(16,185,129,0.06), rgba(16,185,129,0.01))",
          boxShadow: "0 16px 32px -14px rgba(16,185,129,0.14)",
        }}
      />
      {/* Teal diamond — upper centre */}
      <div
        className="absolute top-12 left-[48%] w-12 h-12 rounded-xl"
        style={{
          background: "linear-gradient(135deg, rgba(16,185,129,0.08), rgba(16,185,129,0.01))",
          transform: "rotate(45deg)",
          boxShadow: "0 20px 38px -20px rgba(16,185,129,0.16)",
        }}
      />
      {/* Mid-bottom wide band */}
      <div
        className="absolute bottom-16 left-[18%] w-60 h-16 rounded-[4rem]"
        style={{
          background: "linear-gradient(135deg, rgba(16,185,129,0.07), transparent)",
          transform: "rotate(-8deg)",
        }}
      />
      {/* Large glow — bottom right */}
      <div
        className="absolute -bottom-16 -right-16 w-72 h-72 rounded-full"
        style={{ background: "radial-gradient(circle at 50% 50%, rgba(16,185,129,0.07), rgba(16,185,129,0.006) 70%)" }}
      />
      {/* Tiny accent dot */}
      <div
        className="absolute top-[55%] right-[10%] w-7 h-7 rounded-full"
        style={{ background: "radial-gradient(circle, rgba(16,185,129,0.12), transparent 70%)" }}
      />
      {/* Small rotated pill — bottom centre */}
      <div
        className="absolute bottom-8 left-[44%] w-20 h-6 rounded-full"
        style={{
          background: "linear-gradient(90deg, rgba(16,185,129,0.08), transparent)",
          transform: "rotate(12deg)",
        }}
      />
    </div>
  );
}

function BgPrivacy() {
  // Purple / violet — secure, trustworthy, shield-like
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
      {/* Large violet radial — top right */}
      <div
        className="absolute -top-24 -right-20 w-[30rem] h-[30rem] rounded-full"
        style={{ background: "radial-gradient(circle at 60% 34%, rgba(139,92,246,0.09), rgba(139,92,246,0.008) 70%)" }}
      />
      {/* Shield-like tall rounded rect — left */}
      <div
        className="absolute top-[10%] left-[4%] w-14 h-36 rounded-[2rem]"
        style={{
          background: "linear-gradient(180deg, rgba(139,92,246,0.09), rgba(139,92,246,0.01))",
          boxShadow: "0 30px 60px -20px rgba(139,92,246,0.18)",
        }}
      />
      {/* Concentric arcs — bottom left (two overlapping circles) */}
      <div
        className="absolute bottom-[-4rem] left-[-3rem] w-52 h-52 rounded-full"
        style={{ border: "2px solid rgba(139,92,246,0.07)", background: "transparent" }}
      />
      <div
        className="absolute bottom-[-6rem] left-[-5rem] w-72 h-72 rounded-full"
        style={{ border: "1.5px solid rgba(139,92,246,0.04)", background: "transparent" }}
      />
      {/* Small tilted square — upper left */}
      <div
        className="absolute top-16 left-[28%] w-10 h-10 rounded-xl"
        style={{
          background: "linear-gradient(135deg, rgba(139,92,246,0.09), rgba(139,92,246,0.02))",
          transform: "rotate(28deg)",
          boxShadow: "0 16px 30px -14px rgba(139,92,246,0.18)",
        }}
      />
      {/* Mid radial glow — centre right */}
      <div
        className="absolute top-[40%] -right-10 w-60 h-60 rounded-full"
        style={{ background: "radial-gradient(circle at 55% 45%, rgba(139,92,246,0.07), rgba(139,92,246,0.005) 70%)" }}
      />
      {/* Tiny dot cluster — upper right */}
      <div
        className="absolute top-8 right-[35%] w-5 h-5 rounded-full"
        style={{ background: "radial-gradient(circle, rgba(167,139,250,0.14), transparent 70%)" }}
      />
      <div
        className="absolute top-14 right-[30%] w-3 h-3 rounded-full"
        style={{ background: "radial-gradient(circle, rgba(167,139,250,0.12), transparent 70%)" }}
      />
      {/* Wide horizontal band — bottom */}
      <div
        className="absolute bottom-20 left-[22%] w-56 h-12 rounded-full"
        style={{
          background: "linear-gradient(90deg, rgba(139,92,246,0.06), transparent)",
          transform: "rotate(-4deg)",
        }}
      />
    </div>
  );
}

function BgTerms() {
  // Deep indigo / slate — formal, structured, document-like
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
      {/* Grid of subtle dots — left panel feel */}
      {[0, 1, 2, 3].map((col) =>
        [0, 1, 2, 3, 4].map((row) => (
          <div
            key={`${col}-${row}`}
            className="absolute w-1 h-1 rounded-full"
            style={{
              background: "rgba(99,102,241,0.14)",
              left: `${8 + col * 6}%`,
              top: `${15 + row * 15}%`,
            }}
          />
        ))
      )}
      {/* Tall structured rectangle — far left edge */}
      <div
        className="absolute top-[8%] left-0 w-1.5 h-[40%] rounded-r-full"
        style={{ background: "linear-gradient(180deg, rgba(99,102,241,0.15), rgba(99,102,241,0.02))" }}
      />
      {/* Large indigo radial — bottom right */}
      <div
        className="absolute -bottom-24 -right-24 w-[28rem] h-[28rem] rounded-full"
        style={{ background: "radial-gradient(circle at 55% 55%, rgba(99,102,241,0.08), rgba(99,102,241,0.006) 68%)" }}
      />
      {/* Document-like stacked lines — upper right */}
      <div
        className="absolute top-14 right-[8%] w-24 h-3 rounded-full"
        style={{ background: "linear-gradient(90deg, rgba(99,102,241,0.10), transparent)" }}
      />
      <div
        className="absolute top-20 right-[12%] w-16 h-3 rounded-full"
        style={{ background: "linear-gradient(90deg, rgba(99,102,241,0.07), transparent)" }}
      />
      <div
        className="absolute top-26 right-[10%] w-20 h-3 rounded-full"
        style={{ background: "linear-gradient(90deg, rgba(99,102,241,0.05), transparent)" }}
      />
      {/* Tilted rectangle — upper left */}
      <div
        className="absolute top-[12%] left-[26%] w-16 h-10 rounded-xl"
        style={{
          background: "linear-gradient(135deg, rgba(99,102,241,0.08), rgba(99,102,241,0.01))",
          transform: "rotate(6deg)",
          boxShadow: "0 14px 28px -12px rgba(99,102,241,0.15)",
        }}
      />
      {/* Mid radial — top right area */}
      <div
        className="absolute top-0 right-[-4%] w-64 h-64 rounded-full"
        style={{ background: "radial-gradient(circle at 62% 30%, rgba(99,102,241,0.07), rgba(99,102,241,0.006) 68%)" }}
      />
      {/* Tiny accent square — bottom centre */}
      <div
        className="absolute bottom-14 left-[48%] w-8 h-8 rounded-lg"
        style={{
          background: "linear-gradient(135deg, rgba(99,102,241,0.09), rgba(99,102,241,0.02))",
          transform: "rotate(18deg)",
        }}
      />
    </div>
  );
}

const BG_MAP = {
  about: BgAbout,
  'how-it-works': BgHowItWorks,
  help: BgHowItWorks,
  privacy: BgPrivacy,
  terms: BgTerms,
};

const DEFAULT_CONTENTS = {
  about: {
    title: "About StudyBuddy",
    subtitle: "A textbook-first learning companion built around real examination syllabuses.",
    sections: [
      { heading: "Why we built this", body: "Textbooks are expensive, physical classes cost more than many families can spare, and most study apps aren't built around actual examination syllabuses. StudyBuddy exists to close that gap." },
      { heading: "What makes it different", body: ["Built specifically around real course syllabuses, not generic curricula.", "Explanations lead with core concepts and past practice questions, not abstract theory.", "A supportive peer tone, not a tedious lecture.", "Multiple ways to study: full textbook depth, quick topic summaries, or targeted practice questions."] },
      { heading: "Who it's for", body: "Any student preparing for exams who wants an adaptive study companion that meets them where they are." },
    ]
  },
  'how-it-works': {
    title: "How StudyBuddy Works",
    subtitle: "Three ways to study, all built around real course syllabuses.",
    sections: [
      { heading: "1. Pick a subject", body: "Choose any of the subjects covered — each broken down into the actual topics on your curriculum." },
      { heading: "2. Choose how you want to study", body: ["Full Textbook Mode — comprehensive, unabridged coverage of a topic, broken into digestible sections.", "Summary Mode — key-points-only breakdown of a topic, condensed for quick revision.", "Questionnaire Mode — interactive practice questions on a topic with instant diagnostic feedback."] },
      { heading: "3. Drill into chapters and sections", body: "Our multi-layer Table of Contents extraction makes navigating 1,000+ page textbooks instant and seamless." },
      { heading: "4. Track your daily achievements", body: "Your reading streak, books in progress, completed books, and real study time update directly on your Study Dashboard." },
    ]
  },
  help: {
    title: "StudyBuddy Help Center",
    subtitle: "Find answers to common questions and learn how to get the most out of StudyBuddy.",
    sections: [
      { heading: "Getting Started", body: "Browse your personal library or select a core subject directly from your Study Dashboard to open your first textbook." },
      { heading: "Tracking Your Progress", body: ["StudyBuddy automatically records your reading progress and page bookmarks as you read.", "Your reading streak increments for each consecutive calendar day you study or interact with practice questions.", "Real accumulated study session duration is tracked automatically whenever you have a textbook open."] },
      { heading: "Reading Toolbar & Preferences", body: "While reading any textbook, utilize the top control bar to modify zoom levels, toggle full width fit mode, or access chapter navigation." },
      { heading: "Need Additional Assistance?", body: "If you encounter technical issues or wish to suggest new study materials, select 'Contact' in the footer to message our support team directly." },
    ]
  },
  privacy: {
    title: "Privacy Policy",
    disclaimer: "This policy outlines how StudyBuddy secures, manages, and honors student learning activity and account profiles under standard data protection protocols.",
    sections: [
      { heading: "Information we collect", body: ["Account profile details you provide during authentication, such as name and email address.", "Study progress timestamps and reading durations to power your personal dashboard metrics.", "Basic application connectivity logs to maintain platform reliability."] },
      { heading: "How we use your data", body: ["To securely deliver and refine the interactive study reading experience.", "To calculate daily reading streaks and highlight continuing reading checkpoints.", "To investigate and resolve user-submitted technical support inquiries."] },
      { heading: "Data Security & Privacy", body: "We do not sell personal data or student learning history. All communication and storage are secured using encrypted cloud database infrastructure." },
      { heading: "Student & User Rights", body: ["Right to request access to your complete learning history and bookmarks.", "Right to update or correct personal profile details directly from the Profile page.", "Right to request complete account deletion and data removal at any time."] },
    ]
  },
  terms: {
    title: "Terms of Service",
    disclaimer: "By utilizing StudyBuddy educational tools, you acknowledge and agree to abide by these community terms of usage.",
    sections: [
      { heading: "Acceptance of Terms", body: "By registering an account or reading textbook resources on StudyBuddy, you accept and agree to these Terms of Service." },
      { heading: "Academic Purpose", body: ["StudyBuddy is an educational study aid created to strengthen conceptual comprehension and subject familiarity.", "Platform resources are designed to augment dedicated study habits and personal revision.", "You are solely responsible for maintaining the confidentiality of your authentication credentials."] },
      { heading: "Platform Independence & Disclaimers", body: "StudyBuddy operates independently as an educational study technology platform. AI-supported interactive guides are designed as supplemental tutoring assistants and should be used alongside verified textbook chapters." },
      { heading: "Limitation of Liability", body: "StudyBuddy is provided on an 'as is' educational basis. We make no guarantees regarding formal external examination results or individual score outcomes." },
    ]
  }
};

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────── */
export default function InfoPage({ title, subtitle, disclaimer, sections, onNavigate, bgVariant }) {
  const defaultData = DEFAULT_CONTENTS[bgVariant] || {};
  const pageTitle = title || defaultData.title || "Information";
  const pageSubtitle = subtitle || defaultData.subtitle;
  const pageDisclaimer = disclaimer || defaultData.disclaimer;
  const pageSections = sections || defaultData.sections || [];
  const BgComponent = BG_MAP[bgVariant] || BG_MAP.about || BgAbout;

  return (
    <div className="flex-1 overflow-y-auto flex flex-col" style={{ background: "#FAFBFF", position: 'relative' }}>
      {/* Unique decorative background per page */}
      <BgComponent />

      {/* Page content — sits above decorations */}
      <div className="relative flex-1 px-4 sm:px-8 py-10" style={{ zIndex: 1 }}>
        <div className="max-w-2xl mx-auto">
          <BackToHomeButton onNavigate={onNavigate} />
          <h2 className="text-2xl font-semibold mb-1" style={{ color: "#101C34", fontFamily: "'Montserrat', sans-serif" }}>
            {pageTitle}
          </h2>
          {pageSubtitle && <p className="text-sm mb-6" style={{ color: "#8493B0" }}>{pageSubtitle}</p>}

          {pageDisclaimer && (
            <div className="text-xs px-4 py-3 rounded-lg border mb-8" style={{ background: "#FFFBEB", borderColor: "#FDE68A", color: "#92400E" }}>
              {pageDisclaimer}
            </div>
          )}

          <div className="flex flex-col gap-7">
            {pageSections?.map((s, i) => (
              <div key={i}>
                {s.heading && (
                  <h3 className="text-[15px] font-semibold mb-2" style={{ color: "#101C34" }}>{s.heading}</h3>
                )}
                {Array.isArray(s.body) ? (
                  <ul className="flex flex-col gap-2">
                    {s.body.map((line, j) => (
                      <li key={j} className="text-sm flex items-start gap-2" style={{ color: "#5A6B8C" }}>
                        <span className="mt-1.5 w-1 h-1 rounded-full shrink-0" style={{ background: "#2954E5" }} />
                        {line}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm leading-relaxed" style={{ color: "#5A6B8C" }}>{s.body}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      <Footer onNavigate={onNavigate} />
    </div>
  );
}
