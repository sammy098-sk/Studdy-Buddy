import { supabase } from '../supabase';

/**
 * CBT Question Service for Studdy Buddy V1.
 * Provides an abstracted question provider architecture:
 * 1. Primarily queries our Supabase database (`cbt_questions` table) as the single source of truth.
 * 2. Abstracted to allow switching provider engines to ALOC (Nigerian Exam API) in future updates
 *    without modifying dashboard UI or business logic.
 * 3. Enforces zero data fabrication: returns verified counts or 0 when no practice items exist.
 */
class CBTQuestionService {
  constructor() {
    this.provider = 'supabase'; // Configurable provider: 'supabase' | 'aloc'
  }

  /**
   * Set the active question repository provider.
   * @param {'supabase' | 'aloc'} providerName 
   */
  setProvider(providerName) {
    this.provider = providerName;
  }

  /**
   * Retrieve exact counts of verified CBT practice questions mapped by subject.
   * Never infers counts from textbooks or chapter summaries.
   * @returns {Promise<Record<string, number>>} Map of subject name -> count (e.g. { 'Physics': 150 })
   */
  async getCBTQuestionCountsBySubject() {
    if (this.provider === 'aloc') {
      // Future Architecture Slot for ALOC API Integration
      // When enabled, fetch verified question totals per subject from ALOC endpoints or cache layer
      console.info("CBTQuestionService: ALOC API provider selected (Future Integration)");
      return {};
    }

    // Default: Supabase Single Source of Truth
    try {
      const { data, error } = await supabase
        .from('cbt_questions')
        .select('subject')
        .eq('is_verified', true);

      if (error) {
        // If table doesn't exist yet or query fails, silently return empty count map (no fabrication)
        return {};
      }

      const counts = {};
      if (Array.isArray(data)) {
        data.forEach(item => {
          if (item.subject) {
            const cleanSub = item.subject.trim();
            counts[cleanSub] = (counts[cleanSub] || 0) + 1;
          }
        });
      }
      return counts;
    } catch (err) {
      console.warn("CBTQuestionService: Failed to retrieve question counts from Supabase:", err);
      return {};
    }
  }

  /**
   * Helper to format question count string cleanly for UI cards.
   * @param {Record<string, number>} countsMap 
   * @param {string} subject 
   * @returns {string} Formatted count string (e.g. "0 CBT Questions" or "125 CBT Questions")
   */
  formatQuestionCount(countsMap, subject) {
    const count = countsMap?.[subject] || 0;
    return `${count.toLocaleString()} ${count === 1 ? 'CBT Question' : 'CBT Questions'}`;
  }
}

export const cbtQuestionService = new CBTQuestionService();
export default cbtQuestionService;
