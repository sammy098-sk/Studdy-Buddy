import { BaseOCRProvider } from './BaseOCRProvider.js';

/**
 * GoogleVisionProvider
 * Pluggable adapter for Google Cloud Vision Document AI OCR engines.
 */
export class GoogleVisionProvider extends BaseOCRProvider {
  constructor() {
    super('cloud_vision');
  }

  async getConfidenceAndText({ pageNumber, imageBuffer }) {
    console.log(`[GoogleVisionProvider] Requesting Cloud Vision analysis for page ${pageNumber}.`);
    // Ready for Cloud Vision REST/gRPC client integration
    return {
      text: '',
      confidence: 0,
      status: 'failed',
      source: 'ocr',
      ocrEngine: 'cloud_vision'
    };
  }
}
