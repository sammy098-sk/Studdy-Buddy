import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

const DEFAULT_PREFS = {
  daily: true,
  new_topics: true,
  weekly_progress: false,
  question_of_day: false,
};

const KEY_TO_COLUMN = {
  daily: 'daily',
  newTopics: 'new_topics',
  weeklyProgress: 'weekly_progress',
  questionOfDay: 'question_of_day',
};

const mapDbToState = (row) => ({
  daily: row && typeof row.daily === 'boolean' ? row.daily : DEFAULT_PREFS.daily,
  newTopics: row && typeof row.new_topics === 'boolean' ? row.new_topics : DEFAULT_PREFS.new_topics,
  weeklyProgress: row && typeof row.weekly_progress === 'boolean' ? row.weekly_progress : DEFAULT_PREFS.weekly_progress,
  questionOfDay: row && typeof row.question_of_day === 'boolean' ? row.question_of_day : DEFAULT_PREFS.question_of_day,
});

/**
 * Reusable Custom Hook / Service for managing persistent user notification preferences.
 * Handles database loading, initial row creation, optimistic UI updates, and error rollback.
 */
export default function useNotificationPreferences(userId) {
  const [preferences, setPreferences] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) {
      // If user is not yet authenticated or provided, finish loading with null/defaults
      setPreferences(mapDbToState(null));
      setLoading(false);
      return;
    }

    let isMounted = true;

    async function fetchOrCreatePreferences() {
      setLoading(true);
      setError(null);

      try {
        // 1. Fetch logged-in user's preference row
        const { data: existingRow, error: fetchError } = await supabase
          .from('notification_preferences')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (fetchError) {
          console.warn('Failed to fetch from notification_preferences (table may require migration):', fetchError);
          throw fetchError;
        }

        if (existingRow) {
          // Initialize toggle states from database
          if (isMounted) {
            setPreferences(mapDbToState(existingRow));
          }
        } else {
          // 2. If no row exists, create one using default values via safe UPSERT
          const newRowPayload = {
            user_id: userId,
            ...DEFAULT_PREFS,
          };

          const { data: createdRow, error: insertError } = await supabase
            .from('notification_preferences')
            .upsert(newRowPayload, { onConflict: 'user_id' })
            .select('*')
            .single();

          if (insertError) {
            console.warn('Failed to insert initial notification_preferences row:', insertError);
            if (isMounted) {
              setPreferences(mapDbToState(null)); // Graceful fallback if table not migrated yet
              setError(insertError.message);
            }
          } else if (isMounted) {
            // Initialize UI from the newly created row in database
            setPreferences(mapDbToState(createdRow || newRowPayload));
          }
        }
      } catch (err) {
        console.error('Error in notification preferences service:', err);
        if (isMounted) {
          setPreferences(mapDbToState(null));
          setError(err.message || 'Failed to load notification preferences');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchOrCreatePreferences();
    return () => { isMounted = false; };
  }, [userId]);

  /**
   * Optimistically toggle a preference and sync via background UPSERT.
   * Rolls back UI and triggers error toast if DB saving fails.
   *
   * @param {string} key - React state key ('daily', 'newTopics', etc.)
   * @param {string} label - Display name for toasts
   * @param {function} onToast - Callback(msg, isError) to update UI toast
   */
  const togglePreference = async (key, label, onToast = () => {}) => {
    if (!preferences || loading) return;

    const previousValue = preferences[key];
    const nextValue = !previousValue;
    const dbColumn = KEY_TO_COLUMN[key];

    // 1. Immediate optimistic update to local UI state & trigger success toast
    setPreferences((prev) => ({ ...prev, [key]: nextValue }));
    onToast(`${label} turned ${nextValue ? "on" : "off"}`, false);

    if (!userId || !dbColumn) {
      console.warn('Cannot persist preference change: user unauthenticated or invalid key.');
      return;
    }

    // 2. Background UPSERT updating ONLY the modified column while preserving all others
    try {
      const { error: dbError } = await supabase
        .from('notification_preferences')
        .upsert(
          { 
            user_id: userId,
            [dbColumn]: nextValue,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'user_id' }
        );

      if (dbError) {
        throw dbError;
      }
    } catch (err) {
      console.error(`Database synchronization failed for preference [${key}]:`, err);

      // 3. Error handling with rollback: revert toggle state so UI matches database & trigger error toast
      setPreferences((prev) => ({ ...prev, [key]: previousValue }));
      onToast(`Failed to save "${label}". Reverting change.`, true);
    }
  };

  return {
    preferences,
    loading,
    error,
    togglePreference,
  };
}
