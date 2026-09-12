# IBIS Founder Voice — Chatterbox Nano

This is the FTN-owned primary founder-voice synthesis service. It uses the MIT-licensed Resemble AI Chatterbox Nano model and zero-shot voice cloning from the founder-authorized reference recording.

## Privacy and trust contract

The raw reference recording is **never stored in this repository or baked into the container image**. Mount it at runtime as a private file and set `IBIS_FOUNDER_VOICE_REFERENCE_PATH`. At startup/use, the service refuses synthesis unless the recording's SHA-256 exactly matches the approved founder sample:

`a1c58062344bb586dad665b9db6b81bba56af85fbffd214a6c17df3f4d270e9b`

The service also requires a private bearer token via `IBIS_FOUNDER_VOICE_SERVICE_TOKEN`. The public browser must never call this service directly; `ibis-founder-voice` is the policy/rate-limit gateway.

## Required environment

- `IBIS_FOUNDER_VOICE_SERVICE_TOKEN` — long random server-to-server token
- `IBIS_FOUNDER_VOICE_REFERENCE_PATH` — mounted private reference file path; defaults to `/run/secrets/ibis-founder-voice/reference.ogg`
- `PORT` — default `8080`
- optional `TORCH_NUM_THREADS`

## Routes

- `GET /health` — authenticated, no generation; proves provider/model/reference identity and readiness.
- `POST /speak` with `{ "text": "..." }` — authenticated; returns base64 WAV plus founder-voice provenance.

## Deployment

The image is deliberately portable across ordinary CPU container hosts. Chatterbox Nano is selected with `ChatterboxTurboTTS.from_pretrained(device="cpu", nano=True)`. Model weights download at first model load unless the host supplies a persistent Hugging Face cache.

The edge gateway should be configured with:

- `IBIS_FOUNDER_VOICE_OPEN_URL=https://<private-or-protected-service>`
- `IBIS_FOUNDER_VOICE_OPEN_TOKEN=<same server-to-server token>`

A generic TTS voice is never an acceptable substitute for `IBIS_FOUNDER_VOICE`.
