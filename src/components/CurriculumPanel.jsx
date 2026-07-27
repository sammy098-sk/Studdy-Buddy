import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CURRICULUM } from '../config';

const MODE_META = {
  textbook: { label: "Full Textbook", subtitle: "Complete, unabridged coverage of every topic — nothing summarized." },
  summary: { label: "Summary", subtitle: "Key points from every topic, condensed for quick revision." },
  questionnaire: { label: "Questionnaire", subtitle: "Practice questions on a topic, with instant feedback." },
};

export default function CurriculumPanel({ subject, mode, onBack, onPickTopic, completedTopics }) {
  const topics = CURRICULUM[subject] || [];
  const meta = MODE_META[mode] || {};
  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6">
      <div className="max-w-2xl mx-auto">
        <button onClick={onBack} className="flex items-center gap-1 text-sm mb-5" style={{ color: "#5A6B8C" }}>
          <ChevronLeft size={16} /> {subject} modes
        </button>

        <div className="inline-flex items-center gap-2 mb-2 px-2.5 py-1 rounded-md" style={{ background: "#E8F1FE" }}>
          <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "#2954E5", fontFamily: "'IBM Plex Mono', monospace" }}>
            {meta.label}
          </span>
        </div>
        <h2 className="text-2xl font-semibold mb-1" style={{ color: "#101C34", fontFamily: "'Montserrat', sans-serif" }}>
          {subject}
        </h2>
        <p className="text-sm mb-6" style={{ color: "#8493B0" }}>
          Pick a topic — {meta.subtitle}
        </p>

        <div className="flex flex-col gap-2">
          {topics.map((topic) => {
            const anyDone = completedTopics.some((c) => c.startsWith(`${mode} > ${subject} > ${topic}`));
            return (
              <button
                key={topic}
                onClick={() => onPickTopic(topic)}
                className="flex items-center justify-between text-left px-4 py-3.5 rounded-xl border transition-colors"
                style={{ borderColor: "#D8E3F8", background: anyDone ? "#F3F7FF" : "#FFFFFF" }}
              >
                <span className="text-[15px]" style={{ color: "#101C34" }}>{topic}</span>
                <div className="flex items-center gap-2">
                  {anyDone && <span className="text-[11px] font-medium" style={{ color: "#2954E5" }}>Visited</span>}
                  <ChevronRight size={16} style={{ color: "#8493B0" }} />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
