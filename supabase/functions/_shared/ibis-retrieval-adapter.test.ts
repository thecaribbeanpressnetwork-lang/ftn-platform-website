import { assert, assertEquals, assertFalse } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  selectRetrievalTargets, fetchSource, applyRetrievalResults,
  MAX_RETRIEVALS_PER_REQUEST, RETRIEVAL_MAX_BYTES, type RetrievalTarget,
} from "./ibis-retrieval-adapter.ts";
import { processEvidence, type EvidencePacket } from "./ibis-evidence-processor.ts";
import type { SourceRecord } from "./ibis-response-envelope.ts";
import type { EvidenceContract } from "./ibis-evidence-contract.ts";
import type { RequestFrame } from "./ibis-request-frame.ts";

console.log("ibis-retrieval-adapter.test.ts: bounded, prioritized target selection from EvidencePacket.gaps; safe fetch (unsafe URL blocked without a network call, timeout mapped honestly, oversized response blocked, unsupported content-type rejected); conservative structured-metadata-only date/title extraction; SourceRecord upgrade is additive and non-mutating.");

function source(overrides: Partial<SourceRecord> = {}): SourceRecord {
  return {
    title: "A relevant article", publisher: "Example News", url: "https://news.example.com/a",
    publishedAt: null, updatedAt: null, retrievedAt: "2026-09-18T00:00:00.000Z",
    snippet: "A short snippet.", evidenceDepth: "SNIPPET", ...overrides,
  };
}

const BASE_CONTRACT: EvidenceContract = {
  requestId: "r1", queryClass: "CURRENT_WEB_RESEARCH",
  temporalWindow: { start: null, end: null, asOf: null, strictness: "MEDIUM" },
  requiredEvidence: true, requiredSourceClasses: ["NEWS_MEDIA", "OFFICIAL_GOVERNMENT"],
  permittedClaimTypes: ["FACTUAL"], minimumEpistemicStatus: "INFERRED", sufficiency: "SINGLE_SOURCE_ACCEPTABLE",
  rationale: ["test fixture"],
};

function fakePacket(overrides: Partial<EvidencePacket> = {}): EvidencePacket {
  return {
    requestId: "r1", contractSatisfied: null, evidenceState: "PARTIAL", legacyEvidenceState: "SEARCH_GROUNDED", stateAgreement: false,
    items: [], temporal: { required: true, satisfied: null, unresolved: true },
    entity: { required: false, satisfied: null, unresolved: true }, geography: { required: false, satisfied: null, unresolved: true },
    sourceRequirements: { officialSatisfied: null, structuredDataSatisfied: null, relevantSourceSatisfied: true },
    retrievalQualityGate: null, independentSourceCount: 1, contradictions: [], gaps: [], provenance: [], limitations: [],
    ...overrides,
  };
}

// --- selectRetrievalTargets ------------------------------------------------------------------------

Deno.test("no addressable gap -> no targets selected (the common, already-well-evidenced case)", () => {
  const sources = [source()];
  const packet = fakePacket({
    items: [{ id: "search-0", origin: "SEARCH_RESULT", provider: "Example News", url: sources[0].url, title: sources[0].title, snippet: sources[0].snippet, evidenceDepth: "SNIPPET", publishedAt: null, updatedAt: null, retrievedAt: sources[0].retrievedAt, officialClassification: "UNKNOWN", temporalRelevance: "SATISFIED" }],
    gaps: [], // nothing addressable
  });
  const targets = selectRetrievalTargets(sources, packet, BASE_CONTRACT);
  assertEquals(targets.length, 0);
});

Deno.test("PAGE_INSPECTION_UNAVAILABLE_GAP selects the strongest remaining SNIPPET item", () => {
  const sources = [source()];
  const packet = fakePacket({
    items: [{ id: "search-0", origin: "SEARCH_RESULT", provider: "Example News", url: sources[0].url, title: sources[0].title, snippet: sources[0].snippet, evidenceDepth: "SNIPPET", publishedAt: null, updatedAt: null, retrievedAt: sources[0].retrievedAt, officialClassification: "UNKNOWN", temporalRelevance: "UNKNOWN" }],
    gaps: [{ type: "PAGE_INSPECTION_UNAVAILABLE_GAP", requirement: "inspected primary source", reason: "test" }],
  });
  const targets = selectRetrievalTargets(sources, packet, BASE_CONTRACT);
  assertEquals(targets.length, 1);
  assertEquals(targets[0].url, sources[0].url);
});

