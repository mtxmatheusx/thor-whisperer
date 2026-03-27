import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") || "AIzaSyAoeA62dvQouy2gfQBeuMeS7xB32KtGfus";

// ─── Search events using Gemini + Google Search grounding ────────────────────
async function searchEventsViaGemini(keywords: string[]): Promise<RawEvent[]> {
  const query = keywords.join(", ");

  const prompt = `Pesquise no Google eventos corporativos no Brasil sobre: ${query}

Busque em plataformas como Sympla, Eventbrite, Even3, Meetup, e sites de congressos/conferências.

Para CADA evento encontrado, extraia:
- name: nome do evento
- description: descrição breve (max 200 chars)
- platform: plataforma onde está (sympla, eventbrite, even3, meetup, google)
- platform_url: URL COMPLETA da página do evento (OBRIGATÓRIO - preciso do link real)
- event_date: data do evento (formato ISO se possível)
- event_end_date: data fim (se disponível)
- location_city: cidade
- location_state: estado (sigla)
- location_venue: local/venue
- is_online: true/false
- estimated_audience: estimativa de público (número)
- ticket_price_range: free, low, medium, high
- category: conference, workshop, summit, forum, seminar, congress, other
- organizer_name: nome do organizador/empresa
- organizer_email: email de contato (se encontrar na página)
- organizer_phone: telefone/WhatsApp (se encontrar)
- organizer_url: site ou rede social do organizador

IMPORTANTE:
- Retorne APENAS eventos REAIS que existem de verdade com URLs válidas
- Foque em eventos de 2025 e 2026
- Inclua TODOS os dados de contato que encontrar
- Retorne no MÍNIMO 5 eventos, idealmente 10-20
- Retorne APENAS um JSON array válido, sem markdown, sem explicação

Formato da resposta (APENAS o JSON array):
[{"name":"...","description":"...","platform":"...","platform_url":"...","event_date":"...","event_end_date":null,"location_city":"...","location_state":"...","location_venue":"...","is_online":false,"estimated_audience":null,"ticket_price_range":"medium","category":"conference","organizer_name":"...","organizer_email":null,"organizer_phone":null,"organizer_url":null}]`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          tools: [{ google_search: {} }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 8192,
          },
        }),
      },
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error(`Gemini API error ${res.status}: ${errText}`);

      // Fallback: try without google_search tool (basic model)
      return await searchEventsGeminiFallback(keywords);
    }

    const data = await res.json();

    // Extract text from response
    let text = "";
    for (const candidate of data.candidates || []) {
      for (const part of candidate.content?.parts || []) {
        if (part.text) text += part.text;
      }
    }

    if (!text) {
      console.error("Gemini returned empty response");
      return [];
    }

    // Parse JSON from response (handle markdown code blocks)
    let jsonStr = text.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    try {
      const events = JSON.parse(jsonStr);
      if (!Array.isArray(events)) return [];

      return events.map((ev: any) => ({
        name: ev.name || "Sem nome",
        description: (ev.description || "").slice(0, 500),
        platform: mapPlatform(ev.platform || ev.platform_url || "google"),
        platform_id: extractIdFromUrl(ev.platform_url || ""),
        platform_url: ev.platform_url || "",
        event_date: ev.event_date || null,
        event_end_date: ev.event_end_date || null,
        location_city: ev.location_city || "",
        location_state: ev.location_state || "",
        location_venue: ev.location_venue || "",
        is_online: ev.is_online || false,
        estimated_audience: ev.estimated_audience || null,
        ticket_price_range: ev.ticket_price_range || "medium",
        category: ev.category || inferCategory(ev.name || ""),
        organizer_name: ev.organizer_name || null,
        organizer_url: ev.organizer_url || null,
        organizer_email: ev.organizer_email || null,
        organizer_phone: ev.organizer_phone || null,
      }));
    } catch (parseErr) {
      console.error("Failed to parse Gemini response:", parseErr, "Raw:", jsonStr.slice(0, 500));
      return [];
    }
  } catch (err) {
    console.error("Gemini search failed:", err);
    return [];
  }
}

