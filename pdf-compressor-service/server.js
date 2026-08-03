import express from 'express';
import cors from 'cors';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { PDFDocument } from 'pdf-lib';
import { ServerOCRPipeline } from './src/ServerOCRPipeline.js';

const app = express();
const PORT = process.env.PORT || 3001;

// ─── CORS Configuration ────────────────────────────────────────────────────
const allowedOrigins = [
  'https://studdy-buddy-akvm.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, server-to-server, or same-origin)
    if (!origin || allowedOrigins.some(o => origin === o || origin.startsWith(o))) {
      return callback(null, true);
    }
    // Automatically trust Vercel preview/production deployments and local network dev URLs
    if (origin.endsWith('.vercel.app') || origin.endsWith('.onrender.com') || origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }
    console.warn(`[CORS] Blocked cross-origin request from origin: ${origin}`);
    return callback(new Error('Not allowed by CORS policy'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS', 'DELETE', 'PUT'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

app.use(express.json({ limit: '250mb' }));
app.use(express.urlencoded({ limit: '250mb', extended: true }));

const upload = multer({ 
  dest: os.tmpdir(),
  limits: { fileSize: 250 * 1024 * 1024 } // 250 MB limit
});

// Store jobs in memory (for Phase 1, simple polling)
const jobs = {};

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'PDF Splitter Service (Async)' });
});

// ─── ENDPOINT: Serve Split Chunks ──────────────────────────────────────────
app.get('/download/:filename', (req, res) => {
  const filePath = path.join(os.tmpdir(), req.params.filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Chunk not found or expired.' });
  }
  res.sendFile(filePath);
});

// ─── HELPER: Background Document Processing & OCR ─────────────────────────
async function runBackgroundProcessing(jobId, inputPath, originalName, targetOcrEngine = 'tesseract') {
  try {
    const originalStat = await fs.promises.stat(inputPath);
    const totalBytes = originalStat.size;

    console.log(`[${jobId}] Processing PDF: ${originalName} | ${(totalBytes / (1024 * 1024)).toFixed(2)} MB`);

    const pdfBytes = await fs.promises.readFile(inputPath);

    // Execute Server-Side Pluggable OCR & Document Classification Pipeline
    try {
      jobs[jobId].processing_state = 'checking_for_text';
      const ocrResult = await ServerOCRPipeline.processDocument(pdfBytes, {
        targetOcrEngine: targetOcrEngine || 'tesseract',
        onProgress: (state, meta) => {
          if (jobs[jobId]) {
            jobs[jobId].processing_state = state;
            jobs[jobId].progress_meta = meta;
          }
        }
      });
      jobs[jobId].ocr_result = ocrResult;
    } catch (ocrErr) {
      console.warn(`[${jobId}] OCR Pipeline encountered non-fatal error:`, ocrErr.message);
    }

    // Request V8 garbage collection if enabled to prevent OOM on limited server tiers
    if (typeof global.gc === 'function') {
      global.gc();
    }

    jobs[jobId].processing_state = 'generating_embeddings';
    const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const totalPages = pdfDoc.getPageCount();

    const TARGET_CHUNK = 18 * 1024 * 1024; // Aim for ~18MB
    const MAX_CHUNK = 20 * 1024 * 1024; // Never exceed 20MB
    const avgBytesPerPage = totalBytes / totalPages;

    let chunks = [];
    let startPage = 0;
    let partNum = 1;

    const measureSize = async (start, end) => {
      const newPdf = await PDFDocument.create();
      const pageIndices = Array.from({ length: end - start }, (_, i) => start + i);
      const copiedPages = await newPdf.copyPages(pdfDoc, pageIndices);
      copiedPages.forEach((page) => newPdf.addPage(page));
      const bytes = await newPdf.save();
      return bytes;
    };

    while (startPage < totalPages) {
      let low = 1;
      let high = totalPages - startPage;
      
      // Optimize upper bound using heuristic to prevent testing massive page ranges
      let heuristicPages = Math.floor(TARGET_CHUNK / avgBytesPerPage);
      if (heuristicPages < 1) heuristicPages = 1;
      high = Math.min(high, Math.ceil(heuristicPages * 1.5));

      let bestBytes = null;
      let bestPagesCount = 1;

      console.log(`[${jobId}] Calculating optimal size for Part ${partNum} starting at page ${startPage + 1}...`);
      
      while (low <= high) {
        let mid = Math.floor((low + high) / 2);
        const bytes = await measureSize(startPage, startPage + mid);
        
        if (bytes.length > MAX_CHUNK) {
          high = mid - 1;
        } else {
          bestBytes = bytes;
          bestPagesCount = mid;
          if (bytes.length >= TARGET_CHUNK) break;
          low = mid + 1;
        }
      }

      if (!bestBytes) {
        bestPagesCount = 1;
        bestBytes = await measureSize(startPage, startPage + 1);
      }

      const endPage = startPage + bestPagesCount;
      const chunkFilename = `${jobId}_part_${partNum}.pdf`;
      const chunkPath = path.join(os.tmpdir(), chunkFilename);

      await fs.promises.writeFile(chunkPath, bestBytes);
      if (jobs[jobId]) {
        jobs[jobId].filesToDelete.push(chunkPath);
      }

      const checksum = crypto.createHash('sha256').update(bestBytes).digest('hex');

      chunks.push({
        part_number: partNum,
        first_page: startPage + 1,
        last_page: endPage,
        page_count: bestPagesCount,
        size_bytes: bestBytes.length,
        checksum: checksum,
        download_url: `/download/${chunkFilename}`
      });

      console.log(`[${jobId}] Part ${partNum} created: Pages ${startPage + 1}-${endPage} | ${(bestBytes.length / (1024 * 1024)).toFixed(2)} MB`);
      
      startPage = endPage;
      partNum++;
      bestBytes = null; // Free chunk memory
    }

    jobs[jobId].status = 'completed';
    jobs[jobId].processing_state = jobs[jobId].ocr_result?.processing_state || 'completed';
    jobs[jobId].chunks = chunks;
    jobs[jobId].total_pages = totalPages;
    jobs[jobId].original_size = totalBytes;
    
    console.log(`[${jobId}] Processing complete. Created ${chunks.length} chunks. OCR status: ${jobs[jobId].processing_state}`);
  } catch (err) {
    console.error(`[${jobId}] Error:`, err);
    if (jobs[jobId]) {
      jobs[jobId].status = 'error';
      jobs[jobId].error = err.message;
    }
  }
}

