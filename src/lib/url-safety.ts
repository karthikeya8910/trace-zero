/** Pure URL safety helpers shared by the server-side URL fetcher (SSRF protection). */

const BLOCKED_SUFFIXES = [".localhost", ".local", ".internal", ".lan", ".home", ".corp", ".intranet", ".arpa"];

export function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map((p) => Number(p));
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  const [a = 0, b = 0, c = 0] = parts;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 192 && b === 0 && (c === 0 || c === 2)) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  if (a === 198 && b === 51 && c === 100) return true;
  if (a === 203 && b === 0 && c === 113) return true;
  if (a >= 224) return true;
  return false;
}

export function isPrivateIPv6(ip: string): boolean {
  const v = ip.toLowerCase().replace(/^\[|\]$/g, "");
  if (v === "::" || v === "::1") return true;
  if (v.startsWith("::ffff:")) {
    const tail = v.slice(7);
    return tail.includes(".") ? isPrivateIPv4(tail) : true;
  }
  const first = v.split(":")[0] ?? "";
  const n = parseInt(first || "0", 16);
  if ((n & 0xfe00) === 0xfc00) return true; // fc00::/7 unique local
  if ((n & 0xffc0) === 0xfe80) return true; // fe80::/10 link local
  if ((n & 0xff00) === 0xff00) return true; // multicast
  if (v.startsWith("2001:db8") || v.startsWith("64:ff9b")) return true;
  return false;
}

export type UrlCheck = { ok: true; url: URL } | { ok: false; reason: string };

/** Accepts only public http(s) URLs on standard ports without credentials or private hosts. */
export function checkPublicHttpUrl(raw: string): UrlCheck {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return { ok: false, reason: "This is not a valid web address." };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, reason: "Only http and https addresses can be investigated." };
  }
  if (url.username || url.password) {
    return { ok: false, reason: "Addresses containing login details are not allowed." };
  }
  if (url.port && url.port !== "80" && url.port !== "443") {
    return { ok: false, reason: "Only standard web ports are allowed." };
  }
  const host = url.hostname.toLowerCase();
  if (!host || host === "localhost" || BLOCKED_SUFFIXES.some((s) => host.endsWith(s))) {
    return { ok: false, reason: "Private or local network addresses cannot be investigated." };
  }
  if (host.startsWith("[") || host.includes(":")) {
    return isPrivateIPv6(host)
      ? { ok: false, reason: "Private or local network addresses cannot be investigated." }
      : { ok: true, url };
  }
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    return isPrivateIPv4(host)
      ? { ok: false, reason: "Private or local network addresses cannot be investigated." }
      : { ok: true, url };
  }
  if (!host.includes(".")) {
    return { ok: false, reason: "Enter a full public web address, such as https://example.org/article." };
  }
  if (raw.length > 2048) return { ok: false, reason: "That address is too long." };
  return { ok: true, url };
}

/** Normalises URLs so the same page is stored once per investigation. */
export function normalizeUrl(raw: string): string {
  try {
    const u = new URL(raw);
    u.hash = "";
    for (const key of [...u.searchParams.keys()]) {
      if (/^(utm_|fbclid|gclid|mc_cid|mc_eid|ref$|ref_src)/i.test(key)) u.searchParams.delete(key);
    }
    u.hostname = u.hostname.toLowerCase().replace(/^www\./, "");
    let s = u.toString();
    if (s.endsWith("/") && u.pathname !== "/") s = s.slice(0, -1);
    return s;
  } catch {
    return raw.trim();
  }
}

export function publisherFromUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    return new URL(raw).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** Domain heuristic; the examine stage may refine it. */
export function classifyDomain(raw: string | null | undefined): "official" | "reference" | "independent" {
  const host = publisherFromUrl(raw) ?? "";
  if (/(^|\.)(gov|mil)(\.[a-z]{2})?$/.test(host) || /\.gov\.[a-z]{2}$/.test(host) || /\.gouv\.[a-z]{2}$/.test(host)) return "official";
  if (/(^|\.)(who\.int|un\.org|europa\.eu|worldbank\.org|imf\.org|oecd\.org|nic\.in|gc\.ca|parliament\.uk)$/.test(host)) return "official";
  if (/(^|\.)(edu|ac\.[a-z]{2})$/.test(host) || /wikipedia\.org$|britannica\.com$|doi\.org$|nature\.com$|science\.org$|nih\.gov$/.test(host)) return "reference";
  return "independent";
}
