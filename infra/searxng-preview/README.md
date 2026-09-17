# FTN ibis -- SearXNG PREVIEW deployment

**Classification: PREVIEW, not production.** No uptime SLA, no persistent disk, subject to the
free-tier host's cold-start/sleep behavior (see "Known limitations" below). This exists to give
`supabase/functions/_shared/ibis-search-adapter.ts`'s **already-existing** `searxngSearch()`
adapter a real, zero-marginal-cost endpoint to call -- that adapter is reused exactly as-is; this
deployment does not add, replace, or duplicate any IBIS code.

Everything in this folder (the `Dockerfile`, `settings.yml`) was prepared so the only remaining
steps require a founder's own account -- creating an account or entering payment/billing details
on Render's or Hugging Face's own site is something only the founder can do; it isn't done here.

## What you're deploying

The official `searxng/searxng` Docker image with one settings override
(`settings.yml` in this folder): JSON search output enabled (required by `searxngSearch()`), the
built-in request limiter turned on, debug mode off, and this instance never listed as a public
"community" SearXNG instance.

## Secret key (required -- the container will not start without it)

SearXNG refuses to start if `server.secret_key` is still the literal placeholder
`"ultrasecretkey"` that ships in `settings.yml` (it exits with
`server.secret_key is not changed. Please use something else instead of ultrasecretkey.`).
`settings.yml` deliberately keeps that placeholder -- a real secret is never committed to Git.
Instead, SearXNG reads the **`SEARXNG_SECRET_KEY`** environment variable at startup and uses it as
the effective `server.secret_key`, overriding the placeholder.

1. Generate a real value yourself, e.g. `openssl rand -hex 32` (or any equivalent 32+ byte random
   generator) -- a long random hex string, not a memorable password.
2. Set it as an environment variable named exactly `SEARXNG_SECRET_KEY` on whichever platform you
   deploy to (Render: see step A4 below; Hugging Face: Space **Settings -> Variables and
   secrets -> New secret**), marked **Secret**/hidden wherever the platform offers that option --
   never paste this value into a chat session or commit it to Git.
3. This value only needs to be internally consistent for this one deployed instance (it signs
   session/CSRF tokens) -- it is not shared with, or read by, `ibis-search-adapter.ts` or any other
   IBIS code; IBIS only ever calls the instance's public `/search?format=json` endpoint.

## Option A -- Render (recommended: simplest free "Docker Web Service" flow)

1. Go to **https://render.com/register** and sign up (GitHub sign-in is fastest -- one click,
   then authorize Render to read your repos).
2. From the Render dashboard: **New +** -> **Web Service**.
3. Connect this repository (`thecaribbeanpressnetwork-lang/ftn-platform-website`) -- Render will
   ask to install its GitHub App on the repo/org if not already installed (one authorize click).
4. Render should auto-detect a `Dockerfile`. Set:
   - **Root Directory**: `infra/searxng-preview`
   - **Instance Type**: Free
   - **Environment Variable** (required, see "Secret key" above): name `SEARXNG_SECRET_KEY`,
     your generated value, marked **Secret**.
5. Click **Create Web Service**. Render builds the image and deploys it -- first build typically
   takes a few minutes.
6. Once live, Render shows a URL like `https://ftn-searxng-preview.onrender.com`. Copy it -- you
   will use it in two places (see "After it's live" below).
7. (Optional, second edit) Add an environment variable `SEARXNG_BASE_URL` set to that same URL
   (with a trailing slash) so SearXNG's own internally-generated links are correct. This is
   SearXNG's OWN config, separate from the identically-named Supabase secret in step 2 below --
   see "Two `SEARXNG_BASE_URL`s, same name" below.

## Option B -- Hugging Face Docker Space

1. Go to **https://huggingface.co/join** and sign up.
2. Go to **https://huggingface.co/new-space**.
3. Choose **Docker** as the Space SDK and the **Blank** template. Pick a name (e.g.
   `ftn-ibis-searxng-preview`) and a visibility (Public is required on the free tier for an
   always-reachable Space in most cases -- confirm current terms at creation time).
4. A Space is its own git repository. Push (or upload via the web UI) this folder's `Dockerfile`
   and `settings.yml` to the Space's repo root.
5. Hugging Face Docker Spaces expect the container to listen on **port 7860** by default. Add a
   line `EXPOSE 7860` (or edit the existing `EXPOSE 8080` line) in the `Dockerfile` copy you push
   to the Space, and add `SEARXNG_BIND_ADDRESS: "0.0.0.0:7860"` under `server:` in your pushed copy
   of `settings.yml` -- do not change the copy kept in this repository, since Render (Option A)
   still expects port 8080.
