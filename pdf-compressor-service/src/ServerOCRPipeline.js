import { OCRProviderFactory } from './ocr/OCRProviderFactory.js';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

/**
 * ServerOCRPipeline
 * Core backend orchestrator managing PDF document classification, independent page extraction,
 * image preprocessing, pluggable OCR engine routing, and granular real-time progress state reporting.
 */
export class ServerOCRPipeline {
  /**
   * Run full extraction and classification pipeline on a PDF file buffer or filepath.
   * @param {Buffer|Uint8Array} pdfBuffer - Raw bytes of the uploaded PDF textbook
   * @param {Object} options - { targetOcrEngine: string, onProgress: (state, meta) => void, testPageImages: Object }
   */
  static async processDocument(pdfBuffer, options = {}) {
    const onProgress = options.onProgress || (() => {});
    const targetOcrEngine = options.targetOcrEngine || 'tesseract';
    const ocrPipelineVersion = 1;

    console.log(`[ServerOCRPipeline] Initializing pipeline v${ocrPipelineVersion} with engine "${targetOcrEngine}"...`);

    let pdfDoc = null;
    let totalPages = 0;

    // Load document via pdfjs-dist if valid buffer
    try {
      if (pdfBuffer && (Buffer.isBuffer(pdfBuffer) || pdfBuffer instanceof Uint8Array)) {
        const uint8 = new Uint8Array(pdfBuffer);
        const loadingTask = getDocument({ data: uint8, useSystemFonts: true, disableFontFace: true });
        pdfDoc = await loadingTask.promise;
        totalPages = pdfDoc.numPages;
      }
    } catch (err) {
      console.warn(`[ServerOCRPipeline] Could not parse PDF buffer with pdfjs-dist (might be simulated test data):`, err.message);
    }

    if (!totalPages && options.mockTotalPages) {
      totalPages = options.mockTotalPages;
    }

    if (totalPages <= 0) {
      throw new Error('Invalid PDF document: Contains 0 pages or could not be loaded.');
    }

    const extractedPages = [];
    const pagesRequiringOcr = [];
    let isAnyPageLowDpi = false;

    // ─── STATE 1 & 2: checking_for_text & extracting_native_text ────────────
    onProgress('checking_for_text', { totalPages });
    const nativeProvider = OCRProviderFactory.getProvider('native_text');

    onProgress('extracting_native_text', { totalPages, currentPage: 1 });

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      try {
        let pageProxy = null;
        if (pdfDoc) {
          pageProxy = await pdfDoc.getPage(pageNum);
        }

        const mockText = options.mockPageTexts ? options.mockPageTexts[pageNum] : null;
        const res = await nativeProvider.getConfidenceAndText({ pageProxy, pageNumber: pageNum, rawText: mockText });

        if (res.isSearchable) {
          extractedPages.push({
            page_number: pageNum,
            extracted_text: res.text,
            source: 'digital',
            confidence_score: res.confidence,
            ocr_status: res.status, // 'not_needed'
            is_low_dpi: false,
            ocr_pipeline_version: ocrPipelineVersion
          });
        } else {
          // Page lacks searchable native text layer
          pagesRequiringOcr.push(pageNum);
          extractedPages.push({
            page_number: pageNum,
            extracted_text: '',
            source: 'ocr',
            confidence_score: 0,
            ocr_status: 'pending',
            is_low_dpi: false,
            ocr_pipeline_version: ocrPipelineVersion
          });
        }
      } catch (err) {
        // Independent page resilience: Never drop whole book due to one unreadable/corrupt page
        console.error(`[ServerOCRPipeline] Error checking native text on page ${pageNum}:`, err.message);
        pagesRequiringOcr.push(pageNum);
        extractedPages.push({
          page_number: pageNum,
          extracted_text: '',
          source: 'ocr',
          confidence_score: 0,
          ocr_status: 'pending',
          is_low_dpi: false,
          ocr_pipeline_version: ocrPipelineVersion
        });
      }
    }

    // ─── AUTOMATIC DOCUMENT CLASSIFICATION ─────────────────────────────────
    let pdfType = 'native_searchable_pdf';
    if (pagesRequiringOcr.length === 0) {
      pdfType = 'native_searchable_pdf';
      console.log(`[ServerOCRPipeline] Document classified as NATIVE SEARCHABLE PDF. Skipping OCR entirely!`);
    } else if (pagesRequiringOcr.length === totalPages) {
      pdfType = 'scanned_textbook';
      console.log(`[ServerOCRPipeline] Document classified as FULLY SCANNED TEXTBOOK (${totalPages} pages require OCR).`);
    } else {
      pdfType = 'mixed';
      console.log(`[ServerOCRPipeline] Document classified as MIXED PDF (${pagesRequiringOcr.length} of ${totalPages} pages require OCR).`);
    }

