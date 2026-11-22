(function(root){
'use strict';
const SE = root.SE, R=SE.R, U=SE.U, D=SE.D, W=SE.W, L=SE.L, P=SE.P, S=SE.S, Rv=SE.Rv, G=SE.G, Ev=SE.Ev, CAL=SE.CAL;
const E = SE.E = {};

E.defaults = ()=>({seed:Date.now()%1e9,year:2020,region:'beiling',type:'ps',troubles:['fin','enr'],diff:'normal',custom:null,phil:'exam',name:'',owner:'校長兼負責人'});

E.newGame = function(o){
  o=Object.assign(E.defaults(),o||{});
  const g={day:{d:0,m:450},watch:[],v:SE.VERSION,seed:o.seed>>>0,rng:{s:o.seed>>>0},nextId:1,y:o.year,w:1,abs:o.year*52+1,opts:{type:o.type,region:o.region,year:o.year,troubles:o.troubles.slice(),diff:o.diff,phil:o.phil},
    status:'play',player:{name:o.owner,personal:0,relaunch:0},schools:[],rivals:[],alumni:[],hall:[],legacyBank:{},cohort:{n:0,dn:0},contracts:[],news:[],hist:[],past:[],
    events:{pending:[],delayed:[],log:[],last:{}},stats:{yearly:[]},flags:{},curId:0};
  g.regionRule = o.region==='xinxing'? D.regionRandom(g,R) : Object.assign({},D.REGIONS[o.region]||D.REGIONS.beiling);
  if(o.region==='xinxing') g.regionRule.n='新星紀元';
  g.diff = o.diff==='custom'? Object.assign({},D.DIFF.normal,o.custom||{}) : Object.assign({},D.DIFF[o.diff]||D.DIFF.normal);
  W.init(g);
  const nm=o.name||(R.pick(g,D.SCH_PRE)+D.TYPES[o.type].sf);
  G.initHQ(g,(o.name||R.pick(g,D.SCH_PRE))+'教育集團');
  Rv.init(g);
  const s=S.genStart(g,{name:nm,type:o.type,troubles:o.troubles,phil:o.phil});
  s.cfg.phil=o.phil; g.schools.push(s); g.curId=s.id;
  { const x=-(s.led.bal.paid||0); L.post(g.hq.led,[['invSub',x],['paid',-x]]); } // 創辦人以實物出資
  for(const t of D.TYPE_ORDER) { /* 預熱市場 */ }
  S.updateQuality(g,s); S.updateRep(g,s); S.rankOf(g,s);
  Rv.dims && g.rivals.forEach(r=>Rv.dims(g,r));
  S.log(g,s,`${g.y}年，${g.regionRule.n}：接手經營不善的「${s.name}」（${D.TYPES[o.type].n}）`,true);
  Ev.info(g,s,'歡迎上任',`您接手了一所問題重重的${D.TYPES[o.type].n}。困境：${(o.troubles.map(t=>D.TROUBLES.find(x=>x.id===t).n).join('、'))||'無'}。先看看財務中心與教職員中心，擬定第一年的對策吧。`);
  return g;
};
E.cur = g=> g.schools.find(s=>s.id===g.curId&&!s.closed)||g.schools[0];

/* ---------- 每週建築與附屬 ---------- */
function buildWeek(g,s){
  let ch=false;
  for(const b of s.bld){
    if(b.prog>0){ b.prog--; if(b.prog<=0){ const a=s.assets.find(x=>x.id===b.aid); if(a&&a.start==null) a.start=g.abs; ch=true; if(b.born===g.y) S.log(g,s,`${D.BLD[b.t].n}完工啟用`,false); } continue; }
    const d=D.BLD[b.t]; let over=0; if(b.t==='classroom') over=Math.max(0,(s.ratio||1)-1)*2;
    b.dur=Math.max(0,b.dur-100/(d.life*52)*(1+over)*(b.dur<35?1.6:1));
  }
  for(const a of s.affil) if(a.prog>0) a.prog--;
  if(ch) S.calc(g,s);
}
function crisis(g,s){
  if(s.insW>=6&&!s.flags.cr1){ s.flags.cr1=1; Ev.info(g,s,`${s.name}發薪困難`,'學校已連續多週無法準時付款，教職員士氣大幅下滑。請儘速借款、出售資產、削減成本或增資。'); }
  if(s.insW<2){ s.flags.cr1=0; s.flags.cr2=0; }
  if(s.insW>=12&&!s.flags.cr2){ s.flags.cr2=1; Ev.spawn(g,s,'insolvent',{}); }
  if(s.insW>=34){ const r=G.liquidate(g,s.id,'破產清算'); if(!g.schools.length){ g.status='broke'; S.log(g,null,'所有學校均已停辦——事業破產，可選擇重新創業。',true); } return true; }
  return false;
}
Ev.T.insolvent={w:0,make:(g,s)=>({title:`${s.name}資金斷鏈`,text:`學校已連續 ${s.insW} 週無法支付款項，債權人催討、教師出走。請決定處置方式。`,opts:[{k:'rest',label:'聲請債務重整',cost:0},{k:'sell',label:'出售學校（止血）',cost:0},{k:'close',label:'停辦清算',cost:0},{k:'hold',label:'硬撐',cost:0}],def:'hold',dl:6,urgent:true}),
  run:(g,s,x,k)=>{ if(k==='rest'){ return G.restructure(g,s.id).msg; } if(k==='sell'){ if(g.schools.length<=1&&false) return ''; const r=G.sell(g,s.id); if(!g.schools.length) g.status='broke'; return r.msg; } if(k==='close'){ const r=G.liquidate(g,s.id,'停辦'); if(!g.schools.length) g.status='broke'; return r.msg; } return '繼續硬撐……'; }};

/* ---------- 一週 ---------- */
E.tick = function(g){
  if(g.status==='broke') return {over:true};
  const w=g.w; const byId=G.byId(g);
  if(w===29){ Rv.year(g); }
  for(const s of g.schools.slice()){
    if(s.closed) continue;
    if(w===CAL.W_SEM1||w===CAL.W_SEM2){ S.billing(g,s); if(g.market||true){ const mk=g.market&&g.market[s.type]; const dem=mk?(mk.dem[s.id]||0):0; S.transferIn(g,s,dem*(s.flags.transferBoost?1+s.flags.transferBoost/100:1)); s.flags.transferBoost=0; } }
    S.studentWeek(g,s);
    if(w===20||w===49) S.exam(g,s);
    if(w===CAL.W_GRAD) S.graduate(g,s);
    if(w===CAL.W_ADMIT){ let mk=g.market&&g.market[s.type]; if(!mk||mk.dem[s.id]===undefined){ mk=S.market(g,s.type); (g.market=g.market||{})[s.type]=mk; } S.admit(g,s,mk.dem[s.id]||0); }
    buildWeek(g,s);
    // NPC 自主行為
    if(CAL.inSession(w)||R.chance(g,.3)){ const inc=P.npcWeek(g,s); for(const i of inc){ if(i.t==='bully'&&g.events.pending.filter(e=>e.tpl==='bully').length<2) Ev.spawn(g,s,'bully',{a:i.a.id,b:i.b.id}); else if(i.t==='conflict') Ev.spawn(g,s,'colConf',{a:i.a.id,b:i.b.id}); } }
    S.weekFin(g,s);
    s.stats.peak=Math.max(s.stats.peak||0,s.students.length);
    if(crisis(g,s)) continue;
  }
  G.hqWeek(g);
  // 特殊事件
  if(w===6){ for(const s of g.schools){ const age=g.y-s.founded; if(age>=10&&age%5===0) Ev.spawn(g,s,'anniv',{n:age}); } }
  if(w===10&&g.world.act.some(a=>a.id==='pand'||a.id==='flu')) for(const s of g.schools) Ev.spawn(g,s,'pandemic',{});
  if(w===20&&g.world.act.some(a=>a.id==='war1'||a.id==='war2')) for(const s of g.schools) Ev.spawn(g,s,'conscript',{});
  Ev.processDelayed(g); Ev.weekly(g); Ev.expire(g);
  // 月末
  if(w===52||CAL.monthOf(w+1)!==CAL.monthOf(w)){
    Rv.month(g); G.hqMonth(g);
    for(const s of g.schools){ if(s.closed) continue; S.month(g,s,byId); if(SE.AI){ if(s.cfg.delegate) SE.AI.manage(g,s,{mode:'principal'}); else SE.AI.baseline(g,s); } }
    if(CAL.monthOf(w)%3===0) for(const s of g.schools) { s.notableCount=g.alumni.filter(a=>a.sid===s.id&&a.nt&&!a.dead).length; }
  }
  if(w===52) E.yearEnd(g);
  for(const e of G.ents(g)) L.settle(g,e);
  // 前進
  g.w++; if(g.w>52){ g.w=1; g.y++; const r=W.yearly(g);
    const s0=E.cur(g);
    if(s0){ for(const n of r.news) Ev.spawn(g,s0,'worldNote',{name:n.name,txt:n.txt}); if(r.reform) Ev.spawn(g,s0,'policyNote',r.reform); for(const n of r.news) S.log(g,null,`世界事件：${n.name}`,true); if(r.reform) S.log(g,null,`政策：${r.reform.t}——${r.reform.x}`,false); }
  }
  g.abs=g.y*52+g.w;
  return {over:g.status==='broke'};
};

E.yearEnd = function(g){
  const y=g.y; const out=[];
  for(const s of g.schools){ if(s.closed) continue;
    S.staffYear(g,s);
    const ni0=L.ni(s.led.bal); if(g.regionRule.tax>0&&ni0>0) L.exp(s,'eTax',ni0*g.regionRule.tax);
    const ni=L.closeYear(s,y);
    const yr=s.led.years[s.led.years.length-1]; let rev=0; for(const k of L.REVS) rev-=(yr.pl[k]||0);
    s.hist.yb.push({y,enr:s.students.length,staff:s.staff.length,cash:L.cash(s),rev:Math.round(rev),ni:Math.round(ni),ov:Math.round(s.rep.ov*10)/10,rank:s.rank.r,rn:s.rank.n,q:Math.round(s.quality),bld:s.bld.length,debt:Math.round(L.debt(s)),phil:s.cfg.phil});
    if(s.hist.yb.length>120) s.hist.yb.shift();
    s.last12rev=Math.max(1,rev);
    s.stats.drop=0; s.stats.out=0; s.stats.inn=0; s.stats.mktSpend=0;
    // 預算重設（交給玩家/代理）
    if(s.cfg.delegate&&SE.AI) SE.AI.budget(g,s);
  }
  L.closeYear(g.hq,y);
  const al=P.alumniYear(g);
  for(const e of al){
    const s=g.schools.find(x=>x.id===e.a.sid&&!x.closed); if(!s) continue;
    if(e.t==='donate'){ L.rev(s,'rDonation',e.amt); if(s.flags.assoc){ const x=Math.round(e.amt*.4); L.post(s.led,[['endow',x],['cash',-x]],'inv','轉入校友基金'); } }
    else if(e.t==='startup'){ S.log(g,s,`校友${e.a.nm}創業成功`,false); }
    else if(e.t==='notable'){ S.log(g,s,`校友${e.a.nm}成為知名人物`,true); }
  }
  g.contracts=g.contracts.filter(c=>c.until>=g.y);
  // 統計
  const ss=g.schools.filter(s=>!s.closed);
  const cons=L.consolidate(g,G.ents(g));
  g.stats.yearly.push({y,cash:Math.round(U.sum(G.ents(g),e=>L.cash(e))),stu:U.sum(ss,s=>s.students.length),staff:U.sum(ss,s=>s.staff.length),n:ss.length,ov:ss.length?Math.round(U.avg(ss,s=>s.rep.ov)*10)/10:0,brand:Math.round(g.group.brand),alum:g.alumni.length,rev:Math.round(cons.is.revT),ni:Math.round(L.ni(cons.led.bal)+0),assets:Math.round(cons.bs.aT)});
  // closeYear 已將損益結轉，這裡以 years 紀錄為準
  const last=U.sum(G.ents(g),e=>(e.led.years[e.led.years.length-1]||{}).ni||0); g.stats.yearly[g.stats.yearly.length-1].ni=Math.round(last);
  if(g.stats.yearly.length>160) g.stats.yearly.shift();
  // 對手平均品質等其他年度更新
  if(g.hall.length>400) g.hall.length=300;
};

/* ---------- 前進 ---------- */
E.hasUrgent = g=> g.events.pending.some(e=>e.urgent);
E.advance = function(g,weeks,o){
  o=o||{}; let n=0; const startPend=g.events.pending.length;
  while(n<weeks&&g.status!=='broke'){
    E.tick(g); n++;
    if(o.stop!==false){ if(E.hasUrgent(g)){ return {weeks:n,stop:'urgent'}; } if(o.stopAny&&g.events.pending.length>startPend) return {weeks:n,stop:'event'}; }
  }
  return {weeks:n,stop:g.status==='broke'?'broke':null};
};
E.weeksTo = function(g,y,w){ return Math.max(0,(y*52+w)-g.abs); };
E.advanceAsync = function(g,weeks,o,progress){
  o=o||{}; let n=0; const startPend=g.events.pending.length;
  return new Promise(resolve=>{
    const step=()=>{
      const t0=Date.now(); let stop=null;
      while(n<weeks&&Date.now()-t0<30&&g.status!=='broke'){
        E.tick(g); n++;
        if(o.stop!==false&&E.hasUrgent(g)){ stop='urgent'; break; }
        if(o.stopAny&&g.events.pending.length>startPend){ stop='event'; break; }
        if(o.abort&&o.abort()){ stop='abort'; break; }
      }
      if(progress) progress(n,weeks);
      if(stop||n>=weeks||g.status==='broke'){ resolve({weeks:n,stop:stop||(g.status==='broke'?'broke':null)}); }
      else setTimeout(step,0);
    };
    step();
  });
};
})(typeof window!=='undefined'?window:globalThis);
