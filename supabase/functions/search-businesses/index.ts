const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const FIRECRAWL_API = "https://api.firecrawl.dev/v1";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: "Firecrawl não configurado" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { segment, city, state, limit = 10 } = await req.json();

    if (!segment) {
      return new Response(
        JSON.stringify({ success: false, error: "Segmento é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build search query optimized for finding businesses with contact info
    const location = [city, state].filter(Boolean).join(", ");
    const query = `${segment} ${location ? `em ${location}` : "Brasil"} contato email telefone Instagram`;

    console.log("Searching businesses:", query);

    // Step 1: Search via Firecrawl
    const searchRes = await fetch(`${FIRECRAWL_API}/search`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        limit: Math.min(limit, 20),
        lang: "pt-br",
        country: "BR",
        scrapeOptions: { formats: ["markdown", "links"] },
      }),
    });

    const searchData = await searchRes.json();

    if (!searchRes.ok) {
      console.error("Firecrawl search error:", searchData);
      return new Response(
        JSON.stringify({ success: false, error: searchData.error || "Erro na busca" }),
        { status: searchRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = searchData.data || searchData.results || [];
    console.log(`Found ${results.length} raw results`);

    // Step 2: Extract business info from each result
    const businesses: any[] = [];

    for (const result of results) {
      const markdown = result.markdown || "";
      const url = result.url || "";
      const title = result.title || "";

      // Skip irrelevant results
      if (isIrrelevantUrl(url)) continue;

      const business = extractBusinessInfo(markdown, title, url, segment, city, state);
      if (business.business_name) {
        businesses.push(business);
      }
    }

    console.log(`Extracted ${businesses.length} businesses`);

    return new Response(
      JSON.stringify({
        success: true,
        businesses,
        total: businesses.length,
        query,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function isIrrelevantUrl(url: string): boolean {
  const blocked = [
    "facebook.com", "twitter.com", "tiktok.com", "youtube.com",
    "wikipedia.org", "reddit.com", "pinterest.com",
    "bet", "casino", "jogo", "slot",
  ];
  const lower = url.toLowerCase();
  return blocked.some((b) => lower.includes(b));
}

function extractBusinessInfo(
  markdown: string,
  title: string,
  url: string,
  segment: string,
  city: string,
  state: string
) {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const phoneRegex = /(?:\+55\s?)?(?:\(?\d{2}\)?\s?)?\d{4,5}[-.\s]?\d{4}/g;
  const instagramRegex = /(?:instagram\.com\/|@)([a-zA-Z0-9_.]+)/gi;
  const linkedinRegex = /linkedin\.com\/(?:in|company)\/([a-zA-Z0-9_-]+)/gi;
  const whatsappRegex = /(?:wa\.me\/|whatsapp[^0-9]*?)(\+?\d{10,13})/gi;

  const text = `${title}\n${markdown}`;

  // Extract emails (filter out generic/image emails)
  const emails = (text.match(emailRegex) || []).filter(
    (e) => !e.includes("example.com") && !e.includes("sentry") && !e.endsWith(".png") && !e.endsWith(".jpg")
  );

  // Extract phones
  const phones = (text.match(phoneRegex) || []).filter((p) => {
    const digits = p.replace(/\D/g, "");
    return digits.length >= 10 && digits.length <= 13;
  });

  // Extract WhatsApp
  const whatsapps = [...text.matchAll(whatsappRegex)].map((m) => m[1]);

  // Extract Instagram
  const instagrams = [...text.matchAll(instagramRegex)]
    .map((m) => m[1])
    .filter((h) => !["p", "reel", "stories", "explore", "tv"].includes(h));

  // Extract LinkedIn
  const linkedins = [...text.matchAll(linkedinRegex)].map((m) => m[1]);

  // Try to extract business name from title
  let businessName = title
    .replace(/\s*[-|–—]\s*.*/g, "") // Remove " - Site description"
    .replace(/\s*\|.*/, "")
    .trim();

  if (!businessName || businessName.length < 3) {
    businessName = new URL(url).hostname.replace("www.", "").split(".")[0];
    businessName = businessName.charAt(0).toUpperCase() + businessName.slice(1);
  }

  // Extract rating from Google
  const ratingMatch = text.match(/(\d[.,]\d)\s*(?:estrelas?|stars?|⭐)/i);
  const reviewMatch = text.match(/(\d+)\s*(?:avaliações?|reviews?|comentários?)/i);

  return {
    business_name: businessName,
    segment,
    city: city || "",
    state: state || "",
    email: emails[0] || null,
    phone: phones[0] || whatsapps[0] || null,
    instagram: instagrams[0] ? `@${instagrams[0]}` : null,
    linkedin: linkedins[0] ? `https://linkedin.com/company/${linkedins[0]}` : null,
    website: url,
    rating: ratingMatch ? parseFloat(ratingMatch[1].replace(",", ".")) : null,
    review_count: reviewMatch ? parseInt(reviewMatch[1]) : null,
    source: "firecrawl",
    confidence: emails[0] ? "high" : phones[0] ? "medium" : "low",
  };
}
