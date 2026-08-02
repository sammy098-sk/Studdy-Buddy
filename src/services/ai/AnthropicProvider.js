import { AIProvider } from './AIProvider';
import { callClaude, parseJsonLoose } from '../../utils/api';
import { STUDYBUDDY_PERSONA } from '../../config';

/**
 * Anthropic (Claude) AI Provider implementation.
 * Designed to be activated in Phase 2 once backend endpoints and API keys are connected.
 */
export class AnthropicProvider extends AIProvider {
  constructor() {
    super('Anthropic Claude');
  }

  async ask({ prompt, pageNumber, context = '', systemPrompt = STUDYBUDDY_PERSONA }) {
    const fullContext = context ? `\n\n[Textbook Context - Page ${pageNumber}]:\n${context}` : ` (Regarding Page ${pageNumber})`;
    const reply = await callClaude(
      systemPrompt + "\n\nAnswer clearly and concisely as a supportive peer tutor, using ONLY the provided textbook text if available.",
      [{ role: "user", content: `${prompt}${fullContext}` }],
      1000
    );
    return reply;
  }

  async summarize({ subject = 'Study Subject', topic = 'Topic Chapter', text = '', pageNumber }) {
    const contextPrompt = text ? `\n\nTextbook Excerpt (Page ${pageNumber}):\n${text}` : `\n\nSubject: ${subject}\nTopic: ${topic} (Page ${pageNumber})`;
    const raw = await callClaude(
      STUDYBUDDY_PERSONA + `\n\n### Task\nSummarize the given topic or textbook excerpt for fast revision. Break it into natural subtopics, and under each subtopic give 3-6 short, punchy key-point bullets. No long sentences, no repetition, just essential facts or formulas.\n\nRespond ONLY with valid JSON in this exact schema, no prose outside it:\n{"subtopics": [{"name": "string", "points": ["string", "string"]}]}`,
      [{ role: "user", content: `Please summarize this content:${contextPrompt}` }],
      1400
    );
    return parseJsonLoose(raw);
  }

  async generateQuestions({ subject = 'Study Subject', topic = 'Topic Chapter', text = '', pageNumber, count = 10, excludeList = [] }) {
    const contextPrompt = text ? `\n\nTextbook Excerpt (Page ${pageNumber}):\n${text}` : `\n\nSubject: ${subject}\nTopic: ${topic}`;
    const raw = await callClaude(
      `You are an examination question-bank writer. Respond ONLY with a valid JSON array of ${count} short-answer practice question strings on the given topic/text — no prose, no markdown fences, no numbering inside strings. Vary difficulty from easy to hard. Do not repeat any question in this exclude list: ${JSON.stringify(excludeList)}`,
      [{ role: "user", content: `Generate ${count} practice questions based on:${contextPrompt}` }],
      1200
    );
    return parseJsonLoose(raw);
  }

  async evaluateAnswer({ topic, question, studentAnswer }) {
    return await callClaude(
      STUDYBUDDY_PERSONA + `\n\n### Task\nA student just answered a practice question. Give brief (2-3 sentences), peer-tone feedback: say whether they're right, partly right, or off track, and why. If wrong, guide them toward the right idea without just stating the answer outright first.`,
      [{ role: "user", content: `Topic: ${topic}\nQuestion: ${question}\nStudent's answer: ${studentAnswer}` }],
      300
    );
  }

  async explainPage({ text, pageNumber = 'N' }) {
    return await callClaude(
      STUDYBUDDY_PERSONA + `\n\n### Task\nYou are explaining a specific page (Page ${pageNumber}) of a textbook to a student. Break the text down into three short, digestible sections: 1. What This Page is Saying (in plain English), 2. Why It Matters for Exams, and 3. A quick mental check question. Use supportive, human language and markdown formatting.`,
      [{ role: "user", content: `Explain this textbook page content:\n${text || `[No extracted text available for page ${pageNumber}. Provide general guidance on studying this page.]`}` }],
      800
    );
  }
}
