import React from 'react';
import { Volume2, Pause, Play, X } from 'lucide-react';
import { useSpeech } from '../contexts/SpeechContext';

/**
 * NowPlayingBar — floats at the very bottom of the screen whenever
 * audio is playing (or paused). Lets the user control playback from
 * any page without interrupting navigation.
 */
export default function NowPlayingBar() {
  const { speaking, paused, loading, trackInfo, pause, resume, stop } = useSpeech();

  if (!speaking && !paused && !loading) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center gap-3 px-4 py-3"
      style={{
        background: 'linear-gradient(135deg, #1a3dbf 0%, #2954E5 100%)',
        boxShadow: '0 -4px 24px -4px rgba(41,84,229,0.35)',
      }}
    >
      {/* Animated sound icon */}
      <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.15)' }}>
        <Volume2 size={15} color="#FFFFFF" className={speaking && !paused ? 'animate-pulse' : ''} />
      </div>

      {/* Track info */}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-white truncate">
          {trackInfo?.label || 'Now Playing'}
        </p>
        {trackInfo?.subject && (
          <p className="text-[11px] truncate" style={{ color: 'rgba(255,255,255,0.65)' }}>
            {trackInfo.subject}
          </p>
        )}
        {loading && (
          <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.65)' }}>
            Loading audio…
          </p>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Play / Pause toggle */}
        {speaking && !paused && (
          <button
            onClick={pause}
            aria-label="Pause"
            className="w-8 h-8 flex items-center justify-center rounded-full transition-opacity hover:opacity-80"
            style={{ background: 'rgba(255,255,255,0.18)' }}
          >
            <Pause size={15} color="#FFFFFF" />
          </button>
        )}
        {paused && (
          <button
            onClick={resume}
            aria-label="Resume"
            className="w-8 h-8 flex items-center justify-center rounded-full transition-opacity hover:opacity-80"
            style={{ background: 'rgba(255,255,255,0.18)' }}
          >
            <Play size={15} color="#FFFFFF" />
          </button>
        )}

        {/* Stop / close */}
        <button
          onClick={stop}
          aria-label="Stop"
          className="w-8 h-8 flex items-center justify-center rounded-full transition-opacity hover:opacity-80"
          style={{ background: 'rgba(255,255,255,0.12)' }}
        >
          <X size={15} color="#FFFFFF" />
        </button>
      </div>
    </div>
  );
}
