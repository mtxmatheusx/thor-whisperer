import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

// ─── Search real events using Firecrawl ─────────────────────────────────────
async function searchRealEvents(keywords: string[], location?: string): Promise<RawEvent[]> {
  if (!FIRECRAWL_API_KEY) {
    console.error("FIRECRAWL_API_KEY not configured");
    return [];
  }

  const locationHint = location || "Brasil";
  const allEvents: RawEvent[] = [];
  const now = new Date();
  const currentYear = now.getFullYear();
  const nextYear = currentYear + 1;

  // Search queries focused on events/conferences seeking speakers/palestrantes
  const kw = keywords.join(" ");
  const queries = [
    `site:sympla.com.br ${kw} evento palestra congresso ${currentYear} ${locationHint}`,
    `site:eventbrite.com.br ${kw} evento conferência palestra ${currentYear} ${locationHint}`,
    `${kw} evento corporativo palestra palestrante congresso summit ${currentYear} ${locationHint} inscrição`,
    `${kw} "chamada de palestrantes" OR "submissão de palestras" OR "call for speakers" ${currentYear} ${locationHint}`,
  ];

  for (const query of queries) {
    try {
      console.log(`Searching: ${query}`);
      const response = await fetch("https://api.firecrawl.dev/v1/search", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          limit: 5,
          lang: "pt-br",
          country: "br",
          scrapeOptions: { formats: ["markdown"] },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(`Firecrawl search error ${response.status}: ${errText}`);
        continue;
      }

      const data = await response.json();
      const results = data.data || [];

      for (const result of results) {
        const event = parseSearchResult(result);
        if (event) {
          allEvents.push(event);
        }
      }
    } catch (err) {
      console.error(`Search failed for query "${query}":`, err);
    }
  }

  // Deduplicate by URL
  const seen = new Set<string>();
  const unique = allEvents.filter((ev) => {
    if (seen.has(ev.platform_url)) return false;
    seen.add(ev.platform_url);
    return true;
  });

  // Scrape top 5 event pages in parallel for contact details (limit to avoid timeout)
  const toScrape = unique.slice(0, 5);
  const scrapePromises = toScrape.map(async (ev) => {
    try {
      const scraped = await scrapeEventPage(ev.platform_url);
      if (scraped) ev.raw_markdown = scraped;
    } catch (err) {
      console.error(`Scrape failed for ${ev.platform_url}:`, err);
    }
  });
  await Promise.all(scrapePromises);

  // Use AI to enrich events with structured data extraction
  if (LOVABLE_API_KEY && unique.length > 0) {
    return await enrichEventsWithAI(unique);
  }

  return unique;
}

// ─── Scrape individual event page for contact details ───────────────────────
async function scrapeEventPage(url: string): Promise<string | null> {
  if (!FIRECRAWL_API_KEY || !url) return null;

  try {
    const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        formats: ["markdown"],
        onlyMainContent: false, // Get full page to find contact info in footer/sidebar
        waitFor: 2000,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`Scrape error for ${url}: ${response.status} ${errText}`);
      return null;
    }

    const data = await response.json();
    return data.data?.markdown || data.markdown || null;
  } catch (err) {
    console.error(`Scrape failed for ${url}:`, err);
    return null;
  }
}


function parseSearchResult(result: any): RawEvent | null {
  const url = result.url || "";
  const title = result.title || "";
  const markdown = result.markdown || result.description || "";

  if (!url || !title) return null;

  // Determine platform from URL
  const platform = detectPlatform(url);

  // Extract basic info from title and content
  const description = (result.description || markdown.slice(0, 300)).replace(/\n/g, " ").trim();

  return {
    name: title.slice(0, 200),
    description: description.slice(0, 500),
    platform,
    platform_id: extractIdFromUrl(url),
    platform_url: url,
    event_date: null,
    event_end_date: null,
    location_city: "",
    location_state: "",
    location_venue: "",
    is_online: false,
    estimated_audience: null,
    ticket_price_range: "medium",
    category: inferCategory(title),
    organizer_name: null,
    organizer_url: null,
    organizer_email: null,
    organizer_phone: null,
    organizer_linkedin: null,
    organizer_instagram: null,
    raw_markdown: markdown,
  };
}

