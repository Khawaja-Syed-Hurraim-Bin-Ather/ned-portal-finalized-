/* EduCompass frontend: hash-routed single page app. All data comes from /data/*.json, engines from engines.js */
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const store={get(k,d){try{return JSON.parse(localStorage.getItem('ec:'+k))??d}catch{return d}},set(k,v){localStorage.setItem('ec:'+k,JSON.stringify(v))},del(k){localStorage.removeItem('ec:'+k)}};
const ICONS={
 lock:'<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
 arrow:'<path d="M5 12h14M13 6l6 6-6 6"/>',search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
 star:'<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"/>',
 x:'<path d="m6 6 12 12M18 6 6 18"/>',menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',check:'<path d="m5 12 5 5 9-10"/>',
 shield:'<path d="M12 21s8-3.5 8-10V5l-8-3-8 3v6c0 6.5 8 10 8 10Z"/>',mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
 info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/>',cal:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',case:'<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M3 13h18"/>',user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',book:'<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5Z"/><path d="M19 19v2H6"/>',target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',up:'<path d="M12 19V5M6 11l6-6 6 6"/>',
 sun:'<circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>',
 moon:'<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
};
const ic=(n,c='')=>`<svg class="icon ${c}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n]||ICONS.info}</svg>`;
const toast=m=>{const t=document.createElement('div');t.className='toast';t.textContent=m;$('#toasts').append(t);setTimeout(()=>t.remove(),3200)};
const label=t=>({'ai-ml':'AI & ML','ar-vr':'AR / VR','nlp':'NLP','iot':'IoT','healthcare-tech':'Healthcare tech','computer-vision':'Computer vision','cybersecurity':'Cybersecurity','embedded':'Embedded','robotics':'Robotics','blockchain':'Blockchain','data':'Data','web':'Web','software-engineering':'Software engineering'}[t]||t.replace(/-/g,' ').replace(/^\w/,c=>c.toUpperCase()));
const hl=(text,q)=>{const s=esc(text);if(!q)return s;const re=new RegExp('('+q.trim().split(/\s+/).filter(Boolean).map(w=>w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|')+')','gi');return s.replace(re,'<mark>$1</mark>')};
const hero=o=>`<section class="thero ${o.tone||''}"><div class="thero-art" style="background-image:url(img/${o.art});--aw:${o.aw||'64%'}"></div><div class="wrap">${o.label?`<span class="pill">${ic(o.icon)} ${o.label}</span>`:''}<h1>${o.title}</h1><p class="sub">${o.sub}</p>${o.extra||''}</div></section>`;
const initials=n=>(n||'?').split(/\s+/).map(w=>w[0]).slice(0,2).join('').toUpperCase();

/* ---------- session (demo auth: browser-only until the real API is connected) ---------- */
const Session={
  get user(){return store.get('session',null)},
  async hash(p){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(p));return[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')},
  async register(d){const acc=store.get('accounts',{});const k=d.email.toLowerCase();if(acc[k])throw new Error('An account with this email already exists. Sign in instead.');acc[k]={...d,email:k,pw:await this.hash(d.password)};delete acc[k].password;store.set('accounts',acc);store.set('session',{...acc[k],pw:undefined})},
  async login(email,password){
    const k=email.toLowerCase();const lock=store.get('lock:'+k,{n:0,until:0});
    if(lock.until>Date.now())throw new Error(`Too many attempts. Try again in ${Math.ceil((lock.until-Date.now())/60000)} min.`);
    const a=store.get('accounts',{})[k];
    if(!a||a.pw!==await this.hash(password)){lock.n++;if(lock.n>=5){lock.until=Date.now()+15*60000;lock.n=0}store.set('lock:'+k,lock);throw new Error('Email or password is incorrect.')}
    store.del('lock:'+k);store.set('session',{...a,pw:undefined});
  },
  logout(){store.del('session')},
};
const PROGRAM_DEFAULT='BE Computer Systems Engineering';

/* ---------- router ---------- */
const NAV=[['/','Home',0],['/fyp','FYP Portal',0],['/professors','Professors',1],['/planner','Planner',1],['/prerequisites','Prerequisites',1],['/careers','Career Hub',0],['/assistant','Assistant',0]];
const routes={};let current='/';
function go(p){location.hash='#'+p}
async function render(){
  if(!Data.nodes)return;
  const path=(location.hash.slice(1)||'/').split('?')[0];current=path;
  const r=routes[path]||routes['/'];
  closeDrawer();
  document.body.classList.toggle('adm',!!(r.standalone||r.admin));
  if(r.standalone){document.body.classList.remove('dx');document.body.classList.add('th','thd');$('#app').innerHTML=r.view();document.title=(r.title?r.title+' | ':'')+'EduCompass';r.after?.();window.scrollTo(0,0);return}
  const dx=!!r.dark;document.body.classList.toggle('dx',dx);document.body.classList.toggle('th',!!r.theme);document.body.classList.toggle('thd',r.theme==='dark');
  const dark=(path==='/'&&!Session.user)||path==='/login'||dx;
  if(path==='/login'){$('#app').innerHTML=r.view();r.after?.();window.scrollTo(0,0);document.title='Sign in | EduCompass';return}
  $('#app').innerHTML=navHTML(dark)+`<main id="main">${r.view()}</main>`+(path==='/'?footHTML():`<div class="wrap">${discHTML()}</div><div style="height:40px"></div>`);
  document.title=(r.title?r.title+' | ':'')+'EduCompass';
  bindNav();r.after?.();window.scrollTo(0,0);
}
window.addEventListener('hashchange',render);

function navHTML(dark){
  const u=Session.user;
  const links=NAV.map(([p,t,lockd])=>`<a href="#${p}" ${current===p?'aria-current="page"':''}>${t}${lockd&&!u?ic('lock'):''}</a>`).join('');
  const curTheme=document.documentElement.dataset.theme||'light';
  const themeIcon=ic(curTheme==='dark'?'sun':'moon');
  return `<header class="nav ${dark?'dark':'light'}" id="nav"><div class="wrap">
   <a class="brand" href="#/" aria-label="EduCompass home"><img src="img/ned-logo.png" alt="NED University seal" width="38" height="38"><span><b>Edu<span>Compass</span></b><small>NED · Dept. of CISE</small></span></a>
   <nav class="nav-links" aria-label="Main">${links}</nav>
   <div class="nav-end"><button class="theme-btn" id="theme-btn" aria-label="Toggle colour theme" title="Toggle theme">${themeIcon}</button>${window.AdminNav?AdminNav.menu():''}${u?`<span class="small" style="font-weight:600">${esc(u.name.split(' ')[0])}</span><button class="avatar" id="acct" aria-label="Account menu">${esc(initials(u.name))}</button>`:`<a class="btn btn-sm btn-line" href="#/login">Sign in</a><a class="btn btn-sm btn-primary" href="#/login?register">Create account</a>`}</div>
   <button class="menu-btn" id="menu" aria-label="Open menu" aria-expanded="false">${ic('menu')}</button></div></header>
   <nav class="mnav" id="mnav" aria-label="Mobile">${NAV.map(([p,t,l])=>`<a href="#${p}" ${current===p?'aria-current="page"':''}>${t}${l&&!u?ic('lock'):''}</a>`).join('')}<button class="theme-btn" id="mtheme-btn" aria-label="Toggle theme" style="margin:10px 0;width:auto;display:inline-flex;align-items:center;gap:8px;padding:8px 14px;border-radius:999px">${themeIcon} <span id="mtheme-text">${curTheme==='dark'?'Light mode':'Dark mode'}</span></button><a href="#/admin" ${current==='/admin'?'aria-current="page"':''}>Admin console</a>${u?'<a href="#" id="out">Sign out</a>':'<a href="#/login">Sign in or register</a>'}</nav>`;
}
function bindNav(){
  const nav=$('#nav');const dark=nav.classList.contains('dark');
  const onScroll=()=>nav.classList.toggle('solid',scrollY>40);onScroll();window.onscroll=onScroll;
  $('#menu').onclick=()=>{const m=$('#mnav');const o=m.classList.toggle('open');$('#menu').setAttribute('aria-expanded',o)};
  $$('#mnav a').forEach(a=>a.addEventListener('click',()=>$('#mnav').classList.remove('open')));
  const updateThemeUI=()=>{
    const isDark=document.documentElement.dataset.theme==='dark';
    const tb=$('#theme-btn'), mtb=$('#mtheme-btn'), mtt=$('#mtheme-text');
    if(tb) tb.innerHTML=ic(isDark?'sun':'moon');
    if(mtb){const iconSpan=mtb.querySelector('svg');if(iconSpan)iconSpan.outerHTML=ic(isDark?'sun':'moon')};
    if(mtt) mtt.textContent=isDark?'Light mode':'Dark mode';
  };
  $('#theme-btn')?.addEventListener('click',()=>{if(window.toggleTheme)window.toggleTheme();updateThemeUI()});
  $('#mtheme-btn')?.addEventListener('click',()=>{if(window.toggleTheme)window.toggleTheme();updateThemeUI()});
  window.addEventListener('themechange',updateThemeUI);
  const ab=$('#admbtn'),am=$('#admmenu');
  if(ab){const closeA=()=>{am.hidden=true;ab.setAttribute('aria-expanded','false')};
    ab.onclick=e=>{e.stopPropagation();const o=am.hidden;am.hidden=!o;ab.setAttribute('aria-expanded',o)};
    document.onclick=e=>{if(!e.target.closest('.dd'))closeA()};
    am.onclick=e=>{const b=e.target.closest('[data-admtab],[data-admact]');if(!b)return;closeA();if('admtab' in b.dataset)AdminNav.pick(b.dataset.admtab);else AdminNav.act(b.dataset.admact)};
    nav.onkeydown=e=>{if(e.key==='Escape')closeA()}}
  const out=()=>{Session.logout();toast('Signed out');if(window.Abdul)Abdul.onLogout();go('/');render()};
  $('#out')?.addEventListener('click',e=>{e.preventDefault();out()});
  $('#acct')?.addEventListener('click',()=>{const u=Session.user;openDrawer(`<div class="drawer-top"><span class="tag maroon">Your profile</span><button class="x" data-close aria-label="Close">${ic('x')}</button></div><h2>${esc(u.name)}</h2><dl class="kv"><dt>Email</dt><dd>${esc(u.email)}</dd><dt>Program</dt><dd>${esc(u.program||PROGRAM_DEFAULT)}</dd><dt>Semester</dt><dd>${esc(u.semester)}</dd><dt>Interests</dt><dd>${(u.interests||[]).map(i=>`<span class="tag">${label(i)}</span>`).join(' ')||'None selected'}</dd></dl><p class="small muted">To delete your account and stored data, contact an administrator (SRS SEC-07).</p><div style="display:flex;gap:10px;margin-top:20px"><button class="btn btn-ink" id="so">Sign out</button></div>`);$('#so').onclick=out});
}
function discHTML(){return `<div class="disc">${ic('shield')}<span>Guidance estimates, not official university decisions. Data comes from NED CISE public records and may be out of date.</span><a href="#" data-terms>Terms and disclaimer</a></div>`}
document.addEventListener('click',e=>{const t=e.target.closest('[data-terms]');if(t){e.preventDefault();openDrawer(`<div class="drawer-top"><span class="tag gold">Terms and disclaimer</span><button class="x" data-close aria-label="Close">${ic('x')}</button></div><h2>What EduCompass is, and is not</h2><p style="margin:12px 0">EduCompass is an educational guidance tool for NED CISE students. It is not an official university system, and nothing it shows is an official decision.</p><p class="muted" style="margin-bottom:12px">Importance scores, match scores, GPA targets and semester delays are estimates. Prerequisite links are still being verified against the Scheme of Studies, and dashed lines mark links that are not yet confirmed.</p><p class="muted">Data is extracted offline from public NED records, reviewed, and shown with its source. Student names and roll numbers are removed at extraction.</p>`)}if(e.target.closest('[data-close]')||e.target.classList.contains('scrim'))closeDrawer()});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeDrawer()});
function openDrawer(html){$('#drawer-root').innerHTML=`<div class="scrim"></div><aside class="drawer" role="dialog" aria-modal="true">${html}</aside>`;$('.drawer .x')?.focus()}
function closeDrawer(){$('#drawer-root').innerHTML=''}
function gate(title,text){return `<div class="page"><div class="wrap"><div class="gate"><span class="tag maroon">Students only</span><h1 style="margin-top:14px">${title}</h1><p>${text}</p><div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap"><a class="btn btn-primary" href="#/login?register">Create free account</a><a class="btn btn-line" href="#/login">Sign in</a></div></div></div></div>`}

/* ---------- LANDING / HOME ---------- */
function footHTML(){return `<footer class="foot" style="--bg:url(img/cis-night.webp)"><div class="wrap"><div class="foot-grid"><div><div class="brand"><img src="img/ned-logo.png" alt="" width="44" height="44"><span><b>EduCompass</b><small>Academic and career guidance</small></span></div><p style="margin-top:14px;max-width:40ch;color:rgba(255,255,255,.75);font-size:14px">Built by CISE students for CISE students at NED University of Engineering &amp; Technology, Karachi.</p></div><div><h4>Explore</h4><a href="#/fyp">FYP Portal</a><a href="#/careers">Career Hub</a><a href="#/assistant">Assistant</a></div><div><h4>For students</h4><a href="#/planner">Planner</a><a href="#/prerequisites">Prerequisites</a><a href="#/professors">Professors</a></div></div><div class="foot-note"><span>Guidance estimates, not official university decisions. <a href="#" data-terms>Terms and disclaimer</a></span><span>CS-326 Software Engineering · Course instructor Dr. Fakhra Aftab · 2026 · <a href="#/admin">Admin sign-in</a></span></div></div></footer>`}
routes['/']={title:'',view(){
  const u=Session.user;if(u)return homeApp(u);
  const chain=['CS-115','CS-218','CS-433'].map(c=>Data.C[c]);
  return `<section class="hero"><img class="hero-img" src="img/cis-day.webp" alt="Computer and Information Systems Engineering building at NED" fetchpriority="high">
   <div class="wrap"><div><h1>See your whole degree before the next step.</h1><p class="lead">Course planning, prerequisites, past final year projects, supervisors and career paths for NED CISE students, in one place built from real department records.</p><div class="actions"><a class="btn btn-primary" href="#/login?register">Create free account</a><a class="btn btn-glass" href="#/fyp">Browse past FYPs</a></div></div>
   <button class="chipchain glass" id="chainchip" aria-label="See how a failed course changes your plan: ${chain.map(c=>c.title).join(', ')}"><i class="dot"></i><span>${chain.map(c=>c.code).join(' → ')}</span><em>See how</em></button></div></section>
  <div class="facts"><div class="wrap"><div class="fact"><b class="num">${Data.courses.length}</b><span>courses in the CSE dependency chart</span></div><div class="fact"><b class="num">${Data.profs.length}</b><span>CISE faculty research profiles</span></div><div class="fact"><b class="num">${Data.fyps.length}</b><span>reviewed final year projects</span></div><div class="fact"><b class="num">${Data.tracks.length}</b><span>career tracks mapped to courses</span></div></div></div>
  <section class="block"><div class="wrap"><div class="sec-head"><h2>Five questions every CISE student asks</h2><p>Instead of searching PDFs, notice boards and old group chats, ask the question here and see where the answer came from.</p></div>
   <div class="bento">
    <a class="tile t-a" href="#/prerequisites"><span class="lock">${Session.user?'':ic('lock')}</span><h3>What does a failed course block?</h3><p>An interactive map of the curriculum by semester. Pick a course to light up what it needs and what it unlocks, then simulate failing it.</p><div class="mini-grid" aria-hidden="true"><i>CS-114</i><i class="on">CS-115</i><i class="hot">CS-116</i><i>EE-120</i><i>MT-114</i><i class="on">CS-218</i><i class="hot">CS-323</i><i>CS-221</i></div><span class="go">Open the prerequisite map ${ic('arrow')}</span></a>
    <a class="tile t-b" href="#/planner"><span class="lock">${Session.user?'':ic('lock')}</span><h3>Where do I stand?</h3><p>Enter grades once. Get your GPA, CGPA with the retake rule, backlogs and a suggested next semester.</p><div class="mini"><span class="tag">GPA</span><span class="tag">CGPA</span><span class="tag">Backlogs</span><span class="tag">CSV import</span></div><span class="go">Open the planner ${ic('arrow')}</span></a>
    <a class="tile t-c" href="#/fyp"><h3>Which project is worth doing?</h3><p>Search ${Data.fyps.length} reviewed NED CISE projects by topic, supervisor and year, and see similar ideas.</p><span class="go">Search FYPs ${ic('arrow')}</span></a>
    <a class="tile t-d" href="#/professors"><span class="lock">${Session.user?'':ic('lock')}</span><h3>Who should supervise me?</h3><p>Match your interests to ${Data.profs.length} faculty research profiles and draft a polite first email.</p><span class="go">Find a supervisor ${ic('arrow')}</span></a>
    <a class="tile t-e" href="#/careers"><h3>What should I learn next?</h3><p>${Data.tracks.length} career tracks, each tied to the NED courses that support it.</p><span class="go">Explore tracks ${ic('arrow')}</span></a>
   </div></div></section>
  <section class="block" style="padding-top:0"><div class="wrap"><div class="demo"><div class="demo-copy"><h2>Try it: fail a course</h2><p class="muted" style="margin-bottom:22px">Choose a course and see how far the engine pushes the courses that depend on it. This runs the same graph code as the Prerequisites page.</p><label class="label" for="demo-sel">Course you fail</label><select class="select" id="demo-sel">${['CS-115','CS-218','CS-221','CS-327','CS-117','HSK-1'].map(c=>`<option value="${c}">${c} · ${esc(Data.C[c].title)}</option>`).join('')}</select><p class="hint" style="margin-top:10px">Assumes the retake runs in the same term next year. Estimate only.</p></div><div class="demo-out" id="demo-out"></div></div></div></section>
  <section class="block" style="padding-top:0"><div class="wrap about"><figure><img src="img/cis-sign.webp" alt="Computer and Information Systems Engineering Department signage" loading="lazy"></figure><div><h2 style="font-size:clamp(30px,3.6vw,46px);margin-bottom:18px">Made for the department it describes</h2><p class="muted" style="font-size:17px;margin-bottom:14px">EduCompass works from the CISE curriculum chart, faculty research profiles and past FYP lists. Student names and roll numbers are removed before anything is stored.</p><p class="muted" style="font-size:17px;margin-bottom:26px">Every score is labelled as an estimate, and every record shows where it came from.</p><a class="btn btn-ink" href="#" data-terms>Read how data is handled</a></div></div></section>`;
},after(){
  if(!$('#demo-sel'))return;
  $('#chainchip')?.addEventListener('click',()=>$('#demo-sel').scrollIntoView({behavior:'smooth',block:'center'}));
  const out=()=>{const c=$('#demo-sel').value;const r=Graph.simulateFail(c);$('#demo-out').innerHTML=r.pushed.length?`<span class="label">If you fail ${c}</span><div class="big-delay num">${r.delay?`+${r.delay} term${r.delay>1?'s':''}`:'No delay'}</div><p class="muted small">${r.delay?'Estimated delay to graduation':'Everything still fits in 8 semesters'}</p><div class="rows">${r.pushed.map(p=>`<div class="row" style="grid-template-columns:1fr auto"><span><b>${p.code}</b> ${esc(Data.C[p.code].title)}</span><span class="tag bad">semester ${Data.C[p.code].semester} → ${p.to}</span></div>`).join('')}</div>`:`<span class="label">If you fail ${c}</span><div class="big-delay num">0</div><p class="muted small">No later course is linked to it in the verified chart yet, so only the retake itself is affected (semester ${r.retake}).</p>`};
  $('#demo-sel').onchange=out;out();
}};

function homeApp(u){
  const sum=academicSummary();
  const next=sum.next;
  return `<div class="page"><div class="wrap">
   <div class="page-head"><div><span class="tag gold">${esc(u.program||PROGRAM_DEFAULT)} · Semester ${esc(u.semester)}</span><h1 style="margin-top:12px">Welcome back, ${esc(u.name.split(' ')[0])}.</h1><p>${sum.graded?`You have entered ${sum.graded} course grade${sum.graded>1?'s':''}. Here is where things stand.`:'Start by entering your grades in the planner. Everything else on this page updates from that.'}</p></div><a class="btn btn-primary" href="#/planner">${sum.graded?'Update planner':'Enter your grades'}</a></div>
   <div class="grid-3" style="grid-template-columns:repeat(4,minmax(0,1fr))" id="homestats"><div class="stat"><small>CGPA</small><b class="num">${sum.graded?sum.cg.cgpa.toFixed(2):'–'}</b><div class="bar"><i style="width:${sum.cg.cgpa*25}%"></i></div></div><div class="stat"><small>Credits earned</small><b class="num">${sum.earned}<span class="muted" style="font-size:18px"> / ${sum.total}</span></b><div class="bar"><i style="width:${Math.min(100,sum.earned/sum.total*100)}%"></i></div></div><div class="stat"><small>Backlogs</small><b class="num">${sum.backlogs.length}</b><small>${sum.backlogs.length?`blocking ${sum.blocked} course${sum.blocked===1?'':'s'}`:'none recorded'}</small></div><div class="stat"><small>Shortlisted FYPs</small><b class="num">${store.get('shortlist',[]).length}</b></div></div>
   <div class="grid-2" style="margin-top:18px"><div class="panel"><div class="panel-h"><h2>Suggested next semester</h2><span class="tag gold">Estimate</span></div>${next.length?`<div class="rows">${next.slice(0,6).map(c=>`<div class="row" style="grid-template-columns:70px 1fr auto"><b>${c.code}</b><span>${esc(c.title)}</span><span class="tag ${c.backlog?'bad':''}">${c.backlog?'Backlog':c.credits+' CH'}</span></div>`).join('')}</div><a class="btn btn-line btn-sm" style="margin-top:14px" href="#/planner">See full plan</a>`:'<div class="empty"><h3>Nothing to suggest yet</h3><p>Enter completed courses and grades and the planner will propose a load.</p></div>'}</div>
   <div class="stack"><a class="panel" href="#/prerequisites"><h3 style="font-size:20px">Prerequisite map</h3><p class="muted small" style="margin-top:6px">See what each course unlocks, and what failing one would cost.</p></a><a class="panel" href="#/professors"><h3 style="font-size:20px">Find a supervisor</h3><p class="muted small" style="margin-top:6px">${(u.interests||[]).length?`Matching on: ${u.interests.map(label).join(', ')}`:'Pick interests to see match scores.'}</p></a><a class="panel" href="#/assistant"><h3 style="font-size:20px">Ask the assistant</h3><p class="muted small" style="margin-top:6px">Get a personal plan card in six quick taps.</p></a></div></div></div></div>`;
}

/* ---------- ACADEMIC SUMMARY (shared by home, planner, assistant) ---------- */
const allTags=()=>[...new Set([...Data.profs.flatMap(p=>p.domain_tags),...Data.fyps.flatMap(p=>p.domain_tags)])].sort();
function attemptsFromGrades(){
  const g=store.get('grades',{});const out=[];
  Object.entries(g).forEach(([code,v])=>{const c=Data.C[code];if(!c)return;
    if(v.g1)out.push({code,credits:c.credits,grade:v.g1,sem:c.semester});
    if(v.g2)out.push({code,credits:c.credits,grade:v.g2,sem:c.semester+2});});
  return out;
}
function latestGrade(code){const v=store.get('grades',{})[code];return v?(v.g2||v.g1||null):null}
function totalCredits(){return Data.courses.filter(c=>!c.elective_group).reduce((s,c)=>s+c.credits,0)+Data.groups.reduce((s,g)=>s+g.credits,0)}
function academicSummary(){
  const at=attemptsFromGrades();const cg=GPA.cgpa(at);
  const codes=Object.keys(store.get('grades',{}));
  const passed=new Set(codes.filter(c=>{const g=latestGrade(c);return g&&GRADES[g]>=PASS_MIN}));
  const backlogs=codes.filter(c=>latestGrade(c)==='F');
  const blockedSet=new Set();backlogs.forEach(b=>Graph.downstream(b).forEach(d=>blockedSet.add(d)));
  const earned=[...passed].reduce((a,c)=>a+(Data.C[c]?.credits||0),0);
  return{earned,at,cg,graded:codes.filter(c=>latestGrade(c)).length,passed,backlogs,blocked:blockedSet.size,blockedSet,total:totalCredits(),next:recommend(passed,backlogs)};
}
function recommend(passed,backlogs){
  const u=Session.user;if(!u)return[];
  const max=store.get('maxcr',DEFAULT_MAX_CREDITS);
  const nextSem=Math.min(8,(+u.semester||1)+1);const term=nextSem%2?'fall':'spring';
  let cand=[];
  backlogs.filter(b=>Data.C[b].term===term).forEach(b=>cand.push({...Data.C[b],backlog:true}));
  Data.nodes.filter(n=>n.semester===nextSem&&!n.elective_group&&!passed.has(n.code)&&!backlogs.includes(n.code)).forEach(n=>cand.push(n));
  let used=0;
  return cand.map(c=>{const e=Graph.adj[c.code]?Graph.eligibility(c.code,passed):{eligible:true,missing:[]};const fits=used+c.credits<=max;const pick=e.eligible&&fits;if(pick)used+=c.credits;return{...c,ok:pick,missing:e.missing,over:e.eligible&&!fits}}).filter(c=>c.ok);
}

/* ---------- AUTH ---------- */
routes['/login']={view(){
  const reg=location.hash.includes('register');
  return `<div class="auth"><div class="auth-art"><img class="bg" src="img/cis-night.webp" alt=""><a class="brand" href="#/"><img src="img/ned-logo.png" alt="" width="40" height="40"><span><b>EduCompass</b><small>NED · Dept. of CISE</small></span></a><h2>Your degree, with the whole map in view.</h2><p>Sign in to plan semesters, see prerequisite chains and find a supervisor.</p></div>
  <div class="auth-form"><div class="auth-card"><a href="#/" class="small muted">← Back to home</a><h1 style="margin-top:18px" id="atitle">${reg?'Create your account':'Welcome back'}</h1><p class="muted" id="asub">${reg?'It takes under a minute. No university ID needed.':'Sign in with your email and password.'}</p>
  <div class="tabs" role="tablist"><button role="tab" aria-selected="${!reg}" data-t="in">Sign in</button><button role="tab" aria-selected="${reg}" data-t="up">Create account</button></div>
  <form id="authf" novalidate>
   <div class="field" id="f-name" ${reg?'':'hidden'}><label for="name">Full name</label><input class="input" id="name" autocomplete="name"></div>
   <div class="field"><label for="email">Email</label><input class="input" id="email" type="email" autocomplete="email" required></div>
   <div class="field"><label for="pw">Password</label><div class="pw"><input class="input" id="pw" type="password" autocomplete="${reg?'new-password':'current-password'}" required><button type="button" id="showpw">Show</button></div><span class="hint" id="pwh" ${reg?'':'hidden'}>At least 8 characters.</span></div>
   <div id="f-reg" ${reg?'':'hidden'}><div class="field"><label for="sem">Current semester</label><select class="select" id="sem">${[1,2,3,4,5,6,7,8].map(s=>`<option ${s===3?'selected':''}>${s}</option>`).join('')}</select></div>
   <div class="field"><span class="label">Interests (pick up to 3)</span><div class="chips" id="ints">${allTags().map(t=>`<button type="button" class="chip" aria-pressed="false" data-i="${t}">${label(t)}</button>`).join('')}</div></div></div>
   <p class="err" id="aerr" role="alert"></p>
   <button class="btn btn-primary" style="width:100%" id="asub-btn">${reg?'Create account':'Sign in'}</button>
  </form>
  <div class="divider">or</div><button class="btn btn-line" style="width:100%" disabled title="Google sign-in arrives with the backend">Continue with Google (needs backend)</button>
  <div class="notice info" style="margin-top:20px">${ic('info')}<span><b>Demo mode.</b> Accounts are stored only in this browser until the live API is connected.</span></div></div></div></div>`;
},after(){
  let mode=location.hash.includes('register')?'up':'in';const sel=new Set();
  const setMode=m=>{mode=m;const up=m==='up';$$('.tabs button').forEach(b=>b.setAttribute('aria-selected',b.dataset.t===m));$('#f-name').hidden=!up;$('#f-reg').hidden=!up;$('#pwh').hidden=!up;$('#atitle').textContent=up?'Create your account':'Welcome back';$('#asub').textContent=up?'It takes under a minute. No university ID needed.':'Sign in with your email and password.';$('#asub-btn').textContent=up?'Create account':'Sign in';$('#aerr').textContent=''};
  $$('.tabs button').forEach(b=>b.onclick=()=>setMode(b.dataset.t));
  $('#showpw').onclick=e=>{const p=$('#pw');p.type=p.type==='password'?'text':'password';e.target.textContent=p.type==='password'?'Show':'Hide'};
  $$('#ints .chip').forEach(c=>c.onclick=()=>{const t=c.dataset.i;if(sel.has(t)){sel.delete(t)}else if(sel.size<3){sel.add(t)}else return;c.setAttribute('aria-pressed',sel.has(t))});
  $('#authf').onsubmit=async e=>{e.preventDefault();const err=$('#aerr');err.textContent='';
    const email=$('#email').value.trim(),pw=$('#pw').value,name=$('#name').value.trim();
    if(!/^\S+@\S+\.\S+$/.test(email)){err.textContent='Enter a valid email address.';return $('#email').focus()}
    if(mode==='up'&&!name){err.textContent='Enter your name.';return $('#name').focus()}
    if(mode==='up'&&pw.length<8){err.textContent='Use at least 8 characters for your password.';return $('#pw').focus()}
    if(!pw){err.textContent='Enter your password.';return}
    try{if(mode==='up')await Session.register({name,email,password:pw,program:PROGRAM_DEFAULT,semester:$('#sem').value,interests:[...sel]});else await Session.login(email,pw);toast(mode==='up'?'Account created':'Signed in');if(window.Abdul)Abdul.onLogin(Session.user);go('/')}catch(x){err.textContent=x.message}};
}};

/* ---------- FYP PORTAL ---------- */
const fyp={q:'',tags:new Set(),sup:'',sort:'year'};
routes['/fyp']={title:'FYP Portal',theme:true,view(){
  const sups=[...new Set(Data.fyps.map(p=>p.supervisor))].sort();
  return `${hero({art:'art-fyp.webp',aw:'66%',icon:'search',label:'',title:'FYP Portal',sub:'Search reviewed final year projects from NED CISE. Student names are removed; supervisors and topics stay.',extra:`<div class="notice info thnote">${ic('info')}<span>This view holds <b>${Data.fyps.length}</b> reviewed records from <b>${[...new Set(Data.fyps.map(p=>p.year))].join(', ')}</b>. More years are added after admin review.</span></div>`})}<div class="wrap tbody">
  <div class="toolbar"><div class="search">${ic('search')}<input class="input" id="fq" type="search" placeholder="Search titles or supervisors" aria-label="Search projects" value="${esc(fyp.q)}"></div><select class="select" style="width:auto;min-width:200px" id="fsup" aria-label="Supervisor"><option value="">All supervisors</option>${sups.map(s=>`<option ${s===fyp.sup?'selected':''}>${esc(s)}</option>`).join('')}</select><select class="select" style="width:auto" id="fsort" aria-label="Sort"><option value="year">Newest first</option><option value="title">Title A to Z</option></select></div>
  <div class="chips" id="ftags" style="margin-bottom:22px">${[...new Set(Data.fyps.flatMap(p=>p.domain_tags))].sort().map(t=>`<button class="chip" aria-pressed="${fyp.tags.has(t)}" data-t="${t}">${label(t)}</button>`).join('')}</div>
  <div class="grid-2"><div class="panel" id="flist"></div><aside class="stack side-sticky"><div class="panel"><div class="panel-h"><h3>Topics in this archive</h3></div><div id="fan"></div></div><div class="panel"><h3 style="font-size:20px;margin-bottom:8px">Shortlist</h3><div id="fshort" class="small muted"></div></div></aside></div></div>`;
},after(){
  const u=Session.user;
  const draw=()=>{
    const q=fyp.q.toLowerCase();
    let L=Data.fyps.filter(p=>(!q||p.title.toLowerCase().includes(q)||p.supervisor.toLowerCase().includes(q))&&(!fyp.sup||p.supervisor===fyp.sup)&&[...fyp.tags].every(t=>p.domain_tags.includes(t)));
    L.sort((a,b)=>fyp.sort==='title'?a.title.localeCompare(b.title):b.year-a.year||a.title.localeCompare(b.title));
    const sl=store.get('shortlist',[]);
    $('#flist').innerHTML=L.length?`<p class="small muted" style="margin-bottom:6px">${L.length} project${L.length>1?'s':''}</p>`+L.map(p=>`<div class="item" data-id="${p.id}" tabindex="0" role="button"><div><h3>${hl(p.title,fyp.q)}</h3><div class="meta"><span>${hl(p.supervisor,fyp.q)}</span><span class="num">${p.year}</span>${p.domain_tags.map(t=>`<span class="tag">${label(t)}</span>`).join('')}</div></div><button class="star" data-star="${p.id}" aria-pressed="${sl.includes(p.id)}" aria-label="${sl.includes(p.id)?'Remove from':'Add to'} shortlist">${ic('star')}</button></div>`).join(''):`<div class="empty"><h3>No projects match</h3><p>Try a shorter search or clear a topic filter.</p><button class="btn btn-line btn-sm" id="fclear" style="margin-top:14px">Clear filters</button></div>`;
    const cnt={};Data.fyps.forEach(p=>(p.domain_tags.length?p.domain_tags:['untagged']).forEach(t=>cnt[t]=(cnt[t]||0)+1));
    const mx=Math.max(...Object.values(cnt));
    $('#fan').innerHTML=Object.entries(cnt).sort((a,b)=>b[1]-a[1]).map(([t,n])=>`<div class="hbar ${fyp.tags.has(t)?'on':''}"><span>${label(t)}</span><span><i style="width:${n/mx*100}%"></i></span><b class="num">${n}</b></div>`).join('');
    $('#fshort').innerHTML=u?(sl.length?sl.map(i=>Data.fyps.find(x=>x.id===i)).filter(Boolean).map(f=>`<div style="padding:6px 0;border-top:1px solid var(--line);color:var(--text)">${esc(f.title)}</div>`).join(''):'Tap the star on a project to save it.'):'Sign in to save projects to a shortlist.';
    $('#fclear')?.addEventListener('click',()=>{fyp.q='';fyp.tags.clear();fyp.sup='';$('#fq').value='';$('#fsup').value='';$$('#ftags .chip').forEach(c=>c.setAttribute('aria-pressed','false'));draw()});
  };
  $('#fq').oninput=e=>{fyp.q=e.target.value;draw()};
  $('#fsup').onchange=e=>{fyp.sup=e.target.value;draw()};
  $('#fsort').onchange=e=>{fyp.sort=e.target.value;draw()};
  $$('#ftags .chip').forEach(c=>c.onclick=()=>{const t=c.dataset.t;fyp.tags.has(t)?fyp.tags.delete(t):fyp.tags.add(t);c.setAttribute('aria-pressed',fyp.tags.has(t));draw()});
  const open=id=>{const p=Data.fyps.find(x=>x.id===id);if(!p)return;const sim=Data.fyps.filter(o=>o.id!==id&&o.domain_tags.some(t=>p.domain_tags.includes(t))).slice(0,4);
    openDrawer(`<div class="drawer-top"><span class="tag maroon">Final year project · ${p.year}</span><button class="x" data-close aria-label="Close">${ic('x')}</button></div><h2>${hl(p.title,fyp.q)}</h2><dl class="kv"><dt>Supervisor</dt><dd>${esc(p.supervisor)}</dd><dt>Department</dt><dd>${esc(p.department)}</dd><dt>University</dt><dd>${esc(p.university)}</dd><dt>Outcome</dt><dd><span class="tag ok">${esc(p.outcome)}</span></dd><dt>Topics</dt><dd>${p.domain_tags.map(t=>`<span class="tag">${label(t)}</span>`).join(' ')||'<span class="muted">Not yet tagged</span>'}</dd></dl>${sim.length?`<h3 style="font-size:20px;margin:22px 0 6px">Similar projects</h3>${sim.map(s=>`<div class="item" data-id="${s.id}" style="padding:12px 4px"><div><b style="font-weight:600;font-size:14.5px">${esc(s.title)}</b><div class="meta"><span>${esc(s.supervisor)}</span></div></div></div>`).join('')}`:'<p class="muted small" style="margin-top:20px">No similar projects yet. This one has no shared topic tags.</p>'}<p class="xs muted" style="margin-top:22px">Source: NED CISE final year project list ${p.year}. Names removed at extraction.</p>`);
    $$('.drawer .item').forEach(i=>i.onclick=()=>open(+i.dataset.id))};
  $('#flist').addEventListener('click',e=>{const s=e.target.closest('[data-star]');
    if(s){e.stopPropagation();if(!u){toast('Sign in to save projects');return go('/login')}let sl=store.get('shortlist',[]);const id=+s.dataset.star;sl=sl.includes(id)?sl.filter(x=>x!==id):[...sl,id];store.set('shortlist',sl);draw();return}
    const it=e.target.closest('.item');if(it)open(+it.dataset.id)});
  $('#flist').addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.classList.contains('item'))open(+e.target.dataset.id)});
  draw();
}};

