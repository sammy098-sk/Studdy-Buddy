import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Loader2, CheckCircle2 } from 'lucide-react';
import { callClaude, parseJsonLoose } from '../utils/api';

export default function SubsectionsPanel({ subject, topic, onBack, onPickSubsection, completedTopics }) {
  const [subsections, setSubsections] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setSubsections(null);
    setError(null);
    (async () => {
      try {
        const raw = await callClaude(
          `You are a JAMB curriculum architect. Respond ONLY with a valid JSON array of 4 to 6 short strings — no prose, no markdown fences. Each string is a subsection name that breaks the given topic into learnable chunks, ordered from most foundational to most advanced.`,
          [{ role: "user", content: `Subject: ${subject}\nTopic: ${topic}\nBreak this into subsections.` }],
          400
        );
        const parsed = parseJsonLoose(raw);
        if (!cancelled) setSubsections(Array.isArray(parsed) ? parsed : []);
      } catch (e) {
        if (!cancelled) setError("Couldn't load the breakdown — check your connection and try again.");
      }
    })();
    return () => { cancelled = true; };
  }, [subject, topic]);

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6">
      <div className="max-w-2xl mx-auto">
        <button onClick={onBack} className="flex items-center gap-1 text-sm mb-5" style={{ color: "#5A6B8C" }}>
          <ChevronLeft size={16} /> {subject}
        </button>

        <h2 className="text-2xl font-semibold mb-1" style={{ color: "#101C34", fontFamily: "'Montserrat', sans-serif" }}>
          {topic}
        </h2>
        <p className="text-sm mb-6" style={{ color: "#8493B0" }}>
          Broken into bite-sized parts. Pick one to start the lesson.
        </p>

        {!subsections && !error && (
          <div className="flex items-center gap-2 text-sm py-8 justify-center" style={{ color: "#8493B0" }}>
            <Loader2 size={16} className="animate-spin" /> Breaking this topic down...
          </div>
        )}

        {error && <div className="text-sm px-4 py-3 rounded-lg" style={{ background: "#FEF2F2", color: "#B91C1C" }}>{error}</div>}

        <div className="flex flex-col gap-2">
          {(subsections || []).map((sub, idx) => {
            const done = completedTopics.includes(`textbook > ${subject} > ${topic} > ${sub}`);
            return (
              <button
                key={sub}
                onClick={() => onPickSubsection(sub)}
                className="flex items-center gap-3 text-left px-4 py-3.5 rounded-xl border transition-colors"
                style={{ borderColor: "#D8E3F8", background: done ? "#F3F7FF" : "#FFFFFF" }}
              >
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0"
                  style={{ background: done ? "#2954E5" : "#E8F1FE", color: done ? "#FFFFFF" : "#2954E5" }}
                >
                  {done ? <CheckCircle2 size={14} /> : idx + 1}
                </div>
                <span className="text-[15px] flex-1" style={{ color: "#101C34" }}>{sub}</span>
                <ChevronRight size={16} style={{ color: "#8493B0" }} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
