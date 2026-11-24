import { classifyDomain, normalizeUrl, publisherFromUrl, checkPublicHttpUrl } from "@/lib/url-safety";

export interface SearchHit {
  title: string;
  url: string;
  publisher: string | null;
  publishedDate: string | null;
  content: string;
  fullContent: boolean;
  sourceType: "official" | "reference" | "independent";
}

export type SearchProvider = "tavily" | "firecrawl";

export function searchProvider(): SearchProvider | null {
  if (process.env["TAVILY_API_KEY"]) return "tavily";
  if (process.env["FIRECRAWL_API_KEY"]) return "firecrawl";
  return null;
}

export class SearchError extends Error {}

function clip(text: string, max: number) {
  const t = text.replace(/\s+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

async function tavily(query: string, limit: number): Promise<SearchHit[]> {
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env["TAVILY_API_KEY"]}` },
    body: JSON.stringify({ query, search_depth: "advanced", max_results: limit, include_answer: false, include_raw_content: true }),
    signal: AbortSignal.timeout(25_000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new SearchError(`Web search failed (${res.status}). ${body.slice(0, 160)}`);
  }
  const json = (await res.json()) as {
    results?: { title?: string; url?: string; content?: string; raw_content?: string | null; published_date?: string }[];
  };
  return (json.results ?? [])
    .filter((r) => r.url && checkPublicHttpUrl(r.url).ok)
    .map((r) => {
      const full = (r.raw_content ?? "").length > 400;
      return {
        title: r.title?.trim() || publisherFromUrl(r.url) || "Untitled source",
        url: r.url!,
        publisher: publisherFromUrl(r.url),
        publishedDate: r.published_date ?? null,
        content: clip(full ? r.raw_content! : r.content ?? "", 3500),
        fullContent: full,
        sourceType: classifyDomain(r.url),
      };
    });
}

async function firecrawl(query: string, limit: number): Promise<SearchHit[]> {
  const key = process.env["FIRECRAWL_API_KEY"]!;
  const gateway = key.startsWith("lovc_");
  const base = gateway ? "https://connector-gateway.lovable.dev/firecrawl/v2" : "https://api.firecrawl.dev/v2";
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (gateway) {
    headers["Authorization"] = `Bearer ${process.env["LOVABLE_API_KEY"] ?? ""}`;
    headers["X-Connection-Api-Key"] = key;
  } else {
    headers["Authorization"] = `Bearer ${key}`;
  }
  const res = await fetch(`${base}/search`, {
    method: "POST",
    headers,
    body: JSON.stringify({ query, limit, scrapeOptions: { formats: ["markdown"], onlyMainContent: true } }),
    signal: AbortSignal.timeout(45_000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new SearchError(`Web search failed (${res.status}). ${body.slice(0, 160)}`);
  }
  const json = (await res.json()) as {
    data?: { web?: { url?: string; title?: string; description?: string; markdown?: string; metadata?: Record<string, unknown> }[] };
  };
  return (json.data?.web ?? [])
    .filter((r) => r.url && checkPublicHttpUrl(r.url).ok)
    .map((r) => {
      const md = r.markdown ?? "";
      const meta = r.metadata ?? {};
      const date =
        (meta["publishedTime"] as string | undefined) ??
        (meta["article:published_time"] as string | undefined) ??
        (meta["datePublished"] as string | undefined) ??
        null;
      return {
        title: (r.title || (meta["title"] as string | undefined) || publisherFromUrl(r.url) || "Untitled source").trim(),
        url: r.url!,
        publisher: (meta["ogSiteName"] as string | undefined) ?? publisherFromUrl(r.url),
        publishedDate: date,
        content: clip(md.length > 400 ? md : r.description ?? md, 3500),
        fullContent: md.length > 400,
        sourceType: classifyDomain(r.url),
      };
    });
}

export async function webSearch(query: string, limit = 5): Promise<SearchHit[]> {
  const provider = searchProvider();
  if (!provider) throw new SearchError("No web-search provider is configured.");
  const hits = provider === "tavily" ? await tavily(query, limit) : await firecrawl(query, limit);
  const seen = new Set<string>();
  return hits.filter((h) => {
    const k = normalizeUrl(h.url);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
