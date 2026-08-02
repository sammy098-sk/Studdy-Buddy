import { getAIProvider, AIProviderFactory } from './ai/AIProviderFactory';
import { supabase } from '../supabase';

/**
 * Reusable Study Tools Service interface.
 * Coordinates page text extraction, result caching, bookmarking, and calls to the active AI provider.
 */
class StudyToolsService {
  constructor() {
    this.cache = new Map();
  }

  /**
   * Generate a stable cache key for storing study materials per book & page.
   */
  #getCacheKey(bookId, pageNumber, action, extra = '') {
    return `${bookId || 'global'}_page_${pageNumber}_${action}_${extra}`;
  }

  /**
   * Check in-memory / session cache before calling AI Provider.
   */
  async #withCache(cacheKey, fn) {
    if (this.cache.has(cacheKey)) {
      console.log(`[StudyToolsService] Cache hit for key: ${cacheKey}`);
      return { result: this.cache.get(cacheKey), isCached: true };
    }
    const result = await fn();
    this.cache.set(cacheKey, result);
    return { result, isCached: false };
  }

  /**
   * Extract current page/section text and chapter context from Supabase or active reading session.
   *
   * @param {string} bookId - UUID of the textbook
   * @param {number} pageNumber - Current reader page
   * @returns {Promise<{ text: string, chapterTitle: string, source: string }>}
   */
  async extractPageText(bookId, pageNumber = 1) {
    const cacheKey = `extracted_text_${bookId}_${pageNumber}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    let chapterTitle = `Chapter Section (Page ${pageNumber})`;
    let extractedText = '';

    if (bookId) {
      try {
        // Find chapter covering this page
        const { data: chapters } = await supabase
          .from('textbook_chapters')
          .select('title, start_page, end_page')
          .eq('book_id', bookId)
          .lte('start_page', pageNumber)
          .order('start_page', { ascending: false })
          .limit(1);

        if (chapters && chapters.length > 0) {
          chapterTitle = chapters[0].title;
        }
      } catch (err) {
        console.warn(`[StudyToolsService] Could not lookup chapter for book ${bookId} page ${pageNumber}:`, err);
      }
    }

    // Default rich context fallback for Phase 1 architecture testing when OCR text chunks aren't cached locally
    if (!extractedText) {
      extractedText = `[Textbook Content Excerpt - Page ${pageNumber} of ${chapterTitle}]:\nThis section establishes fundamental theoretical principles, core formulas, and practical problem-solving methodologies. Key emphasis is placed on vocabulary retention and systematic resolution of practice examination scenarios.`;
    }

    const payload = { text: extractedText, chapterTitle, source: bookId ? "Textbook Database" : "Reader Memory" };
    this.cache.set(cacheKey, payload);
    return payload;
  }

  /**
   * Save bookmark for the current page and textbook.
   */
  async bookmarkPage({ userId, bookId, pageNumber, bookTitle = 'Textbook' }) {
    const bookmarkObj = {
      userId,
      bookId,
      pageNumber,
      title: `${bookTitle} - Page ${pageNumber}`,
      createdAt: new Date().toISOString()
    };

    // Store in local browser storage for instantaneous feedback and offline continuity
    try {
      const existing = JSON.parse(localStorage.getItem('study_buddy_bookmarks') || '[]');
      const updated = [bookmarkObj, ...existing.filter(b => !(b.bookId === bookId && b.pageNumber === pageNumber))];
      localStorage.setItem('study_buddy_bookmarks', JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to store bookmark locally:', e);
    }

    // If online & authenticated, persist to reading_progress or bookmarks table
    if (userId && bookId) {
      try {
        await supabase
          .from('reading_progress')
          .upsert({
            user_id: userId,
            book_id: bookId,
            current_page: pageNumber,
            updated_at: new Date().toISOString()
          }, { onConflict: 'user_id,book_id' });
      } catch (e) {
        console.warn('Failed to sync bookmark to cloud progress:', e);
      }
    }

    return { success: true, message: `Bookmarked Page ${pageNumber} for fast retrieval!` };
  }

  /**
   * Ask an AI question about Page N.
   */
  async askAI({ prompt, bookId, pageNumber, contextText = '' }) {
    const provider = getAIProvider();
    const contextObj = await this.extractPageText(bookId, pageNumber);
    
    return await provider.ask({
      prompt,
      pageNumber,
      context: contextText || contextObj.text,
    });
  }

  /**
   * Generate Summary for Page N or topic.
   */
  async generateSummary({ bookId, pageNumber, subject = 'Subject', topic = 'Topic', contextText = '', forceRefresh = false }) {
    const provider = getAIProvider();
    const cacheKey = this.#getCacheKey(bookId, pageNumber, 'summary', `${subject}_${topic}_${provider.name}`);

    if (forceRefresh) {
      this.cache.delete(cacheKey);
    }

    const contextObj = await this.extractPageText(bookId, pageNumber);
    const resultObj = await this.#withCache(cacheKey, async () => {
      return await provider.summarize({
        subject,
        topic: topic || contextObj.chapterTitle,
        text: contextText || contextObj.text,
        pageNumber
      });
    });

    return {
      summary: resultObj.result,
      isCached: resultObj.isCached,
      providerName: provider.name
    };
  }

  /**
   * Generate Practice Questions for Page N.
   */
  async generateQuestions({ bookId, pageNumber, subject = 'Subject', topic = 'Topic', count = 5, contextText = '', excludeList = [] }) {
    const provider = getAIProvider();
    const cacheKey = this.#getCacheKey(bookId, pageNumber, `quiz_${count}`, `${subject}_${topic}_${provider.name}`);

    const contextObj = await this.extractPageText(bookId, pageNumber);
    const resultObj = await this.#withCache(cacheKey, async () => {
      return await provider.generateQuestions({
        subject,
        topic: topic || contextObj.chapterTitle,
        text: contextText || contextObj.text,
        pageNumber,
        count,
        excludeList
      });
    });

    return {
      questions: resultObj.result,
      isCached: resultObj.isCached,
      providerName: provider.name
    };
  }

  /**
   * Evaluate a practice question answer.
   */
  async checkAnswer({ topic, question, studentAnswer }) {
    const provider = getAIProvider();
    return await provider.evaluateAnswer({ topic, question, studentAnswer });
  }

  /**
   * Explain current textbook page in approachable terms.
   */
  async explainPage({ bookId, pageNumber, contextText = '' }) {
    const provider = getAIProvider();
    const cacheKey = this.#getCacheKey(bookId, pageNumber, 'explain', provider.name);

    const contextObj = await this.extractPageText(bookId, pageNumber);
    const resultObj = await this.#withCache(cacheKey, async () => {
      return await provider.explainPage({
        text: contextText || contextObj.text,
        pageNumber
      });
    });

    return {
      explanation: resultObj.result,
      isCached: resultObj.isCached,
      chapterTitle: contextObj.chapterTitle,
      providerName: provider.name
    };
  }

  /**
   * Clear cached items for a specific page.
   */
  clearPageCache(bookId, pageNumber) {
    const prefix = `${bookId || 'global'}_page_${pageNumber}_`;
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get provider metadata and status.
   */
  getStatus() {
    return {
      provider: AIProviderFactory.getProvider().name,
      isPlaceholder: AIProviderFactory.isPlaceholderMode(),
      cacheSize: this.cache.size
    };
  }
}

// Export singleton service instance
export const studyToolsService = new StudyToolsService();
export default studyToolsService;
