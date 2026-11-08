/* Framework-free avatar switcher for the vanilla client (app.js, #/assistant).
 * Markup:  <span class="abdul-avatar" data-abdul="head" style="width:64px;height:64px"></span>
 * Usage:   Abdul.setState('thinking');  Abdul.setState('happy');  Abdul.onResponse(4);
 */
(function () {
  var BASE = '/abdul';
  var FILES = { idle: 'abdul-idle', thinking: 'abdul-thinking', happy: 'abdul-happy', confused: 'abdul-confused', sad: 'abdul-sad' };
  var ALIAS = { sorry: 'confused' };                       // remove when a dedicated sorry image exists
  var META = {
    idle:     { hold: 0,    back: null },
    happy:    { hold: 3000, back: 'idle' },
    sad:      { hold: 3000, back: 'idle' },
    thinking: { hold: 0,    back: null, delay: 250 },
    confused: { hold: 0,    back: null },
    sorry:    { hold: 0,    back: null }
  };
  var current = 'idle', hold, delay;

  function url(state, crop, retina) {
    var f = FILES[ALIAS[state] || state];
    return BASE + '/' + f + '-' + crop + (retina ? '@2x' : '') + '.webp';
  }
  function paint(state) {
    current = state;
    document.querySelectorAll('[data-abdul]').forEach(function (el) {
      var crop = el.getAttribute('data-abdul');
      var old = el.querySelector('img');
      var img = new Image();
      img.className = 'abdul-img abdul-in';
      img.alt = 'Abdul Bari, ' + state;
      img.decoding = 'async';
      img.src = url(state, crop, false);
      img.srcset = url(state, crop, false) + ' 1x, ' + url(state, crop, true) + ' 2x';
      el.appendChild(img);
      if (old) { old.className = 'abdul-img abdul-out'; old.alt = ''; setTimeout(function () { old.remove(); }, 170); }
    });
    document.dispatchEvent(new CustomEvent('abdul:state', { detail: { state: state } }));
  }
  function setState(next) {
    clearTimeout(hold); clearTimeout(delay);
    var m = META[next] || META.idle;
    var run = function () {
      paint(next);
      if (m.hold && m.back) hold = setTimeout(function () { paint(m.back); }, m.hold);
    };
    if (m.delay) delay = setTimeout(run, m.delay); else run();
  }
  function onResponse(layer) {                              // 1 | 2 | 3 | 4 | 'error'
    if (layer === 'error') return setState('sorry');
    if (layer === 4) return setState('confused');
    setState('idle');
  }
  window.Abdul = { setState: setState, onResponse: onResponse, onUserSend: function () { setState('thinking'); }, get state() { return current; } };
  document.addEventListener('DOMContentLoaded', function () { paint('idle'); });
})();
