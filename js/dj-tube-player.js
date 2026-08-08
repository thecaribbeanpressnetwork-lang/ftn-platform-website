(() => {
  'use strict';

  const DEFAULT_VIDEOS = [
    { id: 'JZ4h_ldPUgk', title: 'Soca 2026 Mix — Soca Spark 26', creator: 'DJ Ana & Ultra Simmo', genre: 'Soca', region: 'Trinidad & Tobago' },
    { id: 'svCJ3C5LviI', title: 'Trinidad Carnival 2026 Road Power Soca DJ Mix', creator: 'Sir Trey Benjamin', genre: 'Soca', region: 'Trinidad & Tobago' },
    { id: 'VG-NhYHjPrE', title: 'Dancehall Mix 2026 — 50 Best Dancehall Songs', creator: 'DJ Treasure', genre: 'Dancehall', region: 'Jamaica' },
    { id: 'eKIOU9X0MxI', title: 'Dancehall Mix 2026 Vol. 4 — Raw & Clean', creator: 'ZJ Liquid Music', genre: 'Dancehall', region: 'Jamaica' }
  ];

  const state = {
    decks: [null, null],
    activeDeck: 0,
    queue: [],
    crossfade: 50,
    masterVolume: 80,
    playing: false,
    ready: false
  };

  const els = {
    player: document.querySelector('#dj-deck-player'),
    deckA: document.querySelector('#dj-deck-a'),
    deckB: document.querySelector('#dj-deck-b'),
    queue: document.querySelector('#dj-queue'),
    now: document.querySelector('#dj-now-playing'),
    status: document.querySelector('#dj-player-status'),
    crossfade: document.querySelector('#dj-crossfade'),
    volume: document.querySelector('#dj-master-volume'),
    play: document.querySelector('#dj-play'),
    next: document.querySelector('#dj-next'),
    prev: document.querySelector('#dj-prev'),
    loadA: document.querySelector('#dj-load-a'),
    loadB: document.querySelector('#dj-load-b'),
    clear: document.querySelector('#dj-clear-queue')
  };

  if (!els.player) return;

  const ytApi = new Promise(resolve => {
    if (window.YT?.Player) return resolve(window.YT);
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve(window.YT);
    };
    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(script);
    }
  });

  function esc(value) {
    return String(value).replace(/[&<>'"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[c]));
  }

  function videoFromCard(card) {
    return {
      id: card.dataset.videoId,
      title: card.dataset.title || 'DJ Tube Mix',
      creator: card.dataset.creator || 'DJ Tube',
      genre: card.dataset.genre || 'Caribbean',
      region: card.dataset.region || 'Caribbean'
    };
  }

  function setStatus(text) {
    if (els.status) els.status.textContent = text;
  }

  function setDeckMeta(index, video) {
    const root = index === 0 ? els.deckA : els.deckB;
    if (!root) return;
    root.querySelector('[data-deck-title]').textContent = video?.title || 'Load a mix';
    root.querySelector('[data-deck-creator]').textContent = video ? `${video.creator} · ${video.genre}` : 'Choose a video from the queue';
    root.dataset.loaded = video ? 'true' : 'false';
  }

  function createPlayer(index) {
    return ytApi.then(YT => new Promise(resolve => {
      const host = document.querySelector(index === 0 ? '#dj-youtube-a' : '#dj-youtube-b');
      if (!host) return resolve(null);
      const player = new YT.Player(host, {
        width: '100%', height: '100%', videoId: '', playerVars: { autoplay: 0, controls: 1, rel: 0, playsinline: 1, modestbranding: 1 },
        events: {
          onReady: () => resolve(player),
          onStateChange: event => {
            if (event.data === YT.PlayerState.PLAYING) {
              state.playing = true;
              state.activeDeck = index;
              updateUi();
            }
            if (event.data === YT.PlayerState.ENDED && state.activeDeck === index) next();
          },
          onError: () => setStatus(`YouTube could not play Deck ${index === 0 ? 'A' : 'B'} — the video may be unavailable for embedding.`)
        }
      });
    }));
  }

  async function ensurePlayers() {
    if (state.ready) return;
    setStatus('Connecting to YouTube…');
    state.decks[0] = await createPlayer(0);
    state.decks[1] = await createPlayer(1);
    state.ready = Boolean(state.decks[0] && state.decks[1]);
    setStatus(state.ready ? 'YouTube connected · 2-deck mode ready' : 'Player connection incomplete');
    updateUi();
  }

  function load(index, video, autoplay = false) {
    if (!video) return;
    state.decks[index]?.cueVideoById(video.id);
    setDeckMeta(index, video);
    state.activeDeck = index;
    if (autoplay) {
      state.decks[index]?.playVideo();
      state.playing = true;
    }
    updateUi();
  }

  function addToQueue(video) {
    if (!video?.id) return;
    state.queue.push(video);
    renderQueue();
    if (!state.decks[0]) return;
    if (!els.deckA.dataset.loaded) load(0, video, false);
    else if (!els.deckB.dataset.loaded) load(1, video, false);
  }

  function renderQueue() {
    if (!els.queue) return;
    els.queue.innerHTML = state.queue.length ? state.queue.map((video, i) => `
      <button type="button" class="dj-queue-item" data-index="${i}">
        <span class="dj-queue-item__number">${i + 1}</span><span><strong>${esc(video.title)}</strong><small>${esc(video.creator)} · ${esc(video.genre)}</small></span>
      </button>`).join('') : '<p class="dj-queue-empty">Your queue is empty. Add a mix above.</p>';
    els.queue.querySelectorAll('[data-index]').forEach(button => button.addEventListener('click', () => {
      const video = state.queue[Number(button.dataset.index)];
      load(state.activeDeck, video, true);
    }));
  }

  function currentVideo() {
    const deck = state.activeDeck;
    const root = deck === 0 ? els.deckA : els.deckB;
    return root?.dataset.videoId ? state.queue.find(v => v.id === root.dataset.videoId) : null;
  }

  function setVolume() {
    const normalized = state.masterVolume / 100;
    state.decks.forEach(player => player?.setVolume?.(Math.round(normalized * 100)));
    const other = 1 - state.crossfade / 100;
    state.decks[0]?.setVolume?.(Math.round(state.masterVolume * (state.crossfade <= 50 ? 1 : 2 * other)));
    state.decks[1]?.setVolume?.(Math.round(state.masterVolume * (state.crossfade >= 50 ? 1 : 2 * (state.crossfade / 100))));
  }

  function mixTo(value) {
    state.crossfade = Number(value);
    setVolume();
    updateUi();
  }

  function togglePlay() {
    ensurePlayers().then(() => {
      const player = state.decks[state.activeDeck];
      if (!player) return;
      const YT = window.YT;
      if (state.playing) { player.pauseVideo(); state.playing = false; }
      else { player.playVideo(); state.playing = true; }
      if (YT) setStatus(state.playing ? 'Playing' : 'Paused');
      updateUi();
    });
  }

  function next() {
    if (!state.queue.length) return;
    const current = currentVideo();
    const index = current ? state.queue.findIndex(v => v.id === current.id) : -1;
    const video = state.queue[(index + 1 + state.queue.length) % state.queue.length];
    const target = state.activeDeck === 0 ? 1 : 0;
    load(target, video, true);
  }

  function prev() {
    if (!state.queue.length) return;
    const current = currentVideo();
    const index = current ? state.queue.findIndex(v => v.id === current.id) : 0;
    const video = state.queue[(index - 1 + state.queue.length) % state.queue.length];
    load(state.activeDeck, video, true);
  }

  function updateUi() {
    const video = currentVideo();
    if (els.now) els.now.textContent = video ? `${video.title} · ${video.creator}` : 'Nothing playing';
    if (els.play) els.play.textContent = state.playing ? 'Pause' : 'Play';
    if (els.crossfade) els.crossfade.value = state.crossfade;
    if (els.volume) els.volume.value = state.masterVolume;
    [els.deckA, els.deckB].forEach((root, i) => root?.classList.toggle('is-active', i === state.activeDeck));
  }

  [els.loadA, els.loadB].forEach((button, index) => button?.addEventListener('click', () => {
    const id = button.dataset.videoId;
    const video = state.queue.find(v => v.id === id);
    if (video) load(index, video, false);
  }));
  els.play?.addEventListener('click', togglePlay);
  els.next?.addEventListener('click', next);
  els.prev?.addEventListener('click', prev);
  els.crossfade?.addEventListener('input', event => mixTo(event.target.value));
  els.volume?.addEventListener('input', event => { state.masterVolume = Number(event.target.value); setVolume(); updateUi(); });
  els.clear?.addEventListener('click', () => { state.queue = []; renderQueue(); setDeckMeta(0, null); setDeckMeta(1, null); });

  document.addEventListener('click', event => {
    const card = event.target.closest('[data-dj-queue-add]');
    if (!card) return;
    event.preventDefault();
    addToQueue(videoFromCard(card));
    document.querySelector('#dj-deck-player')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    ensurePlayers();
  });

  ensurePlayers();
  DEFAULT_VIDEOS.forEach(video => state.queue.push(video));
  renderQueue();
  load(0, DEFAULT_VIDEOS[0], false);
  load(1, DEFAULT_VIDEOS[1], false);
  updateUi();
})();