// ─── Use AI to extract structured data from scraped content ─────────────────
async function enrichEventsWithAI(events: RawEvent[]): Promise<RawEvent[]> {
  if (!LOVABLE_API_KEY) return events;

  const eventSummaries = events.map((ev, i) => 
    `[EVENTO ${i}]\nTítulo: ${ev.name}\nURL: ${ev.platform_url}\nConteúdo:\n${(ev.raw_markdown || ev.description || "").slice(0, 800)}\n`
  ).join("\n---\n");

  const today = new Date().toISOString().split("T")[0];
  const prompt = `Analise os eventos abaixo extraídos de sites REAIS. O OBJETIVO é encontrar eventos e palestras corporativas onde uma PALESTRANTE especialista possa ser contratada.

CONTEXTO: Estamos prospectando oportunidades para vender palestras. Precisamos de eventos que ACEITEM ou CONTRATEM palestrantes.

IMPORTANTE:
- Extraia APENAS informações PRESENTES no conteúdo fornecido
- Se não encontrar uma informação, use null
- Datas devem estar no formato YYYY-MM-DD
- APENAS eventos FUTUROS (data >= ${today}). Se a data for anterior a hoje, retorne event_date como null
- Emails e telefones devem ser extraídos do conteúdo real, NUNCA invente
- Se o resultado NÃO for um evento/palestra/congresso/summit/workshop (ex: artigo, notícia, curso EAD), marque is_relevant como false

${eventSummaries}

Para CADA evento, retorne um JSON com:
{
  "index": 0,
  "is_relevant": true,
  "event_date": "YYYY-MM-DD ou null",
  "event_end_date": "YYYY-MM-DD ou null",
  "location_city": "Cidade ou null",
  "location_state": "UF ou null",
  "location_venue": "Local ou null",
  "is_online": false,
  "estimated_audience": null,
  "ticket_price_range": "free|low|medium|high",
  "category": "conference|workshop|summit|forum|seminar|congress|other",
  "organizer_name": "nome ou null",
  "organizer_email": "email ou null",
  "organizer_phone": "telefone ou null",
  "organizer_url": "site ou null",
  "organizer_linkedin": "url ou null",
  "organizer_instagram": "url ou null",
  "accepts_speakers": true
}

Retorne APENAS um JSON array válido. Sem markdown, sem explicação.`;

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Você extrai dados estruturados de conteúdo de páginas web. Retorne APENAS JSON válido. Nunca invente dados — extraia apenas o que está presente no texto." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!res.ok) {
      console.error(`AI enrichment failed: ${res.status}`);
      return events;
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || "";

    let jsonStr = text.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const enrichments = JSON.parse(jsonStr);
    if (!Array.isArray(enrichments)) return events;

    const irrelevantIndices = new Set<number>();
    for (const enrichment of enrichments) {
      const idx = enrichment.index;
      if (idx >= 0 && idx < events.length) {
        if (enrichment.is_relevant === false) {
          irrelevantIndices.add(idx);
          continue;
        }
        const ev = events[idx];
        ev.event_date = enrichment.event_date || ev.event_date;
        ev.event_end_date = enrichment.event_end_date || ev.event_end_date;
        ev.location_city = enrichment.location_city || ev.location_city;
        ev.location_state = enrichment.location_state || ev.location_state;
        ev.location_venue = enrichment.location_venue || ev.location_venue;
        ev.is_online = enrichment.is_online ?? ev.is_online;
        ev.estimated_audience = enrichment.estimated_audience || ev.estimated_audience;
        ev.ticket_price_range = enrichment.ticket_price_range || ev.ticket_price_range;
        ev.category = enrichment.category || ev.category;
        ev.organizer_name = enrichment.organizer_name || ev.organizer_name;
        ev.organizer_email = enrichment.organizer_email || ev.organizer_email;
        ev.organizer_phone = enrichment.organizer_phone || ev.organizer_phone;
        ev.organizer_url = enrichment.organizer_url || ev.organizer_url;
        ev.organizer_linkedin = enrichment.organizer_linkedin || ev.organizer_linkedin;
        ev.organizer_instagram = enrichment.organizer_instagram || ev.organizer_instagram;
      }
    }

    return events.filter((_, i) => !irrelevantIndices.has(i));
  } catch (err) {
    console.error("AI enrichment error:", err);
    return events;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function detectPlatform(url: string): string {
  const lower = url.toLowerCase();
  if (lower.includes("sympla.com")) return "sympla";
  if (lower.includes("eventbrite.com")) return "eventbrite";
  if (lower.includes("even3.com")) return "even3";
  return "google";
}

function extractIdFromUrl(url: string): string {
  if (!url) return "";
  const match = url.match(/(\d+)\/?$/);
  return match ? match[1] : "";
}

function inferCategory(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("congresso")) return "congress";
  if (lower.includes("summit") || lower.includes("cúpula")) return "summit";
  if (lower.includes("fórum") || lower.includes("forum")) return "forum";
  if (lower.includes("workshop") || lower.includes("oficina")) return "workshop";
  if (lower.includes("seminário") || lower.includes("seminario")) return "seminar";
  if (lower.includes("conferência") || lower.includes("conferencia")) return "conference";
  return "other";
}

