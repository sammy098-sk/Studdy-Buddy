import React, { useState } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, Server, RefreshCw, BookOpen, XCircle, ShieldCheck } from 'lucide-react';
import { SUBJECTS } from '../config';
import { supabase } from '../supabase';
import BackToHomeButton from './BackToHomeButton';
import { filterJunkBookmarks } from '../utils/tocCleaner';
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
  const [lowDpiWarning, setLowDpiWarning] = useState(null);

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

        let outlineEvidence = [];
        let printedTocEvidence = [];
        let typographyEvidence = [];
        
        // ---------------------------------------------------------
        // LAYER 1: PDF Outline / Bookmarks (Highest Confidence)
        // ---------------------------------------------------------
        if (outline && outline.length > 0) {
           setStatusText('Gathering evidence from PDF outline...');
           await processOutline(outline);
           // Convert extractedChapters into outline evidence without arbitrary count rejection
           outlineEvidence = extractedChapters.map(ch => {
             let type = 'chapter';
             if (ch.level === 0 && /^unit/i.test(ch.title)) type = 'unit';
             else if (ch.level > 1 || /^(concept|section)\s+\d+\.\d+/i.test(ch.title)) type = 'concept';
             return { ...ch, source: 'outline', confidence_score: 100, type };
           });
        }
        extractedChapters = [];

        // ---------------------------------------------------------
        // LAYER 2: Printed Table of Contents Scanner (Pages 1-35)
        // ---------------------------------------------------------
        setStatusText('Scanning opening pages for printed Table of Contents...');
        const scanTocPages = Math.min(pdf.numPages, 35);
        for (let i = 1; i <= scanTocPages; i++) {
           try {
              const page = await pdf.getPage(i);
              const textContent = await page.getTextContent();
              const items = textContent.items.map(it => ({ str: it.str.trim(), y: Math.round(it.transform[5]) })).filter(it => it.str);
              
              // Group by Y line
              let lines = [];
              let cur = null;
              for (const it of items) {
                 if (!cur) cur = { text: it.str, y: it.y };
                 else if (Math.abs(it.y - cur.y) <= 4) cur.text += " " + it.str;
                 else { lines.push(cur.text); cur = { text: it.str, y: it.y }; }
              }
              if (cur) lines.push(cur.text);
              
              for (const text of lines) {
                 // Match leader dots or spaced TOC table alignment: "Title ....... 45" or "Chapter 1 Mechanics ..... 12"
                 const tocMatch = text.match(/^(.*?)\s+(?:\.{2,}|\-{2,}|\_{2,}|\s{3,})\s*(\d+)$/);
                 if (tocMatch) {
                    const cleanTitle = tocMatch[1].trim();
                    const targetPage = parseInt(tocMatch[2], 10);
                    if (cleanTitle.length >= 3 && cleanTitle.length <= 100 && targetPage >= 1 && targetPage <= pdf.numPages + 50) {
                       let lvl = 1;
                       let tp = 'chapter';
                       if (/^unit/i.test(cleanTitle)) { lvl = 0; tp = 'unit'; }
                       else if (/^\d+\.\d+|^(concept|section|lesson|module)\s+\d+\.\d+/i.test(cleanTitle)) { lvl = 2; tp = 'concept'; }
                       else if (/^(preface|foreword|acknowledgements|introduction)/i.test(cleanTitle)) { lvl = 1; tp = 'frontMatter'; }
                       else if (/^(appendix|glossary|index|references)/i.test(cleanTitle)) { lvl = 1; tp = 'backMatter'; }
                       
                       printedTocEvidence.push({
                          id: crypto.randomUUID(),
                          title: cleanTitle,
                          page_number: Math.min(targetPage, pdf.numPages), // adjusts if offset is small
                          level: lvl,
                          source: 'printed_toc',
                          confidence_score: 80,
                          type: tp
                       });
                    }
                 }
              }
           } catch (e) {
              console.warn(`Layer 2 scan error on page ${i}:`, e);
           }
        }

        // ---------------------------------------------------------
        // LAYER 3: Adaptive Typography Scanner & Intelligent Stopping
        // ---------------------------------------------------------
        setStatusText('Running adaptive typography heading scan...');
        let countUnits = 0, countConcepts = 0, countSections = 0;
        let chapterFonts = [], sectionFonts = [];
        let detectedChapterKeyword = "Chapter";
        let detectedSectionKeyword = "Section";
        let bookProfile = null;
        let pagesScanned = 0;

        for (let i = 1; i <= pdf.numPages; i++) {
           try {
              const page = await pdf.getPage(i);
              const textContent = await page.getTextContent();
              let textItems = textContent.items.map(it => ({ str: it.str.trim(), fontSize: Math.round(it.transform[0]), y: Math.round(it.transform[5]) })).filter(it => it.str);
              
              if (textItems.length === 0) continue;
              pagesScanned++;
              const maxFontSize = Math.max(...textItems.map(it => it.fontSize));
              
              // Intelligent Skip: If pattern already learned and this page has no text approaching heading font size, skip detailed parsing!
              if (bookProfile && maxFontSize < bookProfile.sectionFont - 1 && i > 50) {
                 continue;
              }

              // Group into lines
              let lines = [];
              let cur = null;
              for (const it of textItems) {
                 if (!cur) cur = { text: it.str, y: it.y, fontSize: it.fontSize };
                 else if (Math.abs(it.y - cur.y) <= 5) { cur.text += " " + it.str; cur.fontSize = Math.max(cur.fontSize, it.fontSize); }
                 else {
                    if (cur.text.endsWith("-")) { cur.text = cur.text.slice(0, -1) + it.str; cur.y = it.y; }
                    else { lines.push(cur); cur = { text: it.str, y: it.y, fontSize: it.fontSize }; }
                 }
              }
              if (cur) lines.push(cur);

              for (let l = 0; l < lines.length; l++) {
                 const line = lines[l];
                 const cleanText = line.text.replace(/\s+\d+$/, "").trim();
                 if (cleanText.length < 3 || cleanText.length > 120) continue;
                 
                 let score = 0;
                 let tp = 'chapter';
                 let lvl = 1;
                 let isStructural = false;
                 
                 // Generic multi-publisher structural pattern matching
                 if (/^UNIT\s+[A-Za-z0-9]+/i.test(cleanText)) {
                    score += 65; tp = 'unit'; lvl = 0; isStructural = true; countUnits++;
                 } else if (/^(Chapter|Part|Module|Lesson)\s+[A-Za-z0-9]+/i.test(cleanText)) {
                    score += 60; tp = 'chapter'; lvl = 1; isStructural = true; chapterFonts.push(line.fontSize);
                    const kw = cleanText.split(/\s+/)[0]; if (kw) detectedChapterKeyword = kw;
                 } else if (/^(Concept|Section)\s+\d+/i.test(cleanText)) {
                    score += 55; tp = 'concept'; lvl = 2; isStructural = true; sectionFonts.push(line.fontSize);
                    if (/^concept/i.test(cleanText)) countConcepts++; else countSections++;
                    const kw = cleanText.split(/\s+/)[0]; if (kw) detectedSectionKeyword = kw;
                 } else if (/^\d+\.\d+(?:\.\d+)?\s+[A-Za-z]/.test(cleanText)) {
                    score += 50; tp = 'concept'; lvl = 2; isStructural = true; sectionFonts.push(line.fontSize);
                 } else if (/^\d+[\:\-\.\s]+[A-Z][^\.]{2,60}$/.test(cleanText) && line.fontSize >= maxFontSize - 1 && maxFontSize > 11) {
                    score += 45; tp = 'chapter'; lvl = 1; isStructural = true; chapterFonts.push(line.fontSize);
                 } else if (/^(Preface|Foreword|Introduction|Acknowledgements|Contents|Table of Contents)/i.test(cleanText)) {
                    score += 50; tp = 'frontMatter'; lvl = 1; isStructural = true;
                 } else if (/^(Appendix|Glossary|Credits|References|Bibliography|Index|Answer Key)/i.test(cleanText)) {
                    score += 50; tp = 'backMatter'; lvl = 1; isStructural = true;
                 }
                 
                 // Adaptive pattern amplification once profile is learned
                 if (bookProfile && isStructural) {
                    if (lvl === 1 && Math.abs(line.fontSize - bookProfile.headingFont) <= 2) score += 15;
                    if (lvl === 2 && Math.abs(line.fontSize - bookProfile.sectionFont) <= 2) score += 15;
                 }

                 if (!isStructural && line.fontSize < maxFontSize) continue;
                 
                 if (line.fontSize >= maxFontSize && maxFontSize > 0) score += 15;
                 if (cleanText.endsWith(".")) score -= 45;
                 if (/\b(explains|describes|provides|introduces|discusses|shows|demonstrates|illustrates|in this chapter)\b/i.test(cleanText)) score -= 50;

                 if (score >= 35) {
                    let finalTitle = cleanText;
                    if (l + 1 < lines.length && /^(Chapter|Part|UNIT|Module|Lesson)\s+[A-Za-z0-9]+$/i.test(cleanText)) {
                       const nextLine = lines[l + 1].text.replace(/\s+\d+$/, "").trim();
                       if (nextLine.length > 2 && nextLine.length < 65 && !nextLine.endsWith(".")) {
                          finalTitle += " " + nextLine; l++;
                       }
                    }
                    typographyEvidence.push({
                       id: crypto.randomUUID(),
                       title: finalTitle.substring(0, 100),
                       page_number: i,
                       level: lvl,
                       source: 'typography',
                       confidence_score: Math.min(score, 75),
                       type: tp
                    });
                 }
              }

              // Learn book profile around page 50 or after discovering initial pattern
              if (!bookProfile && i >= 45 && (chapterFonts.length >= 2 || sectionFonts.length >= 3)) {
                 const avgChFont = chapterFonts.length > 0 ? Math.round(chapterFonts.reduce((a,b)=>a+b,0)/chapterFonts.length) : 22;
                 const avgSecFont = sectionFonts.length > 0 ? Math.round(sectionFonts.reduce((a,b)=>a+b,0)/sectionFonts.length) : 16;
                 bookProfile = {
                    chapterPattern: `${detectedChapterKeyword} N`,
                    sectionPattern: countConcepts > 0 ? "Concept N.M" : (countSections > 0 ? `${detectedSectionKeyword} N.M` : "N.M"),
                    usesUnits: countUnits > 0,
                    usesConcepts: countConcepts > 0,
                    headingFont: avgChFont,
                    sectionFont: avgSecFont,
                    publisher: countConcepts > 0 ? "Structured Academic / Modular Style" : "OpenStax / Standard Academic"
                 };
                 console.log("Adaptive Extractor Learned Book Profile:", bookProfile);
              }

              if (i % 25 === 0) {
                 setStatusText(`Analyzing document structure (${i} of ${pdf.numPages})...`);
                 await new Promise(r => setTimeout(r, 0));
              }
           } catch (e) {
              console.warn(`Layer 3 scan error on page ${i}:`, e);
           }
        }
        
        if (!bookProfile) {
           bookProfile = { chapterPattern: "Chapter N", sectionPattern: "N.M", usesUnits: countUnits > 0, usesConcepts: false, headingFont: 20, sectionFont: 15, publisher: "General Academic" };
        }

        // ---------------------------------------------------------
        // EVIDENCE MERGING & DEDUPLICATION ENGINE
        // ---------------------------------------------------------
        setStatusText('Merging extraction sources and deduplicating hierarchy...');
        let allEvidence = filterJunkBookmarks([...outlineEvidence, ...printedTocEvidence, ...typographyEvidence]);
        
        // Sort primarily by page number ascending, then confidence descending
        allEvidence.sort((a, b) => {
           if (a.page_number === b.page_number) return b.confidence_score - a.confidence_score;
           return a.page_number - b.page_number;
        });

        let mergedNodes = [];
        let duplicatesRemoved = 0;
        let unresolvedAmbiguities = [];
        
        const normalizeTitle = (str) => str.toLowerCase().replace(/^(chapter|unit|part|concept|section|lesson|module)\s+\d+(\.\d+)?[:\-.]?\s*/i, '').replace(/[\W_]+/g, '').trim();

        for (const candidate of allEvidence) {
           const normCand = normalizeTitle(candidate.title);
           if (!normCand || normCand.length < 2) continue;

           // Search for existing node within +-2 pages with overlapping normalized title
           const duplicateIndex = mergedNodes.findIndex(existing => {
              const pageDiff = Math.abs(existing.page_number - candidate.page_number);
              if (pageDiff > 2) return false;
              const normExist = normalizeTitle(existing.title);
              return normExist === normCand || (normCand.length > 4 && normExist.includes(normCand)) || (normExist.length > 4 && normCand.includes(normExist));
           });

           if (duplicateIndex !== -1) {
              duplicatesRemoved++;
              const exist = mergedNodes[duplicateIndex];
              // Fusing: if existing came from printed_toc (unverified page) and candidate is typography (verified physical page), align page number!
              if (exist.source === 'printed_toc' && candidate.source === 'typography' && Math.abs(exist.page_number - candidate.page_number) <= 2) {
                 exist.page_number = candidate.page_number;
              }
              // Keep higher confidence title/metadata if conflict occurs
              if (candidate.confidence_score > exist.confidence_score) {
                 mergedNodes[duplicateIndex] = { ...candidate, page_number: exist.page_number };
              }
           } else {
              mergedNodes.push({ ...candidate });
           }
        }

        // Final sorting before tree assembly
        mergedNodes.sort((a, b) => {
           if (a.page_number === b.page_number) return (a.level || 0) - (b.level || 0);
           return a.page_number - b.page_number;
        });

        // ---------------------------------------------------------
        // DYNAMIC HIERARCHY & PARENT-CHILD ASSIGNMENT
        // ---------------------------------------------------------
        let finalChapters = [];
        let orderIdx = 0;

        for (let i = 0; i < mergedNodes.length; i++) {
           let node = mergedNodes[i];
           node.order_index = orderIdx++;
           node.parent_id = null;

           // Search backwards for nearest preceding node with strictly lower hierarchy level
           if (node.level > 0) {
              for (let j = i - 1; j >= 0; j--) {
                 if (mergedNodes[j].level < node.level) {
                    node.parent_id = mergedNodes[j].id;
                    break;
                 }
              }
           }
           finalChapters.push(node);
        }

        extractedChapters = finalChapters;
        
        // Save profile in localStorage for future reuse
        try { localStorage.setItem(`book_profile_${selectedFile.name}`, JSON.stringify(bookProfile)); } catch(e){}

        // ---------------------------------------------------------
        // F12 DEVELOPER DIAGNOSTIC REPORT (Hidden from normal UI)
        // ---------------------------------------------------------
        if (import.meta.env.DEV || true) { // Print reliably to console in all modes for developer verification
           console.group("TOC Extraction Diagnostics: Multi-Source Merge Engine");
           console.log(`Outline entries found: ${outlineEvidence.length}`);
           console.log(`Printed TOC entries found: ${printedTocEvidence.length}`);
           console.log(`Typography headings found: ${typographyEvidence.length}`);
           console.log(`OCR headings found: 0 (Digital text scan used)`);
           console.log(`Duplicate entries removed: ${duplicatesRemoved}`);
           console.log(`Final hierarchy generated: ${extractedChapters.length} nodes`);
           console.log(`Any ambiguities resolved: ${unresolvedAmbiguities.length}`);
           console.log(`Learned Book Profile:`, bookProfile);
           console.groupCollapsed("Final Extracted Tree Elements");
           console.table(extractedChapters.map(c => ({ title: c.title, page: c.page_number, level: c.level, source: c.source, type: c.type })));
           console.groupEnd();
           console.groupEnd();
        }
        window._tocDiagnostics = { outline: outlineEvidence.length, printedToc: printedTocEvidence.length, typography: typographyEvidence.length, duplicatesRemoved, finalCount: extractedChapters.length, bookProfile };
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
    let consecutiveErrors = 0;
    const maxErrors = 12; // Allow up to ~24 seconds of transport network dropout / container coldboot restarts
    
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${COMPRESSOR_URL}/jobs/${currentJobId}`);
        if (!res.ok) throw new Error(`Status HTTP ${res.status}: Failed to fetch job status.`);
        const data = await res.json();
        consecutiveErrors = 0; // Reset network error threshold on successful poll

        if (data.status === 'completed') {
          clearInterval(interval);
          const chunks = data.chunks || [];
          setPendingChunks(chunks);
          setProgressPercent(30);
          setStatusText(`PDF split into ${chunks.length} parts. Creating database record...`);

          // Get fresh user from Supabase to guarantee RLS match
          const { data: authData } = await supabase.auth.getUser();
          if (!authData?.user) throw new Error("Authenticated user not found in Supabase session.");

          if (data.ocr_result?.is_low_dpi_warning || (data.ocr_result?.confidence_score < 80 && data.ocr_result?.confidence_score > 0)) {
            setLowDpiWarning('This PDF appears to be a low-quality scan. OCR accuracy may be reduced.');
          } else {
            setLowDpiWarning(null);
          }

          // Create Parent Book Record (Status: 'processing', complete with classification & OCR metadata)
          const { data: bookRecord, error: bookErr } = await supabase.from('textbooks').insert({
            title: title.trim() || 'Untitled Textbook',
            subject: subject,
            author: author.trim() || null,
            total_pages: data.total_pages,
            total_parts: chunks.length,
            status: 'processing',
            uploaded_by: authData.user.id,
            is_published: true,
            pdf_type: data.ocr_result?.pdf_type || 'native_searchable_pdf',
            processing_state: data.ocr_result?.processing_state || 'completed',
            ocr_engine: data.ocr_result?.ocr_engine || 'native_text',
            ocr_status: data.ocr_result?.processing_state || 'not_needed',
            confidence_score: data.ocr_result?.confidence_score ?? 100.0,
            pages_requiring_ocr: data.ocr_result?.pages_requiring_ocr || [],
            pages_failed: data.ocr_result?.pages_failed || [],
            ocr_pipeline_version: data.ocr_result?.ocr_pipeline_version ?? 1
          }).select().single();

          if (bookErr || !bookRecord) throw new Error(`Failed to create textbook record: ${bookErr?.message}`);
          
          const newBookId = bookRecord.id;
          const failedPagesSet = new Set(data.ocr_result?.pages_failed || []);

          // Save authoritative extracted page text to Supabase (OCR once during upload, reuse everywhere!)
          if (data.ocr_result?.extracted_pages?.length > 0) {
            setStatusText('Saving authoritative extracted page text to database...');
            const pagesToInsert = data.ocr_result.extracted_pages.map(p => ({
              book_id: newBookId,
              page_number: p.page_number,
              extracted_text: p.extracted_text || '',
              source: p.source || 'digital',
              confidence_score: p.confidence_score ?? 100.0,
              ocr_status: p.ocr_status || 'completed',
              is_low_dpi: p.is_low_dpi || false,
              ocr_pipeline_version: p.ocr_pipeline_version ?? 1
            }));
            for (let idx = 0; idx < pagesToInsert.length; idx += 500) {
              const batch = pagesToInsert.slice(idx, idx + 500);
              const { error: pErr } = await supabase.from('textbook_extracted_pages').insert(batch);
              if (pErr) console.warn('Failed to insert extracted pages batch:', pErr);
            }
          }
          
          if (fileStats?.chapters?.length > 0) {
            setStatusText('Saving chapter metadata...');
            // Prevent TOC fabrication: Filter out headings targeting unreadable or failed OCR pages!
            const validChapters = fileStats.chapters
              .filter(ch => !failedPagesSet.has(ch.page_number))
              .slice(0, 1500);

            const chaptersToInsert = validChapters.map(ch => ({
              id: ch.id,
              book_id: newBookId,
              title: ch.title,
              page_number: ch.page_number,
              level: ch.level,
              parent_id: ch.parent_id,
              type: ch.type || 'chapter',
              order_index: ch.order_index
            }));
            if (chaptersToInsert.length > 0) {
              const { error: chapterErr } = await supabase.from('textbook_chapters').insert(chaptersToInsert);
              if (chapterErr) {
                console.warn("Failed to insert chapters:", chapterErr);
              }
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
          const pState = data.processing_state || 'uploaded';
          const stateMessages = {
            uploaded: 'Upload complete. Initializing server-side OCR & classification...',
            checking_for_text: 'Checking page text layers & document classification...',
            extracting_native_text: 'Extracting searchable native digital text...',
            preprocessing_images: 'Preprocessing scanned images (deskewing, contrast & binarization)...',
            running_ocr: `Running server-side OCR on scanned pages (${data.progress_meta?.completedOcrPages || 0}/${data.progress_meta?.pagesRequiringOcr || '??'})...`,
            building_toc: 'Constructing adaptive Table of Contents hierarchy...',
            generating_embeddings: 'Finalizing page text & preparing split parts...',
          };
          setStatusText(stateMessages[pState] || `Server processing: ${pState.replace(/_/g, ' ')}...`);
          const progressMap = { uploaded: 15, checking_for_text: 18, extracting_native_text: 22, preprocessing_images: 24, running_ocr: 26, building_toc: 28, generating_embeddings: 29 };
          if (progressMap[pState]) setProgressPercent(progressMap[pState]);
        }
      } catch (err) {
        consecutiveErrors++;
        console.warn(`[Polling Notice ${consecutiveErrors}/${maxErrors}] Transport error or temporary server coldboot:`, err.message);
        if (consecutiveErrors >= maxErrors) {
          clearInterval(interval);
          console.error('Polling Fatal Error:', err);
          setErrorMessage('Network error during processing: Unable to communicate with processing service after repeated retries.');
          setIsProcessing(false);
        } else {
          setStatusText(`Reconnecting to processing service (attempt ${consecutiveErrors} of ${maxErrors})...`);
        }
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
    setProgressPercent(2);
    setStatusText('Initiating secure PDF transmission...');

    try {
      const COMPRESSOR_URL = import.meta.env.VITE_COMPRESSOR_URL || 'http://localhost:3001';
      let newJobId = null;
      
      const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB segment slicing for resilience against network dropouts & proxy limits
      if (file.size > CHUNK_SIZE) {
        const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
        const uploadId = `upl_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

        for (let i = 0; i < totalChunks; i++) {
          const start = i * CHUNK_SIZE;
          const end = Math.min(start + CHUNK_SIZE, file.size);
          const chunk = file.slice(start, end);

          const chunkPercent = Math.round(((i + 1) / totalChunks) * 13) + 1; // Progress 2% -> 14%
          setProgressPercent(Math.max(2, chunkPercent));
          setStatusText(`Uploading large PDF segment ${i + 1} of ${totalChunks} (${((i + 1) * 5).toFixed(0)} MB transmitted)...`);

          let attempts = 0;
          let chunkSuccess = false;
          let lastErr = null;

          while (attempts < 3 && !chunkSuccess) {
            try {
              const formData = new FormData();
              formData.append('chunk', chunk, file.name || 'segment.pdf');
              formData.append('uploadId', uploadId);
              formData.append('chunkIndex', i);
              formData.append('totalChunks', totalChunks);
              formData.append('originalName', file.name);

              const chunkRes = await fetch(`${COMPRESSOR_URL}/jobs/upload-chunk`, {
                method: 'POST',
                body: formData,
              });

              if (!chunkRes.ok) {
                const msg = await chunkRes.text();
                throw new Error(`Segment ${i + 1} upload failed: ${msg}`);
              }

              const chunkData = await chunkRes.json();
              if (chunkData.error) throw new Error(chunkData.error);

              if (chunkData.isComplete && chunkData.jobId) {
                newJobId = chunkData.jobId;
              }
              chunkSuccess = true;
            } catch (retryErr) {
              attempts++;
              lastErr = retryErr;
              console.warn(`Segment ${i + 1} transmission attempt ${attempts} failed:`, retryErr.message);
              if (attempts < 3) await new Promise(r => setTimeout(r, 1500 * attempts));
            }
          }

          if (!chunkSuccess) {
            throw new Error(`Upload Interrupted: Segment ${i + 1} failed after repeated retry attempts (${lastErr?.message || 'Network disruption'}).`);
          }
        }
      } else {
        // Standard single-shot upload for smaller PDFs (<= 5MB)
        const formData = new FormData();
        formData.append('file', file);

        const splitRes = await fetch(`${COMPRESSOR_URL}/jobs/split`, {
          method: 'POST',
          body: formData,
        });

        if (!splitRes.ok) {
          let msg = await splitRes.text();
          throw new Error(`Failed to start processing: ${msg}`);
        }

        const splitData = await splitRes.json();
        if (splitData.error) throw new Error(splitData.error);
        newJobId = splitData.jobId;
      }

      if (!newJobId) throw new Error("Failed to receive valid job tracking ID from processing service.");
      setJobId(newJobId);
      
      // Transition to server processing/splitting stage
      setProgressPercent(15);
      setStatusText('Splitting document & initiating server-side OCR...');

      // STEP 2: Poll for completion with automatic network retry tolerance
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

          {lowDpiWarning && (
            <div className="mb-6 p-4 rounded-xl flex items-center gap-3 text-sm" style={{ background: '#FEF9C3', borderColor: '#FDE047', color: '#854D0E', border: '1px solid' }}>
              <AlertCircle size={18} />
              <div>
                <span className="font-semibold block mb-1">Low-Quality Scan Detected</span>
                <span>{lowDpiWarning}</span>
              </div>
            </div>
          )}

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
                      <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} disabled={isProcessing} className="w-full px-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-blue-500 outline-none transition-shadow" style={{ borderColor: '#E2E8F0', background: '#F8FAFC' }} placeholder="e.g., OpenStax College Algebra" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5" style={{ color: '#334155' }}>Author(s)</label>
                      <input type="text" value={author} onChange={(e) => setAuthor(e.target.value)} disabled={isProcessing} className="w-full px-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-blue-500 outline-none transition-shadow" style={{ borderColor: '#E2E8F0', background: '#F8FAFC' }} placeholder="e.g., OpenStax Editorial Board" />
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
