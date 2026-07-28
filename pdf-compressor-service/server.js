import express from 'express';
import multer from 'multer';
import { execFile } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import pdfParse from 'pdf-parse';
import { fileURLToPath } from 'url';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.js';
import Tesseract from 'tesseract.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure pdfjs CMap path for proper embedded font decoding
const CMAP_URL = path.join(__dirname, 'node_modules', 'pdfjs-dist', 'cmaps') + '/';
const CMAP_PACKED = true;
const STANDARD_FONT_DATA_URL = path.join(__dirname, 'node_modules', 'pdfjs-dist', 'standard_fonts') + '/';

const app = express();
const PORT = process.env.PORT || 3001;

// ─── CORS: Must be the VERY FIRST middleware ────────────────────────────────
// Manually set headers on every single response, including errors.
// We do NOT rely solely on the cors() npm package because multer can
// intercept before it runs on multipart requests.
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader(
    'Access-Control-Expose-Headers',
    'x-original-size, x-compressed-size, x-original-pages, x-compressed-pages, x-compression-pass'
  );

  // Answer preflight immediately — before any other middleware runs
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
});

app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ limit: '200mb', extended: true }));

// Set up temporary storage for file uploads with an explicit large limit
const upload = multer({ 
  dest: os.tmpdir(),
  limits: { fileSize: 200 * 1024 * 1024 } // 200 MB limit
});

/**
 * Execute Ghostscript binary to compress PDF
 */
function runGhostscript(inputPath, outputPath, settingsPreset = '/screen') {
  return new Promise((resolve, reject) => {
    const args = [
      '-sDEVICE=pdfwrite',
      '-dCompatibilityLevel=1.4',
      `-dPDFSETTINGS=${settingsPreset}`,
      '-dDownsampleColorImages=true',
      '-dColorImageResolution=120',
      '-dDownsampleGrayImages=true',
      '-dGrayImageResolution=120',
      '-dDownsampleMonoImages=true',
      '-dMonoImageResolution=120',
      '-dNOPAUSE',
      '-dQUIET',
      '-dBATCH',
      `-sOutputFile=${outputPath}`,
      inputPath,
    ];

    execFile('gs', args, (error, stdout, stderr) => {
      if (error) {
        console.error('Ghostscript Execution Error:', error, stderr);
        return reject(error);
      }
      resolve(stdout);
    });
  });
}

/**
 * Verify page count using pdf-parse
 */
async function getPdfPageCount(filePath) {
  try {
    const buffer = await fs.promises.readFile(filePath);
    const data = await pdfParse(buffer);
    return data.numpages || 0;
  } catch (err) {
    console.error('Page Count Reading Error:', err);
    return 0;
  }
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Ghostscript PDF Compressor', timestamp: new Date() });
});

// PDF Compression Endpoint
app.post('/compress', upload.single('file'), async (req, res) => {
  const inputPath = req.file?.path;
  const outputPathPass1 = path.join(os.tmpdir(), `compressed_pass1_${Date.now()}.pdf`);
  const outputPathPass2 = path.join(os.tmpdir(), `compressed_pass2_${Date.now()}.pdf`);

  if (!inputPath) {
    return res.status(400).json({ error: 'No PDF file uploaded.' });
  }

  try {
    const originalStat = await fs.promises.stat(inputPath);
    const originalSize = originalStat.size;
    const originalPageCount = await getPdfPageCount(inputPath);

    console.log(`Processing PDF: ${req.file.originalname} | ${(originalSize / (1024 * 1024)).toFixed(2)} MB | Pages: ${originalPageCount}`);

    // Pass 1: Screen quality
    console.log('Running Ghostscript Pass 1 (/screen)...');
    await runGhostscript(inputPath, outputPathPass1, '/screen');

    let finalOutputPath = outputPathPass1;
    let compressionPass = 'screen';
    let compressedStat = await fs.promises.stat(outputPathPass1);
    let compressedSize = compressedStat.size;
    let compressedPageCount = await getPdfPageCount(outputPathPass1);

    // Pass 2: Aggressive if still > 14MB
    const MAX_TARGET_BYTES = 14 * 1024 * 1024;
    if (compressedSize > MAX_TARGET_BYTES) {
      console.log('Pass 1 still > 14MB — running Pass 2 (/ebook)...');
      try {
        await runGhostscript(inputPath, outputPathPass2, '/ebook');
        const pass2Stat = await fs.promises.stat(outputPathPass2);
        const pass2PageCount = await getPdfPageCount(outputPathPass2);

        if (pass2PageCount === originalPageCount && pass2Stat.size < compressedSize) {
          finalOutputPath = outputPathPass2;
          compressedSize = pass2Stat.size;
          compressedPageCount = pass2PageCount;
          compressionPass = 'aggressive';
        }
      } catch (pass2Err) {
        console.warn('Pass 2 warning, keeping Pass 1 result:', pass2Err.message);
      }
    }

    // Verification: page count must be unchanged
    if (originalPageCount > 0 && compressedPageCount > 0 && originalPageCount !== compressedPageCount) {
      console.error(`Page count mismatch! Original: ${originalPageCount}, Compressed: ${compressedPageCount}`);
      return res.status(422).json({
        error: `Page count mismatch (Original: ${originalPageCount}, Compressed: ${compressedPageCount}). Aborted to prevent corruption.`,
      });
    }

    // Set metadata headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('x-original-size', originalSize.toString());
    res.setHeader('x-compressed-size', compressedSize.toString());
    res.setHeader('x-original-pages', originalPageCount.toString());
    res.setHeader('x-compressed-pages', compressedPageCount.toString());
    res.setHeader('x-compression-pass', compressionPass);

    // Stream compressed file back
    const readStream = fs.createReadStream(finalOutputPath);
    readStream.pipe(res);

    readStream.on('end', async () => {
      try {
        if (fs.existsSync(inputPath)) await fs.promises.unlink(inputPath);
        if (fs.existsSync(outputPathPass1)) await fs.promises.unlink(outputPathPass1);
        if (fs.existsSync(outputPathPass2)) await fs.promises.unlink(outputPathPass2);
      } catch (err) {
        console.error('Cleanup Warning:', err);
      }
    });

  } catch (err) {
    console.error('Compression Endpoint Error:', err);
    res.status(500).json({ error: `Ghostscript compression failed: ${err.message}` });

    try {
      if (fs.existsSync(inputPath)) await fs.promises.unlink(inputPath);
      if (fs.existsSync(outputPathPass1)) await fs.promises.unlink(outputPathPass1);
      if (fs.existsSync(outputPathPass2)) await fs.promises.unlink(outputPathPass2);
    } catch (_) {}
  }
});

