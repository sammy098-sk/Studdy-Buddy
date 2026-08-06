/**
 * Abstract AI Provider interface for StudyBuddy.
 * Enables provider-agnostic design (Anthropic, OpenAI, Gemini, Local, Mock).
 */
export class AIProvider {
  constructor(name) {
    this.name = name;
  }

  /**
   * Ask a question about a specific page or textbook context.
   * @param {Object} params - { prompt, context, pageNumber, chatHistory, systemPrompt }
   * @returns {Promise<string>} - AI response text
   */
  async ask(params) {
    throw new Error(`AIProvider [${this.name}]: ask() not implemented.`);
  }

  /**
   * Summarize educational textbook content or topic across user-selected scopes and styles.
   * @param {Object} params - { text, topic, subject, pageNumber, scope, style }
   * @returns {Promise<Object>} - Structured summary { subtopics: [{ name, points: [] }] }
   */
  async summarize(params) {
    throw new Error(`AIProvider [${this.name}]: summarize() not implemented.`);
  }

  /**
   * Generate practice questions (A-D JAMB Exam MCQs or open questions) for diagnostic testing.
   * @param {Object} params - { text, topic, subject, pageNumber, count, excludeList, scope, examMode }
   * @returns {Promise<Array<Object | string>>} - List of structured MCQ objects or question strings
   */
  async generateQuestions(params) {
    throw new Error(`AIProvider [${this.name}]: generateQuestions() not implemented.`);
  }

  /**
   * Give peer-tone feedback on a student's answer to a practice question.
   * @param {Object} params - { topic, question, studentAnswer }
   * @returns {Promise<string>} - Feedback string
   */
  async evaluateAnswer(params) {
    throw new Error(`AIProvider [${this.name}]: evaluateAnswer() not implemented.`);
  }

  /**
   * Explain a complex textbook page in clear, student-friendly terms.
   * @param {Object} params - { text, pageNumber, bookTitle }
   * @returns {Promise<string>} - Explanation string
   */
  async explainPage(params) {
    throw new Error(`AIProvider [${this.name}]: explainPage() not implemented.`);
  }

  /**
   * Generate a standalone academic topic summary independent of textbook databases.
   * @param {Object} params - { topic, userPrompt }
   * @returns {Promise<string>} - Concise 200-500 word summary string
   */
  async generateGeneralSummary(params) {
    throw new Error(`AIProvider [${this.name}]: generateGeneralSummary() not implemented.`);
  }

  /**
   * Generate a comprehensive teacher-style lesson on any academic concept in simple beginner language.
   * @param {Object} params - { topic, userPrompt }
   * @returns {Promise<string>} - Complete structured lesson string
   */
  async explainGeneralConcept(params) {
    throw new Error(`AIProvider [${this.name}]: explainGeneralConcept() not implemented.`);
  }
}
