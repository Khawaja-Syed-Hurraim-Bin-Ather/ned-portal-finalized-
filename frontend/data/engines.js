/* EduCompass engines: JS ports of core/gpa_engine.py and core/prereq_graph.py, plus data prep. */
const GRADES={'A+':4,'A':4,'A-':3.7,'B+':3.4,'B':3,'B-':2.7,'C+':2.4,'C':2,'C-':1.7,'D+':1.4,'D':1,'F':0};
const GRADE_LIST=Object.keys(GRADES);
const PASS_MIN=1.0;           // assumption: D or above passes (configurable by program)
const DEFAULT_MAX_CREDITS=20; // assumption: replace with the program's real limit
const IMPORTANCE_W={reach:.40,depth:.25,core:.20,gate:.15}; // SRS 3.2.10

const GPA={
  gpa(list){const cr=list.reduce((s,c)=>s+c.credits,0);if(!cr)return 0;return +(list.reduce((s,c)=>s+c.credits*GRADES[c.grade],0)/cr).toFixed(2)},
  cgpa(history,policy='highest'){
    const g={};history.forEach(a=>(g[a.code]??=[]).push(a));
    const eff=Object.values(g).map(arr=>policy==='highest'?arr.reduce((b,a)=>GRADES[a.grade]>GRADES[b.grade]?a:b):arr.reduce((b,a)=>a.sem>b.sem?a:b));
    const cr=eff.reduce((s,c)=>s+c.credits,0);
    const qp=eff.reduce((s,c)=>s+c.credits*GRADES[c.grade],0);
    const cgpa=cr?+(qp/cr).toFixed(2):0;
    let standing='Good standing';if(!cr)standing='No grades yet';else if(cgpa>=3.5)standing="Dean's Honor List";else if(cgpa<2)standing='Academic probation warning';
    return{cgpa,credits:cr,qp,standing,count:eff.length};
  },
  // grade needed in the next n credit hours to reach a target CGPA
  needed(qp,cr,target,n){return n?+((target*(cr+n)-qp)/n).toFixed(2):null}
};

const Data={};
async function loadData(){
  const names=['ned_cse_course_catalog','fyp_projects_sample','career_tracks','faculty_profiles'];
  const [cat,fyp,car,fac]=window.__DATA?names.map(n=>window.__DATA[n]):await Promise.all(names.map(n=>fetch(`data/${n}.json`).then(r=>{if(!r.ok)throw new Error(n);return r.json()})));
  Data.program=cat.program;
  Data.nodes=cat.nodes;
  Data.C=Object.fromEntries(cat.nodes.map(n=>[n.code,n]));
  Data.groups=cat.nodes.filter(n=>n.type==='elective_group');
  Data.courses=cat.nodes.filter(n=>n.type==='course');
  Data.fyps=fyp.map((p,i)=>({...p,id:i}));
  Data.tracks=car.tracks;
  Data.profs=fac.professors.filter(p=>p.name); // one record has no name yet (flagged); hidden until reviewed
  // expand edges that point at an elective group onto its members (catalog: "assumed to apply to all members")
  Data.chartEdges=cat.candidate_edges;
  Data.edges=[];
  cat.candidate_edges.forEach(e=>{
    const t=Data.C[e.to];const tos=t&&t.type==='elective_group'?t.members:[e.to];
    tos.forEach(to=>Data.edges.push({from:e.from,to,confidence:e.confidence,note:e.note,group:t.type==='elective_group'}));
  });
  Data.base=JSON.parse(JSON.stringify({edges:Data.edges,profs:Data.profs,fyps:Data.fyps,tracks:Data.tracks}));
  Data.profsMissingName=fac.professors.filter(p=>!p.name).length;
  Graph.build();
  if(window.applyAdminOverrides)window.applyAdminOverrides();
}