// ─── Fallback: Gemini without search grounding ───────────────────────────────
async function searchEventsGeminiFallback(keywords: string[]): Promise<RawEvent[]> {
  const query = keywords.join(", ");

  const prompt = `Liste eventos corporativos REAIS no Brasil sobre: ${query}

Foque em eventos conhecidos de 2025 e 2026. Para cada evento, forneça:
- name, description (breve), platform (sympla/eventbrite/even3/google), platform_url (URL real do evento)
- event_date, location_city, location_state, location_venue, is_online
- category (conference/workshop/summit/forum/seminar/congress)
- organizer_name, organizer_email, organizer_phone, organizer_url

Retorne APENAS um JSON array válido, sem explicação.
[{"name":"...","platform_url":"https://...","event_date":"2026-...","location_city":"São Paulo","location_state":"SP","organizer_name":"...","organizer_email":"...","organizer_phone":"..."}]`;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 8192,
          },
        }),
      },
    );

    if (!res.ok) {
      console.error(`Gemini fallback error: ${res.status}`);
      return [];
    }

    const data = await res.json();
    let text = "";
    for (const candidate of data.candidates || []) {
      for (const part of candidate.content?.parts || []) {
        if (part.text) text += part.text;
      }
    }

    let jsonStr = text.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const events = JSON.parse(jsonStr);
    if (!Array.isArray(events)) return [];

    return events.map((ev: any) => ({
      name: ev.name || "Sem nome",
      description: (ev.description || "").slice(0, 500),
      platform: mapPlatform(ev.platform || ev.platform_url || "google"),
      platform_id: extractIdFromUrl(ev.platform_url || ""),
      platform_url: ev.platform_url || "",
      event_date: ev.event_date || null,
      event_end_date: ev.event_end_date || null,
      location_city: ev.location_city || "",
      location_state: ev.location_state || "",
      location_venue: ev.location_venue || "",
      is_online: ev.is_online || false,
      estimated_audience: ev.estimated_audience || null,
      ticket_price_range: ev.ticket_price_range || "medium",
      category: ev.category || inferCategory(ev.name || ""),
      organizer_name: ev.organizer_name || null,
      organizer_url: ev.organizer_url || null,
      organizer_email: ev.organizer_email || null,
      organizer_phone: ev.organizer_phone || null,
    }));
  } catch (err) {
    console.error("Gemini fallback failed:", err);
    return [];
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function mapPlatform(input: string): string {
  const lower = (input || "").toLowerCase();
  if (lower.includes("sympla")) return "sympla";
  if (lower.includes("eventbrite")) return "eventbrite";
  if (lower.includes("even3")) return "even3";
  if (lower.includes("meetup")) return "google";
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
  lideranca: ["liderança", "líder", "lider", "leadership", "gestão de pessoas", "C-level", "CEO", "executive"],
  gestao: ["gestão", "gestao", "management", "administração", "governança", "processos"],
  rh: ["rh", "recursos humanos", "people", "talent", "gente e gestão", "cultura organizacional", "employer branding", "recrutamento"],
  cultura: ["cultura organizacional", "cultura corporativa", "employee experience", "engajamento", "clima organizacional"],
  inovacao: ["inovação", "inovacao", "innovation", "transformação digital", "digital", "futuro do trabalho"],
  estrategia: ["estratégia", "estrategia", "strategy", "planejamento", "OKR", "metas"],
  vendas: ["vendas", "sales", "comercial", "negociação", "prospecção"],
  marketing: ["marketing", "branding", "comunicação", "marca", "growth"],
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

  // Theme relevance (0-40)
  score += Math.min(themes.length * 15, 40);

  // Keyword match (0-25)
  const keywordMatches = searchKeywords.filter((kw) => fullText.includes(kw.toLowerCase())).length;
  score += Math.min((keywordMatches / searchKeywords.length) * 25, 25);

  // Category bonus (0-15)
  if (["conference", "congress", "summit", "forum"].includes(event.category)) score += 15;
  else if (["seminar", "workshop"].includes(event.category)) score += 10;

  // Has URL (0-5)
  if (event.platform_url) score += 5;

  // Has organizer info (0-10)
  if (event.organizer_name) score += 5;
  if (event.organizer_email || event.organizer_phone) score += 5;

  // Audience size (0-5)
  if (event.estimated_audience && event.estimated_audience >= 200) score += 5;

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
    const { keywords, platforms } = await req.json();

    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return new Response(
        JSON.stringify({ error: "keywords array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Search via Gemini + Google Search
    const rawEvents = await searchEventsViaGemini(keywords);

    // Qualify and build results
    const results: SearchResult[] = rawEvents.map((event) => {
      const { score, themes } = qualifyEvent(event, keywords);
      const fingerprint = `${event.platform}:${event.platform_id || event.name.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 50)}`;
      return { ...event, themes, qualification_score: score, fingerprint };
    });

    // Sort by qualification score descending
    results.sort((a, b) => b.qualification_score - a.qualification_score);

    return new Response(
      JSON.stringify({
        events: results,
        total: results.length,
        platforms_searched: ["google", "sympla", "eventbrite", "even3"],
        keywords,
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
