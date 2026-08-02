import { NativeTextProvider } from './providers/NativeTextProvider.js';
import { TesseractProvider } from './providers/TesseractProvider.js';
import { PaddleOCRProvider } from './providers/PaddleOCRProvider.js';
import { MistralOCRProvider } from './providers/MistralOCRProvider.js';
import { GoogleVisionProvider } from './providers/GoogleVisionProvider.js';

/**
 * OCRProviderFactory
 * Pluggable factory decoupling the OCR ingestion pipeline from any single OCR library or service.
 * Allows switching between native extraction, local Tesseract workers, or cloud computer vision APIs
 * without modifying database designs or application logic.
 */
export class OCRProviderFactory {
  static #instances = new Map();

  static getProvider(engineName = 'tesseract') {
    const key = engineName.toLowerCase();
    if (!this.#instances.has(key)) {
      switch (key) {
        case 'native_text':
          this.#instances.set(key, new NativeTextProvider());
          break;
        case 'tesseract':
          this.#instances.set(key, new TesseractProvider());
          break;
        case 'paddleocr':
          this.#instances.set(key, new PaddleOCRProvider());
          break;
        case 'mistral_ocr':
          this.#instances.set(key, new MistralOCRProvider());
          break;
        case 'cloud_vision':
        case 'google_vision':
          this.#instances.set(key, new GoogleVisionProvider());
          break;
        default:
          console.warn(`[OCRProviderFactory] Unknown engine "${engineName}", defaulting to "tesseract".`);
          this.#instances.set(key, new TesseractProvider());
          break;
      }
    }
    return this.#instances.get(key);
  }

  static getAvailableEngines() {
    return ['native_text', 'tesseract', 'paddleocr', 'mistral_ocr', 'cloud_vision'];
  }

  static async shutdownAll() {
    for (const provider of this.#instances.values()) {
      if (typeof provider.shutdown === 'function') {
        await provider.shutdown();
      }
    }
    this.#instances.clear();
  }
}
