import { AIProvider } from './AIProvider';
import { GoogleGenerativeAI } from '@google/generative-ai';

const getDifficultyPrompt = (targetScore = '250+', subjectCombination = ['English Language']) => {
  const comboStr = Array.isArray(subjectCombination) ? subjectCombination.join(', ') : subjectCombination;
  let rigor = "ADVANCED TIER (Target Score 250+ in JAMB). Produce challenging questions and comprehensive explanations testing conceptual synthesis and distractor discrimination.";
  if (targetScore === '300+') {
    rigor = "ELITE TIER (Target Score 300+ in JAMB). Produce rigorous, complex problem-solving questions involving advanced distractors, edge cases, and multi-step analytical reasoning.";
  } else if (targetScore === '200+') {
    rigor = "CORE TIER (Target Score 200+ in JAMB). Focus on essential JAMB syllabus formulas, fundamental definitions, and standard testing patterns.";
  } else if (targetScore === '180+') {
    rigor = "FOUNDATION TIER (Target Score 180+ in JAMB). Emphasize clear foundational comprehension, straightforward terminology, and direct mastery of core textbook topics.";
  }
  return `STUDENT EXAM PROFILE:\n- JAMB Subject Combination: ${comboStr}\n- Difficulty Rigor: ${rigor}`;
};

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
  async summarize({ text = '', topic = 'Current Section', subject = 'General', pageNumber = '', scope = 'page', style = 'quick', moduleTitle = null, targetScore = '250+', subjectCombination = ['English Language'] }) {
    const system = `You are an expert AI Study Notes author creating concise, high-yield educational study notes for students.
${getDifficultyPrompt(targetScore, subjectCombination)}

DO NOT reflow or reproduce the entire textbook verbatim. Instead, understand the content, extract the essential material, and synthesize it into clean, condensed study notes.

CRITICAL PAGE CITATION RULE:
The input text contains page headers like '--- PAGE X ---'. Attach inline page citations formatted strictly as 📄X (e.g. 📄2 or 📄25) after key statements, definitions, or bullet points. Always use the exact page number from the preceding '--- PAGE X ---' section. Never invent page numbers.

Return ONLY a valid JSON object in this exact schema, with no markdown code blocks:
{
  "title": "Topic or Chapter Heading",
  "overview": "Concise high-level overview explaining what this topic is about with page citations 📄X.",
  "sections": [
    {
      "title": "Section or Sub-concept Title",
      "intro": "Short introductory explanation connecting the key concepts 📄X.",
      "bullets": [
        {
          "lead": "Short Concept Name",
          "content": "Clear, concise bullet point explanation with citation 📄X.",
          "subBullets": [
            {
              "lead": "Sub-concept Name",
              "content": "Specific detail or definition."
            }
          ]
        }
      ]
    }
  ],
  "remember": "Short takeaway summary sentence highlighting the core intuition or principle 📄X."
}`;

    const user = `Subject: ${subject}
Topic: ${moduleTitle || topic}
Scope: ${scope.toUpperCase()} ${pageNumber ? `(Page ${pageNumber})` : ''}

Source Textbook Content (with page markers):
${text || 'No extracted text available.'}

Produce concise, structured AI Study Notes with inline page citations as JSON.`;

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
        title: moduleTitle || topic,
        overview: raw.slice(0, 300),
        sections: [
          {
            title: `Key Notes: ${moduleTitle || topic}`,
            bullets: raw.split('\n').filter(l => l.trim()).slice(0, 10).map(l => ({
              lead: 'Key Concept',
              content: l.replace(/^[•*\-\d.]+\s*/, '')
            }))
          }
        ],
        remember: "Focus on foundational intuition and core principles."
      };
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 3. Generate Questions — Diagnostic CBT practice questions
  // ─────────────────────────────────────────────────────────────────────────
  async generateQuestions({ text = '', topic = 'Current Section', subject = 'General', pageNumber = '', scope = 'page', count = 15, examMode = true, excludeList = [], targetScore = '250+', subjectCombination = ['English Language'] }) {
    const system = `You are StudyBuddy AI, an expert JAMB examination question setter and CBT testing architect.
${getDifficultyPrompt(targetScore, subjectCombination)}

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
