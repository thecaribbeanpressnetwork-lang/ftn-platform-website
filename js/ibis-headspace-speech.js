// FTN ibis Headspace — local answer speech controls.
// This module owns only browser speech playback. It never fetches, changes or blocks the text answer.
//
// FTN Quality Pass (2026-09-18), Scenario 11 fix: the historical "voice reading slow/stop mid"
// complaint was real -- the whole answer (however long) was spoken as ONE SpeechSynthesisUtterance,
// which hits a well-documented Chrome/Chromium reliability limit on long utterances (speech
// silently stops before the end; pause()/resume() after ~15s can also get permanently stuck --
// see chromium bugs on speechSynthesis.resume()). Long ibis answers routinely exceed that limit.
// Fix: split the real answer text into short sentence-level chunks and chain them via onend, and
// replace native pause()/resume() (unreliable across engines) with cancel + re-speak-from-chunk,
// which is robust everywhere and still gives the user a working pause/resume.
(function (global) {
  'use strict';
  var synth = global.speechSynthesis;
  var controls = {
    play: document.getElementById('speakAnswer'), pause: document.getElementById('speechPause'),
    rewind: document.getElementById('speechRewind'), speed: document.getElementById('speechSpeed'),
    next: document.getElementById('speechNext')
  };
  var MAX_CHUNK = 200;
  var rates = [0.8, 1, 1.2, 1.5], rateIndex = 1, lines = [], lineIndex = 0, paused = false;

  // Splits on sentence boundaries first (keeps prosody natural), then hard-wraps any sentence that
  // is still too long (a run-on sentence, a URL-heavy source line, etc.) so no single utterance
  // ever approaches the length where playback historically died.
  function chunk(text) {
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
  function answerLines() {
    var card = document.querySelector('[data-thought="answer"]');
    var heading = card && card.querySelector('h2') && card.querySelector('h2').textContent.trim();
    var body = card && card.querySelector('p') && card.querySelector('p').textContent.trim();
    var lines = [];
    if (heading) lines = lines.concat(chunk(heading));
    if (body) lines = lines.concat(chunk(body));
    return lines;
  }
  function status(message) { var node = document.getElementById('commandHint'); if (node) node.textContent = message; }
  function stop() { if (synth) synth.cancel(); paused = false; if (controls.pause) { controls.pause.setAttribute('aria-pressed', 'false'); controls.pause.textContent = 'Pause'; } }
  function speakCurrent() {
    if (!synth || !lines.length) return;
    synth.cancel();
    var utterance = new SpeechSynthesisUtterance(lines[lineIndex]);
    utterance.lang = 'en-TT'; utterance.rate = rates[rateIndex];
    utterance.onend = function () {
      if (paused) return; // a deliberate pause cancels the utterance, which also fires onend -- ignore it
      if (lineIndex + 1 < lines.length) { lineIndex += 1; speakCurrent(); }
      else status('Finished reading the current ibis answer.');
    };
    utterance.onerror = function () { status('Speech playback is unavailable. The text answer remains available.'); };
    synth.speak(utterance);
    status('Reading part ' + (lineIndex + 1) + ' of ' + lines.length + ' at ' + rates[rateIndex] + '×.');
  }
  function play() {
    lines = answerLines();
    if (!lines.length) { status('There is no ibis answer to read yet.'); return; }
    lineIndex = Math.min(lineIndex, lines.length - 1);
    paused = false;
    if (controls.pause) { controls.pause.setAttribute('aria-pressed', 'false'); controls.pause.textContent = 'Pause'; }
    speakCurrent();
  }
  // Native SpeechSynthesis.pause()/resume() is unreliable across browsers for exactly the failure
  // this fix targets, so pause here means "stop now, remember where we were" and resume means
  // "re-speak the current short chunk from its start" -- at most one sentence repeats, which is a
  // far better failure mode than speech getting permanently stuck.
  function pause() {
    if (!synth) return;
    if (paused) { paused = false; if (controls.pause) { controls.pause.setAttribute('aria-pressed', 'false'); controls.pause.textContent = 'Pause'; } speakCurrent(); return; }
    if (!synth.speaking) return;
    paused = true; synth.cancel();
    if (controls.pause) { controls.pause.setAttribute('aria-pressed', 'true'); controls.pause.textContent = 'Resume'; }
    status('Paused.');
  }
  function move(delta) { lines = answerLines(); if (!lines.length) return; lineIndex = Math.max(0, Math.min(lines.length - 1, lineIndex + delta)); paused = false; if (controls.pause) { controls.pause.setAttribute('aria-pressed', 'false'); controls.pause.textContent = 'Pause'; } speakCurrent(); }
  function speed() { rateIndex = (rateIndex + 1) % rates.length; controls.speed.textContent = rates[rateIndex] + '×'; if (synth && synth.speaking && !paused) speakCurrent(); }
  if (!synth || typeof global.SpeechSynthesisUtterance !== 'function') {
    Object.keys(controls).forEach(function (key) { if (controls[key]) { controls[key].disabled = true; controls[key].title = 'Speech output is not supported in this browser'; } });
    return;
  }
  controls.play && controls.play.addEventListener('click', play);
  controls.pause && controls.pause.addEventListener('click', pause);
  controls.rewind && controls.rewind.addEventListener('click', function () { move(-1); });
  controls.next && controls.next.addEventListener('click', function () { move(1); });
  controls.speed && controls.speed.addEventListener('click', speed);
  global.FTN = global.FTN || {};
  global.FTN.HeadspaceSpeech = { play: play, pause: pause, rewind: function () { move(-1); }, next: function () { move(1); }, speed: speed, stop: stop };
})(window);
