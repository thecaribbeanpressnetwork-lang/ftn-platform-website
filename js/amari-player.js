(() => {
  const audio = document.getElementById('amariAudio');
  const title = document.getElementById('playerTitle');
  const genre = document.getElementById('playerGenre');
  const art = document.getElementById('playerArt');
  if (!audio || !title || !genre || !art) return;

  const tracks = [...document.querySelectorAll('.track__play')];
  const player = document.getElementById('amari-player');
  const status = document.getElementById('playerStatus');
  const repeat = document.getElementById('repeatTrack');
  let current = 0;
  const mini = document.querySelector('.mini-player');
  const miniTitle = document.getElementById('miniTitle');
  const miniState = document.getElementById('miniState');
  const miniElapsed = document.getElementById('miniElapsed');
  const miniDuration = document.getElementById('miniDuration');
  const miniSeek = document.getElementById('miniSeek');
  const formatTime = (seconds) => {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return mins + ':' + String(secs).padStart(2, '0');
  };
  function syncProgress() {
    const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
    miniElapsed.textContent = formatTime(audio.currentTime);
    miniDuration.textContent = formatTime(duration);
    miniSeek.value = duration ? Math.round((audio.currentTime / duration) * 1000) : 0;
    miniSeek.setAttribute('aria-valuetext', formatTime(audio.currentTime) + ' of ' + formatTime(duration));
  }
  let playerVisible = true;
  function syncPlayback() {
    tracks.forEach((track, i) => {
      const active = i === current;
      track.parentElement.closest('.track').classList.toggle('track--current', active);
      const action = active && !audio.paused ? 'Pause' : active && audio.currentTime > 0 ? 'Resume' : 'Play';
      track.textContent = action;
      track.setAttribute('aria-label', action + ' ' + track.dataset.title);
    });
    miniTitle.textContent = title.textContent;
    miniState.textContent = audio.paused ? 'Paused' : 'Playing';
    document.getElementById('togglePlayback').textContent = audio.paused ? 'Play' : 'Pause';
    document.getElementById('previousTrack').disabled = current === 0;
    document.getElementById('nextTrack').disabled = current === tracks.length - 1;
    mini.hidden = playerVisible;
    syncProgress();
    document.getElementById('miniRepeat').setAttribute('aria-pressed', String(audio.loop));
  }

  function play() {
    audio.play().catch(() => { status.textContent = 'Press Play in the player to start listening.'; });
  }

  function select(index, start = false) {
    if (index < 0 || index >= tracks.length) return;
    const button = tracks[index];
    const changed = index !== current || !audio.getAttribute('src');
    current = index;
    if (changed) {
    audio.src = button.dataset.src;
      audio.load();
    }
    title.textContent = button.dataset.title;
    genre.textContent = button.dataset.genre;
    art.src = button.dataset.art;
    art.alt = button.dataset.title + ' cover';
    tracks.forEach((track, i) => {
      track.setAttribute('aria-label', 'Play ' + track.dataset.title);
      if (i === index) track.setAttribute('aria-current', 'true');
      else track.removeAttribute('aria-current');
    });
    status.textContent = '';
    syncPlayback();
    if (start) play();
  }

  function fromHash(start = false, focus = false) {
    const index = tracks.findIndex(track => '#' + track.closest('.track').id === location.hash);
    if (index < 0) return;
    select(index, start);
    if (focus) player.focus({preventScroll: true});
    player.scrollIntoView({behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'center'});
  }

  document.addEventListener('click', (event) => {
    const cover = event.target.closest('.cover, .track-link');
    if (cover && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey && event.button === 0) {
      event.preventDefault();
      history.pushState(null, '', cover.getAttribute('href'));
      fromHash(true, true);
      return;
    }
    const button = event.target.closest('.track__play, .feature__play');
    if (!button) return;
    const index = tracks.findIndex(track => track.dataset.src === button.dataset.src);
    if (button.classList.contains('track__play') && index === current && !audio.paused) { audio.pause(); return; }
    select(index, true);
    history.replaceState(null, '', '#' + tracks[index].closest('.track').id);
  });
  document.getElementById('playAlbum').addEventListener('click', () => {
    audio.loop = false;
    repeat.setAttribute('aria-pressed', 'false');
    select(0);
    audio.currentTime = 0;
    history.replaceState(null, '', '#' + tracks[0].closest('.track').id);
    play();
  });
  repeat.addEventListener('click', () => {
    audio.loop = !audio.loop;
    repeat.setAttribute('aria-pressed', String(audio.loop));
    syncPlayback();
  });
  audio.addEventListener('ended', () => {
    if (audio.loop) return;
    if (current + 1 < tracks.length) {
      select(current + 1, true);
      history.replaceState(null, '', '#' + tracks[current].closest('.track').id);
    } else status.textContent = 'Album finished. Press Play album to listen again.';
  });
  async function share(trackOnly) {
    const url = new URL(location.href);
    url.hash = trackOnly ? tracks[current].closest('.track').id : '';
    const shareTitle = trackOnly ? tracks[current].dataset.title + ' — Amari Inniss' : 'Amari Inniss';
    try {
      if (navigator.share) await navigator.share({title: shareTitle, url: url.href});
      else {
        await navigator.clipboard.writeText(url.href);
        status.textContent = 'Link copied.';
        document.getElementById('miniFeedback').textContent = 'Link copied.';
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        status.replaceChildren();
        const link = document.createElement('a');
        link.href = url.href;
        link.textContent = 'Copy this link: ' + url.href;
        status.append(link);
      }
    }
  }
  document.getElementById('shareTrack').addEventListener('click', () => share(true));
  document.getElementById('sharePage').addEventListener('click', () => share(false));
  document.getElementById('miniShare').addEventListener('click', () => share(true));
  document.getElementById('miniRepeat').addEventListener('click', () => repeat.click());
  document.getElementById('togglePlayback').addEventListener('click', () => audio.paused ? play() : audio.pause());
  for (const [id, delta] of [['previousTrack', -1], ['nextTrack', 1]]) document.getElementById(id).addEventListener('click', () => {
    select(current + delta, true);
    history.replaceState(null, '', '#' + tracks[current].closest('.track').id);
  });
  audio.addEventListener('play', syncPlayback);
  audio.addEventListener('pause', syncPlayback);
  audio.addEventListener('timeupdate', syncProgress);
  audio.addEventListener('durationchange', syncProgress);
  audio.addEventListener('loadedmetadata', syncProgress);
  miniSeek.addEventListener('input', () => {
    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      audio.currentTime = (Number(miniSeek.value) / 1000) * audio.duration;
      syncProgress();
    }
  });
  new IntersectionObserver(entries => { playerVisible = entries[0].isIntersecting; syncPlayback(); }).observe(player);
  window.addEventListener('hashchange', () => fromHash());
  const menu = document.querySelector('.nav__menu');
  const mobileMenu = matchMedia('(max-width: 900px)');
  const updateMenu = () => { menu.open = !mobileMenu.matches; };
  updateMenu();
  mobileMenu.addEventListener('change', updateMenu);
  menu.addEventListener('click', (event) => {
    if (mobileMenu.matches && event.target.closest('a')) event.currentTarget.removeAttribute('open');
  });
  select(0);
  fromHash();
})();