// ─── PDF TEXT EXTRACTION & OCR ENDPOINT ─────────────────────────────────────
app.post('/extract', async (req, res) => {
  const { signedUrl, start_page = 1, batch_size = 50 } = req.body;
  if (!signedUrl) return res.status(400).json({ error: 'signedUrl is required' });

  const start = Math.max(1, parseInt(start_page, 10));
  const batchSz = parseInt(batch_size, 10);
  const pdfTmpPath = path.join(os.tmpdir(), `extract_${Date.now()}.pdf`);

  try {
    const fileRes = await fetch(signedUrl);
    if (!fileRes.ok) throw new Error(`Fetch failed: ${fileRes.status}`);
    const buffer = await fileRes.arrayBuffer();
    await fs.promises.writeFile(pdfTmpPath, Buffer.from(buffer));

    // Load PDF with CMaps enabled to fix the Caesar shift/encoding issues
    const pdf = await pdfjsLib.getDocument({
      data: new Uint8Array(buffer),
      cMapUrl: CMAP_URL,
      cMapPacked: CMAP_PACKED,
      standardFontDataUrl: STANDARD_FONT_DATA_URL,
      disableFontFace: true,
    }).promise;

    const totalPages = pdf.numPages;
    const end = Math.min(start + batchSz - 1, totalPages);
    let batchText = "";

    for (let pageNum = start; pageNum <= end; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      let pageText = textContent.items.map(item => item.str).join(" ");
      
      // Heuristic for scanned pages: few printable chars but has items/images
      if (pageText.replace(/\s/g, '').length < 30) {
        console.log(`Page ${pageNum} appears scanned (len=${pageText.length}). Running OCR...`);
        const imgTmpPath = path.join(os.tmpdir(), `page_${pageNum}_${Date.now()}.png`);
        try {
          // Render to PNG using Ghostscript
          await new Promise((resolve, reject) => {
            const args = [
              '-dQUIET', '-dPARANOIDSAFER', '-dBATCH', '-dNOPAUSE', '-dNOPROMPT',
              '-sDEVICE=png16m', '-r300',
              `-dFirstPage=${pageNum}`, `-dLastPage=${pageNum}`,
              `-sOutputFile=${imgTmpPath}`,
              pdfTmpPath
            ];
            execFile('gs', args, (error) => {
              if (error) return reject(error);
              resolve();
            });
          });

          // Run Tesseract OCR on the generated image
          const { data: { text } } = await Tesseract.recognize(imgTmpPath, 'eng', { 
            logger: m => {} 
          });
          pageText = text;
        } catch (ocrErr) {
          console.error(`OCR failed on page ${pageNum}:`, ocrErr);
        } finally {
          if (fs.existsSync(imgTmpPath)) await fs.promises.unlink(imgTmpPath);
        }
      }

      batchText += `\n\n--- Page ${pageNum} ---\n\n` + pageText;
      page.cleanup();
    }

    pdf.destroy();
    if (fs.existsSync(pdfTmpPath)) await fs.promises.unlink(pdfTmpPath);

    const cleanText = batchText.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
    const isLastBatch = end >= totalPages;

    res.json({
      success: true,
      total_pages: totalPages,
      start_page: start,
      end_page: end,
      is_last_batch: isLastBatch,
      extracted_text: cleanText,
    });
  } catch (err) {
    console.error("Extraction Endpoint Error:", err);
    if (fs.existsSync(pdfTmpPath)) await fs.promises.unlink(pdfTmpPath).catch(()=>{});
    res.status(500).json({ error: err.message });
  }
});

// Global error handler — CORS headers already set by top middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Ghostscript PDF Compression Microservice running on port ${PORT}`);
});
