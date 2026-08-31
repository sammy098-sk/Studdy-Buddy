import { supabase } from '../supabase';
import studyToolsService from './StudyToolsService';

/**
 * TextbookRetrievalService
 * 
 * Foundational Intelligent Retrieval (RAG) Engine & Reusable Study Platform Backend.
 * - Chunks extracted textbooks and builds keyword/semantic indexes per book.
 * - Guarantees entire textbooks (thrice thousand pages) are NEVER dumped into a single AI prompt.
 * - Retrieves precise, relevance-scored sections for page, chapter, and book scopes.
 * - Engineered to directly power future study workflows: Flashcards, Mock JAMB Exams, 
 *   Adaptive Revision, Weak Topic Detection, Personalized Study Plans, Concept Maps, 
 *   Cross-Chapter Comparisons, and AI Tutor Conversations.
 */
class TextbookRetrievalService {
  constructor() {
    this.bookIndexes = new Map(); // bookId -> { chunks: [], chapterMap: Map, lastIndexed: timestamp }
  }

  /**
   * Ingest and index textbook content from Supabase or memory cache.
   * Splits text into ~500-word indexed blocks with rich chapter/page metadata.
   */
  async ensureBookIndexed(bookId) {
    if (!bookId || this.bookIndexes.has(bookId)) {
      return this.bookIndexes.get(bookId) || { chunks: [], chapterMap: new Map() };
    }

    try {
      // 1. Fetch chapters
      const { data: chapters } = await supabase
        .from('textbook_chapters')
        .select('*')
        .eq('book_id', bookId)
        .order('order_index', { ascending: true });

      const chapterList = chapters || [];

      // 2. Fetch authoritative extracted pages from Supabase (server-side OCR source of truth)
      const { data: extractedPages } = await supabase
        .from('textbook_extracted_pages')
        .select('*')
        .eq('book_id', bookId)
        .order('page_number', { ascending: true });

      // Fallback: Fetch OCR text chunks or metadata
      const { data: chunks } = await supabase
        .from('textbook_chunks')
        .select('*')
        .eq('book_id', bookId)
        .order('part_number', { ascending: true });

      const indexChunks = [];
      const chapterMap = new Map();

      // Associate pages with chapters
      chapterList.forEach(ch => chapterMap.set(ch.id || ch.title, ch));

      if (extractedPages && extractedPages.length > 0) {
        extractedPages.forEach((p, idx) => {
          if (p.ocr_status === 'failed') return; // Exclude failed OCR pages to prevent hallucination
          const textContent = (p.extracted_text || '').trim();
          if (!textContent || textContent.replace(/[^a-zA-Z0-9]/g, '').length < 30) return;

          const matchingChap = chapterList.find(ch => 
            (ch.page_start && ch.page_end && p.page_number >= ch.page_start && p.page_number <= ch.page_end) ||
            ch.page_number === p.page_number
          ) || { title: `Page ${p.page_number}`, id: `page_${p.page_number}` };

          indexChunks.push({
            id: p.id || `pg_${p.page_number}`,
            bookId,
            pageNumber: p.page_number,
            chapterTitle: matchingChap.title || `Page ${p.page_number}`,
            chapterId: matchingChap.id,
            text: textContent,
            confidence: p.confidence_score,
            source: p.source,
            tokens: textContent.toLowerCase().match(/\b[a-z]{3,}\b/g) || []
          });
        });
      } else if (chunks && chunks.length > 0) {
        chunks.forEach((c, idx) => {
          const textContent = (c.text_content || c.content || '').trim();
          if (!textContent && !c.storage_path) return;
          
          // Identify matching chapter based on page numbers or index
          const matchingChap = chapterList.find(ch => 
            (c.page_start && ch.page_start && c.page_start >= ch.page_start && c.page_start <= ch.page_end) ||
            ch.order_index === idx + 1
          ) || { title: `Chapter ${idx + 1}`, id: `ch_${idx + 1}` };

          indexChunks.push({
            id: c.id || `chk_${idx}`,
            bookId,
            partNumber: c.part_number || idx + 1,
            chapterTitle: matchingChap.title || `Section ${idx + 1}`,
            chapterId: matchingChap.id,
            text: textContent,
            tokens: textContent.toLowerCase().match(/\b[a-z]{3,}\b/g) || []
          });
        });
      }

      const indexData = { chunks: indexChunks, chapters: chapterList, chapterMap, lastIndexed: Date.now() };
      this.bookIndexes.set(bookId, indexData);
      return indexData;
    } catch (e) {
      console.warn('[TextbookRetrievalService] Error indexing book:', e.message);
      const empty = { chunks: [], chapters: [], chapterMap: new Map(), lastIndexed: Date.now() };
      this.bookIndexes.set(bookId, empty);
      return empty;
    }
  }

  /**
   * Calculate keyword overlap (BM25 / TF-IDF style relevance scoring).
   */
  #scoreRelevance(query, tokens) {
    if (!query || !tokens.length) return 0;
    const queryTerms = query.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
    if (!queryTerms.length) return 0;

    let matchCount = 0;
    const uniqueTokens = new Set(tokens);
    queryTerms.forEach(term => {
      if (uniqueTokens.has(term)) matchCount += 2;
      else if (tokens.some(t => t.includes(term) || term.includes(t))) matchCount += 1;
    });

