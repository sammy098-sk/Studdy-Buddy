import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, Sparkles, TrendingUp, Award, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';

export const DEFAULT_PROMO_SLIDES = [
  {
    id: 'welcome',
    title: 'Welcome to Studdy Buddy',
    description: 'Read textbooks anywhere, anytime.',
    ctaText: 'Start Reading',
    ctaTarget: 'library',
    gradient: 'from-blue-600 via-indigo-600 to-blue-700',
    badgeText: 'Academic Platform',
    icon: BookOpen,
    accentColor: 'text-blue-200',
    bgGlow: 'bg-blue-400/20'
  },
  {
    id: 'ai-assistant',
    title: 'AI Study Assistant',
    description: 'Generate summaries, explanations and practice questions from your textbooks.',
    ctaText: 'Explore AI',
    ctaTarget: 'study',
    gradient: 'from-indigo-700 via-purple-700 to-indigo-900',
    badgeText: 'Smart Revision',
    icon: Sparkles,
    accentColor: 'text-purple-200',
    bgGlow: 'bg-purple-400/20'
  },
  {
    id: 'track-progress',
    title: 'Track Your Learning',
    description: 'Monitor your study progress and stay organized.',
    ctaText: 'View Progress',
    ctaTarget: 'profile',
    gradient: 'from-blue-700 via-emerald-700 to-slate-900',
    badgeText: 'Realtime Analytics',
    icon: TrendingUp,
    accentColor: 'text-emerald-200',
    bgGlow: 'bg-emerald-400/20'
  },
  {
    id: 'jamb-prep',
    title: 'JAMB Preparation',
    description: 'Practice with AI-generated questions and prepare smarter.',
    ctaText: 'Start Practicing',
    ctaTarget: 'study',
    gradient: 'from-sky-600 via-blue-700 to-indigo-800',
    badgeText: 'Exam Success',
    icon: Award,
    accentColor: 'text-sky-200',
    bgGlow: 'bg-sky-400/20'
  }
];

export default function HeroCarousel({ slides = DEFAULT_PROMO_SLIDES, onNavigate }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef(null);
  const touchEndX = useRef(null);

  useEffect(() => {
    if (isPaused || slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, 5500);
    return () => clearInterval(timer);
  }, [isPaused, slides.length]);

  const handlePrev = (e) => {
    if (e) e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const handleNext = (e) => {
    if (e) e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  };

  const handleTouchStart = (e) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 40;
    if (distance > minSwipeDistance) {
      handleNext();
    } else if (distance < -minSwipeDistance) {
      handlePrev();
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  if (!slides || slides.length === 0) return null;

  return (
    <div 
      className="relative w-full rounded-3xl overflow-hidden shadow-lg border border-slate-200/80 bg-slate-900 group select-none transition-all"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div 
        className="flex transition-transform duration-700 ease-in-out h-52 sm:h-56 lg:h-64 xl:h-72"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {slides.map((slide) => {
          const IconComp = slide.icon || BookOpen;
          return (
            <div 
              key={slide.id} 
              className={`w-full h-full flex-shrink-0 bg-gradient-to-r ${slide.gradient} relative flex items-center justify-between p-6 sm:p-8 lg:p-10 xl:p-12 overflow-hidden`}
            >
              {/* Background Glows & Architectural Grid */}
              <div className={`absolute -right-16 -bottom-16 w-80 h-80 lg:w-96 lg:h-96 rounded-full blur-3xl pointer-events-none ${slide.bgGlow || 'bg-blue-400/20'}`} />
              <div className="absolute top-0 right-10 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none" />
              
              {/* Left text content */}
              <div className="relative z-10 max-w-xl lg:max-w-3xl xl:max-w-4xl flex flex-col justify-center space-y-2 sm:space-y-3 lg:space-y-4">
                {slide.badgeText && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 backdrop-blur-md text-white border border-white/20 rounded-full text-[10px] sm:text-xs lg:text-sm font-extrabold tracking-wider uppercase font-mono w-fit shadow-xs">
                    <Sparkles size={13} className={slide.accentColor || 'text-blue-200'} />
                    <span>{slide.badgeText}</span>
                  </div>
                )}
                
                <h2 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-extrabold text-white tracking-tight drop-shadow-sm leading-tight" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  {slide.title}
                </h2>
                
                <p className="text-white/90 font-medium text-xs sm:text-sm lg:text-base xl:text-lg line-clamp-2 max-w-lg lg:max-w-2xl leading-relaxed">
                  {slide.description}
                </p>
                
                <div className="pt-1 sm:pt-2">
                  <button
                    onClick={() => onNavigate && onNavigate(slide.ctaTarget)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 lg:px-6 lg:py-3.5 bg-white text-slate-900 hover:bg-blue-50 text-xs sm:text-sm lg:text-base font-extrabold rounded-xl sm:rounded-2xl transition-all duration-200 shadow-lg shadow-black/15 hover:-translate-y-0.5 active:translate-y-0 group/btn"
                  >
                    <span>{slide.ctaText}</span>
                    <ArrowRight size={16} className="text-blue-600 group-hover/btn:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>

              {/* Right Decorative Illustration Icon for Desktop & Tablet */}
              <div className="relative z-10 hidden sm:flex items-center justify-center shrink-0 w-32 h-32 lg:w-44 lg:h-44 xl:w-52 xl:h-52 rounded-3xl bg-white/5 border border-white/15 backdrop-blur-sm shadow-2xl mr-4 lg:mr-8 rotate-3 group-hover:rotate-0 transition-transform duration-500">
                <IconComp className="w-16 h-16 lg:w-24 lg:h-24 xl:w-28 xl:h-28 text-white/90 drop-shadow-md" strokeWidth={1.5} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Manual Navigation Arrows (Desktop visible on hover / always subtle; accessible on mobile) */}
      {slides.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            aria-label="Previous Slide"
            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 lg:w-11 lg:h-11 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-md text-white border border-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 sm:opacity-80 transition-opacity z-20 shadow-md"
          >
            <ChevronLeft size={20} className="lg:w-6 lg:h-6" />
          </button>
          <button
            onClick={handleNext}
            aria-label="Next Slide"
            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 lg:w-11 lg:h-11 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-md text-white border border-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 sm:opacity-80 transition-opacity z-20 shadow-md"
          >
            <ChevronRight size={20} className="lg:w-6 lg:h-6" />
          </button>
        </>
      )}

      {/* Slide Pagination Indicator Dots */}
      {slides.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              aria-label={`Go to slide ${idx + 1}`}
              className={`transition-all duration-300 rounded-full h-2 ${
                idx === currentIndex
                  ? 'w-7 bg-white shadow-sm'
                  : 'w-2 bg-white/40 hover:bg-white/70'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
