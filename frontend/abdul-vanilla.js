/* ══════════════════════════════════════════════════════════════════════════════
   Abdul Bari Avatar System — Vanilla SPA Integration
   Follows ABDUL-BARI-MASTER-SPEC.md & User Design Directives:
   - Full standing avatar character (NOT a tiny circular crop)
   - Zero double-image overlays (single-element atomic swap)
   - Full backstory & personal Q&A instant answers (no timeouts/slowness)
   - Story & Guide cards on Sign In AND Sign Out
   - Immediate reset of negative/sad state on auth change
   ══════════════════════════════════════════════════════════════════════════════ */
(function () {
  var BASE = 'abdul';
  var FILES = {
    idle: 'abdul-idle',
    thinking: 'abdul-thinking',
    happy: 'abdul-happy',
    confused: 'abdul-confused',
    sad: 'abdul-sad'
  };
  var ALIAS = { sorry: 'confused' };
  var META = {
    idle:     { hold: 0,    back: null },
    happy:    { hold: 3000, back: 'idle' },
    sad:      { hold: 3000, back: 'idle' },
    thinking: { hold: 0,    back: null, delay: 200 },
    confused: { hold: 0,    back: null },
    sorry:    { hold: 0,    back: null }
  };
  var current = 'idle', holdTimer, delayTimer;

  function url(state, crop, retina) {
    var f = FILES[ALIAS[state] || state] || FILES.idle;
    return BASE + '/' + f + '-' + crop + (retina ? '@2x' : '') + '.webp';
  }

  /* ── ATOMIC PAINT — Single <img> only, eliminating all ghost/double overlays ── */
  function paint(state) {
    current = state;
    document.querySelectorAll('[data-abdul]').forEach(function (el) {
      var crop = el.getAttribute('data-abdul') || 'full';
      var newSrc = url(state, crop, false);
      var newSrcset = url(state, crop, false) + ' 1x, ' + url(state, crop, true) + ' 2x';
      var img = el.querySelector('img');

      if (!img) {
        el.innerHTML = '';
        img = new Image();
        img.className = 'abdul-img';
        img.alt = 'Abdul Bari, ' + state;
        img.decoding = 'async';
        img.src = newSrc;
        img.srcset = newSrcset;
        el.appendChild(img);
      } else {
        // Direct swap without stacking another node
        img.src = newSrc;
        img.srcset = newSrcset;
        img.alt = 'Abdul Bari, ' + state;
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
      if (m.hold && m.back) {
        holdTimer = setTimeout(function () { paint(m.back); }, m.hold);
      }
    };
    if (m.delay) delayTimer = setTimeout(run, m.delay); else run();
  }

  function onResponse(layer) {
    if (layer === 'error') return setState('sorry');
    if (layer === 4) return setState('confused');
    setState('idle');
  }

  function resetState() {
    clearTimeout(holdTimer);
    clearTimeout(delayTimer);
    setState('idle');
  }

  /* ── STORY & GUIDE KNOWLEDGE BASE (Instant offline response) ── */
  var PERSONA_QA = [
    {
      patterns: [/who are you/i, /what are you/i, /tell me about yourself/i, /introduce yourself/i, /aap kaun ho/i, /tum kaun ho/i, /kirdar/i],
      answer: "Salam! I am Abdul Bari — NED University CISE's resident senior and your EduCompass academic guide! I'm officially forever in my seventh semester (long enough that even the main gate guard stopped asking for my student card). I know every prerequisite chain, grading curve, and faculty research lab on campus. Ask me anything!"
    },
    {
      patterns: [/your story/i, /tell me your story/i, /what is your story/i, /kahani/i, /why are you here/i, /why.*stay/i, /backstory/i],
      answer: "My story? Legend has it I was once a department topper with a whole envelope of foreign job offers. But I handed them back, stayed right here at NED CISE, and never left! Why? Because the 7th semester is where everything comes together — Final Year Projects, research domains, career roadmaps. I stayed to make sure every incoming junior has someone who knows the rules inside-out. That's my story!"
    },
    {
      patterns: [/why.*7th/i, /why.*seventh/i, /graduat/i, /pass.*out/i, /degree.*complete/i, /still.*student/i],
      answer: "Seventh semester is the golden semester: you've conquered core computing (CS-115, CS-218) and you're embarking on your Final Year Project (CS-406). Let's just say I loved this semester so much, I decided to keep living it! The notice board still honors my presence, so here I am."
    },
    {
      patterns: [/cgpa/i, /what.*gpa/i, /topper/i, /fail/i, /backlog/i, /your grades/i, /marks/i],
      answer: "A true magician never reveals his transcript! My CGPA is a classified secret strictly between me and the registrar's cabinet. But your CGPA is what matters today — head to the Planner or GPA tab, and I'll help you calculate what grades you need to stay on target."
    },
    {
      patterns: [/which batch/i, /what batch/i, /what year/i, /when did you join/i, /kis batch/i],
      answer: "Maybe Batch 2018, maybe earlier, maybe when enrollment was still done by hand on yellow paper cards! Batches graduate, but the prerequisite chains and department traditions stay the same."
    },
    {
      patterns: [/where do you live/i, /room/i, /kahan rehte/i, /on campus/i],
      answer: "Somewhere between the CISE department library and the canteen. Close enough to smell the fresh chai and hear when the latest notice is pinned to the board."
    },
    {
      patterns: [/are you real/i, /are you ai/i, /are you a bot/i, /human or/i, /robot/i, /insaan/i],
      answer: "Seedha sawal hai to seedha jawab: I am an AI academic guide created for the EduCompass project at NED University (CISE Department). I'm modeled as Abdul Bari, the resident senior we all wish we had. Official decisions come from the university notice board; I'm the friend who read it all for you."
    },
    {
      patterns: [/how.*use/i, /how.*work/i, /guide me/i, /what can you do/i, /help me/i, /features/i, /tour/i],
      answer: "Here is your quick guide to EduCompass:\n• Prerequisite Explorer: Visual interactive graph showing what unlocks what, and cascading delays if a course is failed.\n• Semester Planner: Pick your upcoming courses within the 21 Credit Hour ceiling and estimate semester GPA.\n• FYP Portal: Search 36+ real NED final year projects, filtered by supervisor and domain.\n• Career Hub: Verified industry roadmaps (AI, Data, Web, Embedded, Cyber) mapped directly to NED courses."
    },
    {
      patterns: [/salam/i, /assalam/i, /hello/i, /^hi\b/i, /^hey\b/i, /kya haal/i, /how are you/i],
      answer: "Wa alaikum assalam! Abdul Bari hazir hai. Chai ki chuski ke sath batao — kis course, prerequisite, ya FYP supervisor ke baare mein baat karni hai?"
    },
    {
      patterns: [/shukriya/i, /thank/i, /thanks/i, /great/i, /zabardast/i],
      answer: "Arre, chhodo! Always happy to help a fellow CISE student. Any other questions about your degree map?"
    }
  ];

  function answerPersona(query) {
    if (!query) return null;
    var q = query.trim();
    for (var i = 0; i < PERSONA_QA.length; i++) {
      var item = PERSONA_QA[i];
      for (var j = 0; j < item.patterns.length; j++) {
        if (item.patterns[j].test(q)) {
          return item.answer;
        }
      }
    }
    return null;
  }

  /* ── GUIDE & BACKSTORY DIALOG (Sign-in & Sign-out) ── */
  function showGuideModal(type, user) {
    var existing = document.querySelector('.abdul-guide-modal');
    if (existing) existing.remove();

    var name = (user && user.name) ? user.name.trim().split(/\s+/)[0] : 'Engineer';
    var isLogin = type === 'login';

    var modal = document.createElement('div');
    modal.className = 'abdul-guide-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');

    var title = isLogin ? 'Welcome, ' + name + '!' : 'See you soon!';
    var sub = isLogin ? 'Abdul Bari is ready to guide your semester' : 'Signed out safely';

    var storyText = isLogin
      ? "<b>Meet your guide:</b> I'm Abdul Bari, NED's resident senior — officially forever in my 7th semester! Rumor has it I handed back an entire envelope of foreign offers to stay here at CISE. I've watched every batch pass through, memorized every prerequisite chain, and know every professor's lab.<br><br><b>How to use EduCompass today:</b><br>1. <b>Prerequisites:</b> Check your critical path and test What-If failure simulations.<br>2. <b>Planner:</b> Assemble your semester load up to the 21 Credit Hour maximum.<br>3. <b>FYP & Faculty:</b> Match supervisors with your domain interests.<br>4. <b>Ask Me:</b> Ask anything about course loads, backlogs, or degree schemes."
      : "<b>Abdul Bari says:</b> Allah Hafiz! I'll still be right here near the CISE library whenever you return. Remember: you can still explore the Prerequisite DAG, reviewed FYPs, and career roadmaps without logging in. Whenever you want to save grades or shortlist supervisors, sign back in. Chai peete rehna!";

    var chips = isLogin
      ? [
          { label: 'Prerequisite Map', link: '#/prerequisites' },
          { label: 'Semester Planner', link: '#/planner' },
          { label: 'FYP Portal', link: '#/fyp' },
          { label: 'Ask Abdul', link: '#/assistant' }
        ]
      : [
          { label: 'Prerequisite Map', link: '#/prerequisites' },
          { label: 'Browse FYPs', link: '#/fyp' },
          { label: 'Career Hub', link: '#/careers' },
          { label: 'Sign In Again', link: '#/login' }
        ];

    modal.innerHTML =
      '<div class="abdul-guide-backdrop"></div>' +
      '<div class="abdul-guide-card">' +
        '<button class="abdul-guide-close" aria-label="Close guide">×</button>' +
        '<div class="abdul-guide-header">' +
          '<div class="abdul-avatar" data-abdul="full" style="width:72px;height:120px;flex:none"></div>' +
          '<div style="flex:1">' +
            '<span class="tag gold" style="font-size:11px;padding:2px 8px">Resident Senior · Semester 7</span>' +
            '<h2 style="margin:6px 0 2px;font-size:1.25rem">' + title + '</h2>' +
            '<p class="muted small" style="margin:0">' + sub + '</p>' +
          '</div>' +
        '</div>' +
        '<div class="abdul-guide-body">' +
          '<p style="font-size:0.875rem;line-height:1.55;color:var(--text);margin:0">' + storyText + '</p>' +
        '</div>' +
        '<div class="abdul-guide-footer">' +
          '<div class="abdul-chips">' +
            chips.map(function(c) {
              return '<a class="abdul-chip" style="text-decoration:none;font-weight:600" href="' + c.link + '">' + c.label + '</a>';
            }).join('') +
          '</div>' +
        '</div>' +
      '</div>';

    document.body.appendChild(modal);

    // Render avatar inside modal
    setState(isLogin ? 'happy' : 'idle');

    var closeModal = function () {
      if (modal && modal.parentNode) modal.parentNode.removeChild(modal);
      setState('idle');
    };

    modal.querySelector('.abdul-guide-close').onclick = closeModal;
    modal.querySelector('.abdul-guide-backdrop').onclick = closeModal;
    modal.querySelectorAll('.abdul-chip').forEach(function (btn) {
      btn.onclick = closeModal;
    });

    window.addEventListener('keydown', function onEsc(e) {
      if (e.key === 'Escape') {
        closeModal();
        window.removeEventListener('keydown', onEsc);
      }
    });
  }

  /* ── MOUNT FULL STANDING LAUNCHER (NO CIRCULAR COIN) ── */
  function mountLauncher() {
    if (document.querySelector('.abdul-launcher')) return;
    var btn = document.createElement('a');
    btn.className = 'abdul-launcher';
    btn.href = '#/assistant';
    btn.setAttribute('aria-label', 'Chat with Abdul Bari');
    btn.title = 'Chat with Abdul Bari — Resident Senior';

    // Full standing figure with crisp badge
    btn.innerHTML =
      '<div class="abdul-avatar" data-abdul="full" style="width:72px;height:120px;display:block"></div>' +
      '<span class="abdul-launcher-pill">Abdul Bari</span>';

    document.body.appendChild(btn);

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

  /* ── GLOBAL API EXPOSURE ── */
  window.Abdul = {
    setState: setState,
    resetState: resetState,
    onResponse: onResponse,
    onUserSend: function () { setState('thinking'); },
    answerPersona: answerPersona,
    onLogin: function (user) {
      resetState();
      showGuideModal('login', user);
    },
    onLogout: function () {
      resetState();
      showGuideModal('logout', null);
    },
    get state() { return current; }
  };

  document.addEventListener('DOMContentLoaded', function () {
    mountLauncher();
    paint('idle');
    // First-time visit auto guide
    var visited = false;
    try { visited = localStorage.getItem('abdul_visited') === '1'; } catch(e) {}
    if (!visited) {
      try { localStorage.setItem('abdul_visited', '1'); } catch(e) {}
      setTimeout(function () {
        var u = window.Session ? window.Session.user : null;
        showGuideModal('login', u);
      }, 800);
    }
  });
})();
