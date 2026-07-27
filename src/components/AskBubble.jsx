import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2, Sparkles } from 'lucide-react';
import { callClaude } from '../utils/api';
import { STUDYBUDDY_PERSONA } from '../config';
import { supabase } from '../supabase';

export default function AskBubble({ subject, topic, sessionId, userId }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  // Auto-scroll on new messages
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Load saved messages for this session when bubble opens
  useEffect(() => {
    if (!open || !sessionId) return;
    const loadMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('role, content')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });
      if (data && data.length > 0) setMessages(data);
    };
    loadMessages();
  }, [open, sessionId]);

  const systemPrompt = STUDYBUDDY_PERSONA + `\n\nThe student is currently studying: **${subject || 'a JAMB subject'}**${topic ? `, specifically the topic **"${topic}"**` : ''}. 
Keep answers relevant to this context. Be concise — this is a quick Q&A bubble, not a lecture. Max 200 words per reply.`;

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: 'user', content: text };
    const updatedMsgs = [...messages, userMsg];
    setMessages(updatedMsgs);
    setInput('');
    setLoading(true);

    // Save user message to DB
    if (sessionId && userId) {
      await supabase.from('messages').insert({
        session_id: sessionId,
        user_id: userId,
        role: 'user',
        content: text,
      });
    }

    try {
      const reply = await callClaude(
        systemPrompt,
        updatedMsgs.map((m) => ({ role: m.role, content: m.content }))
      );
      const assistantMsg = { role: 'assistant', content: reply || 'Hmm, try rephrasing that?' };
      setMessages((prev) => [...prev, assistantMsg]);

      // Save assistant reply to DB
      if (sessionId && userId) {
        await supabase.from('messages').insert({
          session_id: sessionId,
          user_id: userId,
          role: 'assistant',
          content: reply,
        });
      }
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Network issue — try again in a sec.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <>
      {/* ── CHAT DRAWER ─────────────────────────────── */}
      {open && (
        <div
          className="fixed bottom-20 right-4 z-40 flex flex-col rounded-2xl overflow-hidden"
          style={{
            width: 'min(360px, calc(100vw - 32px))',
            height: '420px',
            background: '#FFFFFF',
            boxShadow: '0 12px 40px -8px rgba(41,84,229,0.22)',
            border: '1px solid #D8E3F8',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 shrink-0"
            style={{ background: 'linear-gradient(135deg, #1a3dbf, #2954E5)' }}
          >
            <div className="flex items-center gap-2">
              <Sparkles size={15} color="#FFFFFF" />
              <div>
                <div className="text-[13px] font-semibold text-white">Ask StudyBuddy</div>
                {subject && (
                  <div className="text-[11px] text-blue-200 truncate" style={{ maxWidth: '200px' }}>
                    {topic ? `${subject} › ${topic}` : subject}
                  </div>
                )}
              </div>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close" className="text-white opacity-80 hover:opacity-100">
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2">
            {messages.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center text-center px-4 gap-3">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: '#E8F1FE' }}>
                  <Sparkles size={22} style={{ color: '#2954E5' }} />
                </div>
                <p className="text-sm font-medium" style={{ color: '#101C34' }}>
                  Got a question?
                </p>
                <p className="text-xs" style={{ color: '#8493B0' }}>
                  Ask me anything about {subject || 'this topic'} and I'll explain it clearly.
                </p>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className="px-3 py-2 rounded-xl text-[13px] leading-relaxed whitespace-pre-wrap"
                  style={{
                    maxWidth: '82%',
                    ...(m.role === 'user'
                      ? { background: '#2954E5', color: '#FFFFFF', borderBottomRightRadius: '4px' }
                      : { background: '#F0F4FF', color: '#101C34', borderBottomLeftRadius: '4px' }),
                  }}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="px-3 py-2 rounded-xl flex items-center gap-2 text-[13px]" style={{ background: '#F0F4FF', color: '#8493B0' }}>
                  <Loader2 size={13} className="animate-spin" /> Thinking…
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>

          {/* Input */}
          <div className="shrink-0 px-3 py-2 border-t" style={{ borderColor: '#E3EAFB' }}>
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder={`Ask about ${subject || 'this topic'}…`}
                rows={1}
                className="flex-1 resize-none px-3 py-2 rounded-xl text-[13px] outline-none border"
                style={{ borderColor: '#D8E3F8', color: '#101C34', maxHeight: '80px' }}
              />
              <button
                onClick={send}
                disabled={loading || !input.trim()}
                className="p-2 rounded-xl text-white disabled:opacity-40 shrink-0"
                style={{ background: '#2954E5' }}
                aria-label="Send"
              >
                <Send size={15} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── FLOATING BUTTON ─────────────────────────── */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Ask StudyBuddy"
        className="fixed bottom-5 right-4 z-40 w-13 h-13 flex items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95"
        style={{
          width: '52px',
          height: '52px',
          background: open ? '#1a3dbf' : 'linear-gradient(135deg, #2954E5, #4f46e5)',
          boxShadow: '0 6px 24px -4px rgba(41,84,229,0.45)',
        }}
      >
        {open ? <X size={20} color="#FFFFFF" /> : <MessageCircle size={20} color="#FFFFFF" />}
      </button>
    </>
  );
}
