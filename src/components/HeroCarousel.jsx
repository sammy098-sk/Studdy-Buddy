import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  BookOpen, Sparkles, Award, ChevronLeft, ChevronRight, ArrowRight, 
  BookMarked, Headphones, FileText, Globe, HelpCircle, GraduationCap 
} from 'lucide-react';

export default function HeroCarousel({ activeBook, onNavigate }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef(null);
  const touchEndX = useRef(null);

  const slides = useMemo(() => {
    const promoSlides = [];

    // 1. Dynamic Primary Slide: Continue Reading vs JAMB Preparation / AI Tools
    if (activeBook && activeBook.progress && activeBook.progress.current_page > 0) {
      promoSlides.push({
        id: 'continue-reading',
        title: `Continue Reading: ${activeBook.title}`,
        description: `You stopped on Page ${activeBook.progress.current_page} ${activeBook.total_pages ? `of ${activeBook.total_pages}` : ''}. Jump directly back into your active study session without losing academic momentum.`,
        ctaText: `Resume Page ${activeBook.progress.current_page}`,
        action: () => onNavigate && onNavigate('reader', { bookId: activeBook.id }),
        gradient: 'from-blue-700 via-indigo-700 to-slate-900',
        badgeText: 'Active Study Session',
        icon: BookMarked,
        accentColor: 'text-blue-200',
        bgGlow: 'bg-blue-500/35'
      });
    } else {
      promoSlides.push({
        id: 'jamb-prep-dynamic',
        title: 'JAMB & Examination Mastery 2026',
        description: 'Prepare for high-stakes exams with targeted syllabus textbooks, AI CBT practice drills, and detailed option-by-option distractor breakdowns.',
        ctaText: 'Start Exam Prep',
        action: () => onNavigate && onNavigate('library', { filter: 'JAMB' }),
        gradient: 'from-blue-700 via-indigo-800 to-slate-900',
        badgeText: 'Featured Exam Prep',
        icon: GraduationCap,
        accentColor: 'text-sky-200',
        bgGlow: 'bg-indigo-500/35'
      });
    }

    // 2. AI Study Assistant
    promoSlides.push({
      id: 'ai-assistant',
      title: 'Your Interactive AI Study Assistant',
      description: 'Stressed by complex theoretical formulas or dense definitions? Ask our experienced AI teacher for deep, lecture-style guidance on any textbook page.',
      ctaText: 'Explore AI Assistant',
      action: () => onNavigate && onNavigate('library'),
      gradient: 'from-indigo-800 via-purple-800 to-slate-950',
      badgeText: 'Smart Study Tools',
      icon: Sparkles,
      accentColor: 'text-purple-200',
      bgGlow: 'bg-purple-500/35'
    });

    // 3. Practice Questions (CBT Quiz Engine)
    promoSlides.push({
      id: 'practice-questions',
      title: 'One-by-One CBT Practice Quizzes',
      description: 'Test your retention with 15-question examination drills. Learn faster with immediate diagnostic feedback explaining why every choice is right or wrong.',
      ctaText: 'Take a Quiz',
      action: () => onNavigate && onNavigate('library'),
      gradient: 'from-blue-600 via-cyan-800 to-indigo-950',
      badgeText: 'Diagnostic Testing',
      icon: HelpCircle,
      accentColor: 'text-cyan-200',
      bgGlow: 'bg-cyan-500/35'
    });

    // 4. Read Aloud Audio
    promoSlides.push({
      id: 'read-aloud',
      title: 'Listen On-The-Go with Read Aloud',
      description: 'Convert complex textbook chapters into engaging audio lectures. Follow along with real-time word highlighting across desktop, laptop, and mobile.',
      ctaText: 'Listen to Textbooks',
      action: () => onNavigate && onNavigate('library'),
      gradient: 'from-emerald-700 via-teal-800 to-slate-950',
      badgeText: 'Audio Learning',
      icon: Headphones,
      accentColor: 'text-emerald-200',
      bgGlow: 'bg-emerald-500/35'
    });

    // 5. AI Summaries & Revision Notes
    promoSlides.push({
      id: 'ai-summaries',
      title: 'Master Teacher Revision Guides',
      description: 'Generate exhaustive chapter study notes and overarching textbook breakdowns in seconds, designed specifically around examination standards.',
      ctaText: 'Generate Summaries',
      action: () => onNavigate && onNavigate('library'),
      gradient: 'from-purple-800 via-pink-800 to-slate-950',
      badgeText: 'Instant Synthesis',
      icon: FileText,
      accentColor: 'text-pink-200',
      bgGlow: 'bg-pink-500/35'
    });

    // 6. Study Anywhere
    promoSlides.push({
      id: 'study-anywhere',
      title: 'Study Anywhere, Any Device',
      description: 'Seamlessly transition between desktop, laptop, tablet, and mobile with automatic cloud synchronization of all saved bookmarks and reading progress.',
      ctaText: 'Check Reading History',
      action: () => onNavigate && onNavigate('sessions'),
      gradient: 'from-sky-700 via-blue-800 to-indigo-950',
      badgeText: 'Cloud Sync Platform',
      icon: Globe,
      accentColor: 'text-sky-200',
      bgGlow: 'bg-sky-500/35'
    });

    // 7. Recently Added Books
    promoSlides.push({
      id: 'recently-added',
      title: 'Recently Added Books & Resources',
      description: 'Explore verified science textbooks, JAMB preparatory workbooks, and interactive literature in our growing authoritative institutional cloud library.',
      ctaText: 'Browse Full Library',
      action: () => onNavigate && onNavigate('library'),
      gradient: 'from-slate-800 via-indigo-900 to-blue-950',
      badgeText: 'Fresh Study Material',
      icon: BookOpen,
      accentColor: 'text-blue-200',
      bgGlow: 'bg-indigo-500/35'
    });

    return promoSlides;
  }, [activeBook, onNavigate]);

  useEffect(() => {
    if (isPaused || slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, 6000);
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
      className="relative w-full rounded-3xl overflow-hidden shadow-xl border border-slate-200/80 bg-slate-900 group select-none transition-all"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div 
        className="flex transition-transform duration-700 ease-in-out h-56 sm:h-64 lg:h-[270px] xl:h-[290px]"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {slides.map((slide) => {
          const IconComp = slide.icon || BookOpen;
          return (
            <div 
              key={slide.id} 
              className={`w-full h-full flex-shrink-0 bg-gradient-to-r ${slide.gradient} relative flex items-center justify-between p-6 sm:p-8 lg:p-10 xl:p-12 overflow-hidden`}
            >
              {/* Background Architectural Glows */}
              <div className={`absolute -right-16 -bottom-16 w-80 h-80 lg:w-[420px] lg:h-[420px] rounded-full blur-3xl pointer-events-none ${slide.bgGlow || 'bg-blue-500/30'}`} />
              <div className="absolute top-0 right-10 w-72 h-72 bg-white/5 rounded-full blur-2xl pointer-events-none" />
              
              {/* Left text content with comfortable SaaS desktop typography */}
              <div className="relative z-10 max-w-xl lg:max-w-3xl xl:max-w-4xl flex flex-col justify-center space-y-2.5 sm:space-y-3 lg:space-y-4">
                {slide.badgeText && (
                  <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-white/10 backdrop-blur-md text-white border border-white/20 rounded-full text-[10px] sm:text-xs lg:text-[13px] font-extrabold tracking-wider uppercase font-mono w-fit shadow-xs">
                    <Sparkles size={14} className={slide.accentColor || 'text-blue-200'} />
                    <span>{slide.badgeText}</span>
                  </div>
                )}
                
                <h2 className="text-xl sm:text-2xl lg:text-[32px] xl:text-[36px] font-black text-white tracking-tight drop-shadow-sm leading-tight" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                  {slide.title}
                </h2>
                
                <p className="text-white/90 font-semibold text-xs sm:text-sm lg:text-[15.5px] xl:text-[17px] line-clamp-2 max-w-lg lg:max-w-2xl leading-relaxed">
                  {slide.description}
                </p>
                
                <div className="pt-1 lg:pt-2">
                  <button
                    onClick={slide.action}
                    className="inline-flex items-center gap-2.5 px-5 py-2.5 lg:px-6 lg:py-3.5 bg-white text-slate-900 hover:bg-blue-50 text-xs sm:text-sm lg:text-[15.5px] font-black rounded-xl sm:rounded-2xl transition-all duration-200 shadow-lg shadow-black/20 hover:-translate-y-0.5 active:translate-y-0 group/btn cursor-pointer"
                  >
                    <span>{slide.ctaText}</span>
                    <ArrowRight size={17} className="text-blue-600 group-hover/btn:translate-x-1.5 transition-transform" />
                  </button>
                </div>
              </div>

              {/* Right Decorative Illustration Icon for Desktop & Tablet */}
              <div className="relative z-10 hidden sm:flex items-center justify-center shrink-0 w-32 h-32 lg:w-44 lg:h-44 xl:w-48 xl:h-48 rounded-3xl bg-white/5 border border-white/15 backdrop-blur-sm shadow-2xl mr-4 lg:mr-8 rotate-2 group-hover:rotate-0 transition-transform duration-500">
                <IconComp className="w-16 h-16 lg:w-24 lg:h-24 xl:w-28 xl:h-28 text-white/95 drop-shadow-md" strokeWidth={1.5} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Manual Navigation Arrows (Visible on hover on desktop; touch friendly on tablet/mobile) */}
      {slides.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            aria-label="Previous Slide"
            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 lg:w-11 lg:h-11 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-md text-white border border-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow-md cursor-pointer"
          >
            <ChevronLeft size={22} className="lg:w-6 lg:h-6" />
          </button>
          <button
            onClick={handleNext}
            aria-label="Next Slide"
            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 lg:w-11 lg:h-11 rounded-full bg-black/30 hover:bg-black/50 backdrop-blur-md text-white border border-white/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow-md cursor-pointer"
          >
            <ChevronRight size={22} className="lg:w-6 lg:h-6" />
          </button>
        </>
      )}

      {/* Slide Pagination Indicator Dots */}
      {slides.length > 1 && (
        <div className="absolute bottom-3.5 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              aria-label={`Go to slide ${idx + 1}`}
              className={`transition-all duration-300 rounded-full h-2 cursor-pointer ${
                idx === currentIndex
                  ? 'w-8 bg-white shadow-sm'
                  : 'w-2 bg-white/40 hover:bg-white/75'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
