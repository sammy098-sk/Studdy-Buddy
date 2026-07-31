import React, { useState } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, Server, RefreshCw, BookOpen, XCircle, ShieldCheck } from 'lucide-react';
import { SUBJECTS } from '../config';
import { supabase } from '../supabase';
import BackToHomeButton from './BackToHomeButton';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function calculateSHA256(arrayBuffer) {
  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts = [];
  if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
  if (minutes > 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds} second${seconds !== 1 ? 's' : ''}`);
  
  return parts.join(' ');
}

export default function TextbookImporter({ onNavigate, user }) {
  const [file, setFile] = useState(null);
  const [fileStats, setFileStats] = useState(null);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState(SUBJECTS[0] || 'Mathematics');
  const [author, setAuthor] = useState('');
  
  // Progress tracking
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [errorMessage, setErrorMessage] = useState(null);

  // Verification Summary State
  const [adminSummary, setAdminSummary] = useState(null);
  const startTimeRef = React.useRef(null);

  // Retry & Job state
  const [jobId, setJobId] = useState(null);
  const [failedChunkIndex, setFailedChunkIndex] = useState(null);
  const [pendingChunks, setPendingChunks] = useState([]);
  const [parentBookId, setParentBookId] = useState(null);

  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (selectedFile.type !== 'application/pdf' && !selectedFile.name.endsWith('.pdf')) {
      setErrorMessage('Please select a valid PDF file.');
      return;
    }

    setFile(selectedFile);
    setTitle(selectedFile.name.replace(/\.pdf$/i, '').replace(/[-_]/g, ' '));
    setErrorMessage(null);
    setAdminSummary(null);
    setFailedChunkIndex(null);
    setPendingChunks([]);
    setJobId(null);
    
    setStatusText('Reading PDF...');
    setIsProcessing(true);
    setProgressPercent(2);
    try {
      const buffer = await selectedFile.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
      
      let extractedChapters = [];
      try {
        const outline = await pdf.getOutline();
        
        async function processOutline(items, level = 0, parentId = null) {
          if (!items) return;
          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            let dest = item.dest;
            if (typeof dest === 'string') {
              dest = await pdf.getDestination(dest);
            }
            
            let id = crypto.randomUUID();
            let validEntry = false;
            
            if (dest) {
              const pageRef = dest[0];
              const pageIndex = await pdf.getPageIndex(pageRef).catch(() => -1);
              if (pageIndex !== -1) {
                extractedChapters.push({
                  id,
                  title: item.title,
                  page_number: pageIndex + 1,
                  level,
                  parent_id: parentId,
                  order_index: i
                });
                validEntry = true;
              }
            }
            
            if (item.items && item.items.length > 0) {
              await processOutline(item.items, validEntry ? level + 1 : level, validEntry ? id : parentId);
            }
          }
        }

        if (outline && outline.length > 0) {
          setStatusText('Extracting nested table of contents...');
          await processOutline(outline);
          
          console.log("Outline found");
          console.log("Top-level bookmarks:", outline.length);
          console.log("Recursive bookmarks:", extractedChapters.length);
        } else {
          console.log("Outline found: false");
        }
        
        // 1. Only ignore the PDF Outline if it is completely empty, or contains only a single root item with no children.
        // 2. If it contains 2 or more meaningful entries recursively, keep it!
        let useOutline = extractedChapters.length >= 2;
        
        console.log("Using PDF Outline:", useOutline);
        console.log("Fallback scanner executed:", !useOutline);
        
        if (!useOutline) {
          if (extractedChapters.length > 0) {
            console.log("Reason for fallback: Outline only contains a single root item with no children.");
          } else {
            console.log("Reason for fallback: Outline is completely empty or missing.");
          }
          
          extractedChapters = [];
          setStatusText('Scanning for chapter headings...');
          const pagesToScan = Math.min(pdf.numPages, 100);
          let orderIdx = 0;
          for (let i = 1; i <= pagesToScan; i++) {
            try {
               const page = await pdf.getPage(i);
               const textContent = await page.getTextContent();
               
               let textItems = textContent.items.map(it => ({ str: it.str.trim(), fontSize: it.transform[0], y: Math.round(it.transform[5]) })).filter(it => it.str);
               
               // Build fullText with \n for different Y coordinates to preserve visual structure
               let fullText = "";
               let lastY = null;
               for (const item of textItems) {
                  if (lastY !== null && Math.abs(item.y - lastY) > 5) {
                     fullText += "\n";
                  } else if (fullText.length > 0 && !fullText.endsWith("\n")) {
                     fullText += " ";
                  }
                  fullText += item.str;
                  lastY = item.y;
               }
               
               // Re-join hyphenated words across newlines (e.g. Chemi-\ncal)
               fullText = fullText.replace(/-\n/g, "");
               
               let possibleHeading = "";
               let currentLevel = 0;
               
               // Look for "Chapter X" or "Unit X" stopping at double-newline or period
               const chapMatch = fullText.match(/(?:Chapter|Unit|Part)\s+\d+(?:[\:\-\.\s]+([A-Za-z](?:(?!\n\n|\.).)*))?/i);
               
               if (chapMatch) {
                  possibleHeading = chapMatch[0].replace(/\n/g, " ").trim();
                  currentLevel = 0;
               } else {
                  // Look for "Concept X.Y" or "Section X.Y"
                  const conceptMatch = fullText.match(/(?:Concept|Section)\s+\d+\.\d+(?:[\:\-\.\s]+([A-Za-z](?:(?!\n\n|\.).)*))?/i);
                  if (conceptMatch) {
                     possibleHeading = conceptMatch[0].replace(/\n/g, " ").trim();
                     currentLevel = 1;
                  }
               }
               
               if (possibleHeading) {
                  // Strip trailing standalone numbers (likely page numbers)
                  possibleHeading = possibleHeading.replace(/\s+\d+$/, "").trim();
                  if (possibleHeading.length > 100) {
                    possibleHeading = possibleHeading.substring(0, 100) + "...";
                  }
                  
                  extractedChapters.push({
                     id: crypto.randomUUID(),
                     title: possibleHeading,
                     page_number: i,
                     level: currentLevel,
                     parent_id: null,
                     order_index: orderIdx++
                  });
               }
            } catch (pageErr) {
               console.warn(`Failed to process page ${i} during fallback scan:`, pageErr);
            }
          }
        }
        
        // Post-processing cleanup and Tree construction
        if (extractedChapters.length > 0) {
           setStatusText('Cleaning up table of contents...');
           
           // 1. Filter out obvious fluff
           const ignoreRegex = /^(featured figures|brief contents|supplements|detailed contents|title page|half title)$/i;
           extractedChapters = extractedChapters.filter(ch => !ignoreRegex.test(ch.title.trim()));
           
           // 2. Strict Deduplication by prefix
           const seenPrefixes = new Map();
           extractedChapters = extractedChapters.filter(ch => {
              let key = ch.title.trim().toLowerCase();
              const prefixMatch = key.match(/^(chapter|unit|part|concept|section)\s+\d+(\.\d+)?/i);
              if (prefixMatch) {
                 key = prefixMatch[0]; 
              }
              if (seenPrefixes.has(key)) {
                 return false;
              }
              seenPrefixes.set(key, ch.page_number);
              return true;
           });
           
           // 3. Sort strictly by page number, then by level
           extractedChapters.sort((a, b) => {
              if (a.page_number === b.page_number) {
                 return (a.level || 0) - (b.level || 0);
              }
              return a.page_number - b.page_number;
           });
           
           // 4. Build Hierarchy (Front Matter -> Chapters -> Back Matter)
           let finalChapters = [];
           let frontMatterId = crypto.randomUUID();
           let hasFrontMatter = false;
           
           let backMatterId = crypto.randomUUID();
           let hasBackMatter = false;
           
           let currentChapterId = null;
           let mainContentStarted = false;
           
           let orderIdx = 0;
           
           for (const ch of extractedChapters) {
              const titleLower = ch.title.toLowerCase();
              const isFrontType = /^(preface|foreword|acknowledgements|about the authors?|copyright|table of contents|dedication)/i.test(ch.title);
              const isBackType = /^(appendix|glossary|credits|references|bibliography|index|solutions|answers)/i.test(ch.title);
              const isChapter = /^(chapter|unit|part)\s+\d+/i.test(ch.title);
              const isSection = /^(concept|section)\s+\d+\.\d+/i.test(ch.title);
              
              if (isChapter) mainContentStarted = true;
              
              if (!mainContentStarted && isFrontType) {
                 if (!hasFrontMatter) {
                    finalChapters.push({ id: frontMatterId, title: "Front Matter", page_number: ch.page_number, level: 0, parent_id: null, order_index: orderIdx++ });
                    hasFrontMatter = true;
                 }
                 ch.parent_id = frontMatterId;
                 ch.level = 1;
                 ch.order_index = orderIdx++;
                 finalChapters.push(ch);
              } 
              else if (mainContentStarted && isBackType) {
                 if (!hasBackMatter) {
                    finalChapters.push({ id: backMatterId, title: "Back Matter", page_number: ch.page_number, level: 0, parent_id: null, order_index: orderIdx++ });
                    hasBackMatter = true;
                 }
                 ch.parent_id = backMatterId;
                 ch.level = 1;
                 ch.order_index = orderIdx++;
                 finalChapters.push(ch);
              }
              else if (isChapter) {
                 ch.parent_id = null;
                 ch.level = 0;
                 ch.order_index = orderIdx++;
                 currentChapterId = ch.id;
                 finalChapters.push(ch);
              }
              else if (isSection && currentChapterId) {
                 ch.parent_id = currentChapterId;
                 ch.level = 1;
                 ch.order_index = orderIdx++;
                 finalChapters.push(ch);
              }
              else {
                 // Unknown/fallback mapping: if outline provided a parent_id, keep it (Stage 1 fallback)
                 if (!ch.parent_id) {
                    if (currentChapterId) {
                       ch.parent_id = currentChapterId;
                       ch.level = 1;
                    } else {
                       ch.parent_id = null;
                       ch.level = 0;
                    }
                 }
                 ch.order_index = orderIdx++;
                 finalChapters.push(ch);
              }
           }
           
           extractedChapters = finalChapters;
        }
        
      } catch (err) {
        console.warn("Failed to extract outline:", err);
      }

      setFileStats({
        pages: pdf.numPages,
        size: selectedFile.size,
        chapters: extractedChapters
      });
    } catch (err) {
      console.error("Failed to read page count locally:", err);
      setErrorMessage("Could not parse PDF page count. The file may be corrupted or encrypted.");
      setFileStats(null);
      setFile(null);
    } finally {
      setIsProcessing(false);
      setStatusText('');
      setProgressPercent(0);
    }
  };

  const uploadChunkToSupabase = async (chunk, index, totalChunks, bookId) => {
    setStatusText(`Downloading Part ${index + 1} from server...`);
    const COMPRESSOR_URL = import.meta.env.VITE_COMPRESSOR_URL || 'http://localhost:3001';
    
    // 1. Fetch chunk blob from Render
    const response = await fetch(`${COMPRESSOR_URL}${chunk.download_url}`);
    if (!response.ok) throw new Error(`Failed to download part ${index + 1} from server.`);
    
    const arrayBuffer = await response.arrayBuffer();
    
    setStatusText(`Verifying checksum for Part ${index + 1}...`);
    // 2. Verify Checksum locally (pre-upload safety)
    const calculatedHash = await calculateSHA256(arrayBuffer);
    if (calculatedHash !== chunk.checksum) {
      throw new Error(`Checksum mismatch for part ${index + 1}. The file might be corrupted during transit.`);
    }

    const chunkBlob = new Blob([arrayBuffer], { type: 'application/pdf' });
    const cleanFileName = `${Date.now()}_part${chunk.part_number}.pdf`;

    setStatusText(`Uploading Part ${index + 1} of ${totalChunks}...`);
    // 3. Upload to Supabase Storage
    const { error: uploadErr } = await supabase.storage
      .from('textbooks-pdf')
      .upload(cleanFileName, chunkBlob, { contentType: 'application/pdf', upsert: false });
    
    if (uploadErr) throw new Error(`Storage upload failed for part ${index + 1}: ${uploadErr.message}`);

    setStatusText(`Validating Storage integrity for Part ${index + 1}...`);
    // 4. Post-Upload Verification (Verify it exists and size matches)
    const { data: listData, error: listErr } = await supabase.storage
      .from('textbooks-pdf')
      .list('', { search: cleanFileName });
      
    if (listErr || !listData || listData.length === 0) {
      throw new Error(`Validation failed: Part ${index + 1} is missing from Supabase Storage.`);
    }
    const uploadedFileMeta = listData.find(f => f.name === cleanFileName);
    if (!uploadedFileMeta || uploadedFileMeta.metadata.size !== chunk.size_bytes) {
       throw new Error(`Validation failed: Part ${index + 1} size mismatch in storage. Expected ${chunk.size_bytes}, got ${uploadedFileMeta?.metadata?.size || 'unknown'}.`);
    }

    // 5. Insert chunk metadata into database (Idempotent cleanup)
    await supabase.from('textbook_chunks').delete().eq('book_id', bookId).eq('part_number', chunk.part_number);
    
    const { error: dbErr } = await supabase.from('textbook_chunks').insert({
      book_id: bookId,
      part_number: chunk.part_number,
      first_page: chunk.first_page,
      last_page: chunk.last_page,
      page_count: chunk.page_count,
      storage_path: cleanFileName,
      size_bytes: chunk.size_bytes,
      checksum: chunk.checksum,
      upload_status: 'success'
    });

    if (dbErr) throw new Error(`Database error for part ${index + 1}: ${dbErr.message}`);
    
    return true;
  };

  const verifyBookIntegrity = async (bookId, originalChunksManifest) => {
    setStatusText('Verifying book consistency...');
    await supabase.from('textbooks').update({ status: 'verifying' }).eq('id', bookId);

    const { data: dbChunks, error: fetchErr } = await supabase
      .from('textbook_chunks')
      .select('*')
      .eq('book_id', bookId)
      .order('part_number', { ascending: true });

    if (fetchErr || !dbChunks) throw new Error('Failed to fetch chunks for verification.');
    if (dbChunks.length !== originalChunksManifest.length) {
      throw new Error(`Verification failed: Expected ${originalChunksManifest.length} chunks, found ${dbChunks.length} in DB.`);
    }

    let previousLastPage = 0;
    let totalPagesSum = 0;

    for (let i = 0; i < dbChunks.length; i++) {
      const chunk = dbChunks[i];
      if (i === 0 && chunk.first_page !== 1) {
        throw new Error(`Verification failed: First chunk does not start on page 1.`);
      }
      if (i > 0 && chunk.first_page !== previousLastPage + 1) {
         throw new Error(`Verification failed: Missing or duplicate pages detected between chunk ${i} and ${i+1}.`);
      }
      previousLastPage = chunk.last_page;
      totalPagesSum += chunk.page_count;
    }

    const { data: bookRecord } = await supabase.from('textbooks').select('*').eq('id', bookId).single();
    if (totalPagesSum !== bookRecord.total_pages) {
      throw new Error(`Verification failed: Total pages mismatch. Expected ${bookRecord.total_pages}, got ${totalPagesSum}.`);
    }
    if (previousLastPage !== bookRecord.total_pages) {
      throw new Error(`Verification failed: Last page of final chunk (${previousLastPage}) does not match book total pages (${bookRecord.total_pages}).`);
    }

    return { dbChunks, validatedTotalPages: bookRecord.total_pages }; // Return validated chunks for summary
  };

  const processUploadLoop = async (chunks, startIdx, bookId, currentJobId) => {
    try {
      // Set book status to uploading
      await supabase.from('textbooks').update({ status: 'uploading' }).eq('id', bookId);

      const totalChunks = chunks.length;
      for (let i = startIdx; i < totalChunks; i++) {
        await uploadChunkToSupabase(chunks[i], i, totalChunks, bookId);
        setProgressPercent(40 + Math.round(((i + 1) / totalChunks) * 50));
      }

      // Finalize: Verify everything
      const { dbChunks: validatedDbChunks, validatedTotalPages } = await verifyBookIntegrity(bookId, chunks);
      
      setStatusText('Verification complete. Marking as ready...');
      const { error: updateErr } = await supabase.from('textbooks').update({ status: 'ready' }).eq('id', bookId);
      if (updateErr) throw new Error(`Failed to mark textbook as ready: ${updateErr.message}`);

      // Cleanup job on server (delete temporary files) ONLY after verification succeeds
      const COMPRESSOR_URL = import.meta.env.VITE_COMPRESSOR_URL || 'http://localhost:3001';
      if (currentJobId) {
        await fetch(`${COMPRESSOR_URL}/jobs/${currentJobId}/complete`, { method: 'POST' }).catch(console.error);
      }

      setProgressPercent(100);
      setFailedChunkIndex(null);
      setIsProcessing(false);

      const timeTakenMs = Date.now() - startTimeRef.current;

      setAdminSummary({
         title: title,
         originalSize: fileStats?.size,
         totalPages: validatedTotalPages,
         totalParts: chunks.length,
         chunkSizes: validatedDbChunks.map(c => c.size_bytes),
         processingTime: formatDuration(timeTakenMs),
         createdAt: new Date().toLocaleString()
      });

    } catch (err) {
      console.error(err);
      // Fallback update to failed status
      const { error: updateErr } = await supabase.from('textbooks').update({ status: 'failed' }).eq('id', bookId);
      if (updateErr) console.error(updateErr);
      
      setErrorMessage(err.message);
      setFailedChunkIndex(startIdx); // Save index for retry (do not cleanup Render files)
      setIsProcessing(false);
    }
  };

  const pollJobStatus = async (currentJobId) => {
    const COMPRESSOR_URL = import.meta.env.VITE_COMPRESSOR_URL || 'http://localhost:3001';
    
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${COMPRESSOR_URL}/jobs/${currentJobId}`);
        if (!res.ok) throw new Error('Failed to fetch job status.');
        const data = await res.json();

        if (data.status === 'completed') {
          clearInterval(interval);
          const chunks = data.chunks || [];
          setPendingChunks(chunks);
          setProgressPercent(30);
          setStatusText(`PDF split into ${chunks.length} parts. Creating database record...`);

          // Get fresh user from Supabase to guarantee RLS match
          const { data: authData } = await supabase.auth.getUser();
          if (!authData?.user) throw new Error("Authenticated user not found in Supabase session.");

          // Create Parent Book Record (Status: 'processing')
          const { data: bookRecord, error: bookErr } = await supabase.from('textbooks').insert({
            title: title.trim() || 'Untitled Textbook',
            subject: subject,
            author: author.trim() || null,
            total_pages: data.total_pages,
            total_parts: chunks.length,
            status: 'processing',
            uploaded_by: authData.user.id,
            is_published: true
          }).select().single();

          if (bookErr || !bookRecord) throw new Error(`Failed to create textbook record: ${bookErr?.message}`);
          
          const newBookId = bookRecord.id;
          
          if (fileStats?.chapters?.length > 0) {
            setStatusText('Saving chapter metadata...');
            // Take up to 1500 chapters to prevent payload limits
            const chaptersToInsert = fileStats.chapters.slice(0, 1500).map(ch => ({
              id: ch.id,
              book_id: newBookId,
              title: ch.title,
              page_number: ch.page_number,
              level: ch.level,
              parent_id: ch.parent_id,
              order_index: ch.order_index
            }));
            const { error: chapterErr } = await supabase.from('textbook_chapters').insert(chaptersToInsert);
            if (chapterErr) {
              console.warn("Failed to insert chapters:", chapterErr);
            }
          }

          setParentBookId(newBookId);
          setProgressPercent(40);

          // Start sequential chunk upload
          await processUploadLoop(chunks, 0, newBookId, currentJobId);
        } else if (data.status === 'error') {
          clearInterval(interval);
          throw new Error(`Server splitting failed: ${data.error}`);
        } else {
           setStatusText(`Splitting document...`);
        }
      } catch (err) {
        clearInterval(interval);
        console.error('Polling Error:', err);
        setErrorMessage(err.message || 'An error occurred during splitting.');
        setIsProcessing(false);
      }
    }, 2000);
  };

  const handleStartUpload = async () => {
    if (!file || !title) return;
    if (!user) {
      setErrorMessage("Authentication required: Please log in to upload textbooks.");
      return;
    }
    
    startTimeRef.current = Date.now();
    setIsProcessing(true);
    setErrorMessage(null);
    setFailedChunkIndex(null);
    setProgressPercent(5);
    setStatusText('Uploading original PDF...');

    try {
      const COMPRESSOR_URL = import.meta.env.VITE_COMPRESSOR_URL || 'http://localhost:3001';
      
      const formData = new FormData();
      formData.append('file', file);

      // STEP 1: Start Async Split Job
      const splitRes = await fetch(`${COMPRESSOR_URL}/jobs/split`, {
        method: 'POST',
        body: formData,
      });

      if (!splitRes.ok) {
        let msg = await splitRes.text();
        throw new Error(`Failed to start job: ${msg}`);
      }

      const splitData = await splitRes.json();
      if (splitData.error) throw new Error(splitData.error);
      
      const newJobId = splitData.jobId;
      setJobId(newJobId);
      
      // We are now in processing/splitting stage
      setProgressPercent(15);
      setStatusText('Splitting document...');

      // STEP 2: Poll for completion
      pollJobStatus(newJobId);

    } catch (err) {
      console.error('Upload Error:', err);
      setErrorMessage(err.message || 'An error occurred during upload.');
      setIsProcessing(false);
    }
  };

  const handleRetryUpload = async () => {
    if (failedChunkIndex === null || pendingChunks.length === 0 || !parentBookId) return;
    setIsProcessing(true);
    setErrorMessage(null);
    await processUploadLoop(pendingChunks, failedChunkIndex, parentBookId, jobId);
  };

  const handleCancelUpload = async () => {
    if (jobId) {
      const COMPRESSOR_URL = import.meta.env.VITE_COMPRESSOR_URL || 'http://localhost:3001';
      await fetch(`${COMPRESSOR_URL}/jobs/${jobId}/complete`, { method: 'POST' }).catch(console.error);
    }
    if (parentBookId) {
      const { error: cancelErr } = await supabase.from('textbooks').update({ status: 'failed' }).eq('id', parentBookId);
      if (cancelErr) console.error(cancelErr);
    }
    setFile(null);
    setFileStats(null);
    setTitle('');
    setAuthor('');
    setAdminSummary(null);
    setFailedChunkIndex(null);
    setIsProcessing(false);
    setErrorMessage('Upload cancelled. Temporary files cleaned up.');
  };

  return (
    <div className="flex-1 overflow-y-auto flex flex-col" style={{ background: '#FAFBFF' }}>
      <div className="flex-1 px-4 sm:px-8 py-10">
        <div className="max-w-4xl mx-auto">
          <BackToHomeButton onNavigate={onNavigate} />

          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #2954E5, #4f46e5)' }}>
              <ShieldCheck size={20} color="#FFFFFF" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold" style={{ color: '#101C34', fontFamily: "'Montserrat', sans-serif" }}>
                Large PDF Upload & Verification
              </h2>
              <p className="text-sm" style={{ color: '#8493B0' }}>
                Securely stream and cryptographically verify textbook chunks up to 250MB.
              </p>
            </div>
          </div>

          {errorMessage && (
            <div className="mb-6 p-4 rounded-xl flex items-center gap-3 text-sm" style={{ background: '#FEF2F2', borderColor: '#FCA5A5', color: '#991B1B', border: '1px solid' }}>
              <AlertCircle size={18} />
              <div className="flex-1">
                <span className="font-semibold block mb-1">Upload Interrupted</span>
                <span>{errorMessage}</span>
              </div>
              {failedChunkIndex !== null && !isProcessing && (
                <button 
                  onClick={handleRetryUpload}
                  className="ml-auto px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium flex items-center gap-2 shadow-sm"
                >
                  <RefreshCw size={16} />
                  Retry Part {failedChunkIndex + 1}
                </button>
              )}
            </div>
          )}

          {adminSummary ? (
            <div className="bg-white rounded-2xl shadow-sm border p-8 mb-8" style={{ borderColor: '#E2E8F0' }}>
              <div className="flex items-center gap-3 mb-6">
                <CheckCircle2 size={28} className="text-green-600" />
                <h3 className="text-xl font-semibold text-slate-800">Upload Complete. Textbook verified and ready for reading.</h3>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="text-xs text-slate-500 font-medium uppercase mb-1">Book Title</div>
                  <div className="font-semibold text-slate-800 truncate" title={adminSummary.title}>{adminSummary.title}</div>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="text-xs text-slate-500 font-medium uppercase mb-1">Original Size</div>
                  <div className="font-semibold text-slate-800">{formatBytes(adminSummary.originalSize)}</div>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="text-xs text-slate-500 font-medium uppercase mb-1">Total Pages</div>
                  <div className="font-semibold text-slate-800">{adminSummary.totalPages}</div>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="text-xs text-slate-500 font-medium uppercase mb-1">Processing Time</div>
                  <div className="font-semibold text-slate-800">{adminSummary.processingTime}</div>
                </div>
              </div>

              <div className="mb-6 border rounded-xl overflow-hidden" style={{ borderColor: '#E2E8F0' }}>
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3 font-semibold text-slate-600">Metric</th>
                      <th className="px-6 py-3 font-semibold text-slate-600">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                     <tr>
                        <td className="px-6 py-3 text-slate-700">Total Parts Verified</td>
                        <td className="px-6 py-3 font-medium text-slate-900">{adminSummary.totalParts}</td>
                     </tr>
                     <tr>
                        <td className="px-6 py-3 text-slate-700">Storage Metadata Validation</td>
                        <td className="px-6 py-3 font-medium text-green-600">✓ Passed</td>
                     </tr>
                     <tr>
                        <td className="px-6 py-3 text-slate-700">Mathematical Page Continuity</td>
                        <td className="px-6 py-3 font-medium text-green-600">✓ Passed</td>
                     </tr>
                     <tr>
                        <td className="px-6 py-3 text-slate-700">Created Date</td>
                        <td className="px-6 py-3 font-medium text-slate-900">{adminSummary.createdAt}</td>
                     </tr>
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-center mt-8 pt-6 border-t" style={{ borderColor: '#E2E8F0' }}>
                 <div className="text-sm text-slate-500">
                   {adminSummary.totalParts} individual chunk signatures cryptographically verified.
                 </div>
                 <div className="flex gap-3">
                   <button
                     onClick={() => {
                       setFile(null);
                       setFileStats(null);
                       setTitle('');
                       setAuthor('');
                       setAdminSummary(null);
                     }}
                     className="px-6 py-2.5 rounded-lg font-medium bg-white text-blue-600 border border-blue-600 hover:bg-blue-50 transition-colors shadow-sm"
                   >
                     Upload Another
                   </button>
                   <button
                     onClick={() => onNavigate('reader', { bookId: parentBookId })}
                     className="px-6 py-2.5 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm"
                   >
                     View Book
                   </button>
                 </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border p-6 mb-8" style={{ borderColor: '#E2E8F0' }}>
              {!file ? (
                <div className="border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center text-center transition-colors hover:bg-slate-50" style={{ borderColor: '#CBD5E1' }}>
                  <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                    <FileText size={28} color="#2954E5" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2" style={{ color: '#101C34' }}>Select Textbook PDF</h3>
                  <p className="text-sm text-slate-500 mb-6 max-w-md">
                    Upload textbooks up to 250MB. They will be strictly verified and chunked for safe cloud storage.
                  </p>
                  <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2">
                    <Upload size={18} />
                    <span>Browse Files</span>
                    <input type="file" accept="application/pdf" className="hidden" onChange={handleFileSelect} />
                  </label>
                </div>
              ) : (
                <div>
                  <div className="flex items-start justify-between mb-6 pb-6 border-b" style={{ borderColor: '#F1F5F9' }}>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center">
                        <BookOpen size={24} color="#2954E5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg" style={{ color: '#101C34' }}>{file.name}</h3>
                        <p className="text-sm text-slate-500 flex gap-4 mt-1">
                          <span>Size: {formatBytes(fileStats?.size)}</span>
                          <span>Pages: {fileStats?.pages || '...'}</span>
                        </p>
                      </div>
                    </div>
                    {!isProcessing && (
                      <button onClick={() => { setFile(null); setFileStats(null); }} className="text-sm text-slate-500 hover:text-red-500 font-medium">
                        Change File
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div>
                      <label className="block text-sm font-medium mb-1.5" style={{ color: '#334155' }}>Textbook Title</label>
                      <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} disabled={isProcessing} className="w-full px-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-blue-500 outline-none transition-shadow" style={{ borderColor: '#E2E8F0', background: '#F8FAFC' }} placeholder="e.g., Campbell Biology" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5" style={{ color: '#334155' }}>Author(s)</label>
                      <input type="text" value={author} onChange={(e) => setAuthor(e.target.value)} disabled={isProcessing} className="w-full px-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-blue-500 outline-none transition-shadow" style={{ borderColor: '#E2E8F0', background: '#F8FAFC' }} placeholder="e.g., Neil A. Campbell" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5" style={{ color: '#334155' }}>Subject / Category</label>
                      <select value={subject} onChange={(e) => setSubject(e.target.value)} disabled={isProcessing} className="w-full px-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-blue-500 outline-none transition-shadow" style={{ borderColor: '#E2E8F0', background: '#F8FAFC' }}>
                        {SUBJECTS.map((sub) => (
                          <option key={sub} value={sub}>{sub}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {isProcessing && (
                    <div className="mb-6 p-4 rounded-xl border" style={{ borderColor: '#E2E8F0', background: '#F8FAFC' }}>
                      <div className="flex justify-between text-sm font-medium mb-2" style={{ color: '#475569' }}>
                        <span>{statusText || 'Processing...'}</span>
                        <span>{progressPercent}%</span>
                      </div>
                      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600 rounded-full transition-all duration-300" style={{ width: `${progressPercent}%` }} />
                      </div>
                    </div>
                  )}

                  {!isProcessing && failedChunkIndex === null && (
                    <div className="flex justify-end gap-3">
                      <button onClick={handleCancelUpload} className="px-6 py-2.5 bg-white border hover:bg-slate-50 text-slate-600 rounded-lg font-medium transition-colors">
                        Cancel
                      </button>
                      <button onClick={handleStartUpload} disabled={!title.trim() || !file} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50 shadow-sm">
                        Start Upload & Verify
                      </button>
                    </div>
                  )}
                  {isProcessing && (
                    <div className="flex justify-end">
                       <button onClick={handleCancelUpload} className="text-sm text-red-500 hover:text-red-700 font-medium flex items-center gap-1">
                          <XCircle size={16} /> Cancel Job
                       </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
