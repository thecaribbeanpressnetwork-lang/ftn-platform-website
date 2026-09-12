import base64
import hashlib
import io
import os
import subprocess
from pathlib import Path

import soundfile as sf
import torch
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field
from chatterbox.tts_turbo import ChatterboxTurboTTS

VOICE_IDENTITY = "IBIS_FOUNDER_VOICE"
PROVIDER = "chatterbox-nano"
MODEL = "ResembleAI/chatterbox-nano"
EXPECTED_REFERENCE_SHA256 = "a1c58062344bb586dad665b9db6b81bba56af85fbffd214a6c17df3f4d270e9b"
FULL_REFERENCE_SHA256 = EXPECTED_REFERENCE_SHA256
DERIVED_REFERENCE_SHA256 = "20be317f6ca9a04384f8fc8622760080f2f0560b1bdef756ef188c9f62e26548"
REFERENCE_PATH = Path(os.getenv("IBIS_FOUNDER_VOICE_REFERENCE_PATH", "/run/secrets/ibis-founder-voice/reference.ogg"))
REFERENCE_B64 = os.getenv("IBIS_FOUNDER_VOICE_REFERENCE_B64", "")
DERIVED_REFERENCE_PATH = Path("/tmp/ibis-founder-reference.wav")
REFERENCE_WINDOW_START_SECONDS = 100.0
REFERENCE_WINDOW_SECONDS = 6.0
SOURCE_WINDOW_START_SECONDS = REFERENCE_WINDOW_START_SECONDS
SOURCE_WINDOW_SECONDS = REFERENCE_WINDOW_SECONDS
AUTH_TOKEN = os.getenv("IBIS_FOUNDER_VOICE_SERVICE_TOKEN", "")
MAX_TEXT_CHARS = int(os.getenv("IBIS_FOUNDER_VOICE_MAX_TEXT_CHARS", "2500"))

app = FastAPI(title="IBIS Founder Voice — Chatterbox Nano", docs_url=None, redoc_url=None)
_model = None
_reference_verified = False


class SpeakRequest(BaseModel):
    text: str = Field(min_length=1, max_length=2500)


def require_auth(authorization: str | None) -> None:
    if not AUTH_TOKEN:
        raise HTTPException(status_code=503, detail="Service authentication is not configured")
    if authorization != f"Bearer {AUTH_TOKEN}":
        raise HTTPException(status_code=401, detail="Unauthorized")


def _decode_private_reference() -> Path | None:
    """Materialize only the privately supplied derived reference clip.

    Production can inject the small founder-authorized 6s Opus clip as a secret environment value,
    avoiding any raw founder audio in the public repository or public object storage.
    """
    if not REFERENCE_B64:
        return None
    try:
        raw = base64.b64decode(REFERENCE_B64, validate=True)
    except Exception as exc:
        raise RuntimeError("Founder voice reference secret is not valid base64") from exc
    digest = hashlib.sha256(raw).hexdigest()
    if digest != DERIVED_REFERENCE_SHA256:
        raise RuntimeError("Derived founder voice reference SHA-256 mismatch; refusing to synthesize")
    source = Path("/tmp/ibis-founder-reference-secret.ogg")
    source.write_bytes(raw)
    return source


