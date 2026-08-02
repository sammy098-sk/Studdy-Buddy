/**
 * Base abstract contract for Pluggable OCR Providers.
 * Ensures all engines adhere to a standardized asynchronous extraction response.
 */
export class BaseOCRProvider {
  constructor(name) {
    this.name = name;
  }

  /**
   * Extract text and calculate page-level confidence score.
   * @param {Object} context - { pageNumber, pageProxy, imageBuffer, isLowDpi, isRetry }
   * @returns {Promise<{ text: string, confidence: number, status: string, source: string, ocrEngine: string }>}
   */
  async getConfidenceAndText(context) {
    throw new Error(`[${this.name}] getConfidenceAndText must be implemented by concrete subclass.`);
  }
}
