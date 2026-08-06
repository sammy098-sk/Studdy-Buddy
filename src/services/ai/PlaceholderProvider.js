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

  async summarize({ subject = 'General Study', topic = 'Current Page Section', pageNumber = 'N', scope = 'page', style = 'quick', moduleTitle = null }) {
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
          name: `${styleLabel}: ${moduleTitle || topic} (Scope: ${scope.toUpperCase()})`,
          points: [
            "⚠️ [AI Provider Not Connected Yet] Displaying comprehensive master teacher revision notes simulation.",
            `Fundamental theoretical principles governing ${subject} across the active ${scope} study scope. Notice how foundational laws establish standard laboratory and mathematical boundary constraints.`,
            "Concrete real-world example: Consider how systemic equilibrium is maintained when external variables are altered during experimental testing.",
            "Critical mathematical relationships and formula derivations emphasized in JAMB CBT examination testing."
          ]
        },
        {
          name: "Examination Hot-Spots & Diagnostic Trap Avoidance",
          points: [
            `Typical JAMB distractors and multiple-choice calculation traps associated with ${moduleTitle || topic}. Examiners often invert unit ratios or substitute thermodynamic constants to mislead unprepared candidates.`,
            "Step-by-step calculation reasoning strategy for resolving complex analytical scenario questions without relying on guesswork.",
            `Cross-reference: Always verify corresponding chapter diagrams, formula proofs, and parameter boundary definitions from Page ${pageNumber}.`
          ]
        }
      ]
    };
  }

  async generateQuestions({ topic = 'Current Chapter Section', pageNumber = 'N', count = 15, scope = 'page', examMode = true }) {
    await this.#delay(800);
    const mockQuestions = [
      {
        question: `[JAMB Exam Mode] What is the primary foundational principle governing the observations discussed in ${topic}?`,
        options: [
          { id: "A", text: "Unregulated spontaneous phase transformation without equilibrium", isCorrect: false, explanation: "Incorrect distractor: spontaneous phase transformation violates standard thermodynamic conservation under normal laboratory conditions." },
          { id: "B", text: "Progressive systemic equilibrium governed by conservation laws", isCorrect: true, explanation: "Correct choice: foundational theories in this section rely explicitly on progressive systemic equilibrium and energy conservation laws." },
          { id: "C", text: "Linear dissipation of energy independently of external temperature", isCorrect: false, explanation: "Incorrect distractor: energy dissipation in standard analytical models depends strictly on temperature gradients." },
          { id: "D", text: "Reversible catalytic inversion under isothermal conditions exclusively", isCorrect: false, explanation: "Incorrect distractor: catalytic inversion occurs across both isothermal and adiabatic boundary constraints." }
        ],
        explanation: "Option B is correct because foundational theories in this textbook section explicitly rely on conservation laws and progressive systemic equilibrium. Option A is a distractor describing non-equilibrium chemistry, while C and D misrepresent standard temperature dependency in JAMB syllabuses."
      },
      {
        question: `[JAMB Exam Mode] In standard laboratory experiments on ${topic}, why must boundary constraints be monitored constantly?`,
        options: [
          { id: "A", text: "To prevent external pressure variance from distorting volumetric measurements", isCorrect: true, explanation: "Correct choice: volumetric measurements are directly sensitive to ambient atmospheric pressure in experimental setups." },
          { id: "B", text: "Because glass apparatus expands logarithmically below zero degrees", isCorrect: false, explanation: "Incorrect distractor: thermal expansion occurs linearly above freezing and does not expand logarithmically below zero." },
          { id: "C", text: "To induce artificial supersaturation prior to titration", isCorrect: false, explanation: "Incorrect distractor: supersaturation disrupts titration equilibria and invalidates molar concentration results." },
          { id: "D", text: "To eliminate gravitational acceleration effects from fluid dynamics", isCorrect: false, explanation: "Incorrect distractor: gravitational acceleration is constant and cannot be eliminated by boundary constraint monitoring." }
        ],
        explanation: "Option A is correct: volumetric measurements are directly sensitive to ambient boundary pressure in experimental setups. Option B is factually inaccurate regarding thermal expansion, and Option C is an incorrect laboratory procedure."
      },
      {
        question: `[JAMB Exam Mode] Which of the following relationships represents the correct formulaic deduction from Page ${pageNumber}?`,
        options: [
          { id: "A", text: "Rate is inversely proportional to the square root of active catalysts", isCorrect: false, explanation: "Incorrect distractor: reaction rates generally scale directly with active catalyst concentration rather than inversely with square roots." },
          { id: "B", text: "Force remains constantly zero across non-inertial accelerating frames", isCorrect: false, explanation: "Incorrect distractor: non-inertial frames always introduce fictitious inertial forces." },
          { id: "C", text: "Observed magnitude varies directly with primary variable intensity", isCorrect: true, explanation: "Correct choice: direct proportional variation correctly models the primary theoretical interaction described in the text." },
          { id: "D", text: "Enthalpy shift is entirely independent of initial and final molecular states", isCorrect: false, explanation: "Incorrect distractor: enthalpy is a thermodynamic state function whose change depends strictly on initial and final states." }
        ],
        explanation: "Option C correctly characterizes fundamental direct variation as explained in the reading text. Option D violates fundamental state function properties."
      }
    ];
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

  async explainPage({ pageNumber = 'N', text = '', scope = 'page', moduleTitle = null }) {
    await this.#delay(700);
    return `⚠️ [AI Provider Not Connected Yet] Master Teacher Lecture Notes Simulation (${moduleTitle || scope.toUpperCase()}, Page ${pageNumber}):\n\n### 1. In-Depth Theoretical Lecture & Core Principles\nThis chapter module introduces the foundational theoretical laws of the subject matter without overwhelming mathematical complexity. Think of this theory as establishing the critical boundary constraints and structural relationships required for real-world analytical modeling. Notice how every variable ties directly into standard laboratory physical states.\n\n### 2. Why This Matters for JAMB & Examinations\nJAMB examiners consistently design high-stakes multiple-choice items around these foundational definitions. Specifically, candidates are frequently tested on variable proportionality, unit conversion constants, and exception conditions under non-standard temperature or pressure states.\n\n### 3. Common Student Mistakes & Examiner Traps\nA classic misconception among students is confusing state functions with path-dependent experimental procedures. When examiners provide distractor options with inverted fraction exponents or mismatched empirical units, take a second to verify dimensional analysis before confirming your answer.\n\n### 4. Self-Diagnostic Checks for Mastery\n1. Consider a real-world scenario where initial ambient temperature doubles while pressure is held constant: how would you intuitively justify the resulting shift in structural equilibrium using the text's governing equations?\n2. If an examiner presented two contrasting diagrams with differing catalyst concentrations, what exact diagnostic indicators would you evaluate first to determine reaction rate differentials without performing full numerical computation?`;
  }

  async generateGeneralSummary({ topic = '' }) {
    await this.#delay(600);
    return `### Concise Summary: ${topic || 'Academic Topic'}\n\n**${topic || 'This topic'}** is a foundational academic concept designed to explain quantitative or categorical relationships within its scientific and theoretical framework. In practice, understanding this theory requires examining both its core structural mechanism and its standard operational formulas.\n\nWhen evaluating ${topic || 'this subject'}, the primary takeaway centers on how variables interact under normal boundary conditions. It operates through distinct rules of consistency that ensure predictable outcomes in analytical models and real-world observations.\n\n*(Note: Displaying offline placeholder summary. Connect your OpenRouter API key in settings for live AI completions focused strictly on your prompt without unsolicited boilerplate.)*`;
  }

  async explainGeneralConcept({ topic = '' }) {
    await this.#delay(750);
    return `### Understanding ${topic || 'This Concept'} Step by Step\n\nImagine you are learning this for the very first time. Let's break down **${topic || 'this topic'}** using simple everyday logic without confusing academic jargon!\n\n#### 1. What is it? (The Simple Idea)\nAt its simplest, think of **${topic || 'this concept'}** like an everyday accounting system or basic building rule: everything has a purpose, a starting point, and a natural consequence. When one component shifts, the entire framework responds in a very logical, predictable way.\n\n#### 2. A Real-World Analogy\nIf you imagine a water tank with a valve, adjusting the valve doesn't change the amount of water available—it simply changes the rate and force of flow. In the same way, ${topic || 'this theoretical mechanism'} balances internal inputs with external outputs without violating natural laws.\n\n#### 3. Step-by-Step Breakdown\n1. **First Stage (Initiation)**: The initial conditions establish baseline parameters.\n2. **Second Stage (Interaction)**: Forces or economic variables influence the central structure.\n3. **Final Stage (Equilibrium / Outcome)**: The system achieves balance or resolves into a permanent state.\n\nWe have covered the fundamental explanation of ${topic || 'this concept'} from start to finish!`;
  }
}
