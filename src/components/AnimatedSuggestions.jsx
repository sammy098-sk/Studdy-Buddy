import React from 'react';

export default function AnimatedSuggestions({ suggestions, onSelect }) {
  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 justify-center p-2 relative min-h-[45px]">
      {suggestions.map((chip, idx) => {
        // With a 10s animation loop, stagger the chips evenly across the duration
        // so that there is a continuous cycle of chips appearing and disappearing.
        const staggerAmount = 10 / suggestions.length;
        const delay = idx * staggerAmount;
        
        return (
          <button
            key={idx + chip.text}
            onClick={(e) => {
              e.preventDefault();
              onSelect(chip.text);
            }}
            className="steam-chip px-4 py-2.5 rounded-full border border-slate-200/60 bg-white/80 backdrop-blur-sm shadow-[0_4px_12px_rgb(0,0,0,0.05)] text-[13px] font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors flex items-center gap-2 transform active:scale-95"
            style={{ 
              animationDelay: `${delay}s`,
              position: 'relative'
            }}
          >
            <span className="text-[15px]">{chip.icon}</span>
            <span style={{ fontFamily: "'Inter', sans-serif" }}>{chip.text}</span>
          </button>
        );
      })}
    </div>
  );
}
