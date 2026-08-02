import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ybsugfoqpxygncapnxsw.supabase.co',
  'sb_publishable_AxM9G-Sr3Xygpa-hngZYGg_wxzgWGrd'
);

async function cleanup() {
  const { data, error } = await supabase
    .from('textbook_chunks')
    .delete()
    .eq('book_id', 'b191cb76-5d2e-4b68-8ac6-931a2cc3f04b');
    
  if (error) {
    console.error("Cleanup error:", error);
  } else {
    console.log("Cleanup successful");
  }
}
cleanup();
