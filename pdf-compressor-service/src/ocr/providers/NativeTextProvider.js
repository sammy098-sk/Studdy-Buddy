import { BaseOCRProvider } from './BaseOCRProvider.js';

/**
 * NativeTextProvider
 * Extracts selectable digital text layers directly from native searchable PDFs.
 * Skips OCR entirely when a valid text layer is present, maximizing speed and accuracy.
 */
export class NativeTextProvider extends BaseOCRProvider {
  constructor() {
    super('native_text');
  }

  async getConfidenceAndText({ pageProxy, pageNumber, rawText }) {
    let text = rawText || '';

    if (!text && pageProxy && typeof pageProxy.getTextContent === 'function') {
      try {
        const textContent = await pageProxy.getTextContent();
        text = (textContent.items || [])
          .map(item => item.str || '')
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
      } catch (err) {
        console.warn(`[NativeTextProvider] Failed to extract native text on page ${pageNumber}:`, err.message);
      }
    }

    const readableChars = text.replace(/[^a-zA-Z0-9]/g, '');
    const hasSufficientText = readableChars.length >= 30;

    if (hasSufficientText) {
      return {
        text,
        confidence: 100.0,
        status: 'not_needed', // OCR status is not needed since native digital text is present!
        source: 'digital',
        ocrEngine: 'native_text',
        isSearchable: true
      };
    }

    // Insufficient text indicating an image-only scan or blank graphic page
    return {
      text: '',
      confidence: 0,
      status: 'requires_ocr',
      source: 'digital',
      ocrEngine: 'native_text',
      isSearchable: false
    };
  }
}
