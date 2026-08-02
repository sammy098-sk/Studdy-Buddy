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

  async summarize({ subject = 'General Study', topic = 'Current Page Section', pageNumber = 'N' }) {
    await this.#delay(650);
    return {
      subtopics: [
        {
          name: `Key Foundations of ${topic} (Page ${pageNumber})`,
          points: [
            "⚠️ [AI Provider Not Connected Yet] Displaying architectural test summary data.",
            `Fundamental laws and vocabulary governing ${subject} as defined in chapter opening paragraphs.`,
            "Critical mathematical or conceptual relationships frequently emphasized in standard examinations.",
            "Summary check: Ensure all preliminary vocabulary definitions are memorized before proceeding to exercise sets."
          ]
        },
        {
          name: "Examination Hot-Spots & Practical Examples",
          points: [
            `Typical JAMB multi-choice diagnostic traps associated with ${topic}.`,
            "Step-by-step resolution strategy for computational or analytical essay questions.",
            `Cross-reference: Review corresponding diagrams and practical demonstration problems on Page ${pageNumber}.`
          ]
        }
      ]
    };
  }

  async generateQuestions({ topic = 'Current Chapter Section', pageNumber = 'N', count = 5 }) {
    await this.#delay(800);
    const mockQuestions = [
      `[AI Offline Mock] What is the primary theoretical principle defined on Page ${pageNumber} regarding ${topic}?`,
      `[AI Offline Mock] State the critical boundary conditions required when applying the formulas from this textbook section.`,
      `[AI Offline Mock] Differentiate between the baseline observations and advanced experimental conclusions discussed on Page ${pageNumber}.`,
      `[AI Offline Mock] How does the author characterize the real-world implications of ${topic} within standard course syllabuses?`,
      `[AI Offline Mock] Summarize the step-by-step problem resolution method illustrated in the working examples of Page ${pageNumber}.`,
      `[AI Offline Mock] Identify three common misconceptions when answering multiple-choice questions on ${topic}.`
    ];
    return mockQuestions.slice(0, count);
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
