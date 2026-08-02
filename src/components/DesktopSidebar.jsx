import React, { useState, useEffect } from 'react';
import { 
  Home, BookOpen, LayoutGrid, Bookmark, BookMarked, TrendingUp, 
  Settings, PlusCircle, ChevronRight, Sparkles, Flame, GraduationCap,
  ExternalLink, X
} from 'lucide-react';
import { supabase } from '../supabase';

export default function DesktopSidebar({ user, currentPath, onNavigate }) {
  const [activeBookmarkCount, setActiveBookmarkCount] = useState(0);
  const [continueReadingBook, setContinueReadingBook] = useState(null);
  const [showBookmarksModal, setShowBookmarksModal] = useState(false);
  const [localBookmarks, setLocalBookmarks] = useState([]);

  useEffect(() => {
    // Load local bookmarks count
    try {
      const saved = JSON.parse(localStorage.getItem('study_buddy_bookmarks') || '[]');
      setActiveBookmarkCount(saved.length);
      setLocalBookmarks(saved);
    } catch (e) {
      console.warn("Could not parse bookmarks:", e);
    }

    // Load latest reading progress for Continue Reading quick link
    if (user?.id) {
      (async () => {
        try {
          const { data } = await supabase
            .from('reading_progress')
            .select('book_id, current_page, textbooks(title, subject)')
            .eq('user_id', user.id)
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (data) {
            setContinueReadingBook(data);
          }
        } catch (err) {
          console.warn("Could not fetch sidebar reading progress:", err);
        }
      })();
    }
  }, [user?.id]);

  const navItems = [
    { key: 'study', label: 'Home', icon: Home, path: '/study', desc: 'Dashboard Overview' },
    { key: 'library', label: 'My Library', icon: BookOpen, path: '/library', desc: 'Textbooks & OCR' },
    { key: 'subjects', label: 'Subjects', icon: LayoutGrid, path: '/library', payload: { view: 'subjects' }, desc: 'Curriculum topics' },
    { 
      key: 'bookmarks', 
      label: 'Bookmarks', 
      icon: Bookmark, 
      action: () => {
        try {
          const saved = JSON.parse(localStorage.getItem('study_buddy_bookmarks') || '[]');
          setLocalBookmarks(saved);
        } catch (e) {}
        setShowBookmarksModal(true);
      }, 
      badge: activeBookmarkCount > 0 ? activeBookmarkCount : null,
      desc: 'Saved page quotes'
    },
    { 
      key: 'continue', 
      label: 'Continue Reading', 
      icon: BookMarked, 
      action: () => {
        if (continueReadingBook?.book_id) {
          onNavigate('reader', { bookId: continueReadingBook.book_id });
        } else {
          onNavigate('study');
        }
      },
      desc: continueReadingBook ? `Pg ${continueReadingBook.current_page} · ${continueReadingBook.textbooks?.title?.slice(0, 15) || 'Book'}...` : 'Jump to active session'
    },
    { key: 'sessions', label: 'Study Progress', icon: TrendingUp, path: '/sessions', desc: 'Stats & AI histories' },
    { key: 'notifications', label: 'Settings', icon: Settings, path: '/notifications', desc: 'Alerts & Preferences' },
  ];

  if (user?.role === 'admin') {
    navItems.splice(2, 0, { key: 'importer', label: 'Upload Textbook', icon: PlusCircle, path: '/upload', desc: 'Admin PDF parsing' });
  }

  const isRouteActive = (item) => {
    if (!item.path) return false;
    if (item.key === 'study' && (currentPath === '/' || currentPath === '/study')) return true;
    return currentPath.startsWith(item.path) && !item.payload;
  };

  return (
    <>
      <aside className="hidden lg:flex flex-col w-64 xl:w-72 shrink-0 bg-white border-r border-slate-200 p-4 xl:p-5 justify-between select-none transition-all">
        <div className="space-y-6">
          {/* Navigation section label */}
          <div className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
            Platform Navigation
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1.5">
            {navItems.map((item) => {
              const active = isRouteActive(item);
              const IconComponent = item.icon;

              return (
                <button
                  key={item.label}
                  onClick={() => {
                    if (item.action) {
                      item.action();
                    } else {
                      onNavigate(item.key, item.payload);
                    }
                  }}
                  className={`w-full group flex items-center justify-between px-3.5 py-3 rounded-xl font-semibold text-xs sm:text-sm transition-all duration-200 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                    active 
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20 translate-x-0.5' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:translate-x-1'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                      active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600'
                    }`}>
                      <IconComponent size={17} strokeWidth={active ? 2.5 : 2} />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-bold text-[13.5px] leading-snug">{item.label}</div>
                      <div className={`text-[11px] truncate font-medium ${active ? 'text-blue-100' : 'text-slate-400 group-hover:text-slate-500'}`}>
                        {item.desc}
                      </div>
                    </div>
                  </div>

                  {item.badge && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold shrink-0 ${
                      active ? 'bg-white text-blue-600' : 'bg-blue-50 text-blue-600 border border-blue-200/60'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Card: Study Goal Mini-Promo & Quick Tips */}
        <div className="mt-8 pt-6 border-t border-slate-100">
          <div className="bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-900 text-white rounded-2xl p-4 shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 -mt-6 -mr-6 w-24 h-24 bg-blue-500/20 rounded-full blur-xl pointer-events-none" />
            <div className="flex items-center gap-2 text-blue-300 font-bold text-xs uppercase tracking-wider mb-2">
              <GraduationCap size={15} />
              <span>JAMB 2026 Readiness</span>
            </div>
            <p className="text-xs text-slate-300 font-medium leading-relaxed mb-3">
              Maintain your daily reading streak to unlock predictive AI diagnostic scoring!
            </p>
            <button 
              onClick={() => onNavigate('sessions')}
              className="w-full py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 rounded-xl text-xs font-extrabold transition-all duration-200 shadow-xs flex items-center justify-center gap-1.5"
            >
              <span>View Analytics</span>
              <ChevronRight size={14} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </aside>

      {/* Bookmarks Modal for Quick Desktop Access */}
      {showBookmarksModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[80vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
                  <Bookmark size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Your Saved Bookmarks</h3>
                  <p className="text-xs text-slate-500">Quickly jump back to highlighted chapters and pages</p>
                </div>
              </div>
              <button onClick={() => setShowBookmarksModal(false)} className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {localBookmarks.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm font-medium">
                  No pages bookmarked yet. Use the "Bookmark Page" tool inside any textbook reader to save notes!
                </div>
              ) : (
                localBookmarks.map((b, idx) => (
                  <div 
                    key={idx}
                    onClick={() => {
                      setShowBookmarksModal(false);
                      onNavigate('reader', { bookId: b.bookId });
                    }}
                    className="p-4 rounded-2xl border border-slate-200/80 hover:border-blue-300 hover:bg-blue-50/30 transition-all cursor-pointer group flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-sm text-slate-800 group-hover:text-blue-600 transition-colors">{b.title}</div>
                      <div className="text-xs text-slate-400 mt-1">Saved on {new Date(b.createdAt || Date.now()).toLocaleDateString()}</div>
                    </div>
                    <ExternalLink size={16} className="text-slate-300 group-hover:text-blue-600 transition-colors shrink-0 ml-3" />
                  </div>
                ))
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setShowBookmarksModal(false)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
