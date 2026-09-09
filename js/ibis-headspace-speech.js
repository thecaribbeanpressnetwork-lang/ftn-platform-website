// FTN ibis Headspace — local answer speech controls.
// This module owns only browser speech playback. It never fetches, changes or blocks the text answer.
(function (global) {
  'use strict';
  var synth = global.speechSynthesis;
  var controls = {
    play: document.getElementById('speakAnswer'), pause: document.getElementById('speechPause'),
    rewind: document.getElementById('speechRewind'), speed: document.getElementById('speechSpeed'),
    next: document.getElementById('speechNext')
  };
  var rates = [0.8, 1, 1.2, 1.5], rateIndex = 1, lines = [], lineIndex = 0, paused = false;
  function answerLines() {
    var card = document.querySelector('[data-thought="answer"]');
    return [card && card.querySelector('h2'), card && card.querySelector('p')]
      .map(function (node) { return node && node.textContent.trim(); }).filter(Boolean);
  }
  function status(message) { var node = document.getElementById('commandHint'); if (node) node.textContent = message; }
  function stop() { if (synth) synth.cancel(); paused = false; if (controls.pause) controls.pause.setAttribute('aria-pressed', 'false'); }
  function speakCurrent() {
    if (!synth || !lines.length) return;
    stop();
    var utterance = new SpeechSynthesisUtterance(lines[lineIndex]);
    utterance.lang = 'en-TT'; utterance.rate = rates[rateIndex];
    utterance.onend = function () { if (lineIndex + 1 < lines.length) { lineIndex += 1; speakCurrent(); } else status('Finished reading the current ibis answer.'); };
    utterance.onerror = function () { status('Speech playback is unavailable. The text answer remains available.'); };
    synth.speak(utterance);
    status('Reading line ' + (lineIndex + 1) + ' of ' + lines.length + ' at ' + rates[rateIndex] + '×.');
  }
  function play() { lines = answerLines(); lineIndex = Math.min(lineIndex, Math.max(0, lines.length - 1)); if (paused && synth) { synth.resume(); paused = false; controls.pause.setAttribute('aria-pressed', 'false'); return; } speakCurrent(); }
  function pause() { if (!synth || !synth.speaking) return; if (paused) { synth.resume(); paused = false; } else { synth.pause(); paused = true; } controls.pause.setAttribute('aria-pressed', String(paused)); controls.pause.textContent = paused ? 'Resume' : 'Pause'; }
  function move(delta) { lines = answerLines(); if (!lines.length) return; lineIndex = Math.max(0, Math.min(lines.length - 1, lineIndex + delta)); speakCurrent(); }
  function speed() { rateIndex = (rateIndex + 1) % rates.length; controls.speed.textContent = rates[rateIndex] + '×'; if (synth && synth.speaking) speakCurrent(); }
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
