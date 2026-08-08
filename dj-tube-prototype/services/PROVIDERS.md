# DJ Tube provider configuration

## Stem separation — Replicate + Demucs

The concrete provider is `replicate-demucs-provider.js` and calls the Supabase Edge Function `dj-tube-stems`.

Backend model: `cjwbw/demucs`, using the documented `htdemucs` model. The model exposes vocals, drums, bass and other outputs. Replicate requires an API token for predictions.

Required Supabase secret:

`REPLICATE_API_TOKEN`

Do not put the token in GitHub or browser JavaScript.

## Music discovery — MusicBrainz + YouTube Data API

The concrete provider is `caribbean-api-provider.js` and calls `dj-tube-discovery`.

MusicBrainz works without a private API key and supplies recording/artist metadata. YouTube Data API v3 supplies YouTube video search and playlist items when configured.

Required Supabase secret for YouTube enrichment:

`YOUTUBE_DATA_API_KEY`

The discovery filter excludes titles containing `mix`, `mixtape`, `full mix`, or `mega mix`. It deliberately protects `remix` by replacing that token before applying the mix filter.

DJ mix/playlist items are represented as `track-list-lead` and have `playableSource: null`; they are never promoted to playable DJ tracks by the discovery service.

## Current deployment

Supabase project: `jshmidfpqrajxtukzges`

Edge functions:

- `/functions/v1/dj-tube-stems` — ACTIVE, JWT protected
- `/functions/v1/dj-tube-discovery` — ACTIVE, JWT protected

## Remaining credential gate

The code is deployed and wired, but the two external credentials cannot be invented or safely stored by the application code. Until `REPLICATE_API_TOKEN` is supplied to Supabase, stem separation will correctly return `Stem provider not configured`. Until `YOUTUBE_DATA_API_KEY` is supplied, discovery still works through MusicBrainz but YouTube search/playlist enrichment is disabled.

This is intentional: no fake key, leaked secret, or unauthorized scraping endpoint is used.
