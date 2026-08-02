import { AIProvider } from './AIProvider';
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Google Gemini AI Provider for StudyBuddy.
 *
 * Uses gemini-2.0-flash for fast, cost-efficient educational responses.
 * Reads API key from VITE_GEMINI_API_KEY environment variable.
 *
 * All five study tools are implemented:
 *   ask()               → Scoped Q&A about a specific textbook page
 *   summarize()         → Structured bullet-point revision summary
 *   generateQuestions() → Diagnostic practice questions
 *   evaluateAnswer()    → Peer-tone answer feedback
 *   explainPage()       → Plain-English page breakdown (3 sections)
 */
export class GeminiProvider extends AIProvider {
  constructor() {
    super('Google Gemini');
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('[GeminiProvider] VITE_GEMINI_API_KEY is not set. AI features will fail.');
    }
    this._client = apiKey ? new GoogleGenerativeAI(apiKey) : null;
    this._modelName = 'gemini-2.0-flash';
  }

  /**
   * Get or lazily create the generative model instance.
   */
  #getModel(systemInstruction) {
    if (!this._client) {
      throw new Error('Gemini API key is not configured. Add VITE_GEMINI_API_KEY to your .env file.');
    }
    return this._client.getGenerativeModel({
      model: this._modelName,
      systemInstruction,
    });
  }

  /**
   * Call Gemini and return the text response. Handles errors gracefully.
   */
  async #generate(systemInstruction, userPrompt) {
    const model = this.#getModel(systemInstruction);
    const result = await model.generateContent(userPrompt);
    return result.response.text();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 1. Ask AI — Scoped Q&A about a page
  // ─────────────────────────────────────────────────────────────────────────
  async ask({ prompt, context = '', pageNumber = '' }) {
    const system = `You are StudyBuddy AI, an expert academic tutor helping Nigerian secondary school and university students prepare for JAMB and other major examinations.

Your role:
- Answer questions directly and clearly based on the provided textbook context.
- Use simple, student-friendly language. Avoid jargon unless explaining it.
- When relevant, connect the answer to JAMB exam patterns.
- Keep responses concise — 2 to 4 short paragraphs maximum.
- Never fabricate information not present in the context.`;

    const user = `Textbook context (Page ${pageNumber || 'current'}):
${context || 'No extracted text available for this page.'}

Student question: ${prompt}`;

    return await this.#generate(system, user);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 2. Summarize — Structured revision bullet points
  // ─────────────────────────────────────────────────────────────────────────
  async summarize({ text = '', topic = 'Current Section', subject = 'General', pageNumber = '' }) {
    const system = `You are StudyBuddy AI, a concise academic summarizer for Nigerian students.

Return ONLY a JSON object in this exact format, with no markdown fences or extra text:
{
  "subtopics": [
    {
      "name": "Subtopic heading string",
      "points": ["bullet point string", "bullet point string", "bullet point string"]
    }
  ]
}

Rules:
- Generate 2 to 3 subtopics.
- Each subtopic must have 3 to 5 clear bullet points.
- Focus on exam-relevant facts, definitions, and formulas.
- Write for a student revising 30 minutes before an exam.`;

    const user = `Subject: ${subject}
Topic: ${topic}
Page: ${pageNumber || 'N/A'}

Textbook content:
${text || 'No extracted text available.'}

Summarize this content into structured revision notes.`;

    const raw = await this.#generate(system, user);

    // Parse JSON response — fall back gracefully if Gemini returns malformed output
    try {
      const cleaned = raw.replace(/```json|```/g, '').trim();
      return JSON.parse(cleaned);
    } catch (e) {
      console.warn('[GeminiProvider] summarize() could not parse JSON response. Wrapping as plain text.', raw);
      return {
        subtopics: [
          {
            name: `Summary of ${topic}`,
            points: raw.split('\n').filter(l => l.trim()).slice(0, 8)
          }
        ]
      };
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 3. Generate Questions — Diagnostic practice questions
  // ─────────────────────────────────────────────────────────────────────────
  async generateQuestions({ text = '', topic = 'Current Section', subject = 'General', pageNumber = '', count = 5 }) {
    const system = `You are StudyBuddy AI, a JAMB exam question generator.

Return ONLY a JSON array of exactly ${count} question strings. No markdown, no numbering, no extra text.
Example format:
["Question one?", "Question two?", "Question three?"]

Rules:
- Questions must be answerable from the provided content.
- Mix definition, application, and analytical questions.
- Write questions at JAMB difficulty level.`;

    const user = `Subject: ${subject}
Topic: ${topic}
Page: ${pageNumber || 'N/A'}
Number of questions: ${count}

Textbook content:
${text || 'No extracted text available.'}

Generate ${count} practice questions.`;

    const raw = await this.#generate(system, user);

    try {
      const cleaned = raw.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) return parsed.slice(0, count);
    } catch (e) {
      console.warn('[GeminiProvider] generateQuestions() could not parse JSON.', raw);
    }

    // Fallback: extract lines that look like questions
    const lines = raw.split('\n').map(l => l.replace(/^\d+[\.\)]\s*/, '').trim()).filter(l => l.length > 10);
    return lines.slice(0, count);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 4. Evaluate Answer — Peer-tone feedback on a student's response
  // ─────────────────────────────────────────────────────────────────────────
  async evaluateAnswer({ topic = 'this topic', question, studentAnswer }) {
    const system = `You are StudyBuddy AI, a supportive peer tutor reviewing a student's exam answer.

Give feedback that is:
- Honest but encouraging — acknowledge what the student got right before pointing out gaps.
- Specific — reference parts of the student's actual answer.
- Actionable — end with one clear tip on how to improve.
- Concise — keep your response to 3 to 5 sentences.
- JAMB-exam focused where relevant.`;

    const user = `Topic: ${topic}
Question: ${question}
Student's answer: ${studentAnswer}

Provide constructive feedback on this answer.`;

    return await this.#generate(system, user);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 5. Explain Page — Plain-English 3-section breakdown
  // ─────────────────────────────────────────────────────────────────────────
  async explainPage({ text = '', pageNumber = '', bookTitle = 'this textbook' }) {
    const system = `You are StudyBuddy AI, an expert at making dense textbook content accessible to students.

Structure your response with exactly these three markdown headings, in this order:
### 1. What This Page is Actually Saying
### 2. Why It Matters for Your Exams
### 3. Quick Check for Understanding

Rules:
- Use plain, conversational language — imagine explaining to a 16-year-old student.
- Section 1: 2 to 3 sentences explaining the core idea.
- Section 2: 2 sentences on exam relevance (JAMB focus where applicable).
- Section 3: One simple question the student can ask themselves to test understanding. Do NOT answer it.`;

    const user = `Textbook: ${bookTitle}
Page: ${pageNumber || 'current'}

Content to explain:
${text || 'No extracted text available for this page.'}

Break this down clearly for a student.`;

    return await this.#generate(system, user);
  }
}
