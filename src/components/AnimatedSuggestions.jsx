import React from 'react';

export default function AnimatedSuggestions({ suggestions, onSelect }) {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 justify-center p-2 relative min-h-[45px]">
      {suggestions.map((chip, idx) => {
        // Stagger the animation so they appear sequentially
        const delay = idx * 0.15;
        
        return (
          <button
            key={idx + chip.text}
            onClick={(e) => {
              e.preventDefault();
              onSelect(chip.text);
            }}
            className="steam-chip px-3.5 py-2 rounded-full border border-slate-200 bg-white shadow-sm text-[13px] font-bold text-slate-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors flex items-center gap-2 transform active:scale-95"
            style={{ 
              animationDelay: `${delay}s`,
              position: 'relative'
            }}
          >
            <span className="text-base">{chip.icon}</span>
            <span style={{ fontFamily: "'Inter', sans-serif" }}>{chip.text}</span>
          </button>
        );
      })}
    </div>
  );
}
