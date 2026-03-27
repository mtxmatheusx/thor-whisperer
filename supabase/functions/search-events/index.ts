import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Eventbrite search ───────────────────────────────────────────────────────
async function searchEventbrite(
  keywords: string[],
  location?: string,
): Promise<RawEvent[]> {
  const query = keywords.join(" ");
  const params = new URLSearchParams({
    q: query,
    "location.address": location || "Brasil",
    "location.within": "500km",
    expand: "venue,organizer",
    sort_by: "date",
  });

  // Eventbrite public search endpoint (no token needed for public events)
  const url = `https://www.eventbriteapi.com/v3/events/search/?${params}`;
  const token = Deno.env.get("EVENTBRITE_TOKEN");

  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(url, { headers });
    if (!res.ok) {
      console.error(`Eventbrite API error: ${res.status}`);
      return [];
    }
    const data = await res.json();
    return (data.events || []).map((ev: any) => ({
      name: ev.name?.text || ev.name?.html || "Sem nome",
      description: (ev.description?.text || "").slice(0, 500),
      platform: "eventbrite" as const,
      platform_id: ev.id,
      platform_url: ev.url,
      event_date: ev.start?.utc,
      event_end_date: ev.end?.utc,
      location_city: ev.venue?.address?.city || "",
      location_state: ev.venue?.address?.region || "",
      location_venue: ev.venue?.name || "",
      is_online: ev.online_event || false,
      estimated_audience: ev.capacity || null,
      ticket_price_range: ev.is_free ? "free" : "medium",
      category: inferCategory(ev.name?.text || ""),
      organizer_name: ev.organizer?.name || null,
      organizer_url: ev.organizer?.url || null,
    }));
  } catch (err) {
    console.error("Eventbrite fetch failed:", err);
    return [];
  }
}

// ─── Sympla search ───────────────────────────────────────────────────────────
async function searchSympla(keywords: string[]): Promise<RawEvent[]> {
  const query = keywords.join("+");
  const url = `https://www.sympla.com.br/api/v1/search?query=${encodeURIComponent(query)}&size=20&type=event`;

  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; ThorWhisperer/1.0)",
      },
    });

    if (!res.ok) {
      // Fallback: scrape Sympla search page
      return await scrapeSympla(keywords);
    }

    const data = await res.json();
    const events = data.data || data.events || data.results || [];
    return events.map((ev: any) => ({
      name: ev.name || ev.title || "Sem nome",
      description: (ev.description || ev.detail || "").slice(0, 500),
      platform: "sympla" as const,
      platform_id: String(ev.id),
      platform_url: ev.url || `https://www.sympla.com.br/evento/${ev.id}`,
      event_date: ev.start_date || ev.date || null,
      event_end_date: ev.end_date || null,
      location_city: ev.address?.city || ev.city || "",
      location_state: ev.address?.state || ev.state || "",
      location_venue: ev.address?.name || ev.location || "",
      is_online: ev.is_online || ev.modality === "online" || false,
      estimated_audience: ev.capacity || null,
      ticket_price_range: ev.is_free ? "free" : "medium",
      category: inferCategory(ev.name || ev.title || ""),
      organizer_name: ev.organizer?.name || null,
      organizer_url: null,
    }));
  } catch (err) {
    console.error("Sympla API failed, trying scrape:", err);
    return await scrapeSympla(keywords);
  }
}

// ─── Sympla fallback scraper ────────────────────────────────────────────────
async function scrapeSympla(keywords: string[]): Promise<RawEvent[]> {
  const query = keywords.join("+");
  const url = `https://www.sympla.com.br/eventos?s=${encodeURIComponent(query)}`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html",
      },
    });

    if (!res.ok) return [];

    const html = await res.text();
    const events: RawEvent[] = [];

    // Extract JSON-LD structured data if present
    const jsonLdMatches = html.matchAll(
      /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
    );
    for (const match of jsonLdMatches) {
      try {
        const ld = JSON.parse(match[1]);
        if (ld["@type"] === "Event" || (Array.isArray(ld) && ld[0]?.["@type"] === "Event")) {
          const items = Array.isArray(ld) ? ld : [ld];
          for (const item of items) {
            events.push({
              name: item.name || "Sem nome",
              description: (item.description || "").slice(0, 500),
              platform: "sympla",
              platform_id: "",
              platform_url: item.url || "",
              event_date: item.startDate || null,
              event_end_date: item.endDate || null,
              location_city: item.location?.address?.addressLocality || "",
              location_state: item.location?.address?.addressRegion || "",
              location_venue: item.location?.name || "",
              is_online:
                item.eventAttendanceMode?.includes("Online") || false,
              estimated_audience: null,
              ticket_price_range: "medium",
              category: inferCategory(item.name || ""),
              organizer_name: item.organizer?.name || null,
              organizer_url: null,
            });
          }
        }
      } catch {
        // skip invalid JSON-LD
      }
    }

    // Regex fallback for event cards
    if (events.length === 0) {
      const cardPattern =
        /data-event-id="(\d+)"[\s\S]*?class="[^"]*event-name[^"]*"[^>]*>([^<]+)/g;
      let cardMatch;
      while ((cardMatch = cardPattern.exec(html)) !== null) {
        events.push({
          name: cardMatch[2].trim(),
          description: "",
          platform: "sympla",
          platform_id: cardMatch[1],
          platform_url: `https://www.sympla.com.br/evento/${cardMatch[1]}`,
          event_date: null,
          event_end_date: null,
          location_city: "",
          location_state: "",
          location_venue: "",
          is_online: false,
          estimated_audience: null,
          ticket_price_range: "medium",
          category: inferCategory(cardMatch[2]),
          organizer_name: null,
          organizer_url: null,
        });
      }
    }

    return events.slice(0, 20);
  } catch (err) {
    console.error("Sympla scrape failed:", err);
    return [];
  }
}

