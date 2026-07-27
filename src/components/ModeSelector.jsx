import React from 'react';
import { BookOpen, Layers, ListChecks, ChevronLeft, ChevronRight, Book } from 'lucide-react';

export default function ModeSelector({ subject, onBack, onPickMode }) {
  const modes = [
    {
      id: "textbook",
      icon: BookOpen,
      title: "Full Textbook",
      description: "Complete, unabridged coverage of every topic — nothing summarized, nothing skipped.",
    },
    {
      id: "reader",
      icon: Book,
      title: "Uploaded Textbooks Reader",
      description: "Read full uploaded textbooks chapter-by-chapter stored in the database.",
    },
    {
      id: "summary",
      icon: Layers,
      title: "Summary",
      description: "Key points from every topic and subtopic, condensed for fast revision.",
    },
    {
      id: "questionnaire",
      icon: ListChecks,
      title: "Questionnaire",
      description: "Practice questions on a specific topic, with instant feedback as you answer.",
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6">
      <div className="max-w-2xl mx-auto">
        <button onClick={onBack} className="flex items-center gap-1 text-sm mb-5" style={{ color: "#5A6B8C" }}>
          <ChevronLeft size={16} /> All subjects
        </button>

        <h2 className="text-2xl font-semibold mb-1" style={{ color: "#101C34", fontFamily: "'Montserrat', sans-serif" }}>
          {subject}
        </h2>
        <p className="text-sm mb-6" style={{ color: "#8493B0" }}>
          How do you want to study this subject?
        </p>

        <div className="flex flex-col gap-3">
          {modes.map((m) => {
            const Icon = m.icon;
            return (
              <button
                key={m.id}
                onClick={() => onPickMode(m.id)}
                className="flex items-start gap-4 text-left p-4 rounded-2xl border transition-shadow hover:shadow-sm"
                style={{ borderColor: "#D8E3F8", background: "#FFFFFF" }}
              >
                <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#E8F1FE" }}>
                  <Icon size={20} style={{ color: "#2954E5" }} />
                </div>
                <div className="flex-1">
                  <div className="text-[15px] font-medium mb-0.5" style={{ color: "#101C34" }}>{m.title}</div>
                  <div className="text-xs leading-relaxed" style={{ color: "#8493B0" }}>{m.description}</div>
                </div>
                <ChevronRight size={16} style={{ color: "#8493B0" }} className="mt-1 shrink-0" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
