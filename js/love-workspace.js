// FTN Platform Website — FTN Love workspace, production phase 1.
(function (global) {
  'use strict';

  if (!document.querySelector('link[data-love-style]')) {
    var styleLink = document.createElement('link');
    styleLink.rel = 'stylesheet';
    styleLink.href = '/css/components/love.css';
    styleLink.setAttribute('data-love-style', 'true');
    document.head.appendChild(styleLink);
  }

  var escapeHtml = global.FTN.WorkspaceShell.escapeHtml;
  var TOOL_ID = 'love';
  var VALUES = ['Faith', 'Family', 'Ambition', 'Humor', 'Honesty', 'Adventure', 'Stability', 'Creativity', 'Community'];
  var PRIORITIES = ['Family life', 'Career growth', 'Faith/spiritual life', 'Community contribution', 'Travel/adventure', 'Creative life', 'Financial stability', 'Health/wellbeing'];

  function countryName() {
    return global.FTN.Country && global.FTN.Country.get ? global.FTN.Country.get().name : 'Trinidad & Tobago';
  }

  function selected(form, name) {
    return Array.prototype.slice.call(form.querySelectorAll('input[name="' + name + '"]:checked')).map(function (el) { return el.value; });
  }

  function pulseMnemonic(content) {
    var mnemonic = content.querySelector('.love-orbit');
    if (!mnemonic) return;
    mnemonic.classList.remove('is-complete');
    void mnemonic.offsetWidth;
    mnemonic.classList.add('is-complete');
    global.setTimeout(function () { mnemonic.classList.remove('is-complete'); }, 1400);
  }

  function historyHTML() {
    var items = global.FTN.IntegrationAdapter && global.FTN.IntegrationAdapter.history ? global.FTN.IntegrationAdapter.history(TOOL_ID) : [];
    if (!items.length) return '<p class="workspace-field__hint">No compatibility briefs saved on this device yet.</p>';
    return '<div class="love-history-list">' + items.slice().reverse().slice(0, 5).map(function (item) {
      var p = item.payload || {};
      return '<article><strong>' + escapeHtml(p.goal || 'Connection brief') + '</strong><span>' + escapeHtml((p.values || []).join(' · ') || 'Values not recorded') + '</span><small>' + escapeHtml(p.country || '') + '</small></article>';
    }).join('') + '</div>';
  }

  document.addEventListener('DOMContentLoaded', function () {
    global.FTN.WorkspaceShell.init({
      productId: 'love',
      mountId: 'workspace-root',
      accentSmallVar: '--color-love-on-dark',
      build: function (content, api) {
        content.innerHTML =
          '<section class="love-hero">' +
            '<div class="love-hero__copy"><span class="love-kicker">Compatibility before swiping</span><h2>Start with what matters.</h2>' +
            '<p>Build a compatibility brief around the kind of connection you want, the values you care about and the life you are trying to build.</p></div>' +
            '<div class="love-orbit" aria-hidden="true"><span class="love-orbit__ring love-orbit__ring--a"></span><span class="love-orbit__ring love-orbit__ring--b"></span><span class="love-orbit__node love-orbit__node--a"></span><span class="love-orbit__node love-orbit__node--b"></span><span class="love-orbit__center"></span></div>' +
          '</section>' +
          '<section class="love-builder">' +
            '<div class="love-builder__intro"><span class="love-kicker">Your compatibility brief</span><h3>Describe the connection you want FTN to understand.</h3></div>' +
            '<form id="love-form" novalidate>' +
              '<div class="love-form-grid">' +
                '<div class="workspace-field"><label for="love-goal">What are you looking for?</label><select id="love-goal" name="goal" required><option value="">Select an answer</option><option>Friendship</option><option>A relationship</option><option>Marriage-minded</option><option>Open to connection</option><option>Not sure yet</option></select></div>' +
                '<div class="workspace-field"><label for="love-location">Location openness</label><select id="love-location" name="location"><option>My country only</option><option>Nearby Caribbean territories</option><option>Anywhere in the Caribbean</option><option>Caribbean diaspora too</option><option>Open globally</option></select></div>' +
                '<div class="workspace-field"><label for="love-communication">Communication style</label><select id="love-communication" name="communication"><option>Direct and clear</option><option>Warm and expressive</option><option>Calm and reflective</option><option>Playful and light</option><option>Flexible / depends on the person</option></select></div>' +
                '<div class="workspace-field"><label for="love-pace">Preferred pace</label><select id="love-pace" name="pace"><option>Slow and intentional</option><option>Get to know each other naturally</option><option>Open to moving quickly if aligned</option><option>No fixed pace</option></select></div>' +
              '</div>' +
              '<fieldset class="love-choice-group"><legend>Which values matter most? <span>Choose up to 4</span></legend><div class="love-chip-grid">' + VALUES.map(function (v) { return '<label><input type="checkbox" name="value" value="' + v + '"><span>' + v + '</span></label>'; }).join('') + '</div></fieldset>' +
              '<fieldset class="love-choice-group"><legend>Which life priorities should compatibility respect? <span>Choose up to 3</span></legend><div class="love-chip-grid">' + PRIORITIES.map(function (v) { return '<label><input type="checkbox" name="priority" value="' + v + '"><span>' + v + '</span></label>'; }).join('') + '</div></fieldset>' +
              '<div class="workspace-field"><label for="love-intent">Describe what you are hoping to find, in your own words <span class="workspace-field__hint">(optional)</span></label><textarea id="love-intent" name="intentText" rows="4" maxlength="800" placeholder="Say it naturally. For example: I want someone family-oriented who understands Caribbean culture, takes faith seriously and is open to building a life together."></textarea></div>' +
              '<div class="workspace-field"><label for="love-boundary">One thing a healthy connection should respect <span class="workspace-field__hint">(optional)</span></label><textarea id="love-boundary" name="boundary" rows="3" maxlength="280" placeholder="Example: honest communication, family time, faith, personal space, career goals..."></textarea></div>' +
              '<button type="submit" class="btn btn-primary">Save compatibility brief</button>' +
            '</form><div id="love-output" aria-live="polite"></div>' +
          '</section>' +
          '<section class="love-history"><div><span class="love-kicker">Saved on this device</span><h3>Recent compatibility briefs</h3></div><div id="love-history-list">' + historyHTML() + '</div></section>';

        var form = document.getElementById('love-form');
        var output = document.getElementById('love-output');
        var history = document.getElementById('love-history-list');

        function enforceLimit(name, limit) {
          var boxes = form.querySelectorAll('input[name="' + name + '"]');
          boxes.forEach(function (box) {
            box.addEventListener('change', function () {
              var count = selected(form, name).length;
              boxes.forEach(function (b) { b.disabled = count >= limit && !b.checked; });
            });
          });
        }
        enforceLimit('value', 4);
        enforceLimit('priority', 3);

        form.addEventListener('submit', function (event) {
          event.preventDefault();
          var goal = form.goal.value;
          var values = selected(form, 'value');
          var priorities = selected(form, 'priority');
          if (!goal || !values.length) {
            var errors = [];
            if (!goal) errors.push('Choose what you are looking for.');
            if (!values.length) errors.push('Choose at least one important value.');
            output.innerHTML = global.FTN.WorkspaceShell.renderErrorsHTML(errors);
            return;
          }

          var payload = {
            schemaVersion: 2,
            goal: goal,
            values: values,
            priorities: priorities,
            locationOpenness: form.location.value,
            communicationStyle: form.communication.value,
            preferredPace: form.pace.value,
            intentText: form.intentText.value.trim(),
            boundaryContext: form.boundary.value.trim(),
            country: countryName(),
            intentInterpreter: 'ibis.ai'
          };

          global.FTN.IntegrationAdapter.submit(TOOL_ID, payload).then(function (res) {
            api.notify(res.message, 'success');
            pulseMnemonic(content);
            history.innerHTML = historyHTML();
            output.innerHTML = '<div class="workspace-output"><h3>Compatibility brief saved</h3><p><strong>Intent:</strong> ' + escapeHtml(goal) + '</p><p><strong>Core values:</strong> ' + escapeHtml(values.join(', ')) + '</p>' + (payload.intentText ? '<p><strong>In your own words:</strong> ' + escapeHtml(payload.intentText) + '</p>' : '') + '</div>';
          });
        });
      }
    });
  });
})(window);
