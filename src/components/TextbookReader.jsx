import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useChunkManager } from './useChunkManager';
import ReaderToolbar from './ReaderToolbar';
import ChapterSidebar from './ChapterSidebar';
import ReaderCanvas from './ReaderCanvas';

export default function TextbookReader({ bookId, user, onNavigate }) {
  const { 
    bookMeta, chunks, chapters, initialPage, 
    isLoading, loadingText, error, getPage 
  } = useChunkManager(bookId, user);

  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(1.0);
  const [fitWidth, setFitWidth] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
  const [mode, setMode] = useState('continuous'); // 'continuous' | 'page'

  // Restore user's last saved page on mount
  useEffect(() => {
    if (!isLoading && initialPage) {
      setCurrentPage(initialPage);
    }
  }, [isLoading, initialPage]);

  // Handle Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => console.log(err));
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

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
        <div className="text-red-500 mb-4">{error}</div>
        <button onClick={() => onNavigate('study')} className="text-blue-600 hover:underline">Return to Home</button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 w-full h-full">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4" />
        <div className="text-slate-600 font-medium">{loadingText}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-slate-200 overflow-hidden relative">
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
         isFullscreen={isFullscreen}
         onToggleFullscreen={toggleFullscreen}
         sidebarOpen={sidebarOpen}
         onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
       />
       <div className="flex-1 flex overflow-hidden">
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
       </div>
       
       {/* Small floating mode toggle bottom right */}
       <div className="absolute bottom-6 right-6 flex bg-white shadow-lg rounded-xl overflow-hidden border z-50" style={{ borderColor: '#E2E8F0' }}>
          <button 
            onClick={() => setMode('continuous')}
            className={`px-4 py-2 text-xs font-medium transition-colors ${mode === 'continuous' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            Continuous
          </button>
          <div className="w-px bg-slate-200" />
          <button 
            onClick={() => {
              setMode('page');
              setFitWidth(true); // Fit width is usually best for page mode
            }}
            className={`px-4 py-2 text-xs font-medium transition-colors ${mode === 'page' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            Page-by-Page
          </button>
       </div>
    </div>
  );
}
