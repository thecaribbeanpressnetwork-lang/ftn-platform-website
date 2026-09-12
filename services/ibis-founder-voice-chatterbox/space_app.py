import base64
import hashlib
import hmac
import inspect
import io
import os
import subprocess
from pathlib import Path

import gradio as gr
import soundfile as sf
import spaces
import torch
from chatterbox.tts_turbo import ChatterboxTurboTTS

VOICE_IDENTITY = "IBIS_FOUNDER_VOICE"
PROVIDER = "chatterbox-nano"
MODEL = "ResembleAI/chatterbox-nano"
EXPECTED_REFERENCE_SHA256 = "a1c58062344bb586dad665b9db6b81bba56af85fbffd214a6c17df3f4d270e9b"
DERIVED_REFERENCE_SHA256 = "5fd8ef67b517ba08c9d28093859004753c10de4d6771c37e1eac1e2c3fbe333e"
REFERENCE_B64 = os.getenv("IBIS_FOUNDER_VOICE_REFERENCE_B64", "")
AUTH_TOKEN = os.getenv("IBIS_FOUNDER_VOICE_SERVICE_TOKEN", "")
REFERENCE_PATH = Path("/tmp/ibis-founder-reference.wav")
MAX_TEXT_CHARS = int(os.getenv("IBIS_FOUNDER_VOICE_MAX_TEXT_CHARS", "2500"))

_nano_runtime_compatible = "nano" in inspect.signature(
    ChatterboxTurboTTS.from_pretrained
).parameters


def _require_auth(token: str) -> None:
    if not AUTH_TOKEN:
        raise gr.Error("Service authentication is not configured")
    if not hmac.compare_digest(token or "", AUTH_TOKEN):
        raise gr.Error("Unauthorized")


def _prepare_reference() -> None:
    if not REFERENCE_B64:
        raise RuntimeError("Founder voice reference is unavailable")
    try:
        raw = base64.b64decode(REFERENCE_B64, validate=True)
    except Exception as exc:
        raise RuntimeError("Founder voice reference secret is not valid base64") from exc
    if hashlib.sha256(raw).hexdigest() != DERIVED_REFERENCE_SHA256:
        raise RuntimeError("Derived founder voice reference SHA-256 mismatch")
    source = Path("/tmp/ibis-founder-reference-secret.ogg")
    source.write_bytes(raw)
    subprocess.run(
        [
            "ffmpeg",
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-i",
            str(source),
            "-t",
            "6",
            "-ac",
            "1",
            "-ar",
            "24000",
            str(REFERENCE_PATH),
        ],
        check=True,
        timeout=30,
    )
    if not REFERENCE_PATH.is_file() or REFERENCE_PATH.stat().st_size < 10_000:
        raise RuntimeError("Could not materialize founder voice reference")


if not AUTH_TOKEN:
    raise RuntimeError("Service authentication is not configured")
if not _nano_runtime_compatible:
    raise RuntimeError("Installed Chatterbox runtime does not support Nano")
_prepare_reference()

# ZeroGPU requires CUDA placement at module load. Outside a GPU-decorated call,
# its CUDA emulation layer holds the model until real GPU capacity is allocated.
_model = ChatterboxTurboTTS.from_pretrained(device="cuda", nano=True)


def health(token: str) -> dict:
    _require_auth(token)
    return {
        "capability": "FOUNDER_TEXT_TO_SPEECH",
        "provider": PROVIDER,
        "model": MODEL,
        "openSource": True,
        "license": "MIT",
        "configured": True,
        "ready": _model is not None,
        "modelLoaded": _model is not None,
        "voiceEnrolled": REFERENCE_PATH.is_file(),
        "runtimeCompatible": _nano_runtime_compatible,
        "founderVoiceRequired": True,
        "genericVoiceAcceptedAsPrimary": False,
        "voiceIdentity": VOICE_IDENTITY,
        "referenceSampleSha256": EXPECTED_REFERENCE_SHA256,
        "derivedReferenceSha256": DERIVED_REFERENCE_SHA256,
        "privateReferenceTransport": "secret-env",
        "watermark": "PerTh",
        "generationAttempted": False,
        "executionClass": "hugging-face-zerogpu",
    }


@spaces.GPU(duration=120)
def speak(token: str, text: str) -> dict:
    _require_auth(token)
    normalized = (text or "").strip()[:MAX_TEXT_CHARS]
    if not normalized:
        raise gr.Error("Provide text to speak")
    with torch.inference_mode():
        wav = _model.generate(normalized, audio_prompt_path=str(REFERENCE_PATH))
    if hasattr(wav, "detach"):
        wav = wav.detach().cpu().numpy()
    if getattr(wav, "ndim", 1) > 1:
        wav = wav.squeeze()
    output = io.BytesIO()
    sf.write(output, wav, _model.sr, format="WAV", subtype="PCM_16")
    audio = output.getvalue()
    if len(audio) < 1000 or audio[:4] != b"RIFF" or audio[8:12] != b"WAVE":
        raise gr.Error("Voice model returned an invalid WAV artifact")
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
        "watermark": "PerTh",
    }


with gr.Blocks(title="IBIS Founder Voice") as demo:
    gr.Markdown(
        "# IBIS Founder Voice\n"
        "Private FTN service gateway. Synthesis requires server authentication."
    )
    token_input = gr.Textbox(visible=False)
    text_input = gr.Textbox(visible=False)
    health_output = gr.JSON(visible=False)
    speak_output = gr.JSON(visible=False)
    health_button = gr.Button(visible=False)
    speak_button = gr.Button(visible=False)
    health_button.click(health, token_input, health_output, api_name="health")
    speak_button.click(
        speak, [token_input, text_input], speak_output, api_name="speak"
    )

demo.queue().launch()