6. Set the required `SEARXNG_SECRET_KEY` variable (see "Secret key" above) under the Space's
   **Settings -> Variables and secrets -> New secret**.
7. The Space builds automatically on push. Once live, its URL is
   `https://<your-username>-<space-name>.hf.space`.

## After it's live

1. **Verify it directly** (from any machine, no FTN code involved): open
   `https://<your-deployed-url>/search?q=test&format=json` in a browser or `curl` it -- you should
   get back a JSON object with a `results` array, not an error page.
2. **Set the Supabase secret** so IBIS's own search adapter uses it -- run this yourself (never
   paste a Supabase access token into a chat session):
   ```bash
   supabase secrets set SEARXNG_BASE_URL=https://<your-deployed-url> --project-ref jshmidfpqrajxtukzges
   ```
   or set it via the Supabase dashboard: **Project -> Edge Functions -> Secrets -> Add secret**,
   name `SEARXNG_BASE_URL`, value your deployed URL (no trailing slash -- `searxngSearch()` strips
   one if present, but a bare URL is cleanest).
3. Tell the session working on IBIS the deployed URL (it is not a secret -- it's a public search
   endpoint, safe to share) so it can run a real, live `curl` proof against it and confirm real
   result URLs/titles/dates come back before calling this checkpoint accepted.

## Two `SEARXNG_BASE_URL`s, same name

- **SearXNG's own `server.base_url`** (or its `SEARXNG_BASE_URL` env var, if you set one in step
  A7): tells the SearXNG application itself what its own public URL is, for links it generates
  in its HTML results page. Optional for JSON-only usage.
- **The Supabase Edge Function secret `SEARXNG_BASE_URL`** (step 2 above): tells
  `ibis-search-adapter.ts`'s `searxngSearch()` WHERE to send its search requests. This is the one
  that actually matters for IBIS.

They happen to share a name by convention (SearXNG's own docs use it too) but live in two
completely separate systems.

## Known limitations (disclose, don't hide)

- **Cold start**: both Render's and Hugging Face's free tiers sleep an inactive service/Space
  after a period of no traffic (Render: free web services spin down after ~15 minutes idle;
  Hugging Face: free Spaces sleep after a period of inactivity, exact window set by HF and subject
  to change). The next request after a sleep can take 30-60+ seconds to respond while the
  container cold-starts. `ibis-search-adapter.ts`'s `searxngSearch()` has its own 8-second default
  timeout (`timeoutMs`), so a cold-started instance will likely time out on the FIRST request after
  idling and gracefully fall through to the next configured provider (Brave, if configured, else
  an honest `SEARCH_UNAVAILABLE`) -- never a hang, never a fabricated answer, but also not a
  reliable first-request experience for a genuinely idle preview instance.
- **No persistent disk on either free tier**: nothing SearXNG writes to disk at runtime survives a
  restart. This does not affect `server.secret_key` (set via the `SEARXNG_SECRET_KEY` environment
  variable, stable across restarts as long as that variable itself doesn't change -- see "Secret
  key" above), but any other on-disk state (e.g. a future Redis-backed limiter, if added) would
  need to be reconfigured to not depend on local disk.
- **Outbound traffic / rate limits**: both platforms cap free-tier bandwidth and compute (exact
  current numbers change -- confirm at signup). SearXNG itself fans a single search query out to
  several upstream engines (Google, Bing, DuckDuckGo, Wikipedia, etc. by default) -- each IBIS
  search can trigger several outbound requests from the preview instance, not just one. This is
  additional reason `ibis-search-adapter.ts`'s cache/dedup/budget layer (see
  `docs/ibis/acceptance-baseline.md`'s "Live Search Infrastructure" section) matters even for a
  "free" open-source provider -- it is not literally free of load on the preview instance itself.
- **No uptime guarantee**: this is explicitly a PREVIEW instance for proving the integration and
  giving founders/investors something real to see, not a production search backbone. A durable
  primary deployment (a small always-on host, or a paid tier on either platform) is a separate,
  later decision.
- **Not tested against a live container by this session**: no Docker is available in the sandbox
  this configuration was authored in, so this `Dockerfile`/`settings.yml` pair has not been built
  or run locally. Verify the JSON endpoint (step "After it's live", #1) before treating this as
  working.
