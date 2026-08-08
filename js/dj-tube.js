(() => {
  'use strict';

  const videos = [
    {
      id: 'JZ4h_ldPUgk',
      title: 'Soca 2026 Mix — Soca Spark 26',
      creator: 'DJ Ana & Ultra Simmo',
      genre: 'Soca',
      region: 'Trinidad & Tobago',
      duration: 'Mix',
      source: 'YouTube',
      featured: true
    },
    {
      id: 'svCJ3C5LviI',
      title: 'Trinidad Carnival 2026 Road Power Soca DJ Mix',
      creator: 'Sir Trey Benjamin',
      genre: 'Soca',
      region: 'Trinidad & Tobago',
      duration: 'Mix',
      source: 'YouTube',
      featured: true
    },
    {
      id: 'VG-NhYHjPrE',
      title: 'Dancehall Mix 2026 — 50 Best Dancehall Songs',
      creator: 'DJ Treasure',
      genre: 'Dancehall',
      region: 'Jamaica',
      duration: 'Mix',
      source: 'YouTube',
      featured: false
    },
    {
      id: 'eKIOU9X0MxI',
      title: 'Dancehall Mix 2026 Vol. 4 — Raw & Clean',
      creator: 'ZJ Liquid Music',
      genre: 'Dancehall',
      region: 'Jamaica',
      duration: 'Mix',
      source: 'YouTube',
      featured: false
    }
  ];

  const categories = [
    ['Soca', 'Power, groovy, jab & road'],
    ['Dancehall', 'Jamaica & the wider Caribbean'],
    ['Reggae', 'Roots, lovers & modern reggae'],
    ['Bouyon', 'Fast, raw Caribbean energy'],
    ['Live Sessions', 'Sets, stages & behind the decks']
  ];

  const featureGrid = document.querySelector('#dj-feature-grid');
  const videoGrid = document.querySelector('#dj-video-grid');
  const categoryGrid = document.querySelector('#dj-category-grid');
  const searchInput = document.querySelector('#dj-search-input');
  const emptyState = document.querySelector('#dj-empty');

  function thumb(id) {
    return `https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg`;
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[char]));
  }

  function openPlayer(video) {
    const modal = document.createElement('div');
    modal.className = 'dj-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', video.title);
    modal.innerHTML = `
      <div class="dj-modal__dialog">
        <div class="dj-modal__video">
          <iframe src="https://www.youtube.com/embed/${encodeURIComponent(video.id)}?autoplay=1&rel=0" title="${escapeHtml(video.title)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
        </div>
        <div class="dj-modal__bar">
          <div><h2>${escapeHtml(video.title)}</h2><small>${escapeHtml(video.creator)} · ${escapeHtml(video.region)}</small></div>
          <button class="dj-modal__close" type="button" aria-label="Close video">&times;</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    document.body.classList.add('is-modal-open');
    const close = () => { modal.remove(); document.body.classList.remove('is-modal-open'); };
    modal.querySelector('.dj-modal__close').addEventListener('click', close);
    modal.addEventListener('click', event => { if (event.target === modal) close(); });
    document.addEventListener('keydown', function esc(event) {
      if (event.key === 'Escape') { close(); document.removeEventListener('keydown', esc); }
    });
  }

  function renderFeatured() {
    if (!featureGrid) return;
    const featured = videos.filter(video => video.featured);
    const primary = featured[0];
    const secondary = featured.slice(1, 3);
    featureGrid.innerHTML = `
      <article class="dj-feature-card" data-video-id="${primary.id}">
        <div class="dj-feature-card__media" style="background-image:url('${thumb(primary.id)}')"></div>
        <div class="dj-feature-card__overlay"></div>
        <div class="dj-feature-card__content"><span class="dj-pill">Featured</span><h3>${escapeHtml(primary.title)}</h3><div class="dj-meta">${escapeHtml(primary.creator)} · ${escapeHtml(primary.region)}</div></div>
      </article>
      <div class="dj-feature-stack">${secondary.map(video => `
        <article class="dj-feature-card dj-feature-card--small" data-video-id="${video.id}">
          <div class="dj-feature-card__media" style="background-image:url('${thumb(video.id)}')"></div>
          <div class="dj-feature-card__overlay"></div>
          <div class="dj-feature-card__content"><span class="dj-pill">${escapeHtml(video.genre)}</span><h3>${escapeHtml(video.title)}</h3><div class="dj-meta">${escapeHtml(video.creator)}</div></div>
        </article>`).join('')}</div>`;
    featureGrid.querySelectorAll('[data-video-id]').forEach(card => card.addEventListener('click', () => {
      const video = videos.find(item => item.id === card.dataset.videoId);
      if (video) openPlayer(video);
    }));
  }

  function renderCategories() {
    if (!categoryGrid) return;
    categoryGrid.innerHTML = categories.map(([name, description]) => `
      <a class="dj-category" href="#latest-heading" data-category-link="${escapeHtml(name)}"><strong>${escapeHtml(name)}</strong><span>${escapeHtml(description)}</span></a>`).join('');
    categoryGrid.querySelectorAll('[data-category-link]').forEach(link => link.addEventListener('click', event => {
      event.preventDefault();
      const value = link.dataset.categoryLink;
      const filter = document.querySelector(`[data-filter="${CSS.escape(value)}"]`);
      if (filter) filter.click();
      document.querySelector('#latest-heading')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }));
  }

  function renderVideos(filter = 'all', query = '') {
    if (!videoGrid) return;
    const normalized = query.trim().toLowerCase();
    const results = videos.filter(video => {
      const matchesFilter = filter === 'all' || video.genre === filter || video.region === filter;
      const haystack = `${video.title} ${video.creator} ${video.genre} ${video.region}`.toLowerCase();
      return matchesFilter && (!normalized || haystack.includes(normalized));
    });
    videoGrid.innerHTML = results.map(video => `
      <article class="dj-video-card" data-video-id="${video.id}" tabindex="0" role="button" aria-label="Play ${escapeHtml(video.title)}">
        <div class="dj-video-thumb" style="background-image:url('${thumb(video.id)}')"><span class="dj-play" aria-hidden="true">▶</span></div>
        <div class="dj-video-body"><div class="dj-meta"><span>${escapeHtml(video.genre)}</span><span>·</span><span>${escapeHtml(video.region)}</span></div><h3>${escapeHtml(video.title)}</h3><p>${escapeHtml(video.creator)} · ${escapeHtml(video.source)}</p></div>
      </article>`).join('');
    emptyState.hidden = results.length !== 0;
    videoGrid.querySelectorAll('[data-video-id]').forEach(card => {
      const play = () => { const video = videos.find(item => item.id === card.dataset.videoId); if (video) openPlayer(video); };
      card.addEventListener('click', play);
      card.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); play(); } });
    });
  }

  let activeFilter = 'all';
  document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
    activeFilter = button.dataset.filter;
    document.querySelectorAll('[data-filter]').forEach(item => item.classList.toggle('is-active', item === button));
    renderVideos(activeFilter, searchInput?.value || '');
  }));

  searchInput?.addEventListener('input', () => renderVideos(activeFilter, searchInput.value));

  renderFeatured();
  renderCategories();
  renderVideos();
})();
