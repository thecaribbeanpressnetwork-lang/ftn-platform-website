# Face The Nation — Production Phase 1

## Purpose
Move the Face The Nation page from a static programme description toward a real public-affairs product surface while keeping the current production state explicit.

## Operational now
- Programme identity and editorial positioning.
- Public topic-suggestion intake saved in the visitor's browser.
- Public guest-recommendation intake saved in the visitor's browser.
- Local recent-suggestion history.
- Community / constituency and issue-area context captured with each suggestion.

## Not yet operational
- Cloud newsroom/editorial queue.
- Guaranteed editorial review of locally saved suggestions.
- Episode publishing backend.
- Livestreaming.
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
