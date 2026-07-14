// FTN Platform Website — Media Intake / Playback (Sprint 1, Wave 1).
//
// Real, client-side-only file attach and preview. This is a static site with no backend and no
// storage service -- a selected file never leaves the visitor's own browser (object URLs only).
// Every consumer must show the honest "stays in your browser, nothing is uploaded" label this
// module renders by default, so no product page can accidentally imply cloud storage that
// doesn't exist.
(function (global) {
  'use strict';

  function mount(container, options) {
    options = options || {};
    var accept = options.accept || '*';
    var kind = options.kind || 'audio'; // 'audio' | 'video' | 'image'

    var wrap = document.createElement('div');
    wrap.className = 'media-intake';

    var input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.className = 'media-intake__input';
    input.id = options.id || 'media-intake-input';

    var label = document.createElement('label');
    label.setAttribute('for', input.id);
    label.className = 'media-intake__label';
    label.textContent = options.label || 'Choose a file to preview';

    var hint = document.createElement('p');
    hint.className = 'workspace-field__hint';
    hint.textContent = 'Preview only -- this file stays in your browser and is never uploaded anywhere.';

    var previewHost = document.createElement('div');
    previewHost.className = 'media-intake__preview';

    input.addEventListener('change', function () {
      previewHost.innerHTML = '';
      var file = input.files && input.files[0];
      if (!file) return;
      var url = URL.createObjectURL(file);
      var el;
      if (kind === 'audio') {
        el = document.createElement('audio');
        el.controls = true;
        el.src = url;
      } else if (kind === 'video') {
        el = document.createElement('video');
        el.controls = true;
        el.src = url;
        el.style.maxWidth = '100%';
      } else {
        el = document.createElement('img');
        el.src = url;
        el.alt = file.name;
        el.style.maxWidth = '100%';
        el.style.borderRadius = 'var(--radius-8)';
      }
      previewHost.appendChild(el);
      var name = document.createElement('p');
      name.className = 'workspace-field__hint';
      name.textContent = file.name + ' (' + Math.round(file.size / 1024) + ' KB)';
      previewHost.appendChild(name);
      if (typeof options.onSelect === 'function') options.onSelect(file, url);
    });

    wrap.appendChild(input);
    wrap.appendChild(label);
    wrap.appendChild(hint);
    wrap.appendChild(previewHost);
    container.appendChild(wrap);

    return { root: wrap, input: input };
  }

  global.FTN = global.FTN || {};
  global.FTN.MediaIntake = { mount: mount };
})(window);