// ─── ENDPOINT: Start Async Split Job (Single Shot) ──────────────────────────
app.post('/jobs/split', upload.single('file'), (req, res) => {
  const inputPath = req.file?.path;
  if (!inputPath) return res.status(400).json({ error: 'No PDF uploaded.' });

  const jobId = `job_${crypto.randomBytes(8).toString('hex')}`;
  
  jobs[jobId] = {
    status: 'processing',
    processing_state: 'uploaded',
    progress_meta: {},
    ocr_result: null,
    originalName: req.file.originalname,
    chunks: [],
    error: null,
    filesToDelete: [inputPath],
    createdAt: Date.now()
  };

  res.json({ success: true, jobId, status: 'processing', processing_state: 'uploaded' });

  // Start background task
  runBackgroundProcessing(jobId, inputPath, req.file.originalname, req.body?.ocr_engine);
});

// ─── ENDPOINT: Resumable Chunked Upload & Process ──────────────────────────
app.post('/jobs/upload-chunk', upload.single('chunk'), async (req, res) => {
  try {
    const { uploadId, chunkIndex, totalChunks, originalName, ocr_engine } = req.body;
    if (!req.file || !uploadId || chunkIndex === undefined || !totalChunks) {
      return res.status(400).json({ error: 'Missing chunk payload or required parameters.' });
    }

    const safeUploadId = String(uploadId).replace(/[^a-zA-Z0-9_-]/g, '');
    const targetPath = path.join(os.tmpdir(), `merged_${safeUploadId}.pdf`);

    const chunkBytes = await fs.promises.readFile(req.file.path);
    await fs.promises.appendFile(targetPath, chunkBytes);

    if (fs.existsSync(req.file.path)) {
      await fs.promises.unlink(req.file.path).catch(console.error);
    }

    const currentIdx = Number(chunkIndex);
    const totalIdx = Number(totalChunks);

    console.log(`[${safeUploadId}] Received segment ${currentIdx + 1}/${totalIdx} (${(chunkBytes.length / (1024 * 1024)).toFixed(2)} MB)`);

    if (currentIdx + 1 === totalIdx) {
      const jobId = `job_${crypto.randomBytes(8).toString('hex')}`;
      jobs[jobId] = {
        status: 'processing',
        processing_state: 'uploaded',
        progress_meta: {},
        ocr_result: null,
        originalName: originalName || 'document.pdf',
        chunks: [],
        error: null,
        filesToDelete: [targetPath],
        createdAt: Date.now()
      };

      runBackgroundProcessing(jobId, targetPath, originalName || 'document.pdf', ocr_engine || 'tesseract');

      return res.json({
        success: true,
        isComplete: true,
        jobId,
        status: 'processing',
        processing_state: 'uploaded'
      });
    }

    return res.json({
      success: true,
      isComplete: false,
      chunkIndex: currentIdx
    });
  } catch (err) {
    console.error('Chunk upload failure:', err);
    return res.status(500).json({ error: `Chunk upload failed: ${err.message}` });
  }
});

// ─── ENDPOINT: Poll Job Status ─────────────────────────────────────────────
app.get('/jobs/:jobId', (req, res) => {
  const job = jobs[req.params.jobId];
  if (!job) return res.status(404).json({ error: 'Job not found.' });

  res.json({
    status: job.status,
    processing_state: job.processing_state || job.status,
    progress_meta: job.progress_meta || {},
    ocr_result: job.ocr_result || null,
    error: job.error,
    total_pages: job.total_pages,
    original_size: job.original_size,
    chunks: job.chunks
  });
});

// ─── ENDPOINT: Cleanup Job ─────────────────────────────────────────────────
app.post('/jobs/:jobId/complete', async (req, res) => {
  const job = jobs[req.params.jobId];
  if (!job) return res.status(404).json({ error: 'Job not found.' });

  console.log(`[${req.params.jobId}] Cleaning up ${job.filesToDelete.length} temporary files...`);
  for (const file of job.filesToDelete) {
    if (fs.existsSync(file)) {
      await fs.promises.unlink(file).catch(err => console.error(`Cleanup error on ${file}:`, err));
    }
  }

  delete jobs[req.params.jobId];
  res.json({ success: true, message: 'Cleanup complete.' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  res.status(500).json({ error: err.message });
});

const server = app.listen(PORT, () => {
  console.log(`PDF Splitter Async Microservice running on port ${PORT}`);
});

// Accommodate large payloads and intense OCR computations (15 minutes timeout)
server.setTimeout(900 * 1000);
server.keepAliveTimeout = 65 * 1000;
server.headersTimeout = 66 * 1000;