/* ---------- PROFESSORS ---------- */
const prof={q:'',tags:new Set(),useMine:true};
const ptags=p=>[...new Set([...p.domain_tags,...p.area_tags])];
routes['/professors']={title:'Professors',theme:'dark',view(){
  if(!Session.user)return gate('Meet your potential supervisors','Professor profiles and match scores are available to registered students. Creating an account takes under a minute.');
  const mine=Session.user.interests||[];if(prof.useMine&&!prof.tags.size)mine.forEach(t=>prof.tags.add(t));
  return `${hero({art:'art-professors.webp',aw:'56%',icon:'user',label:'Find the right mentor',title:'Profess<span>ors</span>',sub:"Pick the topics you care about. Profiles are ranked by how many of them match each professor's research areas."})}<div class="wrap tbody">
  <div class="toolbar"><div class="search">${ic('search')}<input class="input" id="pq" type="search" placeholder="Search by name or research area" aria-label="Search professors" value="${esc(prof.q)}"></div></div>
  <div class="chips" id="ptg" style="margin-bottom:22px">${allTags().map(t=>`<button class="chip" data-t="${t}" aria-pressed="${prof.tags.has(t)}">${label(t)}</button>`).join('')}</div>
  <div class="panel" id="plist"></div></div>`;
},after(){
  if(!Session.user)return;
  const score=p=>{const s=[...prof.tags];if(!s.length)return null;const t=ptags(p);const hit=s.filter(x=>t.includes(x));return{pct:Math.round(hit.length/s.length*100),hit}};
  const draw=()=>{const q=prof.q.toLowerCase();
    let L=Data.profs.filter(p=>!q||(p.name+' '+p.research_areas).toLowerCase().includes(q)).map(p=>({p,s:score(p)}));
    L.sort((a,b)=>(b.s?.pct||0)-(a.s?.pct||0)||a.p.name.localeCompare(b.p.name));
    $('#plist').innerHTML=L.length?L.map(({p,s})=>`<div class="pitem" data-slug="${p.slug}" tabindex="0" role="button"><span class="pavatar">${ic('user')}</span><div><h3>${hl(p.name,prof.q)}</h3><div class="meta"><span>${esc(p.rank||'Faculty')}, CISE</span></div><p class="small muted" style="margin-top:8px;max-width:70ch">${hl(p.research_areas,prof.q)}</p><div class="meta" style="margin-top:10px">${ptags(p).map(t=>`<span class="tag ${s?.hit.includes(t)?'maroon':''}">${label(t)}</span>`).join('')}</div></div>${s?`<div class="pscore"><b class="num">${s.pct}%</b><span>match estimate</span></div>`:''}</div>`).join(''):'<div class="empty"><h3>No professors found</h3><p>Try another search term.</p></div>';};
  $('#pq').oninput=e=>{prof.q=e.target.value;draw()};
  $$('#ptg .chip').forEach(c=>c.onclick=()=>{const t=c.dataset.t;prof.tags.has(t)?prof.tags.delete(t):prof.tags.add(t);c.setAttribute('aria-pressed',prof.tags.has(t));draw()});
  const open=slug=>{const p=Data.profs.find(x=>x.slug===slug);const s=score(p);
    const draft=()=>`Subject: Request for FYP supervision\n\nDear ${p.name},\n\nI am ${esc2(Session.user.name)}, a semester ${esc2(Session.user.semester)} student in the ${PROGRAM_DEFAULT} program. I am interested in ${[...prof.tags].map(label).join(', ')||'your research area'} and would like to discuss a final year project under your supervision.\n\nMy idea: [describe your project idea in two lines]\nRelevant skills: [list your skills]\n\nMay I meet you during your office hours?\n\nRegards,\n${esc2(Session.user.name)}`;
    openDrawer(`<div class="drawer-top"><span class="tag maroon">${esc(p.rank||'Faculty')}</span><button class="x" data-close aria-label="Close">${ic('x')}</button></div><h2>${esc(p.name)}</h2>${s?`<p class="small"><b class="num">${s.pct}%</b> match estimate on ${s.hit.map(label).join(', ')||'no selected topics'}.</p>`:''}<dl class="kv"><dt>Research</dt><dd>${esc(p.research_areas)}</dd><dt>Qualification</dt><dd>${esc(p.qualification)}</dd>${p.highlights?`<dt>Highlights</dt><dd>${esc(p.highlights)}</dd>`:''}${p.selected_publications?.length?`<dt>Publications</dt><dd>${p.selected_publications.map(esc).join('<br>')}</dd>`:''}<dt>Status</dt><dd>${p.is_simulated?'<span class="tag warn">Sample data</span>':'<span class="tag ok">Real profile</span>'} <span class="tag">${esc(p.review_status)}, awaiting admin approval</span></dd></dl>
    <h3 style="font-size:22px;margin:22px 0 8px">Email draft</h3><p class="hint" style="margin-bottom:8px">Edit freely. EduCompass never sends email for you.</p><textarea class="input" id="draft" style="min-height:260px">${esc(draft())}</textarea><div style="display:flex;gap:10px;margin-top:12px;flex-wrap:wrap"><button class="btn btn-primary" id="mailto">${ic('mail')} Open in email app</button><button class="btn btn-line" id="copy">Copy text</button></div><p class="xs muted" style="margin-top:12px">${p.contact_route?'':'No public contact address is stored for this profile yet. Find it on the department page.'}</p>`);
    $('#mailto').onclick=()=>{const t=$('#draft').value;const sub=(t.match(/^Subject: (.*)/)||[,''])[1];location.href='mailto:'+(p.contact_route||'')+'?subject='+encodeURIComponent(sub)+'&body='+encodeURIComponent(t.replace(/^Subject:.*\n\n/,''))};
    $('#copy').onclick=()=>navigator.clipboard?.writeText($('#draft').value).then(()=>toast('Draft copied'))};
  const esc2=s=>String(s).replace(/&amp;/g,'&');
  $('#plist').addEventListener('click',e=>{const i=e.target.closest('.pitem');if(i)open(i.dataset.slug)});
  $('#plist').addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.classList.contains('pitem'))open(e.target.dataset.slug)});
  draw();
}};

