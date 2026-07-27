// Re-export the hook from SpeechContext so existing imports in
// LessonPanel.jsx and SummaryPanel.jsx keep working without changes.
export { useSpeech as default } from '../contexts/SpeechContext';
