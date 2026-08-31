import { getAIProvider, AIProviderFactory } from './ai/AIProviderFactory';
import { supabase } from '../supabase';
import { textbookRetrievalService } from './TextbookRetrievalService';
import { readerPreferencesService } from './ReaderPreferencesService';


/**
 * Reusable Study Tools Service interface.
 * Coordinates page text extraction, result caching, bookmarking, and calls to the active AI provider.
 */
class StudyToolsService {
  constructor() {
    this.cache = new Map();
    this.pageProviders = new Map(); // { bookId | 'active': getPageFn }
    this.bookMetaCache = new Map(); // { bookId: { title } }
    this.ocrCache = new Map(); // { bookId: Map<pageNum, text> }
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

    if (!this.ocrCache.has(bookId)) {
      this.ocrCache.set(bookId, new Map());
    }
    this.ocrCache.get(bookId).set(pageNumber, text.trim());
  }

  /**
   * Generate a stable cache key for storing study materials per book & page.
   */
  #getCacheKey(bookId, pageNumber, action, extra = '') {
    return `${bookId || 'global'}_p_${pageNumber}_${action}_${extra}`;
  }

  /**
   * Helper to retrieve context text dynamically scoped to page, chapter, or textbook RAG index.
   */
  async getScopedContext({ bookId, scope = 'page', pageNumber = 1, query = '' }) {
    if (scope === 'page') {
      const p = await this.extractPageText(bookId, pageNumber);
      const textWithPage = p.text ? `--- PAGE ${pageNumber} ---\n${p.text}` : '';
      return { text: textWithPage, title: p.chapterTitle, isEmpty: p.isEmpty };
    }
    const rag = await textbookRetrievalService.retrieveContext({ bookId, scope, currentPage: pageNumber, query });
    return { text: rag.text, title: rag.title, isEmpty: rag.isEmpty };
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

      try {
        // Query authoritative server-side extracted text from Supabase (source of truth)
        const { data: pageRecord } = await supabase
          .from('textbook_extracted_pages')
          .select('extracted_text, ocr_status, confidence_score, source')
          .eq('book_id', bookId)
          .eq('page_number', pageNumber)
          .maybeSingle();

        if (pageRecord) {
          if (pageRecord.ocr_status === 'failed') {
            extractedText = ''; // Enforce zero-hallucination if server-side OCR failed!
          } else if (pageRecord.extracted_text) {
            extractedText = pageRecord.extracted_text;
          }
        }
      } catch (dbErr) {
        console.warn(`[StudyToolsService] Error querying textbook_extracted_pages for book ${bookId}, page ${pageNumber}:`, dbErr.message);
      }
    }

    // Dynamic fallback OCR extraction via registered PDF page provider if database record missing
    const getPageFn = this.pageProviders.get(bookId) || this.pageProviders.get('active');
    if (!extractedText && getPageFn) {
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
   * Ask an AI question about current study scope (Page, Chapter, or Entire Book) with RAG grounding.
   */
  async askAI({ prompt, bookId, pageNumber, scope = 'page', contextText = '', bookTitle = '' }) {
    const provider = getAIProvider();
    const scoped = await this.getScopedContext({ bookId, scope, pageNumber, query: prompt });
    const textToUse = contextText || scoped.text || '';
    const readableText = textToUse.replace(/[^a-zA-Z0-9]/g, '');

    if (readableText.length < 30 && !contextText) {
      return `There's not enough readable textbook text in this ${scope} scope for me to answer accurately without speculating.`;
    }

    const cachedMeta = this.bookMetaCache.get(bookId);
    const finalBookTitle = bookTitle || cachedMeta?.title || 'Textbook';

    return await provider.ask({
      prompt,
      pageNumber,
      bookId,
      bookTitle: finalBookTitle,
      chapterTitle: scoped.title || `Scope: ${scope}`,
      sectionTitle: '',
      context: textToUse,
      scope
    });
  }

  /**
   * Helper to fetch user target score and subject combination from session/storage for adaptive AI difficulty.
   */
  async #getUserPreferences() {
    let targetScore = "250+";
    let subjectCombination = ["English Language"];
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        targetScore = localStorage.getItem(`sb_target_score_${session.user.id}`) || session.user.user_metadata?.target_score || "250+";
        const storedSubs = localStorage.getItem(`sb_subjects_${session.user.id}`);
        if (storedSubs) {
          subjectCombination = JSON.parse(storedSubs);
        } else if (session.user.user_metadata?.subject_combination) {
          subjectCombination = session.user.user_metadata.subject_combination;
        }
      }
    } catch (e) {
      console.warn('[StudyToolsService] Using default user preferences:', e.message);
    }
    return { targetScore, subjectCombination };
  }

  /**
   * Generate Summary for current study scope with selectable styling formats.
   */
  async generateSummary({ bookId, pageNumber, scope = 'page', style = 'quick', subject = 'Subject', topic = 'Topic', contextText = '', forceRefresh = false, moduleTitle = null }) {
    const provider = getAIProvider();
    const { targetScore, subjectCombination } = await this.#getUserPreferences();
    const cacheKey = this.#getCacheKey(bookId, pageNumber, `sum_${scope}_${style}_${moduleTitle || 'default'}_${targetScore}`, `${subject}_${topic}_${provider.name}`);

    if (forceRefresh) {
      this.cache.delete(cacheKey);
    }

    const scoped = await this.getScopedContext({ bookId, scope, pageNumber, query: moduleTitle ? `${style} summary of ${moduleTitle}` : `${style} summary of ${topic}` });
    const textToUse = contextText || scoped.text || '';
    const readableText = textToUse.replace(/[^a-zA-Z0-9]/g, '');
    if (scoped.isEmpty || readableText.length < 30) {
      return {
        summary: `Cannot generate summary: The selected ${scope} lacks readable text (it may be an unreadable image scan or failed OCR processing). Please select a different scope or retry OCR.`,
        isCached: false,
        providerName: provider.name,
        scope,
        style,
        isEmpty: true
      };
    }

    const resultObj = await this.#withCache(cacheKey, async () => {
      return await provider.summarize({
        subject,
        topic: moduleTitle || topic || scoped.title,
        text: textToUse,
        pageNumber,
        scope,
        style,
        moduleTitle,
        targetScore,
        subjectCombination
      });
    });

    return {
      summary: resultObj.result,
      isCached: resultObj.isCached,
      providerName: provider.name,
      scope,
      style
    };
  }

  /**
   * Generate A-D JAMB Practice Questions for Current Page, Chapter, or Book.
   */
  async generateQuestions({ bookId, pageNumber, scope = 'page', examMode = true, subject = 'Subject', topic = 'Topic', count = 15, contextText = '', excludeList = [] }) {
    const provider = getAIProvider();
    const { targetScore, subjectCombination } = await this.#getUserPreferences();
    const cacheKey = this.#getCacheKey(bookId, pageNumber, `quiz_${scope}_${examMode ? 'jamb' : 'std'}_${count}_${targetScore}`, `${subject}_${topic}_${provider.name}`);

    const scoped = await this.getScopedContext({ bookId, scope, pageNumber, query: `JAMB practice exam questions on ${topic}` });
    const textToUse = contextText || scoped.text || '';
    const readableText = textToUse.replace(/[^a-zA-Z0-9]/g, '');
    if (scoped.isEmpty || readableText.length < 30) {
      return {
        questions: [],
        error: `Cannot generate practice questions: The selected ${scope} lacks readable text (it may be an unreadable image scan or failed OCR processing).`,
        isCached: false,
        providerName: provider.name,
        scope,
        isEmpty: true
      };
    }

    const resultObj = await this.#withCache(cacheKey, async () => {
      return await provider.generateQuestions({
        subject,
        topic: topic || scoped.title,
        text: textToUse,
        pageNumber,
        scope,
        count,
        examMode,
        excludeList,
        targetScore,
        subjectCombination
      });
    });

    return {
      questions: resultObj.result,
      isCached: resultObj.isCached,
      providerName: provider.name,
      scope
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
   * Explain current study scope in approachable, interactive teaching terms.
   */
  async explainPage({ bookId, pageNumber, scope = 'page', promptPill = '', contextText = '', moduleTitle = null }) {
    const provider = getAIProvider();
    const cacheKey = this.#getCacheKey(bookId, pageNumber, `explain_${scope}_${promptPill.slice(0, 10)}_${moduleTitle || 'default'}`, provider.name);

    const scoped = await this.getScopedContext({ bookId, scope, pageNumber, query: moduleTitle || promptPill || `Explain ${scope}` });
    const textToUse = contextText || scoped.text || '';
    const readableText = textToUse.replace(/[^a-zA-Z0-9]/g, '');
    if (scoped.isEmpty || readableText.length < 30) {
      return {
        explanation: `Cannot explain content: The selected ${scope} lacks readable text (it may be an unreadable image scan or failed OCR processing).`,
        isCached: false,
        chapterTitle: scoped.title,
        providerName: provider.name,
        scope,
        isEmpty: true
      };
    }

    const resultObj = await this.#withCache(cacheKey, async () => {
      return await provider.explainPage({
        text: textToUse,
        pageNumber,
        scope,
        promptPill,
        moduleTitle
      });
    });

    return {
      explanation: resultObj.result,
      isCached: resultObj.isCached,
      chapterTitle: scoped.title,
      providerName: provider.name,
      scope
    };
  }

  /**
   * Retrieve structured textbook chapters or curriculum modules for AI Revision Book navigation.
   */
  async getBookModules(bookId, fallbackTitle = 'General Study') {
    if (bookId && bookId !== 'default') {
      try {
        const { data: chapters } = await supabase
          .from('textbook_chapters')
          .select('title, start_page, end_page, level, type')
          .eq('book_id', bookId)
          .order('start_page', { ascending: true });
        if (chapters && chapters.length > 0) {
          const majors = chapters.filter(c => c.level === 1 || c.type === 'chapter');
          const listToUse = majors.length > 0 ? majors : chapters.slice(0, 12);
          return listToUse.map((m, idx) => ({
            id: m.title || `Module ${idx + 1}`,
            title: m.title || `Chapter ${idx + 1}`,
            startPage: m.start_page
          }));
        }
      } catch (e) {
        console.warn('[StudyToolsService] Could not load textbook chapters from database:', e);
      }
    }
    // Default master curriculum module structure for Revision Book navigation
    return [
      { id: 'Module 1', title: `Module 1: Foundational Principles & Core Concepts of ${fallbackTitle}` },
      { id: 'Module 2', title: 'Module 2: Governing Laws & Analytical Formula Derivations' },
      { id: 'Module 3', title: 'Module 3: Experimental Methods & Practical Laboratory Applications' },
      { id: 'Module 4', title: 'Module 4: Advanced Problem Solving & Calculation Workflows' },
      { id: 'Module 5', title: 'Module 5: Historic JAMB Examination Hot-Spots & Distractor Trap Avoidance' }
    ];
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
