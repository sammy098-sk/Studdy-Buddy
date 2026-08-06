/**
 * ALOC Nigerian Exam API Integration Service.
 * 
 * Serves as the sole question source for Home Dashboard JAMB CBT Practice.
 * Strictly adheres to architectural specifications:
 * 1. Does NOT use uploaded textbooks or AI-generated questions.
 * 2. Does NOT maintain an offline fallback question cache for V1 MVP.
 * 3. Returns a user-friendly error state with retry indicators if endpoints fail or time out.
 * 
 * API Docs: https://questions.aloc.com.ng / https://github.com/Seunope/aloc-endpoints
 */

export const SUPPORTED_ALOC_SUBJECTS = [
  { key: 'english', label: 'English Language', iconName: 'BookText', color: 'blue' },
  { key: 'mathematics', label: 'Mathematics', iconName: 'Calculator', color: 'indigo' },
  { key: 'physics', label: 'Physics', iconName: 'Atom', color: 'amber' },
  { key: 'chemistry', label: 'Chemistry', iconName: 'FlaskConical', color: 'purple' },
  { key: 'biology', label: 'Biology', iconName: 'Dna', color: 'emerald' },
  { key: 'economics', label: 'Economics', iconName: 'TrendingUp', color: 'yellow' },
  { key: 'government', label: 'Government', iconName: 'Landmark', color: 'rose' },
  { key: 'english-literature', label: 'Literature in English', iconName: 'Feather', color: 'cyan' },
  { key: 'geography', label: 'Geography', iconName: 'Globe', color: 'teal' },
  { key: 'commerce', label: 'Commerce', iconName: 'Briefcase', color: 'sky' },
  { key: 'accounting', label: 'Principles of Accounts', iconName: 'FileSpreadsheet', color: 'violet' },
  { key: 'history', label: 'History', iconName: 'Hourglass', color: 'orange' }
];

class AlocService {
  constructor() {
    this.accessToken = import.meta.env.VITE_ALOC_ACCESS_TOKEN || 'QB-40d6e6ab6e66e745f470';
    this.baseEndpoint = 'https://questions.aloc.com.ng/api/v2/m';
  }

  /**
   * Map StudyBuddy display subject names to valid ALOC API subject parameters.
   * @param {string} subjectInput 
   * @returns {string} Valid ALOC subject parameter
   */
  getSubjectKey(subjectInput = '') {
    const clean = subjectInput.toLowerCase().trim();
    if (clean.includes('lit')) return 'english-literature';
    if (clean.includes('eng')) return 'english';
    if (clean.includes('math')) return 'mathematics';
    if (clean.includes('account')) return 'accounting';
    if (clean.includes('gov')) return 'government';
    if (clean.includes('econ')) return 'economics';
    if (clean.includes('phys')) return 'physics';
    if (clean.includes('chem')) return 'chemistry';
    if (clean.includes('bio')) return 'biology';
    if (clean.includes('geog')) return 'geography';
    if (clean.includes('commer')) return 'commerce';
    if (clean.includes('hist')) return 'history';
    return clean || 'english';
  }

  /**
   * Fetch live verified UTME past questions from ALOC endpoints.
   * @param {Object} options - { subject, count }
   * @returns {Promise<{ success: boolean, questions?: Array<Object>, error?: string }>}
   */
  async fetchPracticeQuestions({ subject = 'english', count = 10 } = {}) {
    const alocSubject = this.getSubjectKey(subject);
    // ALOC multiple endpoint accepts up to 40 items per batch call
    const fetchCount = Math.min(40, Math.max(1, parseInt(count, 10) || 10));
    const url = `${this.baseEndpoint}?subject=${alocSubject}&type=utme&limit=${fetchCount}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 14000); // 14s timeout for CBT reliability

    try {
      console.log(`[AlocService] Fetching ${fetchCount} JAMB UTME questions for subject: ${alocSubject}...`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'AccessToken': this.accessToken
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(`[AlocService] API HTTP Error: status ${response.status} (${response.statusText})`);
        return {
          success: false,
          error: "JAMB Practice is temporarily unavailable. Please try again in a few moments."
        };
      }

      const data = await response.json();
      
      // ALOC API returns { status: 200, data: [...] } or { status: 200, data: { ... } } for single
      const items = Array.isArray(data.data) ? data.data : (data.data ? [data.data] : []);

      if (!items || items.length === 0) {
        return {
          success: false,
          error: "JAMB Practice is temporarily unavailable. Please try again in a few moments."
        };
      }

      // Format questions into uniform CBT structures
      const formattedQuestions = items.map((item, idx) => {
        const optionsObj = item.option || {};
        const optionsList = [
          { key: 'a', label: 'A', text: optionsObj.a || optionsObj.A },
          { key: 'b', label: 'B', text: optionsObj.b || optionsObj.B },
          { key: 'c', label: 'C', text: optionsObj.c || optionsObj.C },
          { key: 'd', label: 'D', text: optionsObj.d || optionsObj.D },
        ].filter(opt => Boolean(opt.text));

        return {
          id: item.id || `aloc_${idx + 1}_${Date.now()}`,
          questionNumber: idx + 1,
          questionText: item.question || item.text || 'Question text unavailable.',
          options: optionsList.length >= 2 ? optionsList : [
            { key: 'a', label: 'A', text: 'True' },
            { key: 'b', label: 'B', text: 'False' }
          ],
          correctAnswerKey: (item.answer || 'a').toLowerCase().trim(),
          solution: item.solution || item.explanation || null,
          examYear: item.examyear || item.year || 'Past Question',
          subjectLabel: item.subject || subject,
          imageUrl: item.image || null,
        };
      });

      return {
        success: true,
        questions: formattedQuestions.slice(0, fetchCount)
      };

    } catch (err) {
      clearTimeout(timeoutId);
      console.warn('[AlocService] Fetch failed or timed out:', err);
      return {
        success: false,
        error: "JAMB Practice is temporarily unavailable. Please try again in a few moments."
      };
    }
  }
}

export const alocService = new AlocService();
export default alocService;
