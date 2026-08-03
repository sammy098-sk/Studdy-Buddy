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

  async summarize({ subject = 'Study Subject', topic = 'Topic Chapter', text = '', pageNumber, scope = 'page', style = 'quick', moduleTitle = null }) {
    const contextPrompt = text ? `\n\nTextbook Excerpt (Page ${pageNumber}):\n${text}` : `\n\nSubject: ${subject}\nTopic: ${moduleTitle || topic} (Page ${pageNumber})`;
    const raw = await callClaude(
      STUDYBUDDY_PERSONA + `\n\n### Task\nYou are an experienced academic master teacher writing exhaustive revision study notes for examinations. Do NOT generate superficial outline headings like 'Core Structure' or 'Revision Goals'—teach the foundational theory itself in comprehensive pedagogical detail with concrete examples and formula derivations.\n\nRespond ONLY with valid JSON in this exact schema, with no markdown fences or prose outside it:\n{"subtopics": [{"name": "Academic Section Heading", "points": ["Deep instructional paragraph teaching theory", "Concrete numerical or laboratory example", "JAMB examination trap avoidance strategy"]}]}`,
      [{ role: "user", content: `Please transform this content into exhaustive teacher study notes (Scope: ${scope.toUpperCase()}, Style: ${style}):${contextPrompt}` }],
      2500
    );
    return parseJsonLoose(raw);
  }

  async generateQuestions({ subject = 'Study Subject', topic = 'Topic Chapter', text = '', pageNumber, scope = 'page', count = 15, excludeList = [] }) {
    const contextPrompt = text ? `\n\nTextbook Excerpt (Page ${pageNumber}):\n${text}` : `\n\nSubject: ${subject}\nTopic: ${topic}`;
    const raw = await callClaude(
      `You are a JAMB examination test architect. Respond ONLY with a valid JSON array of exactly ${count} multiple-choice question objects on the given text — no prose or markdown fences. Each object must have: "question", "options": array of 4 objects with "id" ("A"-"D"), "text", "isCorrect", and "explanation" detailing why that specific choice is correct or an incorrect distractor, and an overall "explanation". Do not duplicate items in: ${JSON.stringify(excludeList)}`,
      [{ role: "user", content: `Generate ${count} structured CBT practice questions based on:${contextPrompt}` }],
      2500
    );
    return parseJsonLoose(raw);
  }

  async evaluateAnswer({ topic, question, studentAnswer }) {
    return await callClaude(
      STUDYBUDDY_PERSONA + `\n\n### Task\nA student just answered a practice question. Give brief (2-3 sentences), supportive peer-tone feedback: state what reasoning is accurate before evaluating misconceptions against examination standards.`,
      [{ role: "user", content: `Topic: ${topic}\nQuestion: ${question}\nStudent's answer: ${studentAnswer}` }],
      300
    );
  }

  async explainPage({ text, pageNumber = 'N', scope = 'page', moduleTitle = null }) {
    return await callClaude(
      STUDYBUDDY_PERSONA + `\n\n### Task\nYou are an experienced academic master teacher translating complex textbook content (${moduleTitle || `Scope ${scope.toUpperCase()}`}, Page ${pageNumber}) into exhaustive study lecture notes. Break the text down into four clear markdown sections: ### 1. In-Depth Theoretical Lecture & Core Principles (explain theory, definitions, and formula proofs in rich paragraph detail), ### 2. Why This Matters for JAMB & Examinations (analyze CBT testing emphasis), ### 3. Common Student Mistakes & Examiner Traps, and ### 4. Self-Diagnostic Checks for Mastery (two deep conceptual reflection challenges).`,
      [{ role: "user", content: `Transform this textbook content into master teacher lecture notes:\n${text || `[No extracted text available for scope ${scope}. Provide deep theoretical guidance.]`}` }],
      2500
    );
  }
}
