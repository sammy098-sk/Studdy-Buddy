import React, { useState, useEffect } from 'react';
import { ChevronLeft, Loader2, Volume2, VolumeX, Pause, Play } from 'lucide-react';
import { callClaude, parseJsonLoose } from '../utils/api';
import { STUDYBUDDY_PERSONA } from '../config';
import useSpeech from '../hooks/useSpeech';

export default function SummaryPanel({ subject, topic, onBack }) {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);
  const { speak, pause, resume, stop, speaking, paused, loading: ttsLoading } = useSpeech();

  useEffect(() => {
    let cancelled = false;
    setSummary(null);
    setError(null);
    (async () => {
      try {
        const raw = await callClaude(
          STUDYBUDDY_PERSONA + `\n\n### Task\nSummarize the given JAMB topic for fast revision. Break it into its natural subtopics, and under each subtopic give 3-6 short, punchy key-point bullets — the kind of thing a student reads the night before the exam. No long sentences, no repetition, just the essential facts, formulas, or ideas.\n\nRespond ONLY with valid JSON in this exact schema, no prose outside it:\n{"subtopics": [{"name": "string", "points": ["string", "string"]}]}`,
          [{ role: "user", content: `Subject: ${subject}\nTopic: ${topic}` }],
          1400
        );
        const parsed = parseJsonLoose(raw);
        if (!cancelled) setSummary(parsed);
      } catch (e) {
        if (!cancelled) setError("Couldn't load this summary — check your connection and try again.");
      }
    })();
    return () => { cancelled = true; };
  }, [subject, topic]);

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6">
      <div className="max-w-2xl mx-auto">
        <button onClick={onBack} className="flex items-center gap-1 text-sm mb-5" style={{ color: "#5A6B8C" }}>
          <ChevronLeft size={16} /> {subject} topics
        </button>

        {!summary && !error && (
          <div className="flex items-center gap-2 text-sm py-10 justify-center" style={{ color: "#8493B0" }}>
            <Loader2 size={16} className="animate-spin" /> Condensing this topic...
          </div>
        )}

        {error && <div className="text-sm px-4 py-3 rounded-lg" style={{ background: "#FEF2F2", color: "#B91C1C" }}>{error}</div>}

        {summary && (
          <>
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md" style={{ background: "#E8F1FE" }}>
                <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "#2954E5", fontFamily: "'IBM Plex Mono', monospace" }}>
                  Summary
                </span>
              </div>

              {/* ── LISTEN CONTROLS ── */}
              <div className="flex items-center gap-1">
                {!speaking && (
                  <button
                    onClick={() => {
                      const fullText = (summary.subtopics || []).map(
                        (st) => `${st.name}. ${(st.points || []).join('. ')}`
                      ).join('. ');
                      speak(fullText, { subject, label: `${topic} · Summary` });
                    }}
                    disabled={ttsLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-opacity hover:opacity-80 disabled:opacity-60"
                    style={{ borderColor: "#D8E3F8", color: "#2954E5", background: "#FFFFFF" }}
                    aria-label="Listen to summary"
                  >
                    {ttsLoading ? <Loader2 size={13} className="animate-spin" /> : <Volume2 size={13} />}
                    {ttsLoading ? 'Loading…' : 'Listen'}
                  </button>
                )}
                {speaking && !paused && (
                  <button
                    onClick={pause}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-opacity hover:opacity-80"
                    style={{ borderColor: "#D8E3F8", color: "#2954E5", background: "#FFFFFF" }}
                    aria-label="Pause"
                  >
                    <Pause size={13} /> Pause
                  </button>
                )}
                {speaking && paused && (
                  <button
                    onClick={resume}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-opacity hover:opacity-80"
                    style={{ borderColor: "#D8E3F8", color: "#2954E5", background: "#FFFFFF" }}
                    aria-label="Resume"
                  >
                    <Play size={13} /> Resume
                  </button>
                )}
                {speaking && (
                  <button
                    onClick={stop}
                    className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-semibold border transition-opacity hover:opacity-80"
                    style={{ borderColor: "#FECACA", color: "#B91C1C", background: "#FEF2F2" }}
                    aria-label="Stop"
                  >
                    <VolumeX size={13} />
                  </button>
                )}
              </div>
            </div>
            <h2 className="text-2xl font-semibold mb-6" style={{ color: "#101C34", fontFamily: "'Montserrat', sans-serif" }}>
              {topic}
            </h2>

            <div className="flex flex-col gap-4">
              {(summary.subtopics || []).map((st, idx) => (
                <div key={idx} className="rounded-2xl border p-5" style={{ borderColor: "#D8E3F8", background: "#FFFFFF" }}>
                  <h3 className="text-[15px] font-semibold mb-3" style={{ color: "#101C34" }}>{st.name}</h3>
                  <ul className="flex flex-col gap-2">
                    {(st.points || []).map((pt, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm" style={{ color: "#2B3A55" }}>
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "#2954E5" }} />
                        {pt}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
