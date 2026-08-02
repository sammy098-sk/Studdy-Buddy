import { AIProvider } from './AIProvider';

/**
 * Placeholder / Mock AI Provider for Phase 1 Architecture Validation.
 * Returns structured educational placeholder data without calling any external LLM APIs,
 * enabling complete UI, caching, Read Aloud, and user flow testing.
 */
export class PlaceholderProvider extends AIProvider {
  constructor() {
    super('Placeholder (Development Mode)');
  }

  async #delay(ms = 600) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async ask({ prompt, pageNumber = 'N', context = '' }) {
    await this.#delay(700);
    return `[AI Provider Not Connected Yet]\n\nBased on Page ${pageNumber} of your current textbook chapter, here is a mock architectural explanation regarding "${prompt.slice(0, 50)}...":\n\n1. **Core Concept**: The primary theoretical foundation presented in this section revolves around progressive mastery and structured comprehension.\n2. **Application**: When applying this equation or methodology in examination scenarios, always verify unit normalization and boundary constraints.\n3. **Summary**: Keep reviewing the diagrammatic examples on Page ${pageNumber} for practical JAMB syllabus alignment.`;
  }

  async summarize({ subject = 'General Study', topic = 'Current Page Section', pageNumber = 'N', scope = 'page', style = 'quick' }) {
    await this.#delay(650);
    const styleLabel = {
      quick: "Quick Revision",
      detailed: "Detailed Summary",
      exam_notes: "Exam Revision Notes",
      definitions: "Key Definitions",
      formulas: "Important Formulas",
      concepts: "Key Concepts",
      frequent_topics: "Frequently Tested Topics"
    }[style] || "Quick Revision";

    return {
      subtopics: [
        {
          name: `${styleLabel}: ${topic} (Scope: ${scope.toUpperCase()})`,
          points: [
            "⚠️ [AI Provider Not Connected Yet] Displaying structured interactive study data.",
            `Fundamental principles governing ${subject} across the active ${scope} study scope.`,
            "Critical mathematical and conceptual relationships emphasized in JAMB examination testing.",
            "Summary check: Master these core bullet points before transitioning to interactive practice drills."
          ]
        },
        {
          name: "Examination Hot-Spots & Diagnostic Strategies",
          points: [
            `Typical JAMB distractors and multiple-choice traps associated with ${topic}.`,
            "Step-by-step reasoning strategy for resolving complex analytical scenario questions.",
            `Cross-reference: Verify corresponding chapter charts and formulas from Page ${pageNumber}.`
          ]
        }
      ]
    };
  }

  async generateQuestions({ topic = 'Current Chapter Section', pageNumber = 'N', count = 5, scope = 'page', examMode = true }) {
    await this.#delay(800);
    const mockQuestions = [
      {
        question: `[JAMB Exam Mode] What is the primary foundational principle governing the observations discussed in ${topic}?`,
        options: [
          { id: "A", text: "Unregulated spontaneous phase transformation without equilibrium", isCorrect: false },
          { id: "B", text: "Progressive systemic equilibrium governed by conservation laws", isCorrect: true },
          { id: "C", text: "Linear dissipation of energy independently of external temperature", isCorrect: false },
          { id: "D", text: "Reversible catalytic inversion under isothermal conditions exclusively", isCorrect: false }
        ],
        explanation: "Option B is correct because foundational theories in this textbook section explicitly rely on conservation laws and progressive systemic equilibrium. Option A is a distractor describing non-equilibrium chemistry, while C and D misrepresent standard temperature dependency in JAMB syllabuses."
      },
      {
        question: `[JAMB Exam Mode] In standard laboratory experiments on ${topic}, why must boundary constraints be monitored constantly?`,
        options: [
          { id: "A", text: "To prevent external pressure variance from distorting volumetric measurements", isCorrect: true },
          { id: "B", text: "Because glass apparatus expands logarithmically below zero degrees", isCorrect: false },
          { id: "C", text: "To induce artificial supersaturation prior to titration", isCorrect: false },
          { id: "D", text: "To eliminate gravitational acceleration effects from fluid dynamics", isCorrect: false }
        ],
        explanation: "Option A is correct: volumetric measurements are directly sensitive to ambient boundary pressure in experimental setups. Option B is factually inaccurate regarding thermal expansion, and Option C is an incorrect laboratory procedure."
      },
      {
        question: `[JAMB Exam Mode] Which of the following relationships represents the correct formulaic deduction from Page ${pageNumber}?`,
        options: [
          { id: "A", text: "Rate is inversely proportional to the square root of active catalysts", isCorrect: false },
          { id: "B", text: "Force remains constantly zero across non-inertial accelerating frames", isCorrect: false },
          { id: "C", text: "Observed magnitude varies directly with primary variable intensity", isCorrect: true },
          { id: "D", text: "Enthalpy shift is entirely independent of initial and final molecular states", isCorrect: false }
        ],
        explanation: "Option C correctly characterizes fundamental direct variation as explained in the reading text. Option D violates fundamental state function properties."
      }
    ];
    // Repeat or slice mock questions to match count
    const result = [];
    for (let i = 0; i < count; i++) {
      const base = mockQuestions[i % mockQuestions.length];
      result.push({ ...base, id: `mock_q_${i + 1}`, question: `${i >= mockQuestions.length ? `[Additional Drill #${i+1}] ` : ''}${base.question}` });
    }
    return result;
  }

  async evaluateAnswer({ topic, question, studentAnswer }) {
    await this.#delay(500);
    return `⚠️ [AI Provider Not Connected Yet] Feedback Simulation: Your response ("${studentAnswer.slice(0, 30)}...") demonstrates a good intuitive grasp of ${topic || 'this question'}. To maximize your examination score, ensure you explicitly reference the foundational definitions and units from the chapter text!`;
  }

  async explainPage({ pageNumber = 'N', text = '' }) {
    await this.#delay(700);
    return `⚠️ [AI Provider Not Connected Yet] Complete Page ${pageNumber} Architectural Breakdown:\n\n### 1. What This Page is Actually Saying\nThis page introduces the foundational principles of the subject without overwhelming mathematical complexity. Think of it as laying the groundwork for the more complex analytical exercises later in the chapter.\n\n### 2. Why It Matters for Your Exams\nExaminers consistently pull theoretical definitions directly from this type of introductory text. Notice how the author distinguishes between core rules and experimental exceptions.\n\n### 3. Quick Check for Understanding\nAsk yourself: Could I explain the primary diagram or formula on Page ${pageNumber} out loud without looking back at the textbook? If yes, you are ready to continue your reading streak!`;
  }
}
