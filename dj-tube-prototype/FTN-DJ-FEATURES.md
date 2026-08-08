# FTN DJ — Feature Profile Architecture

FTN DJ is the DJ workspace inside FTN Rhythm. DJ Tube is the two-deck/controller experience within that workspace.

## Profile is the product pitch

Before entering the controller, a DJ chooses a saved profile and sees the complete capability list. Every capability is independently toggleable. The controller then exposes only enabled tools, keeping laptops/tablets uncluttered.

## Feature switches

- Beat Matching
- AI Mix Now
- Stem Separation
- Deep Track Analysis
- Smart Cue Points
- DJ Drop Bank
- Beat-Level Ducking
- Headphone Preview
- Advanced EQ
- Loops + Beat Jump
- Pitch + Key Lock
- USB Controller Support
- Caribbean Discovery
- DJ Mix Protection
- Read the Room
- DJ Signature
- Humanize My Mix
- Vocal Collision Guard
- Offline Performance
- Performance Recorder
- Smart Setlist
- Why This Track?
- Authorized Media Downloads
- Caribbean Mode

## Suggested presets

- Simple DJ
- Club Performance
- Carnival DJ
- Radio / Broadcast
- AI DJ
- FTN DJ — Full Suite
- Custom profile

## UX principles

1. Profile selection is a sales pitch: every capability is visible before activation.
2. A DJ can toggle any feature independently.
3. Profiles can be named and saved.
4. Saved profiles are local-first; authenticated cloud sync can be added through Supabase.
5. The controller is responsive for laptop/tablet and should not require browser zoom to fit.
6. Manual DJ control always remains available.
7. Cloud AI is optional; local playback should remain useful offline.
8. Discovery excludes standalone `mix`, `mixtape`, `full mix`, continuous mixes and similar set titles from playable indexing. `remix` remains allowed.
9. DJ mixes may provide track-list leads, but the mix itself is not treated as an individual playable track.
10. YouTube integration uses permitted embedded/API capabilities. FTN DJ does not scrape iframe audio or automate ad-bypass/clicking.

## Caribbean intelligence

Caribbean Mode should prioritize genre/scene context including Soca, Calypso, Dancehall, Reggae, Bouyon, Zouk, Kompa, Chutney, Chutney Soca, Afrobeats and related Caribbean/Atlantic styles. Transition recommendations should consider BPM, key, phrase, drums, bass, vocal density and energy—not BPM alone.

## Intelligent DJ features

AI Mix Now proposes a transition window, length and method. Mix lengths are selectable (2/4/8/16/32 bars or custom seconds). Vocal Collision Guard avoids important vocal phrases. Humanize adds controlled natural variation. Read the Room recommends energy progression. Why This Track explains recommendations. DJ Signature stores the DJ's preferred mixing personality.

## Hardware

Web MIDI is primary for class-compliant MIDI controllers. WebHID is available for devices that expose HID. Device profiles should map jogs, pitch, EQ, filters, pads, faders, crossfader, CUE, browse/load, loops, beat jump, slip, sync and LED feedback where browser/device permissions permit.
