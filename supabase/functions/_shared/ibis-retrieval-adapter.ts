// FTN / IBIS Canonical Architecture -- Phase 5: the Retrieval Adapter.
//
// Audit performed before writing this file (per the explicit "reuse existing infrastructure, do not
// create parallel architectures" instruction):
//   - SourceRecord (ibis-response-envelope.ts / ibis-search-types.ts): reused as the update target.
//     evidenceDepth's union is extended (in both files) with "RETRIEVED_PAGE" and "PRIMARY_DOCUMENT"
//     -- additive, so every existing "SNIPPET" | "INSPECTED" comparison anywhere in the codebase
//     keeps working unchanged; nothing currently produces "INSPECTED" (confirmed by a full-repo grep
//     before this file was written) or the two new values until this module runs.
//   - AUTHORITATIVE_GOVERNMENT_DOMAINS (ibis-search-quality-gate.ts): reused verbatim for the
//     PRIMARY_DOCUMENT classification's domain check -- no new authority registry invented.
//   - EvidencePacket.gaps / EvidenceGap (ibis-evidence-processor.ts): reused as the ONLY input this
//     module reads to decide whether/what to fetch -- it never independently re-judges sufficiency.
//   - validateExternalUrl (ibis-url-safety.ts, new this phase): the one shared SSRF/URL-safety check,
//     itself a generalization of ftn-owner-control/index.ts's existing safeExternalUrl() -- see that
//     module's own header for the residual-risk disclosure (no DNS-rebinding protection).
//   - No existing HTML/PDF extraction library or module exists anywhere in this repo (confirmed by a
//     full-repo grep for cheerio/linkedom/pdf-parse/deno_dom/jsdom before writing this file, and no
//     deno.json/import_map.json exists to declare one). This module therefore does its own minimal,
//     regex-based structural extraction (title, meta-tag dates, plain text) -- the same discipline
//     ftn-news-sources/index.ts's existing parseArticles()/parseLinks() already use for the one other
//     place in this repo that scrapes HTML, not a new dependency.
//
// Canonical flow (per the Phase 5 directive): a pre-retrieval EvidencePacket (built from SNIPPET-only
// sources) names its own gaps -> selectRetrievalTargets() picks a small, bounded, prioritized subset
// of sources whose inspection could plausibly close one of those gaps -> fetchSource() safely fetches
// each -> applyRetrievalResults() produces an UPDATED SourceRecord[] -> the caller (ibis-canonical-
// brain.ts) reruns processEvidence() on the updated sources to get the FINAL EvidencePacket. This
// module never calls processEvidence() itself and never decides evidenceState -- it only fetches and
// extracts, honestly, within a hard bound.
//
// SHADOW AUTHORITY REMAINS (per the Phase 5 directive's own explicit instruction): even after
// retrieval strengthens evidence, nothing in this module or its caller lets the resulting
// EvidencePacket block or rewrite the user-visible answer. It is still attached to the receipt purely
// for observability, exactly like every Phase 1-4 structure before it.

import type { SourceRecord } from "./ibis-response-envelope.ts";
import type { EvidencePacket, EvidenceGapType } from "./ibis-evidence-processor.ts";
import type { EvidenceContract } from "./ibis-evidence-contract.ts";
import { validateExternalUrl } from "./ibis-url-safety.ts";
import { AUTHORITATIVE_GOVERNMENT_DOMAINS } from "./ibis-search-quality-gate.ts";

// --- Bounds (exported so tests can assert against the real, current values rather than magic numbers)
export const MAX_RETRIEVALS_PER_REQUEST = 3;
export const RETRIEVAL_TIMEOUT_MS = 8_000;
export const RETRIEVAL_MAX_BYTES = 2_000_000; // 2 MB -- enough for an article or a PDF's opening pages' worth of bytes, small enough to bound worst-case latency/memory.
export const MAX_REDIRECTS = 3;

// Gap types a page/document fetch could plausibly close. Deliberately excludes ACTION_NOT_EXECUTED_GAP
// (fetching a page cannot execute an action) and EXECUTION_PLAN_GAP/RETRIEVAL_EMPTY_GAP (there is no
// source to inspect at all in either case -- retrieval needs a candidate URL, not zero of them).
const RETRIEVAL_ADDRESSABLE_GAPS: ReadonlySet<EvidenceGapType> = new Set([
  "PAGE_INSPECTION_UNAVAILABLE_GAP",
  "TEMPORAL_GAP",
  "OFFICIAL_SOURCE_GAP",
]);

