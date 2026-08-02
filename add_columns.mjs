import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      ALTER TABLE public.textbook_chapters
      ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.textbook_chapters(id) ON DELETE CASCADE,
      ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;
    `
  });
  console.log("RPC Error?", error);
}
run();
