import { supabase } from '../supabase';

/**
 * ReaderPreferencesService
 * 
 * Reusable hybrid cloud + local persistence layer for Study Buddy reader customizations.
 * - Supabase database (`reader_preferences`) is the authoritative source of truth.
 * - `localStorage` functions strictly as a zero-latency startup cache.
 * - Per-user, per-book isolation ensures zero collision across textbooks or user accounts.
 * - Supports: study_scope, theme, font_size, zoom_level, reading_mode, read_aloud_speed, sidebar_state.
 */
class ReaderPreferencesService {
  constructor() {
    this.memoryCache = new Map();
    this.pendingUpserts = new Map(); // For debounced cloud syncing
  }

  /**
   * Helper to safely format cache keys with user and book isolation.
   */
  #getCacheKey(userId, bookId) {
    const safeUser = userId || 'anon';
    const safeBook = bookId || 'default';
    return `sb_pref_${safeUser}_${safeBook}`;
  }

  /**
   * Safely read from localStorage without crashing in restricted sandbox iframes.
   */
  #readLocalCache(key) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(key);
        if (raw) return JSON.parse(raw);
      }
    } catch (e) {
      console.debug('[ReaderPreferences] localStorage read unavailable or sandboxed:', e.message);
    }
    return this.memoryCache.get(key) || null;
  }

  /**
   * Safely write to localStorage and fallback memory cache.
   */
  #writeLocalCache(key, data) {
    this.memoryCache.set(key, data);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, JSON.stringify(data));
      }
    } catch (e) {
      console.debug('[ReaderPreferences] localStorage write unavailable or sandboxed:', e.message);
    }
  }

  /**
   * Default preferences template.
   */
  getDefaults() {
    return {
      study_scope: 'page', // 'page' | 'chapter' | 'book'
      theme: 'light',
      font_size: 16,
      zoom_level: 1.0,
      reading_mode: 'continuous',
      read_aloud_speed: 1.0,
      sidebar_state: true
    };
  }

  /**
   * Initialize and synchronize reader preferences for a specific book and user.
   * Step 1: Immediately returns cached values for zero-latency UI rendering.
   * Step 2: Asynchronously fetches from Supabase. If cloud row differs, updates cache and invokes onUpdate callback.
   * 
   * @param {Object} params - { userId, bookId, onUpdate }
   * @returns {Object} - Initial (cached or default) preferences
   */
  async initPreferences({ userId, bookId, onUpdate }) {
    const key = this.#getCacheKey(userId, bookId);
    const defaults = this.getDefaults();
    const cached = this.#readLocalCache(key);
    const initialPrefs = { ...defaults, ...(cached || {}) };

    // If no authenticated user, rely entirely on local storage/memory
    if (!userId || !bookId) {
      return initialPrefs;
    }

    // Asynchronously verify with Supabase (Authoritative Source of Truth)
    setTimeout(async () => {
      try {
        const { data: serverPrefs, error } = await supabase
          .from('reader_preferences')
          .select('*')
          .eq('user_id', userId)
          .eq('book_id', bookId)
          .maybeSingle();

        if (error) {
          if (error.code !== 'PGRST116' && !error.message?.includes('does not exist')) {
            console.warn('[ReaderPreferences] Supabase fetch warning:', error.message);
          }
          return;
        }

        if (serverPrefs) {
          // Clean server record to retain relevant fields
          const cleanServer = {
            study_scope: serverPrefs.study_scope ?? initialPrefs.study_scope,
            theme: serverPrefs.theme ?? initialPrefs.theme,
            font_size: serverPrefs.font_size ?? initialPrefs.font_size,
            zoom_level: Number(serverPrefs.zoom_level || initialPrefs.zoom_level),
            reading_mode: serverPrefs.reading_mode ?? initialPrefs.reading_mode,
            read_aloud_speed: Number(serverPrefs.read_aloud_speed || initialPrefs.read_aloud_speed),
            sidebar_state: serverPrefs.sidebar_state ?? initialPrefs.sidebar_state
          };

          // Conflict Resolution: Supabase is authoritative over local browser cache
          const isDifferent = JSON.stringify(cleanServer) !== JSON.stringify(initialPrefs);
          this.#writeLocalCache(key, cleanServer);

          if (isDifferent && typeof onUpdate === 'function') {
            onUpdate(cleanServer);
          }
        } else if (!cached && userId) {
          // No record in cloud yet; seed cloud with initial default/cached state
          this.savePreference({ userId, bookId, updates: initialPrefs });
        }
      } catch (err) {
        console.debug('[ReaderPreferences] Offline or background network verification error:', err.message);
      }
    }, 0);

    return initialPrefs;
  }

  /**
   * Save one or more reader preferences.
   * Immediately updates local cache & UI state, then performs a debounced upsert to Supabase.
   */
  async savePreference({ userId, bookId, key, value, updates = null }) {
    const cacheKey = this.#getCacheKey(userId, bookId);
    const current = this.#readLocalCache(cacheKey) || this.getDefaults();
    
    const newPrefs = updates ? { ...current, ...updates } : { ...current, [key]: value };
    this.#writeLocalCache(cacheKey, newPrefs);

    if (!userId || !bookId) return newPrefs;

    // Debounce cloud upserts to prevent network flood on slider drag (zoom, volume, etc.)
    const debounceKey = `${userId}_${bookId}`;
    if (this.pendingUpserts.has(debounceKey)) {
      clearTimeout(this.pendingUpserts.get(debounceKey));
    }

    const timer = setTimeout(async () => {
      this.pendingUpserts.delete(debounceKey);
      try {
        const payload = {
          user_id: userId,
          book_id: bookId,
          study_scope: newPrefs.study_scope,
          theme: newPrefs.theme,
          font_size: newPrefs.font_size,
          zoom_level: newPrefs.zoom_level,
          reading_mode: newPrefs.reading_mode,
          read_aloud_speed: newPrefs.read_aloud_speed,
          sidebar_state: newPrefs.sidebar_state,
          updated_at: new Date().toISOString()
        };

        const { error } = await supabase
          .from('reader_preferences')
          .upsert(payload, { onConflict: 'user_id,book_id' });

        if (error) {
          console.warn('[ReaderPreferences] Cloud sync failed (offline or uncreated table):', error.message);
        }
      } catch (e) {
        console.debug('[ReaderPreferences] Cloud sync exception:', e.message);
      }
    }, 500);

    this.pendingUpserts.set(debounceKey, timer);
    return newPrefs;
  }

  /**
   * Clear all cached reader preferences for a specific user upon logout.
   * Prevents leaking reading preferences between multiple users on shared devices.
   */
  clearUserCache(userId) {
    if (!userId) return;
    const prefix = `sb_pref_${userId}_`;
    
    // Clear memory cache
    for (const k of this.memoryCache.keys()) {
      if (k.startsWith(prefix)) this.memoryCache.delete(k);
    }

    // Clear localStorage
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const toRemove = [];
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          if (key && key.startsWith(prefix)) {
            toRemove.push(key);
          }
        }
        toRemove.forEach(k => window.localStorage.removeItem(k));
      }
    } catch (e) {
      console.debug('[ReaderPreferences] Error clearing localStorage on logout:', e.message);
    }
  }
}

export const readerPreferencesService = new ReaderPreferencesService();
export default readerPreferencesService;