export type RetrievalTarget = {
  url: string;
  sourceIndex: number; // index into the ORIGINAL sources[] array this module was given
  priorityReason: string;
};

// Item D's suggested conceptual depth states, applied conservatively (Item D: "Classification must
// be conservative"). RETRIEVED_PAGE: a genuine HTML page body was fetched and read. PRIMARY_DOCUMENT:
// the fetched resource is a PDF/document served from a known official-government domain -- the one
// case this module is willing to call "primary official record" without a human review step. Every
// other successfully-fetched, supported document (a PDF from an unclassified domain, say) stays
// RETRIEVED_PAGE: a real fetch happened, but "primary official record" was not established.
export type RetrievalOutcome =
  | "RETRIEVED_PAGE"
  | "PRIMARY_DOCUMENT"
  | "SKIPPED_UNSAFE_URL"
  | "SKIPPED_TIMEOUT"
  | "SKIPPED_TOO_LARGE"
  | "SKIPPED_UNSUPPORTED_CONTENT_TYPE"
  | "SKIPPED_HTTP_ERROR"
  | "SKIPPED_TOO_MANY_REDIRECTS"
  | "SKIPPED_FETCH_ERROR";

export type RetrievalReceipt = {
  url: string;
  sourceIndex: number;
  outcome: RetrievalOutcome;
  reason: string;
  contentType: string | null;
  httpStatus: number | null;
  bytesRead: number;
  extractedTitle: string | null;
  extractedPublishedAt: string | null;
  extractedUpdatedAt: string | null;
  extractedText: string | null;
  accessedAt: string;
};

// --- E. Selection: EvidenceContract/EvidencePacket-driven, bounded, prioritized -------------------

// Priority order exactly as specified by the Phase 5 directive:
//   1. official/primary candidate; 2. source needed for temporal validation; 3. source needed for
//   exact eligibility/rule (PATHWAY queries); 4. source needed to resolve a contradiction;
//   5. strongest relevant source; 6. a second independent source when corroboration is preferred.
// Implemented as a numeric rank (lower = higher priority) rather than six separate passes, so a
// source matching multiple tiers is still only ever selected once, at its best-earned rank.
function rankSource(item: EvidencePacket["items"][number], evidenceContract: EvidenceContract, contradictionEvidenceIds: Set<string>): number | null {
  if (item.origin !== "SEARCH_RESULT" || item.evidenceDepth !== "SNIPPET" || !item.url) return null; // nothing to gain re-fetching a non-snippet or non-URL item
  if (item.officialClassification === "OFFICIAL_GOVERNMENT") return 1;
  if (item.temporalRelevance === "UNKNOWN") return 2;
  if (evidenceContract.queryClass === "PATHWAY") return 3;
  if (contradictionEvidenceIds.has(item.id)) return 4;
  return 5; // "strongest relevant source" -- every remaining snippet-depth item, in original (relevance-ordered) order
}

