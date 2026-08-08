# DJ Tube Audio Architecture

## Source boundary
YouTube is a display/playback adapter. DJ Tube does not download, capture, proxy, strip ads from, or rehost YouTube audio. The full Web Audio path is reserved for DJ-owned, licensed, or otherwise authorized audio sources.

## Signal flow

Authorized Deck A/B source -> MediaElement/WebAudio input -> per-deck EQ -> filter -> channel gain -> crossfader -> master -> output.

A parallel cue bus feeds headphone monitoring. CUE A/B is independent of the master mix. Headphone MIX blends cue and master, while headphone LEVEL controls safe output gain.

## Real EQ
`audio-engine.js` creates high-shelf, parametric mid, low-shelf and low-pass filter nodes. The UI can map mixer knobs to these nodes without changing the controller.

## Stem separation
`stem-engine.js` defines a provider boundary for an authorized stem service. Expected outputs: vocals, drums, bass, other. Stem gains can be automated during transitions for vocal-safe and bass-swap mixes.

## AI mixing
`mix-engine.js` separates analysis from orchestration. An analysis provider supplies BPM, Camelot key, energy, vocal regions and phrase markers. The engine scores compatibility, chooses a phrase-safe transition window and schedules the mix.

## Beat-level ducking
A scheduler should quantize automation to beat/downbeat timestamps. Typical automation: duck incoming vocals during outgoing vocals; cut/restore bass around a bass swap; duck music briefly while a DJ-owned name drop plays.

## DJ drops
`drop-scheduler.js` only accepts DJ-owned/user-provided audio. Rules select instrumental/break/drop windows and schedule the drop on a beat/phrase boundary.

## Headphone preview
True independent CUE monitoring requires the source audio to be accessible to Web Audio. Cross-origin YouTube iframe audio cannot be routed through this page's Web Audio graph. Therefore the controller exposes the CUE architecture now, but does not pretend that YouTube iframe audio is isolated in headphones.

## Production services to add
1. Analysis API: BPM, beat grid, key, phrase, vocal density, song-start detection.
2. Authorized audio ingestion: DJ-owned/licensed files and approved partner sources.
3. Stem provider: authorized/local processing.
4. Mix scheduler: server-assisted planning, browser real-time execution.
5. Caribbean discovery service: individual-track discovery with `mix` exclusion; DJ mixes may be used as metadata/track-list leads only.
6. MIDI/WebHID adapter: map DDJ controls to the same engine state.

## Safety/rights rules
- Exclude titles containing the standalone token `mix` from track indexing.
- Keep `remix` allowed.
- Do not index long DJ mixes as playable tracks.
- Do not download/rehost third-party DJ mixes.
- Do not bypass YouTube advertising or playback controls.
