# DJ Tube media downloads

The download manager supports three modes for media the DJ is authorized to save:

- **Original**: preserves the supplied source.
- **Audio only**: delegated to an authorized transcoder/provider.
- **Video only**: delegated to an authorized transcoder/provider.

Multiple jobs can be queued with `downloadMany()`. The UI adapter provides per-job progress/status.

## Source policy

The manager accepts a local `File`/`Blob` or an authorized HTTPS media URL. It deliberately does not extract media from a YouTube iframe, bypass YouTube advertising, defeat access controls, or download third-party material without authorization.

## Production transcoder

Configure `AuthorizedTranscoderAdapter` with a server-side transcoding provider. Keep credentials server-side. The browser should receive only the resulting authorized media URL/blob.

## Recommended UI

Place download controls beside each authorized library item: `Original`, `Audio only`, `Video only`, then `Add to queue`. Show queue progress and allow several independent jobs. Downloads should be associated with the DJ's media library and retention policy when persistent storage is enabled.