export function selectRetrievalTargets(
  sources: SourceRecord[],
  evidencePacket: EvidencePacket,
  evidenceContract: EvidenceContract,
): RetrievalTarget[] {
  const addressable = evidencePacket.gaps.some((g) => RETRIEVAL_ADDRESSABLE_GAPS.has(g.type));
  if (!addressable) return [];

  const contradictionEvidenceIds = new Set<string>();
  for (const c of evidencePacket.contradictions) for (const id of c.evidenceIds) contradictionEvidenceIds.add(id);

  const ranked = evidencePacket.items
    .map((item, i) => ({ item, i, rank: rankSource(item, evidenceContract, contradictionEvidenceIds) }))
    .filter((r): r is { item: typeof r.item; i: number; rank: number } => r.rank !== null)
    .sort((a, b) => a.rank - b.rank);

  const priorityLabel: Record<number, string> = {
    1: "official/primary-government source",
    2: "temporal validation could not be resolved from the snippet alone",
    3: "PATHWAY query -- exact eligibility/rule detail requires page-level inspection",
    4: "referenced by an unresolved contradiction",
    5: "strongest remaining relevant source",
  };

  const targets: RetrievalTarget[] = [];
  const seenUrls = new Set<string>();
  for (const { item, i, rank } of ranked) {
    if (targets.length >= MAX_RETRIEVALS_PER_REQUEST) break;
    if (!item.url || seenUrls.has(item.url)) continue;
    seenUrls.add(item.url);
    targets.push({ url: item.url, sourceIndex: findSourceIndex(sources, item.url, i), priorityReason: priorityLabel[rank] });
  }

  // Tier 6: a second, INDEPENDENT source when the contract prefers corroboration and fewer than two
  // independent groups exist yet. Only added if room remains under the bound.
  if (
    targets.length < MAX_RETRIEVALS_PER_REQUEST &&
    evidenceContract.sufficiency === "CORROBORATION_PREFERRED" &&
    evidencePacket.independentSourceCount < 2
  ) {
    const chosenHosts = new Set(targets.map((t) => hostnameOfSafe(t.url)));
    const second = evidencePacket.items.find((item) =>
      item.origin === "SEARCH_RESULT" && item.evidenceDepth === "SNIPPET" && item.url &&
      !seenUrls.has(item.url) && !chosenHosts.has(hostnameOfSafe(item.url)));
    if (second?.url) {
      targets.push({ url: second.url, sourceIndex: findSourceIndex(sources, second.url, -1), priorityReason: "second independent source for corroboration" });
    }
  }

  return targets.slice(0, MAX_RETRIEVALS_PER_REQUEST);
}

function findSourceIndex(sources: SourceRecord[], url: string, fallback: number): number {
  const idx = sources.findIndex((s) => s.url === url);
  return idx >= 0 ? idx : fallback;
}

function hostnameOfSafe(url: string | null): string | null {
  if (!url) return null;
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return null; }
}

// --- C/D/E. Safe fetch + conservative extraction ---------------------------------------------------

function isGovernmentHost(hostname: string): boolean {
  return AUTHORITATIVE_GOVERNMENT_DOMAINS.some((d) => hostname === d || hostname.endsWith(`.${d}`));
}

