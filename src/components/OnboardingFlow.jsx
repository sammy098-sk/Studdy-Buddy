import React, { useState, useEffect } from 'react';
import { GraduationCap, MessageCircle, BookOpen, ChevronRight, ArrowRight } from 'lucide-react';

const ONBOARDING_SLIDES = [
  { type: "splash" },
  {
    type: "content",
    icon: GraduationCap,
    titleLead: "Pick the right subject ",
    titleHighlight: "for growth",
    description: "Every subject broken into topics and bite-sized lessons, mapped straight to the JAMB syllabus.",
  },
  {
    type: "content",
    icon: MessageCircle,
    titleLead: "Study anywhere, ",
    titleHighlight: "whenever you want",
    description: "No fixed class times. Chat with your study buddy on your own schedule, at your own pace.",
    isLast: true,
  },
];
const CONTENT_SLIDE_MS = 6000;

export default function OnboardingFlow({ onFinish }) {
  const [index, setIndex] = useState(0);
  const slide = ONBOARDING_SLIDES[index];
  const isLast = !!slide.isLast;

  useEffect(() => {
    if (slide.type === "splash") return; // splash now waits for a manual tap
    const timer = setTimeout(() => {
      if (isLast) {
        setIndex(1); // loop back to slide 2 instead of auto-finishing
      } else {
        setIndex((i) => Math.min(i + 1, ONBOARDING_SLIDES.length - 1));
      }
    }, CONTENT_SLIDE_MS);
    return () => clearTimeout(timer);
  }, [index, isLast, slide.type]);

  if (slide.type === "splash") {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center px-6" style={{ background: "#2954E5" }}>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: "#FFFFFF" }}>
          <BookOpen size={30} style={{ color: "#2954E5" }} />
        </div>
        <h1 className="text-2xl font-semibold text-white" style={{ fontFamily: "'Montserrat', sans-serif" }}>
          Study<span style={{ color: "#B7CBF5" }}>Buddy</span>
        </h1>
        <p className="text-sm mt-2 mb-10" style={{ color: "#C9D8FB" }}>Your JAMB exam companion</p>

        <button
          onClick={() => setIndex(1)}
          className="flex items-center gap-2 px-6 py-3 rounded-full font-medium"
          style={{ background: "#FFFFFF", color: "#2954E5" }}
        >
          Next <ChevronRight size={17} />
        </button>
      </div>
    );
  }

  const Icon = slide.icon;

  return (
    <div className="h-screen w-full flex flex-col" style={{ background: "#FFFFFF" }}>
      <style>{`@keyframes onboardFill { from { width: 0%; } to { width: 100%; } }`}</style>

      <div className="flex justify-end px-6 pt-6">
        <button onClick={onFinish} className="text-sm font-medium" style={{ color: "#8493B0" }}>
          Skip
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <div className="w-40 h-40 rounded-3xl flex items-center justify-center mb-8" style={{ background: "#E8F1FE" }}>
          <Icon size={56} style={{ color: "#2954E5" }} />
        </div>

        <h2 className="text-2xl font-semibold mb-3 max-w-xs" style={{ color: "#101C34", fontFamily: "'Montserrat', sans-serif" }}>
          {slide.titleLead}
          <span style={{ color: "#2954E5" }}>{slide.titleHighlight}</span>
        </h2>
        <p className="text-sm max-w-xs" style={{ color: "#5A6B8C" }}>{slide.description}</p>
      </div>

      <div className="flex flex-col items-center gap-6 pb-10 px-6">
        <div className="flex items-center gap-2">
          {ONBOARDING_SLIDES.slice(1).map((_, i) => {
            const slideIdx = i + 1;
            const isActive = slideIdx === index;
            const isPast = slideIdx < index;
            return (
              <div key={slideIdx} className="h-1.5 rounded-full overflow-hidden" style={{ width: isActive ? 28 : 8, background: "#E3EAFB" }}>
                {isActive && (
                  <div className="h-full rounded-full" style={{ background: "#2954E5", animation: `onboardFill ${CONTENT_SLIDE_MS}ms linear forwards` }} />
                )}
                {isPast && <div className="h-full rounded-full" style={{ background: "#2954E5", width: "100%" }} />}
              </div>
            );
          })}
        </div>

        {isLast ? (
          <button
            onClick={onFinish}
            className="w-full max-w-xs flex items-center justify-center gap-2 px-6 py-3.5 rounded-full font-medium text-white"
            style={{ background: "#2954E5" }}
          >
            Start Studying <ArrowRight size={17} />
          </button>
        ) : (
          <button
            onClick={() => setIndex((i) => i + 1)}
            className="w-12 h-12 rounded-full flex items-center justify-center text-white"
            style={{ background: "#2954E5" }}
            aria-label="Next"
          >
            <ChevronRight size={20} />
          </button>
        )}
      </div>
    </div>
  );
}
