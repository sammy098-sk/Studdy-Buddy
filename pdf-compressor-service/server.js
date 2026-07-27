import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { execFile } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import pdfParse from 'pdf-parse';

const app = express();
const PORT = process.env.PORT || 3001;

// Explicit CORS configuration — must come before ALL routes and error handlers
const corsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: [
    'x-original-size',
    'x-compressed-size',
    'x-original-pages',
    'x-compressed-pages',
    'x-compression-pass',
  ],
};
app.use(cors(corsOptions));

// Handle preflight OPTIONS requests explicitly for all routes
app.options('*', cors(corsOptions));

app.use(express.json());

// Set up temporary storage for file uploads
const upload = multer({ dest: os.tmpdir() });

/**
 * Execute Ghostscript binary to compress PDF
 */
function runGhostscript(inputPath, outputPath, settingsPreset = '/screen') {
  return new Promise((resolve, reject) => {
    // GS arguments for screen quality image downsampling
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

// Health check endpoint
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

    console.log(`Processing PDF: ${req.file.originalname} | Original Size: ${(originalSize / (1024 * 1024)).toFixed(2)} MB | Pages: ${originalPageCount}`);

    // Pass 1: Standard Screen Quality Preset
    console.log('Running Ghostscript Pass 1 (/screen)...');
    await runGhostscript(inputPath, outputPathPass1, '/screen');

    let finalOutputPath = outputPathPass1;
    let compressionPass = 'screen';
    let compressedStat = await fs.promises.stat(outputPathPass1);
    let compressedSize = compressedStat.size;
    let compressedPageCount = await getPdfPageCount(outputPathPass1);

    // Pass 2: Aggressive Pass if Pass 1 is still > 14MB (14,680,064 bytes)
    const MAX_TARGET_BYTES = 14 * 1024 * 1024;
    if (compressedSize > MAX_TARGET_BYTES) {
      console.log('Pass 1 size still > 14MB. Running Ghostscript Pass 2 (/ebook aggressive)...');
      try {
        await runGhostscript(inputPath, outputPathPass2, '/ebook');
        const pass2Stat = await fs.promises.stat(outputPathPass2);
        const pass2PageCount = await getPdfPageCount(outputPathPass2);

        // Accept Pass 2 if page count is verified and size is smaller
        if (pass2PageCount === originalPageCount && pass2Stat.size < compressedSize) {
          finalOutputPath = outputPathPass2;
          compressedSize = pass2Stat.size;
          compressedPageCount = pass2PageCount;
          compressionPass = 'aggressive';
        }
      } catch (pass2Err) {
        console.warn('Pass 2 warning, sticking to Pass 1 result:', pass2Err.message);
      }
    }

    // VERIFICATION CHECK: Ensure page count is 100% unchanged
    if (originalPageCount > 0 && compressedPageCount > 0 && originalPageCount !== compressedPageCount) {
      console.error(`Page count mismatch! Original: ${originalPageCount}, Compressed: ${compressedPageCount}`);
      return res.status(422).json({
        error: `Compression verification failed: Page count mismatch (Original: ${originalPageCount}, Compressed: ${compressedPageCount}). Compression aborted to prevent corruption.`,
      });
    }

    // Set Response Metadata Headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('x-original-size', originalSize.toString());
    res.setHeader('x-compressed-size', compressedSize.toString());
    res.setHeader('x-original-pages', originalPageCount.toString());
    res.setHeader('x-compressed-pages', compressedPageCount.toString());
    res.setHeader('x-compression-pass', compressionPass);

    // Pipe compressed file to client
    const readStream = fs.createReadStream(finalOutputPath);
    readStream.pipe(res);

    readStream.on('end', async () => {
      // Clean up temporary files
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

    // Clean up temporary files on error
    try {
      if (fs.existsSync(inputPath)) await fs.promises.unlink(inputPath);
      if (fs.existsSync(outputPathPass1)) await fs.promises.unlink(outputPathPass1);
      if (fs.existsSync(outputPathPass2)) await fs.promises.unlink(outputPathPass2);
    } catch (_) {}
  }
});

// Global error handler — ensures CORS headers are always present even on unhandled errors
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Ghostscript PDF Compression Microservice running on port ${PORT}`);
});
