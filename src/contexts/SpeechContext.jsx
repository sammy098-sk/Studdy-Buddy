import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '../supabase';

const SpeechContext = createContext(null);

export function SpeechProvider({ children }) {
  const [speaking,  setSpeaking]  = useState(false);
  const [paused,    setPaused]    = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [trackInfo, setTrackInfo] = useState(null); // { subject, label }

  const audioRef   = useRef(null);
  const objectUrl  = useRef(null);

  // Revoke old blob URL and destroy audio element
  const _destroy = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
      audioRef.current     = null;
    }
    if (objectUrl.current) {
      URL.revokeObjectURL(objectUrl.current);
      objectUrl.current = null;
    }
    setSpeaking(false);
    setPaused(false);
  }, []);

  // Browser TTS fallback
  const _speakBrowser = useCallback((text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance    = new SpeechSynthesisUtterance(text);
    utterance.rate     = 0.92;
    const voices       = window.speechSynthesis.getVoices();
    const preferred    = voices.find((v) => v.lang.startsWith('en')) || null;
    if (preferred) utterance.voice = preferred;
    utterance.onstart  = () => { setSpeaking(true);  setPaused(false); };
    utterance.onend    = () => { setSpeaking(false);  setPaused(false); };
    utterance.onerror  = () => { setSpeaking(false);  setPaused(false); };
    utterance.onpause  = () => setPaused(true);
    utterance.onresume = () => setPaused(false);
    window.speechSynthesis.speak(utterance);
  }, []);

  /**
   * speak(text, { subject, label, voice })
   *   subject — e.g. "Mathematics"
   *   label   — e.g. "Quadratic Equations – Full Textbook"
   *   voice   — OpenAI voice name (default 'nova')
   */
  const speak = useCallback(async (text, { subject = '', label = '', voice = 'nova' } = {}) => {
    if (!text) return;
    _destroy();
    setLoading(true);
    setTrackInfo({ subject, label });

    try {
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: { text, voice },
        responseType: 'arraybuffer',
      });

      if (error || !data) throw new Error(error?.message || 'No data');

      const blob = new Blob([data], { type: 'audio/mpeg' });
      const url  = URL.createObjectURL(blob);
      objectUrl.current = url;

      const audio = new Audio(url);
      audioRef.current  = audio;

      // Keep audio alive even when browser is backgrounded
      audio.preload = 'auto';

      audio.onplay   = () => { setSpeaking(true);  setPaused(false); };
      audio.onpause  = () => { if (!audio.ended) setPaused(true); };
      audio.onended  = () => { setSpeaking(false);  setPaused(false);  setTrackInfo(null); _destroy(); };
      audio.onerror  = () => { setSpeaking(false);  setPaused(false); };

      await audio.play();
    } catch (err) {
      console.warn('[SpeechContext] Edge Function failed, using browser TTS:', err.message);
      _speakBrowser(text);
    } finally {
      setLoading(false);
    }
  }, [_destroy, _speakBrowser]);

  const pause  = useCallback(() => {
    if (audioRef.current) { audioRef.current.pause(); setPaused(true); }
    else window.speechSynthesis?.pause();
  }, []);

  const resume = useCallback(() => {
    if (audioRef.current) { audioRef.current.play(); setPaused(false); }
    else window.speechSynthesis?.resume();
  }, []);

  const stop = useCallback(() => {
    _destroy();
    window.speechSynthesis?.cancel();
    setTrackInfo(null);
  }, [_destroy]);

  // Global cleanup on page unload
  useEffect(() => {
    const handler = () => stop();
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [stop]);

  return (
    <SpeechContext.Provider value={{ speak, pause, resume, stop, speaking, paused, loading, trackInfo }}>
      {children}
    </SpeechContext.Provider>
  );
}

export function useSpeech() {
  const ctx = useContext(SpeechContext);
  if (!ctx) throw new Error('useSpeech must be used inside <SpeechProvider>');
  return ctx;
}
