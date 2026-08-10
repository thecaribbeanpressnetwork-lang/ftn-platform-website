// FTN Radio — creator return loop: approximate programming windows.
(function (global) {
  'use strict';

  var TZ = 'America/Port_of_Spain';
  var ATLANTIC_OFFSET_HOURS = -4; // Trinidad & Tobago has no DST.
  var WINDOWS = {
    soca: { day:5, start:19, end:21, label:'Soca Energy' },
    calypso: { day:0, start:16, end:18, label:'Calypso & Kaiso' },
    reggae: { day:0, start:19, end:21, label:'Reggae & Roots' },
    dancehall: { day:6, start:20, end:22, label:'Dancehall' },
    zouk: { day:4, start:19, end:21, label:'Island Nights' },
    kompa: { day:4, start:19, end:21, label:'Island Nights' },
    chutney: { day:6, start:17, end:19, label:'Chutney Soca' },
    gospel: { day:0, start:8, end:10, label:'Caribbean Gospel' },
    default: { day:3, start:19, end:21, label:'New Caribbean / Discovery' }
  };

  function ruleFor(genre) {
    var g = String(genre || '').toLowerCase();
    var key = Object.keys(WINDOWS).find(function (k) { return k !== 'default' && g.indexOf(k) !== -1; });
    return WINDOWS[key || 'default'];
  }

  function atlanticClockDate(now) {
    return new Date(now.getTime() + ATLANTIC_OFFSET_HOURS * 60 * 60 * 1000);
  }

  function utcFromAtlanticParts(year, month, day, hour) {
    return new Date(Date.UTC(year, month, day, hour - ATLANTIC_OFFSET_HOURS, 0, 0, 0));
  }

  function nextWindow(genre) {
    var rule = ruleFor(genre);
    var now = new Date();
    var clock = atlanticClockDate(now);
    var day = clock.getUTCDay();
    var hour = clock.getUTCHours();
    var delta = (rule.day - day + 7) % 7;
    if (delta === 0 && hour >= rule.end) delta = 7;

    var targetClock = new Date(Date.UTC(clock.getUTCFullYear(), clock.getUTCMonth(), clock.getUTCDate() + delta, rule.start, 0, 0, 0));
    var target = utcFromAtlanticParts(targetClock.getUTCFullYear(), targetClock.getUTCMonth(), targetClock.getUTCDate(), rule.start);
    var end = utcFromAtlanticParts(targetClock.getUTCFullYear(), targetClock.getUTCMonth(), targetClock.getUTCDate(), rule.end);

    var dateText = new Intl.DateTimeFormat('en-TT', { timeZone:TZ, weekday:'long', month:'short', day:'numeric' }).format(target);
    var timeFmt = new Intl.DateTimeFormat('en-TT', { timeZone:TZ, hour:'numeric', minute:'2-digit' });
    var timeText = timeFmt.format(target) + '–' + timeFmt.format(end);
    return { label:rule.label, start:target.toISOString(), end:end.toISOString(), text:dateText + ', ' + timeText + ' Atlantic' };
  }

  function init() {
    var form = document.getElementById('radio-submit-form');
    var output = document.getElementById('radio-submit-output');
    if (!form || !output) { setTimeout(init, 120); return; }
    if (form.dataset.airtimeReady === 'true') return;
    form.dataset.airtimeReady = 'true';

    var intentField = form.querySelector('textarea[name="intent"]');
    if (intentField) {
      var wrap = document.createElement('div');
      wrap.className = 'workspace-field';
      wrap.innerHTML = '<label for="radio-creator-email">Email for programming updates <span class="workspace-field__hint">(optional)</span></label><input id="radio-creator-email" name="creatorEmail" type="email" autocomplete="email" placeholder="you@example.com"><p class="workspace-field__hint">Used only if you want FTN to contact you about this submission.</p>';
      intentField.closest('.workspace-field').insertAdjacentElement('afterend', wrap);
    }

    var estimate = document.createElement('div');
    estimate.className = 'workspace-output';
    estimate.id = 'radio-airtime-estimate';
    estimate.innerHTML = '<h3>Approximate listening window</h3><p>Choose a genre and FTN will estimate the next programming window. Programming review can move the final slot.</p>';
    form.insertAdjacentElement('afterend', estimate);

    var genre = form.querySelector('[name="genre"]');
    var last = null;
    function refresh() {
      last = nextWindow(genre && genre.value);
      estimate.innerHTML = '<h3>Approximate listening window</h3><p><strong>' + last.label + ':</strong> ' + last.text + '</p><p class="workspace-field__hint">This is a provisional programming window, not a guaranteed spin. Once FTN confirms the queue, the creator can be given the exact slot.</p>';
    }
    if (genre) { genre.addEventListener('input', refresh); genre.addEventListener('change', refresh); }
    refresh();

    form.addEventListener('submit', function () {
      refresh();
      var artist = (form.artist && form.artist.value || '').trim();
      var release = (form.release && form.release.value || '').trim();
      var email = (form.creatorEmail && form.creatorEmail.value || '').trim();
      try {
        var key = 'ftn-radio-airtime-v1';
        var rows = JSON.parse(localStorage.getItem(key) || '[]');
        rows.unshift({ artist:artist, release:release, email:email, estimatedWindow:last, savedAt:new Date().toISOString() });
        localStorage.setItem(key, JSON.stringify(rows.slice(0,100)));
      } catch (e) {}
    });

    new MutationObserver(function () {
      if (!last || !output.firstElementChild) return;
      if (output.querySelector('[data-ftn-airtime-confirmation]')) return;
      var p = document.createElement('p'); p.dataset.ftnAirtimeConfirmation = 'true';
      p.innerHTML = '<strong>Listen back:</strong> your current estimated FTN Radio window is ' + last.text + '.';
      output.firstElementChild.appendChild(p);
    }).observe(output, { childList:true, subtree:true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})(window);