/* ---------- PLANNER ---------- */
const refresh=()=>{const y=scrollY;render().then(()=>scrollTo(0,y))};
const normCode=s=>{const m=String(s).trim().toUpperCase().match(/^([A-Z]+)[\s-]?([0-9]+|[IVX]+)$/);return m?`${m[1]}-${m[2]}`:String(s).trim().toUpperCase()};
const pl={q:'',sem:'all',f:'all'};
routes['/planner']={title:'Planner',theme:true,view(){
  if(!Session.user)return gate('Plan your semesters with real numbers','Enter your grades to see GPA, backlogs and what each one blocks. Your records stay private to your account.');
  const s=academicSummary();const g=store.get('grades',{});const maxcr=store.get('maxcr',DEFAULT_MAX_CREDITS);
  const opts=cur=>`<option value="">–</option>${GRADE_LIST.map(x=>`<option ${x===cur?'selected':''}>${x}</option>`).join('')}`;
  const semBlocks=[1,2,3,4,5,6,7,8].map(n=>{
    const cs=Data.courses.filter(c=>c.semester===n);
    const sg=GPA.gpa(s.at.filter(a=>a.sem===n&&Data.C[a.code].semester===n));
    return `<div class="sem" data-sem="${n}"><div class="sem-h"><h3>Semester ${n} <span class="muted" style="font-weight:500">· ${n%2?'Fall':'Spring'}</span></h3><span class="small muted num">${s.at.some(a=>a.sem===n)?'GPA '+sg.toFixed(2):''}</span></div>${cs.map(c=>{const v=g[c.code]||{};const lg=latestGrade(c.code);const st=!lg?'none':lg==='F'?'failed':GRADES[lg]>=PASS_MIN?'passed':'none';return `<div class="crow ${c.elective_group?'elec':''}" data-sem="${n}" data-st="${st}" data-t="${esc((c.code+' '+c.title).toLowerCase())}"><span class="code">${c.code}</span><span>${esc(c.title)}</span><span class="cr num muted">${c.credits}</span><select class="select sm" data-c="${c.code}" data-k="g1" aria-label="Grade for ${c.code}">${opts(v.g1)}</select>${v.g1==='F'?`<select class="select sm grade2" data-c="${c.code}" data-k="g2" aria-label="Retake grade for ${c.code}">${opts(v.g2).replace('<option value="">–</option>','<option value="">Retake</option>')}</select>`:'<span class="ct"></span>'}</div>`}).join('')}</div>`}).join('');
  const bl=s.backlogs;
  return `${hero({art:'art-planner.webp',aw:'68%',tone:'dark',icon:'cal',label:'Plan Your Academic Journey',title:'Plan<span>ner</span>',sub:'Create your personalized study plan, track your progress and make sure you stay on the right path to achieve your goals.'})}<div class="wrap tbody">
  <div class="filters"><div class="search">${ic('search')}<input class="input" id="plq" type="search" placeholder="Search by course code or title" aria-label="Search courses" value="${esc(pl.q)}"></div><select class="select" id="pls" aria-label="Semester"><option value="all">All semesters</option>${[1,2,3,4,5,6,7,8].map(n=>`<option value="${n}" ${String(pl.sem)===String(n)?'selected':''}>Semester ${n}</option>`).join('')}</select></div>
  <div class="chips" id="plf" style="margin-bottom:20px">${[['all','All'],['passed','Passed'],['failed','Failed'],['none','Not graded']].map(([k,l])=>`<button class="chip" data-f="${k}" aria-pressed="${pl.f===k}">${l}</button>`).join('')}</div>
  <div class="grid-2"><div class="panel"><div class="phd"><span class="ico">${ic('book')}</span><div><h2>Your study plan</h2><small>Course by course, semester by semester</small></div></div>${semBlocks}</div>
  <aside class="stack side-sticky">
   <div class="panel"><span class="label muted">Cumulative GPA</span><div class="cgpa num" style="margin:6px 0">${s.graded?s.cg.cgpa.toFixed(2):'–'}</div><span class="tag ${s.cg.cgpa<2&&s.graded?'bad':'ok'}">${s.cg.standing}</span><div class="bar"><i style="width:${Math.min(100,s.earned/s.total*100)}%"></i></div><p class="small muted" style="margin-top:8px"><span class="num">${s.earned}</span> of about <span class="num">${s.total}</span> credit hours passed. Retakes use the highest grade.</p></div>
   <div class="panel"><div class="panel-h"><h3>Backlogs</h3><span class="tag ${bl.length?'bad':''}">${bl.length}</span></div>${bl.length?bl.map(b=>{const d=[...Graph.downstream(b)];return `<div class="row" style="grid-template-columns:1fr"><div><b>${b}</b> ${esc(Data.C[b].title)}<div class="small muted" style="margin-top:4px">${d.length?'Blocks '+d.map(x=>`<b>${x}</b>`).join(', '):'No later course is linked to it in the verified chart.'}</div></div></div>`}).join(''):'<p class="muted small">No failed courses. A course with an F as its latest grade appears here.</p>'}</div>
   <div class="panel"><div class="panel-h"><h3>Next semester</h3><span class="tag gold">Estimate</span></div><div class="field" style="margin-bottom:12px"><label for="maxcr" class="small">Credit hour limit</label><input class="input" id="maxcr" type="number" min="6" max="30" value="${maxcr}" style="max-width:110px"><span class="hint">Assumed ${DEFAULT_MAX_CREDITS} until the program rule is confirmed.</span></div>${s.next.length?s.next.map(c=>`<div class="row" style="grid-template-columns:64px 1fr auto"><b>${c.code}</b><span class="small">${esc(c.title)}</span><span class="tag ${c.backlog?'bad':''}">${c.backlog?'Retake':c.credits+' CH'}</span></div>`).join('')+`<p class="small muted" style="margin-top:8px">Total <b class="num">${s.next.reduce((a,c)=>a+c.credits,0)}</b> credit hours. Backlogs come first, then standard courses you are eligible for.</p>`:'<p class="muted small">Enter grades for earlier semesters to see a suggestion for semester '+Math.min(8,(+Session.user.semester||1)+1)+'.</p>'}</div>
   <div class="panel"><h3 style="font-size:20px;margin-bottom:10px">What GPA do I need?</h3><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><div class="field" style="margin:0"><label class="small" for="tg">Target CGPA</label><input class="input" id="tg" type="number" step="0.01" min="0" max="4" value="3.00"></div><div class="field" style="margin:0"><label class="small" for="tc">Next credit hours</label><input class="input" id="tc" type="number" min="1" value="18"></div></div><p id="need" class="small" style="margin-top:12px"></p></div>
   <div class="panel"><h3 style="font-size:20px;margin-bottom:6px">Import from CSV</h3><p class="small muted" style="margin-bottom:12px">Columns: <b>course_code, grade</b>. Up to 100 rows. List a course twice to record a retake.</p><div class="drop"><input type="file" id="csv" accept=".csv,text/csv" aria-label="Choose CSV file"></div><ul class="errlist" id="csverr"></ul><div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap"><button class="btn btn-line btn-sm" id="tpl">Download template</button><button class="btn btn-line btn-sm" id="clear">Clear all grades</button></div></div>
  </aside></div></div>`;
},after(){
  if(!Session.user)return;
  const flt=()=>{const q=pl.q.trim().toLowerCase();$$('.crow').forEach(r=>{const ok=(!q||r.dataset.t.includes(q))&&(pl.sem==='all'||r.dataset.sem===String(pl.sem))&&(pl.f==='all'||r.dataset.st===pl.f);r.hidden=!ok});$$('.sem').forEach(s=>{s.hidden=!$$('.crow:not([hidden])',s).length})};
  $('#plq').oninput=e=>{pl.q=e.target.value;flt()};$('#pls').onchange=e=>{pl.sem=e.target.value;flt()};
  $$('#plf .chip').forEach(c=>c.onclick=()=>{pl.f=c.dataset.f;$$('#plf .chip').forEach(x=>x.setAttribute('aria-pressed',x===c));flt()});flt();
  $$('select[data-c]').forEach(sel=>sel.onchange=()=>{const g=store.get('grades',{});const c=sel.dataset.c;g[c]??={};if(sel.value)g[c][sel.dataset.k]=sel.value;else delete g[c][sel.dataset.k];if(sel.dataset.k==='g1'&&sel.value!=='F')delete g[c].g2;if(!g[c].g1&&!g[c].g2)delete g[c];store.set('grades',g);refresh()});
  $('#maxcr').onchange=e=>{store.set('maxcr',Math.max(6,Math.min(30,+e.target.value||DEFAULT_MAX_CREDITS)));refresh()};
  const s=academicSummary();
  const need=()=>{const t=+$('#tg').value,n=+$('#tc').value;const r=GPA.needed(s.cg.qp,s.cg.credits,t,n);$('#need').innerHTML=!s.graded?'Enter some grades first.':r>4?`<span class="tag bad">Out of reach</span> You would need a ${r.toFixed(2)} GPA, which is above 4.00.`:r<0?`<span class="tag ok">Already above target</span>`:`You need an average of <b class="num">${r.toFixed(2)}</b> GPA over the next ${n} credit hours.`};
  $('#tg').oninput=need;$('#tc').oninput=need;need();
  $('#tpl').onclick=()=>{const b=new Blob(['course_code,grade\nCS-114,A\nCS-115,B+\nMT-114,F\n'],{type:'text/csv'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='educompass-grades-template.csv';a.click()};
  $('#clear').onclick=()=>{if(confirm('Remove every grade you entered?')){store.del('grades');refresh()}};
  $('#csv').onchange=async e=>{const f=e.target.files[0];if(!f)return;const rows=(await f.text()).split(/\r?\n/).filter(l=>l.trim());const errs=[];
    if(rows.length&&/course/i.test(rows[0]))rows.shift();
    if(rows.length>100){errs.push('The file has more than 100 rows. Only the first 100 were read.');rows.length=100}
    const g=store.get('grades',{});let ok=0;
    rows.forEach((l,i)=>{const n=i+2;const [c,gr]=l.split(',').map(x=>x.trim());const code=normCode(c||'');const grade=(gr||'').toUpperCase();
      if(!Data.C[code]||Data.C[code].type!=='course')return errs.push(`Row ${n}: unknown course code "${esc(c||'')}"`);
      if(!(grade in GRADES))return errs.push(`Row ${n}: "${esc(gr||'')}" is not a valid grade`);
      g[code]??={};if(g[code].g1&&g[code].g1==='F'&&!g[code].g2)g[code].g2=grade;else g[code].g1=grade;ok++});
    store.set('grades',g);$('#csverr').innerHTML=errs.map(x=>`<li>${x}</li>`).join('');toast(`${ok} row${ok===1?'':'s'} imported${errs.length?`, ${errs.length} skipped`:''}`);if(!errs.length)refresh();else setTimeout(()=>{},0)};
}};

/* ---------- PREREQUISITES (dark explorer) ---------- */
const px={sel:null,sim:false,list:false,crit:false,failed:new Set(),q:''};
const CATNAME={core_computing:'Core Computing',mathematics:'Mathematics',science:'Science',general_education:'Humanities',language:'Language',elective:'Elective',fyp:'Project'};
const crLabel=c=>`${c.credits} Cr (${c.theory_credits??c.credits}+${c.practical_credits??0})`;
function statusOf(code,passed){const g=latestGrade(code);if(g&&GRADES[g]>=PASS_MIN)return['passed','Passed'];if(g==='F')return['failed','Failed'];return Graph.eligibility(code,passed).eligible?['unlocked','Unlocked']:['locked','Locked']}
routes['/prerequisites']={title:'Prerequisites',dark:true,view(){
  if(!Session.user)return gate('See what every course unlocks','The prerequisite explorer and the failure simulator are available to registered students.');
  if(innerWidth<700&&!px.listSet){px.list=true;px.listSet=true}
  const passed=academicSummary().passed;
  const node=c=>{const [k,t]=statusOf(c.code,passed);return `<button class="cnode cat-${c.category} ${c.elective_group?'elective':''}" data-c="${c.code}" aria-pressed="false"><span class="ch"><b>${c.code}</b><em class="st st-${k}">${t}</em></span><strong>${esc(c.title)}</strong><span class="cf">${CATNAME[c.category]||c.category} · ${crLabel(c)}</span></button>`};
  const cols=[1,2,3,4,5,6,7,8].map(n=>`<div class="xcol"><h4><span>Semester ${n}</span><i>${n%2?'Fall':'Spring'}</i></h4>${Data.courses.filter(c=>c.semester===n).map(node).join('')}</div>`).join('');
  const list=[1,2,3,4,5,6,7,8].map(n=>`<div class="sem"><div class="sem-h"><h3>Semester ${n} · ${n%2?'Fall':'Spring'}</h3></div>${Data.courses.filter(c=>c.semester===n).map(c=>{const u=Graph.adj[c.code],d=Graph.rev[c.code];const [k,t]=statusOf(c.code,passed);return `<div class="row" data-c="${c.code}" style="grid-template-columns:70px 1fr auto;cursor:pointer"><b>${c.code}</b><span>${esc(c.title)}${u.length?`<div class="small muted">Needs ${u.join(', ')}</div>`:''}${d.length?`<div class="small muted">Unlocks ${d.join(', ')}</div>`:''}</span><em class="st st-${k}">${t}</em></div>`}).join('')}</div>`).join('');
  return `<div class="page"><div class="wrap wide"><div class="xhead"><div><h1>Prerequisite Explorer</h1><p>Course dependency graph for ${esc(Data.program.degree)}. Select a course to light up its chain, or turn on simulation to fail courses and watch the cascade.</p></div>
  <div class="xtools"><div class="search">${ic('search')}<input class="input" id="xq" type="search" placeholder="Find a course" aria-label="Find a course" value="${esc(px.q)}"></div><button class="btn btn-line btn-sm" id="crit" aria-pressed="${px.crit}">Critical path</button><button class="btn btn-line btn-sm simon" id="simt" aria-pressed="${px.sim}">${px.sim?'Exit simulation':'Simulate failure'}</button><button class="btn btn-line btn-sm" id="mode">${px.list?'Show graph':'Show list'}</button></div></div>
  <div class="notice dxnote" style="margin-bottom:12px">${ic('info')}<span><b>${Data.chartEdges.length}</b> arrows traced from the NED Course Dependency Chart. Dashed lines lead to a whole elective group. No arrow means none is listed on the chart. Badges use your Planner grades.</span></div>
  <div id="simbar"></div><div class="panel" id="insp" style="margin-bottom:14px"></div>
  ${px.list?`<div class="panel">${list}</div>`:`<div class="xwrap"><div class="xgrid" id="xg">${cols}<svg class="xsvg" id="xs"></svg></div></div><div class="legend"><span><i style="background:#E0586B"></i>Needed before</span><span><i style="background:#E8C15A"></i>Unlocked by it</span><span><i style="background:#5CC8E8"></i>Critical path</span><span><i style="background:#FF5468"></i>Failed (simulated)</span><span><i style="background:#F08A2E"></i>Blocked or delayed</span><span><i style="background:#2A3A5E"></i>Core</span><span><i style="background:#51409A"></i>Mathematics</span><span><i style="background:#2D7070"></i>Elective</span></div>`}</div></div>`;
},after(){
  if(!Session.user)return;
  const T=(c,k)=>`<a href="#" data-pick="${c}" class="tag ${k||''}">${c}</a>`;
  const simResult=()=>px.failed.size?Graph.simulateFail([...px.failed]):null;
  const bar=()=>{const el=$('#simbar');if(!px.sim){el.innerHTML='';return}const r=simResult();
    el.innerHTML=`<div class="simbar"><span><b>Simulation on.</b> Click any course to fail it. Click again to undo.</span><span>Failed<b class="n num">${px.failed.size}</b></span><span>Cascading blocked<b class="n num">${r?r.blocked.size:0}</b></span><span>Delayed<b class="n num">${r?r.pushed.length:0}</b>${r&&r.delay?` · graduation +${r.delay} term${r.delay>1?'s':''}`:''}</span><button class="btn btn-sm btn-glass sp" id="simreset">Reset</button></div>`;
    $('#simreset').onclick=()=>{px.failed.clear();bar();insp();paint()}};
  const insp=()=>{const el=$('#insp');
    if(px.sim){const r=simResult();el.classList.toggle('compact',!r);el.innerHTML=!r?'<p class="xhint">Click any course to fail it. A failed course is retaken in the same term next year, and what depends on it moves to the next matching term. Your real records are not changed.</p>':`<div class="insp-g"><div><span class="label muted">Failed</span><div style="margin:8px 0 14px;display:flex;gap:6px;flex-wrap:wrap">${[...px.failed].map(c=>`<span class="tag bad">${c} ${esc(Data.C[c].title)}</span>`).join('')}</div><p class="small">${r.delay?`Graduation slips by about <b>${r.delay} term${r.delay>1?'s':''}</b>.`:'Graduation stays within 8 semesters in this estimate.'} <span class="tag gold">Estimate</span></p></div><div><span class="label muted">Courses that move</span>${r.pushed.length?r.pushed.map(p=>`<div class="row" style="grid-template-columns:70px 1fr auto;padding:8px 0"><b>${p.code}</b><span class="small">${esc(Data.C[p.code].title)}</span><span class="tag warn">sem ${Data.C[p.code].semester} to ${p.to}</span></div>`).join(''):'<p class="small muted" style="margin-top:8px">No other course is pushed back, either because nothing depends on it or the retake lands in time.</p>'}${[...r.blocked].filter(b=>!r.pushed.some(p=>p.code===b)).length?`<p class="xs muted" style="margin-top:8px">Also depends on a failed course but still fits: ${[...r.blocked].filter(b=>!r.pushed.some(p=>p.code===b)).join(', ')}. Elective members count as blocked because the chart does not say which one needs which.</p>`:''}</div></div>`;return}
    const c=px.sel&&Data.C[px.sel];
    if(!c){el.classList.add('compact');el.innerHTML=px.crit?`<p class="small"><b>Longest chain in the curriculum:</b> ${Graph.longestChain().map(x=>T(x,'')).join(' → ')}</p>`:'<p class="xhint">Select any course to see its chain and importance, or use Critical path for the longest chain.</p>';bindPicks(el);return}
    el.classList.remove('compact');
    const up=[...Graph.upstream(c.code)],dn=[...Graph.downstream(c.code)],imp=Graph.importance(c.code);
    const F=[['Downstream reach',imp.parts.reach,''],['Chain depth',imp.parts.depth,''],['Core status',imp.parts.core,''],['Gatekeeping',imp.parts.gate,'']];
    const grp=(Graph.anyOf[c.code]||[]);
    el.innerHTML=`<div class="insp-g"><div><span class="tag maroon">${c.code} · Semester ${c.semester} · ${crLabel(c)}</span><h2 style="font-size:28px;margin:10px 0">${esc(c.title)}</h2><p class="small"><b>Needs:</b> ${up.length?up.map(x=>T(x)).join(' '):'<span class="muted">No prerequisite on the chart</span>'}</p>${grp.length?`<p class="xs muted" style="margin-top:6px">${grp.join(', ')} lead into this course's elective group. Which member needs which is not shown on the chart.</p>`:''}<p class="small" style="margin-top:8px"><b>Unlocks:</b> ${dn.length?dn.map(x=>T(x,'gold')).join(' '):'<span class="muted">Nothing linked yet</span>'}</p>${px.crit?`<p class="small" style="margin-top:8px"><b>Critical path to it:</b> ${Graph.criticalPath(c.code).join(' → ')}</p>`:''}</div>
    <div><div style="display:flex;align-items:baseline;gap:10px"><b class="num" style="font:500 52px/1 var(--serif);color:#F28A9A">${imp.score}</b><span class="small muted">/ 100 importance <span class="tag gold">Estimate</span></span></div><div class="insp-fac">${F.map(([n,v])=>`<div class="factor"><span>${n}</span><b class="num">${Math.round(v*100)}%</b><div class="bar"><i style="width:${v*100}%"></i></div></div>`).join('')}</div><p class="xs muted">Weights: 40% reach, 25% depth, 20% core, 15% gatekeeping.</p></div></div>`;bindPicks(el)};
  const bindPicks=el=>$$('[data-pick]',el).forEach(a=>a.onclick=e=>{e.preventDefault();px.sel=a.dataset.pick;px.sim=false;refreshAll()});
  const paint=()=>{const g=$('#xg');if(!g)return;
    const s=px.sim?null:px.sel;const up=s?Graph.upstream(s):new Set(),dn=s?Graph.downstream(s):new Set();
    const crit=new Set(px.crit?(s?Graph.criticalPath(s):Graph.longestChain()):[]);
    const r=px.sim?simResult():null;const q=px.q.trim().toLowerCase();
    const hits=q?new Set(Data.courses.filter(c=>(c.code+' '+c.title).toLowerCase().includes(q)).map(c=>c.code)):null;
    g.classList.toggle('has-focus',!!(s||crit.size||r||hits));
    $$('.cnode',g).forEach(n=>{const c=n.dataset.c;let cl='cnode cat-'+Data.C[c].category+(Data.C[c].elective_group?' elective':'');
      if(c===s)cl+=' sel';else if(up.has(c))cl+=' up';else if(dn.has(c))cl+=' down';
      if(crit.has(c))cl+=' crit';if(hits?.has(c))cl+=' hit';
      n.removeAttribute('data-push');
      if(r){if(px.failed.has(c))cl+=' fail';else if(r.blocked.has(c)){cl+=' blk';const p=r.pushed.find(x=>x.code===c);if(p)n.dataset.push='+'+p.by+' sem'}}
      n.className=cl;n.setAttribute('aria-pressed',c===s||px.failed.has(c))});
    edges({up,dn,s,crit,r})};
  const edges=({up,dn,s,crit,r})=>{const g=$('#xg'),svg=$('#xs');svg.setAttribute('width',g.scrollWidth);svg.setAttribute('height',g.scrollHeight);
    const node=c=>$(`.cnode[data-c="${c}"]`,g);const critEdge=(f,t)=>{const ch=[...crit];return ch.includes(f)&&ch.includes(t)};let out='';
    Data.edges.forEach(e=>{const a=node(e.from),b=node(e.to);if(!a||!b)return;
      const x1=a.offsetLeft+a.offsetWidth,y1=a.offsetTop+a.offsetHeight/2,x2=b.offsetLeft,y2=b.offsetTop+b.offsetHeight/2,dx=Math.max(26,Math.abs(x2-x1)/2);
      let k='';
      if(s){if((e.from===s||up.has(e.from))&&(e.to===s||up.has(e.to)))k='up';else if((e.from===s||dn.has(e.from))&&(e.to===s||dn.has(e.to)))k='dn'}
      if(crit.size&&critEdge(e.from,e.to)&&crit.has(e.from)&&crit.has(e.to))k='cr';
      if(r&&(px.failed.has(e.from)||r.blocked.has(e.from))&&r.blocked.has(e.to))k='fl';
      out+=`<path class="${k?k+' on':''} ${e.group?'grp':''}" d="M${x1} ${y1}C${x1+dx} ${y1} ${x2-dx} ${y2} ${x2} ${y2}"/><circle class="${k?k+' on':''}" cx="${x1}" cy="${y1}" r="2.4"/><circle class="${k?k+' on':''}" cx="${x2}" cy="${y2}" r="2.4"/>`});
    svg.innerHTML=out};
  const refreshAll=()=>{if(px.list){insp();return}bar();insp();paint()};
  $('#mode').onclick=()=>{px.list=!px.list;px.listSet=true;refresh()};
  $('#crit').onclick=()=>{px.crit=!px.crit;$('#crit').setAttribute('aria-pressed',px.crit);refreshAll()};
  $('#simt').onclick=()=>{px.sim=!px.sim;$('#simt').setAttribute('aria-pressed',px.sim);$('#simt').textContent=px.sim?'Exit simulation':'Simulate failure';if(!px.sim)px.failed.clear();refreshAll()};
  $('#xq').oninput=e=>{px.q=e.target.value;paint()};
  $('#xq').onkeydown=e=>{if(e.key==='Enter'){const q=px.q.trim().toLowerCase();const m=Data.courses.find(c=>(c.code+' '+c.title).toLowerCase().includes(q));if(m){px.sel=m.code;px.sim=false;refreshAll()}}};
  const pick=c=>{if(px.sim){px.failed.has(c)?px.failed.delete(c):px.failed.add(c)}else px.sel=px.sel===c?null:c;refreshAll()};
  $('#xg')?.addEventListener('click',e=>{const n=e.target.closest('.cnode');if(n)pick(n.dataset.c)});
  $$('.row[data-c]').forEach(r=>r.onclick=()=>{px.sim=false;px.sel=r.dataset.c;insp();scrollTo({top:$('#insp').offsetTop-90,behavior:'smooth'})});
  refreshAll();window.onresize=()=>{if(current==='/prerequisites'&&!px.list)paint()};
}};

/* ---------- CAREER HUB ---------- */
let trackSel=null;
const STAGES={1:'First year',2:'Second year',3:'Third year',4:'Final year'};
const cq={q:''};
const trackChips=()=>Data.tracks.filter(x=>!cq.q||(x.title+' '+x.summary).toLowerCase().includes(cq.q.toLowerCase())).map(x=>`<button class="chip" data-s="${x.slug}" aria-pressed="${x.slug===trackSel}">${esc(x.title)}</button>`).join('')||'<span class="muted small">No track matches that search.</span>';
routes['/careers']={title:'Career Hub',theme:true,view(){
  trackSel??=Data.tracks[0].slug;
  const t=Data.tracks.find(x=>x.slug===trackSel);
  const done=store.get('roadmap',{})[t.slug]||[];
  const by={};t.relevant_courses.filter(c=>Data.C[c]).forEach(c=>(by[Data.C[c].year]??=[]).push(c));
  const u=Session.user;
  return `${hero({art:'art-careers.webp',aw:'66%',icon:'case',label:'Your Future Starts Here',title:'Career <b>Hub</b>',sub:`Explore ${Data.tracks.length} career tracks, see which NED courses build each one, and tick off what you have covered.`})}
  <div class="wrap tbody"><div class="toolbar"><div class="search">${ic('search')}<input class="input" id="cqs" type="search" placeholder="Search career tracks or skills" aria-label="Search career tracks" value="${esc(cq.q)}"></div></div>
  <div class="chips" id="trk" style="margin-bottom:20px">${trackChips()}</div>
  <div class="grid-2"><div class="panel"><div class="phd"><span class="ico">${ic('target')}</span><div style="flex:1"><h2>${esc(t.title)}</h2><small>${esc(t.summary)}</small></div>${u?`<span class="tag ok num">${done.length} / ${t.relevant_courses.length} done</span>`:''}</div>
  ${Object.keys(by).sort().map(y=>`<h3 style="font:700 13px var(--sans);color:var(--maroon);margin:18px 0 4px">${STAGES[y]}</h3>${by[y].map(c=>`<div class="check"><button class="tick" role="checkbox" aria-checked="${done.includes(c)}" data-c="${c}" aria-label="Mark ${c} as done">${done.includes(c)?ic('check'):''}</button><span><b>${c}</b> ${esc(Data.C[c].title)}</span><span class="tag">${Data.C[c].credits} CH</span></div>`).join('')}`).join('')}</div>
  <aside class="stack side-sticky"><div class="panel"><div class="phd"><span class="ico">${ic('user')}</span><div><h2>Faculty in this area</h2><small>Supervisors working on related topics</small></div></div>${(()=>{const tag={'ai-ml-engineering':'ai-ml','data-science':'data','cybersecurity':'cybersecurity','embedded-iot':'embedded','frontend-development':'web','backend-development':'web'}[t.slug];const m=tag?Data.profs.filter(p=>p.domain_tags.includes(tag)).slice(0,4):[];return m.length?(u?m.map(p=>`<div class="row" style="grid-template-columns:1fr"><span>${esc(p.name)}</span></div>`).join('')+'<a class="btn btn-line btn-sm" style="margin-top:10px" href="#/professors">See all matches</a>':'<p class="muted small">Sign in to see which professors work in this area.</p>'):'<p class="muted small">No faculty tag is mapped to this track yet.</p>'})()}</div>
  <div class="panel"><div class="phd"><span class="ico">${ic('check')}</span><div><h2>Saving progress</h2><small>${u?'Ticks are saved on this browser.':'Sign in to keep your progress.'}</small></div></div></div>
  <div class="notice info">${ic('info')}<span>Time-boxed roadmaps, articles and GitHub lists are added from the admin console after review.</span></div></aside></div></div>`;
},after(){
  const bindT=()=>$$('#trk .chip').forEach(b=>b.onclick=()=>{trackSel=b.dataset.s;refresh()});bindT();
  $('#cqs').oninput=e=>{cq.q=e.target.value;$('#trk').innerHTML=trackChips();bindT()};
  $$('.tick').forEach(b=>b.onclick=()=>{if(!Session.user){toast('Sign in to save progress');return go('/login')}const r=store.get('roadmap',{});const a=new Set(r[trackSel]||[]);const c=b.dataset.c;a.has(c)?a.delete(c):a.add(c);r[trackSel]=[...a];store.set('roadmap',r);refresh()});
}};

/* ---------- ASSISTANT ---------- */
const TRACK_FOR={'ai-ml':'ai-ml-engineering','computer-vision':'ai-ml-engineering','nlp':'ai-ml-engineering','data':'data-science','healthcare-tech':'data-science','web':'frontend-development','cybersecurity':'cybersecurity','embedded':'embedded-iot','iot':'embedded-iot','robotics':'embedded-iot','blockchain':'backend-development','ar-vr':'game-development'};
const GOALS={'Job':{gpa:'2.5 or above keeps most job doors open',t:'Build two solid projects and a GitHub profile alongside your courses.'},'Higher studies abroad':{gpa:'3.3 or above is a common target',t:'Start early on a research-style FYP and keep your grades steady.'},'Research':{gpa:'3.3 or above is a common target',t:'Meet a supervisor in your area before your final year.'},'Entrepreneurship':{gpa:'No fixed minimum',t:'Pair your core courses with a real prototype you can show.'},'Freelancing':{gpa:'No fixed minimum',t:'Pick one skill from your track and build three small client-style projects.'}};
const chat={step:0,ans:{},msgs:[],done:false};
routes['/assistant']={title:'Assistant',view(){
  return `<div class="page"><div class="wrap">
  <div class="page-head">
    <div>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">
        <h1 style="margin:0">AI Academic Assistant</h1>
        <span class="tag gold" style="font-size:11px">Abdul Bari · Semester 7</span>
        <span class="tag" style="font-size:11px">Department CISE</span>
      </div>
      <p style="margin:0">Interactive academic planning, prerequisite cascade checks, and FYP guidance directly with NED's resident senior.</p>
    </div>
  </div>
  <div class="grid-2" style="grid-template-columns:minmax(0,1.15fr) minmax(0,1fr)">
    <div class="panel chat" style="display:flex;flex-direction:column;overflow:hidden;padding:0;border:1px solid var(--border);border-radius:var(--radius)">
      <!-- Abdul Bari Integrated Panel Header -->
      <div style="display:flex;align-items:center;gap:16px;padding:14px 18px;background:var(--surface-2, rgba(96,10,44,0.06));border-bottom:1px solid var(--border)">
        <div style="flex:none;width:76px;height:124px;display:flex;align-items:center;justify-content:center">
          <img id="abdul-panel-img" src="abdul/abdul-idle-full.webp" srcset="abdul/abdul-idle-full.webp 1x, abdul/abdul-idle-full@2x.webp 2x" alt="Abdul Bari" style="width:76px;height:124px;object-fit:contain;display:block;filter:drop-shadow(0 4px 8px rgba(0,0,0,0.22))">
        </div>
        <div style="flex:1">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
            <h2 style="margin:0;font-size:17px;font-weight:700">Abdul Bari</h2>
            <span class="tag gold" style="font-size:10px;font-weight:700">Resident Senior · Semester 7</span>
            <span class="tag" style="font-size:10px">Unofficial Guide</span>
          </div>
          <p style="margin:4px 0 0;font-size:13px;line-height:1.4;color:var(--text-muted, var(--muted))">
            I know every prerequisite chain, past FYP, and faculty lab. Ask me about courses or campus life!
          </p>
          <div id="abdul-thinking-status" style="margin-top:6px;font-size:12px;font-style:italic;color:var(--accent, #F5B50A);display:none">
            Chalo, dekhte hain...
          </div>
        </div>
      </div>

      <div style="padding:18px;display:flex;flex-direction:column;flex:1">
        <div class="msgs" id="msgs" aria-live="polite"></div>
        <div>
          <div class="quick" id="quick"></div>
          <form id="cf" style="display:flex;gap:8px">
            <input class="input" id="ci" maxlength="300" placeholder="Ask about a professor, course, prerequisite or FYP" aria-label="Your question">
            <button class="btn btn-ink">Ask</button>
          </form>
          <div class="counter"><span id="cc">0</span>/300</div>
        </div>
      </div>
    </div>
    <div id="plan"><div class="panel empty"><h3>Your plan card appears here</h3><p>Answer the four quick questions and you will get a track, courses, professors and next steps.</p></div></div>
  </div></div></div>`;
},after(){
  if(window.Abdul) Abdul.resetState();
  const u=Session.user;const tags=allTags();
  const Q=[{q:'Which topics interest you most? Pick one to start.',o:tags.map(t=>[t,label(t)])},{q:'What is your main goal?',o:Object.keys(GOALS).map(g=>[g,g])},{q:'What is your current standing?',o:[['good','GPA 3.0 or above, no backlogs'],['mid','GPA 2.0 to 3.0, no backlogs'],['back','I have backlogs']]},{q:'How many hours a week can you commit?',o:[['3','Up to 3 hours'],['6','About 6 hours'],['10','10 hours or more']]}];
  const msgs=$('#msgs'),quick=$('#quick');
  const say=(t,me,src)=>{chat.msgs.push({t,me,src});drawMsgs()};
  const drawMsgs=()=>{
    msgs.innerHTML=chat.msgs.map(m=>`<div class="msg ${m.me?'me':''}">${!m.me?'<span class="abdul-chat-avatar" style="display:inline-flex;align-items:center;margin-right:8px;vertical-align:middle"><img src="abdul/abdul-idle-head.webp" alt="Abdul" style="width:28px;height:28px;border-radius:4px;object-fit:contain;display:inline-block"></span>':''}${esc(m.t)}${m.src?`<span class="src">Source: ${m.src}</span>`:''}</div>`).join('');
    msgs.scrollTop=msgs.scrollHeight;
  };
  const ask=()=>{if(chat.step<Q.length){quick.innerHTML=Q[chat.step].o.map(([v,l])=>`<button class="chip" data-v="${v}">${l}</button>`).join('')}else quick.innerHTML=''};
  const planCard=()=>{
    const a=chat.ans;const track=Data.tracks.find(t=>t.slug===TRACK_FOR[a.topic])||Data.tracks[0];const goal=GOALS[a.goal];
    const profs=Data.profs.filter(p=>p.domain_tags.includes(a.topic)).slice(0,3);const fy=Data.fyps.filter(p=>p.domain_tags.includes(a.topic)).slice(0,3);
    const courses=track.relevant_courses.filter(c=>Data.C[c]).slice(0,5);
    $('#plan').innerHTML=`<div class="plan"><div class="plan-top"><span class="tag gold">Your plan</span><h3 style="margin-top:8px">${esc(track.title)}</h3><p class="small" style="opacity:.8;margin-top:4px">${label(a.topic)} · goal: ${a.goal} · ${a.hours} hours a week</p></div><div class="plan-body">
     <h4>GPA target <span class="tag gold">Estimate</span></h4><p class="small">${goal.gpa}.${a.stand==='back'?' Clearing backlogs first protects your CGPA.':''}</p>
     <h4>Courses to focus on</h4>${u?`<ul>${courses.map(c=>`<li><b>${c}</b> ${esc(Data.C[c].title)}</li>`).join('')}</ul>`:'<p class="small muted">Sign in to see the supporting courses and matching professors.</p>'}
     ${u?`<h4>Matching professors</h4>${profs.length?`<ul>${profs.map(p=>`<li>${esc(p.name)}<span class="muted"> · works in ${label(a.topic)}</span></li>`).join('')}</ul>`:'<p class="small muted">No professor tagged for this topic yet.</p>'}`:''}
     <h4>FYP examples</h4>${fy.length?`<ul>${fy.map(p=>`<li>${esc(p.title)}</li>`).join('')}</ul>`:'<p class="small muted">No past project is tagged with this topic yet.</p>'}
     <h4>Next three actions</h4><ul><li>${goal.t}</li><li>Open the <a href="#/careers" style="color:var(--maroon);font-weight:600">${esc(track.title)}</a> track and tick what you have covered.</li><li>${u?'Shortlist two FYPs and email one supervisor.':'Create an account to save this plan and unlock professors.'}</li></ul>
     <p class="xs muted" style="margin-top:14px">Source: department database. Guidance estimate, not an official decision.</p></div></div>`;
    store.set('plan',a)};
  const start=()=>{
    if(!chat.msgs.length)say('Salam! I am Abdul Bari, NED\'s resident senior and EduCompass guide. Ask me about courses, prerequisites, FYPs and supervisors.',false,'Abdul Bari');
    if(!chat.msgs.some(m=>m.t===Q[0].q))say(Q[0].q,false);
    ask();
  };
  quick.onclick=e=>{const b=e.target.closest('[data-v]');if(!b)return;const keys=['topic','goal','stand','hours'];chat.ans[keys[chat.step]]=b.dataset.v;say(b.textContent,true);chat.step++;
    if(chat.step<Q.length){say(Q[chat.step].q,false)}else{say('Thanks. Your plan card is ready.'+(u?'':' Sign in to also see matching professors and courses.'),false,'Database');planCard()}ask()};
  const retrieve=q=>{const w=q.toLowerCase().replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(x=>x.length>2&&!['the','and','who','what','which','about','for','are','can','how','does','with','tell','has','have','work','works','working','any','there','from','know','that','this','when','where','you','your','are','was','will'].includes(x));if(!w.length)return null;
    const sc=(txt)=>w.reduce((s,x)=>s+(txt.toLowerCase().includes(x)?1:0),0);
    const P=Data.profs.map(p=>({s:sc(p.name+' '+p.research_areas+' '+p.domain_tags.join(' ')),p})).filter(x=>x.s).sort((a,b)=>b.s-a.s);
    const C=Data.courses.map(c=>({s:sc(c.code+' '+c.title),c})).filter(x=>x.s).sort((a,b)=>b.s-a.s);
    const T=Data.tracks.map(t=>({s:sc(t.title+' '+t.summary),t})).filter(x=>x.s).sort((a,b)=>b.s-a.s);
    const F=Data.fyps.map(p=>({s:sc(p.title+' '+p.supervisor+' '+p.domain_tags.join(' ')),p})).filter(x=>x.s).sort((a,b)=>b.s-a.s);
    const best=[['p',P[0]?.s||0],['c',C[0]?.s||0],['t',T[0]?.s||0],['f',F[0]?.s||0]].sort((a,b)=>b[1]-a[1])[0];
    if(!best[1])return null;
    if(best[0]==='p'){if(!u)return{t:'There are professors who match that. Sign in to see their names and research areas.',src:'Database'};return{t:'Closest matches: '+P.slice(0,3).map(x=>`${x.p.name} (${x.p.research_areas.split(';').slice(0,2).join(', ')})`).join('; ')+'.',src:'Database'}}
    if(best[0]==='c'){const c=C[0].c;const up=Graph.adj[c.code];return{t:`${c.code} ${c.title} is a ${c.credits}-credit-hour course in semester ${c.semester}. ${up.length?'It needs '+up.join(', ')+' first.':'No prerequisite is recorded for it yet.'}`,src:'Database'}}
    if(best[0]==='t'){const t=T[0].t;return{t:`${t.title}: ${t.summary} Supporting courses: ${t.relevant_courses.slice(0,4).join(', ')}.`,src:'Roadmap'}}
    return{t:'Past FYPs on that: '+F.slice(0,3).map(x=>x.p.title).join('; ')+'.',src:'Database'}};
  const inp=$('#ci');inp.oninput=()=>$('#cc').textContent=inp.value.length;
  $('#cf').onsubmit=e=>{
    e.preventDefault();const q=inp.value.trim();if(!q)return;say(q,true);inp.value='';$('#cc').textContent=0;
    if(window.Abdul)Abdul.onUserSend();
    if(/ignore (all|previous)|system prompt|jailbreak/i.test(q)){
      setTimeout(()=>{say('I can only answer questions about NED CISE courses, professors, projects and careers.',false,'Database');if(window.Abdul)Abdul.onResponse(1);},150);
      return;
    }
    // 1. Instant Persona & Story check (0ms lag, no failure)
    if(window.Abdul && Abdul.answerPersona){
      const pAns = Abdul.answerPersona(q);
      if(pAns){
        setTimeout(()=>{
          say(pAns, false, 'Abdul Bari (Resident Senior)');
          Abdul.setState('happy');
        }, 120);
        return;
      }
    }
    // 2. Department database retrieval
    setTimeout(()=>{
      const r=retrieve(q);
      if(r){
        say(r.t,false,r.src);
        if(window.Abdul)Abdul.onResponse(1);
      } else {
        say("I don't have that specific record in my notes right now. Check the CISE notice board, or ask me about courses, prerequisites, supervisors, or my story on campus!",false,'Abdul Bari');
        if(window.Abdul)Abdul.setState('idle');
      }
    }, 200);
  };
  if(chat.done||chat.step>=Q.length){drawMsgs();planCard()}else{drawMsgs()}
  start();if(chat.step>=Q.length)planCard();
}};

