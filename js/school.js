(function(root){
'use strict';
const SE = root.SE, R=SE.R, U=SE.U, D=SE.D, W=SE.W, L=SE.L, P=SE.P, CAL=SE.CAL;
const S = SE.S = {};

/* ---------- 歷史紀錄 ---------- */
S.log = function(g, s, txt, major){
  g.hist.push({y:g.y,w:g.w,sid:s?s.id:0,sn:s?s.name:'集團',t:txt,m:major?1:0});
  if(g.hist.length>2200){ let n=g.hist.length-1800; const keep=[]; for(const h of g.hist){ if(n>0&&!h.m){ n--; } else keep.push(h); } g.hist=keep; if(g.hist.length>2200) g.hist.splice(0,g.hist.length-2000); }
};

/* ---------- 建築成本 ---------- */
S.bcost = (g,t)=> D.BLD[t].c*W.M(g);
S.avail = (g,t)=> g.world.tech>=D.BLD[t].tech;
S.TENT = {kg:40,ps:45,jh:65,hs:75,vh:55,jc:30,un:110,gs:35}; // 健康規模的每屆新生數

/* ---------- 建立學校 ---------- */
S.blank = function(g,o){
  const T=D.TYPES[o.type];
  const s={id:g.nextId++,name:o.name,type:o.type,kind:o.kind||'main',site:o.site||o.name,parentId:o.parentId||0,founded:g.y,closed:false,
    land:{w:o.lw||12,h:o.lh||9},bld:[],students:[],staff:[],cands:[],principalId:0,transit:[],
    cfg:{tuition:Math.round(W.tuitionNorm(g,o.type)),quota:S.TENT[o.type],std:25,zone:0,phil:o.phil||'exam',mkt:0,sch:0,trn:0,eqp:0,mnt:0,clubs:[0,2],transferIn:true,direct:.7,legacy:true,delegate:false,dpolicy:'balanced',cola:0},
    rep:{teach:40,outcome:40,stuSat:50,trust:45,staffSat:50,fin:50,safety:55,social:30,research:20,intl:15,ov:40,aw:30},
    quality:45,curr:45,equip:45,m:{exam:50,tier:40,emp:40,gradSc:50},trustAdj:0,safeAdj:0,
    fac:{score:50,sat:50,health:60},cap:{rooms:0,seats:0,staff:0,beds:0},
    hist:{principals:[],yb:[],grads:[],names:[]},stats:{drop:0,out:0,inn:0,gradN:0,mktSpend:0},admit:{},arSched:[],semLeft:0,eqPool:0,
    affil:[],coop:{},dem:0,ratio:1,last12rev:0,rivalAvgQ:50,avgSalRatio:1,rank:{r:1,n:1},unrest:0,trouble:[],
    bud:{},flags:{}};
  L.initEnt(s);
  return s;
};
S.seedLedger = function(g,s,cash,loans,assetsNet,ad){
  const b=s.led.bal; b.cash=cash; b.fa=s.assets.reduce((x,a)=>x+a.c,0); b.accDep=-s.assets.reduce((x,a)=>x+a.ad,0);
  b.loans=-loans; b.paid=-(b.cash+b.fa+b.accDep-loans);
};
S.placeFree = function(s,w,h){
  const occ=new Set(); for(const b of s.bld){ const d=D.BLD[b.t]; for(let i=0;i<d.w;i++) for(let j=0;j<d.h;j++) occ.add((b.x+i)+','+(b.y+j)); }
  for(let y=0;y<=s.land.h-h;y++) for(let x=0;x<=s.land.w-w;x++){
    let ok=true; for(let i=0;i<w&&ok;i++) for(let j=0;j<h;j++) if(occ.has((x+i)+','+(y+j))){ ok=false; break; }
    if(ok) return {x,y};
  }
  return null;
};
S.canPlace = function(s,t,x,y,ignore){
  const d=D.BLD[t]; if(x<0||y<0||x+d.w>s.land.w||y+d.h>s.land.h) return false;
  for(const b of s.bld){ if(b===ignore) continue; const e=D.BLD[b.t]; if(x<b.x+e.w&&b.x<x+d.w&&y<b.y+e.h&&b.y<y+d.h) return false; }
  return true;
};
S.addBldFree = function(g,s,t,o){ // 免費放置（開局或併入）——不扣款，由呼叫端處理資產
  const d=D.BLD[t]; const pos=o.x!==undefined?{x:o.x,y:o.y}:S.placeFree(s,d.w,d.h);
  if(!pos){ // 擴地
    s.land.h+=d.h+1; const p2=S.placeFree(s,d.w,d.h); if(!p2) return null; Object.assign(pos||{},p2); return S.addBldFree(g,s,t,Object.assign({},o,p2));
  }
  const b={id:g.nextId++,t,x:pos.x,y:pos.y,lv:o.lv||1,dur:o.dur||90,prog:0,aid:0,born:o.born||g.y};
  s.bld.push(b); return b;
};
S.seedAssetsFor = function(g,s,b,age,res){
  const c=Math.round(S.bcost(g,b.t)*D.LVCOST.slice(1,b.lv+1).reduce((a,x)=>a+x,0)*Math.pow(0.97,age)*0.85);
  const a={id:g.nextId++,k:'bld',n:D.BLD[b.t].n,c,ad:Math.round(c*(1-.1)*Math.min(.9,age/D.BLD[b.t].life)),life:D.BLD[b.t].life,res:.1,start:g.abs-age*52,bid:b.id};
  s.assets.push(a); b.aid=a.id; return a;
};

S.genStart = function(g,o){
  const T=D.TYPES[o.type], tr=new Set(o.troubles||[]);
  const s=S.blank(g,o);
  s.trouble=[...tr];
  const f=(tr.has('enr')?.38:.6)*(tr.has('lost')?.85:1)*(0.9+R.f(g)*.2);
  const full=S.TENT[o.type]*T.y;
  const enr=Math.max(20,Math.round(full*f));
  // 土地與建築
  const nClass=Math.max(1,Math.ceil(full/(8*T.cls)));
  s.land={w:14,h:10};
  const era=g.world.tech;
  const wanted=['classroom','office'];
  const needs=D.NEEDS[o.type]; for(const k of Object.keys(needs)) if(S.avail(g,k)&&k!=='dorm'&&k!=='research'&&needs[k]>=.2) wanted.push(k);
  if(S.avail(g,'research')&&(o.type==='un'||o.type==='gs')) wanted.push('research');
  if(o.type==='un'||o.type==='jc') wanted.push('dorm');
  const fill=tr.has('old')?[30,56]:[55,85];
  const bs=[];
  for(const t of wanted){
    const n=t==='classroom'?nClass:1; for(let i=0;i<n;i++){
      const lv=1; const b=S.addBldFree(g,s,t,{lv,dur:R.i(g,fill[0],fill[1])});
      if(!b) continue; S.seedAssetsFor(g,s,b,R.i(g,3,26)); bs.push(b);
    }
  }
  // 土地資產
  const landCost=Math.round(s.land.w*s.land.h*W.landCell(g)*0.45);
  s.assets.push({id:g.nextId++,k:'land',n:'校地',c:landCost,ad:0,life:0,res:0,start:g.abs,bid:0});
  // 師生
  s.rep.ov=tr.has('rep')?22:40; s.rep.aw=tr.has('rep')?18:35;
  for(const k of D.DIMS) s.rep[k]=U.clamp(R.n(g,tr.has('rep')?30:44,6),8,90);
  s.rep.social=tr.has('rep')?18:32; s.rep.research=(o.type==='un'||o.type==='gs')?30:12; s.rep.intl=14;
  s.quality=tr.has('qual')?32:46; s.curr=tr.has('qual')?30:48;
  s.equip=tr.has('old')?28:45;
  S.calc(g,s);
  // 學生
  for(let i=0;i<enr;i++){ const gr=(i%T.y)+1; const st=P.newStudent(g,s,{gr,abShift:tr.has('qual')?-4:0}); s.students.push(st); P.add(g,st); }
  // 教職員
  const need=Math.ceil(enr/T.spt)*(tr.has('tch')?.62:1);
  const skillLvl=tr.has('tch')?44:54;
  for(let i=0;i<Math.max(2,Math.round(need));i++){ const st=P.newStaff(g,s,'t',{fld:i%4,lvl:skillLvl,sat:tr.has('mgt')?42:60}); s.staff.push(st); P.add(g,st); }
  const nAdm=Math.max(1,Math.ceil(enr/150)); for(let i=0;i<nAdm;i++){ const st=P.newStaff(g,s,'a',{lvl:50}); s.staff.push(st); P.add(g,st); }
  const nd=enr<120?1:(enr<260?2:(enr<500?3:4)); for(const dt of D.DT.slice(0,nd)){ const st=P.newStaff(g,s,'d',{lvl:tr.has('mgt')?42:54,dt}); s.staff.push(st); P.add(g,st); }
  const pr=P.newStaff(g,s,'p',{lvl:tr.has('mgt')?30:54,ex:15}); pr.mgmt=tr.has('mgt')?R.i(g,22,38):R.i(g,50,70); pr.pStart=g.y; s.staff.push(pr); P.add(g,pr); s.principalId=pr.id;
  for(const t of s.staff) t.sal=Math.round(t.sal*(tr.has('fin')?.96:1));
  s.avgSalRatio=1;
  // 財務
  const yrRev=enr*(s.cfg.tuition*2+W.subsidy(g,o.type));
  const cash=Math.round(yrRev*(tr.has('fin')?.04:.16)*g.diff.cash);
  const loans=Math.round(yrRev*(tr.has('fin')?.85:.2)*(0.8+R.f(g)*.4));
  S.seedLedger(g,s,cash,loans);
  if(loans>0){ s.loans.push({id:g.nextId++,p0:loans,bal:loans,r:L.rate(g,s,'bank'),term:96,left:Math.round(96*R.f(g)*.5)+40,kind:'bank',ic:false,y:g.y-3}); }
  // 預設預算
  S.defaultBudget(g,s);
  S.calc(g,s); P.markKey(g,s);
  s.last12rev=yrRev;
  return s;
};
S.repValue = (g,s)=> U.sum(s.bld,b=>S.bcost(g,b.t)*(D.LVCOST.slice(1,b.lv+1).reduce((a,x)=>a+x,0)));
S.defaultBudget = function(g,s){
  const M=W.M(g), enr=Math.max(60,s.students.length);
  s.cfg.mnt=Math.round(S.repValue(g,s)*0.012);
  s.cfg.eqp=Math.round((enr+30)*M*250*12);
  s.cfg.trn=Math.round(Math.max(3,s.staff.length)*M*28000);
  s.cfg.mkt=Math.round(enr*M*600);
  s.cfg.sch=Math.round(s.students.length*s.cfg.tuition*2*0.03);
};

/* ---------- 容量/設施計算 ---------- */
S.durF = d=> d>=60?1: d>=30? 0.6+0.4*(d-30)/30 : Math.max(0.15,d/30*0.6);
S.calc = function(g,s){
  const T=D.TYPES[s.type], sup={}; let rooms=0,staffCap=0,beds=0;
  for(const b of s.bld){ if(b.prog>0) continue; const e=D.LVMULT[b.lv]*S.durF(b.dur); sup[b.t]=(sup[b.t]||0)+e; const d=D.BLD[b.t];
    if(b.t==='classroom') rooms+=e*d.rooms; if(d.staff) staffCap+=e*d.staff; if(d.beds) beds+=e*d.beds; }
  const enr=s.students.length; let sc=0,ws=0,canC=1,cl=1,gyC=1;
  const needs=D.NEEDS[s.type]; const cov={};
  for(const k of Object.keys(needs)){ if(!S.avail(g,k)) continue; const d=D.BLD[k]; const dem=enr/(d.serve||(k==='dorm'?120:200))*(k==='dorm'?0.2:1); const c=enr===0?1:Math.min(1,(sup[k]||0)*(k==='dorm'?1:1)/Math.max(.05,k==='dorm'?enr*0.2/120:dem)); cov[k]=c; sc+=needs[k]*c; ws+=needs[k]; }
  const score=ws>0?100*sc/ws:60;
  const bonus=k=>Math.min(1,(sup[k]||0));
  s.cap={rooms:Math.floor(rooms),seats:Math.floor(rooms*T.cls*1.12),ideal:Math.floor(rooms*T.cls),staff:Math.floor(staffCap),beds:Math.floor(beds)};
  s.fac={score:Math.round(score),cov,
    sat:U.clamp(Math.round(42+0.28*score+3*bonus('landscape')+3*bonus('pool')+2*bonus('audit')+3*(cov.canteen||0)+(sup.parking?1.5:0)),20,100),
    health:U.clamp(Math.round(42+28*(cov.clinic!==undefined?cov.clinic:.6)+18*((cov.gym||0)*.5+(cov.field||0)*.5)),20,100),
    research:(sup.research||0),lab:sup.lab||0,sup};
  return s.cap;
};
S.dormOcc = s=> Math.min(s.cap.beds,Math.round(s.students.length*(s.cfg.zone>=1?Math.min(.5,.12+.1*s.cfg.zone):.06)));

/* ---------- 建設操作 ---------- */
S.costOf = (g,s,t,lv)=> Math.round(S.bcost(g,t)*D.LVCOST[lv||1]*g.diff.cost);
S.build = function(g,s,t,x,y){
  const d=D.BLD[t]; if(!d) return {ok:false,msg:'未知建築'};
  if(!S.avail(g,t)) return {ok:false,msg:`此時代尚無${d.n}（需科技 ${d.tech}）`};
  if(!S.canPlace(s,t,x,y)) return {ok:false,msg:'位置被佔用或超出校地'};
  const c=S.costOf(g,s,t,1);
  if(L.cash(s)<c && L.creditLimit(g,s)<c-L.cash(s)) return {ok:false,msg:`資金不足（需要 ${U.money(c)}）`};
  const b={id:0,t,x,y,lv:1,dur:100,prog:Math.round(d.wk*(0.9+0.2*(1-Math.min(1,W.era(g.y).tech/90)*.3))),aid:0,born:g.y};
  b.id=g.nextId++; s.bld.push(b);
  if(L.cash(s)<c) L.addLoan(g,s,Math.ceil((c-L.cash(s))*1.1),60,'bank');
  const a=L.buyAsset(g,s,'bld',d.n,c,d.life,.1,false,b.id); b.aid=a.id;
  S.log(g,s,`動工興建${d.n}`,false);
  return {ok:true,msg:`開始興建${d.n}，預計 ${b.prog} 週完工`};
};
S.upgradeCost = (g,s,b)=> b.lv>=3?0:S.costOf(g,s,b.t,b.lv+1);
S.upgrade = function(g,s,bid){
  const b=s.bld.find(x=>x.id===bid); if(!b||b.prog>0) return {ok:false,msg:'無法升級'};
  if(b.lv>=3) return {ok:false,msg:'已達最高等級'}; if(b.t==='landscape'||b.t==='parking'&&b.lv>=2) return {ok:false,msg:'此建築無須升級'};
  const c=S.upgradeCost(g,s,b); if(L.cash(s)<c && L.creditLimit(g,s)<c-L.cash(s)) return {ok:false,msg:`資金不足（需要 ${U.money(c)}）`};
  if(L.cash(s)<c) L.addLoan(g,s,Math.ceil((c-L.cash(s))*1.1),60,'bank');
  const a=s.assets.find(x=>x.id===b.aid);
  if(a){ L.post(s.led,[['fa',c],['cash',-c]],'inv','建築升級'); a.c+=c; a.life=Math.max(a.life*0.8,10); }
  else { const na=L.buyAsset(g,s,'bld',D.BLD[b.t].n+'升級',c,D.BLD[b.t].life,.1,true,b.id); b.aid=na.id; }
  b.lv++; b.dur=Math.min(100,b.dur+25); b.prog=Math.round(D.BLD[b.t].wk*0.4); S.calc(g,s); S.log(g,s,`${D.BLD[b.t].n}升級至 Lv${b.lv}`,false);
  return {ok:true,msg:`升級完成，施工 ${b.prog} 週`};
};
S.repairCost = (g,s,b,pts)=> Math.round(S.bcost(g,b.t)*D.LVCOST.slice(1,b.lv+1).reduce((a,x)=>a+x,0)*0.0075*pts*1.5);
S.repair = function(g,s,bid){
  const b=s.bld.find(x=>x.id===bid); if(!b) return {ok:false}; const pts=Math.max(0,100-b.dur);
  if(pts<1) return {ok:false,msg:'狀況良好無須維修'};
  const c=S.repairCost(g,s,b,pts); if(L.cash(s)<c) return {ok:false,msg:`現金不足（需要 ${U.money(c)}）`};
  L.exp(s,'eMaint',c); b.dur=100; S.calc(g,s); return {ok:true,msg:`維修完成，花費 ${U.money(c)}`};
};
S.demolish = function(g,s,bid){
  const i=s.bld.findIndex(x=>x.id===bid); if(i<0) return {ok:false}; const b=s.bld[i];
  const a=s.assets.find(x=>x.id===b.aid); const salv=Math.round(S.bcost(g,b.t)*.06*(b.prog>0?0.3:1));
  if(a) L.disposeAsset(s,a,salv); else L.rev(s,'rOther',salv,'inv');
  s.bld.splice(i,1); S.calc(g,s); S.log(g,s,`拆除${D.BLD[b.t].n}`,false);
  return {ok:true,msg:`已拆除，殘值 ${U.money(salv)}`};
};
S.convert = function(g,s,bid,nt){
  const b=s.bld.find(x=>x.id===bid); if(!b||b.prog>0) return {ok:false,msg:'無法改建'};
  const od=D.BLD[b.t], nd=D.BLD[nt]; if(!nd||nt===b.t) return {ok:false};
  if(!S.avail(g,nt)) return {ok:false,msg:'此時代尚無該建築'};
  if(nd.w>od.w||nd.h>od.h) return {ok:false,msg:'原建築基地不足，請選擇較小的建築'};
  const c=Math.round(S.costOf(g,s,nt,1)*.55); if(L.cash(s)<c) return {ok:false,msg:`現金不足（需要 ${U.money(c)}）`};
  const a=s.assets.find(x=>x.id===b.aid); if(a) L.writeOff(s,a);
  const na=L.buyAsset(g,s,'bld',nd.n,c,nd.life,.1,false,b.id);
  b.t=nt; b.lv=1; b.dur=100; b.prog=Math.round(nd.wk*.7); b.aid=na.id; S.calc(g,s);
  S.log(g,s,`${od.n}改建為${nd.n}`,false); return {ok:true,msg:`改建開始，約 ${b.prog} 週`};
};
S.landCost = (g,s,n)=> Math.round(n*W.landCell(g)*g.diff.cost);
S.expandLand = function(g,s,dir){ // dir: 'w' or 'h' 擴一列
  if(s.land.w*s.land.h>=900) return {ok:false,msg:'已達土地上限'};
  const cells=dir==='w'?s.land.h:s.land.w; const c=S.landCost(g,s,cells);
  if(L.cash(s)<c) return {ok:false,msg:`現金不足（需要 ${U.money(c)}）`};
  L.buyAsset(g,s,'land','校地擴張',c,0,0,true); s.land[dir]++; return {ok:true,msg:`擴地完成，花費 ${U.money(c)}`};
};

/* ---------- 品質與聲望 ---------- */
S.teachers = s=> s.staff.filter(x=>x.role==='t'||x.role==='d');
S.fte = s=>{ let f=0; for(const x of s.staff){ if(x.tr>0||x.st) continue; if(x.role==='t') f+=1; else if(x.role==='d') f+=.4; else if(x.role==='p') f+=.15; } return f; };
S.need = s=> Math.ceil(s.students.length/D.TYPES[s.type].spt);
S.mgmtScore = function(g,s){
  const pr=s.staff.find(x=>x.id===s.principalId); const ds=s.staff.filter(x=>x.role==='d'); const ad=s.staff.filter(x=>x.role==='a');
  const adNeed=Math.max(1,Math.ceil(s.students.length/150)); const cov=Math.min(1,(ad.length+ds.length*.5)/adNeed);
  return U.clamp(.5*(pr?pr.mgmt:22)+.2*(ds.length?U.avg(ds,x=>x.mgmt):30)+.3*(30+cov*45),0,100);
};
S.policyFit = function(g,s){
  const ph=D.PHIL[s.cfg.phil], w=g.world, reg=g.regionRule; let v=0;
  for(const k of Object.keys(ph.fit)){ const val=k==='exam'?g.world.pol.exam:k==='trad'?w.trad:k==='intl'?w.intl*.6+reg.intl*.4:reg.voc; v+=ph.fit[k]*(val-0.5); }
  return v; // 約 -0.6 ~ +0.8
};
S.updateQuality = function(g,s){
  const T=D.TYPES[s.type], ph=D.PHIL[s.cfg.phil];
  const tch=S.teachers(s).filter(x=>x.st===0); let tq=50;
  if(tch.length) tq=U.avg(tch,x=>(x.teach*.6+x.prof*.4)*(.85+.15*x.sat/100));
  const need=S.need(s), fte=S.fte(s); const cover=need>0?Math.min(1,fte/need):1;
  const classes=Math.max(1,s.cap.rooms||1), spr=s.students.length/classes, ideal=T.cls;
  const f2=U.clamp(1.12-Math.max(0,spr/ideal-0.9)*0.9,.5,1.1);
  const f1=.55+.45*cover; s.cover=cover; s.spr=spr; s.ratio=spr/ideal;
  const mg=S.mgmtScore(g,s); s.mgmt=mg;
  const ability=U.avg(s.students,x=>x.ab)||50;
  const base=.40*tq+.20*s.curr+.14*s.fac.score+.12*s.equip+.10*mg+.04*(ability)+ 4*S.policyFit(g,s);
  s.quality=U.clamp(base*f1*Math.min(1,f2),0,100);
  s.tq=tq;
};
S.overall = (g,s,rep)=>{ const w=D.WEIGHTS[s.type]; let o=0; D.DIMS.forEach((d,i)=>o+=w[i]*(rep||s.rep)[d]); return o; };
S.updateRep = function(g,s){
  const ph=D.PHIL[s.cfg.phil], r=s.rep, n=s.students.length||1;
  const stuSat=U.avg(s.students,x=>x.sat)||50, stfSat=U.avg(s.staff,x=>x.sat)||50;
  const tgt={};
  tgt.teach=s.quality;
  const examN=U.clamp(s.m.exam+ph.out*.4,0,100);
  tgt.outcome=U.clamp(.4*examN+.3*s.m.tier+.3*s.m.emp+ph.out*.6,0,100);
  tgt.stuSat=U.clamp(stuSat,0,100);
  tgt.trust=U.clamp(.35*s.quality+.2*r.safety+.2*stuSat+.15*r.outcome+.1*50+s.trustAdj+ph.trust,0,100);
  tgt.staffSat=U.clamp(stfSat,0,100);
  const risk=L.risk(g,s); tgt.fin=U.clamp(100-risk*.9,0,100);
  const durAvg=U.avg(s.bld,b=>b.dur)||70;
  tgt.safety=U.clamp(30+.3*durAvg+.25*s.fac.health+.2*(s.mgmt||40)+s.safeAdj+ (S.eff?S.eff(g).safety:0),0,100);
  tgt.social=U.clamp(r.social+(r.ov-r.social)*.05+ (s.notableCount||0)*.02+ph.soc*.01,0,100);
  const resv=(s.fac.research||0)*30+ s.staff.filter(x=>x.role==='t').reduce((a,x)=>a+(x.prof>70?1:0),0)*1.8;
  tgt.research=U.clamp((s.type==='un'||s.type==='gs'?18:6)+resv+ph.res*2+(s.flags.research||0),0,100);
  tgt.intl=U.clamp(10+ph.intl+g.world.intl*20+(s.flags.exchange||0)+ (s.cfg.zone>=3?10:0),0,100);
  for(const d of D.DIMS){ const dv=U.clamp((tgt[d]-r[d])*.15,-1.0,1.0); r[d]=U.clamp(r[d]+dv,0,100); }
  r.ov=S.overall(g,s);
  // 知名度：宣傳只提升知名度，不直接提升聲望
  const T=D.TYPES[s.type]; const pool=S.poolSize(g,s)||100;
  const mktRef=pool*W.M(g)*3500*(1+s.cfg.zone*.5);
  const awT=15+.3*r.ov+50*(1-Math.exp(-(s.cfg.mkt*(1+(g.group.brand||0)/150))/mktRef*1.2));
  r.aw=U.clamp(r.aw+(awT-r.aw)*.12,0,100);
  s.trustAdj*=.93; s.safeAdj*=.94; s.flags.exchange=(s.flags.exchange||0)*.97; s.flags.research=(s.flags.research||0)*.98;
};
S.poolSize = function(g,s){
  const T=D.TYPES[s.type], reg=g.regionRule;
  const pr=Math.max(W.part(s.type,g.y), s.type===g.opts.type? .08:0);
  const priv=Math.min(.85,reg.priv*({kg:1.3,ps:.9,jh:.9,hs:1,vh:1,jc:1.2,un:1,gs:1}[s.type])*(g.world.pol.free.includes(s.type)?.6:1));
  return W.cohort(g,s.type)*pr*priv*g.world.demandMult*(1+.05*g.world.cyc);
};
S.cs = function(g,x){ // 招生吸引力分數 (x 為學校或對手)
  const norm=W.tuitionNorm(g,x.type);
  const ph=D.PHIL[x.cfg?x.cfg.phil:x.phil]||D.PHIL.exam;
  const tuition=x.cfg?x.cfg.tuition:x.tuition;
  const aff=U.clamp(50-45*Math.log(Math.max(.2,tuition/(norm*ph.tol))),0,100);
  const ov=x.rep.ov, aw=x.rep.aw;
  return .5*ov+.25*aw+.15*aff+.1*Math.min(100,(g.group.brand||0))*(x.cfg?1:0)+ (x.spec>=0?2:0)+(x.cfg&&x.cfg.zone>0?1:0);
};
S.rankOf = function(g,s){
  const all=[s.rep.ov]; let r=1,n=1;
  for(const o of g.rivals){ if(o.type===s.type&&o.status==='active'){ n++; if(o.rep.ov>s.rep.ov) r++; } }
  for(const o of g.schools){ if(o!==s&&!o.closed&&o.type===s.type){ n++; if(o.rep.ov>s.rep.ov) r++; } }
  s.rank={r,n}; return s.rank;
};
S.eff = g=> W.eff(g);

/* ---------- 週結算：財務 ---------- */
S.weekFin = function(g,s){
  const T=D.TYPES[s.type], w=g.w, sess=CAL.inSession(w), M=W.M(g), led=s.led;
  const enr=s.students.filter(x=>x.st===0).length, n=s.students.length;
  const diff=g.diff;
  // 預收學費轉列收入
  if(s.semLeft>0 && sess){ const bal=-(led.bal.defRev||0); if(bal>0.5){ const a=Math.round(bal/s.semLeft); if(a>0) L.post(led,[['defRev',a],['rTuition',-a]]); } s.semLeft--; }
  // 應收帳款收回
  if(s.arSched.length){ for(const a of s.arSched.slice()){
      if(a.wk>0){ const c=Math.round(a.amt0*.12); const cc=Math.min(c,led.bal.ar||0); if(cc>0) L.post(led,[['cash',cc],['ar',-cc]],'op','收回應收學費'); a.wk--; a.coll=(a.coll||0)+cc; }
      else { const rem=Math.max(0,Math.min(led.bal.ar||0,a.amt0-(a.coll||0))); if(rem>0) L.post(led,[['eBad',rem],['ar',-rem]]); s.arSched.splice(s.arSched.indexOf(a),1); } } }
  if(sess){
    // 政府補助
    const reg=g.regionRule; let sub=W.subsidy(g,s.type)*enr/40;
    if(reg.subM==='perf') sub*=(.4+s.rep.ov/100*1.2); else if(reg.subM==='voucher') sub*=(.6+.8*U.clamp(enr/Math.max(1,s.cap.ideal||1),0,1));
    if(s.ratio>g.world.pol.classMax*1.0) sub*=.85;
    L.rev(s,'rSubsidy',sub*diff.rev);
    // 耗材
    L.exp(s,'eSupply',n*T.supply*M*(.8+.003*s.curr)*(D.PHIL[s.cfg.phil].cost)*diff.cost/40);
    // 獎學金
    let sch=0; for(const x of s.students) sch+=x.sch; if(sch>0) L.exp(s,'eScholar',sch/40);
  }
  // 薪資/福利
  let pay=0; for(const x of s.staff) pay+=x.sal*12/52;
  L.exp(s,'eSalary',pay); L.exp(s,'eWelfare',pay*g.world.welfare);
  // 行政營運
  const effAdmin=1-Math.min(.25,U.sum(s.bld,b=>b.t==='admin'&&b.prog<=0?.08*b.lv:0))+ (s.flags.chaos?0.2:0);
  const pr=s.staff.find(x=>x.id===s.principalId);
  const admin=M*(0.5e6+s.bld.length*0.06e6+n*2200)*effAdmin*(1.15-(pr?pr.mgmt:30)/400)*diff.cost/52*(D.PHIL[s.cfg.phil].cost);
  L.exp(s,'eAdmin',admin);
  // 招生宣傳
  const mk=s.cfg.mkt/52; L.exp(s,'eMkt',mk); s.stats.mktSpend+=mk;
  // 培訓（預算）
  L.exp(s,'eTrain',s.cfg.trn/52);
  // 設備預算累積
  const eq=Math.min(s.cfg.eqp/52,Math.max(0,L.cash(s)+Math.max(0,L.creditLimit(g,s))*.5)); s.eqPool+=eq;
  // 維護：自動修繕最差建築
  S.maintainWeek(g,s);
  // 附屬事業
  const aux=S.auxIncome(g,s); if(aux.total>0) L.rev(s,'rAux',aux.total*diff.rev);
  const rs=S.researchIncome(g,s); if(rs.grant>0) L.rev(s,'rResearch',rs.grant*diff.rev); if(rs.ind>0) L.rev(s,'rIndustry',rs.ind*diff.rev);
  // 基金投資收益
  const en=led.bal.endow||0; if(en>0){ const r=(0.02+Math.max(0,g.world.infl)*0.5+0.015*g.world.cyc)/52; L.post(led,[['endow',Math.round(en*r)],['rInvest',-Math.round(en*r)]]); }
  L.depreciate(g,s);
};
S.maintainWeek = function(g,s){
  let budget=s.cfg.mnt/52; if(budget<=0) return;
  const cashOK=Math.max(0,L.cash(s)+L.creditLimit(g,s)*.3); budget=Math.min(budget,cashOK);
  const bs=s.bld.filter(b=>b.prog<=0&&b.dur<100).sort((a,b)=>a.dur-b.dur);
  let left=budget, spent=0;
  for(const b of bs){ if(left<=0) break;
    const per=S.bcost(g,b.t)*D.LVCOST.slice(1,b.lv+1).reduce((a,x)=>a+x,0)*0.0075; // 每點成本
    const pts=Math.min(100-b.dur,left/per,6); if(pts<=0) continue; b.dur+=pts; const c=pts*per; left-=c; spent+=c; }
  if(spent<budget*.35 && bs.length===0) spent=budget*.35; // 例行保養（無待修）
  L.exp(s,'eMaint',spent);
};
S.auxIncome = function(g,s){
  const M=W.M(g), n=s.students.length, o={dorm:0,canteen:0,parking:0,audit:0,aff:0,total:0}; const sess=CAL.inSession(g.w)?1:0;
  if(s.cap.beds>0&&sess){ o.dorm=S.dormOcc(s)*25000*M/40*(1); }
  const cant=s.fac.sup.canteen||0; if(cant>0&&sess){ o.canteen=Math.min(n,cant*400)*1400*M/40*.35; }
  if(s.fac.sup.parking){ o.parking=s.fac.sup.parking*18000*M/52; }
  if(s.fac.sup.audit){ o.audit=s.fac.sup.audit*90000*M/52*(s.rep.social/60); }
  for(const a of s.affil){ if(a.prog>0) continue; const def=SE.G && SE.G.AFFIL[a.k]; if(def){ const v=def.inc(g,s,a)/52; o.aff+=v; } }
  o.total=o.dorm+o.canteen+o.parking+o.audit+o.aff; return o;
};
S.researchIncome = function(g,s){
  const M=W.M(g), r={grant:0,ind:0};
  const rc=s.fac.research||0; const ph=D.PHIL[s.cfg.phil];
  const profs=s.staff.filter(x=>x.role==='t'&&x.prof>=60).length;
  if(s.type==='un'||s.type==='gs'||s.type==='jc'){
    r.grant=(rc*900000+profs*(s.type==='gs'?260000:120000))*M*(s.rep.research/55)*(g.world.tech/70)/52;
  } else r.grant=rc*150000*M/52;
  // 產學合作：來自校友企業合約
  let ind=0; for(const c of (g.contracts||[])) if(c.sid===s.id&&c.until>=g.y) ind+=c.amt;
  ind=ind/52*(1+(s.cfg.phil==='tech'?.3:0))+ (s.type==='vh'||s.type==='jc'? (s.fac.sup.workshop||0)*200000*M*(s.rep.outcome/60)/52:0);
  r.ind=ind; return r;
};

/* ---------- 月度 ---------- */
S.month = function(g,s,byId){
  const M=W.M(g);
  L.serviceLoans(g,s,byId);
  // 設備採購（資本化）
  if(s.eqPool>1){ const cost=s.eqPool; s.eqPool=0; if(L.cash(s)+L.creditLimit(g,s)>=cost*.2){
      const cc=Math.round(cost); L.buyAsset(g,s,'eqp','教學設備',cc,8,0,true);
      const unit=(s.students.length+30)*M*250; s.equip=U.clamp(s.equip+cost/unit,0,100); } }
  const tdelta=Math.max(0,W.era(g.y+1).tech-W.era(g.y).tech);
  s.equip=U.clamp(s.equip-(1.0+0.35*tdelta),0,100);
  // 課程：培訓預算與創新
  const tch=Math.max(1,S.teachers(s).length); const pr=s.staff.find(x=>x.id===s.principalId);
  const trRatio=Math.min(1.3,s.cfg.trn/(tch*M*28000));
  s.curr=U.clamp(s.curr+(0.95*trRatio-0.55+(pr&&pr.sty===2?.3:0)+S.policyFit(g,s)*.25),0,100);
  s.curr=Math.max(s.curr,5);
  S.calc(g,s); S.updateQuality(g,s); P.studentMonth(g,s);
  S.staffMonth(g,s);
  S.updateRep(g,s); S.rankOf(g,s);
  // 招募過期
  s.cands=s.cands.filter(c=>c.exp>g.abs);
  for(const c of s.staff){ if(c.tr>0) c.tr=Math.max(0,c.tr-4); }
  const rev12=(s.led.months.slice(-12)).reduce((a,m)=>a+(Object.keys(m.pl).filter(k=>k[0]==='r').reduce((x,k)=>x-m.pl[k],0)),0);
  s.last12rev=Math.max(rev12,s.last12rev*.9);
  // 薪資比
  const mkt=U.avg(s.staff,x=>x.sal/Math.max(1,P.marketSalary(g,s,x))); s.avgSalRatio=mkt||1;
  L.closeMonth(s,g.y,CAL.monthOf(g.w));
};
S.staffMonth = function(g,s){
  const T=D.TYPES[s.type]; const M=W.M(g); const ph=D.PHIL[s.cfg.phil];
  const pr=s.staff.find(x=>x.id===s.principalId);
  const overload=Math.max(0,s.students.length/Math.max(1,S.fte(s))-T.spt)/T.spt;
  const offc=s.cap.staff>0? s.staff.length/s.cap.staff:1.3;
  const rivalQ=s.rivalAvgQ-50;
  const out=[];
  for(const p of s.staff.slice()){
    const mk=P.marketSalary(g,s,p); const ratio=p.sal/Math.max(1,mk);
    let tgt=52+U.clamp((ratio-1)*85,-28,26)-overload*28-Math.max(0,offc-1)*14+(pr?(pr.mgmt-50)*.15:-6)+ph.sat*.2+S.policyFit(g,s)*4-U.sum(p.rl,r=>r[2]<-30?1:0)*3+U.sum(p.rl,r=>r[2]>40?1:0)*1.5
      +(s.insW>0?-26:0)+(s.flags.chaos?-6:0)+(s.fac.sat-50)*.12 + (s.cfg.delegate?0:0);
    p.sat=U.clamp(Math.round(p.sat+(tgt-p.sat)*.12),0,100);
    // 技能自然成長
    if(p.role==='t'&&R.chance(g,.08)){ p.teach=Math.min(99,p.teach+ (p.resp>60?1:0)); }
    p.perf=P.appraise(g,s,p);
    // 自主要求：加薪
    if(!p.req && p.sat<52 && ratio<.98 && R.chance(g,.14*(p.amb/60))){ p.req=1; out.push(['raise',p]); }
    else if(!p.req && p.role==='t' && p.amb>65 && p.ex>5 && p.perf>68 && R.chance(g,.03)){ p.req=1; out.push(['promo',p]); }
    // 離職
    const lp=Math.max(0,(40-p.sat)/40)*.1 + (ratio<.85?.02:0) + (rivalQ>10?.004:0);
    if(R.chance(g,lp)){ out.push(['quit',p]); }
  }
  // 年齡：退休與健康在年度處理
  for(const [k,p] of out){
    if(!SE.Ev) continue;
    if(k==='quit'){
      if(p.perf>70&&s.staff.length>3&&R.chance(g,.65)&&SE.Ev.requestStaff(g,s,'quit',p)){} else { P.leave(g,s,p,'quit'); S.log(g,s,`${p.nm}（${p.role==='t'?'教師':'職員'}）離職`,false); }
    } else SE.Ev.requestStaff(g,s,k,p);
  }
};

/* ---------- 年度：教職員老化 ---------- */
S.staffYear = function(g,s){
  const retAge=g.world.retire;
  for(const p of s.staff.slice()){
    const age=P.staffAge(g,p);
    if(age>=retAge+ (p.role==='p'?3:0) && R.chance(g,.35+ (age-retAge)*.12)){ P.leave(g,s,p,'retire'); S.log(g,s,`${p.nm}退休（年資 ${p.ex} 年）`,p.role==='p'); if(SE.Ev&&p.role==='p') SE.Ev.vacancy(g,s); continue; }
    const haz=Math.max(0.0004,(age/(g.world.life+6))**10*.4);
    if(R.chance(g,haz)){ P.leave(g,s,p,'death'); S.log(g,s,`${p.nm}病逝`,p.ex>20); continue; }
    p.ex++; if(p.ex>=6&&!p.tn) p.tn=1;
  }
};
})(typeof window!=='undefined'?window:globalThis);
