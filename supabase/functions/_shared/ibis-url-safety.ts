// FTN / IBIS Canonical Architecture -- Phase 5: shared outbound-URL safety check.
//
// Audit performed before writing this file: the only existing SSRF-style guard anywhere in this
// repo is `safeExternalUrl()` in ftn-owner-control/index.ts (lines 51-63) -- local to that one
// function, not exported, not in `_shared`. It is NOT modified here (out of scope / would risk that
// function's own owner-control behavior); this module is a generalized, exported equivalent so the
// new Retrieval Adapter (and any future caller needing to fetch a caller/search-supplied URL) has
// one shared, reviewed implementation instead of a second hand-rolled copy.
//
// Scope, honestly stated: this is a HOSTNAME/IP-LITERAL string check, exactly like the precedent it
// generalizes. It does NOT resolve DNS before fetching, so a public hostname that resolves to a
// private address at request time (classic DNS-rebinding SSRF) is not caught here -- Deno's global
// `fetch` performs its own DNS resolution internally with no pre-resolution hook this module can
// safely and portably intercept across every Supabase Edge Function runtime. This is a real,
// disclosed residual risk (identical to the one the precedent this file generalizes already has),
// not a claim of complete SSRF immunity.

export type UrlSafetyVerdict =
  | { safe: true; url: URL }
  | { safe: false; reason: string };

const PRIVATE_IPV4_PATTERNS = [
  /^127\./,            // loopback
  /^10\./,             // RFC1918
  /^0\./,              // "this network"
  /^169\.254\./,       // link-local (also covers cloud metadata endpoints, e.g. 169.254.169.254)
  /^192\.168\./,       // RFC1918
  /^172\.(1[6-9]|2\d|3[01])\./, // RFC1918
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, // RFC6598 carrier-grade NAT
];

function isPrivateOrLoopbackHost(hostname: string): boolean {
  // WHATWG URL.hostname includes the literal brackets for an IPv6 host (e.g. "[::1]", not "::1") --
  // stripped here before any of the IPv6 checks below, otherwise every one of them silently never
  // matches (a real bug caught by this file's own test suite: "https://[::1]/" was not being
  // rejected until this normalization was added).
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) return true;
  if (PRIVATE_IPV4_PATTERNS.some((p) => p.test(host))) return true;
  // IPv6 loopback (::1), unique-local (fc00::/7 -> "fc"/"fd" prefix), and link-local (fe80::/10).
  if (host === "::1" || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80")) return true;
  return false;
}

// Validates a URL a Retrieval Adapter (or any future caller) is about to fetch. Deliberately
// stricter than a browser's own same-origin policy has any reason to be: this runs server-side,
// with the Edge Function's own network egress and credentials, against a URL that ultimately
// originated from a search result or a user-influenced query -- never a URL this process itself
// generated. `https:` only (matches the existing precedent and this codebase's existing
// https-only source filter in ibis-canonical-brain.ts's sourcesFromSearch()); no embedded
// credentials; no localhost/private/link-local/carrier-grade-NAT targets.
export function validateExternalUrl(value: string): UrlSafetyVerdict {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { safe: false, reason: "INVALID_URL" };
  }
  if (url.protocol !== "https:") return { safe: false, reason: "NON_HTTPS_SCHEME" };
  if (url.username || url.password) return { safe: false, reason: "EMBEDDED_CREDENTIALS" };
  if (isPrivateOrLoopbackHost(url.hostname)) return { safe: false, reason: "PRIVATE_OR_LOOPBACK_HOST" };
  return { safe: true, url };
}
