// FTN Platform Website — ibis.ai workspace, production phase 1.
// ibis.ai is presented honestly as FTN's current intelligence/routing layer. The live
// implementation is transparent deterministic matching against the Product Registry; future
// language-model and regional-data capabilities plug into the same surface when they exist.
(function (global) {
  'use strict';

  // Keep product-specific styling isolated from the shared workspace shell.
  if (!document.querySelector('link[data-ibis-style]')) {
    var styleLink = document.createElement('link');
    styleLink.rel = 'stylesheet';
    styleLink.href = '/css/components/ibis-ai.css';
    styleLink.setAttribute('data-ibis-style', 'true');
    document.head.appendChild(styleLink);
  }

  var escapeHtml = global.FTN.WorkspaceShell.escapeHtml;
  var STORAGE_KEY = 'ftn-ibis-recent-goals';
  var EXAMPLES = [
    'I need to report a pothole in my community',
    'I am looking for a grant or business opportunity',
    'I want to release and tag a soca track',
    'I need help planning an event in Trinidad',
    'I want to understand what is happening across Trinidad and Tobago',
    'I want Caribbean news and investigations'
  ];

  function countryName() {
    return global.FTN.Country && global.FTN.Country.get ? global.FTN.Country.get().name : 'Trinidad & Tobago';
  }

  function recentGoals() {
    if (!global.FTN.storage) return [];
    return global.FTN.storage.getJSON(STORAGE_KEY, []);
  }

  function rememberGoal(goal) {
    if (!global.FTN.storage) return;
    var items = recentGoals().filter(function (item) { return item !== goal; });
    items.unshift(goal);
    global.FTN.storage.setJSON(STORAGE_KEY, items.slice(0, 6));
  }

  function renderRecent(mount) {
    if (!mount) return;
    var items = recentGoals();
    if (!items.length) {
      mount.innerHTML = '<p class="workspace-muted">No recent goals saved on this device.</p>';
      return;
    }
    mount.innerHTML = '<div class="ibis-chip-row">' + items.map(function (goal) {
      return '<button type="button" class="ibis-chip" data-ibis-goal="' + escapeHtml(goal) + '">' + escapeHtml(goal) + '</button>';
    }).join('') + '</div>';
  }

  function renderMatches(output, goal, matches) {
    if (!matches.length) {
      output.innerHTML = '<div class="workspace-output"><span class="workspace-kicker">No confident route yet</span><h3>ibis.ai could not map that request to a current FTN product.</h3><p>Try different words, or <a href="/">explore the full FTN ecosystem</a>. This is a real limitation of the current deterministic router, not a hidden AI failure.</p></div>';
      return;
    }

    var html = '<div class="workspace-output"><span class="workspace-kicker">Best routes for ' + escapeHtml(countryName()) + '</span><h3>' + matches.length + ' product match' + (matches.length === 1 ? '' : 'es') + '</h3><p class="workspace-muted">ibis.ai matched your goal against the FTN Product Registry. Each recommendation explains why it appeared.</p><div class="ibis-result-list">';
    matches.slice(0, 5).forEach(function (m, index) {
      html += '<article class="ibis-result-card">' +
        '<span class="ibis-result-rank">' + (index + 1) + '</span>' +
        '<div><h4><a href="' + m.product.route + '">' + escapeHtml(m.product.name) + '</a></h4>' +
        '<p><strong>' + escapeHtml(m.product.tagline) + '</strong></p>' +
        '<p>' + escapeHtml(m.explanation) + '</p>' +
        '<a class="btn btn-outline btn-sm" href="' + m.product.route + '">Open ' + escapeHtml(m.product.name) + '</a></div>' +
        '</article>';
    });
    html += '</div></div>';
    output.innerHTML = html;
  }

  document.addEventListener('DOMContentLoaded', function () {
    global.FTN.WorkspaceShell.init({
      productId: 'ibis-ai',
      mountId: 'workspace-root',
      accentSmallVar: '--color-ibis-on-dark',
      build: function (content) {
        content.innerHTML =
          '<section class="ibis-brand-hero">' +
            '<div class="ibis-brand-hero__copy">' +
              '<span class="workspace-kicker">Caribbean Intelligence Layer</span>' +
              '<h2>Tell ibis.ai what you need to accomplish.</h2>' +
              '<p>Built for Caribbean context. Today ibis.ai is FTN\'s transparent navigation and decision-routing layer: it reads your goal, checks the Product Registry and sends you to the FTN product most capable of helping. The purple intelligence identity comes directly from the established ibis.ai product panel.</p>' +
            '</div>' +
            '<div class="ibis-brand-hero__art"><img src="/assets/panels/05-ibis-ai.png" alt="ibis.ai — Built for the Caribbean"></div>' +
          '</section>' +
          '<section class="ibis-intro">' +
            '<div class="ibis-status-grid">' +
              '<article><span>Operational now</span><strong>Goal → FTN product routing</strong><p>Real deterministic matching with visible explanations.</p></article>' +
              '<article><span>Operational now</span><strong>Country context</strong><p>Your selected Caribbean country is carried into the recommendation surface.</p></article>' +
              '<article><span>Future layer</span><strong>Regional intelligence</strong><p>Structured Caribbean datasets, models and decision support connect here only after verified services and governance are deployed.</p></article>' +
            '</div>' +
          '</section>' +
          '<section class="ibis-console">' +
            '<form id="ibis-form" novalidate>' +
              '<div class="workspace-field"><label for="ibis-goal">What are you trying to do?</label>' +
              '<textarea id="ibis-goal" name="goal" rows="3" placeholder="Example: I want to report flooding in my community and understand who should respond" required></textarea></div>' +
              '<div class="ibis-example-wrap"><span class="workspace-kicker">Try an example</span><div class="ibis-chip-row">' + EXAMPLES.map(function (example) { return '<button type="button" class="ibis-chip" data-ibis-goal="' + escapeHtml(example) + '">' + escapeHtml(example) + '</button>'; }).join('') + '</div></div>' +
              '<button type="submit" class="btn btn-primary">Ask ibis.ai</button>' +
            '</form>' +
            '<div id="ibis-output" aria-live="polite"></div>' +
          '</section>' +
          '<section class="ibis-recent"><div class="ibis-recent__head"><div><span class="workspace-kicker">Saved on this device</span><h3>Recent goals</h3></div><button id="ibis-clear" type="button" class="btn btn-outline btn-sm">Clear</button></div><div id="ibis-recent-list"></div></section>' +
          '<section class="ibis-trust"><span class="workspace-kicker">Trust boundary</span><p>ibis.ai does not currently provide open-ended AI chat, government decisions, legal or medical conclusions, or live autonomous access to Caribbean databases. Those capabilities require verified data, privacy, governance and model layers before FTN can responsibly activate them.</p></section>';

        var form = document.getElementById('ibis-form');
        var input = document.getElementById('ibis-goal');
        var output = document.getElementById('ibis-output');
        var recentMount = document.getElementById('ibis-recent-list');
        var clear = document.getElementById('ibis-clear');

        function run(goal) {
          goal = String(goal || '').trim();
          if (!goal) {
            output.innerHTML = '<div class="workspace-output"><p>Tell ibis.ai what you are trying to accomplish.</p></div>';
            return;
          }
          var matches = global.FTN.IntentRouter.route(goal);
          rememberGoal(goal);
          renderRecent(recentMount);
          renderMatches(output, goal, matches);
        }

        form.addEventListener('submit', function (event) {
          event.preventDefault();
          run(input.value);
        });

        content.addEventListener('click', function (event) {
          var button = event.target.closest('[data-ibis-goal]');
          if (!button) return;
          input.value = button.getAttribute('data-ibis-goal') || '';
          input.focus();
          run(input.value);
        });

        clear.addEventListener('click', function () {
          if (global.FTN.storage) global.FTN.storage.remove(STORAGE_KEY);
          renderRecent(recentMount);
        });

        renderRecent(recentMount);
      }
    });
  });
})(window);
