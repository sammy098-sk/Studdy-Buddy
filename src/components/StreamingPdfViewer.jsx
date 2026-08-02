import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw,
  Loader2, AlertCircle, Bookmark, BookmarkCheck, ArrowLeft,
} from 'lucide-react';
import { supabase } from '../supabase';
import studyToolsService from '../services/StudyToolsService';


// ─── Worker: bundled locally — never loaded from CDN ────────────────────────
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const CHUNK_SIZE = 65536; // 64 KB — range-request chunk size

// ─── CSS injected once for text-layer selection support ─────────────────────
const TEXT_LAYER_STYLE = `
.sb-textlayer {
  position: absolute;
  inset: 0;
  overflow: hidden;
  line-height: 1;
  pointer-events: none;
}
.sb-textlayer span,
.sb-textlayer br {
  color: transparent;
  position: absolute;
  white-space: pre;
  cursor: text;
  transform-origin: 0% 0%;
  pointer-events: auto;
}
.sb-textlayer ::selection {
  background: rgba(41, 84, 229, 0.25);
  color: transparent;
}
`;

function injectStyles() {
  if (document.getElementById('sb-pdfjs-styles')) return;
  const el = document.createElement('style');
  el.id = 'sb-pdfjs-styles';
  el.textContent = TEXT_LAYER_STYLE;
  document.head.appendChild(el);
}

// ─── Individual page renderer ────────────────────────────────────────────────
function PdfPage({ pageNum, pdfDoc, scale, onBecomeVisible, bookId }) {
  const wrapRef      = useRef(null);
  const canvasRef    = useRef(null);
  const textRef      = useRef(null);
  const renderRef    = useRef(null);
  const inViewRef    = useRef(false);

  const [ready, setReady]         = useState(false);
  const [pageSize, setPageSize]   = useState({ w: 816, h: 1056 });

  const renderPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current) return;
    renderRef.current?.cancel?.();
    setReady(false);

    try {
      const page     = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale });
      setPageSize({ w: viewport.width, h: viewport.height });

      const canvas = canvasRef.current;
      if (!canvas) { page.cleanup(); return; }
      const ctx = canvas.getContext('2d');
      canvas.width  = viewport.width;
      canvas.height = viewport.height;

      const task = page.render({ canvasContext: ctx, viewport });
      renderRef.current = task;
      await task.promise;

      // Text layer — enables text selection
      if (textRef.current) {
        const textContent = await page.getTextContent();
        const textStr = (textContent.items || []).map(i => i.str || '').join(' ').replace(/\s+/g, ' ').trim();
        if (bookId) {
          studyToolsService.cacheExtractedText(bookId, pageNum, textStr);
        }
        textRef.current.innerHTML = '';
        const tl = pdfjsLib.renderTextLayer({
          textContentSource: textContent,
          container: textRef.current,
          viewport,
          textDivs: [],
        });
        if (tl?.promise) await tl.promise;
      }

      page.cleanup();
      setReady(true);
    } catch (err) {
      if (err?.name !== 'RenderingCancelledException') {
        console.warn(`[StreamingPdf] page ${pageNum}:`, err.message);
      }
    }
  }, [pdfDoc, pageNum, scale]);

  // IntersectionObserver — lazy render & current-page tracking
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || !pdfDoc) return;

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          inViewRef.current = true;
          onBecomeVisible(pageNum);
          renderPage();
        } else {
          inViewRef.current = false;
        }
      },
      { rootMargin: '600px 0px', threshold: 0 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [pdfDoc, pageNum, renderPage, onBecomeVisible]);

  // Re-render visible pages on zoom change
  useEffect(() => {
    if (inViewRef.current) renderPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scale]);

  // Cleanup on unmount
  useEffect(() => () => renderRef.current?.cancel?.(), []);

  return (
    <div
      id={`sb-page-${pageNum}`}
      ref={wrapRef}
      style={{
        position: 'relative',
        width:  ready ? pageSize.w : Math.max(pageSize.w, 400),
        height: ready ? pageSize.h : pageSize.h,
        minHeight: 400,
        marginBottom: 12,
        boxShadow: '0 2px 12px rgba(0,0,0,0.35)',
        background: '#fff',
        flexShrink: 0,
      }}
    >
      {/* Placeholder while rendering */}
      {!ready && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: 8, background: '#f8fafc',
        }}>
          <Loader2 size={20} className="animate-spin" style={{ color: '#94a3b8' }} />
          <span style={{ fontSize: 11, color: '#94a3b8' }}>Page {pageNum}</span>
        </div>
      )}
      <canvas ref={canvasRef} style={{ display: ready ? 'block' : 'none' }} />
      <div ref={textRef} className="sb-textlayer" />
    </div>
  );
}

