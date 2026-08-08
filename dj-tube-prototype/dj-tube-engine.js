// DJ Tube prototype mix engine. Production implementation will replace these heuristics
// with licensed/on-device audio analysis. This prototype never downloads or rehosts YouTube media.
const DJTubeEngine = (() => {
  const state = { a: { bpm: 100, key: '8A', energy: 82 }, b: { bpm: 104, key: '9A', energy: 86 }, autoMix: true };
  function phraseSafeTransition(from, to) {
    const bpm = Math.round((from.bpm + to.bpm) / 2);
    const bars = Math.abs(to.bpm - from.bpm) > 6 ? 16 : 8;
    const vocalSafe = Math.abs(from.energy - to.energy) < 18;
    return { bpm, bars, vocalSafe, delta: to.bpm - from.bpm };
  }
  function recommendation() { return phraseSafeTransition(state.a, state.b); }
  return { state, recommendation };
})();
window.DJTubeEngine = DJTubeEngine;
