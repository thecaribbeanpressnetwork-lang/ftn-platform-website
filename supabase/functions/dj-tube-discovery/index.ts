import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const MUSIC_EXCLUDED = /\b(?:dj\s*)?mix(?:es|tape)?\b|\bfull\s+mix\b|\bmega\s+mix\b|\bcontinuous\s+mix\b|\bmix\s*20\d\d\b|\bhour\s+mix\b|\bnonstop\b|\bnon-stop\b|\bcompilation\b|\bmedley\b|\bplaylist\b/i;
const ALLOWED_ORIGINS = new Set([
  "https://ftnplatform.org",
  "https://www.ftnplatform.org",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

const GENRE_SEEDS: Record<string, string[]> = {
  soca: ["soca Trinidad official video", "soca Trinidad official audio", "soca Caribbean artist official", "soca 2026 official video", "Trinidad soca artiste topic"],
  reggae: ["reggae Caribbean official video", "reggae Jamaica official audio", "roots reggae Caribbean official", "reggae artist official video", "Jamaica reggae artiste topic"],
  dancehall: ["dancehall Jamaica official video", "dancehall Caribbean official audio", "dancehall artist official video", "dancehall 2026 official video", "Jamaica dancehall artiste topic"],
  "zouk-kompa": ["zouk official video Caribbean", "kompa Haiti official video", "zouk kompa official audio", "French Caribbean music official video", "Haiti kompa artiste topic"],
  chutney: ["chutney soca Trinidad official video", "chutney music Trinidad official audio", "Indo Caribbean chutney official video", "chutney soca artist official", "Trinidad chutney artiste topic"],
  calypso: ["calypso Trinidad official audio", "calypso Trinidad official video", "kaiso Trinidad official", "calypso Caribbean artist official", "Trinidad calypso artiste topic"],
  steelpan: ["steelpan Trinidad official performance", "steel orchestra Trinidad official", "panorama Trinidad official", "steelpan Caribbean official"],
  gospel: ["Caribbean gospel official video", "Trinidad gospel official audio", "Jamaica gospel official video", "Caribbean gospel artist official"],
};

function originAllowed(req: Request) {
  const origin = req.headers.get("origin") || "";
  const referer = req.headers.get("referer") || "";
  if (origin && ALLOWED_ORIGINS.has(origin)) return origin;
  for (const allowed of ALLOWED_ORIGINS) if (referer.startsWith(allowed + "/")) return allowed;
  return "";
}

function validPublishableKey(req: Request) {
  const supplied = req.headers.get("apikey") || "";
  if (!supplied) return false;
  try {
    const parsed = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}");
    return Object.values(parsed).some((value) => value === supplied);
  } catch {
    return false;
  }
}

function cors(origin: string) {
  return {
    "access-control-allow-origin": origin || "https://ftnplatform.org",
    "access-control-allow-methods": "POST,OPTIONS",
    "access-control-allow-headers": "apikey,content-type,x-client-info",
    "vary": "Origin",
    "content-type": "application/json; charset=utf-8",
    "cache-control": "public, max-age=120, stale-while-revalidate=300",
  };
}

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: cors(originAllowed(req)) });
}

function cleanText(value: unknown) {
  return String(value || "").replace(/<[^>]*>/g, "").trim().slice(0, 220);
}

function musicAllowed(title: string) {
  return !!title && !MUSIC_EXCLUDED.test(title);
}

function uniqueByVideoId(items: any[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const id = String(item.videoId || "");
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function isoDurationToSeconds(value: string) {
  const match = String(value || "").match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) return null;
  return +(match[1] || 0) * 3600 + +(match[2] || 0) * 60 + +(match[3] || 0);
}

function clockToSeconds(value: string) {
  const parts = String(value || "").trim().split(":").map(Number);
  if (!parts.length || parts.some((part) => !Number.isFinite(part))) return null;
  let seconds = 0;
  for (const part of parts) seconds = seconds * 60 + part;
  return seconds;
}

function textOf(value: any) {
  if (!value) return "";
  if (typeof value.simpleText === "string") return cleanText(value.simpleText);
  if (Array.isArray(value.runs)) return cleanText(value.runs.map((run: any) => run.text || "").join(""));
  return "";
}

function extractBalancedJson(html: string, start: number) {
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < html.length; i++) {
    const char = html[i];
    if (inString) {
      if (escape) escape = false;
      else if (char === "\\") escape = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === "{") depth++;
    else if (char === "}") {
      depth--;
      if (depth === 0) return html.slice(start, i + 1);
    }
  }
  return "";
}

