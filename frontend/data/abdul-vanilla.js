/* Framework-free avatar switcher, floating launcher, and login intro for the vanilla client (app.js).
 * Follows ABDUL-BARI-MASTER-SPEC.md and ABDUL-AVATAR-README.md.
 */
(function () {
  var BASE = 'abdul';
  var FILES = { idle: 'abdul-idle', thinking: 'abdul-thinking', happy: 'abdul-happy', confused: 'abdul-confused', sad: 'abdul-sad' };
  var ALIAS = { sorry: 'confused' };
  var META = {
    idle:     { hold: 0,    back: null },
    happy:    { hold: 3000, back: 'idle' },
    sad:      { hold: 3000, back: 'idle' },
    thinking: { hold: 0,    back: null, delay: 250 },
    confused: { hold: 0,    back: null },
    sorry:    { hold: 0,    back: null }
  };
  var current = 'idle', holdTimer, delayTimer;

  var INTRO = {
    firstEver: {
      en: "Hi{, name}! I'm Abdul Bari, NED's resident senior and the EduCompass AI guide. I'm unofficial, but I try to be accurate. Ask me about courses, prerequisites, FYPs, supervisors or careers.",
      ru: "Salam{, name}! Main Abdul Bari hoon, NED ka resident senior aur EduCompass ka AI guide. Official nahi hoon, par sahi batane ki koshish karta hoon. Courses, prerequisites, FYP, supervisors ya careers ke baare mein poocho.",
      chips: [
        { label: "Courses", link: "#/planner" },
        { label: "Prerequisites", link: "#/prerequisites" },
        { label: "FYP ideas", link: "#/fyp" },
        { label: "Careers", link: "#/careers" }
      ]
    },
    returning: {
      en: [
        "Hey{, name}! Abdul Bari here. Ask me about courses, prerequisites or FYPs.",
        "Welcome back{, name}. Still in my seventh semester. What do you need?",
        "Hello{, name}. Notice board and I are both ready.",
        "Back again{, name}? Good. Ask away.",
        "Hi{, name}. Chai's ready, questions welcome."
      ],
      ru: [
        "Salam{, name}! Abdul Bari hazir hai. Courses, prerequisites ya FYP, jo poochna ho.",
        "Wapis aa gaye{, name}? Main yahin tha, seventh semester mein.",
        "Tension na lo{, name}. Poochna ho to bata dena.",
        "Library ke aas paas hi hoon. Kuch poochna hai?",
        "Chai ready hai{, name}, sawal bhi ho to bata do."
      ]
    }
  };

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
      if (old) {
        old.className = 'abdul-img abdul-out';
        old.alt = '';
        setTimeout(function () { old.remove(); }, 170);
      }
    });
    document.dispatchEvent(new CustomEvent('abdul:state', { detail: { state: state } }));
  }

  function setState(next) {
    clearTimeout(holdTimer);
    clearTimeout(delayTimer);
    var m = META[next] || META.idle;
    var run = function () {
      paint(next);
      if (m.hold && m.back) holdTimer = setTimeout(function () { paint(m.back); }, m.hold);
    };
    if (m.delay) delayTimer = setTimeout(run, m.delay); else run();
  }

  function onResponse(layer) {
    if (layer === 'error') return setState('sorry');
    if (layer === 4) return setState('confused');
    setState('idle');
  }

  function fill(line, name) {
    return name
      ? line.replace('{, name}', ', ' + name).replace('{name}', name)
      : line.replace('{, name}', '').replace('{name}', '').replace(/\s{2,}/g, ' ');
  }

  function showIntroBubble(user) {
    var hash = location.hash || '';
    if (hash.startsWith('#/admin') || hash.startsWith('#/login')) return;

    var sessionKey = (user && user.email) ? user.email : 'guest-tab';
    try {
      if (sessionStorage.getItem('abdul_intro_for') === sessionKey) return;
      sessionStorage.setItem('abdul_intro_for', sessionKey);
    } catch(e) {}

    var met = false;
    try { met = localStorage.getItem('abdul_met') === '1'; } catch(e) {}

    var name = (user && user.name) ? user.name.trim().split(/\s+/)[0] : '';
    var textEn = '', textRu = '', chips = [];

    if (!met) {
      textEn = fill(INTRO.firstEver.en, name);
      textRu = fill(INTRO.firstEver.ru, name);
      chips = INTRO.firstEver.chips;
      try { localStorage.setItem('abdul_met', '1'); } catch(e) {}
    } else {
      var useRu = Math.random() < 0.5;
      var bank = useRu ? INTRO.returning.ru : INTRO.returning.en;
      var line = bank[Math.floor(Math.random() * bank.length)];
      textEn = fill(line, name);
    }

    var bubble = document.createElement('div');
    bubble.className = 'abdul-intro';
    bubble.setAttribute('role', 'status');
    bubble.setAttribute('aria-live', 'polite');

    var chipsHtml = '';
    if (chips.length) {
      chipsHtml = '<div class="abdul-chips">' + chips.map(function(c) {
        return '<a class="abdul-chip" style="text-decoration:none" href="' + c.link + '">' + c.label + '</a>';
      }).join('') + '</div>';
    }

    bubble.innerHTML =
      '<div class="abdul-avatar" data-abdul="head" style="width:44px;height:44px;border-radius:50%;overflow:hidden"></div>' +
      '<div class="abdul-intro-body">' +
        '<p style="margin:0 0 6px;font-size:0.875rem;line-height:1.45">' + textEn + '</p>' +
        (textRu ? '<p lang="ur-Latn" class="abdul-intro-ru" style="margin:0 0 6px;font-size:0.82rem;color:var(--text-muted, var(--muted))">' + textRu + '</p>' : '') +
        chipsHtml +
        '<a class="abdul-intro-open" style="font-size:0.82rem;text-decoration:underline;color:var(--link, var(--primary))" href="#/assistant">Chat with Abdul</a>' +
      '</div>' +
      '<button class="abdul-intro-x" aria-label="Dismiss" style="position:absolute;top:6px;right:8px;border:0;background:none;font-size:1.2rem;cursor:pointer;color:var(--muted)">×</button>';

    document.body.appendChild(bubble);

    // Initialize the avatar in the intro bubble
    setState('happy');
    setTimeout(function() { setState('idle'); }, 3000);

    var closeBubble = function() {
      if (bubble && bubble.parentNode) bubble.parentNode.removeChild(bubble);
    };

    bubble.querySelector('.abdul-intro-x').onclick = closeBubble;
    bubble.querySelectorAll('a').forEach(function(a) { a.onclick = closeBubble; });

    var autoDismiss = setTimeout(closeBubble, met ? 6000 : 12000);

    window.addEventListener('keydown', function onEsc(e) {
      if (e.key === 'Escape') {
        closeBubble();
        clearTimeout(autoDismiss);
        window.removeEventListener('keydown', onEsc);
      }
    });
  }

  function mountLauncher() {
    if (document.querySelector('.abdul-launcher')) return;
    var btn = document.createElement('a');
    btn.className = 'abdul-launcher';
    btn.href = '#/assistant';
    btn.setAttribute('aria-label', 'Chat with Abdul Bari');
    btn.title = 'Chat with Abdul Bari';
    btn.innerHTML = '<span class="abdul-avatar" data-abdul="head" style="width:58px;height:58px"></span>';
    document.body.appendChild(btn);

    // Update visibility if on admin route
    function checkRoute() {
      var hash = location.hash || '';
      if (hash.startsWith('#/admin')) {
        btn.classList.add('abdul-launcher-admin');
      } else {
        btn.classList.remove('abdul-launcher-admin');
      }
      if (hash.startsWith('#/assistant')) {
        btn.style.display = 'none';
      } else {
        btn.style.display = 'flex';
      }
    }
    window.addEventListener('hashchange', checkRoute);
    checkRoute();
  }

  window.Abdul = {
    setState: setState,
    onResponse: onResponse,
    onUserSend: function () { setState('thinking'); },
    showIntro: showIntroBubble,
    get state() { return current; }
  };

  document.addEventListener('DOMContentLoaded', function () {
    mountLauncher();
    paint('idle');
    setTimeout(function () {
      var u = window.Session ? window.Session.user : null;
      showIntroBubble(u);
    }, 1000);
  });
})();
