# DJ Tube production service layer

These modules are browser-side contracts/adapters for the production DJ Tube architecture.

- `audio-analysis.js`: BPM, beat grid, key/phrase interfaces, song-start detection, vocal-region hook. The included BPM/start routines are lightweight heuristics; production should plug in a validated analysis model.
- `audio-ingestion.js`: loads DJ-owned local audio or an authorized HTTPS audio source into Web Audio. It does not extract or download YouTube audio.
- `stem-processor.js`: provider interface for authorized vocal/drum/bass/other separation.
- `beat-scheduler.js`: AudioContext-time lookahead scheduler for beat/phrase-accurate events.
- `caribbean-discovery.js`: Caribbean scene search contract, title filtering, and DJ-mix track-list leads. `remix` is allowed; `mix` candidates are excluded. A real provider/API must be configured.
- `midi-webhid.js`: Web MIDI and optional WebHID controller adapter.

## Production wiring

`authorized audio -> analysis -> beat grid -> Web Audio -> EQ/filter/gain -> crossfader -> master/headphone buses`.

`analysis + queue + next track -> mix planner -> beat scheduler -> parameter automation/stem ducking`.

`Caribbean discovery provider -> candidate filter -> individual track lookup`; DJ mixes are metadata/track-list leads only.

No module bypasses YouTube advertising, extracts YouTube iframe audio, or rehosts third-party DJ mixes.
