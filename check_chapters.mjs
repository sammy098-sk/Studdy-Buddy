import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ybsugfoqpxygncapnxsw.supabase.co',
  'sb_publishable_AxM9G-Sr3Xygpa-hngZYGg_wxzgWGrd'
);

async function checkDatabase() {
  const { data: books, error: bookErr } = await supabase.from('textbooks').select('id, title, status').order('created_at', { ascending: false }).limit(5);
  if (bookErr) {
    console.error("Book query error:", bookErr);
    return;
  }
  
  console.log("Recent Books:");
  console.log(books);

  if (books.length > 0) {
    const bookId = books[0].id;
    const { data: chapters, error: chapErr } = await supabase.from('textbook_chapters').select('*').eq('book_id', bookId).order('order_index', { ascending: true });
    
    if (chapErr) {
      console.error("Chapter query error:", chapErr);
    } else {
      console.log(`\nChapters found for latest book "${books[0].title}" (${bookId}): ${chapters.length}`);
      if (chapters.length > 0) {
         console.log(chapters.slice(0, 10));
      }
    }
  }
}
checkDatabase();
