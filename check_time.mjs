import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ybsugfoqpxygncapnxsw.supabase.co',
  'sb_publishable_AxM9G-Sr3Xygpa-hngZYGg_wxzgWGrd'
);

async function checkDatabase() {
  const { data: books, error: bookErr } = await supabase.from('textbooks').select('id, title, status, created_at').order('created_at', { ascending: false }).limit(5);
  console.log(books);
}
checkDatabase();
