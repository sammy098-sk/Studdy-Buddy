import React from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import TicketTag from './TicketTag';
import { SUBJECTS } from '../config';

export default function Landing({ onStart }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 py-16" style={{ background: "#FAFBFF" }}>
      <div className="max-w-3xl w-full text-center">
        <div className="inline-flex items-center gap-1.5 mb-6 px-3 py-1 rounded-full" style={{ background: "#E8F1FE" }}>
          <Sparkles size={13} style={{ color: "#2954E5" }} />
          <span className="text-xs font-medium" style={{ color: "#2954E5", fontFamily: "'IBM Plex Mono', monospace" }}>
            BUILT FOR JAMB candidates
          </span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-semibold mb-5 leading-tight" style={{ color: "#101C34", fontFamily: "'Montserrat', sans-serif" }}>
          JAMB prep that feels like<br />texting a smart friend
        </h1>
        <p className="text-base sm:text-lg mb-10 max-w-xl mx-auto" style={{ color: "#5A6B8C" }}>
          Pick a subject, break it into bite-sized lessons, and study it
          together — one subsection at a time.
        </p>

        <button
          onClick={onStart}
          className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl font-medium text-white transition-transform hover:scale-[1.02] active:scale-[0.98]"
          style={{ background: "#2954E5" }}
        >
          Start Studying <ArrowRight size={17} />
        </button>

        <div className="mt-16 mx-auto max-w-md text-left rounded-2xl border p-5" style={{ borderColor: "#D8E3F8", background: "#FFFFFF" }}>
          <TicketTag subject="Chemistry" topic="Atomic Structure" />
          <div className="mb-3 px-4 py-2.5 rounded-2xl rounded-bl-sm text-sm" style={{ background: "#E8F1FE", color: "#101C34" }}>
            What even is a proton, sha?
          </div>
          <div className="flex justify-end">
            <div className="px-4 py-2.5 rounded-2xl rounded-br-sm text-sm text-white max-w-[85%]" style={{ background: "#2954E5" }}>
              Good question! Think of an atom like a tiny solar system — the
              proton lives in the center (nucleus) and carries positive charge...
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap justify-center gap-2">
          {SUBJECTS.slice(0, 6).map((s) => (
            <span key={s} className="text-xs px-3 py-1 rounded-full border" style={{ borderColor: "#D8E3F8", color: "#5A6B8C" }}>
              {s}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
