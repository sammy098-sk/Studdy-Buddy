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
  async #generate(systemInstruction, userPrompt) {
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
        temperature: 0.7
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

    return content.trim();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 1. Ask AI — Scoped Q&A about a page
  // ─────────────────────────────────────────────────────────────────────────
  async ask({ prompt, context = '', pageNumber = '' }) {
    const system = `You are StudyBuddy AI, an expert academic tutor helping secondary school and university students prepare for JAMB and other major examinations.

Your role:
- Answer questions directly and clearly based directly on the provided textbook context.
- Use simple, student-friendly language. Avoid jargon unless clearly explaining it.
- When relevant, connect the answer to JAMB examination problem-solving techniques and concepts.
- Keep responses concise — 2 to 4 short paragraphs maximum.
- Do not fabricate facts outside of sound academic knowledge and the provided context.`;

    const user = `Textbook context (Page ${pageNumber || 'current'}):
${context || 'No extracted text available for this page.'}

Student question: ${prompt}`;

    return await this.#generate(system, user);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 2. Summarize — Structured revision bullet points
  // ─────────────────────────────────────────────────────────────────────────
  async summarize({ text = '', topic = 'Current Section', subject = 'General Study', pageNumber = '' }) {
    const system = `You are StudyBuddy AI, an academic study revision summarizer.

Return ONLY a valid JSON object in this exact structure, with no markdown fences, no conversational preamble, and no explanation:
{
  "subtopics": [
    {
      "name": "Subtopic heading string",
      "points": ["bullet point string", "bullet point string", "bullet point string"]
    }
  ]
}

Rules:
- Generate exactly 2 to 3 subtopics.
- Each subtopic must contain 3 to 5 clear bullet points.
- Highlight high-yield exam concepts, definitions, and essential relationships.
- Format strictly as valid JSON.`;

    const user = `Subject: ${subject}
Topic: ${topic}
Page: ${pageNumber || 'N/A'}

Textbook content:
${text || 'No extracted text available.'}

Summarize this content into structured revision notes formatted as JSON.`;

    const raw = await this.#generate(system, user);

    try {
      const cleaned = raw.replace(/```json|```/g, '').trim();
      // Find the first '{' and last '}' in case the provider wrapped text around it
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
            name: `Summary of ${topic}`,
            points: raw.split('\n').filter(l => l.trim().length > 0).slice(0, 8)
          }
        ]
      };
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 3. Generate Questions — Diagnostic practice questions
  // ─────────────────────────────────────────────────────────────────────────
  async generateQuestions({ text = '', topic = 'Current Section', subject = 'General Study', pageNumber = '', count = 5 }) {
    const system = `You are StudyBuddy AI, an expert examination question architect for JAMB practice drills.

Return ONLY a valid JSON array of exactly ${count} question strings. No markdown formatting, no numbering prefixes inside strings, and no extra text.
Example valid response:
["What is the fundamental theoretical principle governing this process?", "How does boundary temperature influence the observed system behavior?", "Differentiate between the primary and secondary stages discussed in this chapter."]

Rules:
- Questions must test mastery of the provided content.
- Include a blend of conceptual definitions, analytical reasoning, and practical application.
- Format strictly as a JSON array of strings.`;

    const user = `Subject: ${subject}
Topic: ${topic}
Page: ${pageNumber || 'N/A'}
Number of questions required: ${count}

Textbook content:
${text || 'No extracted text available.'}

Generate exactly ${count} practice questions as a JSON array.`;

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

    // Fallback line extractor
    const lines = raw.split('\n').map(l => l.replace(/^\d+[\.\)]\s*/, '').trim()).filter(l => l.length > 10);
    return lines.slice(0, count);
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
