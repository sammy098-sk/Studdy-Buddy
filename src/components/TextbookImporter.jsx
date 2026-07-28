import React, { useState } from 'react';
import { Upload, FileText, CheckCircle2, Loader2, Plus, Trash2, Edit3, Save, ChevronRight, BookOpen, AlertCircle, Server, BarChart3, Zap, ShieldCheck } from 'lucide-react';
import { SUBJECTS } from '../config';
import { supabase } from '../supabase';
import BackToHomeButton from './BackToHomeButton';

/**
 * Chapter auto-detection algorithm supporting standard & OpenStax formats
 */
function autoDetectChapters(fullText) {
  // Regex 1: Matches standard chapter headings (e.g., "Chapter 1", "CHAPTER 2: ATOMIC STRUCTURE", "Unit 1", "Module 3")
  const chapterRegex = /(?:\r?\n|^)\s*(CHAPTER|Chapter|UNIT|Unit|MODULE|Module|LESSON|Lesson)\s+([0-9]+|[IVXLCDM]+)[:\.\s—–-]*(.*?)(?=\r?\n|$)/g;

  let matches = [];
  let match;

  while ((match = chapterRegex.exec(fullText)) !== null) {
    const rawKeyword = match[1];
    const numberStr = match[2];
    const restOfTitle = match[3] ? match[3].trim() : '';
    const fullMatchTitle = `${rawKeyword} ${numberStr}${restOfTitle ? `: ${restOfTitle}` : ''}`;
    matches.push({ index: match.index, title: fullMatchTitle });
  }

  // Regex 2 (OpenStax & numbered chapter fallback): Matches "1  Essential Ideas" or "1.0 Introduction"
  if (matches.length < 2) {
    const openStaxRegex = /(?:\r?\n|^)\s*([0-9]{1,2})\s+([A-Z][A-Za-z0-9\s,—–-]{4,60})(?=\r?\n|$)/g;
    const osMatches = [];
    while ((match = openStaxRegex.exec(fullText)) !== null) {
      const num = match[1];
      const titleText = match[2].trim();
      if (!titleText.toLowerCase().includes('page') && !titleText.toLowerCase().includes('table of contents')) {
        osMatches.push({ index: match.index, title: `Chapter ${num}: ${titleText}` });
      }
    }
    if (osMatches.length > matches.length) {
      matches = osMatches;
    }
  }

  if (matches.length === 0) {
    return [{ chapter_number: 1, title: 'Chapter 1: Full Content', content: fullText.trim() }];
  }

  const chapters = [];
  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];
    const startIndex = current.index;
    const endIndex = (i + 1 < matches.length) ? matches[i + 1].index : fullText.length;
    const rawContent = fullText.slice(startIndex, endIndex).trim();
    chapters.push({
      chapter_number: i + 1,
      title: current.title,
      content: rawContent,
    });
  }

  return chapters;
}