Deno.test("an official-government item is prioritized (rank 1) over a plain news item", () => {
  const sources = [source({ url: "https://news.example.com/a" }), source({ url: "https://gov.tt/b", title: "Official notice" })];
  const packet = fakePacket({
    items: [
      { id: "search-0", origin: "SEARCH_RESULT", provider: "Example News", url: sources[0].url, title: sources[0].title, snippet: sources[0].snippet, evidenceDepth: "SNIPPET", publishedAt: null, updatedAt: null, retrievedAt: sources[0].retrievedAt, officialClassification: "UNKNOWN", temporalRelevance: "UNKNOWN" },
      { id: "search-1", origin: "SEARCH_RESULT", provider: "GOTT", url: sources[1].url, title: sources[1].title, snippet: sources[1].snippet, evidenceDepth: "SNIPPET", publishedAt: null, updatedAt: null, retrievedAt: sources[1].retrievedAt, officialClassification: "OFFICIAL_GOVERNMENT", temporalRelevance: "UNKNOWN" },
    ],
    gaps: [{ type: "OFFICIAL_SOURCE_GAP", requirement: "OFFICIAL_GOVERNMENT", reason: "test" }],
  });
  const targets = selectRetrievalTargets(sources, packet, BASE_CONTRACT);
  assertEquals(targets[0].url, "https://gov.tt/b");
});

Deno.test("selection is bounded to MAX_RETRIEVALS_PER_REQUEST even with many eligible items", () => {
  const many = Array.from({ length: 10 }, (_, i) => source({ url: `https://news.example.com/${i}` }));
  const items = many.map((s, i) => ({ id: `search-${i}`, origin: "SEARCH_RESULT" as const, provider: "Example News", url: s.url, title: s.title, snippet: s.snippet, evidenceDepth: "SNIPPET" as const, publishedAt: null, updatedAt: null, retrievedAt: s.retrievedAt, officialClassification: "UNKNOWN" as const, temporalRelevance: "UNKNOWN" as const }));
  const packet = fakePacket({ items, gaps: [{ type: "TEMPORAL_GAP", requirement: "x", reason: "test" }] });
  const targets = selectRetrievalTargets(many, packet, BASE_CONTRACT);
  assert(targets.length <= MAX_RETRIEVALS_PER_REQUEST);
});

Deno.test("an already-RETRIEVED_PAGE item is never re-selected (nothing to gain)", () => {
  const sources = [source({ evidenceDepth: "RETRIEVED_PAGE" })];
  const packet = fakePacket({
    items: [{ id: "search-0", origin: "SEARCH_RESULT", provider: "Example News", url: sources[0].url, title: sources[0].title, snippet: sources[0].snippet, evidenceDepth: "RETRIEVED_PAGE", publishedAt: null, updatedAt: null, retrievedAt: sources[0].retrievedAt, officialClassification: "UNKNOWN", temporalRelevance: "UNKNOWN" }],
    gaps: [{ type: "TEMPORAL_GAP", requirement: "x", reason: "test" }],
  });
  assertEquals(selectRetrievalTargets(sources, packet, BASE_CONTRACT).length, 0);
});

// --- fetchSource: safety ----------------------------------------------------------------------------

Deno.test("an unsafe (non-https / private-IP) URL is rejected WITHOUT ever calling fetch", async () => {
  let called = false;
  const fakeFetch = (() => { called = true; throw new Error("should never be called"); }) as unknown as typeof fetch;
  const receipt = await fetchSource({ url: "http://10.0.0.5/internal", sourceIndex: 0, priorityReason: "test" }, fakeFetch);
  assertEquals(receipt.outcome, "SKIPPED_UNSAFE_URL");
  assertFalse(called);
});

Deno.test("a timeout is honestly reported as SKIPPED_TIMEOUT, not a generic fetch error", async () => {
  const fakeFetch = (() => { throw new DOMException("aborted", "TimeoutError"); }) as unknown as typeof fetch;
  const receipt = await fetchSource({ url: "https://news.example.com/slow", sourceIndex: 0, priorityReason: "test" }, fakeFetch);
  assertEquals(receipt.outcome, "SKIPPED_TIMEOUT");
});

Deno.test("a response whose Content-Length exceeds the byte cap is rejected before reading the body", async () => {
  const fakeFetch = (() => Promise.resolve(new Response("<html></html>", { status: 200, headers: { "content-type": "text/html", "content-length": String(RETRIEVAL_MAX_BYTES + 1) } }))) as unknown as typeof fetch;
  const receipt = await fetchSource({ url: "https://news.example.com/huge", sourceIndex: 0, priorityReason: "test" }, fakeFetch);
  assertEquals(receipt.outcome, "SKIPPED_TOO_LARGE");
});

Deno.test("an unsupported content-type (e.g. an image) is rejected, never downloaded as if it were text", async () => {
  const fakeFetch = (() => Promise.resolve(new Response("binary", { status: 200, headers: { "content-type": "image/png" } }))) as unknown as typeof fetch;
  const receipt = await fetchSource({ url: "https://news.example.com/photo.png", sourceIndex: 0, priorityReason: "test" }, fakeFetch);
  assertEquals(receipt.outcome, "SKIPPED_UNSUPPORTED_CONTENT_TYPE");
});