    // ─── STATE 3 & 4: preprocessing_images & running_ocr (if required) ──────
    let activeOcrEngine = 'native_text';
    const pagesFailed = [];

    if (pagesRequiringOcr.length > 0) {
      activeOcrEngine = targetOcrEngine;
      const ocrProvider = OCRProviderFactory.getProvider(activeOcrEngine);

      onProgress('preprocessing_images', { pagesRequiringOcr: pagesRequiringOcr.length });
      onProgress('running_ocr', { pagesRequiringOcr: pagesRequiringOcr.length, completedOcrPages: 0 });

      let completedCount = 0;
      for (const pageNum of pagesRequiringOcr) {
        // Independent page processing loop: Protect against individual page crashes
        try {
          // Check for minimum DPI threshold (~300 DPI check)
          let pageDpi = 300;
          let imgBuf = options.testPageImages ? options.testPageImages[pageNum] : null;

          if (options.testPageDpis && options.testPageDpis[pageNum] !== undefined) {
            pageDpi = options.testPageDpis[pageNum];
          } else if (pdfDoc) {
            try {
              const p = await pdfDoc.getPage(pageNum);
              const vp = p.getViewport({ scale: 1.0 });
              // Standard 8.5x11 inch page width at 72pts is 612. If embedded bitmap < ~2500 px width, mark low DPI
              if (vp.width < 500) pageDpi = 150; 
            } catch (_) {}
          }

          const isLowDpi = pageDpi < 280;
          if (isLowDpi) {
            isAnyPageLowDpi = true;
            console.warn(`[ServerOCRPipeline] Page ${pageNum} detected as LOW DPI (${pageDpi} DPI). OCR accuracy may be impacted.`);
          }

          // Execute OCR via selected pluggable engine provider (includes automatic confidence retries)
          const ocrRes = await ocrProvider.getConfidenceAndText({
            pageNumber: pageNum,
            imageBuffer: imgBuf,
            isLowDpi
          });

          const idx = extractedPages.findIndex(p => p.page_number === pageNum);
          if (idx !== -1) {
            extractedPages[idx].extracted_text = ocrRes.text;
            extractedPages[idx].confidence_score = ocrRes.confidence;
            extractedPages[idx].ocr_status = ocrRes.status;
            extractedPages[idx].source = 'ocr';
            extractedPages[idx].is_low_dpi = isLowDpi;
          }

          if (ocrRes.status === 'failed') {
            pagesFailed.push(pageNum);
          }

          completedCount++;
          onProgress('running_ocr', { pagesRequiringOcr: pagesRequiringOcr.length, completedOcrPages: completedCount, lastProcessedPage: pageNum });
        } catch (pageErr) {
          console.error(`[ServerOCRPipeline] Unhandled OCR exception on page ${pageNum}. Isolating page and continuing:`, pageErr.message);
          pagesFailed.push(pageNum);
          const idx = extractedPages.findIndex(p => p.page_number === pageNum);
          if (idx !== -1) {
            extractedPages[idx].ocr_status = 'failed';
            extractedPages[idx].confidence_score = 0;
            extractedPages[idx].extracted_text = ''; // Prevent AI hallucination
          }
        }
      }
    }

    // ─── STATE 5: building_toc ──────────────────────────────────────────────
    onProgress('building_toc', { totalPages, extractedPagesCount: extractedPages.length });

    // Calculate aggregate confidence score across all processed pages
    const totalConf = extractedPages.reduce((sum, p) => sum + (p.confidence_score || 0), 0);
    const avgConf = totalPages > 0 ? Math.round((totalConf / totalPages) * 10) / 10 : 100.0;

    let finalProcessingState = 'completed';
    if (pagesFailed.length === totalPages) {
      finalProcessingState = 'failed';
    } else if (pagesFailed.length > 0 || avgConf < 80.0) {
      finalProcessingState = 'low_confidence';
    }

    onProgress('completed', { finalProcessingState, avgConf, pdfType });

    return {
      pdf_type: pdfType,
      processing_state: finalProcessingState,
      ocr_engine: activeOcrEngine,
      confidence_score: avgConf,
      pages_requiring_ocr: pagesRequiringOcr,
      pages_failed: pagesFailed,
      ocr_pipeline_version: ocrPipelineVersion,
      is_low_dpi_warning: isAnyPageLowDpi,
      extracted_pages: extractedPages
    };
  }
}
