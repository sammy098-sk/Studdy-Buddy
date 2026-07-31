import { BookOpen, Trash2, Plus, FileText, Calendar, Clock, ChevronLeft } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { isAdminUser } from '../config';

export default function LibraryPage({ user, onNavigate }) {
  const [searchParams] = useSearchParams();
  const subjectFilter = searchParams.get('subject');

  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user?.id) return;
    fetchBooks();
  }, [user, subjectFilter]);

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
      }
      
      const { data: textbooksData, error: textbooksError } = await query;

      if (textbooksError) throw textbooksError;

      // Fetch reading progress
      const { data: progressData, error: progressError } = await supabase
        .from('reading_progress')
        .select('*')
        .eq('user_id', user.id);

      if (progressError) throw progressError;

      const progressMap = {};
      if (progressData) {
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
    <div className="flex-1 w-full h-full overflow-y-auto bg-slate-50 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {books.map((book) => {
              const isProcessing = book.status !== 'ready';
              const lastPage = book.progress?.current_page;
              
              return (
                <div key={book.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col">
                  {/* CSS Placeholder Cover */}
                  <div 
                    className={`h-48 w-full bg-gradient-to-br ${getSubjectColor(book.subject)} p-6 flex flex-col justify-end relative group cursor-pointer`}
                    onClick={() => !isProcessing && navigate(`/book/${book.id}/read`)}
                  >
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors"></div>
                    <div className="relative z-10">
                      <div className="inline-block px-2 py-1 bg-white/20 backdrop-blur-md rounded text-[10px] font-bold text-white uppercase tracking-wider mb-2">
                        {book.subject || 'Textbook'}
                      </div>
                      <h3 className="text-lg font-bold text-white leading-tight mb-1 line-clamp-3 shadow-sm">{book.title}</h3>
                      {book.author && <p className="text-white/80 text-sm font-medium line-clamp-1">{book.author}</p>}
                    </div>
                    {isProcessing && (
                      <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center">
                        <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mb-3"></div>
                        <span className="font-semibold text-slate-700 uppercase tracking-wider text-xs">{book.status}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Book Metadata */}
                  <div className="p-4 flex-1 flex flex-col">
                    <div className="flex items-center gap-4 text-xs text-slate-500 mb-4">
                       <span className="flex items-center gap-1"><FileText size={14}/> {book.total_pages} Pages</span>
                       <span className="flex items-center gap-1"><Clock size={14}/> {formatSize(book.total_size)}</span>
                    </div>

                    <div className="mt-auto pt-2 flex items-center justify-between border-t border-slate-100">
                      <button 
                        onClick={() => navigate(`/book/${book.id}/read`)}
                        disabled={isProcessing}
                        className={`font-semibold text-sm py-2 px-3 rounded-lg -ml-3 transition-colors ${isProcessing ? 'text-slate-400 cursor-not-allowed' : 'text-blue-600 hover:bg-blue-50'}`}
                      >
                        {lastPage ? `Continue (Pg ${lastPage})` : 'Start Reading'}
                      </button>

                      {isAdminUser(user) && (
                        <button 
                          onClick={() => handleDelete(book.id, book.title)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors -mr-2"
                          title="Delete Book"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