Deno.test("a non-2xx HTTP response is reported as SKIPPED_HTTP_ERROR", async () => {
  const fakeFetch = (() => Promise.resolve(new Response("not found", { status: 404 }))) as unknown as typeof fetch;
  const receipt = await fetchSource({ url: "https://news.example.com/missing", sourceIndex: 0, priorityReason: "test" }, fakeFetch);
  assertEquals(receipt.outcome, "SKIPPED_HTTP_ERROR");
});

// --- fetchSource: successful extraction --------------------------------------------------------------

Deno.test("a successful HTML fetch with structured meta-tag dates extracts title, date, and plain text -- RETRIEVED_PAGE", async () => {
  const html = `<html><head><title>T&amp;T update</title><meta property="article:published_time" content="2026-09-10T12:00:00Z"></head><body><script>evil()</script><p>Real article text about the update.</p></body></html>`;
  const fakeFetch = (() => Promise.resolve(new Response(html, { status: 200, headers: { "content-type": "text/html; charset=utf-8" } }))) as unknown as typeof fetch;
  const receipt = await fetchSource({ url: "https://news.example.com/article", sourceIndex: 0, priorityReason: "test" }, fakeFetch);
  assertEquals(receipt.outcome, "RETRIEVED_PAGE");
  assertEquals(receipt.extractedTitle, "T&T update");
  assertEquals(receipt.extractedPublishedAt, new Date("2026-09-10T12:00:00Z").toISOString());
  assert(receipt.extractedText?.includes("Real article text"));
  assertFalse(receipt.extractedText?.includes("evil()")); // script content must never leak into the extracted text
});

Deno.test("an HTML page with NO date metadata leaves extractedPublishedAt/UpdatedAt null -- never guessed from body text", async () => {
  const html = `<html><head><title>Undated page</title></head><body><p>Some content, no date anywhere in a recognized tag. Published 2019 somewhere in prose should NOT be read as metadata.</p></body></html>`;
  const fakeFetch = (() => Promise.resolve(new Response(html, { status: 200, headers: { "content-type": "text/html" } }))) as unknown as typeof fetch;
  const receipt = await fetchSource({ url: "https://news.example.com/undated", sourceIndex: 0, priorityReason: "test" }, fakeFetch);
  assertEquals(receipt.outcome, "RETRIEVED_PAGE");
  assertEquals(receipt.extractedPublishedAt, null);
  assertEquals(receipt.extractedUpdatedAt, null);
});

Deno.test("a PDF fetched from a known official-government domain is classified PRIMARY_DOCUMENT", async () => {
  const fakeFetch = (() => Promise.resolve(new Response("%PDF-1.4 ...", { status: 200, headers: { "content-type": "application/pdf", "last-modified": "Wed, 10 Sep 2026 00:00:00 GMT" } }))) as unknown as typeof fetch;
  const receipt = await fetchSource({ url: "https://gov.tt/official-order.pdf", sourceIndex: 0, priorityReason: "test" }, fakeFetch);
  assertEquals(receipt.outcome, "PRIMARY_DOCUMENT");
  assertEquals(receipt.extractedUpdatedAt, new Date("Wed, 10 Sep 2026 00:00:00 GMT").toISOString());
});

Deno.test("a PDF fetched from a domain NOT on the official-government list stays RETRIEVED_PAGE -- conservative classification", async () => {
  const fakeFetch = (() => Promise.resolve(new Response("%PDF-1.4 ...", { status: 200, headers: { "content-type": "application/pdf" } }))) as unknown as typeof fetch;
  const receipt = await fetchSource({ url: "https://news.example.com/report.pdf", sourceIndex: 0, priorityReason: "test" }, fakeFetch);
  assertEquals(receipt.outcome, "RETRIEVED_PAGE");
});

// --- applyRetrievalResults -----------------------------------------------------------------------

Deno.test("applyRetrievalResults upgrades matching sources and never mutates the original array", () => {
  const original = [source()];
  const updated = applyRetrievalResults(original, [{
    url: original[0].url, sourceIndex: 0, outcome: "RETRIEVED_PAGE", reason: "ok", contentType: "text/html", httpStatus: 200,
    bytesRead: 100, extractedTitle: "New title", extractedPublishedAt: "2026-09-10T00:00:00.000Z", extractedUpdatedAt: null,
    extractedText: "Real fetched article text.", accessedAt: "2026-09-18T01:00:00.000Z",
  }]);
  assertEquals(original[0].evidenceDepth, "SNIPPET"); // original untouched
  assertEquals(updated[0].evidenceDepth, "RETRIEVED_PAGE");
  assertEquals(updated[0].publishedAt, "2026-09-10T00:00:00.000Z");
  assertEquals(updated[0].snippet, "Real fetched article text.");
});

