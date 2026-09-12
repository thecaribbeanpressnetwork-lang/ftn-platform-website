---
title: IBIS Founder Voice
emoji: 🐦
colorFrom: teal
colorTo: gray
sdk: docker
app_port: 8080
pinned: false
license: mit
---

# IBIS Founder Voice — Chatterbox Nano

This is the FTN-owned primary founder-voice synthesis service. It uses the MIT-licensed Resemble AI Chatterbox Nano model and zero-shot voice cloning from the founder-authorized reference recording.

## Privacy and trust contract

The raw reference recording is **never stored in this repository or baked into the container image**. Mount it at runtime as a private file and set `IBIS_FOUNDER_VOICE_REFERENCE_PATH`. At startup/use, the service refuses synthesis unless the recording's SHA-256 exactly matches the approved founder sample:

`a1c58062344bb586dad665b9db6b81bba56af85fbffd214a6c17df3f4d270e9b`

The service also requires a private bearer token via `IBIS_FOUNDER_VOICE_SERVICE_TOKEN`. The public browser must never call this service directly; `ibis-founder-voice` is the policy/rate-limit gateway.

## Required environment

- `IBIS_FOUNDER_VOICE_SERVICE_TOKEN` — long random server-to-server token
- `IBIS_FOUNDER_VOICE_REFERENCE_PATH` — mounted private reference file path; defaults to `/run/secrets/ibis-founder-voice/reference.ogg`
- `IBIS_FOUNDER_VOICE_REFERENCE_B64` — alternative private secret containing the approved six-second derived reference clip; preferred on Hugging Face Spaces
- `PORT` — default `8080`
- optional `TORCH_NUM_THREADS`

## Routes

- `GET /health` — authenticated, no generation; proves provider/model/reference identity and readiness.
- `POST /speak` with `{ "text": "..." }` — authenticated; returns base64 WAV plus founder-voice provenance.

## Deployment

The image is deliberately portable across CPU container hosts with enough memory for the model. Chatterbox Nano is selected with `ChatterboxTurboTTS.from_pretrained(device="cpu", nano=True)`. The private reference is verified and the model is loaded during application startup, so `/health` cannot report ready before the runtime is genuinely usable. Model weights download at startup unless the host supplies a persistent Hugging Face cache.

For a Hugging Face Docker Space, add `IBIS_FOUNDER_VOICE_SERVICE_TOKEN` and `IBIS_FOUNDER_VOICE_REFERENCE_B64` as **Secrets**, never Variables or repository files. The public Space URL remains protected by the bearer token.

Generate the compact secret from the authorized full recording with:

```bash
bash derive-reference.sh /private/path/founder-reference.ogg /private/path/founder-reference-6s.ogg
base64 -w 0 /private/path/founder-reference-6s.ogg
```

The derivation script refuses a different source recording and produces a deterministic artifact matching the SHA-256 pinned in `app.py`.

The edge gateway should be configured with:

- `IBIS_FOUNDER_VOICE_OPEN_URL=https://<private-or-protected-service>`
- `IBIS_FOUNDER_VOICE_OPEN_TOKEN=<same server-to-server token>`

A generic TTS voice is never an acceptable substitute for `IBIS_FOUNDER_VOICE`.
