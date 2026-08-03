import React, { useState, useEffect } from 'react';
import { 
  Home, BookOpen, Bookmark, BookMarked, History,
  Settings, PlusCircle, Bell, HelpCircle, FileText,
  GraduationCap, FlaskConical, ExternalLink, X, ChevronRight
} from 'lucide-react';
import { supabase } from '../supabase';

const SidebarSection = ({ label, children }) => (
  <div className="space-y-1">
    <div className="px-3.5 pt-5 pb-2 text-xs font-extrabold text-slate-400 uppercase tracking-wider font-mono">
      {label}
    </div>
    {children}
  </div>
);

const SidebarLink = ({ item, active, onClick }) => {
  const IconComponent = item.icon;
  return (
    <button
      onClick={onClick}
      className={`w-full group flex items-center justify-between px-3.5 py-3 rounded-xl font-bold text-base transition-all duration-150 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
        active
          ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <IconComponent
          size={19}
          strokeWidth={active ? 2.5 : 2}
          className={active ? 'text-white shrink-0' : 'text-slate-500 group-hover:text-blue-600 shrink-0 transition-colors'}
        />
        <span className="truncate text-[15px] lg:text-[16px]">{item.label}</span>
      </div>
      {item.badge && (
        <span className={`px-2 py-0.5 rounded-full text-xs font-extrabold shrink-0 ${
          active ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-600 border border-blue-100'
        }`}>
          {item.badge}
        </span>
      )}
    </button>
  );
};

export default function DesktopSidebar({ user, currentPath, onNavigate }) {
  const [activeBookmarkCount, setActiveBookmarkCount] = useState(0);
  const [continueReadingBook, setContinueReadingBook] = useState(null);
  const [showBookmarksModal, setShowBookmarksModal] = useState(false);
  const [localBookmarks, setLocalBookmarks] = useState([]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('study_buddy_bookmarks') || '[]');
      setActiveBookmarkCount(saved.length);
      setLocalBookmarks(saved);
    } catch (e) {
      console.warn('Could not parse bookmarks:', e);
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
        className="hidden lg:flex flex-col w-64 xl:w-72 shrink-0 bg-white border-r border-slate-200 select-none"
        style={{ height: 'calc(100vh - 65px)', overflowY: 'auto' }}
      >
        <div className="flex flex-col flex-1 p-3.5 pb-6">

          {/* ── LIBRARY ── */}
          <SidebarSection label="Library">
            <SidebarLink
              item={{ key: 'study', label: 'Dashboard', icon: Home }}
              active={isActive('/study')}
              onClick={() => onNavigate('study')}
            />
            <SidebarLink
              item={{ key: 'library', label: 'My Library', icon: BookOpen }}
              active={isActive('/library')}
              onClick={() => onNavigate('library')}
            />
            <SidebarLink
              item={{
                key: 'continue',
                label: 'Continue Reading',
                icon: BookMarked,
                badge: continueReadingBook ? `Pg ${continueReadingBook.current_page}` : null,
              }}
              active={false}
              onClick={handleContinueReading}
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
            />
          </SidebarSection>

          {/* ── STUDY ── */}
          <SidebarSection label="Study">
            <SidebarLink
              item={{ key: 'sessions', label: 'Reading History', icon: History }}
              active={isActive('/sessions')}
              onClick={() => onNavigate('sessions')}
            />
          </SidebarSection>

          {/* ── EXAM PREPARATION ── */}
          <SidebarSection label="Exam Preparation">
            <SidebarLink
              item={{ key: 'jamb', label: 'JAMB Resources', icon: GraduationCap }}
              active={false}
              onClick={() => onNavigate('library', { filter: 'JAMB' })}
            />
            <SidebarLink
              item={{ key: 'subjects', label: 'Subjects & Syllabus', icon: FlaskConical }}
              active={false}
              onClick={() => onNavigate('library')}
            />
          </SidebarSection>

          {/* ── SETTINGS ── */}
          <SidebarSection label="Settings">
            <SidebarLink
              item={{ key: 'notifications', label: 'Notifications', icon: Bell }}
              active={isActive('/notifications')}
              onClick={() => onNavigate('notifications')}
            />
            <SidebarLink
              item={{ key: 'profile', label: 'Preferences', icon: Settings }}
              active={isActive('/profile')}
              onClick={() => onNavigate('profile')}
            />
            <SidebarLink
              item={{ key: 'help', label: 'Help', icon: HelpCircle }}
              active={isActive('/help')}
              onClick={() => onNavigate('help')}
            />
          </SidebarSection>

          {/* Admin-only Upload */}
          {user?.role === 'admin' && (
            <SidebarSection label="Admin">
              <SidebarLink
                item={{ key: 'upload', label: 'Upload Textbook', icon: PlusCircle }}
                active={isActive('/upload')}
                onClick={() => onNavigate('upload')}
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
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
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
