// FTN ibis — shared speech engines (voice OUTPUT read-aloud + voice INPUT dictation).
//
// FTN Quality & UX Closure pass (2026-09-18), Priority 2: voice was Headspace-only, tightly
// coupled to Headspace's own DOM ids, and voice input/output were each their own small ad-hoc
// implementation with no shared logic -- exactly the "do not duplicate two independent speech
// implementations" the mission calls out. This file is the one shared, DOM-agnostic engine both
// Headspace (js/ibis-headspace-speech.js + the voice button in js/ibis-headspace-preview.js) and
// regular ibis chat (js/ibis-ai-workspace.js) now wire up to their own elements and copy.
//
// Neither factory below touches the DOM itself beyond what the caller explicitly hands it --
// callers own their own buttons/status text, this file owns only the actual Web Speech API logic.
(function (global) {
  'use strict';

  var MAX_CHUNK = 200;
  var RATES = [0.75, 1, 1.25, 1.5];

  // Splits on sentence boundaries first (keeps prosody natural), then hard-wraps any sentence that
  // is still too long (a run-on sentence, a URL-heavy source line, etc.) so no single utterance
  // ever approaches the length where playback historically died -- see the ibis-headspace-speech.js
  // history this was first fixed in: the whole answer as ONE SpeechSynthesisUtterance hits a
  // well-documented Chrome/Chromium reliability limit (speech silently stops before the end;
  // pause()/resume() after ~15s can get permanently stuck).
  function chunkText(text) {
    var sentences = String(text || '').trim().split(/(?<=[.!?])\s+/).filter(Boolean);
    var out = [];
    sentences.forEach(function (sentence) {
      if (sentence.length <= MAX_CHUNK) { out.push(sentence); return; }
      var words = sentence.split(/\s+/), current = '';
      words.forEach(function (word) {
        if ((current + ' ' + word).trim().length > MAX_CHUNK && current) { out.push(current.trim()); current = word; }
        else { current = (current + ' ' + word).trim(); }
      });
      if (current) out.push(current);
    });
    return out;
  }

  // createSpeechOutput(options): options.getText() must return the CURRENT text to read (called
  // fresh every time play/rewind/next runs, never cached, so it always reads whatever the caller's
  // answer surface currently shows). options.onStatus(message) is called with human-readable status
  // text the caller can render anywhere (a status line, an aria-live region, etc.) -- optional.
  // Returns { play, pause, rewind, next, speed, stop, supported, rate }.
  function createSpeechOutput(options) {
    options = options || {};
    var getText = options.getText || function () { return ''; };
    var onStatus = options.onStatus || function () {};
    var onRateChange = options.onRateChange || function () {};
    var synth = global.speechSynthesis;
    var supported = !!synth && typeof global.SpeechSynthesisUtterance === 'function';
    var rateIndex = 1, lines = [], lineIndex = 0, paused = false;

    function speakCurrent() {
      if (!supported || !lines.length) return;
      synth.cancel();
      var utterance = new global.SpeechSynthesisUtterance(lines[lineIndex]);
      utterance.lang = 'en-TT';
      utterance.rate = RATES[rateIndex];
      utterance.onend = function () {
        if (paused) return; // a deliberate pause cancels the utterance, which also fires onend -- ignore it
        if (lineIndex + 1 < lines.length) { lineIndex += 1; speakCurrent(); }
        else onStatus('Finished reading the answer.');
      };
      utterance.onerror = function () { onStatus('Speech playback is unavailable. The text answer remains available.'); };
      synth.speak(utterance);
      onStatus('Reading part ' + (lineIndex + 1) + ' of ' + lines.length + ' at ' + RATES[rateIndex] + '×.');
    }

    function play() {
      if (!supported) { onStatus('Speech playback is not supported in this browser.'); return; }
      var text = getText();
      if (!text || !text.trim()) { onStatus('There is no answer to read yet.'); return; }
      lines = chunkText(text);
      if (!lines.length) { onStatus('There is no answer to read yet.'); return; }
      lineIndex = Math.min(lineIndex, lines.length - 1);
      paused = false;
      speakCurrent();
    }

    // Native SpeechSynthesis.pause()/resume() is unreliable across browsers for exactly the
    // failure this engine targets, so pause here means "stop now, remember where we were" and
    // resume means "re-speak the current short chunk from its start" -- at most one sentence
    // repeats, a far better failure mode than speech getting permanently stuck.
    function pause() {
      if (!supported) return;
      if (paused) { paused = false; speakCurrent(); return; }
      if (!synth.speaking) return;
      paused = true;
      synth.cancel();
      onStatus('Paused.');
    }

    function stop() {
      if (supported) synth.cancel();
      paused = false;
    }

    function move(delta) {
      if (!supported) return;
      var text = getText();
      lines = chunkText(text);
      if (!lines.length) return;
      lineIndex = Math.max(0, Math.min(lines.length - 1, lineIndex + delta));
      paused = false;
      speakCurrent();
    }

    function speed() {
      rateIndex = (rateIndex + 1) % RATES.length;
      onRateChange(RATES[rateIndex]);
      if (supported && synth.speaking && !paused) speakCurrent();
      return RATES[rateIndex];
    }

    return {
      play: play, pause: pause, stop: stop,
      rewind: function () { move(-1); }, next: function () { move(1); },
      speed: speed, rate: function () { return RATES[rateIndex]; },
      isPaused: function () { return paused; },
      supported: supported,
    };
  }

  // createVoiceInput(options): options.onTranscript(text) fires once recognition produces a final
  // result -- the CALLER decides what to do with it (fill an input, auto-send, etc.), this engine
  // never touches any input element itself. options.onStatus(message)/options.onListening(bool) are
  // optional UI hooks. Returns { start, stop, supported }.
  function createVoiceInput(options) {
    options = options || {};
    var onTranscript = options.onTranscript || function () {};
    var onStatus = options.onStatus || function () {};
    var onListening = options.onListening || function () {};
    var Recognition = global.SpeechRecognition || global.webkitSpeechRecognition;
    var supported = typeof Recognition === 'function';
    if (!supported) {
      return { start: function () { onStatus('Voice input is not supported in this browser.'); }, stop: function () {}, supported: false };
    }
    var recognition = new Recognition();
    recognition.lang = 'en-TT';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    var listening = false;

    recognition.addEventListener('start', function () { listening = true; onListening(true); onStatus('Listening…'); });
    recognition.addEventListener('result', function (e) {
      var transcript = e.results && e.results[0] && e.results[0][0] && e.results[0][0].transcript;
      if (transcript) { onTranscript(transcript); onStatus('Voice captured. Review it, then send.'); }
    });
    recognition.addEventListener('end', function () { listening = false; onListening(false); });
    recognition.addEventListener('error', function (e) {
      listening = false;
      onListening(false);
      // "not-allowed"/"service-not-allowed" is a real permission denial (mic blocked); everything
      // else (no-speech, aborted, network, audio-capture) gets an honest, distinct message rather
      // than one generic failure string that could wrongly suggest the mic itself is blocked.
      if (e && (e.error === 'not-allowed' || e.error === 'service-not-allowed')) onStatus('Microphone permission was denied. Allow microphone access to use voice input.');
      else if (e && e.error === 'no-speech') onStatus('No speech was detected. Try again.');
      else if (e && e.error === 'audio-capture') onStatus('No microphone was found on this device.');
      else onStatus('Voice input could not start in this browser.');
    });

    return {
      start: function () { if (!listening) { try { recognition.start(); } catch (err) { onStatus('Voice input could not start.'); } } },
      stop: function () { if (listening) recognition.stop(); },
      supported: true,
    };
  }

  global.FTN = global.FTN || {};
  global.FTN.SpeechShared = { createSpeechOutput: createSpeechOutput, createVoiceInput: createVoiceInput, chunkText: chunkText };
})(window);
