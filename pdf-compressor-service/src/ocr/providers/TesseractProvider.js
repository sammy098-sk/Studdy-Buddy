import { BaseOCRProvider } from './BaseOCRProvider.js';
import { ImagePreprocessor } from '../ImagePreprocessor.js';
import { createWorker } from 'tesseract.js';

/**
 * TesseractProvider
 * Server-side OCR engine utilizing Tesseract.js in Node/Docker microservice.
 * Integrates automatic Image Preprocessing, confidence score calculation per page,
 * and automatic retry with adaptive binarization if initial confidence < 80%.
 */
export class TesseractProvider extends BaseOCRProvider {
  constructor() {
    super('tesseract');
    this.worker = null;
  }

  async #ensureWorker() {
    if (!this.worker) {
      this.worker = await createWorker('eng', 1, {
        logger: () => {}, // Quiet worker logs
        errorHandler: (err) => console.error('[TesseractProvider] Worker error:', err)
      });
    }
    return this.worker;
  }

  async getConfidenceAndText({ pageNumber, imageBuffer, isRetry = false }) {
    console.log(`[TesseractProvider] Executing server OCR on page ${pageNumber} (Retry: ${isRetry})...`);

    if (!imageBuffer && !isRetry) {
      // If no valid image buffer was rendered/supplied in mock test environments, return simulated unreadable
      return {
        text: '',
        confidence: 0,
        status: 'failed',
        source: 'ocr',
        ocrEngine: 'tesseract'
      };
    }

    try {
      // 1. Run image through enhancement preprocessing stage
      const preprocessed = await ImagePreprocessor.processForOCR(imageBuffer || Buffer.from(''), { isRetry });

      // 2. Perform OCR with worker if valid buffer/canvas exists
      if (imageBuffer) {
        const worker = await this.#ensureWorker();
        const ret = await worker.recognize(preprocessed.processedImage);
        
        let conf = ret.data.confidence || 0;
        let txt = ret.data.text ? ret.data.text.trim() : '';

        // If confidence < 80% on initial attempt, trigger immediate retry with adaptive Otsu thresholding
        if (conf < 80 && conf >= 10 && !isRetry) {
          console.warn(`[TesseractProvider] Page ${pageNumber} low confidence (${conf.toFixed(1)}%). Retrying with aggressive binarization...`);
          return await this.getConfidenceAndText({ pageNumber, imageBuffer, isRetry: true });
        }

        const readableChars = txt.replace(/[^a-zA-Z0-9]/g, '');
        let status = 'completed';

        // Apply fallback thresholds
        if (conf < 70 || readableChars.length < 30) {
          console.error(`[TesseractProvider] Page ${pageNumber} failed quality threshold (Confidence: ${conf.toFixed(1)}%, Chars: ${readableChars.length}). Marking as failed.`);
          status = 'failed';
          txt = ''; // Prevent downstream hallucination
        } else if (conf < 80) {
          status = 'low_confidence';
        }

        return {
          text: txt,
          confidence: Math.round(conf * 10) / 10,
          status,
          source: 'ocr',
          ocrEngine: 'tesseract'
        };
      }

      return {
        text: '',
        confidence: 0,
        status: 'failed',
        source: 'ocr',
        ocrEngine: 'tesseract'
      };
    } catch (err) {
      console.error(`[TesseractProvider] Fatal error during OCR on page ${pageNumber}:`, err.message);
      return {
        text: '',
        confidence: 0,
        status: 'failed',
        source: 'ocr',
        ocrEngine: 'tesseract'
      };
    }
  }

  async shutdown() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }
}
