import { getAIProvider, AIProviderFactory } from './ai/AIProviderFactory';
import { supabase } from '../supabase';

/**
 * Reusable Study Tools Service interface.
 * Coordinates page text extraction, result caching, bookmarking, and calls to the active AI provider.
 */
class StudyToolsService {
  constructor() {
    this.cache = new Map();
    this.pageProviders = new Map(); // { bookId | 'active': getPageFn }
    this.bookMetaCache = new Map(); // { bookId: { title } }
  }

  /**
   * Register a dynamic PDF page getter function from an active viewer session.
   */
  registerPageProvider(bookId, getPageFn, bookTitle = null) {
    if (bookId && typeof getPageFn === 'function') {
      this.pageProviders.set(bookId, getPageFn);
      this.pageProviders.set('active', getPageFn);
    }
    if (bookId && bookTitle) {
      this.bookMetaCache.set(bookId, { title: bookTitle });
    }
  }

  /**
   * Proactively cache OCR text extracted during live page renders.
   */
  cacheExtractedText(bookId, pageNumber, text) {
    if (!text) return;
    const readableText = text.replace(/[^a-zA-Z0-9]/g, '');
    if (readableText.length < 30) return; // ignore incomplete or unreadable OCR extracts

    const cacheKey = `extracted_text_${bookId}_${pageNumber}`;
    const existing = this.cache.get(cacheKey) || {};
    this.cache.set(cacheKey, {
      text: text.trim(),
      chapterTitle: existing.chapterTitle || `Chapter (Page ${pageNumber})`,
      sectionTitle: existing.sectionTitle || '',
      isEmpty: false,
      source: "PDF OCR Layer"
    });
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
   * @returns {Promise<{ text: string, chapterTitle: string, sectionTitle: string, isEmpty: boolean, source: string }>}
   */
  async extractPageText(bookId, pageNumber = 1, forceRefresh = false) {
    const cacheKey = `extracted_text_${bookId}_${pageNumber}`;
    if (!forceRefresh && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    let chapterTitle = `Chapter (Page ${pageNumber})`;
    let sectionTitle = '';
    let extractedText = '';

    if (bookId) {
      try {
        // Find chapter covering this page
        const { data: chapters } = await supabase
          .from('textbook_chapters')
          .select('title, start_page, end_page, page_number, level, type')
          .eq('book_id', bookId)
          .lte('page_number', pageNumber)
          .order('page_number', { ascending: false });

        if (chapters && chapters.length > 0) {
          const sectionObj = chapters.find(c => c.level > 1 || c.type === 'concept');
          const chapterObj = chapters.find(c => c.level === 1 || c.type === 'chapter' || c.type === 'frontMatter') || chapters[0];
          if (chapterObj) chapterTitle = chapterObj.title;
          if (sectionObj && sectionObj.title !== chapterTitle) sectionTitle = sectionObj.title;
        }
      } catch (err) {
        console.warn(`[StudyToolsService] Could not lookup chapter for book ${bookId} page ${pageNumber}:`, err);
      }
    }

    // Dynamic OCR extraction via registered PDF page provider
    const getPageFn = this.pageProviders.get(bookId) || this.pageProviders.get('active');
    if (getPageFn) {
      try {
        const pageProxy = await getPageFn(pageNumber);
        if (pageProxy && typeof pageProxy.getTextContent === 'function') {
          const textContent = await pageProxy.getTextContent();
          extractedText = (textContent.items || [])
            .map(item => item.str || '')
            .join(' ')
            .replace(/\s+/g, ' ')
            .trim();
        }
      } catch (err) {
        console.warn(`[StudyToolsService] Could not dynamically extract OCR text for book ${bookId}, page ${pageNumber}:`, err);
      }
    }

    const readableText = extractedText.replace(/[^a-zA-Z0-9]/g, '');
    const isEmpty = readableText.length < 30;

    if (import.meta.env?.DEV || import.meta.env?.MODE === 'development') {
      console.log(`[StudyToolsService] Page ${pageNumber} Extraction — Book: ${bookId || 'N/A'}, Chapter: "${chapterTitle}", Section: "${sectionTitle || 'N/A'}", Extracted Chars: ${extractedText.length}, Readable Chars: ${readableText.length}`);
      if (!isEmpty) {
        console.log(`[StudyToolsService] First 300 characters of extracted text:`, extractedText.slice(0, 300));
      } else {
        console.warn(`[StudyToolsService] Page ${pageNumber} extraction returned insufficient readable text (empty, unreadable, or image-only).`);
      }
    }

    const payload = { 
      text: extractedText, 
      chapterTitle, 
      sectionTitle, 
      isEmpty, 
      source: getPageFn ? "PDF OCR Extraction" : "Textbook Database" 
    };
    
    // Cache result only if we found readable text or completed checks
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
   * Ask an AI question about Page N with context grounding verification.
   */
  async askAI({ prompt, bookId, pageNumber, contextText = '', bookTitle = '' }) {
    const provider = getAIProvider();
    const contextObj = await this.extractPageText(bookId, pageNumber);
    const textToUse = contextText || contextObj.text || '';
    const readableText = textToUse.replace(/[^a-zA-Z0-9]/g, '');

    // Stop AI request if extraction fails or returns very little readable text (image-only, empty, unreadable)
    if (readableText.length < 30) {
      return "There's not enough readable text on this page for me to answer accurately.";
    }

    const cachedMeta = this.bookMetaCache.get(bookId);
    const finalBookTitle = bookTitle || cachedMeta?.title || 'Textbook';

    return await provider.ask({
      prompt,
      pageNumber,
      bookId,
      bookTitle: finalBookTitle,
      chapterTitle: contextObj.chapterTitle,
      sectionTitle: contextObj.sectionTitle,
      context: textToUse,
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
