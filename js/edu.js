(function(root){
'use strict';
const SE = root.SE, R=SE.R, U=SE.U, D=SE.D, W=SE.W, L=SE.L, P=SE.P, S=SE.S, CAL=SE.CAL;

/* ---------- 市場 ---------- */
S.poolType = function(g,typeId){
  const reg=g.regionRule;
  const pr=Math.max(W.part(typeId,g.y), typeId===g.opts.type? .08:0);
  const priv=Math.min(.85,1.5*reg.priv*({kg:1.3,ps:.9,jh:.9,hs:1,vh:1,jc:1.2,un:1,gs:1}[typeId])*(g.world.pol.free.includes(typeId)?.6:1));
  return W.cohort(g,typeId)*pr*priv*({kg:1,ps:1,jh:1.2,hs:1.6,vh:1.5,jc:3,un:3.5,gs:4}[typeId])*g.world.demandMult*(1+.05*g.world.cyc);
};
S.poolSize = (g,s)=> S.poolType(g,s.type);
// 回傳 {pool, dem:{id:needed}}；招生需求（申請人基礎數）
S.market = function(g,typeId){
  const parts=[];
  for(const s of g.schools){ if(s.closed||s.type!==typeId) continue; const ph=D.PHIL[s.cfg.phil];
    parts.push({id:s.id,own:s,w:Math.exp(S.cs(g,s)/12)*Math.pow(Math.max(30,s.cap.seats||30),.35)*Math.pow(ph.pool,.6)}); }
  for(const r of g.rivals){ if(r.status!=='active'||r.type!==typeId) continue;
    parts.push({id:r.id,riv:r,w:Math.exp(S.cs(g,r)/12)*Math.pow(Math.max(30,r.cap),.35)}); }
  const tot=U.sum(parts,p=>p.w)||1; const pool=S.poolType(g,typeId); const dem={};
  for(const p of parts){
    let d=pool*p.w/tot;
    if(p.own){ const s=p.own; const dorm=Math.min(1,(s.cap.beds||0)/Math.max(1,s.cfg.quota*D.TYPES[s.type].y*.2));
      const zm=[1,2.5,6,10][s.cfg.zone]; const eff=1+(zm-1)*(s.cfg.zone===0?0:(.3+.7*dorm)); d*=(1+.5*(eff-1))*g.diff.rev;
      d*=(1+(g.group.brand||0)/400); }
    else d*=(1+.1*(p.riv.zone||0));
    dem[p.id]=d;
  }
  return {pool,dem,n:parts.length};
};

/* ---------- 開學：收學費 ---------- */
S.billing = function(g,s){
  const act=s.students.filter(x=>x.st===0); if(!act.length) return;
  const cap=W.tuitionCap(g,s.type); if(s.cfg.tuition>cap) s.cfg.tuition=Math.round(cap);
  const billed=Math.round(act.length*s.cfg.tuition*g.diff.rev);
  const avgFi=U.avg(act,x=>x.fi);
  const c=U.clamp(.97-g.world.unemp*.004-(avgFi<40?.04:0)-(s.insW>0?.02:0),.82,.99);
  const cash=Math.round(billed*c), ar=billed-cash;
  s.led.bal.defRev=(s.led.bal.defRev||0); // 初始化
  L.post(s.led,[['cash',cash],['ar',ar],['defRev',-billed]],'op','學費收款');
  s.semLeft=g.w===36?17:23; if(ar>0) s.arSched.push({amt0:ar,wk:6,coll:0});
};

/* ---------- 週：學生學習與流動 ---------- */
S.studentWeek = function(g,s){
  const sess=CAL.inSession(g.w); const q=s.quality, diff=g.diff.press;
  const out=[];
  if(sess){
    for(const x of s.students){
      if(x.st===1) continue;
      const tgt=16+.40*x.ab+.30*q+.07*x.fe+.12*x.mo+.05*x.hl;
      x.sc=U.clamp(x.sc+(tgt-x.sc)*.035+R.n(g,0,.5),3,99);
      // 退學 / 轉出（機率採週）
      let pd=.00012*(1+(100-x.mo)/60+(x.fi<30?1.5:0)+(x.sc<35?2:0))*diff*(x.sch?.5:1);
      if(s.insW>0) pd*=2;
      if(R.chance(g,pd)){ out.push([x,'drop']); continue; }
      if(x.sat<35 && R.chance(g,.0009*diff)) out.push([x,'out']);
    }
  } else {
    for(const x of s.students){ if(x.st===0){ x.mood=Math.min(100,x.mood+.8); x.mo=Math.min(100,x.mo+.1);} }
  }
  for(const [x,k] of out){
    const i=s.students.indexOf(x); if(i<0) continue; s.students.splice(i,1); P.del(g,x);
    if(k==='drop') s.stats.drop++; else s.stats.out++;
    if(x.key) { P.logOf(x,g,k==='drop'?'退學':'轉學他校'); }
    if(x.key||x.ab>85) S.log(g,s,`學生${x.nm}${k==='drop'?'退學':'轉出'}`,false);
  }
};
S.exam = function(g,s){
  const act=s.students.filter(x=>x.st===0); if(!act.length) return;
  let sum=0,best=null;
  for(const x of act){ const e=U.clamp(x.sc+R.n(g,0,5),0,100); sum+=e; if(x.key&&(!best||e>best[1])) best=[x,e]; }
  s.m.exam=U.clamp(sum/act.length,0,100); s.m.examN=act.length;
  if(best&&best[1]>80) P.logOf(best[0],g,`考試名列前茅（${Math.round(best[1])} 分）`);
  // 成績不佳學生動機下降
  for(const x of act){ if(x.sc<40) x.mo=Math.max(0,x.mo-1.5); else if(x.sc>75) x.mo=Math.min(100,x.mo+.8); }
};

/* ---------- 畢業與升學 ---------- */
S.nextSchool = function(g,s){
  const T=D.TYPES[s.type]; let best=null;
  for(const o of g.schools){ if(o===s||o.closed||!T.next.includes(o.type)) continue; if(!best||o.rep.ov>best.rep.ov) best=o; }
  return best;
};
S.graduate = function(g,s){
  const T=D.TYPES[s.type]; const grads=[], keep=[];
  for(const x of s.students){
    if(x.gr>=T.y){ if(x.st===1){ keep.push(x); } else grads.push(x); }
    else { x.gr++; x.ab=Math.min(99,x.ab+((s.quality-50)/50)*.8+.2); keep.push(x); }
  }
  s.students=keep;
  const ns=S.nextSchool(g,s);
  let tier=0,emp=0,direct=0; const sorted=grads.slice().sort((a,b)=>b.sc-a.sc);
  const vocational=(s.type==='vh'||s.type==='jc'||s.type==='un'||s.type==='gs');
  for(const x of grads){
    if(ns && R.chance(g,s.cfg.direct*(.3+.5*ns.rep.ov/100)*(x.sc>=ns.cfg.std?1:.35))){ ns.transit.push(x); direct++; if(x.key) P.logOf(x,g,`直升${ns.name}`); continue; }
    const hi=x.sc>=70; if(hi) tier++;
    const pe=U.clamp(.5+.004*(x.sc-50)+(s.cfg.phil==='tech'?.08:0)+.08*(s.fac.sup.workshop?1:0)-g.world.unemp*.015+.05*(s.m.emp-50)/50,.1,.97);
    if(R.chance(g,pe)) emp++;
    const how=(hi&&T.next.length)?'升學名校':(T.next.length?'升學':'就業');
    const a=P.toAlumni(g,s,x,how); g.alumni.push(a);
    if(a.lg) P.alumLog(a,g,`${s.name}畢業（${how}）`);
  }
  const n=grads.length;
  if(n>0){
    const tr=(tier+direct*.85)/n*100, er=(emp+direct*.85)/n*100;
    s.m.tier=U.clamp(s.m.tier*.45+tr*.55,0,100);
    s.m.emp=vocational? U.clamp(s.m.emp*.45+er*.55,0,100) : s.m.tier;
    s.m.gradSc=U.avg(grads,x=>x.sc);
    s.hist.grads.push({y:g.y,n,avg:Math.round(U.avg(grads,x=>x.sc)),top:sorted.slice(0,3).map(x=>x.nm),direct,tier:Math.round(tr)});
    if(s.hist.grads.length>80) s.hist.grads.shift();
    s.stats.gradN+=n;
    S.log(g,s,`${g.y}屆畢業生 ${n} 人（升學/就業成果 ${Math.round(tr)}%，直升 ${direct} 人）`,n>=60);
  }
  S.calc(g,s);
};

/* ---------- 招生 ---------- */
S.admit = function(g,s,dem){
  const T=D.TYPES[s.type], cfg=s.cfg, ph=D.PHIL[cfg.phil];
  S.calc(g,s);
  const enrNow=s.students.length, maxEnr=s.cap.seats;
  const vac=Math.max(0,maxEnr-enrNow);
  const rec={y:g.y,quota:cfg.quota,vac,direct:0,legacy:0,applicants:0,qualified:0,offers:0,enrolled:0,avgAb:0,cut:cfg.std,dem:Math.round(dem)};
  s.dem=dem;
  let target=Math.min(cfg.quota,vac);
  // 校內直升
  const tr=s.transit.splice(0).sort((a,b)=>b.sc-a.sc); const dcap=Math.min(target,Math.ceil(cfg.quota*Math.max(.3,cfg.direct)));
  for(const st of tr){
    if(rec.direct<dcap&&rec.direct<target){ st.gr=1; st.from='直升'; st.en=g.y; st.sch=0; st.cb=-1; st.fr=[]; st.rl=[]; st.by=g.y-T.e; s.students.push(st); rec.direct++; rec.enrolled++; if(st.key) P.logOf(st,g,`入學${s.name}（直升）`); }
    else { const a=P.toAlumni(g,s,st,'升學他校'); g.alumni.push(a); }
  }
  target-=rec.direct;
  // 申請人
  const leg=cfg.legacy?P.legacyApplicants(g,s):[]; rec.legacy=leg.length;
  const coopBoost=1+U.sum(Object.values(s.coop),v=>v>0?.05:0);
  const N=Math.round(dem*2.0*coopBoost)+leg.length;
  rec.applicants=N;
  const mean=45+.14*(s.rep.ov-50)+(cfg.phil==='elite'?5:0)+(cfg.std-30)*.1;
  const apps=[];
  for(let i=0;i<N;i++){
    let ap;
    if(i<leg.length){ const l=leg[i]; ap={ab:U.clamp(Math.round(l.ab),5,99),par:l.par,fid:l.fid||0,fi:l.fi,leg:1}; }
    else ap={ab:U.clamp(Math.round(R.n(g,mean,15)),5,99),par:0,fid:0,fi:null,leg:0};
    ap.ex=ap.ab+R.n(g,0,5)+(ap.leg?8:0); apps.push(ap);
  }
  const qual=apps.filter(a=>a.ex>=cfg.std).sort((a,b)=>b.ex-a.ex); rec.qualified=qual.length;
  // 獎學金額度
  const sumSch=U.sum(s.students,x=>x.sch); let schLeft=Math.max(0,cfg.sch-sumSch); const grant=Math.round(cfg.tuition*2*.5);
  const enroll=(ap,sch)=>{
    const st=P.newStudent(g,s,{ab:ap.ab,par:ap.par,fid:ap.fid||undefined,fiShift:(ph===D.PHIL.elite?8:0)+(ap.leg?10:0),from:ap.leg?'校友子女':''});
    if(ap.fi!==null&&ap.leg) st.fi=U.clamp(Math.round(ap.fi),3,100);
    if(sch&&schLeft>=grant){ st.sch=grant; schLeft-=grant; }
    // 手足關係
    if(R.chance(g,.06*g.regionRule.sib)&&s.students.length){ const o=R.pick(g,s.students); st.fid=o.fid; st.fi=o.fi; st.fe=o.fe; P.relBump(st,o,'y',60); }
    s.students.push(st); P.add(g,st); rec.enrolled++; rec.avgAb+=st.ab;
  };
  let idx=0; const used=new Set();
  const yieldBase=U.clamp(.58+.004*(s.rep.ov-50)+.0002*(s.rep.aw-50)*50,.3,.92);
  const wave=(mult)=>{
    for(;idx<qual.length&&rec.enrolled<target+rec.direct;idx++){
      const ap=qual[idx]; if(used.has(ap)) continue; used.add(ap); rec.offers++;
      const wantSch=schLeft>=grant&&(ap.ab>=62||((ap.fi!==null?ap.fi:40)<35&&ap.ab>=45));
      const y=U.clamp(yieldBase*mult+(wantSch?.18:0)-(cfg.tuition>W.tuitionNorm(g,s.type)*ph.tol*1.2?.1:0),.15,.95);
      if(R.chance(g,y)) enroll(ap,wantSch);
    }
  };
  wave(1);
  // 第二輪：補招
  if(rec.enrolled<target+rec.direct){ idx=0; wave(.8); }
  if(rec.enrolled-rec.direct>0) rec.avgAb=Math.round(rec.avgAb/(rec.enrolled-rec.direct)); else rec.avgAb=0;
  // 續領獎學金資格
  for(const x of s.students){ if(x.sch&&x.sc<55) x.sch=0; }
  s.admit=rec; s.stats.inn+=rec.enrolled-rec.direct;
  s.hist.adm=(s.hist.adm||[]); s.hist.adm.push({y:g.y,a:rec.applicants,o:rec.offers,e:rec.enrolled}); if(s.hist.adm.length>60) s.hist.adm.shift();
  S.calc(g,s); P.markKey(g,s);
  S.log(g,s,`招生：申請 ${rec.applicants}、錄取 ${rec.offers}、入學 ${rec.enrolled}（含直升 ${rec.direct}）`,false);
  return rec;
};
S.transferIn = function(g,s,dem){
  if(!s.cfg.transferIn) return 0;
  const T=D.TYPES[s.type]; const vac=s.cap.seats-s.students.length; if(vac<=0||T.y<2) return 0;
  const n=Math.min(vac,R.poisson(g,dem*.035*(s.rep.ov/55)));
  let c=0; for(let i=0;i<n;i++){
    const gr=R.i(g,2,T.y); const st=P.newStudent(g,s,{gr,abShift:2,from:'轉入'}); if(st.ab<s.cfg.std*.8) continue;
    s.students.push(st); P.add(g,st); c++; }
  s.stats.inn+=c; return c;
};
S.transferStudents = function(g,from,to,count){
  if(from===to||from.type!==to.type) return {ok:false,msg:'僅限同學制校區之間轉學'};
  const vac=to.cap.seats-to.students.length; const n=Math.min(count,vac,from.students.length);
  if(n<=0) return {ok:false,msg:'目標校區沒有空位'};
  const pick=from.students.filter(x=>x.st===0).sort((a,b)=>a.sc-b.sc).slice(0,n);
  for(const x of pick){ from.students.splice(from.students.indexOf(x),1); x.fr=[]; x.rl=[]; x.cb=-1; x.sch=0; to.students.push(x); if(x.key) P.logOf(x,g,`轉入${to.name}`); }
  S.log(g,from,`${pick.length} 名學生轉至${to.name}`,false);
  return {ok:true,msg:`已轉校 ${pick.length} 人`,n:pick.length};
};
S.expel = function(g,s,id){ const i=s.students.findIndex(x=>x.id===id); if(i<0) return {ok:false}; const x=s.students[i]; s.students.splice(i,1); P.del(g,x); s.stats.drop++; s.rep.trust=Math.max(0,s.rep.trust-.3); return {ok:true,msg:`${x.nm} 已退學`}; };
S.grantScholar = function(g,s,id,on){
  const x=s.students.find(y=>y.id===id); if(!x) return {ok:false};
  const amt=Math.round(s.cfg.tuition*2*.5); const used=U.sum(s.students,y=>y.sch);
  if(on){ if(used+amt>s.cfg.sch) return {ok:false,msg:'獎學金預算已用完，請先在預算中提高額度'}; x.sch=amt; x.mo=Math.min(100,x.mo+4); return {ok:true,msg:`已發給 ${x.nm} 獎學金`}; }
  x.sch=0; return {ok:true,msg:'已取消獎學金'};
};

/* ---------- 競賽 ---------- */
S.compete = function(g,s,field){ // field 0學科 1藝術 2體育 3技術
  if((s.flags.compYear!==g.y)){ s.flags.compYear=g.y; s.flags.compN=0; } if(s.flags.compN>=3) return {ok:false,msg:'今年已參加三次競賽'};
  const cost=Math.round(W.M(g)*70000); if(L.cash(s)<cost) return {ok:false,msg:'現金不足'};
  const key=['ab','ar','sp','tc'][field];
  const cands=s.students.filter(x=>x.st===0).sort((a,b)=>(b[key]+(D.CLUBS[b.cb]&&D.CLUBS[b.cb].f===field?8:0))-(a[key]+(D.CLUBS[a.cb]&&D.CLUBS[a.cb].f===field?8:0))).slice(0,5);
  if(cands.length<2) return {ok:false,msg:'參賽學生不足'};
  L.exp(s,'eOther',cost); s.flags.compN++;
  const mine=U.avg(cands,x=>x[key])+s.quality*.15+R.n(g,0,7);
  const rivs=g.rivals.filter(r=>r.type===s.type&&r.status==='active'); const field_=rivs.map(r=>r.quality*.55+32+R.n(g,0,9)+(r.spec>=0?3:0));
  let rank=1; for(const f of field_) if(f>mine) rank++;
  const N=field_.length+1;
  for(const c of cands){ c.mo=Math.min(100,c.mo+(rank<=2?5:1)); if(c.key||rank===1) P.logOf(c,g,`代表${s.name}參加${D.FIELDS[field]}競賽，獲第 ${rank} 名`); }
  if(rank===1){ s.rep.outcome=Math.min(100,s.rep.outcome+.8); s.rep.social=Math.min(100,s.rep.social+.6); s.trustAdj+=2; S.log(g,s,`${D.FIELDS[field]}競賽奪冠`,true); }
  else if(rank<=Math.ceil(N/3)){ s.rep.social=Math.min(100,s.rep.social+.25); s.trustAdj+=.8; }
  return {ok:true,msg:`${D.FIELDS[field]}競賽：第 ${rank}／${N} 名`+(rank===1?'（冠軍！）':''),rank};
};
S.reformCurriculum = function(g,s){
  const cost=Math.round(W.M(g)*600000); if(L.cash(s)<cost) return {ok:false,msg:`需要 ${U.money(cost)}`};
  if(s.flags.refY===g.y) return {ok:false,msg:'今年已進行過課程改革'}; s.flags.refY=g.y;
  L.exp(s,'eTrain',cost); s.curr=Math.min(100,s.curr+9);
  for(const t of s.staff) t.sat=Math.max(0,t.sat-3);
  return {ok:true,msg:'課程改革完成：課程品質提升，教師短期適應壓力。'};
};
S.setPhil = function(g,s,k){
  if(s.cfg.phil===k) return {ok:false}; s.cfg.phil=k;
  for(const t of s.staff) t.sat=Math.max(0,t.sat-5); for(const x of s.students) x.mood=Math.max(0,x.mood-3);
  s.trustAdj-=3; s.flags.phY=g.y; return {ok:true,msg:`教育理念改為「${D.PHIL[k].n}」；轉型期教職員與家長需要適應。`};
};
})(typeof window!=='undefined'?window:globalThis);
