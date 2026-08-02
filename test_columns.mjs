const url = 'https://ybsugfoqpxygncapnxsw.supabase.co';
const key = 'sb_publishable_AxM9G-Sr3Xygpa-hngZYGg_wxzgWGrd';

async function run() {
  try {
    // We do a deliberate bad query to see if is_published exists
    const res = await fetch(`${url}/rest/v1/textbooks?select=is_published&limit=1`, {
      headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
    });
    console.log("Status for is_published:", res.status);
    console.log("Data:", await res.text());

    const res2 = await fetch(`${url}/rest/v1/textbooks?select=uploaded_by&limit=1`, {
      headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
    });
    console.log("Status for uploaded_by:", res2.status);
    console.log("Data:", await res2.text());

    const res3 = await fetch(`${url}/rest/v1/textbooks?select=user_id&limit=1`, {
      headers: { 'apikey': key, 'Authorization': `Bearer ${key}` }
    });
    console.log("Status for user_id:", res3.status);
    console.log("Data:", await res3.text());
  } catch (err) {
    console.error(err);
  }
}

run();
