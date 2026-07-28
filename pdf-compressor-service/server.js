import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import { PDFDocument } from 'pdf-lib';

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
    originalName: req.file.originalname,
    chunks: [],
    error: null,
    filesToDelete: [inputPath],
    createdAt: Date.now()
  };

  res.json({ success: true, jobId, status: 'processing' });

  // Start background task
  (async () => {
    try {
      const originalStat = await fs.promises.stat(inputPath);
      const totalBytes = originalStat.size;

      console.log(`[${jobId}] Processing PDF: ${req.file.originalname} | ${(totalBytes / (1024 * 1024)).toFixed(2)} MB`);

      const pdfBytes = await fs.promises.readFile(inputPath);
      const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
      const totalPages = pdfDoc.getPageCount();

      // Heuristic chunk calculation
      const avgBytesPerPage = totalBytes / totalPages;
      const TARGET_CHUNK = 18 * 1024 * 1024; // Aim for ~18MB
      let pagesPerChunk = Math.floor(TARGET_CHUNK / avgBytesPerPage);
      if (pagesPerChunk < 1) pagesPerChunk = 1;

      let chunks = [];
      let startPage = 0;
      let partNum = 1;
      const sessionPrefix = `${jobId}_split`;

      while (startPage < totalPages) {
        let endPage = Math.min(startPage + pagesPerChunk, totalPages);
        
        console.log(`[${jobId}] Splitting Part ${partNum}: Pages ${startPage + 1} to ${endPage}`);
        const newPdf = await PDFDocument.create();
        
        const pageIndices = Array.from({ length: endPage - startPage }, (_, i) => startPage + i);
        const copiedPages = await newPdf.copyPages(pdfDoc, pageIndices);
        copiedPages.forEach((page) => newPdf.addPage(page));

        const newPdfBytes = await newPdf.save();
        const chunkFilename = `${sessionPrefix}_part${partNum}.pdf`;
        const chunkPath = path.join(os.tmpdir(), chunkFilename);
        
        await fs.promises.writeFile(chunkPath, newPdfBytes);
        
        jobs[jobId].filesToDelete.push(chunkPath);

        chunks.push({
          part_number: partNum,
          first_page: startPage + 1,
          last_page: endPage,
          size_bytes: newPdfBytes.length,
          download_url: `/download/${chunkFilename}`
        });

        startPage = endPage;
        partNum++;
      }

      jobs[jobId].status = 'completed';
      jobs[jobId].chunks = chunks;
      jobs[jobId].total_pages = totalPages;
      jobs[jobId].original_size = totalBytes;
      
      console.log(`[${jobId}] Processing complete. Created ${chunks.length} chunks.`);
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
