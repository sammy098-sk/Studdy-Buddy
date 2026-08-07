import React, { useState, useEffect } from 'react';
import { 
  Home, BookOpen, Bookmark, BookMarked, History,
  Settings, PlusCircle, Bell, HelpCircle, FileText,
  GraduationCap, FlaskConical, ExternalLink, X, ChevronRight,
  Menu
} from 'lucide-react';
import { supabase } from '../supabase';

const SidebarSection = ({ label, children, isExpanded }) => (
  <div className={`relative group/section ${isExpanded ? 'mb-4 space-y-2' : 'mb-3 space-y-1'}`}>
    <div className={`px-4 pt-6 pb-2 text-[13px] lg:text-[14px] font-extrabold text-slate-400 uppercase tracking-widest font-mono transition-all duration-200 whitespace-nowrap overflow-hidden ${isExpanded ? 'opacity-100 max-h-12' : 'opacity-0 max-h-0 pt-0 pb-0'}`}>
      {label}
    </div>
    {!isExpanded && <div className="mx-4 my-2.5 h-px bg-slate-100" />}
    <div className={`px-2.5 ${isExpanded ? 'space-y-2.5' : 'space-y-1.5'}`}>
      {children}
    </div>
  </div>
);

const SidebarLink = ({ item, active, onClick, isHighlighted, isExpanded }) => {
  const IconComponent = item.icon;
  return (
    <button
      onClick={onClick}
      className={`relative w-full group flex items-center rounded-2xl font-extrabold transition-all duration-200 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 select-none ${
        isExpanded ? 'justify-between px-3.5 py-3.5 sm:py-4 h-auto' : 'justify-center px-0 py-0 h-[44px]'
      } ${
        active
          ? 'bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 text-white font-black shadow-xl shadow-blue-600/30 ring-1 ring-blue-400/30'
          : isHighlighted
            ? 'bg-gradient-to-r from-blue-50/95 to-indigo-50/95 text-blue-950 font-black border-l-4 border-blue-600 shadow-2xs hover:from-blue-100 hover:to-indigo-100'
            : 'text-slate-600 font-bold hover:bg-slate-100/80 hover:text-slate-950 hover:bg-slate-100/80'
      } ${isExpanded && (active || isHighlighted || true) ? 'hover:translate-x-1' : ''}`}
    >
      <div className={`flex items-center min-w-0 ${isExpanded ? 'gap-3.5' : ''}`}>
        <IconComponent
          size={isExpanded ? 23 : 21}
          strokeWidth={active || isHighlighted ? 2.6 : 2.2}
          className={
            active 
              ? 'text-white shrink-0 drop-shadow-2xs' 
              : isHighlighted
                ? 'text-blue-600 shrink-0'
                : 'text-slate-500 group-hover:text-blue-600 shrink-0 transition-colors'
          }
        />
        <span className={`truncate tracking-tight text-[15.5px] lg:text-[17px] transition-all duration-300 whitespace-nowrap overflow-hidden ${isExpanded ? 'opacity-100 max-w-[150px] ml-3.5' : 'opacity-0 max-w-0 ml-0'}`}>
          {item.label}
        </span>
      </div>
      
      {item.badge && (
        <span className={`px-2.5 py-0.5 rounded-full text-[11px] lg:text-xs font-black shrink-0 shadow-2xs tracking-tight font-mono transition-all duration-300 overflow-hidden whitespace-nowrap ${isExpanded ? 'opacity-100 ml-2 max-w-[40px]' : 'opacity-0 ml-0 max-w-0 p-0 border-0 absolute w-0 h-0'} ${
          active ? 'bg-white text-blue-700' : isHighlighted ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700 border border-blue-200/80'
        }`}>
          {item.badge}
        </span>
      )}

      {/* CUSTOM TOOLTIP */}
      {!isExpanded && (
        <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-white text-slate-800 text-sm font-extrabold rounded-xl shadow-xl border border-slate-200/60 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200 z-50 whitespace-nowrap flex items-center gap-2">
          {item.label}
          {item.badge && (
             <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 text-[10px] uppercase font-mono shadow-xs border border-blue-100">{item.badge}</span>
          )}
        </div>
      )}
    </button>
  );
};

