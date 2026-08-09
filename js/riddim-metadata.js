// FTN Platform Website — FTN Riddim local metadata reader.
// Reads supported embedded metadata locally in the browser. No selected file is uploaded.
(function (global) {
  'use strict';

  function ascii(bytes, offset, length) {
    var out = '';
    for (var i = offset; i < offset + length; i += 1) out += String.fromCharCode(bytes[i]);
    return out;
  }

  function synchsafe(bytes, offset) {
    return ((bytes[offset] & 0x7f) << 21) |
      ((bytes[offset + 1] & 0x7f) << 14) |
      ((bytes[offset + 2] & 0x7f) << 7) |
      (bytes[offset + 3] & 0x7f);
  }

  function uint32(bytes, offset) {
    return (((bytes[offset] << 24) >>> 0) |
      (bytes[offset + 1] << 16) |
      (bytes[offset + 2] << 8) |
      bytes[offset + 3]) >>> 0;
  }

  function clean(value) {
    return String(value || '').replace(/\u0000/g, '').trim();
  }

  function decodeText(frameBytes) {
    if (!frameBytes || !frameBytes.length) return '';
    var encoding = frameBytes[0];
    var payload = frameBytes.slice(1);
    try {
      if (typeof TextDecoder !== 'undefined') {
        if (encoding === 1) return clean(new TextDecoder('utf-16').decode(payload));
        if (encoding === 2) return clean(new TextDecoder('utf-16be').decode(payload));
        if (encoding === 3) return clean(new TextDecoder('utf-8').decode(payload));
        return clean(new TextDecoder('iso-8859-1').decode(payload));
      }
    } catch (e) { /* basic fallback below */ }
    var out = '';
    for (var i = 0; i < payload.length; i += 1) out += String.fromCharCode(payload[i]);
    return clean(out);
  }

  function parseID3(arrayBuffer) {
    var bytes = new Uint8Array(arrayBuffer);
    if (bytes.length < 10 || ascii(bytes, 0, 3) !== 'ID3') return {};
    var version = bytes[3];
    var tagSize = synchsafe(bytes, 6);
    var end = Math.min(bytes.length, 10 + tagSize);
    var offset = 10;
    var frames = {};

    while (offset + 10 <= end) {
      var id = ascii(bytes, offset, 4);
      if (!/^[A-Z0-9]{4}$/.test(id)) break;
      var size = version === 4 ? synchsafe(bytes, offset + 4) : uint32(bytes, offset + 4);
      if (!size || offset + 10 + size > end) break;
      var frameBytes = bytes.slice(offset + 10, offset + 10 + size);
      if (id.charAt(0) === 'T' && id !== 'TXXX') frames[id] = decodeText(frameBytes);
      offset += 10 + size;
    }

    return {
      trackTitle: frames.TIT2 || '',
      artistName: frames.TPE1 || '',
      albumTitle: frames.TALB || '',
      genre: frames.TCON || '',
      releaseDate: frames.TDRC || frames.TYER || '',
      composer: frames.TCOM || '',
      publisher: frames.TPUB || '',
      copyright: frames.TCOP || '',
      isrc: frames.TSRC || ''
    };
  }

  function readArrayBuffer(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = function () { reject(reader.error || new Error('Unable to read track metadata.')); };
      reader.readAsArrayBuffer(file);
    });
  }

  function readDuration(file) {
    return new Promise(function (resolve) {
      var audio = document.createElement('audio');
      var url = URL.createObjectURL(file);
      audio.preload = 'metadata';
      audio.onloadedmetadata = function () {
        var duration = Number.isFinite(audio.duration) ? audio.duration : null;
        URL.revokeObjectURL(url);
        resolve(duration);
      };
      audio.onerror = function () { URL.revokeObjectURL(url); resolve(null); };
      audio.src = url;
    });
  }

  function formatDuration(seconds) {
    if (seconds === null || typeof seconds === 'undefined') return '';
    var total = Math.max(0, Math.round(seconds));
    var minutes = Math.floor(total / 60);
    var remaining = total % 60;
    return minutes + ':' + String(remaining).padStart(2, '0');
  }

  function read(file) {
    return Promise.all([readArrayBuffer(file), readDuration(file)]).then(function (results) {
      var detected = {};
      if (file.type === 'audio/mpeg' || /\.mp3$/i.test(file.name)) detected = parseID3(results[0]);
      return {
        fileName: file.name,
        fileType: file.type || 'unknown',
        fileSize: file.size,
        durationSeconds: results[1],
        duration: formatDuration(results[1]),
        detected: detected,
        supportNote: (file.type === 'audio/mpeg' || /\.mp3$/i.test(file.name))
          ? 'Embedded MP3/ID3 metadata read locally.'
          : 'Playback supported; embedded-tag reading for this format is not yet implemented.'
      };
    });
  }

  global.FTN = global.FTN || {};
  global.FTN.RiddimMetadata = { read: read, parseID3: parseID3 };
})(window);

// Product-local hub presentation module. Kept out of shared/global files so Riddim can evolve
// without creating cross-product merge conflicts during the website completion pass.
(function () {
  var script = document.createElement('script');
  script.src = '/js/riddim-hub-finalize.js';
  document.head.appendChild(script);
})();
