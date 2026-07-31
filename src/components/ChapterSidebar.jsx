import React from 'react';
import { X, Book } from 'lucide-react';

export default function ChapterSidebar({ chapters = [], isOpen, onClose, currentPage, onPageChange }) {
  if (!isOpen) return null;

  // Find active chapter by finding the last chapter whose page_number <= currentPage
  let activeChapterId = null;
  for (let i = chapters.length - 1; i >= 0; i--) {
    if (currentPage >= chapters[i].page_number) {
      activeChapterId = chapters[i].id || i;
      break;
    }
  }

  return (
    <div className="absolute inset-y-0 left-0 w-64 bg-slate-50 border-r flex flex-col z-20 shadow-xl md:shadow-none md:relative transition-all" style={{ borderColor: '#E2E8F0' }}>
       <div className="flex items-center justify-between p-4 border-b shrink-0" style={{ borderColor: '#E2E8F0' }}>
         <h2 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
           <Book size={16} className="text-blue-600" />
           Table of Contents
         </h2>
         <button onClick={onClose} className="md:hidden p-1 hover:bg-slate-200 rounded text-slate-600">
           <X size={16} />
         </button>
       </div>
       <div className="flex-1 overflow-y-auto p-2">
         {chapters.length === 0 ? (
           <div className="text-center text-sm text-slate-500 mt-10 px-4">
              No Chapters Available.
           </div>
         ) : (
           <div className="flex flex-col gap-1 pb-4">
             {chapters.map((ch, idx) => {
                const isActive = (ch.id || idx) === activeChapterId;
                const level = ch.level || 0;
                // Base padding of 0.75rem (px-3), plus 1rem per level
                const paddingLeft = `${0.75 + level * 1}rem`;
                // Slightly smaller font for nested levels
                const fontSize = level === 0 ? 'text-sm' : 'text-xs';
                
                return (
                  <button 
                    key={ch.id || idx}
                    onClick={() => {
                       onPageChange(ch.page_number);
                       if (window.innerWidth < 768) onClose();
                    }}
                    style={{ paddingLeft }}
                    className={`text-left pr-3 py-2 rounded-lg ${fontSize} transition-colors ${isActive ? 'bg-blue-100 text-blue-700 font-medium' : 'hover:bg-slate-200 text-slate-700'}`}
                  >
                    {ch.title}
                  </button>
                );
             })}
           </div>
         )}
       </div>
    </div>
  );
}