function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function TextbookImporter({ onNavigate, user }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [statusText, setStatusText] = useState('');
  
  // Compression statistics
  const [compressionStats, setCompressionStats] = useState(null);
  
  // Textbook metadata
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState(SUBJECTS[0] || 'Mathematics');
  const [author, setAuthor] = useState('');
  
  // Extracted chapters
  const [chapters, setChapters] = useState([]);
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  
  // Save state
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // File selection
  const handleFileSelect = (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (selectedFile.type !== 'application/pdf' && !selectedFile.name.endsWith('.pdf')) {
      setErrorMessage('Please select a valid PDF file.');
      return;
    }

    setFile(selectedFile);
    setCompressionStats(null);
    setErrorMessage(null);
    setSaveSuccess(false);

    if (!title) {
      const cleanName = selectedFile.name.replace(/\.pdf$/i, '').replace(/[-_]/g, ' ');
      setTitle(cleanName);
    }
  };

  // Automated Compression & Server Ingestion Pipeline
  const handleServerUploadAndProcess = async () => {
    if (!file) {
      setErrorMessage('Please select a PDF file first.');
      return;
    }
    if (!title.trim()) {
      setErrorMessage('Please enter a textbook title.');
      return;
    }
    if (!subject) {
      setErrorMessage('Please select a subject.');
      return;
    }

    setLoading(true);
    setProgressPercent(2);
    setErrorMessage(null);
    setSaveSuccess(false);
    setCompressionStats(null);

    const COMPRESSION_THRESHOLD_BYTES = 14 * 1024 * 1024; // 14 MB threshold
    let fileToUpload = file;

    try {
      // ─────────────────────────────────────────────────────────
      // STEP 1: Check File Size & Trigger Ghostscript Compression if > 14MB
      // ─────────────────────────────────────────────────────────
      if (file.size > COMPRESSION_THRESHOLD_BYTES) {
        setStatusText(`File size is ${formatBytes(file.size)} (> 14MB). Running Ghostscript screen compression...`);
        setProgressPercent(8);

        const compressorUrl = import.meta.env.VITE_COMPRESSOR_URL;

        if (!compressorUrl) {
          throw new Error(
            'VITE_COMPRESSOR_URL is not configured. ' +
            'Please deploy the pdf-compressor-service to Render (or another host) ' +
            'and set VITE_COMPRESSOR_URL=https://your-service.onrender.com in your .env file, ' +
            'then restart the dev server.'
          );
        }

        const formData = new FormData();
        formData.append('file', file);

        try {
          const compResponse = await fetch(`${compressorUrl}/compress`, {
            method: 'POST',
            body: formData,
          });

          if (!compResponse.ok) {
            const errData = await compResponse.json().catch(() => ({}));
            throw new Error(errData.error || `Microservice compression failed (${compResponse.status})`);
          }

          const compressedBlob = await compResponse.blob();
          const origSize = parseInt(compResponse.headers.get('x-original-size') || file.size.toString(), 10);
          const compSize = parseInt(compResponse.headers.get('x-compressed-size') || compressedBlob.size.toString(), 10);
          const origPages = parseInt(compResponse.headers.get('x-original-pages') || '0', 10);
          const compPages = parseInt(compResponse.headers.get('x-compressed-pages') || '0', 10);

          // VERIFICATION CHECK 1: Ensure page count is 100% unchanged
          if (origPages > 0 && compPages > 0 && origPages !== compPages) {
            throw new Error(`Page count mismatch after compression (Original: ${origPages}, Compressed: ${compPages}). Upload halted to prevent corruption.`);
          }

          // Compute reduction percentage
          const reductionPercent = Math.max(0, ((origSize - compSize) / origSize) * 100).toFixed(1);

          setCompressionStats({
            originalSize: origSize,
            compressedSize: compSize,
            reductionPercent,
            pages: compPages || origPages,
          });

          // Replace file to upload with compressed version
          fileToUpload = new File([compressedBlob], file.name, { type: 'application/pdf' });
          setProgressPercent(20);
          setStatusText(`Compression complete! Size reduced by ${reductionPercent}% (${formatBytes(origSize)} ➔ ${formatBytes(compSize)}).`);

        } catch (compErr) {
          // Re-throw so the admin sees a real error, not a silent fallback
          throw new Error(`Ghostscript Compression Failed: ${compErr.message}`);
        }
      }

      // ─────────────────────────────────────────────────────────
      // STEP 2: Upload File to Supabase Storage ('textbooks-pdf')
      // ─────────────────────────────────────────────────────────
      setStatusText('Uploading PDF to Supabase Storage...');
      const cleanFileName = `${Date.now()}_${fileToUpload.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('textbooks-pdf')
        .upload(cleanFileName, fileToUpload, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadErr) {
        throw new Error(`Storage upload failed: ${uploadErr.message}. Ensure 'textbooks-pdf' bucket file limit is updated to 500MB.`);
      }

      const filePath = uploadData.path;
      setProgressPercent(30);

      // ─────────────────────────────────────────────────────────
      // STEP 3: Sequential 50-Page Batch Server Extraction Loop
      // ─────────────────────────────────────────────────────────
      let startPage = 1;
      const batchSize = 50;
      let fullExtractedText = '';
      let isDone = false;
      let totalPages = 0;

      while (!isDone) {
        setStatusText(
          totalPages > 0
            ? `Server extracting pages ${startPage}–${Math.min(startPage + batchSize - 1, totalPages)} of ${totalPages}...`
            : `Server processing PDF pages (Batch starting page ${startPage})...`
        );

        const { data: batchData, error: batchErr } = await supabase.functions.invoke('process-textbook-pdf', {
          body: {
            file_path: filePath,
            start_page: startPage,
            batch_size: batchSize,
          },
        });

        if (batchErr || !batchData) {
          console.error('Edge Function Invoke Error Details:', batchErr);
          const detailMsg = batchErr?.message || batchData?.error || 'Failed to send request to Edge Function.';
          throw new Error(`Edge Function Request Error: ${detailMsg}`);
        }
        if (batchData.error) {
          throw new Error(batchData.error);
        }

        totalPages = batchData.total_pages;
        fullExtractedText += batchData.extracted_text;

        const currentEnd = batchData.end_page;
        const calcPercent = Math.min(95, 30 + Math.round((currentEnd / totalPages) * 65));
        setProgressPercent(calcPercent);

        if (batchData.is_last_batch || currentEnd >= totalPages) {
          isDone = true;
        } else {
          startPage = currentEnd + 1;
        }
      }

      // ─────────────────────────────────────────────────────────
      // STEP 4: Chapter Auto-Detection & Database Persistence
      // ─────────────────────────────────────────────────────────
      setStatusText(`Detecting chapter headings across ${totalPages} pages...`);
      setProgressPercent(95);

      const cleanText = fullExtractedText.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '').trim();
      let detectedChapters = autoDetectChapters(cleanText);
      if (!cleanText || cleanText.length < 50) {
        detectedChapters = [{ chapter_number: 1, title: 'Chapter 1', content: '' }];
      }

      setChapters(detectedChapters);
      setActiveChapterIndex(0);

      setStatusText('Saving textbook and chapter records to database...');
      
      const { data: textbookRecord, error: textbookErr } = await supabase
        .from('textbooks')
        .insert({
          title: title.trim(),
          subject: subject,
          author: author.trim() || null,
          pdf_path: cleanFileName,
        })
        .select()
        .single();

      if (textbookErr || !textbookRecord) throw textbookErr;

      const chapterRecords = detectedChapters.map((ch, idx) => ({
        textbook_id: textbookRecord.id,
        chapter_number: idx + 1,
        title: ch.title.trim() || `Chapter ${idx + 1}`,
        content: ch.content.trim(),
      }));

      const { error: chapterErr } = await supabase
        .from('textbook_chapters')
        .insert(chapterRecords);

      if (chapterErr) throw chapterErr;

      setProgressPercent(100);
      setSaveSuccess(true);
    } catch (err) {
      console.error('Server Processing Error:', err);
      setErrorMessage(err.message || 'An error occurred during server processing.');
    } finally {
      setLoading(false);
      setStatusText('');
    }
  };

  // Chapter editing handlers
  const updateChapterTitle = (index, newTitle) => {
    setChapters((prev) =>
      prev.map((ch, i) => (i === index ? { ...ch, title: newTitle } : ch))
    );
  };

  const updateChapterContent = (index, newContent) => {
    setChapters((prev) =>
      prev.map((ch, i) => (i === index ? { ...ch, content: newContent } : ch))
    );
  };

  const addChapter = () => {
    const newNum = chapters.length + 1;
    const newChapter = {
      chapter_number: newNum,
      title: `Chapter ${newNum}: New Chapter`,
      content: '',
    };
    setChapters((prev) => [...prev, newChapter]);
    setActiveChapterIndex(chapters.length);
  };

  const removeChapter = (index) => {
    if (chapters.length <= 1) return;
    const filtered = chapters.filter((_, i) => i !== index).map((ch, i) => ({
      ...ch,
      chapter_number: i + 1,
    }));
    setChapters(filtered);
    setActiveChapterIndex(Math.max(0, index - 1));
  };

  // Manual save update to Supabase
  const handleSaveTextbookManual = async () => {
    if (!title.trim() || !subject || chapters.length === 0) return;

    setSaving(true);
    setErrorMessage(null);

    try {
      const { data: textbookData, error: textbookErr } = await supabase
        .from('textbooks')
        .insert({
          title: title.trim(),
          subject: subject,
          author: author.trim() || null,
        })
        .select()
        .single();

      if (textbookErr || !textbookData) throw textbookErr;

      const chapterRecords = chapters.map((ch, idx) => ({
        textbook_id: textbookData.id,
        chapter_number: idx + 1,
        title: ch.title.trim() || `Chapter ${idx + 1}`,
        content: ch.content.trim(),
      }));

      const { error: chapterErr } = await supabase
        .from('textbook_chapters')
        .insert(chapterRecords);

      if (chapterErr) throw chapterErr;

      setSaveSuccess(true);
    } catch (err) {
      console.error('Save Error:', err);
      setErrorMessage(err.message || 'An error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  const activeChapter = chapters[activeChapterIndex];

  return (
    <div className="flex-1 overflow-y-auto flex flex-col" style={{ background: '#FAFBFF' }}>
      <div className="flex-1 px-4 sm:px-8 py-10">
        <div className="max-w-4xl mx-auto">
          
          <BackToHomeButton onNavigate={onNavigate} />

          {/* Page Header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #2954E5, #4f46e5)' }}>
              <Server size={20} color="#FFFFFF" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold" style={{ color: '#101C34', fontFamily: "'Montserrat', sans-serif" }}>
                Large PDF Ingestion & Ghostscript Compressor (Admin)
              </h2>
              <p className="text-sm" style={{ color: '#8493B0' }}>
                Auto-compresses heavy PDFs & extracts chapters in 50-page server batches.
              </p>
            </div>
          </div>

          {errorMessage && (
            <div className="mb-6 p-4 rounded-xl flex items-center gap-3 text-sm" style={{ background: '#FEF2F2', borderColor: '#FCA5A5', color: '#991B1B', border: '1px solid' }}>
              <AlertCircle size={18} />
              <span>{errorMessage}</span>
            </div>
          )}

          {saveSuccess && (
            <div className="mb-6 p-4 rounded-xl flex items-center justify-between text-sm" style={{ background: '#F0FDF4', borderColor: '#86EFAC', color: '#166534', border: '1px solid' }}>
              <div className="flex items-center gap-3">
                <CheckCircle2 size={18} />
                <span>Textbook compressed & chapters saved to database successfully!</span>
              </div>
              <button
                onClick={() => {
                  setFile(null);
                  setChapters([]);
                  setTitle('');
                  setAuthor('');
                  setCompressionStats(null);
                  setSaveSuccess(false);
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-700 text-white"
              >
                Upload Another PDF
              </button>
            </div>
          )}

          {/* Metadata Form */}
          <div className="mb-6 p-6 rounded-2xl border bg-white" style={{ borderColor: '#D8E3F8' }}>
            <h3 className="text-base font-semibold mb-4" style={{ color: '#101C34' }}>
              1. Textbook Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold mb-1.5 block" style={{ color: '#5A6B8C' }}>Textbook Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. OpenStax University Physics"
                  className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ borderColor: '#D8E3F8', color: '#101C34' }}
                />
              </div>
              <div>
                <label className="text-xs font-semibold mb-1.5 block" style={{ color: '#5A6B8C' }}>JAMB Subject *</label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  style={{ borderColor: '#D8E3F8', color: '#101C34' }}
                >
                  {SUBJECTS.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold mb-1.5 block" style={{ color: '#5A6B8C' }}>Author / Publisher</label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="e.g. OpenStax"
                  className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ borderColor: '#D8E3F8', color: '#101C34' }}
                />
              </div>
            </div>
          </div>

          {/* PDF Upload Card & Compression Stats */}
          <div className="mb-8 p-6 rounded-2xl border bg-white" style={{ borderColor: '#D8E3F8', boxShadow: '0 4px 16px -4px rgba(41,84,229,0.08)' }}>
            <h3 className="text-base font-semibold mb-4" style={{ color: '#101C34' }}>
              2. Select PDF & Compress on Server
            </h3>

            <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl transition-colors hover:border-blue-500" style={{ borderColor: '#D8E3F8', background: '#FAFBFF' }}>
              <FileText size={36} className="mb-3" style={{ color: '#2954E5' }} />
              <p className="text-sm font-medium mb-1" style={{ color: '#101C34' }}>
                {file ? `${file.name} (${formatBytes(file.size)})` : 'Upload PDF Textbook'}
              </p>
              <p className="text-xs mb-4" style={{ color: '#8493B0' }}>
                Files &gt; 14MB auto-compress via Ghostscript microservice before server batching
              </p>

              <div className="flex items-center gap-3 flex-wrap justify-center">
                <label className="cursor-pointer px-4 py-2 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-90" style={{ background: '#2954E5' }}>
                  Select PDF File
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>

                <button
                  type="button"
                  onClick={handleServerUploadAndProcess}
                  disabled={loading || !file}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white bg-green-600 disabled:opacity-40 transition-opacity hover:bg-green-700"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} />}
                  {loading ? 'Processing...' : 'Compress & Process on Server'}
                </button>
              </div>
            </div>

            {/* Compression Stats Badge */}
            {compressionStats && (
              <div className="mt-4 p-4 rounded-xl border flex items-center justify-between flex-wrap gap-3" style={{ background: '#F0FDF4', borderColor: '#86EFAC' }}>
                <div className="flex items-center gap-3">
                  <ShieldCheck size={20} color="#166534" />
                  <div>
                    <div className="text-xs font-bold text-green-900 uppercase tracking-wide">
                      Ghostscript Screen Compression Verified ✓
                    </div>
                    <div className="text-sm font-medium text-green-800">
                      Original: <span className="font-bold">{formatBytes(compressionStats.originalSize)}</span> ➔ Compressed: <span className="font-bold">{formatBytes(compressionStats.compressedSize)}</span> ({compressionStats.reductionPercent}% size saved)
                    </div>
                  </div>
                </div>
                {compressionStats.pages > 0 && (
                  <div className="text-xs px-3 py-1.5 rounded-lg bg-green-200 text-green-900 font-semibold">
                    {compressionStats.pages} Pages (Verified Unchanged ✓)
                  </div>
                )}
              </div>
            )}

            {/* Live Progress Bar */}
            {loading && (
              <div className="mt-6 flex flex-col gap-2 p-4 rounded-xl border" style={{ background: '#F0F4FF', borderColor: '#D8E3F8' }}>
                <div className="flex items-center justify-between text-xs font-semibold" style={{ color: '#2954E5' }}>
                  <span className="flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin" />
                    {statusText}
                  </span>
                  <span>{progressPercent}%</span>
                </div>
                <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ background: '#D8E3F8' }}>
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${progressPercent}%`, background: 'linear-gradient(90deg, #2954E5, #4f46e5)' }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Chapters Review & Edit */}
          {chapters.length > 0 && (
            <div className="flex flex-col gap-6">
              
              <div className="p-6 rounded-2xl border bg-white" style={{ borderColor: '#D8E3F8' }}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold" style={{ color: '#101C34' }}>
                    Extracted Chapters ({chapters.length})
                  </h3>
                  <button
                    onClick={addChapter}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors hover:bg-blue-50"
                    style={{ borderColor: '#D8E3F8', color: '#2954E5' }}
                  >
                    <Plus size={14} /> Add Chapter
                  </button>
                </div>

                <div className="flex flex-col md:flex-row gap-6 min-h-[400px]">
                  
                  {/* Chapter Navigation List */}
                  <div className="w-full md:w-1/3 flex flex-col gap-1 border-r pr-0 md:pr-4" style={{ borderColor: '#E3EAFB' }}>
                    {chapters.map((ch, idx) => (
                      <div
                        key={idx}
                        onClick={() => setActiveChapterIndex(idx)}
                        className={`flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer text-sm font-medium transition-colors ${
                          activeChapterIndex === idx ? 'bg-blue-600 text-white' : 'hover:bg-gray-100 text-gray-800'
                        }`}
                      >
                        <span className="truncate flex-1 pr-2">{ch.title || `Chapter ${idx + 1}`}</span>
                        {chapters.length > 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeChapter(idx);
                            }}
                            className={`p-1 rounded opacity-70 hover:opacity-100 ${
                              activeChapterIndex === idx ? 'hover:bg-blue-700' : 'hover:bg-red-50 text-red-600'
                            }`}
                            title="Delete Chapter"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Active Chapter Editor */}
                  {activeChapter && (
                    <div className="flex-1 flex flex-col gap-4">
                      <div>
                        <label className="text-xs font-semibold mb-1 block" style={{ color: '#5A6B8C' }}>Chapter Title</label>
                        <input
                          type="text"
                          value={activeChapter.title}
                          onChange={(e) => updateChapterTitle(activeChapterIndex, e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border text-sm outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                          style={{ borderColor: '#D8E3F8', color: '#101C34' }}
                        />
                      </div>

                      <div className="flex-1 flex flex-col">
                        <label className="text-xs font-semibold mb-1 block" style={{ color: '#5A6B8C' }}>Chapter Text Content</label>
                        <textarea
                          rows={14}
                          value={activeChapter.content}
                          onChange={(e) => updateChapterContent(activeChapterIndex, e.target.value)}
                          className="w-full flex-1 p-3 rounded-lg border text-sm outline-none font-mono leading-relaxed resize-y"
                          style={{ borderColor: '#D8E3F8', color: '#101C34', background: '#FAFBFF' }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Save Action Bar */}
              <div className="flex justify-end pt-2">
                <button
                  onClick={handleSaveTextbookManual}
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ background: '#2954E5' }}
                >
                  {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  {saving ? 'Saving...' : 'Update & Save Changes to Database'}
                </button>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}
