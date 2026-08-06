import { AIProvider } from './AIProvider';
import { parseJsonLoose } from '../../utils/api';

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
 * OpenRouter AI Provider for StudyBuddy.
 *
 * Connects to OpenRouter's standardized chat completions API (https://openrouter.ai/api/v1/chat/completions).
 * By default utilizes 'openrouter/free' to automatically route to high-performing zero-cost models,
 * or allows configuring any custom OpenRouter model via VITE_OPENROUTER_MODEL.
 * Reads API key from VITE_OPENROUTER_API_KEY environment variable.
 *
 * All five study tools are implemented:
 *   ask()               → Scoped Q&A about a specific textbook page
 *   summarize()         → Structured bullet-point revision summary
 *   generateQuestions() → Diagnostic practice questions
 *   evaluateAnswer()    → Peer-tone answer feedback
 *   explainPage()       → Plain-English page breakdown (3 sections)
 */
export class OpenRouterProvider extends AIProvider {
  constructor() {
    super('OpenRouter AI');
    this.apiKey = import.meta.env.VITE_OPENROUTER_API_KEY || '';
    this.modelName = import.meta.env.VITE_OPENROUTER_MODEL || 'openrouter/free';
    this.endpoint = 'https://openrouter.ai/api/v1/chat/completions';

    if (!this.apiKey) {
      console.warn('[OpenRouterProvider] VITE_OPENROUTER_API_KEY is not set. AI features will fail.');
    }
  }