// Structured-metadata-only date extraction (RULE-equivalent to the Evidence Processor's own RULE 9):
// only attribute values from recognized meta/time tags -- NEVER a date-like string found in free
// body text, which would risk conflating an arbitrary in-body date with real publication/update
// metadata. Each candidate is validated as a parseable date before being trusted.
const PUBLISHED_META_PATTERNS = [
  /<meta[^>]+property=["']article:published_time["'][^>]+content=["']([^"']+)["']/i,
  /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']article:published_time["']/i,
  /<meta[^>]+name=["']date["'][^>]+content=["']([^"']+)["']/i,
  /<meta[^>]+name=["']publish-date["'][^>]+content=["']([^"']+)["']/i,
  /<time[^>]+datetime=["']([^"']+)["'][^>]*>/i,
];
const UPDATED_META_PATTERNS = [
  /<meta[^>]+property=["']article:modified_time["'][^>]+content=["']([^"']+)["']/i,
  /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']article:modified_time["']/i,
  /<meta[^>]+property=["']og:updated_time["'][^>]+content=["']([^"']+)["']/i,
];
const TITLE_PATTERNS = [
  /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
  /<title[^>]*>([^<]+)<\/title>/i,
];

function extractFirstValidDate(html: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      const iso = new Date(match[1]).toISOString();
      if (!Number.isNaN(new Date(match[1]).getTime())) return iso;
    }
  }
  return null;
}

function extractTitle(html: string): string | null {
  for (const pattern of TITLE_PATTERNS) {
    const match = html.match(pattern);
    if (match?.[1]) return decodeHtmlEntities(match[1].trim()).slice(0, 300);
  }
  return null;
}

function decodeHtmlEntities(text: string): string {
  return text.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ");
}

// Deliberately crude, regex-based text extraction -- same discipline as the one other place in this
// repo that scrapes HTML (ftn-news-sources/index.ts's parseArticles()), not a DOM parser (none is a
// dependency of this repo -- see this file's header audit). Strips script/style blocks, then all
// remaining tags, collapsing whitespace. Never claims semantic "main content" extraction -- just a
// bounded, honest plain-text rendering of the fetched page, used as the item's updated `snippet`.
function extractPlainText(html: string, maxChars: number): string {
  const withoutScripts = html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ");
  const withoutTags = withoutScripts.replace(/<[^>]+>/g, " ");
  const collapsed = decodeHtmlEntities(withoutTags).replace(/\s+/g, " ").trim();
  return collapsed.slice(0, maxChars);
}

// Manual redirect handling (Item C: "handle redirects safely") -- `redirect: "manual"` so each hop's
// Location header is validated by the SAME validateExternalUrl() check as the original URL before
// ever being followed, rather than trusting the runtime's automatic redirect follower to land
// somewhere this module never inspected.
async function safeFetchFollowingRedirects(startUrl: string, timeoutMs: number, fetchImpl: typeof fetch): Promise<{ response: Response; finalUrl: string } | { error: RetrievalOutcome; reason: string }> {
  let currentUrl = startUrl;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const verdict = validateExternalUrl(currentUrl);
    if (!verdict.safe) return { error: "SKIPPED_UNSAFE_URL", reason: verdict.reason };
    let response: Response;
    try {
      response = await fetchImpl(verdict.url.toString(), {
        method: "GET",
        redirect: "manual",
        headers: { "user-agent": "FTN-ibis-retrieval-adapter/1.0 (+https://ftnplatform.org)", accept: "text/html,application/pdf,text/plain" },
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "TimeoutError") return { error: "SKIPPED_TIMEOUT", reason: "Fetch exceeded the retrieval timeout." };
      return { error: "SKIPPED_FETCH_ERROR", reason: error instanceof Error ? error.message : "Unknown fetch error." };
    }
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) return { error: "SKIPPED_HTTP_ERROR", reason: `HTTP ${response.status} redirect with no Location header.` };
      currentUrl = new URL(location, currentUrl).toString();
      continue;
    }
    if (!response.ok) return { error: "SKIPPED_HTTP_ERROR", reason: `HTTP_${response.status}` };
    return { response, finalUrl: currentUrl };
  }
  return { error: "SKIPPED_TOO_MANY_REDIRECTS", reason: `Exceeded ${MAX_REDIRECTS} redirects.` };
}

// Reads the body up to RETRIEVAL_MAX_BYTES, aborting early if the stream exceeds it -- never trusts
// a Content-Length header alone (Item C: "cap response size" against a server that lies about it).
async function readBodyBounded(response: Response, maxBytes: number): Promise<{ text: string; truncatedOrOversize: boolean }> {
  const reader = response.body?.getReader();
  if (!reader) return { text: await response.text(), truncatedOrOversize: false };
  const decoder = new TextDecoder();
  let total = 0;
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) { await reader.cancel().catch(() => {}); return { text, truncatedOrOversize: true }; }
    text += decoder.decode(value, { stream: true });
  }
  return { text, truncatedOrOversize: false };
}

// `fetchImpl` defaults to the real global `fetch` -- tests inject a fake implementation, exactly
// like ibis-search-adapter.ts's own `searchFetchImpl` convention (never a global fetch monkeypatch).
export async function fetchSource(target: RetrievalTarget, fetchImpl: typeof fetch = fetch): Promise<RetrievalReceipt> {
  const accessedAt = new Date().toISOString();
  const base = { url: target.url, sourceIndex: target.sourceIndex, contentType: null as string | null, httpStatus: null as number | null, bytesRead: 0, extractedTitle: null as string | null, extractedPublishedAt: null as string | null, extractedUpdatedAt: null as string | null, extractedText: null as string | null, accessedAt };

  const fetchOutcome = await safeFetchFollowingRedirects(target.url, RETRIEVAL_TIMEOUT_MS, fetchImpl);
  if ("error" in fetchOutcome) return { ...base, outcome: fetchOutcome.error, reason: fetchOutcome.reason };

  const { response } = fetchOutcome;
  const contentType = (response.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  const contentLength = Number(response.headers.get("content-length") || "0");
  if (contentLength > RETRIEVAL_MAX_BYTES) {
    return { ...base, outcome: "SKIPPED_TOO_LARGE", reason: `Content-Length ${contentLength} exceeds ${RETRIEVAL_MAX_BYTES} byte cap.`, contentType, httpStatus: response.status };
  }
  // Item C: distinguish HTML/PDF/other; never execute page JavaScript (this module never evals
  // fetched content, regardless of type); never download an arbitrary binary (anything outside this
  // small allow-list is rejected before its body is even read).
  const isHtml = contentType.includes("text/html") || contentType.includes("application/xhtml+xml");
  const isPdf = contentType.includes("application/pdf");
  const isPlainText = contentType === "text/plain";
  if (!isHtml && !isPdf && !isPlainText) {
    return { ...base, outcome: "SKIPPED_UNSUPPORTED_CONTENT_TYPE", reason: `Unsupported content-type "${contentType || "unknown"}".`, contentType, httpStatus: response.status };
  }

  const { text: body, truncatedOrOversize } = await readBodyBounded(response, RETRIEVAL_MAX_BYTES);
  if (truncatedOrOversize && !isPdf) {
    // For HTML/text, an oversized body cannot be trusted to have been read in full -- reject rather
    // than extract from a truncated document that might cut off mid-tag. A PDF's bytes are opaque to
    // this module either way (no text extraction attempted), so a size-capped PDF fetch below still
    // safely confirms "this is a PDF at this URL" without needing the full byte stream.
    return { ...base, outcome: "SKIPPED_TOO_LARGE", reason: `Body exceeded ${RETRIEVAL_MAX_BYTES} byte cap while streaming.`, contentType, httpStatus: response.status, bytesRead: RETRIEVAL_MAX_BYTES };
  }

  const hostname = hostnameOfSafe(fetchOutcome.finalUrl) || "";
  if (isPdf) {
    // Item D: conservative classification. No PDF text-extraction library is a dependency of this
    // repo (see this file's header audit) -- this module confirms the fetch and content-type only,
    // and uses the HTTP Last-Modified header (real response metadata, not a body-text guess) as the
    // one structured date signal available for a PDF. The original search-result snippet is left
    // untouched (there is nothing safer/more specific to replace it with).
    const lastModified = response.headers.get("last-modified");
    const updatedAt = lastModified && !Number.isNaN(new Date(lastModified).getTime()) ? new Date(lastModified).toISOString() : null;
    const outcome: RetrievalOutcome = isGovernmentHost(hostname) ? "PRIMARY_DOCUMENT" : "RETRIEVED_PAGE";
    return { ...base, outcome, reason: isGovernmentHost(hostname) ? "PDF fetched from a known official-government domain." : "PDF fetched from a domain not on the official-government list; not classified as a primary record.", contentType, httpStatus: response.status, bytesRead: body.length, extractedUpdatedAt: updatedAt };
  }

  // HTML/plain text: extract title + structured meta-tag dates + a bounded plain-text rendering.
  const extractedTitle = isHtml ? extractTitle(body) : null;
  const extractedPublishedAt = isHtml ? extractFirstValidDate(body, PUBLISHED_META_PATTERNS) : null;
  const extractedUpdatedAt = isHtml ? extractFirstValidDate(body, UPDATED_META_PATTERNS) : null;
  const extractedText = isHtml ? extractPlainText(body, 4_000) : body.slice(0, 4_000).trim();
  return {
    ...base, outcome: "RETRIEVED_PAGE", reason: "Page body fetched and read.", contentType, httpStatus: response.status, bytesRead: body.length,
    extractedTitle, extractedPublishedAt, extractedUpdatedAt, extractedText: extractedText || null,
  };
}

// --- F. Apply results back onto SourceRecord[] (pure -- returns a new array) -----------------------

// Never overwrites an existing publishedAt with a weaker/absent signal, never downgrades
// evidenceDepth, and only replaces `snippet` when real extracted text was obtained (a SKIPPED
// receipt or a PDF leaves the original search-result snippet untouched -- there is nothing more
// specific to say).
export function applyRetrievalResults(sources: SourceRecord[], receipts: RetrievalReceipt[]): SourceRecord[] {
  if (!receipts.length) return sources;
  const byIndex = new Map(receipts.map((r) => [r.sourceIndex, r]));
  return sources.map((source, i) => {
    const receipt = byIndex.get(i);
    if (!receipt || (receipt.outcome !== "RETRIEVED_PAGE" && receipt.outcome !== "PRIMARY_DOCUMENT")) return source;
    return {
      ...source,
      evidenceDepth: receipt.outcome,
      publishedAt: source.publishedAt ?? receipt.extractedPublishedAt ?? source.publishedAt,
      updatedAt: source.updatedAt ?? receipt.extractedUpdatedAt ?? source.updatedAt,
      snippet: receipt.extractedText ?? source.snippet,
      retrievedAt: receipt.accessedAt,
    };
  });
}
