import { AIProvider } from './AIProvider';

/**
 * Google Gemini Provider implementation stub.
 * Ready for future provider integration.
 */
export class GeminiProvider extends AIProvider {
  constructor() {
    super('Google Gemini');
  }

  async ask() { throw new Error("GeminiProvider not configured yet."); }
  async summarize() { throw new Error("GeminiProvider not configured yet."); }
  async generateQuestions() { throw new Error("GeminiProvider not configured yet."); }
  async evaluateAnswer() { throw new Error("GeminiProvider not configured yet."); }
  async explainPage() { throw new Error("GeminiProvider not configured yet."); }
}
