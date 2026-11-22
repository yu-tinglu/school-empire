(function(root){
'use strict';
const SE = root.SE, R=SE.R, U=SE.U, D=SE.D, W=SE.W, L=SE.L, P=SE.P, S=SE.S, Rv=SE.Rv, CAL=SE.CAL;
const G = SE.G = {};

/* ---------- 附屬教育機構 ---------- */
G.AFFIL = {
 shop:{n:'附屬書店餐飲',types:null,cost:g=>W.M(g)*2.5e6,inc:(g,s)=>s.students.length*W.M(g)*1800*(.6+s.rep.ov/100),d:'提供校內外零售餐飲，穩定現金流'},
 cram:{n:'附設課後輔導班',types:['kg','ps','jh','hs'],cost:g=>W.M(g)*3e6,inc:(g,s)=>s.students.length*W.M(g)*4200*(s.rep.ov/60),d:'課後托育與輔導收入，略損教師精力'},
 inst:{n:'附屬研究院',types:['un','gs','jc'],cost:g=>W.M(g)*2.2e7,inc:(g,s)=>W.M(g)*3.2e6*(s.rep.research/45)+W.M(g)*8e5,d:'承接研究與委託計畫'},
 plant:{n:'附設實習工廠企業',types:['vh','jc','un'],cost:g=>W.M(g)*1.6e7,inc:(g,s)=>W.M(g)*3.0e6*(s.rep.outcome/55),d:'營運實習企業，提升就業成果'},
 clinic:{n:'附屬醫療中心',types:['un'],cost:g=>W.M(g)*6e7,inc:(g,s)=>W.M(g)*1.0e7*(s.rep.research/55+.4),d:'大學附設醫療，收入高但資本大'},
 care:{n:'附設托育中心',types:['kg','ps'],cost:g=>W.M(g)*2.8e6,inc:(g,s)=>s.students.length*W.M(g)*3000,d:'提供教職員與社區托育服務'},
};
G.buildAffil = function(g,s,k){
  const def=G.AFFIL[k]; if(!def) return {ok:false}; if(def.types&&!def.types.includes(s.type)) return {ok:false,msg:'此學制不適用'};
  if(s.affil.some(a=>a.k===k)) return {ok:false,msg:'已設立'};
  const c=Math.round(def.cost(g)*g.diff.cost); if(L.cash(s)<c) return {ok:false,msg:`現金不足（需要 ${U.money(c)}）`};
  L.buyAsset(g,s,'oth',def.n,c,10,.1,true); s.affil.push({k,prog:12,y:g.y}); S.log(g,s,`設立${def.n}`,false);
  return {ok:true,msg:`${def.n}籌設中，約 12 週後營運`};
};

/* ---------- 集團資金與管理 ---------- */
G.byId = g=> id=> id==='HQ'?g.hq:g.schools.find(s=>s.id===id);
G.ents = g=> [g.hq,...g.schools.filter(s=>!s.closed)];
G.initHQ = function(g,name){
  const hq={id:'HQ',name:name,isHQ:true}; L.initEnt(hq); g.hq=hq;
  g.group={name,founded:false,brand:0,feeRate:.03,strategy:'balanced',levels:[],directPolicy:true,legacyGroup:false};
  g.player.personal=Math.round(W.M(g)*8e6*g.diff.cash);
};
G.foundGroup = function(g){ if(g.group.founded) return {ok:false}; const c=Math.round(W.M(g)*1.5e6); if(g.player.personal<c) return {ok:false,msg:`個人資金不足（需要 ${U.money(c)}）`}; g.player.personal-=c; g.group.founded=true; S.log(g,null,`成立教育集團「${g.group.name}」`,true); return {ok:true,msg:'教育集團已成立，解鎖集團總部功能。'}; };
G.inject = function(g,amt){ amt=Math.round(amt); if(amt<=0||g.player.personal<amt) return {ok:false,msg:'個人資金不足'}; g.player.personal-=amt; L.post(g.hq.led,[['cash',amt],['paid',-amt]],'fin','股東注資'); return {ok:true,msg:`已注資 ${U.money(amt)} 至集團總部`}; };
G.upstream = function(g,sid,amt){ // 學校→總部：分配股利
  const s=g.schools.find(x=>x.id===sid); amt=Math.round(amt); if(!s) return {ok:false};
  const reserve=Math.max(0,(s.last12rev||0)*.18); if(L.cash(s)-amt<reserve||s.insW>0) return {ok:false,msg:`保留現金需維持營收 18% 以上（${U.money(reserve)}）`};
  L.post(s.led,[['dist',amt],['cash',-amt]],'fin','分配股利給總部'); L.post(g.hq.led,[['cash',amt],['rDiv',-amt]],'op','子校股利收入'); return {ok:true,msg:`已上繳 ${U.money(amt)}`};
};
G.downstream = function(g,sid,amt,kind){
  const s=g.schools.find(x=>x.id===sid); amt=Math.round(amt); if(!s||amt<=0) return {ok:false};
  if(L.cash(g.hq)<amt) return {ok:false,msg:'總部現金不足'};
  if(kind==='loan'){ L.addLoan(g,s,amt,60,'ic',g.hq); return {ok:true,msg:`已撥付集團內借款 ${U.money(amt)}`}; }
  L.post(g.hq.led,[['invSub',amt],['cash',-amt]],'inv','增資子校'); L.post(s.led,[['cash',amt],['paid',-amt]],'fin','母公司增資'); return {ok:true,msg:`已增資 ${U.money(amt)}`};
};
G.hqLoan = function(g,amt,months){ amt=Math.round(amt); const cap=L.creditLimit(g,g.hq); if(amt>cap) return {ok:false,msg:`總部授信額度僅 ${U.money(cap)}`}; L.addLoan(g,g.hq,amt,months||60,'bank'); return {ok:true,msg:'總部借款已撥入'}; };
G.personalDraw = function(g,amt){ amt=Math.round(amt); if(L.cash(g.hq)<amt) return {ok:false,msg:'總部現金不足'}; L.post(g.hq.led,[['paid',amt],['cash',-amt]],'fin','股東提領'); g.player.personal+=amt; return {ok:true}; };
G.hqWeek = function(g){
  const n=g.schools.filter(s=>!s.closed).length;
  if(g.group.founded){ const M=W.M(g); const oh=M*(.6e6+.9e6*Math.pow(n,1.15))/52*g.diff.cost; L.exp(g.hq,'eAdmin',oh); }
};
G.hqMonth = function(g){
  const byId=G.byId(g);
  if(g.group.founded){
    for(const s of g.schools){ if(s.closed) continue; const per=s.led.per; let rev=0; for(const k of L.REVS) if(!L.IC.has(k)) rev-=(per[k]||0); const fee=Math.round(Math.max(0,rev)*g.group.feeRate);
      if(fee>0&&L.cash(s)>fee*1.2&&s.insW===0){ L.post(s.led,[['eMgmt',fee],['cash',-fee]],'op','集團管理費'); L.post(g.hq.led,[['cash',fee],['rMgmt',-fee]],'op','集團管理費收入'); } }
  }
  L.serviceLoans(g,g.hq,byId);
  L.closeMonth(g.hq,g.y,CAL.monthOf(g.w));
  G.brand(g);
};
G.brand = function(g){
  const ss=g.schools.filter(s=>!s.closed); if(!ss.length){ g.group.brand=0; return; }
  const lv=new Set(ss.map(s=>s.type)); g.group.levels=[...lv];
  const t=U.clamp(.55*U.avg(ss,s=>s.rep.ov)+3.5*lv.size+1.2*Math.min(8,ss.length)+ (g.group.founded?3:0),0,100);
  g.group.brand+= (t-g.group.brand)*.08;
};
G.kpi = function(g,s){
  const m=U.clamp(((s.last12rev?(L.ni(s.led.bal)+(s.led.years.length?0:0))/Math.max(1,s.last12rev):0)),-.5,.4);
  const fill=s.cap.ideal?s.students.length/s.cap.ideal:0;
  const score=Math.round(.35*s.rep.ov+.2*U.clamp(50+m*150,0,100)+.2*U.clamp(fill*100,0,100)+.1*s.rep.staffSat+.15*(100-L.risk(g,s)));
  return {score,grade:score>=75?'A':score>=60?'B':score>=45?'C':'D',fill,margin:m};
};

/* ---------- 新設學校 / 學部 / 校區 ---------- */
G.foundCost = function(g,type,kind){
  const T=D.TYPES[type], M=W.M(g);
  const cells=(kind==='div'?.6:1)*10*7;
  const land=Math.round(cells*W.landCell(g)*g.diff.cost);
  let bld=0; const list=['classroom','office'];
  for(const k of Object.keys(D.NEEDS[type])) if(S.avail(g,k)&&['field','clinic','canteen','library'].includes(k)) list.push(k);
  for(const k of list) bld+=D.BLD[k].c*M*g.diff.cost;
  const reserve=Math.round(S.TENT[type]*T.y*.3*(T.tu*2+T.sub)*W.M(g)*.9+T.sal*700000*W.M(g)*.8);
  return {land,bld:Math.round(bld),reserve,total:land+Math.round(bld)+reserve,list};
};
G.populate = function(g,s,o){
  const T=D.TYPES[s.type]; const n=o.enr||0;
  for(let i=0;i<n;i++){ const st=P.newStudent(g,s,{gr:(i%T.y)+1,ab:U.clamp(Math.round(R.n(g,40+o.q*.2,15)),5,98)}); s.students.push(st); P.add(g,st); }
  const need=Math.max(2,Math.ceil(Math.max(n,S.TENT[s.type]*1.2)/T.spt));
  const lvl=U.clamp(o.q+(o.lvlAdj||0),30,80);
  for(let i=0;i<need;i++){ const st=P.newStaff(g,s,'t',{fld:i%4,lvl}); s.staff.push(st); P.add(g,st); }
  const nA=Math.max(1,Math.ceil(Math.max(n,60)/150)); for(let i=0;i<nA;i++){ const st=P.newStaff(g,s,'a',{lvl}); s.staff.push(st); P.add(g,st); }
  for(const dt of (o.small?D.DT.slice(0,2):D.DT)){ const st=P.newStaff(g,s,'d',{lvl,dt}); s.staff.push(st); P.add(g,st); }
  const pr=P.newStaff(g,s,'p',{lvl,ex:12}); pr.mgmt=U.clamp(Math.round(R.n(g,o.q+8,8)),25,90); pr.pStart=g.y; s.staff.push(pr); P.add(g,pr); s.principalId=pr.id;
};
G.found = function(g,o){ // {type,kind:'div'|'campus'|'new', parentId, name}
  const type=o.type, kind=o.kind; const parent=o.parentId?g.schools.find(x=>x.id===o.parentId):null;
  if(!D.TYPES[type]) return {ok:false,msg:'學制錯誤'};
  if(kind==='div'&&(!parent||parent.type===type)) return {ok:false,msg:'增設學部需選擇不同學制的母校'};
  if(kind==='campus'&&(!parent||parent.type!==type)) return {ok:false,msg:'新校區需選擇同學制母校'};
  if(!g.group.founded) return {ok:false,msg:'請先成立教育集團'};
  if(g.schools.filter(s=>!s.closed).length>=12) return {ok:false,msg:'學校數量已達上限（12）'};
  const c=G.foundCost(g,type,kind); if(L.cash(g.hq)<c.total) return {ok:false,msg:`總部現金不足（需要 ${U.money(c.total)}）`};
  const name=o.name||(parent&&kind==='div'?parent.name.replace(/(幼兒園|國小|國中|高中|高工|專科學校|大學|研究院)$/,'')+D.TYPES[type].sf:(kind==='campus'&&parent?parent.name+'第二校區':Rv.name(g,type)));
  const s=S.blank(g,{name,type,kind,site:kind==='div'&&parent?parent.site:name,parentId:parent?parent.id:0,phil:parent?parent.cfg.phil:'exam',lw:10,lh:7});
  s.founded=g.y; g.schools.push(s);
  // 資金：總部增資
  L.post(g.hq.led,[['invSub',c.total],['cash',-c.total]],'inv','設立新校'); L.post(s.led,[['cash',c.total],['paid',-c.total]],'fin','母公司增資');
  L.buyAsset(g,s,'land','校地',c.land,0,0,true);
  for(const k of c.list){ const d=D.BLD[k]; const b=S.addBldFree(g,s,k,{lv:1,dur:100}); b.prog=Math.round(d.wk*.6); const a=L.buyAsset(g,s,'bld',d.n,Math.round(D.BLD[k].c*W.M(g)*g.diff.cost),d.life,.1,false,b.id); b.aid=a.id; }
  const f=kind==='div'?.55:kind==='campus'?.6:.12; const base=parent?parent.rep:null;
  for(const d of D.DIMS) s.rep[d]=base?Math.max(30,base[d]*f+ (1-f)*30):32;
  s.rep.aw=base?Math.max(20,base.aw*f+ (1-f)*18):20; s.rep.social=base?base.social*f*.8+10:12;
  s.quality=base?Math.max(40,parent.quality*.85):42; s.curr=base?parent.curr*.9:42; s.equip=55;
  G.populate(g,s,{enr:0,q:base?parent.quality:45,small:true});
  S.calc(g,s); S.defaultBudget(g,s); s.cfg.quota=Math.round(S.TENT[type]*.55); s.cfg.tuition=Math.round(W.tuitionNorm(g,type)*(base?1:.9));
  s.cfg.mkt=Math.round(s.cfg.mkt*1.8); S.updateRep(g,s); S.rankOf(g,s);
  const kn={div:'增設學部',campus:'新校區',new:'創辦學校'}[kind];
  S.log(g,s,`${kn}：${s.name}（${D.TYPES[type].n}）成立`,true);
  return {ok:true,msg:`${s.name}成立！請任命校長與教職員，並於招生季（第 30 週）前準備好招生。`,s};
};

/* ---------- 收購 ---------- */
G.quote = function(g,r){
  const T=D.TYPES[r.type], M=W.M(g);
  const rev=Rv.revenue(g,r), fac=r.cap*M*1.0e5*(.4+.8*r.fac/100);
  const nav=Math.max(0,r.cash)+fac-r.debt;
  const gw=Math.max(0,rev*.9*(r.rep.ov/60));
  let price=Math.max(rev*.15,nav+gw*(r.rep.ov/70))*(r.poor>6?.55:1)*(r.coop<30?1.08:1);
  price=Math.max(M*3e6,price);
  return {price:Math.round(price),rev:Math.round(rev),nav:Math.round(nav),debt:Math.round(r.debt),fac:Math.round(fac)};
};
G.acquire = function(g,rid){
  const r=g.rivals.find(x=>x.id===rid&&x.status==='active'); if(!r) return {ok:false,msg:'對象不存在'};
  if(!g.group.founded) return {ok:false,msg:'請先成立教育集團'};
  const q=G.quote(g,r); if(L.cash(g.hq)<q.price) return {ok:false,msg:`總部現金不足（收購價 ${U.money(q.price)}）`};
  if(g.schools.filter(s=>!s.closed).length>=12) return {ok:false,msg:'學校數量已達上限'};
  const s=S.blank(g,{name:r.name,type:r.type,kind:'acq',phil:r.phil}); s.founded=r.age;
  g.schools.push(s);
  const T=D.TYPES[r.type]; const cells=Math.max(40,Math.round(r.cap/ (T.cls*8)*6+40));
  s.land={w:14,h:Math.max(8,Math.ceil(cells/14))};
  const need=['classroom','office']; for(const k of Object.keys(D.NEEDS[r.type])) if(S.avail(g,k)&&k!=='research'&&r.fac>35) need.push(k);
  const nC=Math.ceil(r.cap/(8*T.cls));
  for(const k of need){ const n=k==='classroom'?nC:1; for(let i=0;i<n;i++){ const b=S.addBldFree(g,s,k,{lv:1,dur:U.clamp(Math.round(r.fac+R.n(g,0,10)),20,95)}); if(b) S.seedAssetsFor(g,s,b,R.i(g,4,25)); } }
  s.assets.push({id:g.nextId++,k:'land',n:'校地',c:Math.round(s.land.w*s.land.h*W.landCell(g)*.4),ad:0,life:0,res:0,start:g.abs,bid:0});
  const cash=Math.max(0,Math.round(r.cash)); const bank=Math.round(r.debt);
  const fa=s.assets.reduce((a,x)=>a+x.c,0), ad=s.assets.reduce((a,x)=>a+x.ad,0);
  const nav=cash+fa-ad-bank; const gw=Math.max(0,q.price-nav);
  const b=s.led.bal; b.cash=cash; b.fa=fa; b.accDep=-ad; b.loans=-bank; b.gw=gw; b.paid=-q.price; b.ret=-(cash+fa-ad+gw-bank-q.price)*1; // 平衡
  if(bank>0) s.loans.push({id:g.nextId++,p0:bank,bal:bank,r:L.rate(g,s,'bank'),term:120,left:96,kind:'bank',ic:false,y:g.y});
  L.post(g.hq.led,[['invSub',q.price],['cash',-q.price]],'inv','收購學校');
  for(const d of D.DIMS) s.rep[d]=r.rep[d]; s.rep.ov=r.rep.ov; s.rep.aw=r.rep.aw; s.quality=r.quality; s.curr=U.clamp(r.quality-4,20,90); s.equip=U.clamp(r.fac,15,90);
  s.cfg.tuition=r.tuition; s.cfg.quota=Math.max(10,Math.round(r.cap/T.y*.9)); s.cfg.phil=r.phil;
  S.calc(g,s); G.populate(g,s,{enr:Math.round(r.enr),q:r.quality});
  S.calc(g,s); S.defaultBudget(g,s); s.cfg.tuition=r.tuition; s.last12rev=q.rev; P.markKey(g,s);
  r.status='acquired'; r.endY=g.y;
  S.log(g,s,`收購「${r.name}」，價格 ${U.money(q.price)}`,true);
  return {ok:true,msg:`收購完成：${s.name}（學生約 ${s.students.length} 人，商譽 ${U.money(gw)}）`,s};
};
// 學校→對手（出售/分拆）
G.dematerialize = function(g,s,ownerless){
  const T=D.TYPES[s.type];
  const r=Rv.make(g,s.type,{name:s.name,q:s.quality,capMult:Math.max(.4,s.cap.seats/(S.TENT[s.type]*T.y)),fill:s.cap.seats?Math.min(1,s.students.length/s.cap.seats):.5,age:g.y-s.founded});
  r.enr=s.students.length; r.tuition=s.cfg.tuition; r.tr=s.cfg.tuition/Math.max(1,W.tuitionNorm(g,s.type)); r.phil=s.cfg.phil; r.rep=Object.assign({},s.rep); r.cash=Math.max(0,L.cash(s)); r.debt=L.debt(s,true); r.coop=55;
  g.rivals.push(r); return r;
};
G.saleValue = function(g,s){
  const rev=s.last12rev||0; const nav=L.netFixed(s)+Math.max(0,L.cash(s))+(s.led.bal.endow||0);
  const debt=L.debt(s,true), ap=-(s.led.bal.ap||0);
  const v=Math.max(rev*.1,nav+rev*.5*(s.rep.ov/70))*.9-debt-ap;
  return Math.round(Math.max(0,v));
};
G.sell = function(g,sid){
  const s=g.schools.find(x=>x.id===sid&&!x.closed); if(!s) return {ok:false};
  if(g.schools.filter(x=>!x.closed).length<=1&&false) return {ok:false};
  const price=G.saleValue(g,s); const icBal=-(s.led.bal.icAp||0); const paid=-(s.led.bal.paid||0);
  // 總部：收款、沖銷投資與集團內債權、認列損益
  const gain=price-paid-0; const lines=[['cash',price+icBal],['invSub',-paid],['icAr',-icBal]];
  const diff=-(lines.reduce((a,x)=>a+x[1],0)); // 需補的損益 (借方為正→損失)
  lines.push([diff>0?'eLoss':'rGain',diff]); L.post(g.hq.led,lines,'inv','出售學校價款');
  G.dematerialize(g,s); G.retire(g,s,'出售'); S.log(g,null,`出售「${s.name}」，得款 ${U.money(price)}`,true);
  return {ok:true,msg:`已出售${s.name}，得款 ${U.money(price)}（損益 ${U.money(price-paid)}）`};
};
G.retire = function(g,s,why){
  s.closed=true; const i=g.schools.indexOf(s); if(i>=0) g.schools.splice(i,1);
  for(const x of s.students) P.del(g,x); for(const x of s.staff) P.del(g,x);
  g.past.push({n:s.name,type:s.type,y0:s.founded,y1:g.y,why,peak:s.stats.peak||s.students.length});
  if(g.past.length>60) g.past.shift();
  for(const a of g.alumni) if(a.sid===s.id){ /* 保留校友 */ }
  g.events.pending=g.events.pending.filter(e=>e.sid!==s.id);
  if(g.curId===s.id){ g.curId=(g.schools[0]||{}).id||0; }
};
G.liquidate = function(g,sid,why){ // 關校清算
  const s=g.schools.find(x=>x.id===sid&&!x.closed); if(!s) return {ok:false};
  const sev=Math.round(U.sum(s.staff,p=>p.sal)*1.5); L.post(s.led,[['eOther',sev],['ap',-sev]]);
  for(const a of s.assets.slice()){ const rate=a.k==='land'?.85:a.k==='bld'?.5:.2; L.disposeAsset(s,a,Math.max(0,(a.c-a.ad)*rate)); }
  // 以現金償債：應付→銀行→集團內
  let cash=Math.max(0,L.cash(s));
  const pay=(acct,amt)=>{ amt=Math.round(Math.min(amt,cash)); if(amt>0){ L.post(s.led,[[acct,amt],['cash',-amt]],'fin','清算還款'); cash-=amt; } };
  pay('ap',-(s.led.bal.ap||0)); pay('loans',-(s.led.bal.loans||0));
  const icBal=-(s.led.bal.icAp||0); const hqRecover=Math.round(Math.min(icBal,cash));
  if(hqRecover>0){ L.post(s.led,[['icAp',hqRecover],['cash',-hqRecover]],'fin','清算還款'); L.post(g.hq.led,[['cash',hqRecover],['icAr',-hqRecover]],'inv','收回清算款'); cash-=hqRecover; }
  const icLoss=Math.round(icBal-hqRecover); if(icLoss>0) L.post(g.hq.led,[['eOther',icLoss],['icAr',-icLoss]]);
  const left=Math.round(cash); const paid=-(s.led.bal.paid||0);
  const lines=[['invSub',-paid]]; if(left>0){ lines.push(['cash',left]); }
  const diff=-lines.reduce((a,x)=>a+x[1],0); lines.push([diff>0?'eLoss':'rGain',diff]); L.post(g.hq.led,lines,left>0?'inv':null,'清算分配');
  for(const x of s.students){ /* 學生轉學 */ }
  for(const r of g.rivals) if(r.type===s.type&&r.status==='active') r.enr=Math.min(r.cap,r.enr+Math.round(s.students.length*.08));
  S.log(g,null,`「${s.name}」${why||'停辦'}（清算）`,true); Rv.news(g,`${s.name}停辦`,true);
  G.retire(g,s,why||'停辦');
  return {ok:true,msg:`${s.name}已清算停辦。`};
};
G.restructure = function(g,sid){
  const s=g.schools.find(x=>x.id===sid&&!x.closed); if(!s) return {ok:false};
  if(s.flags.restY&&g.y-s.flags.restY<5) return {ok:false,msg:'五年內不得重複重整'};
  const bank=-(s.led.bal.loans||0), ap=-(s.led.bal.ap||0);
  if(bank+ap<=0) return {ok:false,msg:'沒有可重整債務'};
  const hair=Math.round(bank*.35); const apCut=Math.round(ap*.4);
  if(hair>0){ L.post(s.led,[['loans',hair],['rGain',-hair]]); let left=hair; for(const ln of s.loans){ const d=Math.min(ln.bal,left); ln.bal-=d; left-=d; if(left<=0) break; } }
  if(apCut>0) L.post(s.led,[['ap',apCut],['rGain',-apCut]]);
  const remAp=-(s.led.bal.ap||0);
  if(remAp>0){ L.post(s.led,[['ap',remAp],['loans',-remAp]]); s.loans.push({id:g.nextId++,p0:remAp,bal:remAp,r:L.rate(g,s,'bank')+.01,term:120,left:120,kind:'bank',ic:false,y:g.y}); }
  for(const ln of s.loans){ ln.term=Math.max(ln.term,120); ln.left=120; ln.p0=ln.bal; ln.r=Math.min(ln.r+.01,.3); }
  // 裁員 20%
  const cands=s.staff.filter(p=>p.role!=='p').sort((a,b)=>a.perf-b.perf).slice(0,Math.floor(s.staff.length*.2));
  for(const p of cands){ const sev=Math.round(p.sal*1.5); L.post(s.led,[['eOther',sev],['ap',-sev]]); P.leave(g,s,p,'cut'); }
  s.trustAdj-=6; s.rep.trust=Math.max(0,s.rep.trust-6); for(const p of s.staff) p.sat=Math.max(0,p.sat-8);
  s.flags.restY=g.y; s.insW=0; s.flags.restructured=(s.flags.restructured||0)+1;
  S.log(g,s,`債務重整：銀行債務減免 ${U.money(hair)}、積欠款減免 ${U.money(apCut)}，裁員 ${cands.length} 人`,true);
  return {ok:true,msg:`重整完成：債務減免 ${U.money(hair+apCut)}，裁員 ${cands.length} 人，信任度與士氣受挫。`};
};
G.sellAssetItem = function(g,s,aid){
  const a=s.assets.find(x=>x.id===aid); if(!a||a.k==='bld'&&s.bld.some(b=>b.aid===a.id)) return {ok:false,msg:'請由校園建設拆除建築'};
  if(a.k==='land') return {ok:false,msg:'土地請透過事件或出售學校處理'};
  const p=Math.round((a.c-a.ad)*.6); L.disposeAsset(s,a,p); return {ok:true,msg:`已出售，得款 ${U.money(p)}`};
};
// 合併（同學制）：B 併入 A
G.merge = function(g,aId,bId){
  const A=g.schools.find(x=>x.id===aId&&!x.closed), B=g.schools.find(x=>x.id===bId&&!x.closed);
  if(!A||!B||A===B||A.type!==B.type) return {ok:false,msg:'只能合併同學制的兩所學校'};
  for(const x of B.students){ x.fr=[]; x.cb=-1; A.students.push(x); }
  for(const x of B.staff){ if(x.role==='p') x.role='t'; A.staff.push(x); }
  for(const b of B.bld){ const d=D.BLD[b.t]; let pos=S.placeFree(A,d.w,d.h); while(!pos){ A.land.h++; pos=S.placeFree(A,d.w,d.h); } b.x=pos.x; b.y=pos.y; A.bld.push(b); }
  for(const a of B.assets) A.assets.push(a);
  for(const k of Object.keys(B.led.bal)) A.led.bal[k]=(A.led.bal[k]||0)+B.led.bal[k];
  for(const k of Object.keys(B.led.per)) A.led.per[k]=(A.led.per[k]||0)+B.led.per[k];
  for(const k of ['op','inv','fin']){ A.led.pcf[k]+=B.led.pcf[k]; for(const l of Object.keys(B.led.cfd[k])) A.led.cfd[k][l]=(A.led.cfd[k][l]||0)+B.led.cfd[k][l]; }
  for(const r of B.led.months){ const x=A.led.months.find(m=>m.y===r.y&&m.m===r.m); if(x){ for(const k of Object.keys(r.pl)) x.pl[k]=(x.pl[k]||0)+r.pl[k]; for(const k of ['op','inv','fin']) x.cf[k]+=r.cf[k]; x.cash+=r.cash; } else A.led.months.push(U.clone(r)); }
  for(const r of B.led.years){ const x=A.led.years.find(m=>m.y===r.y); if(x){ for(const k of Object.keys(r.pl)) x.pl[k]=(x.pl[k]||0)+r.pl[k]; x.ni+=r.ni; for(const k of ['op','inv','fin']) x.cf[k]+=r.cf[k]; x.assets+=r.assets; x.liab+=r.liab; x.equity+=r.equity; x.cash+=r.cash; x.debt+=r.debt; for(const k of ['op','inv','fin']) for(const l of Object.keys(r.cfd[k])) x.cfd[k][l]=(x.cfd[k][l]||0)+r.cfd[k][l]; } else A.led.years.push(U.clone(r)); }
  A.led.months.sort((a,b)=>a.y*100+a.m-(b.y*100+b.m)); A.led.years.sort((a,b)=>a.y-b.y);
  for(const l of B.loans) A.loans.push(l);
  for(const c of B.cands) A.cands.push(c);
  for(const t of B.transit) A.transit.push(t);
  const nA=A.students.length-B.students.length, nB=B.students.length; const w=nA/(nA+nB||1);
  for(const d of D.DIMS) A.rep[d]=A.rep[d]*w+B.rep[d]*(1-w); A.rep.aw=Math.max(A.rep.aw,B.rep.aw)*.95;
  A.cfg.quota+=Math.round(B.cfg.quota*.5);
  A.eqPool+=B.eqPool; A.arSched=A.arSched.concat(B.arSched); A.semLeft=Math.max(A.semLeft,B.semLeft);
  for(const a of g.alumni) if(a.sid===B.id) a.sid=A.id;
  for(const e of g.events.pending) if(e.sid===B.id) e.sid=A.id;
  for(const c of g.contracts) if(c.sid===B.id) c.sid=A.id;
  B.students=[]; B.staff=[]; // 避免註冊表被清
  g.hist.forEach(h=>{ if(h.sid===B.id) h.sid=A.id; });
  const i=g.schools.indexOf(B); g.schools.splice(i,1); B.closed=true; g.past.push({n:B.name,type:B.type,y0:B.founded,y1:g.y,why:`併入${A.name}`,peak:B.students.length});
  if(g.curId===B.id) g.curId=A.id;
  for(const x of A.staff) x.sat=Math.max(0,x.sat-5); A.trustAdj-=2;
  S.calc(g,A); S.updateQuality(g,A); S.log(g,A,`${B.name}併入${A.name}`,true);
  return {ok:true,msg:`合併完成：${A.name}現有學生 ${A.students.length} 人`};
};
// 集團內轉任校長/人事任命
G.appointPrincipal = function(g,sid,pid){ const s=g.schools.find(x=>x.id===sid); if(!s) return {ok:false}; const p=s.staff.find(x=>x.id===pid); if(!p) return {ok:false}; P.promote(g,s,pid,'p'); p.pStart=g.y; return {ok:true,msg:`${p.nm} 出任 ${s.name} 校長`}; };
G.setDelegate = function(g,sid,on,policy){ const s=g.schools.find(x=>x.id===sid); if(!s) return; s.cfg.delegate=on; if(policy) s.cfg.dpolicy=policy; };
// 失敗後再起
G.relaunch = function(g,opt){
  if(g.schools.filter(s=>!s.closed).length>0) return {ok:false,msg:'仍有學校營運中'};
  g.player.relaunch=(g.player.relaunch||0)+1;
  const seed=Math.round(W.M(g)*1.4e7*Math.max(.35,1-.2*(g.player.relaunch-1))*g.diff.cash);
  g.player.personal+=seed; // 親友資助／重新募資
  L.initEnt(g.hq); g.group.founded=false;
  const type=opt&&opt.type||g.opts.type; const c=G.foundCost(g,type,'new');
  const s=S.blank(g,{name:Rv.name(g,type),type,kind:'new',phil:'exam',lw:10,lh:7}); g.schools.push(s); s.founded=g.y; g.curId=s.id;
  const tot=Math.min(g.player.personal,c.total); g.player.personal-=tot;
  L.post(s.led,[['cash',tot],['paid',-tot]],'fin','創業資金'); L.post(g.hq.led,[['invSub',tot],['paid',-tot]]);
  const land=Math.min(c.land,Math.round(tot*.35)); L.buyAsset(g,s,'land','校地',land,0,0,true);
  for(const k of ['classroom','office']){ const d=D.BLD[k]; const cost=Math.round(d.c*W.M(g)*g.diff.cost*.8); if(L.cash(s)<cost) break; const b=S.addBldFree(g,s,k,{lv:1,dur:100}); b.prog=Math.round(d.wk*.5); const a=L.buyAsset(g,s,'bld',d.n,cost,d.life,.1,false,b.id); b.aid=a.id; }
  s.rep.ov=22; for(const d of D.DIMS) s.rep[d]=28; s.rep.aw=15; s.quality=40; s.curr=40; s.equip=45;
  G.populate(g,s,{enr:0,q:42,small:true}); S.calc(g,s); S.defaultBudget(g,s); s.cfg.quota=Math.round(S.TENT[type]*.45);
  s.cfg.mkt=Math.round(s.cfg.mkt*1.5); S.updateRep(g,s);
  g.status='play'; S.log(g,s,`重新創業：創辦${s.name}`,true);
  return {ok:true,msg:`獲得創業資金 ${U.money(seed)}，已創辦新學校「${s.name}」。`,s};
};
})(typeof window!=='undefined'?window:globalThis);
