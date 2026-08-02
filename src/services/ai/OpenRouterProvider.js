import { AIProvider } from './AIProvider';

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
  async summarize({ text = '', topic = 'Current Section', subject = 'General Study', pageNumber = '', scope = 'page', style = 'quick' }) {
    const styleInstructions = {
      quick: "Focus on quick revision: 2-3 high-yield subtopics with concise, easy-to-digest bullet points.",
      detailed: "Provide a detailed summary: create comprehensive outlines covering all major arguments, proofs, and foundational logic in depth.",
      exam_notes: "Format as Exam Revision Notes: focus strictly on JAMB syllabus alignment, examiner traps, and memorization checklists.",
      definitions: "Format as Key Definitions: list all primary academic vocabulary terms, constants, and theoretical rules with clear definitions.",
      formulas: "Highlight Important Formulas & Principles: focus on governing equations, theoretical variable relationships, and boundary conditions.",
      concepts: "Focus on Key Concepts & Mental Models: explain foundational theoretical intuition and *why* phenomena occur rather than raw memorizable facts.",
      frequent_topics: "Focus on Frequently Tested Topics: emphasize historic exam favorites, standard numerical problem architectures, and recurring theory drills."
    }[style] || "Focus on high-yield revision summaries.";

    const system = `You are StudyBuddy AI, an academic study revision mentor and examination strategist.

Return ONLY a valid JSON object in this exact structure, with no markdown fences, no conversational preamble, and no explanation:
{
  "subtopics": [
    {
      "name": "Subtopic or section title",
      "points": ["bullet point string", "bullet point string", "bullet point string"]
    }
  ]
}

Rules:
- ${styleInstructions}
- Generate exactly 2 to 4 subtopics appropriate for the requested study scope (${scope}).
- Each subtopic must contain 3 to 5 actionable bullet points.
- Format strictly as valid JSON.`;

    const user = `Subject: ${subject}
Topic: ${topic}
Scope: ${scope.toUpperCase()} ${pageNumber ? `(Page ${pageNumber})` : ''}

Textbook content:
${text || 'No extracted text available.'}

Summarize this content according to the requested study style (${style}) as structured JSON.`;

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
            name: `${style.toUpperCase()} Summary of ${topic}`,
            points: raw.split('\n').filter(l => l.trim().length > 0).slice(0, 8)
          }
        ]
      };
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 3. Generate Questions — Interactive A–D JAMB Exam MCQs & diagnostic drills
  // ─────────────────────────────────────────────────────────────────────────
  async generateQuestions({ text = '', topic = 'Current Section', subject = 'General Study', pageNumber = '', scope = 'page', count = 5, examMode = true, excludeList = [] }) {
    const system = `You are StudyBuddy AI, a premier JAMB examination question architect and pedagogical test designer.

Return ONLY a valid JSON array of exactly ${count} multiple-choice practice question objects. No markdown formatting, no conversational preamble, and no extra text.

Required JSON format for each question object:
[
  {
    "question": "Clear, challenging question stem simulating JAMB examination phrasing...",
    "options": [
      { "id": "A", "text": "Plausible distractor testing common misconception", "isCorrect": false },
      { "id": "B", "text": "The single accurate answer grounded in the reading", "isCorrect": true },
      { "id": "C", "text": "Second distractor based on unit or procedural errors", "isCorrect": false },
      { "id": "D", "text": "Third distractor", "isCorrect": false }
    ],
    "explanation": "Detailed educational feedback explaining why the correct option succeeds and why each distractor is incorrect."
  }
]

Rules:
- Questions must strictly test concepts present in the provided textbook content (${scope} scope).
- Exactly ONE option per question must have "isCorrect": true.
- Distractors must be realistic and scientifically plausible to prepare students for actual examination traps.
- Format strictly as a valid JSON array of objects.`;

    const user = `Subject: ${subject}
Topic: ${topic}
Scope: ${scope.toUpperCase()} ${pageNumber ? `(Page ${pageNumber})` : ''}
Number of questions required: ${count}
${excludeList.length ? `Do NOT duplicate previously tested topics or questions: ${JSON.stringify(excludeList.slice(-5))}` : ''}

Textbook content:
${text || 'No extracted text available.'}

Generate exactly ${count} structured multiple-choice practice questions with options A–D and educational explanations as a JSON array.`;

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

    // Fallback if LLM returned simple string lines instead of JSON
    const lines = raw.split('\n').map(l => l.replace(/^\d+[\.\)]\s*/, '').trim()).filter(l => l.length > 10);
    return lines.slice(0, count).map((qStr, i) => ({
      question: qStr,
      options: [
        { id: "A", text: "True / Conceptually accurate as stated", isCorrect: true },
        { id: "B", text: "False / Contradicts boundary conditions in text", isCorrect: false },
        { id: "C", text: "Inconclusive without external laboratory tables", isCorrect: false },
        { id: "D", text: "None of the above", isCorrect: false }
      ],
      explanation: "Verify foundational principles directly against the active reading passage."
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
  // 5. Explain Page — Plain-English 3-section breakdown
  // ─────────────────────────────────────────────────────────────────────────
  async explainPage({ text = '', pageNumber = '', bookTitle = 'this textbook' }) {
    const system = `You are StudyBuddy AI, specialized in translating dense academic chapters into conversational, intuitive explanations.

Structure your response with exactly these three markdown headings in order:
### 1. What This Page is Actually Saying
### 2. Why It Matters for Your Exams
### 3. Quick Check for Understanding

Rules:
- Use plain, approachable language suitable for an engaged secondary or undergrad student.
- Section 1: 2 to 3 clear paragraphs demystifying the core concepts and logic.
- Section 2: 2 sentences explaining how examiners test this theory in JAMB and similar assessments.
- Section 3: One concise, reflective conceptual question the student can ask themselves to verify comprehension. Do NOT provide the answer to this final check question.`;

    const user = `Textbook: ${bookTitle}
Page: ${pageNumber || 'current'}

Content to explain:
${text || 'No extracted text available for this page.'}

Break this down cleanly and clearly following the required 3 sections.`;

    return await this.#generate(system, user);
  }
}