Deno.test("applyRetrievalResults never overwrites an existing publishedAt with an extracted one", () => {
  const original = [source({ publishedAt: "2020-01-01T00:00:00.000Z" })];
  const updated = applyRetrievalResults(original, [{
    url: original[0].url, sourceIndex: 0, outcome: "RETRIEVED_PAGE", reason: "ok", contentType: "text/html", httpStatus: 200,
    bytesRead: 100, extractedTitle: null, extractedPublishedAt: "2026-09-10T00:00:00.000Z", extractedUpdatedAt: null,
    extractedText: "text", accessedAt: "2026-09-18T01:00:00.000Z",
  }]);
  assertEquals(updated[0].publishedAt, "2020-01-01T00:00:00.000Z");
});

Deno.test("a SKIPPED receipt leaves the source completely unchanged", () => {
  const original = [source()];
  const updated = applyRetrievalResults(original, [{
    url: original[0].url, sourceIndex: 0, outcome: "SKIPPED_TIMEOUT", reason: "timed out", contentType: null, httpStatus: null,
    bytesRead: 0, extractedTitle: null, extractedPublishedAt: null, extractedUpdatedAt: null, extractedText: null, accessedAt: "2026-09-18T01:00:00.000Z",
  }]);
  assertEquals(updated[0], original[0]);
});

// --- End-to-end: EvidencePacket genuinely improves after retrieval -----------------------------------

Deno.test("EvidencePacket improves from PARTIAL/temporally-unresolved to SUPPORTED after a real dated retrieval closes the gap", () => {
  const requestFrame = {
    requestId: "r1", rawQuery: "what changed this week", intent: null, queryClass: "CURRENT_WEB_RESEARCH" as const,
    entities: [], geography: null,
    temporalRequirement: { type: "THIS_WEEK" as const, strictness: "MEDIUM" as const, start: "2026-09-14T00:00:00.000Z", end: "2026-09-20T23:59:59.999Z", asOf: null, originalExpression: "this week", relativeExpression: "this week", resolved: true, timezone: "UTC", timezoneSource: "DEFAULT_FALLBACK" as const },
    outputType: "TEXT" as const, consequenceLevel: "UNRESOLVED" as const,
    requiresExternalAction: false, requiresFreshEvidence: true, requiresDeterministicEngine: false,
  } as RequestFrame;
  // Isolates the TEMPORAL improvement this test is actually about: requiredSourceClasses is "ANY"
  // here so the (separate, already-covered-elsewhere) source-class gate can never also hold the
  // aggregate at PARTIAL -- a fixture domain like "news.example.com" is deliberately not on the real
  // AUTHORITATIVE_NEWS_DOMAINS list, so a contract requiring NEWS_MEDIA/OFFICIAL_GOVERNMENT would
  // stay PARTIAL regardless of temporal resolution, which is not what this test is checking.
  const temporalOnlyContract: EvidenceContract = { ...BASE_CONTRACT, requiredSourceClasses: ["ANY"] };
  const beforeSources = [source({ publishedAt: null })];
  const before = processEvidence({ requestFrame, evidenceContract: temporalOnlyContract, sources: beforeSources, capabilityExecution: [{ capability: "RESEARCH", history: [], finalState: "EXECUTED" }], engineResults: [], deterministicResult: null, legacyEvidenceState: "SEARCH_GROUNDED", orchestrationContradictions: [] });
  assertEquals(before.evidencePacket.temporal.unresolved, true);

  const afterSources = applyRetrievalResults(beforeSources, [{
    url: beforeSources[0].url, sourceIndex: 0, outcome: "RETRIEVED_PAGE", reason: "ok", contentType: "text/html", httpStatus: 200,
    bytesRead: 100, extractedTitle: null, extractedPublishedAt: "2026-09-15T00:00:00.000Z", extractedUpdatedAt: null,
    extractedText: "Confirmed in-window article text.", accessedAt: "2026-09-18T01:00:00.000Z",
  }]);
  const after = processEvidence({ requestFrame, evidenceContract: temporalOnlyContract, sources: afterSources, capabilityExecution: [{ capability: "RESEARCH", history: [], finalState: "EXECUTED" }], engineResults: [], deterministicResult: null, legacyEvidenceState: "SEARCH_GROUNDED", orchestrationContradictions: [] });
  assertEquals(after.evidencePacket.temporal.satisfied, true);
  assertEquals(after.evidencePacket.temporal.unresolved, false);
  assertEquals(after.evidencePacket.evidenceState, "SUPPORTED");
  assertFalse(after.evidencePacket.gaps.some((g) => g.type === "PAGE_INSPECTION_UNAVAILABLE_GAP"));
});
