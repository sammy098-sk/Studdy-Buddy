import { AIProvider } from './AIProvider';

/**
 * OpenAI (ChatGPT / GPT-4) Provider implementation stub.
 * Ready for future provider integration.
 */
export class OpenAIProvider extends AIProvider {
  constructor() {
    super('OpenAI GPT-4');
  }

  async ask() { throw new Error("OpenAIProvider not configured yet."); }
  async summarize() { throw new Error("OpenAIProvider not configured yet."); }
  async generateQuestions() { throw new Error("OpenAIProvider not configured yet."); }
  async evaluateAnswer() { throw new Error("OpenAIProvider not configured yet."); }
  async explainPage() { throw new Error("OpenAIProvider not configured yet."); }
}