// ─── Category inference ──────────────────────────────────────────────────────
function inferCategory(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("congresso")) return "congress";
  if (lower.includes("summit") || lower.includes("cúpula")) return "summit";
  if (lower.includes("fórum") || lower.includes("forum")) return "forum";
  if (lower.includes("workshop") || lower.includes("oficina"))
    return "workshop";
  if (lower.includes("seminário") || lower.includes("seminario"))
    return "seminar";
  if (lower.includes("conferência") || lower.includes("conferencia"))
    return "conference";
  return "other";
}

// ─── Theme matching & qualification ─────────────────────────────────────────
const THEME_KEYWORDS: Record<string, string[]> = {
  lideranca: [
    "liderança",
    "líder",
    "lider",
    "leadership",
    "gestão de pessoas",
    "C-level",
    "CEO",
    "executive",
  ],
  gestao: [
    "gestão",
    "gestao",
    "management",
    "administração",
    "governança",
    "processos",
  ],
  rh: [
    "rh",
    "recursos humanos",
    "people",
    "talent",
    "gente e gestão",
    "cultura organizacional",
    "employer branding",
    "recrutamento",
  ],
  cultura: [
    "cultura organizacional",
    "cultura corporativa",
    "employee experience",
    "engajamento",
    "clima organizacional",
  ],
  inovacao: [
    "inovação",
    "inovacao",
    "innovation",
    "transformação digital",
    "digital",
    "futuro do trabalho",
  ],
  estrategia: [
    "estratégia",
    "estrategia",
    "strategy",
    "planejamento",
    "OKR",
    "metas",
  ],
  vendas: ["vendas", "sales", "comercial", "negociação", "prospecção"],
  marketing: ["marketing", "branding", "comunicação", "marca", "growth"],
  tecnologia: [
    "tecnologia",
    "tech",
    "TI",
    "software",
    "IA",
    "inteligência artificial",
    "AI",
  ],
  empreendedorismo: [
    "empreendedorismo",
    "startup",
    "empreender",
    "negócio",
    "business",
  ],
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

function qualifyEvent(
  event: RawEvent,
  searchKeywords: string[],
): { score: number; themes: string[] } {
  const fullText = `${event.name} ${event.description}`.toLowerCase();
  const themes = matchThemes(fullText);
  let score = 0;

  // Theme relevance (0-40)
  score += Math.min(themes.length * 15, 40);

  // Keyword match (0-25)
  const keywordMatches = searchKeywords.filter((kw) =>
    fullText.includes(kw.toLowerCase()),
  ).length;
  score += Math.min((keywordMatches / searchKeywords.length) * 25, 25);

  // Category bonus (0-15)
  if (["conference", "congress", "summit", "forum"].includes(event.category))
    score += 15;
  else if (["seminar", "workshop"].includes(event.category)) score += 10;

  // Audience size (0-10)
  if (event.estimated_audience && event.estimated_audience >= 200) score += 10;
  else if (event.estimated_audience && event.estimated_audience >= 50)
    score += 5;

  // Has organizer (0-10)
  if (event.organizer_name) score += 10;

  return { score: Math.min(score, 100), themes };
}

// ─── Types ───────────────────────────────────────────────────────────────────
interface RawEvent {
  name: string;
  description: string;
  platform: "sympla" | "eventbrite";
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
    const { keywords, platforms, location } = await req.json();

    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return new Response(
        JSON.stringify({ error: "keywords array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const searchPlatforms: string[] = platforms || ["eventbrite", "sympla"];
    const results: SearchResult[] = [];

    // Search platforms in parallel
    const searches: Promise<RawEvent[]>[] = [];
    if (searchPlatforms.includes("eventbrite")) {
      searches.push(searchEventbrite(keywords, location));
    }
    if (searchPlatforms.includes("sympla")) {
      searches.push(searchSympla(keywords));
    }

    const allResults = await Promise.allSettled(searches);

    for (const result of allResults) {
      if (result.status === "fulfilled") {
        for (const event of result.value) {
          const { score, themes } = qualifyEvent(event, keywords);
          const fingerprint = `${event.platform}:${event.platform_id || event.name.toLowerCase().replace(/\s+/g, "-").slice(0, 50)}`;
          results.push({
            ...event,
            themes,
            qualification_score: score,
            fingerprint,
          });
        }
      }
    }

    // Sort by qualification score descending
    results.sort((a, b) => b.qualification_score - a.qualification_score);

    return new Response(
      JSON.stringify({
        events: results,
        total: results.length,
        platforms_searched: searchPlatforms,
        keywords,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("search-events error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