function extractInitialData(html: string) {
  const markers = ["var ytInitialData = ", "window['ytInitialData'] = ", 'window["ytInitialData"] = '];
  for (const marker of markers) {
    const at = html.indexOf(marker);
    if (at >= 0) {
      const start = html.indexOf("{", at + marker.length);
      if (start >= 0) {
        const raw = extractBalancedJson(html, start);
        if (raw) {
          try {
            return JSON.parse(raw);
          } catch {
            // Continue to the next representation.
          }
        }
      }
    }
  }
  const key = '"ytInitialData":';
  const at = html.indexOf(key);
  if (at >= 0) {
    const start = html.indexOf("{", at + key.length);
    if (start >= 0) {
      const raw = extractBalancedJson(html, start);
      if (raw) {
        try {
          return JSON.parse(raw);
        } catch {
          // No usable initial-data object in this response.
        }
      }
    }
  }
  return null;
}

function collectVideoRenderers(node: any, out: any[]) {
  if (!node || typeof node !== "object") return;
  if (node.videoRenderer) out.push(node.videoRenderer);
  if (Array.isArray(node)) {
    for (const value of node) collectVideoRenderers(value, out);
  } else {
    for (const key of Object.keys(node)) if (key !== "videoRenderer") collectVideoRenderers(node[key], out);
  }
}

async function ytWebSearch(query: string, maxResults: number) {
  const url = new URL("https://www.youtube.com/results");
  url.searchParams.set("search_query", query);
  url.searchParams.set("hl", "en");
  url.searchParams.set("gl", "TT");

  const response = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151 Safari/537.36",
      "accept-language": "en-US,en;q=0.9",
    },
  });
  if (!response.ok) throw new Error(`YouTube web search ${response.status}`);
  const html = await response.text();
  const data = extractInitialData(html);
  if (!data) throw new Error("YouTube web search format unavailable");

  const renderers: any[] = [];
  collectVideoRenderers(data, renderers);
  return uniqueByVideoId(
    renderers.map((video: any) => {
      const thumbnails = video.thumbnail?.thumbnails || [];
      return {
        videoId: video.videoId,
        title: textOf(video.title),
        channel: textOf(video.ownerText) || textOf(video.longBylineText) || textOf(video.shortBylineText),
        publishedAt: textOf(video.publishedTimeText) || null,
        thumbnail: thumbnails.length ? thumbnails[thumbnails.length - 1].url : null,
        description: textOf(video.detailedMetadataSnippets?.[0]?.snippetText) || textOf(video.descriptionSnippet),
        durationSeconds: clockToSeconds(textOf(video.lengthText)),
        liveBroadcastContent: video.badges?.some((badge: any) => /live/i.test(textOf(badge.metadataBadgeRenderer?.label || badge.metadataBadgeRenderer))) ? "live" : "none",
        source: "youtube-web",
        watchUrl: `https://www.youtube.com/watch?v=${video.videoId}`,
        embeddable: null,
      };
    }),
  ).filter((item) => item.videoId && item.title).slice(0, maxResults);
}

async function ytSearchApi(key: string, query: string, maxResults: number, videoCategoryId?: string) {
  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("type", "video");
  url.searchParams.set("maxResults", String(Math.min(50, Math.max(1, maxResults))));
  url.searchParams.set("q", query);
  url.searchParams.set("safeSearch", "moderate");
  url.searchParams.set("videoEmbeddable", "true");
  url.searchParams.set("videoSyndicated", "true");
  url.searchParams.set("order", "relevance");
  url.searchParams.set("key", key);
  if (videoCategoryId) url.searchParams.set("videoCategoryId", videoCategoryId);

  const response = await fetch(url);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`YouTube API search ${response.status}: ${body.slice(0, 160)}`);
  }
  const result = await response.json();
  return (result.items || []).map((item: any) => ({
    videoId: item.id?.videoId,
    title: cleanText(item.snippet?.title),
    channel: cleanText(item.snippet?.channelTitle),
    publishedAt: item.snippet?.publishedAt || null,
    thumbnail: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url || null,
    description: cleanText(item.snippet?.description),
    source: "youtube-api",
  }));
}

async function enrichApi(key: string, items: any[], mode: string) {
  const ids = uniqueByVideoId(items).map((item) => item.videoId).filter(Boolean);
  if (!ids.length) return [];
  const metadata = new Map<string, any>();

  for (let i = 0; i < ids.length; i += 50) {
    const url = new URL("https://www.googleapis.com/youtube/v3/videos");
    url.searchParams.set("part", "status,contentDetails,snippet,liveStreamingDetails");
    url.searchParams.set("id", ids.slice(i, i + 50).join(","));
    url.searchParams.set("key", key);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`YouTube videos ${response.status}`);
    const result = await response.json();
    for (const item of result.items || []) metadata.set(item.id, item);
  }

  return uniqueByVideoId(items).filter((item) => {
    const meta = metadata.get(item.videoId);
    if (!meta || meta.status?.privacyStatus !== "public" || meta.status?.embeddable === false) return false;
    if (mode === "music" && !musicAllowed(item.title)) return false;
    const seconds = isoDurationToSeconds(meta?.contentDetails?.duration);
    if (mode === "music" && seconds && seconds > 15 * 60) return false;
    return true;
  }).map((item) => {
    const meta = metadata.get(item.videoId);
    return {
      ...item,
      durationSeconds: isoDurationToSeconds(meta?.contentDetails?.duration),
      definition: meta?.contentDetails?.definition || null,
      liveBroadcastContent: meta?.snippet?.liveBroadcastContent || "none",
      licensedContent: !!meta?.contentDetails?.licensedContent,
      embeddable: true,
      watchUrl: `https://www.youtube.com/watch?v=${item.videoId}`,
    };
  });
}

