import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Menu, X, ChevronLeft, Loader2 } from 'lucide-react';
import SubjectsGrid from './SubjectsGrid';
import ModeSelector from './ModeSelector';
import CurriculumPanel from './CurriculumPanel';
import SubsectionsPanel from './SubsectionsPanel';
import LessonPanel from './LessonPanel';
import SummaryPanel from './SummaryPanel';
import QuestionnairePanel from './QuestionnairePanel';
import TextbookReader from './TextbookReader';
import ChatBubble from './ChatBubble';
import AskBubble from './AskBubble';
import { callClaude } from '../utils/api';
import { CHAT_SYSTEM_PROMPT, SUBJECTS } from '../config';
import { supabase } from '../supabase';

export default function ChatView({ completed, setCompleted, onNavigate, user, resumeSession }) {
  const [panel, setPanel] = useState("subjects"); 
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeSubject, setActiveSubject] = useState(null);
  const [activeTopic, setActiveTopic] = useState(null);
  const [activeSubsection, setActiveSubsection] = useState(null);
  const [activeMode, setActiveMode] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const scrollRef = useRef(null);

  // Resume a session passed from SessionsPage
  useEffect(() => {
    if (resumeSession) {
      setActiveSubject(resumeSession.subject);
      setActiveTopic(resumeSession.topic || null);
      setActiveMode(resumeSession.mode || null);
      setCurrentSessionId(resumeSession.id);
      if (resumeSession.topic && resumeSession.mode) {
        if (resumeSession.mode === 'textbook') setPanel('subsections');
        else if (resumeSession.mode === 'summary') setPanel('summary');
        else if (resumeSession.mode === 'questionnaire') setPanel('quiz');
      } else if (resumeSession.subject) {
        setPanel('modes');
      }
    }
  }, [resumeSession]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Create a new session row when user picks a topic + mode
  const createSession = useCallback(async (subject, topic, mode) => {
    if (!user?.id) return null;
    // Close out previous session first
    if (currentSessionId) {
      await supabase.from('study_sessions').update({ ended_at: new Date().toISOString() }).eq('id', currentSessionId);
    }
    const { data } = await supabase.from('study_sessions').insert({
      user_id: user.id,
      subject,
      topic,
      mode,
    }).select().single();
    setCurrentSessionId(data?.id || null);
    return data?.id || null;
  }, [user, currentSessionId]);

  // End session on unmount
  useEffect(() => {
    return () => {
      if (currentSessionId) {
        supabase.from('study_sessions').update({ ended_at: new Date().toISOString() }).eq('id', currentSessionId);
      }
    };
  }, [currentSessionId]);

  const openSubject = (subject) => {
    setActiveSubject(subject);
    setActiveTopic(null);
    setActiveMode(null);
    setPanel("modes");
    setSidebarOpen(false);
  };

  const pickMode = (mode) => {
    setActiveMode(mode);
    if (mode === "reader") setPanel("reader");
    else setPanel("curriculum");
  };

  const openTopic = async (topic) => {
    setActiveTopic(topic);
    await createSession(activeSubject, topic, activeMode);
    if (activeMode === "textbook") setPanel("subsections");
    else if (activeMode === "summary") setPanel("summary");
    else if (activeMode === "questionnaire") setPanel("quiz");
  };

  const openSubsection = (sub) => {
    setActiveSubsection(sub);
    setPanel("lesson");
  };

  const markComplete = async () => {
    const label = `textbook > ${activeSubject} > ${activeTopic} > ${activeSubsection}`;
    if (!completed.includes(label)) {
      setCompleted((prev) => [...prev, label]);
      if (user?.id) {
        await supabase.from('study_progress').insert({ user_id: user.id, topic_label: label });
      }
    }
    setPanel("subsections");
  };

  const discussInChat = () => {
    setMessages([
      {
        role: "assistant",
        content: `Nice, you just went through "${activeSubsection}" under ${topicLabel()}. What's on your mind about it — want a past question to try, or something still unclear?`,
        subject: activeSubject,
        topic: activeTopic,
      },
    ]);
    setPanel("chat");
  };

  const topicLabel = () => `${activeTopic} (${activeSubject})`;

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const newMessages = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    try {
      const reply = await callClaude(
        CHAT_SYSTEM_PROMPT + (activeSubject ? `\n\nCurrent session context: studying "${activeSubsection || activeTopic}" under "${activeSubject}".` : ""),
        newMessages.map((m) => ({ role: m.role, content: m.content }))
      );
      setMessages((prev) => [...prev, { role: "assistant", content: reply || "Hmm, try that again?", subject: activeSubject, topic: activeTopic }]);
    } catch (e) {
      setMessages((prev) => [...prev, { role: "assistant", content: "Network wahala on my end — mind trying that again?" }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const SidebarContent = () => (
    <>
      <div className="mb-6">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide mb-3" style={{ color: "#8493B0", fontFamily: "'IBM Plex Mono', monospace" }}>
          Subjects
        </h3>
        <div className="flex flex-col gap-1">
          {SUBJECTS.map((s) => (
            <button
              key={s}
              onClick={() => openSubject(s)}
              className="text-left text-sm px-3 py-2 rounded-lg transition-colors"
              style={activeSubject === s ? { background: "#2954E5", color: "#FFFFFF" } : { background: "transparent", color: "#101C34" }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {completed.length > 0 && (
        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-wide mb-3" style={{ color: "#8493B0", fontFamily: "'IBM Plex Mono', monospace" }}>
            Studied this session
          </h3>
          <div className="flex flex-col gap-1.5">
            {completed.map((t) => (
              <div key={t} className="text-xs px-3 py-1.5 rounded-lg" style={{ background: "#F3F7FF", color: "#5A6B8C" }}>
                ✓ {t}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );

  const insideSubject = panel !== "subjects";
  // Show AskBubble on study panels (not on the subjects grid or the legacy deep-chat panel)
  const showAskBubble = insideSubject && panel !== "chat";

  return (
    <div className="flex-1 flex overflow-hidden" style={{ background: "#FAFBFF" }}>
      {insideSubject && (
        <aside className="hidden md:flex md:flex-col w-64 px-4 py-6 overflow-y-auto">
          <SidebarContent />
        </aside>
      )}

      {insideSubject && sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-20 flex">
          <div className="w-72 bg-white px-4 py-6 overflow-y-auto" style={{ borderRight: "1px solid #E3EAFB" }}>
            <button onClick={() => setSidebarOpen(false)} className="mb-4" aria-label="Close sidebar">
              <X size={20} style={{ color: "#101C34" }} />
            </button>
            <SidebarContent />
          </div>
          <div className="flex-1 bg-black/20" onClick={() => setSidebarOpen(false)} />
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        {insideSubject && (
          <div className="md:hidden flex items-center gap-3 px-4 py-3">
            <button onClick={() => setSidebarOpen(true)} aria-label="Open subjects">
              <Menu size={20} style={{ color: "#101C34" }} />
            </button>
            <span className="text-sm font-medium truncate" style={{ color: "#101C34" }}>
              {activeSubsection || activeTopic || activeSubject || "StudyBuddy"}
            </span>
          </div>
        )}

        {panel === "subjects" && <SubjectsGrid onPick={openSubject} onNavigate={onNavigate} user={user} completed={completed} />}

        {panel === "modes" && (
          <ModeSelector subject={activeSubject} onBack={() => setPanel("subjects")} onPickMode={pickMode} />
        )}

        {panel === "reader" && (
          <TextbookReader subject={activeSubject} onNavigate={onNavigate} user={user} />
        )}

        {panel === "curriculum" && (
          <CurriculumPanel subject={activeSubject} mode={activeMode} onBack={() => setPanel("modes")} onPickTopic={openTopic} completedTopics={completed} />
        )}

        {panel === "subsections" && (
          <SubsectionsPanel subject={activeSubject} topic={activeTopic} onBack={() => setPanel("curriculum")} onPickSubsection={openSubsection} completedTopics={completed} />
        )}

        {panel === "lesson" && (
          <LessonPanel
            subject={activeSubject}
            topic={activeTopic}
            subsection={activeSubsection}
            onBack={() => setPanel("subsections")}
            onComplete={markComplete}
            onDiscuss={discussInChat}
          />
        )}

        {panel === "summary" && (
          <SummaryPanel subject={activeSubject} topic={activeTopic} onBack={() => setPanel("curriculum")} />
        )}

        {panel === "quiz" && (
          <QuestionnairePanel subject={activeSubject} topic={activeTopic} onBack={() => setPanel("curriculum")} />
        )}

        {panel === "chat" && (
          <>
            <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6">
              <div className="max-w-2xl mx-auto">
                <button onClick={() => setPanel("subsections")} className="flex items-center gap-1 text-sm mb-4" style={{ color: "#5A6B8C" }}>
                  <ChevronLeft size={16} /> Back to lessons
                </button>

                {messages.map((m, i) => (
                  <ChatBubble key={i} role={m.role} content={m.content} showTicket={m.role === "assistant" && !!m.subject} subject={m.subject} topic={m.topic} />
                ))}
                {loading && (
                  <div className="flex items-center gap-2 text-sm mb-4" style={{ color: "#8493B0" }}>
                    <Loader2 size={15} className="animate-spin" /> StudyBuddy is typing...
                  </div>
                )}
                <div ref={scrollRef} />
              </div>
            </div>

            <div className="px-4 sm:px-8 py-4">
              <div className="max-w-2xl mx-auto flex items-end gap-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about a topic or paste a past question..."
                  rows={1}
                  className="flex-1 resize-none px-4 py-3 rounded-xl text-[15px] outline-none border focus:ring-2"
                  style={{ borderColor: "#D8E3F8", color: "#101C34" }}
                />
                <button
                  onClick={sendMessage}
                  disabled={loading || !input.trim()}
                  className="p-3 rounded-xl text-white disabled:opacity-40 transition-opacity"
                  style={{ background: "#2954E5" }}
                  aria-label="Send message"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Floating AI Ask Bubble — shown on all study panels except the subjects grid */}
      {showAskBubble && (
        <AskBubble
          subject={activeSubject}
          topic={activeTopic}
          sessionId={currentSessionId}
          userId={user?.id}
        />
      )}
    </div>
  );
}
