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
    if (start) play();
  }

  function fromHash(start = false, focus = false) {
    const index = tracks.findIndex(track => '#' + track.parentElement.id === location.hash);
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
    select(index, true);
    history.replaceState(null, '', '#' + tracks[index].parentElement.id);
  });
  document.getElementById('playAlbum').addEventListener('click', () => {
    audio.loop = false;
    repeat.setAttribute('aria-pressed', 'false');
    select(0);
    audio.currentTime = 0;
    history.replaceState(null, '', '#' + tracks[0].parentElement.id);
    play();
  });
  repeat.addEventListener('click', () => {
    audio.loop = !audio.loop;
    repeat.setAttribute('aria-pressed', String(audio.loop));
  });
  audio.addEventListener('ended', () => {
    if (audio.loop) return;
    if (current + 1 < tracks.length) {
      select(current + 1, true);
      history.replaceState(null, '', '#' + tracks[current].parentElement.id);
    } else status.textContent = 'Album finished. Press Play album to listen again.';
  });
  async function share(trackOnly) {
    const url = new URL(location.href);
    url.hash = trackOnly ? tracks[current].parentElement.id : '';
    const shareTitle = trackOnly ? tracks[current].dataset.title + ' — Amari Inniss' : 'Amari Inniss';
    try {
      if (navigator.share) await navigator.share({title: shareTitle, url: url.href});
      else {
        await navigator.clipboard.writeText(url.href);
        status.textContent = 'Link copied.';
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
