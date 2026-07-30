import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import { useChunkManager } from './useChunkManager';
import ReaderToolbar from './ReaderToolbar';
import ChapterSidebar from './ChapterSidebar';
import ReaderCanvas from './ReaderCanvas';

export default function TextbookReader({ bookId, user, onNavigate }) {
  const { 
    bookMeta, chunks, chapters, initialPage, 
    isLoading, loadingText, error, getPage,
    isPreloading, preloadError, retryPreload
  } = useChunkManager(bookId, user);

  const [currentPage, setCurrentPage] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
  const [showHUD, setShowHUD] = useState(false);
  const hudTimeoutRef = useRef(null);

  // Persistent Settings
  const [zoom, setZoom] = useState(() => {
    return parseFloat(localStorage.getItem('sb_reader_zoom')) || 1.0;
  });
  const [fitWidth, setFitWidth] = useState(() => {
    const val = localStorage.getItem('sb_reader_fit');
    return val !== null ? val === 'true' : true; // Default true!
  });
  const [mode, setMode] = useState(() => {
    return localStorage.getItem('sb_reader_mode') || 'continuous';
  });

  // Save Settings
  useEffect(() => { localStorage.setItem('sb_reader_zoom', zoom); }, [zoom]);
  useEffect(() => { localStorage.setItem('sb_reader_fit', fitWidth); }, [fitWidth]);
  useEffect(() => { localStorage.setItem('sb_reader_mode', mode); }, [mode]);

  // Handle Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => console.log(err));
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
    }
  };

  // Sync fullscreen state natively
  useEffect(() => {
    const handleFSChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFSChange);
    return () => document.removeEventListener('fullscreenchange', handleFSChange);
  }, []);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't interfere with inputs
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          e.preventDefault();
          setCurrentPage(p => Math.min(bookMeta?.total_pages || 1, p + 1));
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          setCurrentPage(p => Math.max(1, p - 1));
          break;
        case '+':
        case '=':
          e.preventDefault();
          setFitWidth(false);
          setZoom(z => Math.min(z + 0.25, 3.0));
          break;
        case '-':
        case '_':
          e.preventDefault();
          setFitWidth(false);
          setZoom(z => Math.max(z - 0.25, 0.5));
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [bookMeta]);

  // Restore user's last saved page on mount
  useEffect(() => {
    if (!isLoading && initialPage) {
      setCurrentPage(initialPage);
    }
  }, [isLoading, initialPage]);

  // Show Floating HUD on page change
  useEffect(() => {
    if (isLoading) return;
    setShowHUD(true);
    if (hudTimeoutRef.current) clearTimeout(hudTimeoutRef.current);
    hudTimeoutRef.current = setTimeout(() => setShowHUD(false), 1500);
  }, [currentPage, isLoading]);

  // Persist Reading Progress
  useEffect(() => {
    if (!user || !bookId || isLoading) return;
    const saveProgress = async () => {
       await supabase.from('reading_progress').upsert({
         user_id: user.id,
         book_id: bookId,
         current_page: currentPage,
         last_read_at: new Date().toISOString()
       }, { onConflict: 'user_id,book_id' }).catch(err => console.warn('Failed to save progress:', err));
    };
    const timer = setTimeout(saveProgress, 2000); // debounce save
    return () => clearTimeout(timer);
  }, [currentPage, user, bookId, isLoading]);

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 w-full h-full">
        <div className="text-red-500 mb-4 font-medium">{error}</div>
        <button onClick={() => onNavigate('study')} className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700">Return to Home</button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 w-full h-full">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4" />
        <div className="text-slate-600 font-medium animate-pulse">{loadingText}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-[#E2E8F0] overflow-hidden relative" style={{ touchAction: 'pan-y' }}>
       <ReaderToolbar 
         bookMeta={bookMeta}
         onBack={() => onNavigate('importer')} 
         currentPage={currentPage}
         totalPages={bookMeta?.total_pages || 1}
         onPageChange={setCurrentPage}
         zoom={zoom}
         onZoomIn={() => { setZoom(z => Math.min(z + 0.25, 3.0)); setFitWidth(false); }}
         onZoomOut={() => { setZoom(z => Math.max(z - 0.25, 0.5)); setFitWidth(false); }}
         onFitWidth={() => { setFitWidth(true); setZoom(1.0); }}
         fitWidth={fitWidth}
         isFullscreen={isFullscreen}
         onToggleFullscreen={toggleFullscreen}
         sidebarOpen={sidebarOpen}
         onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
         mode={mode}
         setMode={setMode}
       />
       <div className="flex-1 flex overflow-hidden relative">
         <ChapterSidebar 
           chapters={chapters} 
           isOpen={sidebarOpen} 
           onClose={() => setSidebarOpen(false)} 
           currentPage={currentPage}
           onPageChange={setCurrentPage}
         />
         <ReaderCanvas 
           totalGlobalPages={bookMeta?.total_pages || 1}
           getPage={getPage}
           zoom={zoom}
           fitWidth={fitWidth}
           currentPage={currentPage}
           onPageChange={setCurrentPage}
           mode={mode}
         />

         {/* Floating HUD (Page Number Overlay) */}
         <div 
           className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/60 text-white px-6 py-3 rounded-2xl backdrop-blur-sm pointer-events-none transition-opacity duration-300 z-50 shadow-2xl ${showHUD ? 'opacity-100' : 'opacity-0'}`}
         >
           <span className="font-semibold text-lg drop-shadow-md">Page {currentPage} / {bookMeta?.total_pages || 1}</span>
         </div>

         {/* Preloading Status Pill */}
         {(isPreloading || preloadError) && (
           <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-40 pointer-events-none transition-opacity duration-300">
             <div className={`px-4 py-2 rounded-full text-sm font-medium shadow-lg backdrop-blur-md flex items-center gap-2 ${preloadError ? 'bg-red-500/90 text-white' : 'bg-slate-800/80 text-white'}`}>
               {!preloadError && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
               {preloadError || "Loading upcoming pages..."}
               {preloadError && (
                 <button 
                   onClick={() => retryPreload(currentPage)}
                   className="pointer-events-auto ml-2 bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded text-xs transition-colors"
                 >
                   Retry
                 </button>
               )}
             </div>
           </div>
         )}
       </div>
    </div>
  );
}
