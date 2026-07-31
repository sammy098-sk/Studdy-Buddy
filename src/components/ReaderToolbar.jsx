import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, ZoomIn, ZoomOut, Maximize, Minimize, Sidebar, MoreVertical, Settings, Columns, Moon, Bot } from 'lucide-react';

export default function ReaderToolbar({ 
  bookMeta, 
  onBack, 
  currentPage, 
  totalPages, 
  onPageChange,
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomChange,
  onFitWidth,
  fitWidth,
  isFullscreen,
  onToggleFullscreen,
  sidebarOpen,
  onToggleSidebar,
  mode,
  setMode,
  aiSidebarOpen,
  onToggleAiSidebar
}) {
  const [inputPage, setInputPage] = useState(currentPage);
  const [zoomInput, setZoomInput] = useState(Math.round(zoom * 100).toString());
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    setZoomInput(Math.round(zoom * 100).toString());
  }, [zoom]);

  useEffect(() => {
    setInputPage(currentPage);
  }, [currentPage]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePageSubmit = (e) => {
    e.preventDefault();
    const p = parseInt(inputPage, 10);
    if (p > 0 && p <= totalPages) {
      onPageChange(p);
    } else {
      setInputPage(currentPage);
    }
  };

  const progressPercent = totalPages > 0 ? (currentPage / totalPages) * 100 : 0;

  const handleZoomSubmit = (e) => {
    e.preventDefault();
    let val = parseInt(zoomInput.replace('%', ''), 10);
    if (isNaN(val)) {
       setZoomInput(Math.round(zoom * 100).toString());
       return;
    }
    const decimalZoom = val / 100;
    if (onZoomChange) onZoomChange(decimalZoom);
  };

  return (
    <div className="relative flex flex-col shrink-0 bg-white" style={{ zIndex: 10 }}>
      <div className="h-14 border-b flex items-center justify-between px-2 sm:px-4" style={{ borderColor: '#E2E8F0' }}>
         <div className="flex items-center gap-2 sm:gap-4">
           <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors" title="Back to Library">
             <ArrowLeft size={18} />
           </button>
           <button onClick={onToggleSidebar} className={`hidden sm:flex p-2 rounded-lg transition-colors ${sidebarOpen ? 'bg-blue-50 text-blue-600' : 'hover:bg-slate-100 text-slate-600'}`} title="Toggle Chapters">
             <Sidebar size={18} />
           </button>
           <button onClick={onToggleAiSidebar} className={`hidden sm:flex p-2 rounded-lg transition-colors ${aiSidebarOpen ? 'bg-blue-50 text-blue-600' : 'hover:bg-slate-100 text-slate-600'}`} title="StudyBuddy AI Tools">
             <Bot size={18} />
           </button>
           <div className="hidden md:block overflow-hidden">
             <h1 className="font-semibold text-sm text-slate-800 truncate max-w-[200px] lg:max-w-[300px]" title={bookMeta?.title}>
               {bookMeta?.title || 'Textbook'}
             </h1>
             {bookMeta?.author && <p className="text-xs text-slate-500 truncate max-w-[200px]">{bookMeta.author}</p>}
           </div>
         </div>

         {/* Page Input Area */}
         <div className="flex flex-1 sm:flex-none justify-center sm:justify-start items-center gap-3">
           <form onSubmit={handlePageSubmit} className="flex items-center gap-1 sm:gap-2 bg-slate-50 border px-2 py-1 rounded-lg" style={{ borderColor: '#E2E8F0' }}>
             <span className="text-slate-400 font-medium text-sm hidden sm:inline">[</span>
             <input 
               type="number" 
               value={inputPage}
               onChange={(e) => setInputPage(e.target.value)}
               className="w-12 text-center bg-transparent outline-none text-sm font-medium text-slate-700"
               min={1}
               max={totalPages}
             />
             <span className="text-slate-400 font-medium text-sm hidden sm:inline">]</span>
             <span className="text-sm text-slate-400">/ {totalPages}</span>
           </form>
         </div>

         {/* Desktop Controls */}
         <div className="hidden md:flex items-center gap-1">
           <button onClick={onZoomOut} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600" title="Zoom Out">
             <ZoomOut size={18} />
           </button>
           <form onSubmit={handleZoomSubmit} className="flex items-center justify-center relative w-12">
             <input
               type="text"
               value={zoomInput}
               onChange={(e) => setZoomInput(e.target.value)}
               onBlur={handleZoomSubmit}
               className="w-full text-center text-xs font-medium text-slate-600 bg-transparent outline-none focus:bg-slate-50 focus:ring-1 ring-slate-200 rounded py-1"
               title="Custom Zoom"
             />
             <span className="absolute right-1 top-1.5 text-[10px] font-medium text-slate-400 pointer-events-none">%</span>
           </form>
           <button onClick={onZoomIn} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600" title="Zoom In">
             <ZoomIn size={18} />
           </button>
           <div className="w-px h-6 bg-slate-200 mx-2" />
           <button onClick={onFitWidth} className={`px-2 py-1.5 hover:bg-slate-100 rounded-lg text-xs font-medium ${fitWidth ? 'text-blue-600 bg-blue-50' : 'text-slate-600'}`} title="Fit Width">
             Fit
           </button>
           <button onClick={onToggleFullscreen} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 ml-1" title="Fullscreen">
             {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
           </button>
         </div>

         {/* Mobile More / Desktop Settings */}
         <div className="flex items-center gap-2 relative" ref={menuRef}>
            <button onClick={() => setMenuOpen(!menuOpen)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors">
              <MoreVertical size={18} className="md:hidden" />
              <Settings size={18} className="hidden md:block" />
            </button>
            
            {menuOpen && (
              <div className="absolute top-12 right-0 w-64 bg-white shadow-xl rounded-xl border py-2 flex flex-col z-50" style={{ borderColor: '#E2E8F0' }}>
                 <div className="px-4 py-2 border-b md:hidden" style={{ borderColor: '#E2E8F0' }}>
                   <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">View</div>
                   <div className="flex items-center gap-2 mb-2">
                     <button onClick={onZoomOut} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600"><ZoomOut size={16}/></button>
                     
                     <form onSubmit={handleZoomSubmit} className="flex-1 flex items-center justify-center relative">
                       <input
                         type="text"
                         value={zoomInput}
                         onChange={(e) => setZoomInput(e.target.value)}
                         onBlur={handleZoomSubmit}
                         className="w-16 text-center text-sm font-medium text-slate-600 bg-slate-50 outline-none focus:bg-slate-100 focus:ring-1 ring-slate-200 rounded py-1"
                       />
                       <span className="absolute right-[30%] top-1.5 text-xs font-medium text-slate-400 pointer-events-none">%</span>
                     </form>

                     <button onClick={onZoomIn} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600"><ZoomIn size={16}/></button>
                   </div>
                   <button onClick={onFitWidth} className={`w-full text-left px-2 py-1.5 rounded-lg text-sm font-medium ${fitWidth ? 'text-blue-600 bg-blue-50' : 'text-slate-600 hover:bg-slate-50'}`}>
                     Fit to Width
                   </button>
                 </div>
                 
                 <div className="px-4 py-2 border-b" style={{ borderColor: '#E2E8F0' }}>
                   <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Layout Mode</div>
                   <button onClick={() => { setMode('continuous'); setMenuOpen(false); }} className={`w-full text-left px-2 py-1.5 rounded-lg text-sm font-medium ${mode === 'continuous' ? 'text-blue-600 bg-blue-50' : 'text-slate-600 hover:bg-slate-50'}`}>
                     Continuous Scroll
                   </button>
                   <button onClick={() => { setMode('page'); setMenuOpen(false); }} className={`w-full text-left px-2 py-1.5 rounded-lg text-sm font-medium ${mode === 'page' ? 'text-blue-600 bg-blue-50' : 'text-slate-600 hover:bg-slate-50'}`}>
                     Page-by-Page
                   </button>
                 </div>
                 
                 <div className="px-4 py-2">
                   <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Features (Coming Soon)</div>
                   <button disabled className="w-full text-left px-2 py-1.5 rounded-lg text-sm font-medium text-slate-400 flex items-center gap-2 opacity-50 cursor-not-allowed">
                     <Moon size={14} /> Dark Mode
                   </button>
                   <button disabled className="w-full text-left px-2 py-1.5 rounded-lg text-sm font-medium text-slate-400 flex items-center gap-2 opacity-50 cursor-not-allowed">
                     <Columns size={14} /> Two-Page View
                   </button>
                 </div>
                 
                 <div className="px-4 pt-2 border-t md:hidden" style={{ borderColor: '#E2E8F0' }}>
                   <button onClick={() => { onToggleSidebar(); setMenuOpen(false); }} className={`w-full text-left px-2 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 ${sidebarOpen ? 'text-blue-600 bg-blue-50' : 'text-slate-600 hover:bg-slate-50'}`}>
                     <Sidebar size={14} /> Toggle Chapters
                   </button>
                   <button onClick={() => { onToggleAiSidebar(); setMenuOpen(false); }} className={`w-full mt-1 text-left px-2 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 ${aiSidebarOpen ? 'text-blue-600 bg-blue-50' : 'text-slate-600 hover:bg-slate-50'}`}>
                     <Bot size={14} /> StudyBuddy AI
                   </button>
                   <button onClick={() => { onToggleFullscreen(); setMenuOpen(false); }} className="w-full text-left px-2 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 flex items-center gap-2 mt-1">
                     {isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />} {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                   </button>
                 </div>
              </div>
            )}
         </div>
      </div>
      
      {/* Sleek Progress Bar exactly on the bottom border */}
      <div className="h-[2px] w-full bg-slate-100 absolute bottom-0 left-0">
        <div 
          className="h-full bg-blue-600 transition-all duration-300 ease-out" 
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
}
