import express from 'express';
import multer from 'multer';
import { execFile } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import pdfParse from 'pdf-parse';

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

app.use(express.json());

// Set up temporary storage for file uploads
const upload = multer({ dest: os.tmpdir() });

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

// Global error handler — CORS headers already set by top middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Ghostscript PDF Compression Microservice running on port ${PORT}`);
});
