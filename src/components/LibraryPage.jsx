import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { BookOpen, Trash2, Plus, FileText, Calendar, Clock, ChevronLeft } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { isAdminUser } from '../config';
import Footer from './Footer';

export default function LibraryPage({ user, onNavigate }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const subjectFilter = searchParams.get('subject');
  const viewFilter = searchParams.get('view') || 'my_subjects';

  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user?.id) return;
    fetchBooks();
  }, [user, subjectFilter, viewFilter]);

  const fetchBooks = async () => {
    try {
      setLoading(true);
      // Fetch textbooks
      let query = supabase
        .from('textbooks')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (subjectFilter) {
        query = query.eq('subject', subjectFilter);
      } else if (viewFilter === 'my_subjects' && user?.favorite_subjects?.length > 0) {
        query = query.in('subject', user.favorite_subjects);
      }
      
      const { data: textbooksData, error: textbooksError } = await query;

      if (textbooksError) throw textbooksError;

      // Fetch reading progress
      const { data: progressData, error: progressError } = await supabase
        .from('reading_progress')
        .select('*')
        .eq('user_id', user.id);

      if (progressError) {
        console.error("Supabase Request Failed in LibraryPage:", progressError.message);
      }

      const progressMap = {};
      if (progressData && !progressError) {
        progressData.forEach(p => {
          progressMap[p.book_id] = p;
        });
      }

      // We need sizes too. The size isn't stored centrally on textbooks, but maybe we can calculate it or just omit it for now if not available.
      // Wait, let's fetch total size from chunks, or just display a static value if not available.
      // The prompt asks for "File size". We'd need an RPC or a secondary query.
      // We'll query chunk sizes
      const { data: chunkData, error: chunkError } = await supabase
        .from('textbook_chunks')
        .select('book_id, size_bytes');

      const sizeMap = {};
      if (chunkData) {
        chunkData.forEach(c => {
           sizeMap[c.book_id] = (sizeMap[c.book_id] || 0) + parseInt(c.size_bytes || 0, 10);
        });
      }

      const merged = textbooksData.map(book => ({
        ...book,
        progress: progressMap[book.id] || null,
        total_size: sizeMap[book.id] || 0
      }));

      setBooks(merged);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatSize = (bytes) => {
    if (!bytes || bytes === 0) return 'Unknown Size';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const getSubjectColor = (subject) => {
    const colors = {
      'Biology': 'from-green-500 to-emerald-700',
      'Physics': 'from-blue-500 to-indigo-700',
      'Chemistry': 'from-purple-500 to-fuchsia-700',
      'Mathematics': 'from-red-500 to-rose-700',
      'Economics': 'from-amber-500 to-orange-700',
      'default': 'from-slate-600 to-slate-800'
    };
    return colors[subject] || colors['default'];
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"? This will delete all chunks and reading progress.`)) {
      return;
    }
    try {
      const { error } = await supabase.from('textbooks').delete().eq('id', id);
      if (error) throw error;
      setBooks(books.filter(b => b.id !== id));
    } catch (err) {
      alert("Failed to delete book: " + err.message);
    }
  };

  return (
    <div className="flex-1 w-full h-full overflow-y-auto bg-[#edf5f1] flex flex-col justify-between">
      <div className="max-w-7xl mx-auto p-4 sm:p-8 w-full">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div>
            {subjectFilter && (
              <button 
                onClick={() => onNavigate('study')} 
                className="flex items-center gap-1 text-sm text-slate-500 hover:text-blue-600 transition-colors mb-2"
              >
                <ChevronLeft size={16} /> Back to subjects
              </button>
            )}
            <h1 className="text-2xl font-bold text-slate-800 mb-1">
              {subjectFilter ? `${subjectFilter} Library` : 'Library'}
            </h1>
            <p className="text-slate-500">Access and manage published textbooks</p>

            {!subjectFilter && user?.favorite_subjects?.length > 0 && (
              <div className="flex items-center gap-2 mt-4 bg-slate-200/50 p-1 w-fit rounded-lg">
                <button
                  onClick={() => setSearchParams({ view: 'my_subjects' })}
                  className={`px-3 py-1.5 text-xs sm:text-sm font-bold rounded-md transition-all ${viewFilter === 'my_subjects' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  My Subjects
                </button>
                <button
                  onClick={() => setSearchParams({ view: 'all' })}
                  className={`px-3 py-1.5 text-xs sm:text-sm font-bold rounded-md transition-all ${viewFilter === 'all' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  All Subjects
                </button>
              </div>
            )}
          </div>
          {isAdminUser(user) && (
            <button 
              onClick={() => navigate('/upload')} 
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Plus size={18} />
              Add Textbook
            </button>
          )}
        </div>

        {error && (
          <div className="p-4 mb-6 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100 flex items-start gap-3">
            <Trash2 size={16} className="mt-0.5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center py-20 text-slate-400">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
          </div>
        ) : books.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-white rounded-2xl border border-slate-200 border-dashed">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <BookOpen size={24} className="text-slate-300" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">
              {subjectFilter ? `No ${subjectFilter} textbooks yet` : 'Your library is empty'}
            </h3>
            <p className="text-slate-500 mb-8 max-w-md leading-relaxed">
              {subjectFilter 
                ? `Administrators have not uploaded any textbooks for ${subjectFilter}.`
                : "Upload your massive PDF textbooks and we'll split them securely into readable, bite-sized pieces for you to study anywhere."
              }
            </p>
            {isAdminUser(user) && (
              <button 
                onClick={() => navigate('/upload')} 
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Plus size={18} />
                Upload First Book
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3.5 sm:gap-4">
            {books.map((book) => {
              const isProcessing = book.status !== 'ready';
              const lastPage = book.progress?.current_page;
              
              return (
                <div 
                  key={book.id} 
                  onClick={() => !isProcessing && navigate(`/book/${book.id}/read`)}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-lg transition-all duration-200 hover:-translate-y-1 active:scale-[0.98] flex flex-col h-full cursor-pointer group"
                >
                  {/* Thumbnail-Style Hardbound Book Cover (Top ~40%) */}
                  <div className={`h-36 sm:h-40 w-full bg-gradient-to-br ${getSubjectColor(book.subject)} p-3 sm:p-4 flex flex-col justify-between relative overflow-hidden shrink-0`}>
                    {/* Hardcover book spine binding effect */}
                    <div className="absolute left-0 top-0 bottom-0 w-3 bg-black/20 border-r border-white/10 z-10"></div>
                    <div className="absolute left-3 top-0 bottom-0 w-1 bg-white/10 z-10"></div>
                    
                    {/* Background geometric book texture / watermark */}
                    <BookOpen className="absolute -right-4 -bottom-4 w-32 h-32 text-white/10 rotate-12 pointer-events-none transition-transform duration-300 group-hover:scale-110" />
                    
                    {/* Subject Badge */}
                    <div className="relative z-20 pl-2">
                      <span className="inline-block px-2 py-0.5 bg-black/30 backdrop-blur-md rounded text-[10px] sm:text-[11px] font-extrabold text-white uppercase tracking-wider shadow-sm border border-white/10">
                        {book.subject || 'Textbook'}
                      </span>
                    </div>
                    
                    {/* Decorative embossed binder titles on cover */}
                    <div className="relative z-20 pl-2 mt-auto">
                      <div className="w-8 h-1 bg-white/40 rounded-full mb-1"></div>
                      <p className="text-white/90 text-[11px] font-bold line-clamp-1 opacity-95 drop-shadow-sm uppercase tracking-tight">{book.title}</p>
                    </div>

                    {isProcessing && (
                      <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-30 flex flex-col items-center justify-center p-2 text-center">
                        <div className="w-7 h-7 border-3 border-slate-200 border-t-blue-600 rounded-full animate-spin mb-2"></div>
                        <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">{book.status}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Card Body (Same height regardless of title length) */}
                  <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between bg-white">
                    <div>
                      {/* Title (max 2 lines, responsive font 15-16px) */}
                      <h3 className="text-[15px] sm:text-[16px] font-bold text-slate-800 leading-snug mb-1 line-clamp-2 min-h-[2.5rem] sm:min-h-[2.7rem]" title={book.title}>
                        {book.title}
                      </h3>
                      
                      {/* Author (1 line, truncate with ..., responsive font 12-13px) */}
                      <p className="text-[12px] sm:text-[13px] font-medium text-slate-500 truncate mb-2.5" title={book.author || 'Unknown Author'}>
                        {book.author || 'Unknown Author'}
                      </p>
                      
                      {/* Metadata (Page count & File size, responsive font 11-12px) */}
                      <div className="flex items-center justify-between text-[11px] sm:text-[12px] text-slate-400 pb-2.5 border-b border-slate-100">
                         <span className="flex items-center gap-1 font-medium"><FileText size={13} className="shrink-0 text-slate-400"/> {book.total_pages || 0} Pages</span>
                         <span className="flex items-center gap-1 font-medium"><Clock size={13} className="shrink-0 text-slate-400"/> {formatSize(book.total_size)}</span>
                      </div>
                    </div>

                    {/* Compact Footer Actions with 44px Touch Targets */}
                    <div className="mt-2.5">
                      {lastPage && (
                        <div className="flex items-center justify-between text-[11px] sm:text-[12px] font-semibold mb-1.5 px-0.5">
                          <span className="text-slate-400 text-[11px]">Progress</span>
                          <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded font-bold text-[11px] sm:text-[12px]">Page {lastPage}</span>
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between gap-1.5">
                        <button 
                          onClick={(e) => { e.stopPropagation(); !isProcessing && navigate(`/book/${book.id}/read`); }}
                          disabled={isProcessing}
                          className={`flex-1 min-h-[44px] py-2 px-3 rounded-xl font-bold text-[13px] sm:text-[14px] flex items-center justify-center gap-1.5 shadow-sm transition-all text-center ${
                            isProcessing 
                              ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200' 
                              : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white hover:shadow-md'
                          }`}
                        >
                          <span className="text-[10px]">▶</span>
                          <span>{lastPage ? 'Continue' : 'Start'}</span>
                        </button>

                        {isAdminUser(user) && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDelete(book.id, book.title); }}
                            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors shrink-0 border border-transparent hover:border-red-100"
                            title="Delete Book"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <Footer onNavigate={onNavigate} />
    </div>
  );
}
