import { checkPublicHttpUrl, isPrivateIPv4, isPrivateIPv6, publisherFromUrl } from "@/lib/url-safety";

export interface FetchedPage {
  finalUrl: string;
  title: string;
  publisher: string | null;
  publishedDate: string | null;
  text: string;
}

export class PageFetchError extends Error {}

/** Resolves a hostname via DNS-over-HTTPS and rejects private/reserved answers (SSRF defence). */
async function assertPublicDns(hostname: string) {
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname) || hostname.includes(":")) return;
  for (const type of ["A", "AAAA"] as const) {
    const res = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(hostname)}&type=${type}`, {
      headers: { accept: "application/dns-json" },
      signal: AbortSignal.timeout(6_000),
    }).catch(() => null);
    if (!res?.ok) continue;
    const json = (await res.json().catch(() => ({}))) as { Answer?: { type: number; data: string }[] };
    for (const a of json.Answer ?? []) {
      if (a.type === 1 && isPrivateIPv4(a.data)) throw new PageFetchError("That address points to a private network and cannot be fetched.");
      if (a.type === 28 && isPrivateIPv6(a.data)) throw new PageFetchError("That address points to a private network and cannot be fetched.");
    }
  }
}

function decodeEntities(s: string) {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)));
}

function meta(html: string, names: string[]): string | null {
  for (const name of names) {
    const re = new RegExp(`<meta[^>]+(?:property|name|itemprop)=["']${name}["'][^>]*content=["']([^"']+)["']`, "i");
    const re2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name|itemprop)=["']${name}["']`, "i");
    const m = html.match(re) ?? html.match(re2);
    if (m?.[1]) return decodeEntities(m[1]).trim();
  }
  return null;
}

export function htmlToText(html: string): string {
  const body = (html.match(/<article[\s\S]*?<\/article>/i)?.[0] ?? html.match(/<main[\s\S]*?<\/main>/i)?.[0] ?? html)
    .replace(/<(script|style|noscript|svg|nav|footer|header|form|iframe|template)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<\/(p|div|h[1-6]|li|br|tr|section|blockquote)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
  return decodeEntities(body).replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n\n").trim();
}

/** Fetches a public web page safely: validated URL, DNS check, manual redirects, size and type limits. */
export async function fetchPublicPage(rawUrl: string): Promise<FetchedPage> {
  let current = rawUrl;
  for (let hop = 0; hop < 5; hop++) {
    const check = checkPublicHttpUrl(current);
    if (!check.ok) throw new PageFetchError(check.reason);
    await assertPublicDns(check.url.hostname);
    let res: Response;
    try {
      res = await fetch(check.url.toString(), {
        redirect: "manual",
        headers: { "user-agent": "TRACE-ZERO-Investigator/1.0 (+research; respects robots)", accept: "text/html,text/plain;q=0.9" },
        signal: AbortSignal.timeout(15_000),
      });
    } catch {
      throw new PageFetchError("The page could not be reached. It may be offline, blocking automated access, or too slow.");
    }
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) throw new PageFetchError("The page redirected without a destination.");
      current = new URL(loc, check.url).toString();
      continue;
    }
    if (!res.ok) throw new PageFetchError(`The page responded with status ${res.status}, so its content could not be retrieved.`);
    const type = res.headers.get("content-type") ?? "";
    if (!/text\/html|text\/plain|application\/xhtml/i.test(type)) {
      throw new PageFetchError("That address is not a readable web page (only HTML and plain-text pages are supported).");
    }
    const reader = res.body?.getReader();
    if (!reader) throw new PageFetchError("The page returned no content.");
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > 1_500_000) {
        await reader.cancel();
        break;
      }
      chunks.push(value);
    }
    const buf = new Uint8Array(total > 1_500_000 ? chunks.reduce((n, c) => n + c.byteLength, 0) : total);
    let off = 0;
    for (const c of chunks) {
      buf.set(c, off);
      off += c.byteLength;
    }
    const html = new TextDecoder("utf-8", { fatal: false }).decode(buf);
    const isHtml = /html/i.test(type);
    const title =
      meta(html, ["og:title", "twitter:title"]) ??
      (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ? decodeEntities(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)![1]!).trim() : null) ??
      publisherFromUrl(check.url.toString()) ??
      "Submitted page";
    const text = (isHtml ? htmlToText(html) : html).slice(0, 18_000);
    if (text.length < 80) throw new PageFetchError("The page loaded but contained too little readable text to investigate (it may require JavaScript or a login).");
    return {
      finalUrl: check.url.toString(),
      title: title.slice(0, 300),
      publisher: meta(html, ["og:site_name", "application-name"]) ?? publisherFromUrl(check.url.toString()),
      publishedDate: meta(html, ["article:published_time", "datePublished", "pubdate", "date", "DC.date.issued"]),
      text,
    };
  }
  throw new PageFetchError("The page redirected too many times.");
}
