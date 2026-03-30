import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

// ─── Search events using Lovable AI Gateway ──────────────────────────────────
async function searchEventsViaAI(keywords: string[], location?: string): Promise<RawEvent[]> {
  if (!LOVABLE_API_KEY) {
    console.error("LOVABLE_API_KEY not configured");
    return [];
  }

  const query = keywords.join(", ");
  const locationHint = location ? ` na região de ${location}` : " no Brasil";

  const prompt = `Pesquise eventos corporativos REAIS de 2026${locationHint} sobre: ${query}

INSTRUÇÕES OBRIGATÓRIAS:
1. Busque APENAS eventos que acontecem em 2026 ou que ainda não têm data definida para 2026
2. Pesquise em: Sympla, Eventbrite, Even3, sites oficiais de congressos, conferências e summits
3. Para cada evento, extraia os DADOS DE CONTATO REAIS do organizador — busque na página do evento, no rodapé, na seção "sobre o organizador", "contato", etc.
4. NÃO INVENTE dados. Se não encontrar email ou telefone, deixe null.
5. Retorne entre 5 e 20 eventos relevantes

Para CADA evento retorne este JSON:
{
  "name": "Nome do evento",
  "description": "Descrição breve (max 200 chars)",
  "platform": "sympla|eventbrite|even3|google",
  "platform_url": "URL COMPLETA e REAL do evento",
  "event_date": "2026-MM-DD ou null",
  "event_end_date": "2026-MM-DD ou null",
  "location_city": "Cidade",
  "location_state": "UF",
  "location_venue": "Local/Venue",
  "is_online": false,
  "estimated_audience": 500,
  "ticket_price_range": "free|low|medium|high",
  "category": "conference|workshop|summit|forum|seminar|congress|other",
  "organizer_name": "Nome do organizador ou empresa organizadora",
  "organizer_email": "email@real.com ou null",
  "organizer_phone": "55119XXXXXXXX ou null",
  "organizer_url": "https://site-do-organizador.com ou null",
  "organizer_linkedin": "https://linkedin.com/company/... ou null",
  "organizer_instagram": "https://instagram.com/... ou null"
}

PRIORIZE eventos sobre: ${query}
FOCO: eventos corporativos, conferências, summits, congressos, fóruns de negócios
CONTATOS: busque email, telefone, WhatsApp, site e redes sociais do organizador

Retorne APENAS um JSON array válido. Sem markdown, sem explicação, sem texto adicional.`;

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
          {
            role: "system",
            content: "Você é um pesquisador especialista em encontrar eventos corporativos no Brasil. Retorne APENAS JSON válido, sem texto adicional. Foque em eventos de 2026. Extraia dados de contato reais dos organizadores.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error(`AI Gateway error ${res.status}: ${errText}`);
      return [];
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || "";

    if (!text) {
      console.error("AI returned empty response");
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
        organizer_linkedin: ev.organizer_linkedin || null,
        organizer_instagram: ev.organizer_instagram || null,
      }));
    } catch (parseErr) {
      console.error("Failed to parse AI response:", parseErr, "Raw:", jsonStr.slice(0, 500));
      return [];
    }
  } catch (err) {
    console.error("AI search failed:", err);
    return [];
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function mapPlatform(input: string): string {
  const lower = (input || "").toLowerCase();
  if (lower.includes("sympla")) return "sympla";
  if (lower.includes("eventbrite")) return "eventbrite";
  if (lower.includes("even3")) return "even3";
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

  // Has organizer info (0-15)
  if (event.organizer_name) score += 5;
  if (event.organizer_email) score += 5;
  if (event.organizer_phone) score += 5;

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
  organizer_linkedin: string | null;
  organizer_instagram: string | null;
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
    const { keywords, location } = await req.json();

    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return new Response(
        JSON.stringify({ error: "keywords array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const rawEvents = await searchEventsViaAI(keywords, location);

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
