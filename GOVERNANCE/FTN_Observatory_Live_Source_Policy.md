# FTN Live — Live Source Policy

## Purpose
FTN Live / National Observatory may present or link to live national media only when the source is authoritative, publicly accessible, and legally usable by FTN.

## Source classes
- **Official live source** — the originating authority publishes a live radar, satellite, camera, data or alert source.
- **Official data** — authoritative current or near-current data, but not necessarily a continuous stream.
- **Network reference** — an authority confirms that a monitoring/camera system exists, but FTN has not verified a public feed that can be embedded.
- **Awaiting authorized feed** — the FTN interface has a prepared slot but no verified feed is connected.

## Non-negotiable rules
1. Never label prerecorded, demonstration, cached or simulated media as live.
2. Never scrape restricted CCTV or surveillance systems.
3. Never bypass authentication, advertising, platform controls, robots restrictions or access controls.
4. Never publish private camera feeds without explicit rights/authorization.
5. Always identify the originating authority and preserve source attribution.
6. Prefer links to authoritative pages when direct embedding rights or technical permissions are uncertain.
7. Credentials and API secrets must remain server-side once backend integrations are introduced.

## Phase 1 verified source layer
The first Observatory live-source layer includes:
- Trinidad and Tobago Meteorological Service radar imagery.
- Trinidad and Tobago Meteorological Service Caribbean satellite imagery.
- Trinidad and Tobago Meteorological Service WIS 2.0 observation catalogue.
- Ministry of Works and Transport traffic-enforcement camera-network reference, explicitly not represented as a public livestream.
- Trinidad and Tobago Police Service as an official public-safety source, without inventing a camera feed.

## Camera wall
The public camera wall is intentionally implemented as source-ready slots for Port of Spain, San Fernando, Chaguanas and Scarborough/Tobago. A slot becomes an active embedded or proxied feed only after FTN verifies the source, rights, reliability and technical integration method.

## Future backend integration
A future FTN-owned feed service should normalize source metadata, health checks, refresh timestamps, caching policy, geographic coordinates, usage rights and failover state. The public page should consume that service instead of embedding vendor-specific logic throughout the UI.
