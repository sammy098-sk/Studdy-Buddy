import { BaseOCRProvider } from './BaseOCRProvider.js';

/**
 * PaddleOCRProvider
 * Pluggable adapter for PaddleOCR deep learning OCR pipelines.
 */
export class PaddleOCRProvider extends BaseOCRProvider {
  constructor() {
    super('paddleocr');
  }

  async getConfidenceAndText({ pageNumber, imageBuffer, isRetry }) {
    console.log(`[PaddleOCRProvider] Intercepting request for page ${pageNumber}.`);
    // Placeholder implementation ready for microservice RPC or Python sidecar integration
    return {
      text: '',
      confidence: 0,
      status: 'failed',
      source: 'ocr',
      ocrEngine: 'paddleocr'
    };
  }
}
