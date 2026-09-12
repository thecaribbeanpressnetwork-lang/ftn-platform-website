import base64
import hashlib
import io
import os
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
REFERENCE_PATH = Path(os.getenv("IBIS_FOUNDER_VOICE_REFERENCE_PATH", "/run/secrets/ibis-founder-voice/reference.ogg"))
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


def verify_reference() -> bool:
    global _reference_verified
    if _reference_verified:
        return True
    if not REFERENCE_PATH.is_file():
        return False
    digest = hashlib.sha256(REFERENCE_PATH.read_bytes()).hexdigest()
    if digest != EXPECTED_REFERENCE_SHA256:
        raise RuntimeError("Founder voice reference SHA-256 mismatch; refusing to synthesize")
    _reference_verified = True
    return True


def get_model():
    global _model
    if _model is None:
        # Nano is the intentionally CPU-capable, open-source primary path.
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
        wav = model.generate(text, audio_prompt_path=str(REFERENCE_PATH))
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
        "watermark": "PerTh",
    }
