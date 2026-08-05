import React from 'react';

export function cleanBookTitle(title) {
  if (!title) return 'Textbook';
  
  // Strip common file extensions
  let cleaned = title.replace(/\.(pdf|epub|docx?|txt)$/i, '');
  
  // Strip piracy/library artifact strings and source suffixes
  cleaned = cleaned.replace(/\b(z[-_ ]?lib(\.org)?|libgen|annas?-archive|1lib|scribd|sci-?hub)\b/gi, '');
  
  // Remove volume/copy tags like (1), [1] at end
  cleaned = cleaned.replace(/(\s*[\(\[]\d+[\)\]])+\s*$/g, '');
  
  // Remove multiple continuous whitespace
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  // If title contains ' by ' followed by author string, extract clean title
  const byIndex = cleaned.toLowerCase().indexOf(' by ');
  if (byIndex > -1) {
    const mainTitle = cleaned.slice(0, byIndex).trim();
    if (mainTitle.length >= 2) {
      cleaned = mainTitle;
    }
  }

  return cleaned || 'Academic Textbook';
}

export function formatRelativeTime(dateString) {
  if (!dateString) return 'Recently';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Recently';

  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.round(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24 && date.getDate() === now.getDate()) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function BookCoverThumbnail({ title, subject, size = "md", className = "" }) {
  const cleanTitle = cleanBookTitle(title);

  const getSubjColor = (sub = '') => {
    const s = sub.toLowerCase();
    if (s.includes('biolog')) return 'from-emerald-700 via-green-800 to-emerald-950 border-emerald-500/30';
    if (s.includes('physic')) return 'from-blue-700 via-indigo-800 to-blue-950 border-blue-500/30';
    if (s.includes('chemis')) return 'from-purple-700 via-violet-800 to-purple-950 border-purple-500/30';
    if (s.includes('math')) return 'from-rose-700 via-red-800 to-rose-950 border-rose-500/30';
    if (s.includes('econom')) return 'from-amber-700 via-yellow-800 to-amber-950 border-amber-500/30';
    if (s.includes('english') || s.includes('lit')) return 'from-cyan-700 via-teal-800 to-slate-950 border-cyan-500/30';
    return 'from-slate-700 via-indigo-900 to-slate-950 border-slate-500/30';
  };

  const dimensions = {
    sm: "w-12 h-16 text-[9px] rounded-r-lg rounded-l-xs p-1.5",
    md: "w-16 h-24 sm:w-20 sm:h-28 text-[11px] sm:text-xs rounded-r-xl rounded-l-sm p-2 sm:p-2.5",
    lg: "w-24 h-36 sm:w-32 sm:h-44 lg:w-36 lg:h-52 text-xs sm:text-sm lg:text-base rounded-r-2xl rounded-l-md p-3 sm:p-4",
    xl: "w-32 h-48 sm:w-40 sm:h-56 lg:w-44 lg:h-64 text-sm sm:text-base lg:text-lg rounded-r-3xl rounded-l-lg p-4 sm:p-5"
  }[size] || "w-16 h-24 text-xs rounded-r-xl rounded-l-sm p-2";

  return (
    <div 
      className={`${dimensions} shrink-0 bg-gradient-to-br ${getSubjColor(subject)} shadow-xl border-y border-r relative flex flex-col justify-between overflow-hidden transition-transform duration-300 select-none ${className}`}
      style={{ boxShadow: '4px 6px 16px -3px rgba(0, 0, 0, 0.45), inset -2px -2px 4px rgba(0,0,0,0.3)' }}
    >
      {/* Realistic vertical spine crease */}
      <div className="absolute left-0 top-0 bottom-0 w-2 sm:w-3 bg-black/35 border-r border-white/15 z-10" />
      
      {/* Subtle lighting overlay */}
      <div className="absolute inset-0 bg-gradient-to-tr from-black/20 via-transparent to-white/10 pointer-events-none" />

      {/* Subject header pill */}
      <div className="relative z-20 pl-1 sm:pl-2 min-w-0">
        <span className="inline-block px-1 sm:px-1.5 py-0.5 bg-black/40 backdrop-blur-md rounded text-[7px] sm:text-[9px] font-extrabold text-white uppercase tracking-wider truncate max-w-full font-mono shadow-2xs">
          {subject || 'Textbook'}
        </span>
      </div>

      {/* Book embossed title */}
      <div className="relative z-20 pl-1 sm:pl-2 mt-auto">
        <div className="w-3.5 sm:w-5 h-0.5 bg-white/50 mb-1 sm:mb-1.5 rounded-full shadow-xs"></div>
        <p className="font-black text-white leading-tight uppercase tracking-tight line-clamp-3 drop-shadow-md" style={{ fontFamily: "'Montserrat', sans-serif" }}>
          {cleanTitle}
        </p>
      </div>
    </div>
  );
}
