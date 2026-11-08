/* EduCompass admin console. DEMO MODE: data lives in this browser (localStorage) until the real API is connected.
   Workflow follows the NED admin design: Operator drafts -> Chairman sign-off -> (major changes) Vice Chancellor -> Release. */
(()=>{
const clone=o=>JSON.parse(JSON.stringify(o)),hex=()=>Math.random().toString(16).slice(2,6).toUpperCase(),DAY=864e5;
const fmt=t=>new Date(t).toLocaleString('en-GB',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
const fmtD=t=>new Date(t).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
Object.assign(ICONS,{chev:'<path d="m6 9 6 6 6-6"/>',doc:'<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',alert:'<path d="M12 3 2 20h20L12 3Z"/><path d="M12 10v5M12 18h.01"/>',trash:'<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',out:'<path d="M9 21H5V3h4M16 17l5-5-5-5M21 12H9"/>',up2:'<path d="M12 16V4M7 9l5-5 5 5M5 20h14"/>',people:'<circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-4 3-6 7-6s7 2 7 6M16 4.5a3.5 3.5 0 0 1 0 7M18 14c2.5.6 4 2.4 4 6"/>',db:'<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>',heart:'<path d="M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.5A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11Z"/>'});
const ACCOUNTS={'operator.demo@neduet.edu.pk':{name:'Data Operator',role:'operator',pw:'Demo@Operator26'},'chairman.demo@neduet.edu.pk':{name:'Chairman CISE',role:'chairman',pw:'Demo@Chairman26'},'vc.demo@neduet.edu.pk':{name:'Vice Chancellor',role:'vc',pw:'Demo@Vice26'}};
const ROLES={
 operator:{name:'Data Operator',title:'Data-Entry Operator Workspace',sub:'Department of Computer & Information Systems Engineering (CISE)',img:'cis-sign.webp',tabs:[['drafts','My Drafts'],['requests','My Approval Requests']]},
 chairman:{name:'Department Chairman',title:'Department Chairman Console',sub:'Department of Computer & Information Systems Engineering (CISE)',img:'cis-day.webp',tabs:[['approvals','Approvals Queue'],['health','Data Health Report'],['schemes','Curriculum Schemes'],['imports','Imports Queue']]},
 vc:{name:'Vice Chancellor',title:'Vice Chancellor Executive Console',sub:'NED University of Engineering & Technology (University-Wide Governance)',img:'ned-aerial.webp',tabs:[['escal','Major Escalations'],['releases','Releases & Rollbacks'],['purge','Purge Queue'],['security','Security & Lockouts']]}};
const Adm={tab:null,step:'creds',email:null,code:null};
const sess=()=>{const s=store.get('adm.session',null);return s&&s.exp>Date.now()?s:null};
const titleOf=c=>{const p=c.payload,T={prereq_add:()=>`Add prerequisite ${p.from} → ${p.to}`,prereq_remove:()=>`Remove prerequisite ${p.from} → ${p.to}`,prof_tag:()=>`Add "${label(p.tag)}" to ${(Data.base.profs.find(q=>q.slug===p.slug)||{}).name}`,fyp_tag:()=>`Add "${label(p.tag)}" to FYP "${((Data.base.fyps.find(q=>q.id===p.id)||{}).title||'').slice(0,40)}"`,career_course:()=>`Add ${p.code} to the ${(Data.tracks.find(t=>t.slug===p.slug)||{}).title} track`,remove:()=>`Remove ${p.kind==='fyp'?'FYP':'professor'}: ${p.title}`,prereq_batch:()=>`Import ${p.edges.length} prerequisite links`,scheme_publish:()=>`Publish ${p.name}`};return T[c.type]()};
const MODULE={prereq_add:'Curriculum',prereq_remove:'Curriculum',prereq_batch:'Curriculum',scheme_publish:'Curriculum',prof_tag:'Professors',fyp_tag:'FYP',career_course:'Career',remove:'Removal'};
const IMPACT={prereq_add:'MAJOR',prereq_remove:'MAJOR',prereq_batch:'MAJOR',scheme_publish:'MAJOR',prof_tag:'MINOR',fyp_tag:'MINOR',career_course:'MINOR',remove:'MINOR'};
function mk(type,payload,by,status='draft'){const c={id:'CIS-2026-'+hex(),type,payload,module:MODULE[type],impact:IMPACT[type],status,by,created:Date.now(),log:[]};c.title=titleOf(c);return c}
function seed(){
  const s={changes:[],releases:[],deletions:[],events:[],audit:[],lock:{},clock:0,purges:{},schemes:[]};
  const op='operator.demo@neduet.edu.pk',p=Data.base.profs[0],f=Data.base.fyps[0];
  const t1=allTags().find(t=>!p.domain_tags.includes(t)),t2=allTags().find(t=>!f.domain_tags.includes(t));
  if(p&&t1){const c=mk('prof_tag',{slug:p.slug,tag:t1},op);c.title='[Demo sample] '+c.title;s.changes.push(c)}
  if(f&&t2){const c=mk('fyp_tag',{id:f.id,tag:t2},op,'pending_chairman');c.title='[Demo sample] '+c.title;c.log.push({at:Date.now()-36e5,who:'Data Operator',a:'Submitted for approval'});s.changes.push(c)}
  return s}
const st=()=>{let s=store.get('adm',null);if(!s){s=seed();store.set('adm',s)}return s};
const save=s=>store.set('adm',s);
const nowE=s=>Date.now()+s.clock*DAY;
function audit(s,me,action,detail){s.audit.unshift({at:Date.now(),email:me.email,role:me.role,action,detail});s.audit=s.audit.slice(0,60)}
function ev(s,email,event){s.events.unshift({at:Date.now(),email,event});s.events=s.events.slice(0,60)}
function applyOne(type,p){
  if(type==='prereq_add'){if(!Data.edges.some(e=>e.from===p.from&&e.to===p.to))Data.edges.push({from:p.from,to:p.to,confidence:'high',note:'Added through the admin console',group:false,admin:true})}
  else if(type==='prereq_remove')Data.edges=Data.edges.filter(e=>!(e.from===p.from&&e.to===p.to));
  else if(type==='prereq_batch')p.edges.forEach(x=>applyOne('prereq_add',x));
  else if(type==='prof_tag'){const x=Data.profs.find(q=>q.slug===p.slug);if(x&&!x.domain_tags.includes(p.tag))x.domain_tags.push(p.tag)}
  else if(type==='fyp_tag'){const x=Data.fyps.find(q=>q.id===p.id);if(x&&!x.domain_tags.includes(p.tag))x.domain_tags.push(p.tag)}
  else if(type==='career_course'){const t=Data.tracks.find(q=>q.slug===p.slug);if(t&&!t.relevant_courses.includes(p.code))t.relevant_courses.push(p.code)}
  else if(type==='remove'){if(p.kind==='fyp')Data.fyps=Data.fyps.filter(x=>x.id!==p.ref);else Data.profs=Data.profs.filter(x=>x.slug!==p.ref)}
}
window.applyAdminOverrides=()=>{if(!Data.base)return;const b=clone(Data.base);Data.edges=b.edges;Data.profs=b.profs;Data.fyps=b.fyps;Data.tracks=b.tracks;
  [...st().releases].reverse().filter(r=>r.status==='live').forEach(r=>applyOne(r.type,r.payload));Graph.build()};
function describe(c){const p=c.payload;
  if(c.type==='prereq_add'||c.type==='prereq_remove'){const cur=Graph.adj[p.to]||[];return[`${p.to} needs: ${cur.join(', ')||'nothing listed'}`,`${p.to} needs: ${(c.type==='prereq_add'?[...cur,p.from]:cur.filter(x=>x!==p.from)).join(', ')||'nothing listed'}`]}
  if(c.type==='prof_tag'){const x=Data.base.profs.find(q=>q.slug===p.slug)||{domain_tags:[]};return[x.domain_tags.map(label).join(', ')||'No topics',[...x.domain_tags,p.tag].map(label).join(', ')]}
  if(c.type==='fyp_tag'){const x=Data.base.fyps.find(q=>q.id===p.id)||{domain_tags:[]};return[x.domain_tags.map(label).join(', ')||'No topics',[...x.domain_tags,p.tag].map(label).join(', ')]}
  if(c.type==='career_course'){const t=Data.tracks.find(q=>q.slug===p.slug)||{relevant_courses:[]};return[t.relevant_courses.join(', '),[...t.relevant_courses,p.code].join(', ')]}
  if(c.type==='remove')return['Visible to students',`Hidden now, deleted after a waiting period of ${WAIT} days (can be restored)`];
  if(c.type==='prereq_batch')return['Current prerequisite links',`${p.edges.length} new links:\n`+p.edges.map(e=>`${e.from} → ${e.to}`).join('\n')];
  return['Scheme 2022 stays live',`${p.name} becomes the live scheme`]}
const WAIT=14;
function checkEdge(f,t,pending=[]){f=normCode(f);t=normCode(t);const A=Data.C[f],B=Data.C[t];
  if(!A||A.type!=='course')return`Unknown course "${f}"`;if(!B||B.type!=='course')return`Unknown course "${t}"`;
  if(f===t)return'A course cannot need itself';
  if(A.semester>=B.semester)return`${f} is in semester ${A.semester} and must come before ${t} (semester ${B.semester})`;
  if(Data.edges.some(e=>e.from===f&&e.to===t)||pending.some(e=>e.from===f&&e.to===t))return'This link already exists';
  if(Graph.upstream(f).has(t))return'This link would create a loop';return null}
function publish(s,c,me){c.status='approved';c.approvedBy=me.name;c.log.push({at:Date.now(),who:me.name,a:'Approved and published'});
  const rel={id:'REL-2026-'+String(s.releases.length+1).padStart(3,'0')+'-'+hex(),changeId:c.id,title:c.title,module:c.module,type:c.type,payload:c.payload,at:Date.now(),by:me.name,status:'live'};
  s.releases.unshift(rel);
  if(c.type==='remove')s.deletions.unshift({id:'DEL-'+hex(),relId:rel.id,kind:c.payload.kind,ref:c.payload.ref,title:c.payload.title,approvedAt:nowE(s),until:nowE(s)+WAIT*DAY,status:'waiting'});
  audit(s,me,'publish',c.id+' · '+c.title)}
function approve(id){const s=st(),me=sess(),c=s.changes.find(x=>x.id===id);if(!c)return;
  if(me.role==='chairman'&&c.status==='pending_chairman'){if(c.impact==='MAJOR'){c.status='pending_vc';c.log.push({at:Date.now(),who:me.name,a:'Signed off, sent to the Vice Chancellor (major change)'});audit(s,me,'sign_off',c.id)}else publish(s,c,me)}
  else if(me.role==='vc'&&c.status==='pending_vc')publish(s,c,me);
  save(s);applyAdminOverrides()}
function reject(id,why){const s=st(),me=sess(),c=s.changes.find(x=>x.id===id);c.status='rejected';c.note=why;c.log.push({at:Date.now(),who:me.name,a:'Rejected: '+why});audit(s,me,'reject',c.id);save(s)}
function rollback(relId){const s=st(),me=sess(),r=s.releases.find(x=>x.id===relId);r.status='rolled_back';r.rolledBackAt=Date.now();
  const d=s.deletions.find(x=>x.relId===relId&&x.status==='waiting');if(d)d.status='restored';audit(s,me,'rollback',r.id);save(s);applyAdminOverrides()}
const purgedToday=s=>s.purges[new Date(nowE(s)).toDateString()]||0;

/* ---- modals ---- */
function modal(html){closeModal();const d=document.createElement('div');d.id='amodal';d.className='amodal';d.innerHTML=`<div class="amodal-bg" data-mclose></div><div class="amodal-box" role="dialog" aria-modal="true">${html}</div>`;document.body.append(d);d.addEventListener('click',e=>{if(e.target.closest('[data-mclose]'))closeModal()});return d}
const closeModal=()=>$('#amodal')?.remove();
function stepUp(title,text,ok,danger){const code=String(Math.floor(100000+Math.random()*900000));
  const d=modal(`<h3>${title}</h3><p class="muted small" style="margin:6px 0 14px">${text}</p><p class="small" style="margin-bottom:12px">A one-time code is required. <b>Demo mode:</b> your code is <b class="num" style="letter-spacing:.12em;color:#7DB9FF">${code}</b> (in the real system it is emailed).</p><div class="field" style="margin-bottom:6px"><label for="otp">One-time code</label><input class="input" id="otp" inputmode="numeric" maxlength="6" autocomplete="one-time-code"></div><p class="err" id="oerr" role="alert"></p><div style="display:flex;gap:10px;justify-content:flex-end;margin-top:10px"><button class="btn btn-line btn-sm" data-mclose>Cancel</button><button class="btn ${danger?'btn-danger':'btn-primary'} btn-sm" id="ook">Confirm</button></div>`);
  $('#otp',d).focus();const go=()=>{if($('#otp',d).value.trim()!==code){$('#oerr',d).textContent='That code is not correct.';return}closeModal();ok()};$('#ook',d).onclick=go;$('#otp',d).onkeydown=e=>{if(e.key==='Enter')go()}}
function askReason(title,ok){const d=modal(`<h3>${title}</h3><div class="field" style="margin:14px 0 6px"><label for="why">Reason (the operator will see this)</label><textarea class="input" id="why" style="min-height:90px"></textarea></div><p class="err" id="werr"></p><div style="display:flex;gap:10px;justify-content:flex-end"><button class="btn btn-line btn-sm" data-mclose>Cancel</button><button class="btn btn-danger btn-sm" id="wok">Reject</button></div>`);
  $('#wok',d).onclick=()=>{const v=$('#why',d).value.trim();if(v.length<3){$('#werr',d).textContent='Please write a short reason.';return}closeModal();ok(v)}}

/* ---- views ---- */
const tag=(t,k)=>`<span class="tag ${k||''}">${t}</span>`;
const impact=i=>tag(i,i==='MAJOR'?'warn':'maroon');
const STATUS={draft:['Draft',''],pending_chairman:['Waiting for Chairman','gold'],pending_vc:['Waiting for Vice Chancellor','gold'],approved:['Published','ok'],rejected:['Rejected','bad'],withdrawn:['Withdrawn','']};
const table=(head,rows,empty)=>rows.length?`<div class="atable-wrap"><table class="atable"><thead><tr>${head.map(h=>`<th${h==='Actions'?' class="ra"':''}>${h}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`:`<div class="empty"><h3>${empty[0]}</h3><p>${empty[1]}</p></div>`;
const mid=id=>`<span class="mono gold">${id}</span>`;
function counts(me,s){return{drafts:s.changes.filter(c=>c.status==='draft'&&c.by===me.email).length,requests:s.changes.filter(c=>c.status!=='draft'&&c.by===me.email).length,approvals:s.changes.filter(c=>c.status==='pending_chairman').length,health:healthChecks().filter(x=>x.sev!=='ok').length,schemes:s.schemes.length,imports:0,escal:s.changes.filter(c=>c.status==='pending_vc').length,releases:s.releases.filter(r=>r.status==='live').length,purge:s.deletions.filter(d=>d.status==='waiting').length,security:Object.values(s.lock).filter(l=>l.until>nowE(s)).length}}
function healthChecks(){const out=[];const add=(k,sev,n,t,h)=>out.push({k,sev,n,t,h});
  add('prof_name',Data.profsMissingName?'bad':'ok',Data.profsMissingName,'Professor records with no name',Data.profsMissingName?'Hidden from students until a name is added.':'All professor records have a name.');
  const nr=Data.profs.filter(p=>p.review_status!=='approved').length;add('prof_rev',nr?'warn':'ok',nr,'Professor profiles not yet approved','Extracted records should be reviewed before publication.');
  const nc=Data.profs.filter(p=>!p.contact_route).length;add('prof_contact',nc?'warn':'ok',nc,'Professors without a contact route','Students cannot pre-fill an email address for them.');
  const nu=Data.fyps.filter(p=>!p.domain_tags.length).length;add('fyp_tag',nu?'warn':'ok',nu,'FYPs without a topic tag','Untagged projects are missing from topic filters and similar-project suggestions.');
  const yrs=[...new Set(Data.fyps.map(p=>p.year))];add('fyp_year',yrs.length<2?'warn':'ok',yrs.length,'FYP years covered',`Years present: ${yrs.join(', ')}.`);
  const un=Data.edges.filter(e=>e.confidence!=='high').length;add('edge_unv',un?'warn':'ok',un,'Prerequisite links not yet verified','Confirm them against the Scheme of Studies.');
  const np=Data.courses.filter(c=>c.semester>1&&!Graph.adj[c.code].length).length;add('edge_none',np?'warn':'ok',np,'Courses after semester 1 with no listed prerequisite','Either they have none, or the link is still missing.');
  add('cycle',Graph.cycle?'bad':'ok',Graph.cycle?1:0,'Prerequisite loops',Graph.cycle?'A loop blocks publication of the curriculum.':'No loops found.');
  const bad=Data.tracks.flatMap(t=>t.relevant_courses.filter(c=>!Data.C[c]).map(c=>t.slug+':'+c));add('career_ref',bad.length?'bad':'ok',bad.length,'Career tracks pointing to unknown courses',bad.length?bad.join(', '):'Every referenced course exists.');
  return out}
function semCredits(){return[1,2,3,4,5,6,7,8].map(n=>Data.nodes.filter(c=>c.semester===n&&!c.elective_group).reduce((a,c)=>a+c.credits,0))}
function validateScheme(){const lim=store.get('maxcr',DEFAULT_MAX_CREDITS),sc=semCredits();const order=Data.edges.filter(e=>Data.C[e.from].semester>=Data.C[e.to].semester);
  return[['V01 No prerequisite loops',!Graph.cycle,Graph.cycle?'A loop was found.':'No loops.'],['V02 Prerequisites come in earlier semesters',!order.length,order.length?order.map(e=>e.from+'→'+e.to).join(', '):'All links point forward.'],['V03 Credit hours per semester within '+lim,sc.every(x=>x<=lim),'Per semester: '+sc.join(', ')],['V04 Every course has a semester',Data.courses.every(c=>c.semester>=1&&c.semester<=8),Data.courses.length+' courses placed.']]}

function loginView(){
  return `<div class="alogin"><div class="alogin-art" style="background-image:url(img/cis-day.webp)"><a class="brand" href="#/"><img src="img/ned-logo.png" alt="" width="42" height="42"><span><b>Edu<span>Compass</span></b><small>NED · Dept. of CISE</small></span></a><div><span class="pill">Admin console</span><h2>Keep the curriculum accurate, and every change accountable.</h2><p>Drafts, sign-off and releases for the Department of Computer & Information Systems Engineering.</p></div></div>
  <div class="alogin-form"><div class="alogin-card"><a href="#/" class="small muted">← Back to student site</a><h1 id="at">Admin sign-in</h1><p class="muted" id="as">Use your department email and password. A one-time code follows.</p>
  <form id="af" novalidate><div id="s1"><div class="field"><label for="ae">Email</label><input class="input" id="ae" type="email" autocomplete="username"></div><div class="field"><label for="ap">Password</label><div class="pw"><input class="input" id="ap" type="password" autocomplete="current-password"><button type="button" id="aps">Show</button></div></div></div>
  <div id="s2" hidden><div class="field"><label for="ac">One-time code</label><input class="input" id="ac" inputmode="numeric" maxlength="6" autocomplete="one-time-code"></div><p class="hint" id="ah"></p></div>
  <p class="err" id="aerr" role="alert"></p><button class="btn btn-primary" style="width:100%" id="ab">Continue</button></form>
  <div class="notice info" style="margin-top:22px">${ic('info')}<span><b>Demo mode.</b> Pick a role to fill the form. Accounts and changes stay in this browser until the real API is connected.</span></div>
  <div class="demoacc">${Object.entries(ACCOUNTS).map(([e,a])=>`<button type="button" class="chip" data-fill="${e}">${ROLES[a.role].name}</button>`).join('')}</div></div></div></div>`}
function loginAfter(){
  const f=$('#af');if(!f)return;Adm.step='creds';
  $$('[data-fill]').forEach(b=>b.onclick=()=>{$('#ae').value=b.dataset.fill;$('#ap').value=ACCOUNTS[b.dataset.fill].pw;$('#aerr').textContent=''});
  $('#aps').onclick=e=>{const p=$('#ap');p.type=p.type==='password'?'text':'password';e.target.textContent=p.type==='password'?'Show':'Hide'};
  f.onsubmit=e=>{e.preventDefault();const err=$('#aerr');err.textContent='';const s=st();
    if(Adm.step==='creds'){const em=$('#ae').value.trim().toLowerCase(),pw=$('#ap').value;const lk=s.lock[em]||{n:0,until:0};
      if(lk.until>nowE(s)){err.textContent=`This account is locked. Try again in ${Math.ceil((lk.until-nowE(s))/6e4)} min.`;return}
      const a=ACCOUNTS[em];if(!a||a.pw!==pw){lk.n++;ev(s,em||'unknown','Wrong password');if(lk.n>=5){lk.until=nowE(s)+15*6e4;lk.n=0;ev(s,em,'Account locked for 15 minutes')}s.lock[em]=lk;save(s);err.textContent='Email or password is incorrect.';return}
      s.lock[em]={n:0,until:0};save(s);Adm.email=em;Adm.code=String(Math.floor(100000+Math.random()*900000));Adm.step='code';
      $('#s1').hidden=true;$('#s2').hidden=false;$('#at').textContent='Enter your code';$('#as').textContent='We sent a 6-digit code to '+em;$('#ah').innerHTML=`<b>Demo mode:</b> your code is <b class="num" style="color:#7DB9FF;letter-spacing:.12em">${Adm.code}</b>`;$('#ab').textContent='Sign in';$('#ac').focus()}
    else{if($('#ac').value.trim()!==Adm.code){ev(s,Adm.email,'Wrong one-time code');save(s);err.textContent='That code is not correct.';return}
      const a=ACCOUNTS[Adm.email];store.set('adm.session',{email:Adm.email,name:a.name,role:a.role,exp:Date.now()+8*36e5});ev(s,Adm.email,'Signed in');save(s);Adm.tab=null;toast('Signed in as '+a.name);admRender()}}}

function dashView(me){
  const s=st(),R=ROLES[me.role],n=counts(me,s);Adm.tab=R.tabs.some(t=>t[0]===Adm.tab)?Adm.tab:R.tabs[0][0];
  const stats={operator:[['My drafts',n.drafts],['Waiting for sign-off',s.changes.filter(c=>c.by===me.email&&/^pending/.test(c.status)).length],['Published',s.changes.filter(c=>c.by===me.email&&c.status==='approved').length],['Rejected',s.changes.filter(c=>c.by===me.email&&c.status==='rejected').length]],
    chairman:[['Waiting for sign-off',n.approvals],['Health issues',n.health],['Sent to Vice Chancellor',n.escal],['Live releases',n.releases]],
    vc:[['Major escalations',n.escal],['Live releases',n.releases],['Deletions waiting',n.purge],['Locked accounts',n.security]]}[me.role];
  const lab=t=>`${t[1]}${n[t[0]]?` <i class="cnt">${n[t[0]]}</i>`:''}`;
  return `<section class="ahero" style="--img:url(img/${R.img})"><div class="awrap"><span class="pill">${ic('shield')} ${R.name} · Admin console · Demo mode</span><h1>${R.title}</h1><p class="sub">${R.sub}</p><div class="astats">${stats.map(x=>`<div><b class="num">${x[1]}</b><span>${x[0]}</span></div>`).join('')}</div></div></section>
  <div class="awrap abody"><div class="notice info" style="margin-bottom:18px">${ic('info')}<span>Changes are never written straight to live data. Each one is a draft that needs sign-off, then it becomes a release that can be rolled back. Individual student records are never shown here.</span></div>
  <nav class="atabs" aria-label="Sections">${R.tabs.map(t=>`<button class="chip" data-tab="${t[0]}" aria-pressed="${Adm.tab===t[0]}">${lab(t)}</button>`).join('')}</nav>
  <div class="panel apanel" id="apanel">${tabView(me,s)}</div></div>`}
function tabView(me,s){const t=Adm.tab;
  if(t==='drafts'){const L=s.changes.filter(c=>c.status==='draft'&&c.by===me.email);
    return `<div class="panel-h"><div><h2>My open drafts</h2><small class="muted">Staged changes waiting to be submitted</small></div><button class="btn btn-primary btn-sm" data-act="newdraft">+ New draft entry</button></div>`+table(['Resource','Draft title','Impact','Created','Actions'],L.map(c=>`<tr><td><b class="gold">${c.module.toUpperCase()}</b></td><td>${esc(c.title)}<div class="small muted">${mid(c.id)}</div></td><td>${impact(c.impact)}</td><td class="small muted">${fmt(c.created)}</td><td class="acts"><button class="btn btn-primary btn-sm" data-act="submit" data-id="${c.id}">Submit for approval</button><button class="btn btn-line btn-sm" data-act="deldraft" data-id="${c.id}" aria-label="Delete draft">${ic('trash')}</button></td></tr>`),['No open drafts','Use "New draft entry" to stage your first change.'])}
  if(t==='requests'){const L=s.changes.filter(c=>c.status!=='draft'&&c.by===me.email);
    return `<div class="panel-h"><div><h2>My approval requests</h2><small class="muted">Everything you have submitted</small></div></div>`+table(['Request','Module','Impact','Status','Actions'],L.map(c=>{const [sl,sk]=STATUS[c.status];return `<tr><td>${esc(c.title)}<div class="small muted">${mid(c.id)}${c.note?` · <span class="bad-t">${esc(c.note)}</span>`:''}</div></td><td>${c.module}</td><td>${impact(c.impact)}</td><td>${tag(sl,sk)}</td><td class="acts">${c.status==='pending_chairman'?`<button class="btn btn-line btn-sm" data-act="withdraw" data-id="${c.id}">Withdraw</button>`:''}<button class="btn btn-line btn-sm" data-act="review" data-id="${c.id}">Details</button></td></tr>`}),['Nothing submitted yet','Submitted drafts appear here with their status.'])}
  if(t==='approvals'||t==='escal'){const st_=t==='approvals'?'pending_chairman':'pending_vc';const L=s.changes.filter(c=>c.status===st_);
    return `<div class="panel-h"><div><h2>${t==='approvals'?'Department approvals queue':'Major escalations'}</h2><small class="muted">${t==='approvals'?'Review operator drafts and sign off with a one-time code':'Major curriculum changes need Vice Chancellor approval'}</small></div></div>`+table(['Change set','Module','Submitted by','Impact','Actions'],L.map(c=>`<tr><td>${esc(c.title)}<div class="small muted">${mid(c.id)} · ${fmt(c.created)}</div></td><td>${c.module}</td><td class="small">${esc(c.by.split('@')[0])}</td><td>${impact(c.impact)}</td><td class="acts"><button class="btn btn-line btn-sm" data-act="review" data-id="${c.id}">${ic('eye')} Review</button><button class="btn btn-line btn-sm" data-act="rej" data-id="${c.id}">Reject</button><button class="btn btn-primary btn-sm" data-act="app" data-id="${c.id}">Approve →</button></td></tr>`),['Nothing waiting for sign-off','New requests appear here as soon as they are submitted.'])}
  if(t==='health'){const H=healthChecks();return `<div class="panel-h"><div><h2>Data health report</h2><small class="muted">Computed live from the data the students see</small></div></div>`+table(['Check','Result','Severity','What it means'],H.map(x=>`<tr><td>${x.t}</td><td class="num"><b>${x.n}</b></td><td>${tag(x.sev==='ok'?'OK':x.sev==='warn'?'Warning':'Problem',x.sev==='ok'?'ok':x.sev==='warn'?'warn':'bad')}</td><td class="small muted">${x.h}</td></tr>`),['',''])}
  if(t==='schemes'){const sc=semCredits(),val=Adm.val;return `<div class="panel-h"><div><h2>Curriculum schemes</h2><small class="muted">Versions are locked once published. Edit by cloning.</small></div></div>
    <div class="scard"><div><b>Scheme 2022</b> ${tag('Published','ok')}<div class="small muted" style="margin-top:4px">${esc(Data.program.degree)} · ${Data.courses.length} courses · about ${totalCredits()} credit hours</div></div><div class="acts"><button class="btn btn-line btn-sm" data-act="validate">Validate</button><button class="btn btn-primary btn-sm" data-act="clone">Clone as new draft</button></div></div>
    ${val?`<div class="vres">${val.map(v=>`<div class="vrow">${tag(v[1]?'Pass':'Fail',v[1]?'ok':'bad')}<span><b>${v[0]}</b><div class="small muted">${esc(v[2])}</div></span></div>`).join('')}</div>`:''}
    ${s.schemes.map(x=>{const pend=s.changes.find(c=>c.type==='scheme_publish'&&c.payload.name===x.name&&/^pending/.test(c.status));const live=s.releases.find(r=>r.type==='scheme_publish'&&r.payload.name===x.name&&r.status==='live');return `<div class="scard"><div><b>${esc(x.name)}</b> ${tag(live?'Published':pend?'In review':'Draft',live?'ok':pend?'gold':'')}<div class="small muted" style="margin-top:4px">Cloned from Scheme 2022 · ${fmtD(x.created)}</div></div><div class="acts">${!pend&&!live?`<button class="btn btn-primary btn-sm" data-act="schemesub" data-id="${x.id}">Send to Vice Chancellor</button>`:''}</div></div>`}).join('')}`}
  if(t==='imports')return `<div class="panel-h"><div><h2>Imports queue</h2><small class="muted">Upload prerequisite links as CSV. Rows are checked before anything is staged.</small></div><button class="btn btn-line btn-sm" data-act="tpl">Download template</button></div><div class="drop"><input type="file" id="impf" accept=".csv,text/csv" aria-label="Choose CSV file"><p class="small muted" style="margin-top:8px">Columns: <b>from_course, to_course</b> (the first is the prerequisite). Maximum 100 rows.</p></div><div id="impres">${Adm.imp?impView():''}</div>`;
  if(t==='releases')return `<div class="panel-h"><div><h2>Immutable releases & emergency rollback</h2><small class="muted">Every published change is a numbered release</small></div></div>`+table(['Release','Module','Published by','Date','Status','Actions'],s.releases.map(r=>`<tr><td>${mid(r.id)}<div class="small">${esc(r.title)}</div></td><td>${r.module}</td><td class="small">${esc(r.by)}</td><td class="small muted">${fmt(r.at)}</td><td>${tag(r.status==='live'?'Live':'Rolled back',r.status==='live'?'ok':'')}</td><td class="acts">${r.status==='live'?`<button class="btn btn-danger btn-sm" data-act="rb" data-id="${r.id}">Emergency rollback</button>`:''}</td></tr>`),['No releases yet','Approved changes become releases here.']);
  if(t==='purge'){const L=s.deletions;return `<div class="panel-h"><div><h2>Purge queue</h2><small class="muted">Removed items wait ${WAIT} days. Final purge is limited to 5 a day (used today: ${purgedToday(s)}).</small></div><button class="btn btn-line btn-sm" data-act="ff" title="Demo only">Demo: skip 15 days</button></div>`+table(['Item','Type','Available from','Status','Actions'],L.map(d=>{const due=d.until<=nowE(s);return `<tr><td>${esc(d.title)}<div class="small muted">${mid(d.id)}</div></td><td>${d.kind==='fyp'?'FYP':'Professor'}</td><td class="small">${fmtD(d.until)}${d.status==='waiting'&&!due?` <span class="muted">(${Math.ceil((d.until-nowE(s))/DAY)} days)</span>`:''}</td><td>${tag(d.status==='waiting'?'Waiting':d.status==='purged'?'Purged':'Restored',d.status==='waiting'?'gold':d.status==='purged'?'bad':'ok')}</td><td class="acts">${d.status==='waiting'?`<button class="btn btn-line btn-sm" data-act="restore" data-id="${d.id}">Restore</button><button class="btn btn-danger btn-sm" data-act="purge" data-id="${d.id}" ${due&&purgedToday(s)<5?'':'disabled'}>Purge</button>`:''}</td></tr>`}),['Nothing to purge','Removal requests appear here after approval.'])}
  if(t==='security'){const locked=Object.entries(s.lock).filter(([,l])=>l.until>nowE(s));return `<div class="panel-h"><div><h2>Security & lockouts</h2><small class="muted">Sign-in needs email, password and a one-time code. Five wrong passwords lock an account for 15 minutes.</small></div></div>
    <h3 class="sh">Locked accounts</h3>${table(['Account','Locked until','Actions'],locked.map(([e,l])=>`<tr><td>${esc(e)}</td><td class="small">${fmt(l.until)}</td><td class="acts"><button class="btn btn-line btn-sm" data-act="unlock" data-id="${esc(e)}">Unlock</button></td></tr>`),['No locked accounts','Accounts appear here after repeated wrong passwords.'])}
    <h3 class="sh">Recent sign-in events</h3>${table(['When','Account','Event'],s.events.slice(0,10).map(x=>`<tr><td class="small muted">${fmt(x.at)}</td><td class="small">${esc(x.email)}</td><td>${esc(x.event)}</td></tr>`),['No events yet',''])}
    <h3 class="sh">Audit trail</h3>${table(['When','Who','Action','Detail'],s.audit.slice(0,10).map(x=>`<tr><td class="small muted">${fmt(x.at)}</td><td class="small">${esc(x.email.split('@')[0])}</td><td>${tag(x.action)}</td><td class="small">${esc(x.detail)}</td></tr>`),['No actions logged yet',''])}`}
  return''}
function impView(){const r=Adm.imp;return `<div class="vres" style="margin-top:14px">${r.ok.length?`<div class="vrow">${tag(r.ok.length+' valid','ok')}<span>${r.ok.map(e=>`${e.from} → ${e.to}`).join(', ')}</span></div>`:''}${r.err.map(x=>`<div class="vrow">${tag('Row '+x.row,'bad')}<span>${esc(x.msg)}</span></div>`).join('')}</div>${r.ok.length?`<button class="btn btn-primary btn-sm" style="margin-top:14px" data-act="impstage">Send ${r.ok.length} valid link${r.ok.length>1?'s':''} to the Vice Chancellor</button>`:''}`}
function reviewDrawer(id){const s=st(),me=sess(),c=s.changes.find(x=>x.id===id);const [b,a]=describe(c);const [sl,sk]=STATUS[c.status];
  const can=(me.role==='chairman'&&c.status==='pending_chairman')||(me.role==='vc'&&c.status==='pending_vc');
  openDrawer(`<div class="drawer-top"><span class="mono gold">${c.id}</span><button class="x" data-close aria-label="Close">${ic('x')}</button></div><h2>${esc(c.title)}</h2><div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">${impact(c.impact)}${tag(c.module)}${tag(sl,sk)}</div><dl class="kv"><dt>Submitted by</dt><dd>${esc(c.by)}</dd><dt>Created</dt><dd>${fmt(c.created)}</dd></dl>
  <h3 class="sh">What changes</h3><div class="diff"><div class="dbefore"><small>Before</small><pre>${esc(b)}</pre></div><div class="dafter"><small>After</small><pre>${esc(a)}</pre></div></div>
  ${c.log.length?`<h3 class="sh">History</h3>${c.log.map(l=>`<div class="small" style="padding:4px 0"><span class="muted">${fmt(l.at)}</span> · ${esc(l.who)}: ${esc(l.a)}</div>`).join('')}`:''}
  ${can?`<div style="display:flex;gap:10px;margin-top:20px"><button class="btn btn-line" data-act="rej" data-id="${c.id}">Reject</button><button class="btn btn-primary" data-act="app" data-id="${c.id}">Approve →</button></div>`:''}`)}
function newDraft(){const profs=Data.profs,tracks=Data.tracks;
  const d=openDrawer(`<div class="drawer-top"><span class="tag maroon">New draft entry</span><button class="x" data-close aria-label="Close">${ic('x')}</button></div><h2>Stage a change</h2><p class="muted small" style="margin:8px 0 18px">It stays a draft until you submit it for approval.</p>
  <div class="field"><label for="dt">What do you want to change?</label><select class="select" id="dt"><option value="prof_tag">Add a research topic to a professor</option><option value="fyp_tag">Add a topic to a past FYP</option><option value="career_course">Add a course to a career track</option><option value="prereq_add">Propose a prerequisite link</option><option value="remove">Request removal of a FYP or professor</option></select></div><div id="df"></div><p class="err" id="derr" role="alert"></p><button class="btn btn-primary" id="dsave">Save as draft</button>`);
  const opt=(a,v,l)=>a.map(x=>`<option value="${v(x)}">${l(x)}</option>`).join('');
  const tagsel=`<div class="field"><label for="d2">Topic</label><select class="select" id="d2">${opt(allTags(),t=>t,t=>label(t))}</select></div>`;
  const forms={prof_tag:()=>`<div class="field"><label for="d1">Professor</label><select class="select" id="d1">${opt(profs,p=>p.slug,p=>esc(p.name))}</select></div>${tagsel}`,
   fyp_tag:()=>`<div class="field"><label for="d1">Project</label><select class="select" id="d1">${opt(Data.fyps,p=>p.id,p=>esc(p.title.slice(0,70)))}</select></div>${tagsel}`,
   career_course:()=>`<div class="field"><label for="d1">Career track</label><select class="select" id="d1">${opt(tracks,t=>t.slug,t=>esc(t.title))}</select></div><div class="field"><label for="d2">Course</label><select class="select" id="d2">${opt(Data.courses,c=>c.code,c=>c.code+' '+esc(c.title))}</select></div>`,
   prereq_add:()=>`<div class="field"><label for="d1">Prerequisite (must be passed first)</label><select class="select" id="d1">${opt(Data.courses,c=>c.code,c=>`${c.code} ${esc(c.title)} (sem ${c.semester})`)}</select></div><div class="field"><label for="d2">Course that needs it</label><select class="select" id="d2">${opt(Data.courses,c=>c.code,c=>`${c.code} ${esc(c.title)} (sem ${c.semester})`)}</select></div><p class="hint">Links are checked for loops and semester order.</p>`,
   remove:()=>`<div class="field"><label for="d0">Type</label><select class="select" id="d0"><option value="fyp">Past FYP</option><option value="professor">Professor</option></select></div><div class="field"><label for="d1">Item</label><select class="select" id="d1"></select></div>`};
  const draw=()=>{const t=$('#dt').value;$('#df').innerHTML=forms[t]();if(t==='remove'){const fill=()=>{const k=$('#d0').value;$('#d1').innerHTML=k==='fyp'?opt(Data.fyps,p=>p.id,p=>esc(p.title.slice(0,70))):opt(profs,p=>p.slug,p=>esc(p.name))};$('#d0').onchange=fill;fill()}};
  $('#dt').onchange=draw;draw();
  $('#dsave').onclick=()=>{const t=$('#dt').value,e=$('#derr');e.textContent='';let p;const v1=$('#d1').value,v2=$('#d2')?.value;
    if(t==='prof_tag')p={slug:v1,tag:v2};else if(t==='fyp_tag')p={id:+v1,tag:v2};else if(t==='career_course')p={slug:v1,code:v2};
    else if(t==='prereq_add'){const m=checkEdge(v1,v2);if(m){e.textContent=m;return}p={from:v1,to:v2}}
    else{const k=$('#d0').value;p={kind:k,ref:k==='fyp'?+v1:v1,title:k==='fyp'?Data.fyps.find(x=>x.id===+v1).title:Data.profs.find(x=>x.slug===v1).name}}
    const [b,a]=[null,null];const s=st(),me=sess();s.changes.unshift(mk(t,p,me.email));save(s);closeDrawer();toast('Draft saved');admRender()}}
function csvTemplate(){const b=new Blob(['from_course,to_course\nCS-116,CS-218\nCS-220,CS-431\n'],{type:'text/csv'});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='prerequisite-links-template.csv';a.click()}
async function readCsv(f){const rows=(await f.text()).split(/\r?\n/).filter(l=>l.trim());if(rows.length&&/from|course/i.test(rows[0]))rows.shift();const ok=[],err=[];if(rows.length>100){err.push({row:'—',msg:'More than 100 rows. Only the first 100 were read.'});rows.length=100}
  rows.forEach((l,i)=>{const [a,b]=l.split(',').map(x=>x&&x.trim());const m=checkEdge(a||'',b||'',ok);if(m)err.push({row:i+2,msg:m});else ok.push({from:normCode(a),to:normCode(b)})});Adm.imp={ok,err};$('#impres').innerHTML=impView()}

/* ---- render + events ---- */
function admRender(){render()}
function bindDash(me){
  $('#app').onclick=e=>{
    const t=e.target.closest('[data-tab]');if(t){Adm.tab=t.dataset.tab;Adm.val=null;admRender();return}
    const b=e.target.closest('[data-act]');if(!b)return;const id=b.dataset.id,a=b.dataset.act,s=st();
    if(a==='logout'){store.del('adm.session');toast('Signed out');admRender()}
    else if(a==='reset'){if(confirm('Reset all demo admin data in this browser?')){store.del('adm');applyAdminOverrides();admRender();toast('Demo data reset')}}
    else if(a==='newdraft')newDraft();
    else if(a==='submit'){const c=s.changes.find(x=>x.id===id);c.status='pending_chairman';c.log.push({at:Date.now(),who:me.name,a:'Submitted for approval'});save(s);toast('Submitted to the Chairman');admRender()}
    else if(a==='deldraft'){s.changes=s.changes.filter(x=>x.id!==id);save(s);admRender()}
    else if(a==='withdraw'){const c=s.changes.find(x=>x.id===id);c.status='withdrawn';save(s);admRender()}
    else if(a==='review')reviewDrawer(id);
    else if(a==='app')stepUp('Sign off and approve','Confirm your identity to approve this change.',()=>{closeDrawer();approve(id);toast('Approved');admRender()});
    else if(a==='rej')askReason('Reject this change',why=>{closeDrawer();reject(id,why);toast('Rejected');admRender()});
    else if(a==='rb')stepUp('Emergency rollback','This takes the release offline and restores the previous data.',()=>{rollback(id);toast('Release rolled back');admRender()},true);
    else if(a==='restore'){const d=s.deletions.find(x=>x.id===id);d.status='restored';const r=s.releases.find(x=>x.id===d.relId);if(r)r.status='rolled_back';audit(s,me,'restore',d.id);save(s);applyAdminOverrides();toast('Restored');admRender()}
    else if(a==='purge')stepUp('Final purge','This permanently deletes the item. It cannot be undone.',()=>{const d=s.deletions.find(x=>x.id===id);d.status='purged';const k=new Date(nowE(s)).toDateString();s.purges[k]=(s.purges[k]||0)+1;audit(s,me,'purge',d.id);save(s);toast('Purged');admRender()},true);
    else if(a==='ff'){s.clock+=15;save(s);admRender()}
    else if(a==='unlock'){s.lock[id]={n:0,until:0};audit(s,me,'unlock',id);save(s);admRender()}
    else if(a==='validate'){Adm.val=validateScheme();admRender()}
    else if(a==='clone'){const y=2026+s.schemes.length;s.schemes.push({id:hex(),name:`Scheme ${y} (draft)`,created:Date.now()});audit(s,me,'clone_scheme','Scheme 2022');save(s);toast('Draft scheme created');admRender()}
    else if(a==='schemesub'){const x=s.schemes.find(q=>q.id===id);const c=mk('scheme_publish',{name:x.name},me.email,'pending_vc');c.log.push({at:Date.now(),who:me.name,a:'Sent to the Vice Chancellor'});s.changes.unshift(c);save(s);toast('Sent to the Vice Chancellor');admRender()}
    else if(a==='tpl')csvTemplate();
    else if(a==='impstage'){const c=mk('prereq_batch',{edges:Adm.imp.ok},me.email,'pending_vc');c.log.push({at:Date.now(),who:me.name,a:'Imported from CSV, sent to the Vice Chancellor'});s.changes.unshift(c);save(s);Adm.imp=null;toast('Sent to the Vice Chancellor');admRender()}};
  $('#impf')?.addEventListener('change',e=>{if(e.target.files[0])readCsv(e.target.files[0])});
}
document.addEventListener('click',e=>{const b=e.target.closest('#drawer-root [data-act]');if(!b||!sess())return;const id=b.dataset.id,a=b.dataset.act;
  if(a==='app')stepUp('Sign off and approve','Confirm your identity to approve this change.',()=>{closeDrawer();approve(id);toast('Approved');admRender()});
  else if(a==='rej')askReason('Reject this change',why=>{closeDrawer();reject(id,why);toast('Rejected');admRender()})});
const cntFor=me=>counts(me,st());
window.AdminNav={
 menu(){const me=sess(),R=me&&ROLES[me.role];
  const head=`<button class="btn btn-sm btn-line admbtn" id="admbtn" aria-haspopup="true" aria-expanded="false">${ic('shield')} Admin ${ic('chev')}</button>`;
  if(!me)return `<div class="dd">${head}<div class="ddmenu" id="admmenu" role="menu" hidden><div class="ddh"><b>Admin panel</b><small>Staff only. Sign in to continue.</small></div><button role="menuitem" data-admtab="">${ic('lock')} Admin sign-in</button></div></div>`;
  const n=cntFor(me);
  return `<div class="dd">${head}<div class="ddmenu" id="admmenu" role="menu" hidden><div class="ddh"><b>${esc(me.name)}</b><small>${esc(me.email)}</small></div>${R.tabs.map(t=>`<button role="menuitem" data-admtab="${t[0]}"><span>${t[1]}</span>${n[t[0]]?`<i class="cnt">${n[t[0]]}</i>`:''}</button>`).join('')}<hr><button role="menuitem" data-admact="reset">${ic('clock')} Reset demo data</button><button role="menuitem" data-admact="logout">${ic('out')} Sign out of admin</button></div></div>`},
 pick(tab){if(tab)Adm.tab=tab;Adm.val=null;if(location.hash.split('?')[0]==='#/admin')render();else go('/admin')},
 act(a){if(a==='logout'){store.del('adm.session');toast('Signed out of admin');render()}
  else if(a==='reset'&&confirm('Reset all demo admin data in this browser?')){store.del('adm');applyAdminOverrides();toast('Demo data reset');render()}}};
routes['/admin']={title:'Admin Console',admin:true,theme:'dark',view(){return sess()?dashView(sess()):loginView()},after(){const me=sess();if(me)bindDash(me);else loginAfter()}};
})();