def verify_reference() -> bool:
    global _reference_verified
    if _reference_verified and DERIVED_REFERENCE_PATH.is_file():
        return True

    source = _decode_private_reference()
    if source is None:
        # Local/private-host deployment may mount the original authorized recording instead.
        if not REFERENCE_PATH.is_file():
            return False
        digest = hashlib.sha256(REFERENCE_PATH.read_bytes()).hexdigest()
        if digest != EXPECTED_REFERENCE_SHA256:
            raise RuntimeError("Founder voice reference SHA-256 mismatch; refusing to synthesize")
        source = REFERENCE_PATH
        ss = ["-ss", str(REFERENCE_WINDOW_START_SECONDS)]
        duration = REFERENCE_WINDOW_SECONDS
    else:
        # The secret is already the derived speech-rich clip; do not seek into it.
        ss = []
        duration = REFERENCE_WINDOW_SECONDS

    subprocess.run([
        "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
        *ss, "-i", str(source), "-t", str(duration), "-ac", "1", "-ar", "24000",
        str(DERIVED_REFERENCE_PATH),
    ], check=True, timeout=30)
    if not DERIVED_REFERENCE_PATH.is_file() or DERIVED_REFERENCE_PATH.stat().st_size < 10_000:
        raise RuntimeError("Could not derive founder voice reference window")
    _reference_verified = True
    return True


def get_model():
    global _model
    if _model is None:
        # Chatterbox Nano is CPU-capable and uses the Turbo class with nano=True.
        torch.set_num_threads(max(1, int(os.getenv("TORCH_NUM_THREADS", str(os.cpu_count() or 4)))))
        _model = ChatterboxTurboTTS.from_pretrained(device="cpu", nano=True)
    return _model


@app.get("/health")
def health(authorization: str | None = Header(default=None)):
    require_auth(authorization)
    reference_ready = verify_reference()
    return {
        "capability": "FOUNDER_TEXT_TO_SPEECH",
        "provider": PROVIDER,
        "model": MODEL,
        "openSource": True,
        "license": "MIT",
        "configured": bool(AUTH_TOKEN and reference_ready),
        "ready": bool(AUTH_TOKEN and reference_ready),
        "voiceEnrolled": reference_ready,
        "founderVoiceRequired": True,
        "genericVoiceAcceptedAsPrimary": False,
        "voiceIdentity": VOICE_IDENTITY,
        "referenceSampleSha256": EXPECTED_REFERENCE_SHA256,
        "derivedReferenceSha256": DERIVED_REFERENCE_SHA256,
        "referenceWindow": {"startSeconds": REFERENCE_WINDOW_START_SECONDS, "durationSeconds": REFERENCE_WINDOW_SECONDS},
        "privateReferenceTransport": "secret-env-or-private-mount",
        "watermark": "PerTh",
        "generationAttempted": False,
    }


@app.post("/speak")
def speak(body: SpeakRequest, authorization: str | None = Header(default=None)):
    require_auth(authorization)
    if not verify_reference():
        raise HTTPException(status_code=503, detail="Founder voice reference is unavailable")
    text = body.text.strip()[:MAX_TEXT_CHARS]
    if not text:
        raise HTTPException(status_code=400, detail="Provide text to speak")
    model = get_model()
    with torch.inference_mode():
        wav = model.generate(text, audio_prompt_path=str(DERIVED_REFERENCE_PATH))
    if hasattr(wav, "detach"):
        wav = wav.detach().cpu().numpy()
    if getattr(wav, "ndim", 1) > 1:
        wav = wav.squeeze()
    output = io.BytesIO()
    sf.write(output, wav, model.sr, format="WAV", subtype="PCM_16")
    audio = output.getvalue()
    if len(audio) < 1000 or audio[:4] != b"RIFF" or audio[8:12] != b"WAVE":
        raise HTTPException(status_code=502, detail="Voice model returned an invalid WAV artifact")
    return {
        "audio": base64.b64encode(audio).decode("ascii"),
        "mimeType": "audio/wav",
        "extension": "wav",
        "provider": PROVIDER,
        "model": MODEL,
        "openSource": True,
        "license": "MIT",
        "voiceIdentity": VOICE_IDENTITY,
        "referenceSampleSha256": EXPECTED_REFERENCE_SHA256,
        "derivedReferenceSha256": DERIVED_REFERENCE_SHA256,
        "referenceWindow": {"startSeconds": REFERENCE_WINDOW_START_SECONDS, "durationSeconds": REFERENCE_WINDOW_SECONDS},
        "watermark": "PerTh",
    }
