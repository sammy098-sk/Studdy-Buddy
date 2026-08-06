import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Send, Bot, MessageCircle, ChevronLeft, Loader2, ArrowRight } from 'lucide-react';
import { supabase } from '../supabase';
import { getAIProvider } from '../services/ai/AIProviderFactory';
import AnimatedSuggestions from './AnimatedSuggestions';

export default function FullAITutorPage({ user, onNavigate }) {
  const navigate = useNavigate();
  const location = useLocation();
  const initialTopic = location.state?.topic || 'General Study';

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [chips, setChips] = useState([]);
  const [chipsLoading, setChipsLoading] = useState(false);
  const [topic, setTopic] = useState(initialTopic);

  const scrollRef = useRef(null);

  // Load user sessions for sidebar
  useEffect(() => {
    if (!user?.id) return;
    const fetchSessions = async () => {
      const { data, error } = await supabase
        .from('study_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (!error && data) {
        setSessions(data);
      }
    };
    fetchSessions();
  }, [user]);

  // Create a new session on load if state was passed in
  useEffect(() => {
    if (!user?.id) return;
    const initSession = async () => {
      if (location.state?.topic && !currentSessionId) {
        // Create new session for this topic
        const { data } = await supabase
          .from('study_sessions')
          .insert({ user_id: user.id, topic: location.state.topic, mode: 'chat' })
          .select()
          .single();
        
        if (data) {
          setCurrentSessionId(data.id);
          setSessions(prev => [data, ...prev]);
          setMessages([{ role: 'assistant', content: `Hi there! I'm ready to help you with ${location.state.topic}. What would you like to know?` }]);
          fetchChips(location.state.topic, []);
        }
      }
    };
    initSession();
  }, [location.state, user]);

  // Load messages when switching sessions
  const loadSession = async (session) => {
    setCurrentSessionId(session.id);
    setTopic(session.topic || 'General Study');
    setSidebarOpen(false);
    
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('session_id', session.id)
      .order('created_at', { ascending: true });
    
    if (data && data.length > 0) {
      setMessages(data);
      fetchChips(session.topic, data);
    } else {
      setMessages([{ role: 'assistant', content: `Hi there! Let's talk about ${session.topic}. What's on your mind?` }]);
      fetchChips(session.topic, []);
    }
  };

  const fetchChips = async (currentTopic, chatHistory) => {
    setChipsLoading(true);
    setChips([]);
    try {
      const ai = getAIProvider();
      const newChips = await ai.generateFollowUpChips({ topic: currentTopic, chatHistory });
      setChips(newChips);
    } catch (err) {
      console.error('Failed to generate chips', err);
    } finally {
      setChipsLoading(false);
    }
  };

  const scrollToBottom = () => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, chips]);

  const handleSend = async (overrideText) => {
    const text = (overrideText || input).trim();
    if (!text || loading || !currentSessionId) return;

    const userMsg = { role: 'user', content: text, session_id: currentSessionId };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setChips([]);

    // Save user message to DB
    await supabase.from('messages').insert(userMsg);

    try {
      const ai = getAIProvider();
      const replyText = await ai.chatAboutTopic({
        topic,
        userMessage: text,
        chatHistory: messages
      });

      const assistantMsg = { role: 'assistant', content: replyText, session_id: currentSessionId };
      setMessages(prev => [...prev, assistantMsg]);
      await supabase.from('messages').insert(assistantMsg);

      // Fetch new chips after reply
      fetchChips(topic, [...messages, userMsg, assistantMsg]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I had trouble connecting. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-white font-sans overflow-hidden">
      {/* Sidebar Navigation */}
      <div className={`fixed inset-y-0 left-0 z-40 w-72 bg-slate-50 border-r border-slate-200 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 ease-in-out flex flex-col`}>
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <button onClick={() => navigate('/study')} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors">
            <ChevronLeft size={18} />
            <span className="font-semibold text-sm tracking-wide">Back to Dashboard</span>
          </button>
          <button className="md:hidden p-2 text-slate-500" onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 px-2">Chat History</h3>
          {sessions.map(session => (
            <button
              key={session.id}
              onClick={() => loadSession(session)}
              className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center gap-3 ${currentSessionId === session.id ? 'bg-blue-50 border border-blue-200 text-blue-700' : 'bg-transparent border border-transparent hover:bg-slate-100 text-slate-600'}`}
            >
              <MessageCircle size={16} className={currentSessionId === session.id ? 'text-blue-600' : 'text-slate-400'} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{session.topic || 'Study Session'}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">{new Date(session.created_at).toLocaleDateString()}</div>
              </div>
            </button>
          ))}
          {sessions.length === 0 && (
            <div className="text-sm text-slate-400 px-2 italic">No previous chats found.</div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col md:ml-72 min-w-0 relative h-full">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-4 sm:px-6 bg-white/80 backdrop-blur-md border-b border-slate-200/60 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button className="md:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-lg" onClick={() => setSidebarOpen(true)}>
              <Menu size={20} />
            </button>
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-emerald-600 mb-0.5">
                <Bot size={13} />
                Ask StudyBuddy
              </div>
              <h2 className="text-[15px] font-bold text-slate-900 truncate">Concept: {topic}</h2>
            </div>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10 pb-32 space-y-6">
          {!currentSessionId && (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <Bot size={48} className="mb-4 text-slate-200" />
              <p className="text-lg font-medium">Select a session from the sidebar or start a new topic.</p>
            </div>
          )}
          
          {messages.map((m, idx) => (
            <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[90%] sm:max-w-[75%] rounded-2xl px-5 py-3.5 shadow-sm text-[15px] leading-relaxed whitespace-pre-wrap ${m.role === 'user' ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-white border border-slate-200/80 text-slate-800 rounded-bl-sm'}`}>
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white border border-slate-200/80 rounded-2xl rounded-bl-sm px-5 py-4 shadow-sm flex items-center gap-3 text-slate-500 text-[15px] font-medium">
                <Loader2 size={18} className="animate-spin text-emerald-600" />
                StudyBuddy is typing...
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>

        {/* Input Area (Pinned to Bottom) */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white to-transparent pt-10 pb-4 px-4 sm:px-6 z-20">
          <div className="max-w-4xl mx-auto flex flex-col gap-3">
            {/* Animated Chips */}
            {chips.length > 0 && (
              <AnimatedSuggestions suggestions={chips} onSelect={(t) => handleSend(t)} />
            )}
            
            <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="relative flex items-end gap-2 bg-white rounded-2xl border shadow-sm border-slate-300 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all p-1.5">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Ask a follow-up question..."
                className="flex-1 max-h-32 min-h-[44px] bg-transparent resize-none outline-none py-2.5 px-4 text-[15px] text-slate-800 placeholder:text-slate-400"
                rows="1"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors"
              >
                <Send size={18} className="ml-0.5" />
              </button>
            </form>
          </div>
        </div>
      </div>
      
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-30 md:hidden animate-fade-in" onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  );
}
