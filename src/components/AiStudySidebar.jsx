import React, { useState } from 'react';
import { X, Bot, FileText, BrainCircuit, Lightbulb, Bookmark, MessageSquare, ChevronRight } from 'lucide-react';

export default function AiStudySidebar({ isOpen, onClose, onAction, currentPage }) {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-y-0 right-0 w-80 bg-white border-l flex flex-col z-30 shadow-2xl transition-all transform" style={{ borderColor: '#E2E8F0' }}>
       <div className="flex items-center justify-between p-4 border-b shrink-0 bg-blue-50" style={{ borderColor: '#E2E8F0' }}>
         <h2 className="font-semibold text-blue-900 text-sm flex items-center gap-2">
           <Bot size={18} className="text-blue-600" />
           StudyBuddy AI
         </h2>
         <button onClick={onClose} className="p-1.5 hover:bg-blue-100 rounded-lg text-blue-700 transition-colors">
           <X size={16} />
         </button>
       </div>
       
       <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
         <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-1">
           Study Tools for Page {currentPage}
         </div>
         
         <div className="flex flex-col gap-2">
           <AiActionBtn icon={MessageSquare} label="Ask AI about this page" onClick={() => onAction('ask')} />
           <AiActionBtn icon={FileText} label="Generate Summary" onClick={() => onAction('summary')} />
           <AiActionBtn icon={BrainCircuit} label="Practice Questions" onClick={() => onAction('quiz')} />
           <AiActionBtn icon={Lightbulb} label="Explain this page" onClick={() => onAction('explain')} />
           <AiActionBtn icon={Bookmark} label="Bookmark Page" onClick={() => onAction('bookmark')} />
         </div>

         <div className="mt-8 bg-blue-50 border border-blue-100 rounded-xl p-4">
           <p className="text-sm text-blue-800 leading-relaxed mb-3">
             StudyBuddy is analyzing this textbook. Select any tool above to generate interactive study materials directly from the content you're reading.
           </p>
         </div>
       </div>
    </div>
  );
}

function AiActionBtn({ icon: Icon, label, onClick }) {
  return (
    <button 
      onClick={onClick}
      className="w-full flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl hover:border-blue-400 hover:shadow-md hover:bg-blue-50 transition-all group"
    >
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-blue-100 flex items-center justify-center transition-colors">
          <Icon size={16} className="text-slate-600 group-hover:text-blue-600" />
        </div>
        <span className="font-medium text-slate-700 group-hover:text-blue-700 text-sm">
          {label}
        </span>
      </div>
      <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-500" />
    </button>
  );
}
