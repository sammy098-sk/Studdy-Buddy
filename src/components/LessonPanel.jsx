import React, { useState, useEffect } from 'react';
import { ChevronLeft, Loader2, CheckCircle2, MessageCircle, Volume2, VolumeX, Pause, Play } from 'lucide-react';
import { callClaude, parseJsonLoose } from '../utils/api';
import { STUDYBUDDY_PERSONA } from '../config';
import useSpeech from '../hooks/useSpeech';

export default function LessonPanel({ subject, topic, subsection, onBack, onComplete, onDiscuss }) {
  const [lesson, setLesson] = useState(null);
  const [error, setError] = useState(null);
  const [answers, setAnswers] = useState({});
  const { speak, pause, resume, stop, speaking, paused, loading: ttsLoading } = useSpeech();

  useEffect(() => {
    let cancelled = false;
    setLesson(null);
    setError(null);
    setAnswers({});
    (async () => {
      try {
        const raw = await callClaude(
          STUDYBUDDY_PERSONA + `\n\n### Task\nWrite a FULL, comprehensive textbook-style explanation of the given subsection — the depth and completeness of a standard JAMB-recommended textbook (in the spirit of texts like "New School Chemistry" or "Exam Focus" series for the relevant subject), written entirely in your own words. Do NOT summarize or abbreviate — cover definitions, full reasoning/derivations where relevant, worked examples with steps shown, common misconceptions, and how JAMB typically tests this specific subsection. Aim for roughly 500-800 words, organized into clear short paragraphs (use line breaks between ideas, not one giant block). Then write exactly 3 check-your-understanding questions testing this specific subsection, ordered easy to harder.\n\nRespond ONLY with valid JSON in this exact schema, no prose outside it:\n{"explanation": "string", "questions": ["string", "string", "string"]}`,
          [{ role: "user", content: `Subject: ${subject}\nTopic: ${topic}\nSubsection: ${subsection}` }],
          2000
        );
        const parsed = parseJsonLoose(raw);
        if (!cancelled) setLesson(parsed);
      } catch (e) {
        if (!cancelled) setError("Couldn't load this lesson — check your connection and try again.");
      }
    })();
    return () => { cancelled = true; };
  }, [subject, topic, subsection]);

  const updateAnswer = (idx, field, value) => {
    setAnswers((prev) => ({ ...prev, [idx]: { ...prev[idx], [field]: value } }));
  };

  const checkAnswer = async (idx, question) => {
    const studentAnswer = (answers[idx]?.text || "").trim();
    if (!studentAnswer) return;
    updateAnswer(idx, "checking", true);
    try {
      const feedback = await callClaude(
        STUDYBUDDY_PERSONA + `\n\n### Task\nA student just answered a check-understanding question. Give brief (2-3 sentences), peer-tone feedback: say whether they're right, partly right, or off track, and why. If wrong, guide them toward the right idea without just stating the answer outright first.`,
        [{ role: "user", content: `Subsection: ${subsection}\nQuestion: ${question}\nStudent's answer: ${studentAnswer}` }],
        300
      );
      updateAnswer(idx, "feedback", feedback);
    } catch (e) {
      updateAnswer(idx, "feedback", "Couldn't check that just now — try again in a moment.");
    } finally {
      updateAnswer(idx, "checking", false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6">
      <div className="max-w-2xl mx-auto">
        <button onClick={onBack} className="flex items-center gap-1 text-sm mb-5" style={{ color: "#5A6B8C" }}>
          <ChevronLeft size={16} /> {topic}
        </button>

        {!lesson && !error && (
          <div className="flex items-center gap-2 text-sm py-10 justify-center" style={{ color: "#8493B0" }}>
            <Loader2 size={16} className="animate-spin" /> Preparing your lesson...
          </div>
        )}

        {error && <div className="text-sm px-4 py-3 rounded-lg" style={{ background: "#FEF2F2", color: "#B91C1C" }}>{error}</div>}

        {lesson && (
          <>
            <div className="rounded-2xl border overflow-hidden mb-6" style={{ borderColor: "#D8E3F8", background: "#FFFFFF" }}>
              <div className="px-5 py-2.5 flex items-center justify-between" style={{ background: "#2954E5" }}>
                <span className="text-[11px] font-semibold uppercase tracking-wide text-white" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                  Full Textbook · {subject}
                </span>

                {/* ── LISTEN CONTROLS ── */}
                <div className="flex items-center gap-1">
                  {!speaking && (
                    <button
                      onClick={() => speak(lesson.explanation, { subject, label: `${subsection} · Textbook` })}
                      disabled={ttsLoading}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-opacity hover:opacity-80 disabled:opacity-60"
                      style={{ background: "rgba(255,255,255,0.18)", color: "#FFFFFF" }}
                      aria-label="Listen to lesson"
                    >
                      {ttsLoading ? <Loader2 size={13} className="animate-spin" /> : <Volume2 size={13} />}
                      {ttsLoading ? 'Loading…' : 'Listen'}
                    </button>
                  )}
                  {speaking && !paused && (
                    <button
                      onClick={pause}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-opacity hover:opacity-80"
                      style={{ background: "rgba(255,255,255,0.18)", color: "#FFFFFF" }}
                      aria-label="Pause"
                    >
                      <Pause size={13} /> Pause
                    </button>
                  )}
                  {speaking && paused && (
                    <button
                      onClick={resume}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-opacity hover:opacity-80"
                      style={{ background: "rgba(255,255,255,0.18)", color: "#FFFFFF" }}
                      aria-label="Resume"
                    >
                      <Play size={13} /> Resume
                    </button>
                  )}
                  {speaking && (
                    <button
                      onClick={stop}
                      className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-semibold transition-opacity hover:opacity-80"
                      style={{ background: "rgba(255,255,255,0.14)", color: "#FFFFFF" }}
                      aria-label="Stop"
                    >
                      <VolumeX size={13} />
                    </button>
                  )}
                </div>
              </div>
              <div className="p-6 border-l-4" style={{ borderColor: "#2954E5" }}>
                <h2 className="text-xl font-semibold mb-4" style={{ color: "#101C34", fontFamily: "'Montserrat', sans-serif" }}>
                  {subsection}
                </h2>
                <p className="text-[15px] leading-relaxed whitespace-pre-wrap" style={{ color: "#2B3A55" }}>
                  {lesson.explanation}
                </p>
              </div>
            </div>

            <h3 className="text-sm font-semibold uppercase tracking-wide mb-3" style={{ color: "#8493B0", fontFamily: "'IBM Plex Mono', monospace" }}>
              Check your understanding
            </h3>

            <div className="flex flex-col gap-4 mb-8">
              {(lesson.questions || []).map((q, idx) => (
                <div key={idx} className="rounded-xl border p-4" style={{ borderColor: "#D8E3F8", background: "#FAFBFF" }}>
                  <p className="text-[14px] font-medium mb-3" style={{ color: "#101C34" }}>
                    {idx + 1}. {q}
                  </p>
                  <div className="flex items-end gap-2">
                    <textarea
                      rows={1}
                      value={answers[idx]?.text || ""}
                      onChange={(e) => updateAnswer(idx, "text", e.target.value)}
                      placeholder="Type your answer..."
                      className="flex-1 resize-none px-3 py-2 rounded-lg text-sm outline-none border"
                      style={{ borderColor: "#D8E3F8", color: "#101C34", background: "#FFFFFF" }}
                    />
                    <button
                      onClick={() => checkAnswer(idx, q)}
                      disabled={answers[idx]?.checking || !answers[idx]?.text?.trim()}
                      className="px-3 py-2 rounded-lg text-xs font-medium text-white disabled:opacity-40 shrink-0"
                      style={{ background: "#2954E5" }}
                    >
                      {answers[idx]?.checking ? <Loader2 size={14} className="animate-spin" /> : "Check"}
                    </button>
                  </div>
                  {answers[idx]?.feedback && (
                    <p className="text-sm mt-3 px-3 py-2 rounded-lg" style={{ background: "#E8F1FE", color: "#101C34" }}>
                      {answers[idx].feedback}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={onComplete}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium text-white"
                style={{ background: "#2954E5" }}
              >
                <CheckCircle2 size={16} /> Mark as studied
              </button>
              <button
                onClick={onDiscuss}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium border"
                style={{ borderColor: "#D8E3F8", color: "#2954E5" }}
              >
                <MessageCircle size={16} /> Discuss further in chat
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
