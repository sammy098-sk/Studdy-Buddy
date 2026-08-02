const url = 'https://ybsugfoqpxygncapnxsw.supabase.co';
const key = 'sb_publishable_AxM9G-Sr3Xygpa-hngZYGg_wxzgWGrd';

async function run() {
  try {
    console.log("--- FETCHING TEXTBOOKS SCHEMA ---");
    const resBooks = await fetch(`${url}/rest/v1/textbooks?select=*&limit=1`, {
      headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
    });
    const booksText = await resBooks.text();
    console.log("Status:", resBooks.status);
    console.log("Data:", booksText);

    console.log("\n--- FETCHING TEXTBOOK CHUNKS SCHEMA ---");
    const resChunks = await fetch(`${url}/rest/v1/textbook_chunks?select=*&limit=1`, {
      headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
    });
    const chunksText = await resChunks.text();
    console.log("Status:", resChunks.status);
    console.log("Data:", chunksText);
  } catch (err) {
    console.error(err);
  }
}

run();