  /**
   * Send a chat completion request to OpenRouter and extract text content.
   */
  async #generate(systemInstruction, userPrompt, debugMeta = null) {
    if (!this.apiKey) {
      throw new Error('OpenRouter API key is not configured. Add VITE_OPENROUTER_API_KEY to your environment variables.');
    }

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://studybuddy.education',
        'X-Title': 'StudyBuddy'
      },
      body: JSON.stringify({
        model: this.modelName,
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter request failed with status ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    if (data.error) {
      throw new Error(`OpenRouter error: ${data.error.message || JSON.stringify(data.error)}`);
    }

    const content = data.choices?.[0]?.message?.content;
    if (typeof content !== 'string') {
      throw new Error('Received empty or unexpected response format from OpenRouter.');
    }

    const trimmedResponse = content.trim();

    // Section 5: Development Debugging Logging
    if ((import.meta.env?.DEV || import.meta.env?.MODE === 'development') && debugMeta) {
      console.group('🤖 [OpenRouter Debug] AI Grounded Request');
      console.log('Current page number:', debugMeta.pageNumber || 'N/A');
      console.log('Book ID:', debugMeta.bookId || 'N/A');
      console.log('Chapter:', debugMeta.chapterTitle || 'N/A');
      console.log('Section:', debugMeta.sectionTitle || 'N/A');
      console.log('Characters extracted:', debugMeta.context ? debugMeta.context.length : 0);
      console.log('First 300 characters of extracted text:', debugMeta.context ? debugMeta.context.slice(0, 300) : 'N/A');
      console.log('AI provider:', this.name);
      console.log('Model used:', data.model || this.modelName);
      console.log('Prompt token count:', data.usage?.prompt_tokens ?? Math.ceil((systemInstruction.length + userPrompt.length) / 4));
      console.log('Response token count:', data.usage?.completion_tokens ?? Math.ceil(trimmedResponse.length / 4));
      console.groupEnd();
    }

    return trimmedResponse;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 1. Ask AI — Scoped Q&A strictly grounded in textbook page content
  // ─────────────────────────────────────────────────────────────────────────
  async ask({ prompt, context = '', pageNumber = '', bookId = '', bookTitle = '', chapterTitle = '', sectionTitle = '' }) {
    const readableText = (context || '').replace(/[^a-zA-Z0-9]/g, '');
    if (!context || readableText.length < 30) {
      return "There's not enough readable text on this page for me to answer accurately.";
    }

    const system = `You are StudyBuddy AI, an academic study mentor.
Answer ONLY using the supplied textbook content.
If the answer cannot be found in the supplied text, honestly state that the information is not available in the supplied textbook text.
Do not rely on outside knowledge, assumptions, or hallucinated explanations.
Do not provide generic study advice unless the page itself explicitly discusses study techniques.`;

    const user = `Book:
${bookTitle || 'Textbook'}

Chapter:
${chapterTitle || 'N/A'}

Section:
${sectionTitle || 'N/A'}

Page:
${pageNumber || 'N/A'}

Extracted Text:
${context}

Student Question:
${prompt}`;

    return await this.#generate(system, user, {
      pageNumber,
      bookId,
      chapterTitle,
      sectionTitle,
      context
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────────────────
  // 2. Summarize — Structured revision bullet points across study styles & scopes
  // ─────────────────────────────────────────────────────────────────────────
  async summarize({ text = '', topic = 'Current Section', subject = 'General Study', pageNumber = '', scope = 'page', style = 'quick', moduleTitle = null, targetScore = '250+', subjectCombination = ['English Language'] }) {
    const styleInstructions = {
      quick: "Focus on rapid revision mastery: extract core theoretical takeaways and formula derivations with rich explanations.",
      detailed: "Provide a comprehensive pedagogical study book: elaborate in exhaustive depth on all arguments, foundational intuition, definitions, and proofs.",
      exam_notes: "Format as Comprehensive Exam Lecture Notes: focus strictly on JAMB syllabus alignment, historic exam drills, memory tricks, and examiner trap avoidance.",
      definitions: "Format as Master Glossary & Theoretical Principles: define every primary academic vocabulary term, constant, symbol, and rule with concrete examples.",
      formulas: "Highlight Comprehensive Governing Formulas & Principles: derive equations, clearly explain variable relationships, units, and practical laboratory applications.",
      concepts: "Focus on Master Mental Models & Deep Intuition: thoroughly explain *why* phenomena occur with engaging relatable analogies and step-by-step reasoning.",
      frequent_topics: "Focus on High-Yield Recurring Exam Patterns: analyze historic problem structures, calculation workflows, and standard JAMB testing strategies."
    }[style] || "Provide exhaustive teacher study notes and revision guidance.";

    const system = `You are an experienced academic subject specialist and master teacher writing comprehensive revision notes for students preparing for JAMB and higher education examinations.
${getDifficultyPrompt(targetScore, subjectCombination)}
Instead of giving short bullet points, brief summaries, or a table of contents outline, you must TEACH the content itself in exhaustive detail based entirely on the extracted textbook data.

Return ONLY a valid JSON object in this exact structure, with no markdown fences, no conversational preamble, and no explanation:
{
  "subtopics": [
    {
      "name": "Logical Academic Chapter or Topic Heading",
      "points": [
        "Detailed instructional paragraph teaching the underlying theoretical concepts, definitions, and formulas.",
        "Concrete example, real-world analogy, or numerical problem walkthrough demonstrating application.",
        "JAMB examination strategy, memory trick, or classic examiner distractor trap to avoid."
      ]
    }
  ]
}

Rules:
- NEVER output generic textbook outline metadata headings like 'Core Chapter Structure', 'Revision Goals', 'Key Concepts', or 'Pedagogical Tools'. Teach the actual theory!
- Style Guidance: ${styleInstructions}
- Length & Depth Requirements:
  * If Scope is PAGE: write comprehensive notes (~700 to 1,500 words across 4 to 6 detailed subtopic sections).
  * If Scope is CHAPTER or BOOK: write deep master lecture notes (~2,000 to 4,000 words equivalent across 6 to 10 comprehensive subtopic sections) so the student experiences reading an AI-generated textbook rather than a short summary.
- Format strictly as valid JSON without markdown formatting code blocks.`;

    const user = `Subject: ${subject}
Topic: ${moduleTitle || topic}
Scope: ${scope.toUpperCase()} ${pageNumber ? `(Page ${pageNumber})` : ''}
${moduleTitle ? `Current Revision Book Module to teach: ${moduleTitle}` : ''}

Textbook content to transform into teacher study notes:
${text || 'No extracted text available.'}

Generate comprehensive teacher study notes and revision analysis according to the requested study style (${style}) as structured JSON.`;

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
      console.warn('[OpenRouterProvider] summarize() JSON parsing fallback:', raw);
      return {
        subtopics: [
          {
            name: `${style.toUpperCase()} Comprehensive Study Notes: ${moduleTitle || topic}`,
            points: raw.split('\n').filter(l => l.trim().length > 0).slice(0, 15)
          }
        ]
      };
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 3. Generate Questions — Interactive A–D JAMB Exam MCQs & diagnostic drills
  // ─────────────────────────────────────────────────────────────────────────
  async generateQuestions({ text = '', topic = 'Current Section', subject = 'General Study', pageNumber = '', scope = 'page', count = 15, examMode = true, excludeList = [], targetScore = '250+', subjectCombination = ['English Language'] }) {
    const system = `You are StudyBuddy AI, an experienced JAMB examination test architect and pedagogical assessment specialist.
${getDifficultyPrompt(targetScore, subjectCombination)}

Return ONLY a valid JSON array of exactly ${count} multiple-choice practice question objects. No markdown formatting, no conversational preamble, and no extra text.

Required JSON format for each question object:
[
  {
    "question": "Challenging, academic question stem formatted exactly like a JAMB examination item...",
    "options": [
      { "id": "A", "text": "Plausible distractor testing common student misconception", "isCorrect": false, "explanation": "Why Option A is incorrect: explain the exact formulaic or conceptual mistake in this distractor." },
      { "id": "B", "text": "The single correct option supported by textbook definitions", "isCorrect": true, "explanation": "Why Option B is correct: state the direct law, definition, or mathematical principle from the text." },
      { "id": "C", "text": "Second distractor utilizing wrong units or inverted variables", "isCorrect": false, "explanation": "Why Option C is incorrect: identify the wrong assumption or unit inconsistency." },
      { "id": "D", "text": "Third distractor testing syllabus confusion", "isCorrect": false, "explanation": "Why Option D is incorrect: explain why this choice violates boundary conditions." }
    ],
    "explanation": "Master synthesis explaining the complete problem workflow and guiding theory."
  }
]

Rules:
- Questions must strictly evaluate authentic theories, terms, and calculations present in the provided textbook content (${scope} scope).
- Exactly ONE option per question must have "isCorrect": true.
- EVERY single option (A, B, C, and D) MUST include its own specific 'explanation' string detailing why it is the right choice or why it fails as a distractor.
- Distractors must be realistic and challenging to train students for CBT exam traps.
- Format strictly as a valid JSON array of objects.`;

    const user = `Subject: ${subject}
Topic: ${topic}
Scope: ${scope.toUpperCase()} ${pageNumber ? `(Page ${pageNumber})` : ''}
Number of questions required: ${count}
${excludeList.length ? `Do NOT duplicate previously tested topics or question stems: ${JSON.stringify(excludeList.slice(-5))}` : ''}

Textbook content:
${text || 'No extracted text available.'}

Generate exactly ${count} structured multiple-choice practice questions with options A–D and exhaustive option-by-option explanations as a JSON array.`;

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
      console.warn('[OpenRouterProvider] generateQuestions() JSON parsing fallback:', raw);
    }

    // Fallback if LLM returned text instead of valid JSON array
    const lines = raw.split('\n').map(l => l.replace(/^\d+[\.\)]\s*/, '').trim()).filter(l => l.length > 10);
    return lines.slice(0, count).map((qStr, i) => ({
      question: qStr,
      options: [
        { id: "A", text: "True / Accurately matches governing textbook principles", isCorrect: true, explanation: "Correct answer directly aligned with textbook definitions." },
        { id: "B", text: "False / Violates thermodynamic or conceptual laws", isCorrect: false, explanation: "Incorrect distractor contradicting theoretical conservation laws." },
        { id: "C", text: "Inconclusive without external empirical constants", isCorrect: false, explanation: "Incorrect: standard JAMB scenarios assume standard laboratory conditions." },
        { id: "D", text: "None of the above", isCorrect: false, explanation: "Incorrect: Option A correctly captures the relationship." }
      ],
      explanation: "Always confirm unit alignment and foundational definitions in your reading textbook."
    }));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 4. Evaluate Answer — Peer-tone feedback on a student's response
  // ─────────────────────────────────────────────────────────────────────────
  async evaluateAnswer({ topic = 'this topic', question, studentAnswer }) {
    const system = `You are StudyBuddy AI, an encouraging and intelligent study partner reviewing a student's practice exam response.

Give concise feedback that is:
- Encouraging & fair — identify accurate reasoning before pointing out gaps or misconceptions.
- Specific — evaluate the exact arguments in the student's answer against standard grading criteria.
- Actionable — conclude with one constructive improvement tip or key term to include next time.
- Concise — strictly keep feedback between 3 to 5 sentences.`;

    const user = `Topic: ${topic}
Question: ${question}
Student's answer: ${studentAnswer}

Provide constructive peer tutoring feedback on this response.`;

    return await this.#generate(system, user);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 5. Explain Page — Plain-English Master Teacher Breakdown
  // ─────────────────────────────────────────────────────────────────────────
  async explainPage({ text = '', pageNumber = '', bookTitle = 'this textbook', scope = 'page', moduleTitle = null }) {
    const system = `You are an experienced academic master teacher and JAMB tutor specialized in transforming dense textbook text into deep, comprehensive, conversational lecture notes.
Instead of producing short summaries or basic bullet points, write rich, deeply elaborated educational explanations that teach the actual textbook concepts in comprehensive detail.

Structure your comprehensive lecture notes with clear markdown headings covering:
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

Content to transform into master teacher lecture notes:
${text || 'No extracted text available for this scope.'}

Teach this content completely and thoroughly following the required academic lecture structure.`;

    return await this.#generate(system, user);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 6. Dashboard AI Study Notes — Comprehensive educational note generator
  // ─────────────────────────────────────────────────────────────────────────
  async generateGeneralSummary({ topic = '', userPrompt = '', isRetry = false }) {
    const system = `You are an intelligent educational study note generator and master teacher for StudyBuddy.
Your task is to generate comprehensive, well-structured study notes detailed enough that a student can study directly from them without consulting a textbook.

CRITICAL INSTRUCTION:
You MUST return ONLY valid JSON matching the flexible block schema below. DO NOT include raw Markdown outside of the JSON, and do NOT use markdown symbols (like #, ##, **, ---) inside your text blocks. The frontend will handle all rendering.

JSON SCHEMA:
{
  "title": "Main Topic Title",
  "estimatedTimeMinutes": 18,
  "subjectCategory": "JAMB Subject • Topic Category",
  "roadmap": ["Section 1 Title", "Section 2 Title", "Section 3 Title"],
  "sections": [
    {
      "id": 1,
      "title": "Section Title",
      "blocks": [
        { "type": "paragraph", "content": "Plain text explanation..." },
        { "type": "definition", "content": "Direct definition text..." },
        { "type": "jamb_fact", "content": "Critical exam fact..." },
        { "type": "example", "content": { "title": "Example Name", "details": ["Detail 1", "Detail 2"] } },
        { "type": "list", "content": ["List item 1", "List item 2"] },
        { "type": "table", "content": { "headers": ["Col1", "Col2"], "rows": [["Val1", "Val2"]] } }
      ]
    }
  ]
}

FLEXIBILITY RULES:
- Use multiple blocks per section (e.g., paragraph -> definition -> paragraph -> example -> jamb_fact).
- Recursively explain every sub-topic introduced before moving on.
- Use the most appropriate block type for the content. Do not force every section to have every block type.
- Prioritize educational completeness over brevity.`;

    const user = `Academic Topic for Study Notes: ${topic || userPrompt}
${userPrompt && userPrompt !== topic ? `Additional instructions from student: ${userPrompt}` : ''}

Generate complete, comprehensive teacher study notes for this topic returning ONLY valid JSON.`;

    try {
      const raw = await this.#generate(system, user);
      return parseJsonLoose(raw);
    } catch (err) {
      console.warn('[OpenRouter] Study Notes JSON generation failed.', err);
      if (!isRetry) {
        console.log('[OpenRouter] Initiating automatic retry for Study Notes...');
        return await this.generateGeneralSummary({ topic, userPrompt, isRetry: true });
      }
      throw new Error("We couldn't generate your study notes right now. Please try again.");
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 7. Dashboard Explain Concept — Real teacher comprehensive step-by-step lesson
  // ─────────────────────────────────────────────────────────────────────────
  async explainGeneralConcept({ topic = '', userPrompt = '' }) {
    const system = `You are an empathetic, world-class academic master teacher and educator for StudyBuddy.
Your task is to generate a complete, comprehensive lesson or study note that teaches the exact topic the user enters from beginning to end, behaving like a supportive real-world teacher.

CRITICAL BEHAVIORAL COVENANT:
- Do NOT produce a short summary or superficial outline. Teach the complete concept naturally and thoroughly from beginning to end.
- Explain in very simple, lucid language (as if teaching a beginner or a 10-year-old), breaking down complex academic terminology into clear everyday concepts.
- Build the explanation logically step by step from foundational concepts up to full comprehension.
- Use relatable real-world analogies and concrete everyday examples where they genuinely aid understanding.
- Continue explaining until the topic is fully covered and demystified.
- STRICT EXCLUSIONS: You MUST NOT automatically add JAMB exam tips, memory tricks, common student mistakes, mini recaps, revision questions, or notes on related topics unless the user specifically requests them in their prompt.
- Focus purely on teaching exactly what the user asked with zero unsolicited revision extras or rigid study templates.`;

    const user = `Concept to Explain Like a Teacher: ${topic || userPrompt}
${userPrompt && userPrompt !== topic ? `Student's specific question or focus: ${userPrompt}` : ''}

Teach me this complete concept step-by-step from beginning to end in simple, beginner-friendly language.`;

    return await this.#generate(system, user);
  }
}
