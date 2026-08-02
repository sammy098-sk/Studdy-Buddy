import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { PDFDocument } from 'pdf-lib';
import { ServerOCRPipeline } from './src/ServerOCRPipeline.js';

const app = express();
const PORT = process.env.PORT || 3001;

// ─── CORS ──────────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

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

// ─── ENDPOINT: Start Async Split Job ───────────────────────────────────────
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
  (async () => {
    try {
      const originalStat = await fs.promises.stat(inputPath);
      const totalBytes = originalStat.size;

      console.log(`[${jobId}] Processing PDF: ${req.file.originalname} | ${(totalBytes / (1024 * 1024)).toFixed(2)} MB`);

      const pdfBytes = await fs.promises.readFile(inputPath);

      // Execute Server-Side Pluggable OCR & Document Classification Pipeline
      try {
        jobs[jobId].processing_state = 'checking_for_text';
        const ocrResult = await ServerOCRPipeline.processDocument(pdfBytes, {
          targetOcrEngine: req.body?.ocr_engine || 'tesseract',
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

      jobs[jobId].processing_state = 'generating_embeddings';
      const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
      const totalPages = pdfDoc.getPageCount();

      const TARGET_CHUNK = 18 * 1024 * 1024; // Aim for ~18MB
      const MAX_CHUNK = 20 * 1024 * 1024; // Never exceed 20MB
      const avgBytesPerPage = totalBytes / totalPages;

      let chunks = [];
      let startPage = 0;
      let partNum = 1;
      const sessionPrefix = `${jobId}_split`;

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
        
        // Optimize upper bound using heuristic to prevent testing massive page ranges unnecessarily
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
            high = mid - 1; // Too large, search smaller range
          } else {
            bestBytes = bytes;
            bestPagesCount = mid;
            
            if (bytes.length >= TARGET_CHUNK) {
              // Sweet spot achieved (18MB - 20MB), stop searching to save resources
              break;
            }
            low = mid + 1; // Try to get closer to 18MB
          }
        }

        // Edge case fallback: if a single page is > 20MB, we must accept it to make progress
        if (!bestBytes) {
          bestBytes = await measureSize(startPage, startPage + 1);
          bestPagesCount = 1;
          console.warn(`[${jobId}] WARNING: Page ${startPage + 1} exceeds 20MB limit (${bestBytes.length} bytes)!`);
        }

        const endPage = startPage + bestPagesCount;
        const chunkFilename = `${sessionPrefix}_part${partNum}.pdf`;
        const chunkPath = path.join(os.tmpdir(), chunkFilename);
        
        await fs.promises.writeFile(chunkPath, bestBytes);
        jobs[jobId].filesToDelete.push(chunkPath);

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
      }

      jobs[jobId].status = 'completed';
      jobs[jobId].processing_state = jobs[jobId].ocr_result?.processing_state || 'completed';
      jobs[jobId].chunks = chunks;
      jobs[jobId].total_pages = totalPages;
      jobs[jobId].original_size = totalBytes;
      
      console.log(`[${jobId}] Processing complete. Created ${chunks.length} chunks. OCR status: ${jobs[jobId].processing_state}`);
    } catch (err) {
      console.error(`[${jobId}] Error:`, err);
      jobs[jobId].status = 'error';
      jobs[jobId].error = err.message;
    }
  })();
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

app.listen(PORT, () => {
  console.log(`PDF Splitter Async Microservice running on port ${PORT}`);
});
