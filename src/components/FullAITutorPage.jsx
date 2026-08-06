import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Send, Bot, MessageCircle, ChevronLeft, Loader2, User, Sparkles } from 'lucide-react';
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
    <div className="flex h-screen bg-[#F9FAFB] font-sans overflow-hidden">
      {/* Sidebar Navigation */}
      <div className={`fixed inset-y-0 left-0 z-40 w-72 bg-white border-r border-slate-200/60 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 ease-in-out flex flex-col shadow-xl md:shadow-none`}>
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <button onClick={() => navigate('/study')} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors group">
            <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center group-hover:bg-slate-100 transition-colors">
              <ChevronLeft size={16} strokeWidth={2.5} />
            </div>
            <span className="font-bold text-sm tracking-wide">Dashboard</span>
          </button>
          <button className="md:hidden p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg" onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-1.5">
          <div className="flex items-center gap-2 px-3 mb-4 mt-2">
            <HistoryIcon size={14} className="text-slate-400" />
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Recent Chats</h3>
          </div>
          {sessions.map(session => (
            <button
              key={session.id}
              onClick={() => loadSession(session)}
              className={`w-full text-left px-3.5 py-3 rounded-xl transition-all flex items-start gap-3 ${currentSessionId === session.id ? 'bg-indigo-50 border border-indigo-100/50 text-indigo-900 shadow-sm' : 'bg-transparent border border-transparent hover:bg-slate-50 text-slate-600'}`}
            >
              <MessageCircle size={16} className={`mt-0.5 shrink-0 ${currentSessionId === session.id ? 'text-indigo-600' : 'text-slate-300'}`} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate leading-tight">{session.topic || 'Study Session'}</div>
                <div className="text-[11px] text-slate-400 mt-1 font-medium">{new Date(session.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
              </div>
            </button>
          ))}
          {sessions.length === 0 && (
            <div className="text-sm text-slate-400 px-3 italic">No previous chats found.</div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col md:ml-72 min-w-0 relative h-full bg-[#F9FAFB]">
        {/* Header (Glassmorphism) */}
        <header className="h-16 flex items-center justify-between px-4 sm:px-6 bg-white/70 backdrop-blur-xl border-b border-slate-200/50 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button className="md:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-lg" onClick={() => setSidebarOpen(true)}>
              <Menu size={20} />
            </button>
            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-0.5">
                <Sparkles size={11} className="text-amber-500" />
                AI Tutor
              </div>
              <h2 className="text-[15px] font-extrabold text-slate-900 truncate tracking-tight">{topic}</h2>
            </div>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-20 py-8 pb-40 space-y-8 scroll-smooth">
          {!currentSessionId && (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 fade-in">
              <div className="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mb-6 shadow-sm border border-indigo-100/50">
                <Sparkles size={32} className="text-indigo-400" />
              </div>
              <p className="text-lg font-bold text-slate-700">Ready to learn?</p>
              <p className="text-sm text-slate-500 mt-2">Select a session from the sidebar or start a new topic from the dashboard.</p>
            </div>
          )}
          
          {messages.map((m, idx) => (
            <div key={idx} className={`flex w-full ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex max-w-[85%] sm:max-w-[75%] gap-4 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm mt-1 ${m.role === 'user' ? 'bg-slate-200 text-slate-500' : 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-indigo-200/50'}`}>
                  {m.role === 'user' ? <User size={15} strokeWidth={2.5} /> : <Sparkles size={15} strokeWidth={2.5} />}
                </div>
                
                {/* Bubble */}
                <div className={`px-5 py-3.5 rounded-2xl text-[15px] leading-relaxed shadow-sm font-medium
                  ${m.role === 'user' 
                    ? 'bg-slate-900 text-white rounded-tr-sm' 
                    : 'bg-white border border-slate-100 text-slate-800 rounded-tl-sm shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)]'
                  }`}>
                  {/* Handle line breaks correctly */}
                  {m.content.split('\n').map((line, i) => (
                    <React.Fragment key={i}>
                      {line}
                      {i !== m.content.split('\n').length - 1 && <br />}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          ))}
          
          {loading && (
            <div className="flex justify-start w-full">
              <div className="flex max-w-[85%] gap-4 flex-row">
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm mt-1 bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                  <Sparkles size={15} strokeWidth={2.5} />
                </div>
                <div className="px-5 py-4 rounded-2xl bg-white border border-slate-100 text-slate-400 shadow-[0_2px_8px_-4px_rgba(0,0,0,0.05)] rounded-tl-sm flex items-center gap-1.5 h-[52px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
              </div>
            </div>
          )}
          <div ref={scrollRef} className="h-4" />
        </div>

        {/* Floating Input Area */}
        <div className="absolute bottom-0 left-0 right-0 pt-10 pb-6 px-4 sm:px-6 z-20 pointer-events-none">
          {/* Gradient overlay to smoothly fade out text behind the input bar */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#F9FAFB] via-[#F9FAFB] to-transparent z-[-1]" />
          
          <div className="max-w-3xl mx-auto flex flex-col gap-4 pointer-events-auto">
            {/* Animated Chips */}
            {chips.length > 0 && (
              <AnimatedSuggestions suggestions={chips} onSelect={(t) => handleSend(t)} />
            )}
            
            {/* Pill-shaped Input Dock */}
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSend(); }} 
              className="relative flex items-center gap-2 bg-white/80 backdrop-blur-xl rounded-full border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] focus-within:shadow-[0_8px_30px_rgb(0,0,0,0.08)] focus-within:border-indigo-300/50 transition-all p-2"
            >
              <div className="flex-1 relative flex items-center">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask a follow-up question..."
                  className="w-full bg-transparent outline-none py-2 px-5 text-[15px] font-medium text-slate-800 placeholder:text-slate-400"
                  disabled={loading}
                />
              </div>
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center shrink-0 hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-slate-900 transition-all shadow-sm"
              >
                <Send size={16} className="ml-0.5" />
              </button>
            </form>
            <div className="text-center">
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">StudyBuddy AI can make mistakes. Check important info.</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-30 md:hidden animate-fade-in" onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  );
}

// Quick fallback icon for history
function HistoryIcon(props) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
      <path d="M3 3v5h5"/>
      <path d="M12 7v5l4 2"/>
    </svg>
  )
}
