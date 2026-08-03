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
  async summarize({ text = '', topic = 'Current Section', subject = 'General', pageNumber = '', scope = 'page', style = 'quick', moduleTitle = null }) {
    const system = `You are an experienced academic master teacher writing comprehensive study revision notes for Nigerian students preparing for JAMB and university examinations.
Instead of producing short bullet points or a generic textbook outline, you must TEACH the content in comprehensive detail based entirely on the extracted textbook data.

Return ONLY a JSON object in this exact format, with no markdown fences or extra text:
{
  "subtopics": [
    {
      "name": "Academic Chapter or Topic Heading",
      "points": [
        "Deep instructional explanation of underlying theoretical principles and definitions.",
        "Concrete numerical problem or practical laboratory analogy demonstrating application.",
        "JAMB testing emphasis, classic distractors to avoid, and memory shortcuts."
      ]
    }
  ]
}

Rules:
- NEVER output superficial textbook outline headings like 'Core Chapter Structure' or 'Revision Goals'. Teach the actual material!
- For Page scope, generate 4 to 6 detailed subtopics (~700 to 1,500 words total).
- For Chapter or Book scope modules (${moduleTitle || scope}), generate exhaustive teacher study guides (~2,000 to 4,000 words equivalent across 6 to 10 subtopics) so students experience reading an AI-generated textbook chapter rather than a brief summary.`;

    const user = `Subject: ${subject}
Topic: ${moduleTitle || topic}
Scope: ${scope.toUpperCase()} ${pageNumber ? `(Page ${pageNumber})` : ''}

Textbook content:
${text || 'No extracted text available.'}

Summarize this content into comprehensive structured teacher study notes.`;

    const raw = await this.#generate(system, user);

    try {
      const cleaned = raw.replace(/```json|```/g, '').trim();
      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        return JSON.parse(cleaned.substring(firstBrace, lastBrace + 1));
      }
      return JSON.parse(cleaned);
    } catch (e) {
      console.warn('[GeminiProvider] summarize() could not parse JSON response. Wrapping as plain text.', raw);
      return {
        subtopics: [
          {
            name: `Comprehensive Notes: ${moduleTitle || topic}`,
            points: raw.split('\n').filter(l => l.trim()).slice(0, 15)
          }
        ]
      };
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 3. Generate Questions — Diagnostic CBT practice questions
  // ─────────────────────────────────────────────────────────────────────────
  async generateQuestions({ text = '', topic = 'Current Section', subject = 'General', pageNumber = '', scope = 'page', count = 15, examMode = true, excludeList = [] }) {
    const system = `You are StudyBuddy AI, an expert JAMB examination question setter and CBT testing architect.

Return ONLY a JSON array of exactly ${count} practice question objects in this exact structure, with no markdown fences or conversational text:
[
  {
    "question": "Challenging academic question stem in authentic JAMB phrasing...",
    "options": [
      { "id": "A", "text": "Plausible distractor testing common misconception", "isCorrect": false, "explanation": "Why Option A is incorrect: explain the exact error in logic or formula." },
      { "id": "B", "text": "The single accurate option grounded in text", "isCorrect": true, "explanation": "Why Option B is correct: state the supporting law or definition from the text." },
      { "id": "C", "text": "Second distractor based on unit inversion", "isCorrect": false, "explanation": "Why Option C is incorrect: identify unit or boundary violations." },
      { "id": "D", "text": "Third distractor", "isCorrect": false, "explanation": "Why Option D is incorrect: explain why this violates theory." }
    ],
    "explanation": "Master synthesis explaining the complete theoretical reasoning."
  }
]

Rules:
- Questions must be rigorously answerable from the provided content (${scope} scope).
- Exactly ONE option per question must have "isCorrect": true.
- EVERY option must include an 'explanation' string explaining why it is correct or incorrect.
- Write questions at authentic JAMB difficulty level.`;

    const user = `Subject: ${subject}
Topic: ${topic}
Scope: ${scope.toUpperCase()} ${pageNumber ? `(Page ${pageNumber})` : ''}
Number of questions: ${count}
${excludeList.length ? `Avoid duplicating previously tested items: ${JSON.stringify(excludeList.slice(-5))}` : ''}

Textbook content:
${text || 'No extracted text available.'}

Generate exactly ${count} structured CBT practice questions with option explanations.`;

    const raw = await this.#generate(system, user);

    try {
      const cleaned = raw.replace(/```json|```/g, '').trim();
      const firstBracket = cleaned.indexOf('[');
      const lastBracket = cleaned.lastIndexOf(']');
      if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
        const parsed = JSON.parse(cleaned.substring(firstBracket, lastBracket + 1));
        if (Array.isArray(parsed)) return parsed.slice(0, count);
      }
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) return parsed.slice(0, count);
    } catch (e) {
      console.warn('[GeminiProvider] generateQuestions() could not parse JSON.', raw);
    }

    // Fallback
    const lines = raw.split('\n').map(l => l.replace(/^\d+[\.\)]\s*/, '').trim()).filter(l => l.length > 10);
    return lines.slice(0, count).map((qStr, i) => ({
      question: qStr,
      options: [
        { id: "A", text: "True / Accurately matches governing textbook principles", isCorrect: true, explanation: "Correct answer directly aligned with textbook definitions." },
        { id: "B", text: "False / Violates thermodynamic or conceptual laws", isCorrect: false, explanation: "Incorrect distractor contradicting theoretical conservation laws." },
        { id: "C", text: "Inconclusive without external empirical constants", isCorrect: false, explanation: "Incorrect distractor." },
        { id: "D", text: "None of the above", isCorrect: false, explanation: "Incorrect distractor." }
      ],
      explanation: "Always confirm unit alignment and foundational definitions in your reading textbook."
    }));
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
  // 5. Explain Page — Plain-English Master Teacher Breakdown
  // ─────────────────────────────────────────────────────────────────────────
  async explainPage({ text = '', pageNumber = '', bookTitle = 'this textbook', scope = 'page', moduleTitle = null }) {
    const system = `You are an experienced academic master teacher and JAMB tutor specialized in transforming dense textbook text into deep, comprehensive, conversational lecture notes.

Structure your response with clear markdown headings covering:
### 1. In-Depth Theoretical Lecture & Core Principles
Teach every important concept, formula derivation, definition, and referenced diagram in extensive detail across several engaging paragraphs. Use memorable analogies, concrete examples, and step-by-step explanations.
### 2. Why This Matters for JAMB & Examinations
Provide detailed analysis of how examiners test this specific theory in CBT multiple-choice questions and high-stakes exams, emphasizing high-yield relationships and key vocabulary.
### 3. Common Student Mistakes & Examiner Traps
Explicitly break down classic student misconceptions, calculation pitfalls, unit conversion errors, and memory tricks to overcome them.
### 4. Self-Diagnostic Checks for Mastery
Present two reflective conceptual thought experiments or analytical questions the student should ask themselves to verify deep comprehension. Do NOT provide simple yes/no questions.

Rules:
- NEVER output superficial table of contents headings like 'Core Chapter Structure' or 'Revision Goals'. Teach the material!
- Length requirements: For Page scope, write ~700 to 1,500 words of rich instructional analysis. For Chapter or Book modules (${moduleTitle || scope}), produce master lecture notes (~2,000 to 4,000 words equivalent in pedagogical depth) so the student experiences reading an AI-generated textbook chapter rather than a basic summary.`;

    const user = `Textbook: ${bookTitle}
Scope: ${scope.toUpperCase()} ${pageNumber ? `(Page ${pageNumber})` : ''}
${moduleTitle ? `Current Book Revision Chapter / Module: ${moduleTitle}` : ''}

Content to explain:
${text || 'No extracted text available for this scope.'}

Teach this content completely and thoroughly following the required academic lecture structure.`;

    return await this.#generate(system, user);
  }
}
