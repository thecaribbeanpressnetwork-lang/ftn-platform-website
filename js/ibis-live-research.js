// FTN Platform — ibis Live Intelligence (Pass 16, smallest safe working vertical slice).
//
// Real, working, zero-cost, zero-deployment client-side research: Hacker News (Algolia's public
// search API) and public GitHub repository search both serve permissive CORS headers, need no API
// key, no cookies, no login and no founder credential of any kind -- so this module calls them
// directly from the browser. No Supabase function, no new server, nothing to deploy.
//
// This is deliberately NOT a general web crawler or a replacement for the 33-provider IBIS
// fabric -- it is one narrow capability (LIVE_INTELLIGENCE) that only fires when a user's message
// is recognized as a live/current-events request (see js/ibis-ai-workspace.js's intent check),
// answering "what does the current public record actually say" with real, linked, timestamped
// evidence -- never invented facts, never a fabricated "trending" claim.
//
// Every returned source is built via js/ftn-source-provenance.js (Pass 15's provenance/source-
// quality foundation) so credibility and claim confidence are computed the same way everywhere in
// FTN, not reinvented here. Reddit, X, and any other cookie/login-gated platform are explicitly
// out of scope for this pass (Pass 15's own research found they need either founder cookies or a
// disposable-account decision neither of which this pass is authorized to make) -- see
// SCOUT-INTELLIGENCE-LEDGER.md for that finding.
(function (global) {
  'use strict';

  var HN_ENDPOINT = 'https://hn.algolia.com/api/v1/search';
  var GITHUB_ENDPOINT = 'https://api.github.com/search/repositories';
  var TIMEOUT_MS = 8000;

  // Deterministic, whole-phrase intent detection -- same discipline as js/intent-router.js: never
  // an LLM call to decide whether to research, so a "no" answer costs nothing and never guesses.
  var LIVE_PHRASES = [
    'right now', 'happening now', 'currently', 'as of today', 'latest on', 'latest news',
    'current news', 'what are people saying', "what's new", 'recent news', 'this week',
    'up to date', 'up-to-date', 'today', 'this month',
  ];
  function looksLikeLiveRequest(text) {
    var lower = String(text || '').toLowerCase();
    return LIVE_PHRASES.some(function (phrase) { return lower.indexOf(phrase) !== -1; });
  }

  function withTimeout(promise, ms) {
    return new Promise(function (resolve) {
      var done = false;
      var timer = setTimeout(function () { if (!done) { done = true; resolve(null); } }, ms);
      promise.then(
        function (value) { if (!done) { done = true; clearTimeout(timer); resolve(value); } },
        function () { if (!done) { done = true; clearTimeout(timer); resolve(null); } }
      );
    });
  }

  function stripLiveKeywords(query) {
    var cleaned = String(query || '');
    LIVE_PHRASES.forEach(function (phrase) { cleaned = cleaned.replace(new RegExp(phrase, 'ig'), ' '); });
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    // Cosmetic only (does not change what's actually searched): drop a leading connector word and
    // trailing punctuation left behind once the trigger phrase itself is removed, e.g. "what are
    // people saying about JavaScript right now?" -> "about JavaScript ?" -> "JavaScript".
    cleaned = cleaned.replace(/^(about|on|in|regarding)\s+/i, '').replace(/[?!.]+\s*$/, '').trim();
    return cleaned;
  }

  async function fetchHackerNews(query) {
    var url = HN_ENDPOINT + '?query=' + encodeURIComponent(query) + '&tags=story&hitsPerPage=5';
    var res = await withTimeout(fetch(url, { headers: { Accept: 'application/json' } }), TIMEOUT_MS);
    if (!res || !res.ok) return [];
    var data = await res.json().catch(function () { return null; });
    if (!data || !Array.isArray(data.hits)) return [];
    // sourceRecord() (js/ftn-source-provenance.js) validates/normalizes the real provenance
    // fields; title/engagement are FTN-added display-only fields it doesn't know about, merged in
    // afterward rather than widening that module's own, already-tested schema for one caller.
    return data.hits.filter(function (h) { return h.url || h.objectID; }).map(function (h) {
      return Object.assign(global.FTN.SourceProvenance.sourceRecord({
        sourceId: 'hn-' + h.objectID,
        platform: 'Hacker News',
        sourceClass: 'COMMUNITY_DISCUSSION',
        owner: h.author || 'unknown',
        url: h.url || ('https://news.ycombinator.com/item?id=' + h.objectID),
        author: h.author || null,
        publishedAt: h.created_at || null,
        retrievedAt: new Date().toISOString(),
        retrievalMethod: 'OFFICIAL_API',
      }), { title: h.title || '(untitled)', engagement: (h.points || 0) + ' points, ' + (h.num_comments || 0) + ' comments' });
    });
  }

  async function fetchGitHub(query) {
    var url = GITHUB_ENDPOINT + '?q=' + encodeURIComponent(query) + '&sort=updated&order=desc&per_page=5';
    var res = await withTimeout(fetch(url, { headers: { Accept: 'application/vnd.github+json' } }), TIMEOUT_MS);
    if (!res || !res.ok) return [];
    var data = await res.json().catch(function () { return null; });
    if (!data || !Array.isArray(data.items)) return [];
    return data.items.map(function (item) {
      return Object.assign(global.FTN.SourceProvenance.sourceRecord({
        sourceId: 'gh-' + item.id,
        platform: 'GitHub',
        sourceClass: 'COMMUNITY_DISCUSSION',
        owner: item.owner ? item.owner.login : 'unknown',
        url: item.html_url,
        author: item.owner ? item.owner.login : null,
        publishedAt: item.updated_at || null,
        retrievedAt: new Date().toISOString(),
        retrievalMethod: 'OFFICIAL_API',
      }), { title: item.full_name + (item.description ? ' — ' + item.description : ''), engagement: (item.stargazers_count || 0) + ' stars' });
    });
  }

  // Deterministic synthesis -- no LLM call, zero marginal cost, honest about being an aggregation
  // rather than an analysis. Matches the discipline already established for js/what-changed.js
  // and js/reality-insights.js: only ever states facts the returned data actually contains.
  function synthesize(query, sources) {
    if (!sources.length) {
      return 'No current public results were found for "' + query + '" across Hacker News or GitHub in the time available. This does not mean nothing is happening -- only that these two sources returned nothing relevant just now.';
    }
    var byPlatform = {};
    sources.forEach(function (s) { byPlatform[s.platform] = (byPlatform[s.platform] || 0) + 1; });
    var platformSummary = Object.keys(byPlatform).map(function (p) { return byPlatform[p] + ' from ' + p; }).join(', ');
    var top = sources[0];
    return 'Found ' + sources.length + ' current public result(s) for "' + query + '" (' + platformSummary + '). ' +
      'Most relevant: "' + top.title + '"' + (top.engagement ? ' (' + top.engagement + ')' : '') + '.';
  }

  async function research(rawQuery) {
    var query = stripLiveKeywords(rawQuery) || rawQuery;
    var startedAt = new Date().toISOString();
    var results = await Promise.all([fetchHackerNews(query), fetchGitHub(query)]);
    var sources = results[0].concat(results[1]);
    var confidence = global.FTN.SourceProvenance.claimConfidence(sources);
    return {
      query: query,
      retrievedAt: startedAt,
      sources: sources,
      sourceCredibilityNote: 'Every source above is COMMUNITY_DISCUSSION-tier (public forum/repository activity) -- real and current, but not official/journalistic/academic evidence. See each source\'s own class.',
      claimConfidence: confidence,
      synthesis: synthesize(query, sources),
    };
  }

  global.FTN = global.FTN || {};
  global.FTN.LiveResearch = {
    looksLikeLiveRequest: looksLikeLiveRequest,
    stripLiveKeywords: stripLiveKeywords,
    research: research,
  };
})(typeof window !== 'undefined' ? window : globalThis);