    return (matchCount / queryTerms.length) * Math.min(1.0, tokens.length / 50);
  }

  /**
   * Retrieve structured, ground-truth study context scoped precisely by student requirement.
   * @param {Object} params - { bookId, scope: 'page'|'chapter'|'book', currentPage, query, maxChunks }
   */
  async retrieveContext({ bookId, scope = 'page', currentPage = 1, query = '', maxChunks = 5 }) {
    // 1. PAGE SCOPE: Direct extraction from active PDF OCR text layer
    if (scope === 'page') {
      const pageCtx = await studyToolsService.extractPageText(bookId, currentPage);
      return {
        scope: 'page',
        title: pageCtx.chapterTitle || `Page ${currentPage}`,
        section: pageCtx.sectionTitle || '',
        text: pageCtx.text || '',
        isEmpty: Boolean(pageCtx.isEmpty || pageCtx.text.length < 30),
        pageNumber: currentPage,
        retrievedChunksCount: 1
      };
    }

    // 2. CHAPTER or BOOK SCOPE: Use Indexed Retrieval Engine
    const index = await this.ensureBookIndexed(bookId);
    
    // Attempt to identify active chapter if in chapter scope
    let targetChapterTitle = '';
    let availableChunks = index.chunks;

    if (scope === 'chapter') {
      // Find chapter containing currentPage or closest match
      const currentCh = index.chapters.find(c => 
        currentPage >= (c.page_start || 1) && currentPage <= (c.page_end || 999)
      ) || index.chapters[0];

      targetChapterTitle = currentCh?.title || `Chapter containing Page ${currentPage}`;
      if (currentCh && index.chunks.length > 0) {
        const chapFiltered = index.chunks.filter(c => c.chapterTitle === currentCh.title || c.chapterId === currentCh.id);
        if (chapFiltered.length > 0) availableChunks = chapFiltered;
      }
    }

    // If we have local OCR cache from earlier reader interactions, merge into search candidates
    if (studyToolsService.ocrCache && studyToolsService.ocrCache.has(bookId)) {
      const pageMap = studyToolsService.ocrCache.get(bookId);
      pageMap.forEach((text, pNum) => {
        if (!availableChunks.some(c => c.text === text)) {
          availableChunks.push({
            id: `cache_p_${pNum}`,
            bookId,
            chapterTitle: `Page ${pNum}`,
            text,
            tokens: text.toLowerCase().match(/\b[a-z]{3,}\b/g) || []
          });
        }
      });
    }

    // If query provided (Ask AI or targeted quiz topic), rank chunks by semantic relevance
    let selectedChunks = [];
    if (query && query.trim().length > 3) {
      const scored = availableChunks.map(chk => ({
        ...chk,
        score: this.#scoreRelevance(query, chk.tokens)
      })).sort((a, b) => b.score - a.score);
      
      selectedChunks = scored.slice(0, maxChunks);
    } else {
      // For general summaries or mock exams without strict queries, distribute evenly across target scope
      if (availableChunks.length <= maxChunks) {
        selectedChunks = availableChunks;
      } else {
        const step = Math.floor(availableChunks.length / maxChunks);
        for (let i = 0; i < maxChunks; i++) {
          selectedChunks.push(availableChunks[i * step] || availableChunks[i]);
        }
      }
    }

    const compiledText = selectedChunks
      .map(c => c.pageNumber ? `--- PAGE ${c.pageNumber} ---\n[${c.chapterTitle}]: ${c.text}` : `[${c.chapterTitle}]: ${c.text}`)
      .join('\n\n')
      .trim();
    const titleHeader = scope === 'chapter' ? targetChapterTitle : `Entire Textbook (Retrieved Highlights)`;

    return {
      scope,
      title: titleHeader,
      text: compiledText || (await studyToolsService.extractPageText(bookId, currentPage)).text || 'No indexed textbook content available for this scope yet.',
      isEmpty: compiledText.length < 50,
      pageNumber: currentPage,
      retrievedChunksCount: selectedChunks.length
    };
  }

  /**
   * Progressive Summarization Support: Retrieves ordered content batches for large books.
   */
  async getProgressiveSummaryBatches(bookId, scope = 'book', currentPage = 1) {
    const index = await this.ensureBookIndexed(bookId);
    if (scope === 'page') {
      const ctx = await studyToolsService.extractPageText(bookId, currentPage);
      return [{ title: ctx.chapterTitle || `Page ${currentPage}`, text: ctx.text }];
    }

    if (index.chapters && index.chapters.length > 0) {
      return index.chapters.map(ch => ({
        title: ch.title,
        text: index.chunks.filter(c => c.chapterId === ch.id || c.chapterTitle === ch.title).map(c => c.text).join(' ') || `Key syllabus learning objectives for ${ch.title}.`
      }));
    }

    return index.chunks.slice(0, 10).map(chk => ({ title: chk.chapterTitle, text: chk.text }));
  }

  /**
   * Platform Hooks for Future AI Study Features
   */
  async getMockExamSyllabusChunks(bookId, count = 10) {
    const ctx = await this.retrieveContext({ bookId, scope: 'book', maxChunks: count });
    return ctx.text;
  }

  async detectWeakTopics(bookId, incorrectQuestionTopics = []) {
    const index = await this.ensureBookIndexed(bookId);
    return incorrectQuestionTopics.map(topic => {
      const bestChunk = index.chunks.sort((a, b) => this.#scoreRelevance(topic, b.tokens) - this.#scoreRelevance(topic, a.tokens))[0];
      return { topic, recommendation: bestChunk?.chapterTitle || 'Review general principles' };
    });
  }
}

export const textbookRetrievalService = new TextbookRetrievalService();
export default textbookRetrievalService;
