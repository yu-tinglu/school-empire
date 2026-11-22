(function(root){
'use strict';
const SE = root.SE, R=SE.R, U=SE.U, D=SE.D, W=SE.W, L=SE.L, P=SE.P, S=SE.S, G=SE.G, Ev=SE.Ev, Rv=SE.Rv;
const AI = SE.AI = {};
// 預算（年度）：依營收比例設定，現金吃緊時縮減
AI.budget = function(g,s,o){
  const rev=Math.max(s.last12rev||0,1), M=W.M(g), enr=Math.max(60,s.students.length);
  const tight=L.cash(s)<rev*.06||s.insW>0, pol=s.cfg.dpolicy||'balanced';
  const f=tight?.5:({growth:1.3,quality:1.15,balanced:1,austerity:.6}[pol]||1);
  s.cfg.mnt=Math.round(Math.max(S.repValue(g,s)*(U.avg(s.bld,b=>b.dur)<55?.018:.012)*(tight?.8:1),0));
  s.cfg.eqp=Math.round((enr+30)*M*250*13*f);
  s.cfg.trn=Math.round(Math.max(3,S.teachers(s).length)*M*28000*f);
  s.cfg.mkt=Math.round(Math.min(rev*.05,enr*M*900)*f*(s.students.length<(s.cap.ideal||1)*.8?1.4:1));
  s.cfg.sch=Math.round(rev*(tight?.01:.03));
};
// 月度代理管理（委任校長或機器人玩家）
// 人事室基本盤：玩家不管時，學校至少會補到最低可營運編制（避免整校無人任教）
AI.baseline = function(g,s){
  const rev=Math.max(s.last12rev||0,1), cash=L.cash(s);
  if(!s.principalId){ const c=s.staff.filter(x=>x.role!=='a').sort((a,b)=>b.mgmt-a.mgmt)[0]; if(c) P.promote(g,s,c.id,'p'); }
  const need=S.need(s), fte=S.fte(s);
  if(s.students.length>10&&fte<need*.55&&s.insW===0&&(cash>rev*.01||L.creditLimit(g,s)>rev*.05)){
    if(s.cands.filter(c=>c.role==='t').length<2) P.postJob(g,s,'t',R.i(g,0,3),4);
    const cs=s.cands.filter(c=>c.role==='t').sort((a,b)=>((b.teach+b.prof)/b.ask)-((a.teach+a.prof)/a.ask)); let hired=0;
    for(const c of cs){ if(hired>=Math.ceil(need*.7-fte)||hired>=3) break; const r=P.offer(g,s,c.id,c.ask*1.0); if(r.res==='counter') P.offer(g,s,c.id,r.counter); if(r.res==='accept'||r.res==='counter') hired++; }
  }
};
AI.manage = function(g,s,o){
  o=o||{}; const T=D.TYPES[s.type], M=W.M(g), pol=s.cfg.dpolicy||'balanced';
  const rev=Math.max(s.last12rev||0,1), reserve=rev*.12, cash=L.cash(s);
  if(!s.principalId){ const c=s.staff.filter(x=>x.role!=='a').sort((a,b)=>b.mgmt-a.mgmt)[0]; if(c) P.promote(g,s,c.id,'p'); }
  // 人力
  const need=S.need(s), fte=S.fte(s);
  if(fte<need*.98&&s.insW===0&&(cash>reserve*.1||L.creditLimit(g,s)>rev*.05)){
    if(s.cands.filter(c=>c.role==='t').length<2) P.postJob(g,s,'t',R.i(g,0,3),4);
    const cs=s.cands.filter(c=>c.role==='t').sort((a,b)=>((b.teach+b.prof)/b.ask)-((a.teach+a.prof)/a.ask));
    let hired=0; for(const c of cs){ if(hired>=Math.ceil(need-fte)||hired>=4) break; const r=P.offer(g,s,c.id,c.ask*1.0); if(r.res==='counter'){ P.offer(g,s,c.id,r.counter); } if(r.res==='accept'||r.res==='counter') hired++; }
  } else if(fte>need*1.3&&s.insW===0&&cash<reserve){ /* 人力過剩但不裁員 */ }
  // 行政
  const nA=s.staff.filter(x=>x.role==='a').length; if(nA<Math.ceil(s.students.length/160)&&cash>reserve*.3){ if(s.cands.filter(c=>c.role==='a').length<1) P.postJob(g,s,'a',0,2); const c=s.cands.filter(c=>c.role==='a')[0]; if(c) P.offer(g,s,c.id,c.ask); }
  // 加薪（對低於市價且績效佳者）
  if(cash>reserve&&pol!=='austerity'){ for(const p of s.staff){ const mk=P.marketSalary(g,s,p); if(p.sal<mk*.94&&p.perf>55&&p.sat<60) P.setSalary(g,s,p.id,Math.min(.08,mk/p.sal-1)); } }
  // 學費：朝市場目標靠近
  const ph=D.PHIL[s.cfg.phil]; const norm=W.tuitionNorm(g,s.type);
  const target=Math.min(W.tuitionCap(g,s.type),norm*(.72+s.rep.ov/115)*ph.tol*(s.students.length>(s.cap.ideal||1)*.98?1.06:.97));
  s.cfg.tuition=Math.round(s.cfg.tuition+(target-s.cfg.tuition)*.1);
  // 招生名額
  const stay=s.students.length*(1-1/T.y); const free=Math.max(0,(s.cap.seats||0)-stay);
  s.cfg.quota=Math.max(8,Math.round(Math.min(free,S.TENT[s.type]*(.7+s.rep.ov/80))));
  s.cfg.std=Math.round(U.clamp(18+(s.rep.ov-40)*.5,10,70)*(ph===D.PHIL.elite?1.3:1));
  // 建設
  if(cash>reserve*1.5 || (pol==='growth'&&cash>reserve)){
    const util=s.students.length/Math.max(1,s.cap.ideal);
    const place=(t)=>{ const d=D.BLD[t]; const pos=S.placeFree(s,d.w,d.h); if(pos) return S.build(g,s,t,pos.x,pos.y); if(s.land.w*s.land.h<400&&L.cash(s)>S.landCost(g,s,s.land.w)*1.5){ if(S.expandLand(g,s,'h').ok){ const p2=S.placeFree(s,d.w,d.h); if(p2) return S.build(g,s,t,p2.x,p2.y); } } return {ok:false}; };
    const pending=s.bld.some(b=>b.prog>0);
    if(!pending){
      if(util>.9&&cash>S.costOf(g,s,'classroom',1)*1.2) place('classroom');
      else { const needs=D.NEEDS[s.type]; let worst=null,wc=.62; for(const k of Object.keys(needs)){ if(!S.avail(g,k)||k==='dorm') continue; const c=s.fac.cov[k]; if(c!==undefined&&c<wc&&cash>S.costOf(g,s,k,1)*1.3){ wc=c; worst=k; } } if(worst) place(worst);
        const nStaff=s.staff.length; if(nStaff>s.cap.staff&&cash>S.costOf(g,s,'office',1)*1.3) place('office'); }
    }
    // 修復最差建築
    const wb=s.bld.filter(b=>b.prog<=0).sort((a,b)=>a.dur-b.dur)[0]; if(wb&&wb.dur<38&&L.cash(s)>S.repairCost(g,s,wb,100-wb.dur)*1.5) S.repair(g,s,wb.id);
  }
  // 借款（短缺時）
  if(cash<reserve*.15&&s.insW===0&&o.mode==='player'){ const cap=L.creditLimit(g,s); if(cap>rev*.05) L.addLoan(g,s,Math.min(cap*.5,rev*.2),60,'bank'); }
};
// 事件：以預設選項處理；機器人可更積極
AI.events = function(g,mode){
  for(const e of g.events.pending.slice()){
    const s=g.schools.find(x=>x.id===e.sid)||g.schools[0]; if(!s) { Ev.resolve(g,e.id,e.def,true); continue; }
    let k=e.def; const rich=L.cash(s)>(s.last12rev||0)*.2;
    if(mode==='smart'){
      if(e.tpl==='bully') k='counsel'; else if(e.tpl==='cheat') k='coun'; else if(e.tpl==='raise') k=rich?'half':'no'; else if(e.tpl==='quit') k=rich?'raise5':'go';
      else if(e.tpl==='bldDamage') k=rich?'fix':'patch'; else if(e.tpl==='flu') k='clean'; else if(e.tpl==='insolvent') k='rest'; else if(e.tpl==='vacancy') k=e.opts[0].k;
      else if(e.tpl==='loanOffer') k=rich?'no':'yes'; else if(e.tpl==='alumAssoc'||e.tpl==='industry'||e.tpl==='fundDrive') k='yes'; else if(e.tpl==='disaster') k=rich?'em':'min';
      else if(e.tpl==='pandemic') k=s.equip>50?'remote':'rot'; else if(e.tpl==='anniv') k=rich?'mid':'low'; else if(e.tpl==='policyNote') k='ack';
    }
    const cost=e.ctx.c[k]||0; if(cost>0&&!Ev.canPay(g,s,cost)) k=e.def;
    if((e.ctx.c[k]||0)>0&&!Ev.canPay(g,s,e.ctx.c[k])) k=e.opts.find(o=>!o.cost)?.k||e.def;
    Ev.resolve(g,e.id,k,true);
  }
};
// 集團層級（機器人玩家）
AI.group = function(g,o){
  o=o||{}; const ss=g.schools.filter(s=>!s.closed); if(!ss.length) return;
  const rich=ss.filter(s=>L.cash(s)>(s.last12rev||0)*.45&&s.insW===0);
  if(!g.group.founded&&ss[0].rep.ov>45&&g.y-g.opts.year>=4&&g.player.personal>W.M(g)*1.5e6&&L.cash(ss[0])>(ss[0].last12rev||0)*.3) G.foundGroup(g);
  if(!g.group.founded) return;
  for(const s of rich){ const amt=Math.round(L.cash(s)-(s.last12rev||0)*.3); if(amt>0) G.upstream(g,s.id,amt); }
  if(g.player.personal>W.M(g)*3e6) G.inject(g,g.player.personal*.8);
  if(o.expand){
    const has=new Set(ss.map(s=>s.type));
    for(const s of ss){ for(const nt of D.TYPES[s.type].next){ if(!has.has(nt)&&ss.length<(o.maxSchools||6)&&s.rep.ov>48&&s.led.years.length>=3&&(s.led.years.slice(-1)[0].ni>0)){
        const c=G.foundCost(g,nt,'div'); if(L.cash(g.hq)>c.total*1.15){ const r=G.found(g,{type:nt,kind:'div',parentId:s.id}); if(r.ok){ has.add(nt); AI.manage(g,r.s,{mode:'player'}); } } } } }
  }
  // 新校需要招生
  for(const s of ss){ if(s.students.length===0&&s.founded===g.y){ s.cfg.delegate=true; } }
};
})(typeof window!=='undefined'?window:globalThis);
