import React from 'react';
import { ChevronLeft, FileText, MoreVertical, BookOpen, Sparkles, RefreshCw } from 'lucide-react';

/**
 * Utility component to render text with embedded inline citation chips (📄2, 📄25, etc.)
 */
export function TextWithCitations({ text, onPageClick }) {
  if (!text) return null;
  if (typeof text !== 'string') return String(text);

  // Regex to match citation patterns: 📄25, 📄 25, 📄[25], or [Page 25]
  const citationRegex = /(?:📄\s*\[?(\d+)\]?|\[Page\s*(\d+)\])/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = citationRegex.exec(text)) !== null) {
    // Push preceding plain text
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    const pageNum = parseInt(match[1] || match[2], 10);

    parts.push(
      <button
        key={`cit_${match.index}_${pageNum}`}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (onPageClick && !isNaN(pageNum)) {
            onPageClick(pageNum);
          }
        }}
        className="inline-flex items-center gap-1 px-2 py-0.5 mx-1 my-0.5 rounded-md text-[11px] font-semibold bg-slate-100/90 hover:bg-blue-100 text-slate-600 hover:text-blue-700 border border-slate-200/80 hover:border-blue-300 transition-all cursor-pointer select-none active:scale-95 shadow-2xs"
        title={`Jump to Page ${pageNum} in PDF Reader`}
      >
        <FileText size={10} className="text-slate-400 group-hover:text-blue-600 shrink-0" />
        <span>{pageNum}</span>
      </button>
    );

    lastIndex = citationRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return <>{parts}</>;
}

export default function MobileStudyNotesView({ 
  bookTitle = 'Textbook Notes', 
  notesData, 
  onBack, 
  onSwitchToPdf, 
  onPageClick,
  onRefresh,
  loading = false
}) {
  const title = notesData?.title || notesData?.name || bookTitle;
  const overview = notesData?.overview || (Array.isArray(notesData?.subtopics) ? notesData.subtopics[0]?.points?.join(' ') : '');
  const sections = notesData?.sections || (notesData?.subtopics ? notesData.subtopics.map(st => ({
    title: st.name,
    bullets: (st.points || []).map(p => ({
      lead: 'Key Concept',
      content: p
    }))
  })) : []);
  const remember = notesData?.remember;

  return (
    <div className="flex flex-col h-full w-full bg-[#FDFBF7] text-[#1A1A1A] font-sans overflow-hidden select-text">
      {/* Top Header Bar */}
      <div className="h-14 shrink-0 bg-[#FDFBF7]/90 backdrop-blur-md border-b border-[#EAE6DF] px-3 flex items-center justify-between z-20 shadow-2xs">
        <div className="flex items-center gap-2 min-w-0">
          <button 
            onClick={onBack} 
            className="p-2 hover:bg-[#F3EFE6] rounded-full text-slate-700 transition-colors cursor-pointer"
            aria-label="Back"
          >
            <ChevronLeft size={22} />
          </button>
          <h1 className="font-serif font-semibold text-sm sm:text-base text-slate-900 truncate max-w-[220px] sm:max-w-[320px]">
            {bookTitle}
          </h1>
        </div>

        <div className="flex items-center gap-1">
          {onRefresh && (
            <button 
              onClick={onRefresh}
              disabled={loading}
              className="p-2 hover:bg-[#F3EFE6] rounded-full text-slate-600 transition-colors cursor-pointer disabled:opacity-50"
              title="Regenerate Study Notes"
            >
              <RefreshCw size={18} className={loading ? "animate-spin text-blue-600" : ""} />
            </button>
          )}

          {onSwitchToPdf && (
            <button 
              onClick={onSwitchToPdf} 
              className="p-2 hover:bg-[#F3EFE6] rounded-full text-slate-700 transition-colors cursor-pointer"
              title="Switch to PDF Reader Mode"
            >
              <BookOpen size={20} />
            </button>
          )}

          <button 
            className="p-2 hover:bg-[#F3EFE6] rounded-full text-slate-600 transition-colors cursor-pointer"
            title="Options"
          >
            <MoreVertical size={20} />
          </button>
        </div>
      </div>

      {/* Main Content Area — Mobile Paper Styling */}
      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6 text-[15px] sm:text-[16px] leading-[1.75] text-[#2C2C2C]">
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500">
            <div className="w-8 h-8 border-3 border-amber-300 border-t-amber-600 rounded-full animate-spin" />
            <p className="font-serif text-sm italic animate-pulse">Generating concise AI Study Notes...</p>
          </div>
        ) : (
          <>
            {/* Title */}
            {title && (
              <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-[#111111] mb-2">
                {title}
              </h1>
            )}

            {/* Overview / Definition Intro */}
            {overview && (
              <div className="font-serif text-slate-800 leading-relaxed space-y-2">
                <TextWithCitations text={overview} onPageClick={onPageClick} />
              </div>
            )}

            {/* Structured Sections */}
            {sections && sections.map((sec, sIdx) => (
              <section key={sIdx} className="space-y-3 pt-2">
                {sec.title && (
                  <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#111111] tracking-tight">
                    {sec.title}
                  </h2>
                )}

                {sec.intro && (
                  <p className="font-normal text-slate-800 leading-relaxed">
                    <TextWithCitations text={sec.intro} onPageClick={onPageClick} />
                  </p>
                )}

                {/* Bullets */}
                {sec.bullets && sec.bullets.length > 0 && (
                  <ul className="space-y-3 pl-1">
                    {sec.bullets.map((b, bIdx) => (
                      <li key={bIdx} className="relative pl-5 leading-relaxed text-slate-800">
                        <span className="absolute left-0 top-[2px] text-slate-400 font-bold">•</span>
                        {b.lead && (
                          <strong className="font-bold text-slate-900 mr-1.5">
                            {b.lead}:
                          </strong>
                        )}
                        <TextWithCitations text={b.content || b.text || b} onPageClick={onPageClick} />

                        {/* Nested Sub-bullets */}
                        {b.subBullets && b.subBullets.length > 0 && (
                          <ul className="mt-2.5 space-y-2 pl-4 border-l border-slate-200">
                            {b.subBullets.map((sb, sbIdx) => (
                              <li key={sbIdx} className="relative pl-4 text-slate-700 text-[14.5px]">
                                <span className="absolute left-0 top-[1px] text-slate-400 font-bold">•</span>
                                {sb.lead && (
                                  <strong className="font-semibold text-slate-900 mr-1.5">
                                    {sb.lead}:
                                  </strong>
                                )}
                                <TextWithCitations text={sb.content || sb.text || sb} onPageClick={onPageClick} />
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}

            {/* Remember / Key Takeaway Callout Box */}
            {remember && (
              <div className="mt-8 p-4 rounded-xl bg-[#F6F2EA] border border-[#E8E2D6] text-[#2D2D2D] shadow-2xs font-normal text-sm sm:text-base leading-relaxed">
                <span className="font-bold text-slate-900 mr-1">Remember:</span>
                <TextWithCitations text={remember} onPageClick={onPageClick} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
