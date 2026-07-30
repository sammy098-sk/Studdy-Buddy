import React, { useEffect, useRef, useState, useMemo } from 'react';

const PageRenderer = React.memo(({ pageNum, getPage, zoom, fitWidth, containerWidth }) => {
  const canvasRef = useRef(null);
  const [renderTask, setRenderTask] = useState(null);
  const [pageProxy, setPageProxy] = useState(null);
  const [error, setError] = useState(null);
  const [actualHeight, setActualHeight] = useState(null);

  useEffect(() => {
    let active = true;
    getPage(pageNum).then(p => {
      if (active) setPageProxy(p);
    }).catch(err => {
      if (active) setError(err.message);
    });
    return () => { active = false; };
  }, [pageNum, getPage]);

  useEffect(() => {
    if (!pageProxy || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { alpha: false });
    
    let unscaledViewport = pageProxy.getViewport({ scale: 1.0 });
    let scale = zoom;
    if (fitWidth && containerWidth) {
       scale = (containerWidth - 16) / unscaledViewport.width;
    }
    
    const viewport = pageProxy.getViewport({ scale });
    setActualHeight(viewport.height);
    
    const outputScale = window.devicePixelRatio || 1;
    canvas.width = Math.floor(viewport.width * outputScale);
    canvas.height = Math.floor(viewport.height * outputScale);
    canvas.style.width = Math.floor(viewport.width) + "px";
    canvas.style.height =  Math.floor(viewport.height) + "px";

    const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null;
      
    const renderContext = { canvasContext: ctx, transform: transform, viewport: viewport };

    if (renderTask) {
       try { renderTask.cancel(); } catch(e){}
    }
    
    const task = pageProxy.render(renderContext);
    setRenderTask(task);
    
    task.promise.catch(err => {
       if (err.name !== 'RenderingCancelledException') {
         console.warn("Render error:", err);
       }
    });

    return () => {
      try { task.cancel(); } catch(e){}
    };
  }, [pageProxy, zoom, fitWidth, containerWidth]);

  return (
    <div 
      className="flex flex-col items-center justify-center my-1 bg-white shadow-md relative" 
      style={{ 
        width: fitWidth && containerWidth ? containerWidth - 16 : 'auto',
        minHeight: actualHeight ? actualHeight + 'px' : (fitWidth ? '800px' : (1000 * zoom) + 'px') 
      }}
      data-page={pageNum}
    >
      {error ? (
        <div className="text-red-500 p-4">Failed to load page {pageNum}</div>
      ) : (
        <canvas ref={canvasRef} className="bg-white" />
      )}
      <div className="absolute -bottom-6 text-xs text-slate-400 font-medium">Page {pageNum}</div>
    </div>
  );
});

export default function ReaderCanvas({ totalGlobalPages, getPage, zoom, fitWidth, currentPage, onPageChange, mode }) {
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [visiblePages, setVisiblePages] = useState([]);
  
  // Track viewport dimensions
  useEffect(() => {
    if (containerRef.current) {
      setContainerWidth(containerRef.current.clientWidth);
    }
    const handleResize = () => {
      if (containerRef.current) setContainerWidth(containerRef.current.clientWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Jump to specific page logic
  useEffect(() => {
    // Only auto-scroll if the current page is not already in the visible set
    if (!visiblePages.includes(currentPage) && containerRef.current) {
       const estimatedPageHeight = fitWidth ? ((containerWidth - 16) * 1.3) : (1000 * zoom);
       const targetScroll = (currentPage - 1) * (estimatedPageHeight + 8); // 8px is margin
       containerRef.current.scrollTop = targetScroll;
    }
  }, [currentPage, fitWidth, containerWidth, zoom]);

  // Virtualization via Math Scroll (Continuous Mode)
  const handleScroll = () => {
    if (mode === 'page') return; // handled manually
    if (!containerRef.current) return;
    
    const scrollTop = containerRef.current.scrollTop;
    const clientHeight = containerRef.current.clientHeight;
    
    const estimatedPageHeight = fitWidth ? ((containerWidth - 16) * 1.3) : (1000 * zoom);
    const rowHeight = estimatedPageHeight + 8;
    
    let startIdx = Math.floor(scrollTop / rowHeight);
    let endIdx = Math.floor((scrollTop + clientHeight) / rowHeight);
    
    // Add buffer
    startIdx = Math.max(0, startIdx - 1);
    endIdx = Math.min(totalGlobalPages - 1, endIdx + 1);
    
    const newVis = [];
    for (let i = startIdx; i <= endIdx; i++) {
      newVis.push(i + 1);
    }
    
    setVisiblePages(newVis);
    
    // Update current page strictly to what is mostly in view
    const middleOfScreen = scrollTop + (clientHeight / 2);
    const approxPage = Math.floor(middleOfScreen / rowHeight) + 1;
    if (approxPage !== currentPage && approxPage > 0 && approxPage <= totalGlobalPages) {
      // We wrap this in a timeout to avoid firing 100 times a second and bogging React
      clearTimeout(window.scrollTimeout);
      window.scrollTimeout = setTimeout(() => {
        onPageChange(approxPage);
      }, 50);
    }
  };

  useEffect(() => {
    // Initial mount calculation
    handleScroll();
  }, [containerWidth, zoom, fitWidth]);

  // If in 'page' mode, visible pages is exactly [currentPage]
  const renderList = mode === 'page' ? [currentPage] : visiblePages;

  return (
    <div 
      ref={containerRef} 
      onScroll={handleScroll}
      className={`flex-1 overflow-y-auto bg-slate-200 relative ${mode === 'page' ? 'flex flex-col items-center justify-center p-4' : ''}`}
    >
       {mode === 'continuous' ? (
         <div 
           className="relative mx-auto flex flex-col items-center" 
           style={{ 
             height: `${totalGlobalPages * (fitWidth ? ((containerWidth - 16) * 1.3) + 8 : (1000 * zoom) + 8)}px`
           }}
         >
           {renderList.map(p => (
             <div 
               key={p} 
               className="absolute w-full flex justify-center" 
               style={{ top: `${(p - 1) * (fitWidth ? ((containerWidth - 16) * 1.3) + 8 : (1000 * zoom) + 8)}px` }}
             >
               <PageRenderer 
                 pageNum={p} 
                 getPage={getPage} 
                 zoom={zoom} 
                 fitWidth={fitWidth} 
                 containerWidth={containerWidth} 
               />
             </div>
           ))}
         </div>
       ) : (
         <PageRenderer 
           pageNum={currentPage} 
           getPage={getPage} 
           zoom={zoom} 
           fitWidth={fitWidth} 
           containerWidth={containerWidth} 
         />
       )}
    </div>
  );
}
