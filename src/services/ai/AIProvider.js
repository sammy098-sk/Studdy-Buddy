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
   * Summarize educational textbook content or topic for quick revision.
   * @param {Object} params - { text, topic, subject, pageNumber }
   * @returns {Promise<Object>} - Structured summary { subtopics: [{ name, points: [] }] }
   */
  async summarize(params) {
    throw new Error(`AIProvider [${this.name}]: summarize() not implemented.`);
  }

  /**
   * Generate practice questions for diagnostic testing.
   * @param {Object} params - { text, topic, subject, pageNumber, count, excludeList }
   * @returns {Promise<Array<string>>} - List of question strings
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
}
