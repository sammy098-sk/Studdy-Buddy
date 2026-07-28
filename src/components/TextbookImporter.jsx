import React, { useState } from 'react';
import { Upload, FileText, CheckCircle2, Loader2, AlertCircle, Server, RefreshCw } from 'lucide-react';
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
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Retry state
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
    setSaveSuccess(false);
    setFailedChunkIndex(null);
    setPendingChunks([]);
    
    // Parse page count locally
    setStatusText('Inspecting PDF...');
    setIsProcessing(true);
    try {
      const buffer = await selectedFile.arrayBuffer();
      const pdf = await pdfjsLib.getDocument(buffer).promise;
      setFileStats({
        pages: pdf.numPages,
        size: selectedFile.size,
      });
    } catch (err) {
      console.warn("Failed to read page count locally:", err);
      setFileStats({ size: selectedFile.size, pages: 'Unknown' });
    } finally {
      setIsProcessing(false);
      setStatusText('');
    }
  };

  const uploadChunkToSupabase = async (chunk, index, totalChunks, bookId) => {
    setStatusText(`Uploading Part ${index + 1} of ${totalChunks}...`);
    
    const COMPRESSOR_URL = import.meta.env.VITE_COMPRESSOR_URL || 'http://localhost:3001';
    
    // 1. Fetch chunk blob from Render
    const response = await fetch(`${COMPRESSOR_URL}${chunk.download_url}`);
    if (!response.ok) throw new Error(`Failed to download part ${index + 1} from processor.`);
    const chunkBlob = await response.blob();

    // 2. Upload to Supabase Storage
    const cleanFileName = `${Date.now()}_part${chunk.part_number}.pdf`;
    const { error: uploadErr } = await supabase.storage
      .from('textbooks-pdf')
      .upload(cleanFileName, chunkBlob, { contentType: 'application/pdf', upsert: false });
    
    if (uploadErr) throw new Error(`Storage upload failed for part ${index + 1}: ${uploadErr.message}`);

    // 3. Insert chunk metadata into database
    const { error: dbErr } = await supabase.from('textbook_chunks').insert({
      book_id: bookId,
      part_number: chunk.part_number,
      first_page: chunk.first_page,
      last_page: chunk.last_page,
      storage_path: cleanFileName,
      size_bytes: chunk.size_bytes
    });

    if (dbErr) throw new Error(`Database error for part ${index + 1}: ${dbErr.message}`);
    
    return true;
  };

  const processUploadLoop = async (chunks, startIdx, bookId) => {
    try {
      const totalChunks = chunks.length;
      for (let i = startIdx; i < totalChunks; i++) {
        await uploadChunkToSupabase(chunks[i], i, totalChunks, bookId);
        setProgressPercent(40 + Math.round(((i + 1) / totalChunks) * 60));
      }

      setStatusText('');
      setProgressPercent(100);
      setSaveSuccess(true);
      setFailedChunkIndex(null);
    } catch (err) {
      console.error(err);
      setErrorMessage(err.message);
      setFailedChunkIndex(startIdx); // Save index for retry
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStartUpload = async () => {
    if (!file || !title) return;
    setIsProcessing(true);
    setErrorMessage(null);
    setFailedChunkIndex(null);
    setProgressPercent(10);
    setStatusText('Sending PDF to server for splitting...');

    try {
      const COMPRESSOR_URL = import.meta.env.VITE_COMPRESSOR_URL || 'http://localhost:3001';
      
      const formData = new FormData();
      formData.append('file', file);

      // STEP 1: Split PDF on Server
      const splitRes = await fetch(`${COMPRESSOR_URL}/split`, {
        method: 'POST',
        body: formData,
      });

      if (!splitRes.ok) {
        let msg = await splitRes.text();
        throw new Error(`Server splitting failed: ${msg}`);
      }

      const splitData = await splitRes.json();
      if (splitData.error) throw new Error(splitData.error);
      
      const chunks = splitData.chunks || [];
      setPendingChunks(chunks);
      setProgressPercent(30);
      setStatusText(`PDF split into ${chunks.length} parts. Creating database record...`);

      // STEP 2: Create Parent Book Record
      const { data: bookRecord, error: bookErr } = await supabase.from('textbooks').insert({
        title: title.trim(),
        subject: subject,
        author: author.trim() || null,
        total_pages: splitData.total_pages,
        total_parts: chunks.length
      }).select().single();

      if (bookErr || !bookRecord) throw new Error(`Failed to create textbook record: ${bookErr?.message}`);
      
      const newBookId = bookRecord.id;
      setParentBookId(newBookId);
      setProgressPercent(40);

      // STEP 3: Sequential Chunk Upload
      await processUploadLoop(chunks, 0, newBookId);

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
    await processUploadLoop(pendingChunks, failedChunkIndex, parentBookId);
  };

  return (
    <div className="flex-1 overflow-y-auto flex flex-col" style={{ background: '#FAFBFF' }}>
      <div className="flex-1 px-4 sm:px-8 py-10">
        <div className="max-w-4xl mx-auto">
          <BackToHomeButton onNavigate={onNavigate} />

          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #2954E5, #4f46e5)' }}>
              <Server size={20} color="#FFFFFF" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold" style={{ color: '#101C34', fontFamily: "'Montserrat', sans-serif" }}>
                Large PDF Textbooks
              </h2>
              <p className="text-sm" style={{ color: '#8493B0' }}>
                Upload massive PDFs safely. Books &gt;20MB are automatically split and streamed.
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
                  className="ml-auto px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium flex items-center gap-2"
                >
                  <RefreshCw size={16} />
                  Retry Part {failedChunkIndex + 1}
                </button>
              )}
            </div>
          )}

          {saveSuccess ? (
            <div className="mb-6 p-4 rounded-xl flex items-center justify-between text-sm" style={{ background: '#F0FDF4', borderColor: '#86EFAC', color: '#166534', border: '1px solid' }}>
              <div className="flex items-center gap-3">
                <CheckCircle2 size={18} />
                <span>Textbook successfully uploaded and chunked!</span>
              </div>
              <button
                onClick={() => {
                  setFile(null);
                  setFileStats(null);
                  setTitle('');
                  setAuthor('');
                  setSaveSuccess(false);
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-700 text-white hover:bg-green-800 transition-colors"
              >
                Upload Another
              </button>
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
                    Upload textbooks up to 250MB. They will be automatically split for safe storage on Supabase Free Tier.
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
                    <div className="flex justify-end">
                      <button onClick={handleStartUpload} disabled={!title.trim() || !file} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50">
                        Upload & Chunk PDF
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
