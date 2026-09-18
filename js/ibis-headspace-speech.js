// FTN ibis Headspace — answer speech controls.
// This module owns only DOM wiring: the actual speech engine lives in the shared
// js/ibis-speech-shared.js (FTN.SpeechShared.createSpeechOutput), used identically by regular ibis
// chat's own voice controls in js/ibis-ai-workspace.js -- "do not duplicate two independent speech
// implementations" (FTN Quality & UX Closure pass, 2026-09-18).
(function (global) {
  'use strict';
  var Shared = global.FTN && global.FTN.SpeechShared;
  if (!Shared) return; // ibis-speech-shared.js failed to load -- fail silently, controls stay inert rather than throwing.

  var controls = {
    play: document.getElementById('speakAnswer'), pause: document.getElementById('speechPause'),
    rewind: document.getElementById('speechRewind'), speed: document.getElementById('speechSpeed'),
    next: document.getElementById('speechNext')
  };

  function answerText() {
    var card = document.querySelector('[data-thought="answer"]');
    var heading = card && card.querySelector('h2') && card.querySelector('h2').textContent.trim();
    var body = card && card.querySelector('p') && card.querySelector('p').textContent.trim();
    return [heading, body].filter(Boolean).join('. ');
  }
  function status(message) { var node = document.getElementById('commandHint'); if (node) node.textContent = message; }

  var engine = Shared.createSpeechOutput({
    getText: answerText,
    onStatus: status,
    onRateChange: function (rate) { if (controls.speed) controls.speed.textContent = rate + '×'; },
  });

  if (!engine.supported) {
    Object.keys(controls).forEach(function (key) { if (controls[key]) { controls[key].disabled = true; controls[key].title = 'Speech output is not supported in this browser'; } });
    return;
  }

  function syncPauseLabel() {
    if (!controls.pause) return;
    var isPaused = engine.isPaused();
    controls.pause.setAttribute('aria-pressed', String(isPaused));
    controls.pause.textContent = isPaused ? 'Resume' : 'Pause';
  }

  controls.play && controls.play.addEventListener('click', function () { engine.play(); syncPauseLabel(); });
  controls.pause && controls.pause.addEventListener('click', function () { engine.pause(); syncPauseLabel(); });
  controls.rewind && controls.rewind.addEventListener('click', function () { engine.rewind(); syncPauseLabel(); });
  controls.next && controls.next.addEventListener('click', function () { engine.next(); syncPauseLabel(); });
  controls.speed && controls.speed.addEventListener('click', function () { engine.speed(); });

  global.FTN.HeadspaceSpeech = { play: engine.play, pause: engine.pause, rewind: engine.rewind, next: engine.next, speed: engine.speed, stop: engine.stop };
})(window);
