import React from 'react';
import { FileText, BookOpen, Layers } from 'lucide-react';

export default function ScopeSelector({ scope = 'page', onChange, disabled = false }) {
  const options = [
    {
      id: 'page',
      label: 'Current Page',
      icon: FileText,
      description: 'Focus strictly on active page text'
    },
    {
      id: 'chapter',
      label: 'Current Chapter',
      icon: BookOpen,
      description: 'Analyze content across this entire chapter'
    },
    {
      id: 'book',
      label: 'Entire Textbook',
      icon: Layers,
      description: 'RAG search across full textbook syllabus'
    }
  ];

  return (
    <div className="bg-slate-50/80 p-1.5 rounded-2xl border border-slate-200/80 shadow-2xs mb-4">
      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 px-2.5 pt-1 pb-2 tracking-wide uppercase" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
        <span>Study AI Scope</span>
        <span className="text-blue-600 capitalize">{scope === 'page' ? 'Page-Level Focus' : scope === 'chapter' ? 'Chapter Analysis' : 'Full Book RAG'}</span>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {options.map((opt) => {
          const Icon = opt.icon;
          const isSelected = scope === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange && onChange(opt.id)}
              title={opt.description}
              className={`flex flex-col items-center justify-center py-2 px-1.5 rounded-xl transition-all text-center ${
                isSelected
                  ? 'bg-white text-blue-600 font-semibold shadow-xs border border-blue-200 ring-2 ring-blue-500/10'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60 border border-transparent font-medium'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-[0.98]'}`}
            >
              <Icon size={15} className={isSelected ? 'text-blue-600 mb-1' : 'text-slate-400 mb-1'} />
              <span className="text-[12px] leading-tight block">{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
