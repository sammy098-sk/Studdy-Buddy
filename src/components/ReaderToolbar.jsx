import React, { useState } from 'react';
import { ArrowLeft, ZoomIn, ZoomOut, Maximize, Minimize, Sidebar } from 'lucide-react';

export default function ReaderToolbar({ 
  bookMeta, 
  onBack, 
  currentPage, 
  totalPages, 
  onPageChange,
  zoom,
  onZoomIn,
  onZoomOut,
  onFitWidth,
  isFullscreen,
  onToggleFullscreen,
  sidebarOpen,
  onToggleSidebar
}) {
  const [inputPage, setInputPage] = useState(currentPage);

  React.useEffect(() => {
    setInputPage(currentPage);
  }, [currentPage]);

  const handlePageSubmit = (e) => {
    e.preventDefault();
    const p = parseInt(inputPage, 10);
    if (p > 0 && p <= totalPages) {
      onPageChange(p);
    } else {
      setInputPage(currentPage);
    }
  };

  return (
    <div className="h-14 border-b flex items-center justify-between px-4 shrink-0 bg-white" style={{ borderColor: '#E2E8F0', zIndex: 10 }}>
       <div className="flex items-center gap-4">
         <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors" title="Back to Library">
           <ArrowLeft size={18} />
         </button>
         <button onClick={onToggleSidebar} className={`p-2 rounded-lg transition-colors ${sidebarOpen ? 'bg-blue-50 text-blue-600' : 'hover:bg-slate-100 text-slate-600'}`} title="Toggle Chapters">
           <Sidebar size={18} />
         </button>
         <div className="hidden md:block">
           <h1 className="font-semibold text-sm text-slate-800 truncate max-w-[200px]" title={bookMeta?.title}>
             {bookMeta?.title || 'Textbook'}
           </h1>
           {bookMeta?.author && <p className="text-xs text-slate-500 truncate max-w-[200px]">{bookMeta.author}</p>}
         </div>
       </div>

       <div className="flex items-center gap-3">
         <form onSubmit={handlePageSubmit} className="flex items-center gap-2 bg-slate-50 border px-2 py-1 rounded-lg" style={{ borderColor: '#E2E8F0' }}>
           <input 
             type="number" 
             value={inputPage}
             onChange={(e) => setInputPage(e.target.value)}
             className="w-12 text-center bg-transparent outline-none text-sm font-medium text-slate-700"
             min={1}
             max={totalPages}
           />
           <span className="text-sm text-slate-400">/ {totalPages}</span>
         </form>
       </div>

       <div className="flex items-center gap-1">
         <button onClick={onZoomOut} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600" title="Zoom Out">
           <ZoomOut size={18} />
         </button>
         <span className="text-xs font-medium w-12 text-center text-slate-600">{Math.round(zoom * 100)}%</span>
         <button onClick={onZoomIn} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600" title="Zoom In">
           <ZoomIn size={18} />
         </button>
         <div className="w-px h-6 bg-slate-200 mx-2" />
         <button onClick={onFitWidth} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 text-xs font-medium" title="Fit Width">
           Fit
         </button>
         <button onClick={onToggleFullscreen} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 ml-1" title="Fullscreen">
           {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
         </button>
       </div>
    </div>
  );
}
