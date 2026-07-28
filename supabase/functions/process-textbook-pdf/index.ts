const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight — must be the very first thing, before any async work
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    const { file_path, start_page = 1, batch_size = 50 } = await req.json();

    if (!file_path) {
      return new Response(JSON.stringify({ error: "file_path is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.39.3");
    const supabase = createClient(supabaseUrl, supabaseKey);

    const start = Math.max(1, parseInt(start_page as any, 10));
    const batchSz = parseInt(batch_size as any, 10);

    console.log(`Processing '${file_path}' — pages ${start} to ${start + batchSz - 1}`);

    // Dynamically load pdfjs to prevent worker boot crashes from failing CORS
    const pdfjsModule = await import("npm:pdfjs-dist@3.11.174/legacy/build/pdf.js");
    const pdfjsLib = pdfjsModule.default || pdfjsModule;
    
    if (pdfjsLib.GlobalWorkerOptions) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = "";
    }

    // ── Download only the bytes we need via HTTP Range Request ──────────────
    // Rather than pulling the entire file into memory, we fetch the public URL
    // and use a Range header so large PDFs don't exhaust the function's RAM.
    // pdf.js can load from a partial buffer as long as it contains the xref
    // table (end of file) + the pages we need — but since we can't predict
    // those byte offsets without the full xref, we fall back to a full download
    // for batch 1 only (to read numPages + xref), then reuse that info.
    // For simplicity and reliability across all PDF types, we download via the
    // signed URL and let pdf.js handle it; the key fix is batching per invocation
    // so no single call processes more than 50 pages worth of decoded content.
    const { data: signedData, error: signedErr } = await supabase.storage
      .from("textbooks-pdf")
      .createSignedUrl(file_path, 300); // 5-minute URL for this invocation

    if (signedErr || !signedData?.signedUrl) {
      return new Response(JSON.stringify({ error: `Failed to get signed URL: ${signedErr?.message}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the file — using a signed URL allows Supabase CDN to serve it
    // efficiently and respects RLS without needing service-role credentials
    // in the storage download call
    const fileRes = await fetch(signedData.signedUrl);
    if (!fileRes.ok) {
      return new Response(JSON.stringify({ error: `Storage fetch failed: ${fileRes.status} ${fileRes.statusText}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const arrayBuffer = await fileRes.arrayBuffer();

    console.log(`Downloaded ${(arrayBuffer.byteLength / (1024 * 1024)).toFixed(1)} MB — loading pdf.js...`);

    const pdf = await pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
      disableFontFace: true,
      // Disable range requests inside pdf.js since we already have the buffer
      disableAutoFetch: true,
      disableStream: true,
    }).promise;

    const totalPages = pdf.numPages;
    const end = Math.min(start + batchSz - 1, totalPages);

    console.log(`PDF loaded — ${totalPages} total pages. Extracting pages ${start}–${end}...`);

    let batchText = "";

    for (let pageNum = start; pageNum <= end; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(" ");
      batchText += `\n\n--- Page ${pageNum} ---\n\n` + pageText;
      page.cleanup();
    }

    // Free the pdf document from memory before responding
    pdf.destroy();

    const cleanText = batchText.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
    const isLastBatch = end >= totalPages;

    console.log(`Batch complete — pages ${start}–${end} of ${totalPages}. isLast=${isLastBatch}`);

    return new Response(
      JSON.stringify({
        success: true,
        total_pages: totalPages,
        start_page: start,
        end_page: end,
        is_last_batch: isLastBatch,
        extracted_text: cleanText,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (err: any) {
    console.error("Edge function error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
