import { BaseOCRProvider } from './BaseOCRProvider.js';

/**
 * MistralOCRProvider
 * Pluggable adapter for Mistral multimodal OCR AI endpoints.
 */
export class MistralOCRProvider extends BaseOCRProvider {
  constructor() {
    super('mistral_ocr');
  }

  async getConfidenceAndText({ pageNumber, imageBuffer }) {
    console.log(`[MistralOCRProvider] Processing OCR via Mistral API for page ${pageNumber}.`);
    // Ready for REST/OpenRouter API integration
    return {
      text: '',
      confidence: 0,
      status: 'failed',
      source: 'ocr',
      ocrEngine: 'mistral_ocr'
    };
  }
}
