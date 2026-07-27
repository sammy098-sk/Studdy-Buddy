import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
// @ts-ignore
import * as pdfjsLib from "npm:pdfjs-dist@3.11.174/legacy/build/pdf.js";

// Disable worker in Deno serverless environment
pdfjsLib.GlobalWorkerOptions.workerSrc = "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
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
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Download PDF file from Supabase Storage bucket 'textbooks-pdf'
    console.log(`Downloading PDF file: ${file_path} (batch starting page ${start_page})...`);
    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from("textbooks-pdf")
      .download(file_path);

    if (downloadError || !fileBlob) {
      console.error("Download Error:", downloadError);
      return new Response(JSON.stringify({ error: `Failed to download file from storage: ${downloadError?.message}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract PDF text for requested page range
    const arrayBuffer = await fileBlob.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer), disableFontFace: true }).promise;
    const totalPages = pdf.numPages;

    const start = Math.max(1, parseInt(start_page as any, 10));
    const end = Math.min(start + parseInt(batch_size as any, 10) - 1, totalPages);

    let batchText = "";

    for (let pageNum = start; pageNum <= end; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(" ");
      batchText += `\n\n--- Page ${pageNum} ---\n\n` + pageText;
    }

    const cleanText = batchText.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
    const isLastBatch = end >= totalPages;

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
