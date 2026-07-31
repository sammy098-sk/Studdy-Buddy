import React, { useState, useEffect } from 'react';
import { BookOpen, Loader2 } from 'lucide-react';
import { supabase } from '../supabase';
import { SUBJECT_ICONS } from '../config';

export default function HomeView({ user, onNavigate }) {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSubjects() {
      // Fetch all published textbooks to group them by subject
      const { data, error } = await supabase
        .from('textbooks')
        .select('subject')
        .eq('is_published', true);

      if (!error && data) {
        const counts = {};
        data.forEach(book => {
          if (book.subject) {
            counts[book.subject] = (counts[book.subject] || 0) + 1;
          }
        });
        
        const subjectArray = Object.keys(counts).map(sub => ({
          name: sub,
          count: counts[sub]
        }));
        
        // Sort alphabetically
        subjectArray.sort((a, b) => a.name.localeCompare(b.name));
        setSubjects(subjectArray);
      }
      setLoading(false);
    }
    fetchSubjects();
  }, []);

  return (
    <div className="flex-1 overflow-y-auto flex flex-col bg-slate-50">
      <div className="flex-1 px-4 sm:px-8 py-10">
        <div className="max-w-4xl mx-auto">
          
          <h2 className="text-2xl font-semibold mb-1 text-slate-900" style={{ fontFamily: "'Montserrat', sans-serif" }}>
            What are we studying today?
          </h2>
          <p className="text-sm mb-8 text-slate-500">
            Pick a subject to explore available textbooks and resources.
          </p>

          {loading ? (
            <div className="flex items-center justify-center py-20 text-slate-400">
              <Loader2 size={24} className="animate-spin" />
            </div>
          ) : subjects.length === 0 ? (
            <div className="text-center py-16 px-4 bg-white rounded-2xl border border-slate-200">
              <BookOpen size={32} className="mx-auto mb-4 text-slate-300" />
              <h3 className="text-lg font-medium text-slate-700 mb-1">No subjects available yet</h3>
              <p className="text-sm text-slate-500 max-w-sm mx-auto">
                Subjects will automatically appear here once an administrator uploads textbooks.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {subjects.map((s) => {
                const Icon = SUBJECT_ICONS[s.name] || BookOpen;
                return (
                  <button
                    key={s.name}
                    onClick={() => onNavigate('library', { subject: s.name })}
                    className="flex flex-col items-start gap-4 p-5 rounded-2xl border border-slate-200 bg-white text-left transition-all hover:shadow-md hover:border-blue-200 group"
                  >
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-blue-50 group-hover:bg-blue-600 transition-colors">
                      <Icon size={20} className="text-blue-600 group-hover:text-white" />
                    </div>
                    <div>
                      <div className="text-[15px] font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {s.name}
                      </div>
                      <div className="text-xs mt-1 text-slate-500 font-medium">
                        {s.count} {s.count === 1 ? 'textbook' : 'textbooks'}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
