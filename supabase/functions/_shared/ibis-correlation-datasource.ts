// FTN Platform — Correlation Engine real numeric datasource bridge.
//
// Item 5 finding (re-investigated on explicit request, not accepted on the prior audit's word):
// the repo already carries a real, server-accessible numeric time series -- the Central Bank of
// Trinidad and Tobago's monthly USD buying/selling exchange rate, ingested weekly by
// scripts/update-fx-rate.mjs (.github/workflows/update-fx-rate.yml) into data/fx-usd-ttd.json.
// That is the write side. This file is the read side FOR THE EDGE FUNCTION specifically: it
// imports a same-directory JSON mirror (ibis-correlation-fx-data.json, kept in lockstep by the
// same update script -- see its second fs.writeFile call) rather than reaching outside
// supabase/functions/ with a relative import, because the Supabase Edge Function bundler's
// support for resolving imports above the function's own directory tree is not something this
// pass could verify without risking a broken production deploy. A same-directory JSON import is
// the exact pattern already proven safe elsewhere in this repo (ftn-ibis-mcp/index.ts's
// `./registry.json` import).
//
// Buying vs selling rate is a genuine, non-fabricated bivariate pair: two independently published
// monthly figures from the same official source, sharing every period since 1991-01. It is NOT a
// meaningful pairing for every correlation question -- only for ones that are actually asking
// about the TT$/US$ exchange rate. detectFxCorrelationInput() only returns real data when the
// query text itself names the exchange rate; it never substitutes this series for an unrelated
// correlation request (see the accompanying "does not inject FX data into unrelated queries" test
// in ibis-canonical-brain.test.ts).
//
// Crime data (data/crime-statistics.json) was evaluated too and deliberately NOT wired in here:
// TTPS/CSO publish exactly one socio-economic indicator (murder counts) with no second comparable
// series available server-side to pair it against, so any bivariate correlation involving it would
// have to invent a partner variable -- which is exactly what "do not fabricate numbers" forbids.
// It remains a real, citable single-series fact (already surfaced via RESEARCH/EBR evidence), just
// not a CORRELATION-engine input. See GOVERNANCE/FTN_Statistics_Source_Map_2026-08-25.md for the
// source-licensing detail already on record for that dataset.
import type { Series } from "./ibis-correlation-engine.ts";
import fxRaw from "./ibis-correlation-fx-data.json" with { type: "json" };

type FxRow = { period: string; usdBuying: number; usdSelling: number };

const FX_SOURCE_LABEL = "Central Bank of Trinidad and Tobago — Exchange Rates (Monthly)";

function fxRows(): FxRow[] {
  const rows = (fxRaw as { monthly?: FxRow[] }).monthly;
  return Array.isArray(rows) ? rows : [];
}

export function fxBuyingSeries(): Series {
  const rows = fxRows();
  return {
    id: "fx-usd-buying-rate", label: "TT$/US$ Buying Rate", unit: "TTD per USD", frequency: "MONTHLY",
    source: FX_SOURCE_LABEL,
    periods: rows.map((r) => r.period), values: rows.map((r) => r.usdBuying),
  };
}

export function fxSellingSeries(): Series {
  const rows = fxRows();
  return {
    id: "fx-usd-selling-rate", label: "TT$/US$ Selling Rate", unit: "TTD per USD", frequency: "MONTHLY",
    source: FX_SOURCE_LABEL,
    periods: rows.map((r) => r.period), values: rows.map((r) => r.usdSelling),
  };
}

// Deliberately narrow: only the exchange-rate-naming vocabulary this repo actually has a real
// series for. Broad correlation vocabulary ("correlation", "relationship between") is handled by
// ibis-intent-router.ts's own signals.correlation marker upstream of this -- this function's only
// job is deciding whether THIS SPECIFIC real dataset is what the query is asking about.
export const FX_CORRELATION_MARKERS =
  /\b(exchange rate|fx rate|forex rate|usd\/ttd|ttd\/usd|us(?:d)? dollar rate|buying rate|selling rate|buying and selling rate)\b/i;

export function detectFxCorrelationInput(text: string): { seriesA: Series; seriesB: Series } | null {
  if (!FX_CORRELATION_MARKERS.test(text)) return null;
  const rows = fxRows();
  if (rows.length < 5) return null;
  return { seriesA: fxBuyingSeries(), seriesB: fxSellingSeries() };
}