const Graph={
  adj:{},rev:{},anyOf:{},
  build(){
    this.adj={};this.rev={};this.anyOf={};this._dm={};
    Data.courses.forEach(c=>{this.adj[c.code]=[];this.rev[c.code]=[]});
    Data.edges.forEach(e=>{if(this.adj[e.to]&&this.adj[e.from]){this.adj[e.to].push(e.from);this.rev[e.from].push(e.to);if(e.group)(this.anyOf[e.to]??=[]).push(e.from)}});
    this.cycle=this.detectCycle();
    this.maxDepth=Math.max(1,...Data.courses.map(c=>this.depth(c.code)));
  },
  detectCycle(){ // DFS, 3-colour
    const col={};let found=false;
    const dfs=n=>{col[n]=1;for(const p of this.adj[n]||[]){if(col[p]===1){found=true;return}if(!col[p])dfs(p)}col[n]=2};
    Object.keys(this.adj).forEach(n=>{if(!col[n])dfs(n)});return found;
  },
  walk(code,map){const seen=new Set();const go=c=>(map[c]||[]).forEach(n=>{if(!seen.has(n)){seen.add(n);go(n)}});go(code);return seen},
  upstream(c){return this.walk(c,this.adj)},
  downstream(c){return this.walk(c,this.rev)},
  _dm:{},depth(c){if(this._dm[c]!==undefined)return this._dm[c];const d=1+Math.max(0,...(this.rev[c]||[]).map(x=>this.depth(x)));return this._dm[c]=d},
  eligibility(code,passed){const any=this.anyOf[code]||[];const missing=(this.adj[code]||[]).filter(p=>!any.includes(p)&&!passed.has(p));if(any.length&&!any.some(p=>passed.has(p)))missing.push(...any);return{eligible:!missing.length,missing}},
  criticalPath(code){const ps=this.adj[code]||[];if(!ps.length)return[code];let best=[];ps.forEach(p=>{const s=this.criticalPath(p);if(s.length>best.length)best=s});return[...best,code]},
  importance(code){
    const n=Data.courses.length-1;
    const reach=this.downstream(code).size/n;
    const depth=(this.depth(code)-1)/Math.max(1,this.maxDepth-1);
    const cat=Data.C[code].category;
    const core=cat==='core_computing'||cat==='fyp'?1:cat==='mathematics'||cat==='science'?.6:cat==='elective'?.25:.3;
    const deps=this.rev[code]||[];
    const gate=deps.length&&deps.every(d=>(this.adj[d]||[]).length===1)?1:0;
    const parts={reach,depth,core,gate};
    const score=Math.round(100*(IMPORTANCE_W.reach*reach+IMPORTANCE_W.depth*depth+IMPORTANCE_W.core*core+IMPORTANCE_W.gate*gate));
    return{score,parts};
  },
  topo(){const out=[],seen=new Set();const v=c=>{if(seen.has(c))return;seen.add(c);(this.adj[c]||[]).forEach(v);out.push(c)};Object.keys(this.adj).forEach(v);return out},
  // retake is offered in the same term next year (+2 semesters); dependants move to the next matching term
  simulateFail(codes){
    const fs=new Set([].concat(codes));const orig=c=>Data.C[c].semester;const ns={};
    this.topo().forEach(c=>{
      let need=fs.has(c)?orig(c)+2:orig(c);
      (this.adj[c]||[]).forEach(p=>{need=Math.max(need,(ns[p]??orig(p))+1)});
      if(need>orig(c)&&(need-orig(c))%2)need++;ns[c]=need;
    });
    const pushed=Object.keys(ns).filter(c=>!fs.has(c)&&ns[c]>orig(c)).map(c=>({code:c,by:ns[c]-orig(c),to:ns[c]}));
    const blocked=new Set();fs.forEach(f=>this.downstream(f).forEach(d=>{if(!fs.has(d))blocked.add(d)}));
    const last=Math.max(8,...Object.values(ns));
    return{ns,pushed,blocked,retake:ns[[...fs][0]],delay:last-8};
  },
  longestChain(){let best=[];Data.courses.forEach(c=>{const p=this.criticalPath(c.code);if(p.length>best.length)best=p});return best}
};
