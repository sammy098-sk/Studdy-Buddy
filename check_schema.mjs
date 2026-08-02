import fs from 'fs';

const supabaseFile = fs.readFileSync('./src/supabase.js', 'utf8');
const urlMatch = supabaseFile.match(/const supabaseUrl = ['"]([^'"]+)['"]/);
const keyMatch = supabaseFile.match(/const supabaseAnonKey = ['"]([^'"]+)['"]/);

if (urlMatch && keyMatch) {
  const url = urlMatch[1];
  const key = keyMatch[1];
  const endpoint = `${url}/rest/v1/textbooks?limit=1`;
  
  try {
    const res = await fetch(endpoint, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`
      }
    });
    const text = await res.text();
    console.log("Status:", res.status);
    console.log("Body:", text);
  } catch (err) {
    console.log("Error:", err);
  }
}