function filterWeb(items: any[], mode: string) {
  return uniqueByVideoId(items).filter((item) => {
    if (mode === "music" && !musicAllowed(item.title)) return false;
    if (mode === "music" && item.durationSeconds && item.durationSeconds > 15 * 60) return false;
    return true;
  });
}

async function discovery(body: any) {
  const apiKey = Deno.env.get("YOUTUBE_DATA_API_KEY") || "";
  const mode = String(body.mode || body.contentType || "music").toLowerCase();
  const genre = String(body.genre || "").toLowerCase().trim();
  const limit = Math.min(160, Math.max(1, Number(body.limit) || 100));
  let queries: string[] = [];

  if (Array.isArray(body.queries)) queries = body.queries.map(cleanText).filter(Boolean).slice(0, 6);
  if (!queries.length && genre && GENRE_SEEDS[genre]) queries = GENRE_SEEDS[genre];
  if (!queries.length && cleanText(body.query)) queries = [cleanText(body.query)];
  if (!queries.length) throw new Error("query, queries, or supported genre required");

  const perQuery = Math.min(50, Math.max(15, Math.ceil(limit / queries.length) + 5));
  let provider = "youtube-web";
  let warning: string | null = null;
  let results: any[] = [];

  if (apiKey) {
    try {
      const batches = await Promise.all(
        queries.map((query) => ytSearchApi(apiKey, query, perQuery, mode === "music" ? "10" : undefined)),
      );
      results = await enrichApi(apiKey, batches.flat(), mode);
      provider = "youtube-data-api";
    } catch (error) {
      warning = error instanceof Error ? error.message : String(error);
    }
  }

  if (!results.length) {
    const batches = await Promise.all(queries.map((query) => ytWebSearch(query, perQuery).catch(() => [])));
    results = filterWeb(batches.flat(), mode);
    provider = "youtube-public-search";
  }

  return {
    query: cleanText(body.query),
    queries,
    genre: genre || null,
    mode,
    results: results.slice(0, limit),
    providers: { youtube: true, provider, apiConfigured: !!apiKey },
    warning,
    excludedMixes: mode === "music",
    fallbackUsed: provider !== "youtube-data-api",
  };
}

async function playlist(body: any) {
  const apiKey = Deno.env.get("YOUTUBE_DATA_API_KEY") || "";
  const playlistId = cleanText(body.playlistId);
  if (!playlistId) throw new Error("playlistId required");
  if (!apiKey) {
    throw new Error("Playlist import requires the YouTube Data API key; generic discovery remains available through the public-search fallback.");
  }

  const mode = String(body.mode || "music").toLowerCase();
  const limit = Math.min(250, Math.max(1, Number(body.limit) || 160));
  const items: any[] = [];
  let page = "";

  do {
    const url = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
    url.searchParams.set("part", "snippet,contentDetails");
    url.searchParams.set("playlistId", playlistId);
    url.searchParams.set("maxResults", "50");
    url.searchParams.set("key", apiKey);
    if (page) url.searchParams.set("pageToken", page);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`YouTube playlist ${response.status}`);
    const result = await response.json();

    for (const item of result.items || []) {
      const title = cleanText(item.snippet?.title);
      if (mode !== "music" || musicAllowed(title)) {
        items.push({
          title,
          videoId: item.contentDetails?.videoId,
          channel: cleanText(item.snippet?.videoOwnerChannelTitle || item.snippet?.channelTitle),
          thumbnail: item.snippet?.thumbnails?.high?.url || null,
          source: "youtube-playlist",
        });
      }
    }
    page = result.nextPageToken || "";
  } while (page && items.length < limit);

  const results = await enrichApi(apiKey, items, mode);
  return {
    playlistId,
    mode,
    results: results.slice(0, limit),
    providers: { youtube: true, provider: "youtube-data-api" },
    excludedMixes: mode === "music",
  };
}

Deno.serve(async (req) => {
  const origin = originAllowed(req);
  if (req.method === "OPTIONS") return new Response(null, { status: origin ? 204 : 403, headers: cors(origin) });
  if (req.method !== "POST") return json(req, { error: "POST required" }, 405);
  if (!origin) return json(req, { error: "Origin not allowed" }, 403);
  if (!validPublishableKey(req)) return json(req, { error: "Invalid FTN client key" }, 401);

  try {
    const body = await req.json();
    const result = body.playlistId ? await playlist(body) : await discovery(body);
    return json(req, result);
  } catch (error) {
    return json(req, { error: error instanceof Error ? error.message : String(error) }, 400);
  }
});
