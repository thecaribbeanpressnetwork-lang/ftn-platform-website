FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PORT=8080

RUN apt-get update && apt-get install -y --no-install-recommends \
      ffmpeg libsndfile1 git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt ./
RUN pip install --upgrade pip \
    && pip install --index-url https://download.pytorch.org/whl/cpu \
      torch==2.6.0 torchaudio==2.6.0 \
    && pip install -r requirements.txt \
    && pip install --force-reinstall --no-deps 'git+https://github.com/resemble-ai/chatterbox.git@5de7a54aa4e5e2baadb0182dde554908b48b85c2' \
    && python -c 'import inspect; from chatterbox.tts_turbo import ChatterboxTurboTTS; assert "nano" in inspect.signature(ChatterboxTurboTTS.from_pretrained).parameters'
COPY app.py ./

EXPOSE 8080
CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port ${PORT:-8080}"]
