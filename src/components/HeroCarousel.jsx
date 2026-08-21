import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  BookOpen, Sparkles, Award, ChevronLeft, ChevronRight, ArrowRight, 
  BookMarked, Headphones, FileText, Globe, HelpCircle, GraduationCap,
  Timer, Calendar, Target, Play, Flame
} from 'lucide-react';
import { cleanBookTitle, BookCoverThumbnail } from '../utils/bookHelpers';

export default function HeroCarousel({ activeBook, recentActivity, user, onNavigate, mobileMenuOpen = false }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef(null);
  const touchEndX = useRef(null);

  const slides = useMemo(() => {
    const promoSlides = [];
    const hasReadingProgress = activeBook && activeBook.progress && activeBook.progress.current_page > 0;
    const hasActivity = Boolean(recentActivity);

    // 1. Context-Aware Primary Slide OR Onboarding Welcome
    if (!hasReadingProgress && !hasActivity) {
      // Req 7: Auto-hide Continue Reading if never opened a textbook
      promoSlides.push({
        id: 'welcome-new-student',
        badgeText: 'Welcome to Studdy Buddy!',
        title: 'Welcome to Studdy Buddy!',
        description: 'Choose a subject to begin your JAMB preparation. Experience interactive cloud textbooks, CBT quiz drills, and instant master teacher AI revision support.',
        ctaText: 'Choose Subject & Begin',
        action: () => onNavigate && onNavigate('library'),
        gradient: 'from-blue-700 via-indigo-800 to-slate-900',
        icon: GraduationCap,
        accentColor: 'text-sky-200',
        bgGlow: 'bg-blue-500/35'
      });
    } else {
      // Req 6: Context-Aware Adaptation based on what the student was last doing
      const mode = recentActivity?.mode;
      const targetBook = activeBook || recentActivity?.book;
      const cleanTitle = cleanBookTitle(targetBook?.title || recentActivity?.title || 'Academic Textbook');
      const author = targetBook?.author;
      const currentPage = targetBook?.progress?.current_page || recentActivity?.page || 1;
      const totalPages = targetBook?.total_pages || 0;
      const progressPercent = totalPages > 0 ? Math.min(100, Math.round((currentPage / totalPages) * 100)) : null;

      if (mode === 'questionnaire' || mode === 'quiz') {
        promoSlides.push({
          id: 'continue-quiz',
          badgeText: 'Continue Quiz',
          title: `Continue Quiz: ${cleanTitle}`,
          subtitle: author ? `By ${author}` : null,
          description: `Resume your active CBT practice questions on ${recentActivity?.subject || targetBook?.subject || 'this topic'}. Keep checking your answer explanations to masterdistractor options.`,
          ctaText: 'Resume Quiz',
          action: () => onNavigate && onNavigate('reader', { bookId: targetBook?.id || recentActivity?.bookId }),
          gradient: 'from-emerald-700 via-teal-800 to-slate-900',
          bookCover: { title: cleanTitle, subject: targetBook?.subject || recentActivity?.subject },
          accentColor: 'text-emerald-200',
          bgGlow: 'bg-emerald-500/35'
        });
      } else if (mode === 'summary') {
        promoSlides.push({
          id: 'continue-summary',
          badgeText: 'Continue Summary',
          title: `Continue Summary: ${cleanTitle}`,
          subtitle: author ? `By ${author}` : null,
          description: `Jump back into your AI-generated master teacher revision guide for ${recentActivity?.subject || targetBook?.subject || 'this textbook'}.`,
          ctaText: 'Resume Summary',
          action: () => onNavigate && onNavigate('reader', { bookId: targetBook?.id || recentActivity?.bookId }),
          gradient: 'from-purple-800 via-violet-900 to-slate-950',
          bookCover: { title: cleanTitle, subject: targetBook?.subject || recentActivity?.subject },
          accentColor: 'text-purple-200',
          bgGlow: 'bg-purple-500/35'
        });
      } else {
        // Default: Continue Reading (Req 3, 4, 5)
        promoSlides.push({
          id: 'continue-reading',
          badgeText: 'Continue Reading',
          title: cleanTitle,
          subtitle: author ? `By ${author}` : null,
          description: progressPercent 
            ? `You stopped on page ${currentPage} of ${totalPages} (${progressPercent}% complete). Maintain your daily reading rhythm.`
            : `You stopped on page ${currentPage}. Jump directly back into your active reading session without losing momentum.`,
          progressInfo: { currentPage, totalPages, progressPercent },
          ctaText: 'Resume Reading',
          action: () => onNavigate && onNavigate('reader', { bookId: targetBook?.id }),
          gradient: 'from-blue-700 via-indigo-800 to-slate-950',
          bookCover: { title: cleanTitle, subject: targetBook?.subject },
          accentColor: 'text-blue-200',
          bgGlow: 'bg-blue-500/35'
        });
      }
    }

    // 2. Daily JAMB Challenge (Req 10)
    promoSlides.push({
      id: 'daily-jamb-challenge',
      badgeText: 'Daily JAMB Challenge',
      title: 'Take Today’s 15-Question CBT Drill',
      description: 'Sharpen your examination speed and accuracy. Complete a timed quiz across your target JAMB subject combination with real-time diagnostic explanations.',
      ctaText: 'Start Daily Challenge',
      action: () => onNavigate && onNavigate('library', { filter: 'JAMB' }),
      gradient: 'from-indigo-800 via-purple-900 to-slate-950',
      icon: Flame,
      accentColor: 'text-amber-300',
      bgGlow: 'bg-purple-500/35'
    });

    // 3. AI Study Tip (Req 10)
    promoSlides.push({
      id: 'ai-study-tip',
      badgeText: 'AI Study Tip of the Day',
      title: 'Active Recall vs. Passive Reading',
      description: 'Testing yourself immediately after reading a chapter boosts long-term memory retention by over 75%. Use our AI Study Assistant to self-test definitions and formulas.',
      ctaText: 'Explore AI Tools',
      action: () => onNavigate && onNavigate('library'),
      gradient: 'from-emerald-800 via-teal-900 to-slate-950',
      icon: Sparkles,
      accentColor: 'text-emerald-200',
      bgGlow: 'bg-emerald-500/35'
    });

    // 4. Upcoming Exam Countdown (Req 10)
    const daysLeft = Math.max(0, Math.ceil((new Date(user?.target_exam_date || "2027-04-15") - new Date()) / (1000 * 60 * 60 * 24)));
    promoSlides.push({
      id: 'exam-countdown',
      badgeText: `JAMB ${user?.exam_year || "2027"} Countdown`,
      title: `${daysLeft} Days Until Examination`,
      description: `Your current target score is ${user?.target_score || "250+"}. Consistency is key: completing just 30 minutes of targeted reading each day will ensure you complete the entire syllabus on schedule.`,
      ctaText: 'Review Study Goals',
      action: () => onNavigate && onNavigate('profile'),
      gradient: 'from-sky-800 via-blue-900 to-indigo-950',
      icon: Target,
      accentColor: 'text-sky-200',
      bgGlow: 'bg-sky-500/35'
    });

    // 5. Recently Added Books
    promoSlides.push({
      id: 'recently-added',
      badgeText: 'Fresh Study Material',
      title: 'Explore New Syllabus Textbooks',
      description: 'Discover newly uploaded verified science textbooks, literature works, and interactive workbooks in our authoritative digital cloud library.',
      ctaText: 'Browse Library',
      action: () => onNavigate && onNavigate('library'),
      gradient: 'from-slate-800 via-indigo-950 to-slate-950',
      icon: BookOpen,
      accentColor: 'text-indigo-300',
      bgGlow: 'bg-indigo-500/35'
    });

    return promoSlides;
  }, [activeBook, recentActivity, user, onNavigate]);

  // Req 9: Auto-slide every 6 seconds, pause on interaction or mobile menu open, resume afterward
  useEffect(() => {
    if (isPaused || mobileMenuOpen || slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, 6500);
    return () => clearInterval(timer);
  }, [isPaused, mobileMenuOpen, slides.length]);

  const handlePrev = (e) => {
    if (e) e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const handleNext = (e) => {
    if (e) e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % slides.length);
  };

  // Req 9: Swipe gestures on mobile
  const handleTouchStart = (e) => {
    setIsPaused(true);
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    setIsPaused(false);
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 45;
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
      className="relative z-0 w-full rounded-3xl overflow-hidden shadow-xl border border-slate-200/80 bg-slate-900 group select-none transition-all"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div 
        className="flex transition-transform duration-700 ease-out min-h-[16rem] sm:min-h-[18rem] lg:min-h-[19.5rem] xl:min-h-[21rem]"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {slides.map((slide) => {
          const IconComp = slide.icon || BookOpen;
          return (
            <div 
              key={slide.id} 
              className={`w-full h-auto flex-shrink-0 bg-gradient-to-r ${slide.gradient} relative flex items-center justify-between px-6 py-7 sm:p-8 lg:p-10 xl:p-12 pb-14 sm:pb-14 lg:pb-16 overflow-hidden`}
            >
              {/* Background Glows */}
              <div className={`absolute -right-16 -bottom-16 w-80 h-80 lg:w-[450px] lg:h-[450px] rounded-full blur-3xl pointer-events-none ${slide.bgGlow || 'bg-blue-500/30'}`} />
              <div className="absolute top-0 right-10 w-72 h-72 bg-white/5 rounded-full blur-2xl pointer-events-none" />
              
              <div className="relative z-10 w-full flex items-center justify-between gap-4 sm:gap-6 lg:gap-10">
                
                {/* Left Text Content & Controls (Req 8: strict ordering, zero dot overlap) */}
                <div className="flex-1 min-w-0 flex flex-col justify-center space-y-2.5 sm:space-y-3.5 lg:space-y-4">
                  {slide.badgeText && (
                    <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-white/15 backdrop-blur-md text-white border border-white/20 rounded-full text-[11px] sm:text-xs lg:text-[13px] font-extrabold tracking-wider uppercase font-mono w-fit shadow-xs">
                      <Sparkles size={14} className={slide.accentColor || 'text-blue-200'} />
                      <span>{slide.badgeText}</span>
                    </div>
                  )}
                  
                  <div>
                    <h2 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-black text-white tracking-tight drop-shadow-sm leading-tight truncate sm:whitespace-normal" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                      {slide.title}
                    </h2>
                    {slide.subtitle && (
                      <p className="text-white/75 font-semibold text-xs sm:text-sm lg:text-[15px] mt-0.5 truncate">
                        {slide.subtitle}
                      </p>
                    )}
                  </div>
                  
                  <p className="text-white/90 font-semibold text-xs sm:text-sm lg:text-[15.5px] xl:text-[16.5px] line-clamp-2 max-w-lg lg:max-w-2xl leading-relaxed">
                    {slide.description}
                  </p>
                  
                  {/* Req 5: Explicit Progress Bar and numerical score */}
                  {slide.progressInfo && (
                    <div className="max-w-md space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-[11px] sm:text-xs lg:text-[13px] font-bold text-white/90">
                        <span>Page {slide.progressInfo.currentPage} {slide.progressInfo.totalPages ? `of ${slide.progressInfo.totalPages}` : ''}</span>
                        {slide.progressInfo.progressPercent !== null && (
                          <span className="text-indigo-200 md:text-blue-200 font-black">{slide.progressInfo.progressPercent}% Complete</span>
                        )}
                      </div>
                      <div className="w-full h-2.5 sm:h-3 bg-black/40 backdrop-blur-sm rounded-full overflow-hidden p-0.5 border border-white/20">
                        <div 
                          className="h-full bg-gradient-to-r from-indigo-400 via-violet-300 to-emerald-400 md:from-blue-400 md:via-sky-300 md:to-emerald-400 rounded-full transition-all duration-1000 shadow-sm"
                          style={{ width: `${slide.progressInfo.progressPercent || Math.min(100, Math.max(10, (slide.progressInfo.currentPage / 100) * 10))}%` }}
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Action Button */}
                  <div className="pt-2 sm:pt-2.5">
                    <button
                      onClick={slide.action}
                      className="inline-flex items-center gap-2.5 px-5 py-2.5 lg:px-6 lg:py-3.5 bg-white text-slate-900 hover:bg-indigo-50 md:hover:bg-blue-50 text-xs sm:text-sm lg:text-[15.5px] font-black rounded-xl sm:rounded-2xl transition-all duration-200 shadow-lg shadow-black/25 hover:-translate-y-0.5 active:translate-y-0 group/btn cursor-pointer"
                    >
                      <Play size={16} fill="currentColor" className="text-indigo-600 md:text-blue-600 lg:w-5 lg:h-5 shrink-0" />
                      <span>{slide.ctaText}</span>
                      <ArrowRight size={17} className="text-indigo-600 md:text-blue-600 group-hover/btn:translate-x-1.5 transition-transform" />
                    </button>
                  </div>
                </div>

                {/* Right Visual Asset: 3D Book Cover (Req 4) or Decorative Icon */}
                <div className="relative z-10 shrink-0 flex items-center justify-center">
                  {slide.bookCover ? (
                    <div className="p-1 sm:p-2">
                      <BookCoverThumbnail 
                        title={slide.bookCover.title} 
                        subject={slide.bookCover.subject} 
                        size="lg" 
                        className="shadow-2xl hover:scale-105 transition-transform duration-500 hidden xs:flex sm:flex" 
                      />
                    </div>
                  ) : (
                    <div className="hidden sm:flex items-center justify-center shrink-0 w-28 h-28 sm:w-32 sm:h-32 lg:w-44 lg:h-44 xl:w-48 xl:h-48 rounded-3xl bg-white/5 border border-white/15 backdrop-blur-sm shadow-2xl mr-2 lg:mr-4 rotate-2 group-hover:rotate-0 transition-transform duration-500">
                      <IconComp className="w-14 h-14 sm:w-16 sm:h-16 lg:w-24 lg:h-24 xl:w-28 xl:h-28 text-white/95 drop-shadow-md" strokeWidth={1.4} />
                    </div>
                  )}
                </div>
              </div>

            </div>
          );
        })}
      </div>

      {/* Manual Navigation Arrows (Visible on hover on desktop; touch friendly on tablet/mobile) */}
      {!mobileMenuOpen && slides.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            aria-label="Previous Slide"
            className="absolute left-2.5 sm:left-4 top-1/2 -translate-y-1/2 w-9 h-9 lg:w-12 lg:h-12 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md text-white border border-white/25 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow-lg cursor-pointer hover:scale-105 active:scale-95"
          >
            <ChevronLeft size={22} className="lg:w-6 lg:h-6" />
          </button>
          <button
            onClick={handleNext}
            aria-label="Next Slide"
            className="absolute right-2.5 sm:right-4 top-1/2 -translate-y-1/2 w-9 h-9 lg:w-12 lg:h-12 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md text-white border border-white/25 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow-lg cursor-pointer hover:scale-105 active:scale-95"
          >
            <ChevronRight size={22} className="lg:w-6 lg:h-6" />
          </button>
        </>
      )}

      {/* Req 8: Slide Pagination Indicator Dots clearly positioned at the very bottom below action buttons */}
      {!mobileMenuOpen && slides.length > 1 && (
        <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20 bg-black/30 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10 shadow-md">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(idx);
              }}
              aria-label={`Go to slide ${idx + 1}`}
              className={`transition-all duration-300 rounded-full h-2 cursor-pointer ${
                idx === currentIndex
                  ? 'w-7 sm:w-8 bg-white shadow-sm'
                  : 'w-2 bg-white/40 hover:bg-white/80'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
