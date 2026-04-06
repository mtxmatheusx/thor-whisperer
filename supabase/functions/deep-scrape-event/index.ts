import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url, event_name } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ error: "url is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!FIRECRAWL_API_KEY) {
      return new Response(
        JSON.stringify({ error: "FIRECRAWL_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log(`Deep scraping: ${url}`);

    // 1. Scrape the main page
    const scrapeRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        formats: ["markdown"],
        onlyMainContent: false,
        waitFor: 3000,
      }),
    });

    if (!scrapeRes.ok) {
      const errText = await scrapeRes.text();
      console.error(`Scrape error: ${scrapeRes.status} ${errText}`);
      return new Response(
        JSON.stringify({ error: `Scrape failed: ${scrapeRes.status}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const scrapeData = await scrapeRes.json();
    const markdown = scrapeData.data?.markdown || scrapeData.markdown || "";

    if (!markdown) {
      return new Response(
        JSON.stringify({ error: "No content scraped from page" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2. Use AI to extract all contacts from the full page content
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ contacts: [], raw_content: markdown.slice(0, 2000) }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const prompt = `Analise o conteúdo abaixo de uma página de evento e extraia TODOS os dados de contato encontrados.

EVENTO: ${event_name || "Não especificado"}
URL: ${url}

CONTEÚDO DA PÁGINA:
${markdown.slice(0, 4000)}

EXTRAIA:
- Nome do organizador ou empresa organizadora
- Email(s) de contato
- Telefone(s) / WhatsApp
- Site oficial
- LinkedIn (URL completa)
- Instagram (URL completa)
- Cargo/função se mencionado

REGRAS:
- Extraia APENAS dados presentes no conteúdo. NÃO invente.
- Se encontrar múltiplos contatos, retorne todos.
- Emails genéricos como contato@, info@, eventos@ são válidos.

Retorne um JSON array:
[{
  "name": "Nome ou null",
  "role": "Cargo ou 'organizer'",
  "email": "email@real.com ou null",
  "phone": "telefone ou null",
  "linkedin": "url ou null",
  "instagram": "url ou null",
  "website": "url ou null",
  "confidence": "high|medium|low"
}]

Retorne APENAS o JSON array, sem markdown, sem explicação.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Você extrai dados de contato de páginas web. Retorne APENAS JSON válido. Nunca invente dados." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiRes.ok) {
      console.error(`AI error: ${aiRes.status}`);
      return new Response(
        JSON.stringify({ contacts: [], raw_content: markdown.slice(0, 1000) }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const aiData = await aiRes.json();
    const text = aiData.choices?.[0]?.message?.content || "";

    let jsonStr = text.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    try {
      const contacts = JSON.parse(jsonStr);
      console.log(`Found ${Array.isArray(contacts) ? contacts.length : 0} contacts`);
      return new Response(
        JSON.stringify({ contacts: Array.isArray(contacts) ? contacts : [], source: "firecrawl_deep_scrape" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    } catch (parseErr) {
      console.error("Failed to parse AI response:", parseErr);
      return new Response(
        JSON.stringify({ contacts: [], raw_content: markdown.slice(0, 1000) }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
  } catch (err) {
    console.error("deep-scrape-event error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
