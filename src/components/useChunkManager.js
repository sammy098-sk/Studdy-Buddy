import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase';
import * as pdfjsLib from 'pdfjs-dist';

export function useChunkManager(bookId, user) {
  const [chunks, setChunks] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [bookMeta, setBookMeta] = useState(null);
  const [initialPage, setInitialPage] = useState(1);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadingText, setLoadingText] = useState('Initializing reader...');
  const [isPreloading, setIsPreloading] = useState(false);
  const [preloadError, setPreloadError] = useState(null);

  const loadedDocs = useRef({}); // { chunkIndex: PDFDocumentProxy }
  const downloadingChunks = useRef({}); // { chunkIndex: Promise }
  const preloadRetryRef = useRef({}); // { chunkIndex: retryCount }

  useEffect(() => {
    let isMounted = true;
    
    async function init() {
      if (!bookId) return;
      try {
        setIsLoading(true);
        setLoadingText('Fetching textbook metadata...');
        
        // 1. Fetch Book Meta
        const { data: book, error: bookErr } = await supabase
          .from('textbooks')
          .select('*')
          .eq('id', bookId)
          .single();
        if (bookErr) throw bookErr;

        // 2. Fetch Chunks
        const { data: chunkData, error: chunkErr } = await supabase
          .from('textbook_chunks')
          .select('*')
          .eq('book_id', bookId)
          .order('part_number', { ascending: true });
        if (chunkErr) throw chunkErr;

        // 3. Fetch Chapters
        const { data: chapterData, error: chapErr } = await supabase
          .from('textbook_chapters')
          .select('*')
          .eq('book_id', bookId)
          .order('page_number', { ascending: true });
        if (chapErr) console.warn("Failed to load chapters:", chapErr);

        // 4. Fetch Reading Progress
        let startPage = 1;
        if (user) {
          const { data: progress } = await supabase
            .from('reading_progress')
            .select('current_page')
            .eq('user_id', user.id)
            .eq('book_id', bookId)
            .single();
          if (progress?.current_page) {
            startPage = progress.current_page;
          }
        }

        if (isMounted) {
          setBookMeta(book);
          setChunks(chunkData || []);
          setChapters(chapterData || []);
          setInitialPage(startPage);
          setIsLoading(false);
        }
      } catch (err) {
        console.error("Reader Init Error:", err);
        if (isMounted) {
          setError(err.message || "Failed to load textbook data.");
          setIsLoading(false);
        }
      }
    }
    
    init();

    return () => {
      isMounted = false;
      // Cleanup all loaded PDFs on unmount
      Object.values(loadedDocs.current).forEach(doc => {
        try { doc.destroy(); } catch(e){}
      });
      loadedDocs.current = {};
    };
  }, [bookId, user]);

  const loadChunk = async (chunkIndex, isPreloadAction = false) => {
    if (loadedDocs.current[chunkIndex]) {
      return loadedDocs.current[chunkIndex];
    }
    if (downloadingChunks.current[chunkIndex]) {
      return downloadingChunks.current[chunkIndex];
    }

    const chunk = chunks[chunkIndex];
    if (!chunk) throw new Error("Chunk not found.");
    
    if (isPreloadAction) {
       setIsPreloading(true);
       setPreloadError(null);
    }

    const downloadPromise = (async () => {
      try {
        const { data, error } = await supabase.storage
          .from('textbooks-pdf')
          .download(chunk.storage_path);
          
        if (error) throw error;
        
        const arrayBuffer = await data.arrayBuffer();
        const doc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        
        loadedDocs.current[chunkIndex] = doc;
        delete downloadingChunks.current[chunkIndex];
        if (isPreloadAction) setIsPreloading(false);
        return doc;
      } catch (err) {
        delete downloadingChunks.current[chunkIndex];
        
        if (isPreloadAction) {
           const retries = preloadRetryRef.current[chunkIndex] || 0;
           if (retries < 3) {
              setPreloadError("Retrying next section...");
              preloadRetryRef.current[chunkIndex] = retries + 1;
              setTimeout(() => loadChunk(chunkIndex, true), 2000);
           } else {
              setPreloadError("Failed to load upcoming pages.");
           }
        }
        throw err;
      }
    })();

    downloadingChunks.current[chunkIndex] = downloadPromise;
    return downloadPromise;
  };

  const getPage = async (globalPageNum) => {
    // 1. Find which chunk contains this page
    const chunkIndex = chunks.findIndex(c => globalPageNum >= c.first_page && globalPageNum <= c.last_page);
    if (chunkIndex === -1) throw new Error(`Page ${globalPageNum} is out of bounds.`);
    
    const chunk = chunks[chunkIndex];
    
    // 2. Ensure chunk is loaded
    const doc = await loadChunk(chunkIndex);
    
    // 3. Preload Next Chunk if we are near the end of this one (within 15 pages)
    if (chunk.last_page - globalPageNum < 15 && chunkIndex + 1 < chunks.length) {
      if (!loadedDocs.current[chunkIndex + 1] && !downloadingChunks.current[chunkIndex + 1]) {
         loadChunk(chunkIndex + 1, true).catch(e => console.warn("Preload failed:", e));
      }
    }

    // 4. Memory Management: Unload old chunks
    const keepIndices = new Set([chunkIndex - 1, chunkIndex, chunkIndex + 1]);
    Object.keys(loadedDocs.current).forEach(idxStr => {
      const idx = parseInt(idxStr, 10);
      if (!keepIndices.has(idx)) {
         try {
           loadedDocs.current[idx].destroy();
         } catch(e) {}
         delete loadedDocs.current[idx];
      }
    });

    // 5. Get Local Page
    const localPageNum = globalPageNum - chunk.first_page + 1;
    const page = await doc.getPage(localPageNum);
    return page;
  };

  return {
    bookMeta,
    chunks,
    chapters,
    initialPage,
    isLoading,
    loadingText,
    error,
    getPage,
    totalChunks: chunks.length,
    isPreloading,
    preloadError,
    retryPreload: (globalPageNum) => {
       // Identify which chunk should be loading
       const chunkIndex = chunks.findIndex(c => c.first_page > globalPageNum);
       if (chunkIndex !== -1) loadChunk(chunkIndex, true);
    }
  };
}
