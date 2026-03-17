const SUSPICIOUS_DOMAIN_KEYWORDS = [
  "game",
  "games",
  "jogo",
  "jogos",
  "bet",
  "casino",
  "slot",
  "slots",
  "porn",
  "adult",
  "apk",
  "mod",
  "hack",
  "download",
];

const LINKEDIN_HOSTS = new Set(["linkedin.com", "www.linkedin.com"]);

function normalizeUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(withProtocol);
    return url.toString();
  } catch {
    return null;
  }
}

function extractHostname(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getRootDomain(hostname: string | null): string | null {
  if (!hostname) return null;
  const parts = hostname.split(".").filter(Boolean);
  if (parts.length < 2) return hostname;
  return parts.slice(-2).join(".");
}

function looksSuspiciousDomain(hostname: string | null): boolean {
  if (!hostname) return true;
  return SUSPICIOUS_DOMAIN_KEYWORDS.some((keyword) => hostname.includes(keyword));
}

function isLikelyCompanyDomain(company: string, hostname: string | null): boolean {
  if (!hostname) return false;
  if (looksSuspiciousDomain(hostname)) return false;

  const companyTokens = slugify(company)
    .split(" ")
    .filter((token) => token.length >= 3);

  if (companyTokens.length === 0) return true;

  const hostnameText = slugify(hostname.replace(/^www\./, ""));
  return companyTokens.some((token) => hostnameText.includes(token));
}

function validateWebsite(company: string, value: unknown): string | null {
  const normalized = normalizeUrl(value);
  const hostname = extractHostname(normalized);

  if (!normalized || !hostname) return null;
  if (!isLikelyCompanyDomain(company, hostname)) return null;

  return normalized;
}

function validateLinkedIn(value: unknown): string | null {
  const normalized = normalizeUrl(value);
  const hostname = extractHostname(normalized);

  if (!normalized || !hostname || !LINKEDIN_HOSTS.has(hostname)) return null;

  const path = new URL(normalized).pathname;
  if (!/^\/(in|company)\//.test(path)) return null;

  return normalized;
}

function validateEmail(value: unknown, companyWebsite: string | null): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return null;

  const emailMatch = trimmed.match(/^[^\s@]+@([^\s@]+\.[^\s@]+)$/);
  if (!emailMatch) return null;

  const emailDomain = emailMatch[1];
  const websiteRoot = getRootDomain(extractHostname(companyWebsite));
  const emailRoot = getRootDomain(emailDomain);

  if (looksSuspiciousDomain(emailDomain)) return null;
  if (websiteRoot && emailRoot && websiteRoot !== emailRoot) return null;

  return trimmed;
}

function validatePhone(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 13) return null;
  if (!(digits.startsWith("55") || digits.length === 10 || digits.length === 11)) return null;

  return trimmed;
}

export function sanitizeProspect(raw: Record<string, unknown>) {
  const company = typeof raw.company === "string" ? raw.company.trim() : "";
  const companyWebsite = validateWebsite(company, raw.company_website);
  const linkedinUrl = validateLinkedIn(raw.linkedin_url);
  const email = validateEmail(raw.email, companyWebsite);
  const phone = validatePhone(raw.phone);

  return {
    ...raw,
    name: typeof raw.name === "string" ? raw.name.trim() : "",
    company,
    position: typeof raw.position === "string" ? raw.position.trim() : "",
    industry: typeof raw.industry === "string" ? raw.industry.trim() : "",
    company_size: typeof raw.company_size === "string" ? raw.company_size.trim() : "",
    location: typeof raw.location === "string" ? raw.location.trim() : "",
    email,
    linkedin_url: linkedinUrl,
    phone,
    company_website: companyWebsite,
    score: typeof raw.score === "number" ? Math.max(0, Math.min(100, raw.score)) : 0,
    reasoning: typeof raw.reasoning === "string" ? raw.reasoning.trim() : "",
    suggested_approach: typeof raw.suggested_approach === "string" ? raw.suggested_approach.trim() : "",
    pain_points: Array.isArray(raw.pain_points) ? raw.pain_points.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [],
    events_potential: Array.isArray(raw.events_potential) ? raw.events_potential.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [],
    contact_quality: email || linkedinUrl || phone || companyWebsite ? "partial" : "none",
  };
}

export function sanitizeExtractProspectsResponse(payload: Record<string, unknown>) {
  const rawProspects = Array.isArray(payload.prospects) ? payload.prospects : [];
  const prospects = rawProspects
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    .map(sanitizeProspect)
    .filter((prospect) => prospect.name && prospect.company);

  return {
    prospects,
    search_summary: typeof payload.search_summary === "string"
      ? payload.search_summary.trim()
      : "Os contatos exibidos foram filtrados para mostrar apenas links e canais minimamente válidos; quando a IA não tem confiança, o campo fica vazio.",
    total_found: prospects.length,
  };
}