// ─── Theme matching & qualification ─────────────────────────────────────────
const THEME_KEYWORDS: Record<string, string[]> = {
  lideranca: ["liderança", "líder", "lider", "leadership", "gestão de pessoas", "C-level", "CEO"],
  gestao: ["gestão", "gestao", "management", "administração", "governança"],
  rh: ["rh", "recursos humanos", "people", "talent", "gente e gestão", "employer branding"],
  inovacao: ["inovação", "inovacao", "innovation", "transformação digital", "futuro do trabalho"],
  vendas: ["vendas", "sales", "comercial", "negociação", "prospecção"],
  marketing: ["marketing", "branding", "comunicação", "growth"],
  tecnologia: ["tecnologia", "tech", "TI", "software", "IA", "inteligência artificial", "AI"],
  empreendedorismo: ["empreendedorismo", "startup", "empreender", "negócio", "business"],
};

function matchThemes(text: string): string[] {
  const lower = text.toLowerCase();
  const matched: string[] = [];
  for (const [theme, keywords] of Object.entries(THEME_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw.toLowerCase()))) {
      matched.push(theme);
    }
  }
  return matched;
}

function qualifyEvent(event: RawEvent, searchKeywords: string[]): { score: number; themes: string[] } {
  const fullText = `${event.name} ${event.description}`.toLowerCase();
  const themes = matchThemes(fullText);
  let score = 0;

  score += Math.min(themes.length * 15, 40);

  const keywordMatches = searchKeywords.filter((kw) => fullText.includes(kw.toLowerCase())).length;
  score += Math.min((keywordMatches / Math.max(searchKeywords.length, 1)) * 25, 25);

  if (["conference", "congress", "summit", "forum"].includes(event.category)) score += 15;
  else if (["seminar", "workshop"].includes(event.category)) score += 10;

  if (event.platform_url) score += 5;
  if (event.organizer_name) score += 5;
  if (event.organizer_email) score += 5;
  if (event.organizer_phone) score += 5;

  return { score: Math.min(score, 100), themes };
}

// ─── Types ───────────────────────────────────────────────────────────────────
interface RawEvent {
  name: string;
  description: string;
  platform: string;
  platform_id: string;
  platform_url: string;
  event_date: string | null;
  event_end_date: string | null;
  location_city: string;
  location_state: string;
  location_venue: string;
  is_online: boolean;
  estimated_audience: number | null;
  ticket_price_range: string;
  category: string;
  organizer_name: string | null;
  organizer_url: string | null;
  organizer_email: string | null;
  organizer_phone: string | null;
  organizer_linkedin: string | null;
  organizer_instagram: string | null;
  raw_markdown?: string;
}

interface SearchResult extends RawEvent {
  themes: string[];
  qualification_score: number;
  fingerprint: string;
}

// ─── Main handler ────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { keywords, location, periodDays } = await req.json();

    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return new Response(
        JSON.stringify({ error: "keywords array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const maxDays = periodDays || 90;
    console.log(`Searching real events for: ${keywords.join(", ")} in ${location || "Brasil"} (next ${maxDays} days)`);

    const rawEvents = await searchRealEvents(keywords, location);

    // Qualify and build results
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const maxDate = new Date(today.getTime() + maxDays * 24 * 60 * 60 * 1000);
    const maxDateStr = maxDate.toISOString().split("T")[0];

    const results: SearchResult[] = rawEvents
      .map((event) => {
        const { score, themes } = qualifyEvent(event, keywords);
        const fingerprint = `${event.platform}:${event.platform_id || event.name.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 50)}`;
        const { raw_markdown, ...cleanEvent } = event;
        return { ...cleanEvent, themes, qualification_score: score, fingerprint };
      })
      // Filter: only future events within the period
      .filter((event) => {
        if (!event.event_date) return true;
        return event.event_date >= todayStr && event.event_date <= maxDateStr;
      });

    results.sort((a, b) => b.qualification_score - a.qualification_score);

    const filtered_count = rawEvents.length - results.length;
    console.log(`Found ${results.length} future events (filtered out ${filtered_count} past events)`);

    return new Response(
      JSON.stringify({
        events: results,
        total: results.length,
        platforms_searched: ["sympla", "eventbrite", "even3", "google"],
        keywords,
        source: "firecrawl_real_data",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("search-events error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
