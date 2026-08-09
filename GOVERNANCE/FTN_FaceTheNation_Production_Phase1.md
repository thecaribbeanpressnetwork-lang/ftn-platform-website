# Face The Nation — Production Phase 1

## Purpose
Move the Face The Nation page from a static programme description toward a real public-affairs product surface while keeping the current production state explicit.

## Operational now
- Programme identity and editorial positioning.
- Public topic-suggestion intake saved in the visitor's browser.
- Public guest-recommendation intake saved in the visitor's browser.
- Public location/community pitch intake saved in the visitor's browser.
- Local recent-suggestion history.
- Community / constituency and issue-area context captured with each suggestion.
- Face The Nation social hub with direct links to YouTube, Instagram, Facebook, TikTok and X.
- YouTube watch surface prepared for an official featured episode/video ID, with a direct official-channel fallback until an episode is configured.

## Media configuration
The public programme identity is `@FaceTheNationTT`. The secondary YouTube channel uses the handle `@FaceTheNation-TT`. Social URLs are centralized in the Face The Nation page script so profile changes can be corrected in one place.

The YouTube player uses privacy-enhanced `youtube-nocookie.com` embedding when a featured video ID is configured. Until an official episode video ID exists, the page does not fabricate a player or fake episode; it shows the programme's YouTube launch panel and links visitors to the official channel.

## Not yet operational
- Cloud newsroom/editorial queue.
- Guaranteed editorial review of locally saved suggestions.
- Automated episode-feed ingestion from YouTube.
- Livestream scheduling / automatic live-state detection.
- Guest scheduling / booking.
- Audience registration.
- Automated Community Connect-to-editorial ingestion.

## Editorial rules
- Suggestions do not guarantee coverage, endorsement, invitation or airtime.
- Face The Nation retains editorial control over programme selection and framing.
- No candidate, office-holder or public figure receives implied endorsement from appearing in programme planning copy.
- Future cloud submission must include privacy, retention and newsroom-access controls before activation.

## Architecture
The participation layer uses the shared FTN Integration Adapter. Today that adapter stores records locally; a future newsroom API can replace that storage seam without rebuilding the public form.

The media layer deliberately separates channel/profile identity from individual episode IDs. Future YouTube API or backend feed integration should populate the same media surface rather than introducing a second programme page.

## FTN Product Mnemonic Layer
Face The Nation uses a broadcast-signal mnemonic: concentric signal rings, a directional beam and a voice waveform integrated into the hero rather than a generic decorative icon.

The mnemonic follows the FTN product rule that the visual must communicate the product's function and become behaviorally meaningful. It stays quiet at rest and pulses only after a successful Topic, Guest or Location Desk save action. Motion is disabled for `prefers-reduced-motion` users.

This mnemonic is product-specific and must not be reused unchanged by another FTN module. Shared FTN identity remains black / white / FTN red; the mnemonic adds recognition without replacing the master brand.