// ─── Main StreamingPdfViewer ─────────────────────────────────────────────────
export default function StreamingPdfViewer({ textbook, onBack }) {
  const [signedUrl,   setSignedUrl]   = useState(null);
  const [pdfDoc,      setPdfDoc]      = useState(null);
  const [totalPages,  setTotalPages]  = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput,   setPageInput]   = useState('1');
  const [zoomFactor,  setZoomFactor]  = useState(1.0);
  const [scale,       setScale]       = useState(1.0);
  const [isLoading,   setIsLoading]   = useState(true);
  const [progress,    setProgress]    = useState(0);
  const [showProgress, setShowProgress] = useState(false);
  const [error,       setError]       = useState(null);
  const [bookmarked,  setBookmarked]  = useState(false);

  const scrollRef        = useRef(null);
  const pdfDocRef        = useRef(null);
  const baseScaleRef     = useRef(1.0);
  const resizeObsRef     = useRef(null);
  const bookmarkKey      = `sb_pdf_${textbook?.id}`;

  // Inject text-selection CSS once
  useEffect(() => { injectStyles(); }, []);

  // ── Step 1: Generate signed URL ──────────────────────────────────────────
  useEffect(() => {
    if (!textbook?.pdf_path) {
      setError('No PDF file is associated with this textbook.');
      setIsLoading(false);
      return;
    }
    supabase.storage
      .from('textbooks-pdf')
      .createSignedUrl(textbook.pdf_path, 3600)
      .then(({ data, error: e }) => {
        if (e || !data?.signedUrl) {
          setError('Could not generate a secure PDF link. Please try again.');
          setIsLoading(false);
        } else {
          setSignedUrl(data.signedUrl);
        }
      });
  }, [textbook?.pdf_path]);

  // ── Step 2: Load PDF via streaming range requests ────────────────────────
  useEffect(() => {
    if (!signedUrl) return;
    let task;

    const load = async () => {
      try {
        task = pdfjsLib.getDocument({
          url: signedUrl,
          rangeChunkSize: CHUNK_SIZE,
          disableAutoFetch: false,
          disableStream: false,
        });

        // Show download progress only when server doesn't support streaming
        let firstProgress = true;
        task.onProgress = ({ loaded, total }) => {
          if (firstProgress && total > 0 && loaded < total) {
            firstProgress = false;
            setShowProgress(true);
          }
          if (total > 0) setProgress(Math.round((loaded / total) * 100));
        };

        const doc = await task.promise;
        pdfDocRef.current = doc;

        // Compute base scale from container width ÷ page 1 width
        const p1       = await doc.getPage(1);
        const vp       = p1.getViewport({ scale: 1.0 });
        const cw       = scrollRef.current?.clientWidth || window.innerWidth - 40;
        const bs       = Math.max(0.3, (cw - 40) / vp.width);
        baseScaleRef.current = bs;
        p1.cleanup();

        setPdfDoc(doc);
        studyToolsService.registerPageProvider(textbook?.id || 'active', (n) => doc.getPage(n), textbook?.title || 'Textbook');
        setTotalPages(doc.numPages);
        setScale(bs * zoomFactor);
        setIsLoading(false);

        // Restore bookmark
        const saved = localStorage.getItem(bookmarkKey);
        if (saved) {
          const n = parseInt(saved, 10);
          if (n > 1 && n <= doc.numPages) {
            setBookmarked(true);
            setTimeout(() => {
              setCurrentPage(n);
              setPageInput(String(n));
              scrollToPage(n);
            }, 400);
          }
        }
      } catch (err) {
        setError(`Failed to load PDF: ${err.message}`);
        setIsLoading(false);
      }
    };

    load();
    return () => {
      task?.destroy?.();
      pdfDocRef.current?.destroy?.();
      pdfDocRef.current = null;
    };
  }, [signedUrl]);

  // ── Recalculate scale when zoom or container width changes ───────────────
  useEffect(() => {
    setScale(baseScaleRef.current * zoomFactor);
  }, [zoomFactor]);

  // ── ResizeObserver: recalculate base scale when container resizes ────────
  useEffect(() => {
    if (!scrollRef.current || !pdfDoc) return;
    resizeObsRef.current = new ResizeObserver(() => {
      const cw = scrollRef.current?.clientWidth || window.innerWidth - 40;
      const bs = Math.max(0.3, (cw - 40) / (scale / zoomFactor));
      baseScaleRef.current = bs;
      setScale(bs * zoomFactor);
    });
    resizeObsRef.current.observe(scrollRef.current);
    return () => resizeObsRef.current?.disconnect();
  }, [pdfDoc]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const scrollToPage = (n) => {
    const el = document.getElementById(`sb-page-${n}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const goToPage = useCallback((n) => {
    const safe = Math.min(Math.max(1, n), totalPages);
    setCurrentPage(safe);
    setPageInput(String(safe));
    scrollToPage(safe);
  }, [totalPages]);

  const onPageVisible = useCallback((n) => {
    setCurrentPage(n);
    setPageInput(String(n));
  }, []);

  const toggleBookmark = () => {
    if (bookmarked) {
      localStorage.removeItem(bookmarkKey);
      setBookmarked(false);
    } else {
      localStorage.setItem(bookmarkKey, String(currentPage));
      setBookmarked(true);
    }
  };

  // ── Error screen ──────────────────────────────────────────────────────────
  if (error) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 40 }}>
        <AlertCircle size={48} color="#ef4444" />
        <p style={{ color: '#374151', fontSize: 15, textAlign: 'center', maxWidth: 420 }}>{error}</p>
        <button onClick={onBack} style={{ padding: '10px 24px', borderRadius: 10, background: '#2954E5', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
          ← Go Back
        </button>
      </div>
    );
  }

  const zoomPct = Math.round(zoomFactor * 100);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#3a3b3c', overflow: 'hidden' }}>

      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px',
        background: '#1e293b', color: '#fff', flexShrink: 0, flexWrap: 'wrap',
        userSelect: 'none',
      }}>
        {/* Back */}
        <button
          onClick={onBack}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 7, background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
        >
          <ArrowLeft size={14} /> Back
        </button>

        {/* Title */}
        <span style={{ flex: 1, fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#e2e8f0', minWidth: 0 }}>
          {textbook?.title}
        </span>

        {/* Page navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1 || isLoading}
            style={{ padding: '4px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', cursor: 'pointer', opacity: currentPage <= 1 ? 0.35 : 1 }}
          >
            <ChevronLeft size={15} />
          </button>

          <input
            id="pdf-page-input"
            name="pdf-page-input"
            type="number"
            value={pageInput}
            onChange={e => setPageInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') goToPage(parseInt(pageInput, 10) || 1); }}
            onBlur={() => goToPage(parseInt(pageInput, 10) || 1)}
            style={{ width: 48, textAlign: 'center', padding: '4px 2px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.12)', color: '#fff', fontSize: 13 }}
          />

          <span style={{ fontSize: 12, color: '#94a3b8', whiteSpace: 'nowrap' }}>/ {totalPages || '—'}</span>

          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= totalPages || isLoading}
            style={{ padding: '4px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', cursor: 'pointer', opacity: currentPage >= totalPages ? 0.35 : 1 }}
          >
            <ChevronRight size={15} />
          </button>
        </div>

        {/* Zoom */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button onClick={() => setZoomFactor(z => Math.max(z / 1.25, 0.25))} style={{ padding: '4px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', cursor: 'pointer' }}>
            <ZoomOut size={15} />
          </button>
          <span style={{ fontSize: 12, color: '#cbd5e1', minWidth: 38, textAlign: 'center' }}>{zoomPct}%</span>
          <button onClick={() => setZoomFactor(z => Math.min(z * 1.25, 4.0))} style={{ padding: '4px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', cursor: 'pointer' }}>
            <ZoomIn size={15} />
          </button>
          <button onClick={() => setZoomFactor(1.0)} title="Reset zoom" style={{ padding: '4px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', cursor: 'pointer' }}>
            <RotateCcw size={13} />
          </button>
        </div>

        {/* Bookmark */}
        <button
          onClick={toggleBookmark}
          title={bookmarked ? `Bookmarked at page ${currentPage} — click to remove` : 'Bookmark current page'}
          style={{ padding: '4px 8px', borderRadius: 6, background: bookmarked ? '#2954E5' : 'rgba(255,255,255,0.1)', color: '#fff', border: 'none', cursor: 'pointer' }}
        >
          {bookmarked ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
        </button>
      </div>

      {/* ── Download progress bar (only when server doesn't support streaming) ── */}
      {showProgress && progress < 100 && (
        <div style={{ height: 3, background: '#1e293b', flexShrink: 0 }}>
          <div style={{ height: '100%', width: `${progress}%`, background: '#2954E5', transition: 'width 0.4s ease' }} />
        </div>
      )}

      {/* ── Loading state ──────────────────────────────────────────────────── */}
      {isLoading && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
          <Loader2 size={38} className="animate-spin" style={{ color: '#2954E5' }} />
          <p style={{ color: '#94a3b8', fontSize: 14 }}>
            {showProgress && progress > 0
              ? `Downloading PDF… ${progress}%`
              : 'Connecting to PDF stream…'}
          </p>
          <p style={{ color: '#64748b', fontSize: 12 }}>Large files stream — first page appears in seconds</p>
        </div>
      )}

      {/* ── Page scroll area ────────────────────────────────────────────────── */}
      {!isLoading && pdfDoc && (
        <div
          ref={scrollRef}
          style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', padding: '20px 0' }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
              <PdfPage
                key={`p${n}-z${zoomFactor.toFixed(2)}`}
                bookId={textbook?.id}
                pageNum={n}
                pdfDoc={pdfDoc}
                scale={scale}
                onBecomeVisible={onPageVisible}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
