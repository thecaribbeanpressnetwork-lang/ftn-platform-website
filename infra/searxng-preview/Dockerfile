# FTN ibis -- SearXNG PREVIEW instance (open-source, zero-marginal-cost primary search provider).
#
# This is a PREVIEW deployment, not a production SLA: no persistent disk, no autoscaling, no
# uptime guarantee, subject to the free-tier host's cold-start/sleep behavior (see README.md in
# this folder). It exists to give ibis-search-adapter.ts's ALREADY-EXISTING searxngSearch()
# adapter (supabase/functions/_shared/ibis-search-adapter.ts) something real to call -- that
# adapter is REUSED as-is, never replaced or duplicated by this deployment.
#
# Built on the official SearXNG image; only settings.yml is overridden. The base image's own
# docker-entrypoint.sh replaces the placeholder secret_key below with a fresh random one on every
# container start (see README.md's "Secret key" section for why that's an accepted, disclosed
# tradeoff for a stateless JSON-API preview with no persistent disk).
FROM searxng/searxng:latest

COPY settings.yml /etc/searxng/settings.yml

# Render/Hugging Face Spaces both route inbound HTTP to whatever port the container listens on;
# SearXNG's default entrypoint binds :8080 unless PORT/SEARXNG_PORT overrides it. Hugging Face
# Docker Spaces specifically expect port 7860 by default -- set the PORT env var at deploy time
# (Render) or EXPOSE 7860 + SEARXNG_BIND_ADDRESS override (Hugging Face); see README.md for the
# exact per-platform steps rather than hardcoding one platform's convention here.
EXPOSE 8080
