import express from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { PDFDocument } from 'pdf-lib';

const app = express();
const PORT = process.env.PORT || 3001;

// ─── CORS ──────────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
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

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'PDF Splitter Service' });
});

// ─── ENDPOINT: Serve Split Chunks ──────────────────────────────────────────
app.get('/download/:filename', (req, res) => {
  const filePath = path.join(os.tmpdir(), req.params.filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Chunk not found or expired.' });
  }
  res.sendFile(filePath);
});

// ─── ENDPOINT: Split PDF ───────────────────────────────────────────────────
app.post('/split', upload.single('file'), async (req, res) => {
  const inputPath = req.file?.path;
  if (!inputPath) return res.status(400).json({ error: 'No PDF uploaded.' });

  try {
    const originalStat = await fs.promises.stat(inputPath);
    const totalBytes = originalStat.size;
    const MAX_CHUNK_SIZE = 20 * 1024 * 1024; // 20 MB

    console.log(`Processing PDF: ${req.file.originalname} | ${(totalBytes / (1024 * 1024)).toFixed(2)} MB`);

    const pdfBytes = await fs.promises.readFile(inputPath);
    const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const totalPages = pdfDoc.getPageCount();

    // Calculate heuristic for chunking
    const avgBytesPerPage = totalBytes / totalPages;
    // Aim for ~18MB to be safe below the 20MB limit
    const TARGET_CHUNK = 18 * 1024 * 1024;
    let pagesPerChunk = Math.floor(TARGET_CHUNK / avgBytesPerPage);
    if (pagesPerChunk < 1) pagesPerChunk = 1;

    let chunks = [];
    let startPage = 0;
    let partNum = 1;
    const sessionPrefix = `split_${Date.now()}`;

    while (startPage < totalPages) {
      let endPage = Math.min(startPage + pagesPerChunk, totalPages);
      
      console.log(`Splitting Part ${partNum}: Pages ${startPage + 1} to ${endPage}`);
      const newPdf = await PDFDocument.create();
      
      const pageIndices = Array.from({ length: endPage - startPage }, (_, i) => startPage + i);
      const copiedPages = await newPdf.copyPages(pdfDoc, pageIndices);
      copiedPages.forEach((page) => newPdf.addPage(page));

      const newPdfBytes = await newPdf.save();
      const chunkFilename = `${sessionPrefix}_part${partNum}.pdf`;
      const chunkPath = path.join(os.tmpdir(), chunkFilename);
      
      await fs.promises.writeFile(chunkPath, newPdfBytes);

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

    // Cleanup original file
    if (fs.existsSync(inputPath)) await fs.promises.unlink(inputPath);

    res.json({
      success: true,
      original_size: totalBytes,
      total_pages: totalPages,
      total_parts: chunks.length,
      chunks: chunks
    });

  } catch (err) {
    console.error('Split Error:', err);
    if (fs.existsSync(inputPath)) await fs.promises.unlink(inputPath).catch(()=>{});
    res.status(500).json({ error: err.message });
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  res.status(500).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log(`PDF Splitter Microservice running on port ${PORT}`);
});
