(() => {
  const audio = document.getElementById('amariAudio');
  const title = document.getElementById('playerTitle');
  const genre = document.getElementById('playerGenre');
  const art = document.getElementById('playerArt');
  if (!audio || !title || !genre || !art) return;

  document.addEventListener('click', (event) => {
    const button = event.target.closest('.track__play, .feature__play, .cover__play');
    if (!button) return;
    audio.src = button.dataset.src;
    title.textContent = button.dataset.title;
    genre.textContent = button.dataset.genre;
    art.src = button.dataset.art;
    audio.load();
    audio.play().catch(() => {});
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const cover = event.target.closest('.cover__play');
    if (!cover) return;
    event.preventDefault();
    cover.click();
  });
})();