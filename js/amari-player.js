(() => {
  const audio = document.getElementById('amariAudio');
  const title = document.getElementById('playerTitle');
  const genre = document.getElementById('playerGenre');
  const art = document.getElementById('playerArt');
  const list = document.getElementById('tracklist');
  if (!audio || !list) return;
  list.addEventListener('click', (event) => {
    const button = event.target.closest('.track__play');
    if (!button) return;
    audio.src = button.dataset.src;
    title.textContent = button.dataset.title;
    genre.textContent = button.dataset.genre;
    art.src = button.dataset.art;
    audio.play().catch(() => {});
  });
})();