export default function DesktopSidebar({ user, currentPath, onNavigate }) {
  const [activeBookmarkCount, setActiveBookmarkCount] = useState(0);
  const [continueReadingBook, setContinueReadingBook] = useState(null);
  const [showBookmarksModal, setShowBookmarksModal] = useState(false);
  const [localBookmarks, setLocalBookmarks] = useState([]);
  
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    try {
      const expanded = localStorage.getItem('study_buddy_sidebar_expanded') === 'true';
      setIsExpanded(expanded);
      
      const saved = JSON.parse(localStorage.getItem('study_buddy_bookmarks') || '[]');
      setActiveBookmarkCount(saved.length);
      setLocalBookmarks(saved);
    } catch (e) {
      console.warn('Could not parse bookmarks or sidebar state:', e);
    }

    if (user?.id) {
      (async () => {
        try {
          const { data, error } = await supabase
            .from('reading_progress')
            .select('book_id, current_page, textbooks(title, subject)')
            .eq('user_id', user.id)
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (error) {
            console.error("Supabase reading_progress query failed in DesktopSidebar:", error.message);
            return null;
          }
          if (data) setContinueReadingBook(data);
        } catch (err) {
          console.warn('Could not fetch sidebar reading progress:', err);
        }
      })();
    }
  }, [user?.id]);

  const toggleSidebar = () => {
    const newState = !isExpanded;
    setIsExpanded(newState);
    localStorage.setItem('study_buddy_sidebar_expanded', String(newState));
  };

  const isActive = (path) => {
    if (!path) return false;
    if (path === '/study') return currentPath === '/' || currentPath === '/study';
    return currentPath.startsWith(path);
  };

  const openBookmarks = () => {
    try {
      const saved = JSON.parse(localStorage.getItem('study_buddy_bookmarks') || '[]');
      setLocalBookmarks(saved);
      setActiveBookmarkCount(saved.length);
    } catch (e) {}
    setShowBookmarksModal(true);
  };

  const handleContinueReading = () => {
    if (continueReadingBook?.book_id) {
      onNavigate('reader', { bookId: continueReadingBook.book_id });
    } else {
      onNavigate('library');
    }
  };

  return (
    <>
      <aside
        className={`hidden lg:flex flex-col relative z-40 shrink-0 bg-white border-r border-slate-200 transition-[width] duration-300 ease-in-out overflow-y-auto overflow-x-hidden select-none ${isExpanded ? 'w-64 xl:w-72' : 'w-[72px]'}`}
        style={{ height: 'calc(100vh - 65px)' }}
      >
        <div className={`flex items-center pt-5 pb-3 transition-all duration-300 ${isExpanded ? 'px-5 justify-between' : 'px-0 justify-center flex-col gap-3'}`}>
           <button 
              onClick={toggleSidebar} 
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all cursor-pointer flex items-center justify-center shrink-0"
              title={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
           >
              <Menu size={22} strokeWidth={2.5} />
           </button>
           
           <div className={`flex items-center gap-3 transition-all duration-300 ${!isExpanded && 'mt-1'}`}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform duration-200 bg-blue-600 shrink-0 shadow-md">
                <BookOpen size={20} color="#FFFFFF" strokeWidth={2.5} />
              </div>
              <div className={`flex flex-col text-left transition-all duration-300 overflow-hidden whitespace-nowrap ${isExpanded ? 'opacity-100 max-w-[150px]' : 'opacity-0 max-w-0 hidden'}`}>
                <span className="font-extrabold text-[19px] leading-none tracking-tight text-slate-900 font-montserrat">
                  StudyBuddy
                </span>
              </div>
           </div>
        </div>

        <div className="flex flex-col flex-1 pb-6 mt-2">

          {/* ── LIBRARY ── */}
          <SidebarSection label="Library" isExpanded={isExpanded}>
            <SidebarLink
              item={{ key: 'study', label: 'Dashboard', icon: Home }}
              active={isActive('/study')}
              onClick={() => onNavigate('study')}
              isExpanded={isExpanded}
            />
            <SidebarLink
              item={{ key: 'library', label: 'My Library', icon: BookOpen }}
              active={isActive('/library')}
              onClick={() => onNavigate('library')}
              isExpanded={isExpanded}
            />
            <SidebarLink
              item={{
                key: 'continue',
                label: 'Continue Reading',
                icon: BookMarked,
                badge: continueReadingBook && continueReadingBook.current_page > 0 ? `Pg ${continueReadingBook.current_page}` : null,
              }}
              active={false}
              isHighlighted={!!continueReadingBook && continueReadingBook.current_page > 0}
              onClick={handleContinueReading}
              isExpanded={isExpanded}
            />
            <SidebarLink
              item={{
                key: 'bookmarks',
                label: 'Bookmarks',
                icon: Bookmark,
                badge: activeBookmarkCount > 0 ? activeBookmarkCount : null,
              }}
              active={false}
              onClick={openBookmarks}
              isExpanded={isExpanded}
            />
          </SidebarSection>

          {/* ── STUDY ── */}
          <SidebarSection label="Study" isExpanded={isExpanded}>
            <SidebarLink
              item={{ key: 'sessions', label: 'Reading History', icon: History }}
              active={isActive('/sessions')}
              onClick={() => onNavigate('sessions')}
              isExpanded={isExpanded}
            />
          </SidebarSection>

          {/* ── EXAM PREPARATION ── */}
          <SidebarSection label="Exam Preparation" isExpanded={isExpanded}>
            <SidebarLink
              item={{ key: 'jamb', label: 'JAMB Resources', icon: GraduationCap }}
              active={false}
              onClick={() => onNavigate('library', { filter: 'JAMB' })}
              isExpanded={isExpanded}
            />
            <SidebarLink
              item={{ key: 'subjects', label: 'Subjects & Syllabus', icon: FlaskConical }}
              active={false}
              onClick={() => onNavigate('library')}
              isExpanded={isExpanded}
            />
          </SidebarSection>

          {/* ── SETTINGS ── */}
          <SidebarSection label="Settings" isExpanded={isExpanded}>
            <SidebarLink
              item={{ key: 'notifications', label: 'Notifications', icon: Bell }}
              active={isActive('/notifications')}
              onClick={() => onNavigate('notifications')}
              isExpanded={isExpanded}
            />
            <SidebarLink
              item={{ key: 'profile', label: 'Preferences', icon: Settings }}
              active={isActive('/profile')}
              onClick={() => onNavigate('profile')}
              isExpanded={isExpanded}
            />
            <SidebarLink
              item={{ key: 'help', label: 'Help', icon: HelpCircle }}
              active={isActive('/help')}
              onClick={() => onNavigate('help')}
              isExpanded={isExpanded}
            />
          </SidebarSection>

          {/* Admin-only Upload */}
          {user?.role === 'admin' && (
            <SidebarSection label="Admin" isExpanded={isExpanded}>
              <SidebarLink
                item={{ key: 'upload', label: 'Upload Textbook', icon: PlusCircle }}
                active={isActive('/upload')}
                onClick={() => onNavigate('upload')}
                isExpanded={isExpanded}
              />
            </SidebarSection>
          )}
        </div>
      </aside>

      {/* Bookmarks Modal */}
      {showBookmarksModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                  <Bookmark size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Saved Bookmarks</h3>
                  <p className="text-xs text-slate-500">Jump back to highlighted pages</p>
                </div>
              </div>
              <button
                onClick={() => setShowBookmarksModal(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-2">
              {localBookmarks.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm font-medium">
                  No bookmarks yet. Use the Bookmark tool inside any textbook to save pages.
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
                      <div className="font-bold text-sm text-slate-800 group-hover:text-blue-600 transition-colors">
                        {b.title}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        Saved {new Date(b.createdAt || Date.now()).toLocaleDateString()}
                      </div>
                    </div>
                    <ExternalLink size={15} className="text-slate-300 group-hover:text-blue-500 transition-colors shrink-0 ml-3" />
                  </div>
                ))
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowBookmarksModal(false)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
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
