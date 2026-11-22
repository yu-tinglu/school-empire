(function(root){
'use strict';
const SE = root.SE, R=SE.R, U=SE.U, D=SE.D, W=SE.W, L=SE.L, P=SE.P, S=SE.S;
const Rv = SE.Rv = {};

Rv.name = function(g,typeId){
  const used=new Set([...g.rivals.map(r=>r.name),...g.schools.map(s=>s.name)]);
  for(let i=0;i<40;i++){ const n=R.pick(g,D.SCH_PRE)+D.TYPES[typeId].sf; if(!used.has(n)) return n; }
  return R.pick(g,D.SCH_PRE)+R.pick(g,D.SCH_PRE)+D.TYPES[typeId].sf;
};
Rv.dims = function(g,r){
  const rp={}; D.DIMS.forEach(d=>{ rp[d]=U.clamp(r.quality+(r.bias[d]||0),3,99); });
  if(r.type==='un'||r.type==='gs') rp.research=U.clamp(r.quality+(r.bias.research||0)+5,3,99); else rp.research=U.clamp(rp.research*.4,3,60);
  rp.fin=U.clamp(55+Math.min(40,r.cash/Math.max(1,r.enr*W.M(g)*8e4)*20),5,95);
  rp.social=r.rep&&r.rep.social!==undefined? r.rep.social+(rp.social-r.rep.social)*.03 : rp.social;
  rp.aw=r.rep&&r.rep.aw!==undefined? r.rep.aw:25+.4*r.quality;
  r.rep=rp; rp.ov=S.overall(g,{type:r.type},rp);
  return rp;
};
Rv.make = function(g,typeId,o){
  o=o||{}; const T=D.TYPES[typeId];
  const q=o.q!==undefined?o.q:U.clamp(R.n(g,50,12),20,85);
  const cap=Math.round(S.TENT[typeId]*T.y*(o.capMult||(.7+R.f(g)*.9)));
  const r={id:g.nextId++,name:o.name||Rv.name(g,typeId),type:typeId,status:'active',quality:q,bias:{},cap,enr:0,tr:o.tr||(.85+R.f(g)*.35),tuition:0,
    cash:0,debt:0,fac:U.clamp(R.n(g,50,15),15,90),spec:R.chance(g,.2)?R.i(g,0,D.SPECS.length-1):-1,age:g.y-(o.age!==undefined?o.age:R.i(g,3,60)),zone:R.chance(g,.3)?1:0,
    phil:R.pick(g,['exam','exam','free','elite','tech','art','intl']),coop:35,agree:[],poor:0,hist:[],pr:R.pick(g,D.SUR)+'校長',sty:R.i(g,0,4),rep:null,flag:{}};
  for(const d of D.DIMS) r.bias[d]=R.n(g,0,8);
  r.enr=Math.round(cap*(o.fill||(.7+R.f(g)*.25)));
  r.tuition=Math.round(W.tuitionNorm(g,typeId)*r.tr);
  r.cash=Math.round(r.enr*(T.tu*2+T.sub)*W.M(g)*(R.f(g)*.25));
  r.debt=Math.round(r.enr*(T.tu*2)*W.M(g)*R.f(g)*.5);
  Rv.dims(g,r); r.rep.aw=U.clamp(22+.4*q+R.n(g,0,8),5,95); r.rep.ov=S.overall(g,{type:typeId},r.rep);
  return r;
};
Rv.init = function(g){
  g.rivals=[];
  for(const t of D.TYPE_ORDER){
    const n=Math.max(2,Math.round(R.i(g,3,4)*g.regionRule.comp*g.diff.comp));
    for(let i=0;i<n;i++) g.rivals.push(Rv.make(g,t));
  }
};
Rv.cost = function(g,r){
  const T=D.TYPES[r.type], M=W.M(g);
  return r.enr*(700000*T.sal*g.regionRule.wage*M/T.spt*1.5+T.supply*M*1.2)*(0.85+0.3*r.quality/100)*(0.9+0.3*r.fac/100)+ r.cap*M*9000;
};
Rv.revenue = function(g,r){
  const T=D.TYPES[r.type]; return r.enr*(r.tuition*2+W.subsidy(g,r.type)*(g.regionRule.subM==='perf'?(.4+r.rep.ov/100*1.2):1));
};
Rv.month = function(g){
  const M=W.M(g);
  for(const r of g.rivals){
    if(r.status!=='active') continue;
    const T=D.TYPES[r.type];
    r.tuition=Math.round(Math.min(W.tuitionCap(g,r.type),W.tuitionNorm(g,r.type)*r.tr));
    const rev=Rv.revenue(g,r), cost=Rv.cost(g,r), profit=(rev-cost)/12;
    r.cash+=profit; r.cash-=r.debt*0.04/12;
    const margin=U.clamp((rev-cost)/Math.max(1,rev),-.5,.4);
    // 品質：投入帶動、漸進衰減與隨機
    r.quality=U.clamp(r.quality+(margin*3-0.3*(r.quality-50)/50)/12+R.n(g,0,.35)-(r.poor>0?.15:0),12,95);
    r.fac=U.clamp(r.fac+(margin>0?.12:-.08)+R.n(g,0,.2)-.05,10,98);
    // 學費調整
    const fill=r.enr/Math.max(1,r.cap);
    if(fill<.85) r.tr=Math.max(.6,r.tr*.996); else if(fill>.98) r.tr=Math.min(2.2,r.tr*1.004);
    if(margin<-.05) r.tr=Math.min(2.2,r.tr*1.004);
    if(r.spec<0&&margin>.05&&R.chance(g,.03)){ r.spec=R.i(g,0,D.SPECS.length-1); r.quality=Math.min(95,r.quality+1.5); }
    if(fill>.95&&r.cash>rev*.4&&R.chance(g,.12)){ r.cap=Math.round(r.cap*1.1); r.cash-=rev*.25; r.fac=Math.min(98,r.fac+2); }
    r.coop+= (40-r.coop)*.02;
    // 帳務困難
    if(r.cash<0){ r.poor++; if(r.poor>14) r.cash+=Math.abs(r.cash)*.1; } else r.poor=Math.max(0,r.poor-1);
    Rv.dims(g,r);
    if(g.world.pol&&r.rep.aw!==undefined){ const mk=r.margin; r.rep.aw=U.clamp(r.rep.aw+(25+.45*r.quality+ (margin>0?6:0)-r.rep.aw)*.05,5,98); r.rep.ov=S.overall(g,{type:r.type},r.rep); }
  }
  // 平均品質（影響教師跳槽壓力）
  for(const s of g.schools){ const rs=g.rivals.filter(x=>x.status==='active'&&x.type===s.type); s.rivalAvgQ=rs.length?U.avg(rs,x=>x.quality):50; }
  // 結構變動
  for(const r of g.rivals.slice()){
    if(r.status!=='active') continue;
    if(r.poor>18){
      const same=g.rivals.filter(x=>x!==r&&x.status==='active'&&x.type===r.type&&x.cash>0).sort((a,b)=>b.cash-a.cash)[0];
      if(same&&R.chance(g,.55)){ Rv.merge(g,same,r); }
      else { r.status='closed'; r.endY=g.y; Rv.news(g,`${r.name}（${D.TYPES[r.type].n}）因財務惡化停辦`,true); S.dispersed(g,r); }
    }
  }
};
Rv.news = function(g,txt,major){ g.news.unshift({y:g.y,w:g.w,t:txt}); if(g.news.length>60) g.news.length=60; S.log(g,null,txt,major); };
S.dispersed = function(g,r){ // 倒閉對手的學生流入玩家學校的轉學效果
  for(const s of g.schools){ if(s.closed||s.type!==r.type) continue; s.flags.transferBoost=(s.flags.transferBoost||0)+Math.round(r.enr*.08); }
};
Rv.merge = function(g,a,b){
  a.enr+=Math.round(b.enr*.8); a.cap+=Math.round(b.cap*.9); a.quality=Math.max(a.quality,(a.quality*.65+b.quality*.35)); a.debt+=b.debt; a.cash+=b.cash*.5;
  b.status='merged'; b.mergedInto=a.id; b.endY=g.y; Rv.news(g,`${a.name}與${b.name}合併`,true);
};
Rv.year = function(g){
  // 招生：各學制市場分配
  const mk={};
  for(const t of D.TYPE_ORDER) mk[t]=S.market(g,t);
  g.market=mk;
  for(const r of g.rivals){
    if(r.status!=='active') continue; const T=D.TYPES[r.type];
    const dem=mk[r.type].dem[r.id]||0;
    const stay=r.enr*(1-1/T.y)*(1-.01);
    const room=Math.max(0,r.cap-stay);
    const incoming=Math.min(room,dem*.62*(1+.1*(g.diff.comp-1)));
    r.enr=Math.max(5,Math.round(stay+incoming));
    r.hist.push([g.y,r.enr,Math.round(r.rep.ov)]); if(r.hist.length>60) r.hist.shift();
    r.age=r.age;
  }
  // 新創對手
  for(const t of D.TYPE_ORDER){
    const rs=g.rivals.filter(x=>x.status==='active'&&x.type===t);
    const supply=U.sum(rs,x=>x.cap)/D.TYPES[t].y+U.sum(g.schools.filter(s=>!s.closed&&s.type===t),s=>s.cfg.quota);
    const demand=mk[t].pool*1.0;
    if(demand>supply*1.2&&R.chance(g,.22*g.regionRule.comp)){ const r=Rv.make(g,t,{age:0,fill:.3,q:R.n(g,46,8),capMult:.55}); g.rivals.push(r); Rv.news(g,`新學校「${r.name}」（${D.TYPES[t].n}）創立`,false); }
    else if(rs.length<2&&R.chance(g,.3)){ const r=Rv.make(g,t,{age:0,fill:.35,capMult:.6}); g.rivals.push(r); Rv.news(g,`新學校「${r.name}」創立`,false); }
  }
  // 清理歷史與已結束對手（保留最近）
  const closed=g.rivals.filter(r=>r.status!=='active');
  if(closed.length>25){ g.rivals=g.rivals.filter(r=>r.status==='active'||closed.slice(-12).includes(r)); }
};
Rv.coopAct = function(g,s,rid,kind){
  const r=g.rivals.find(x=>x.id===rid&&x.status==='active'); if(!r) return {ok:false,msg:'對象不存在'};
  const M=W.M(g), cost={exchange:150000,contest:250000,feeder:300000}[kind]*M;
  if(L.cash(s)<cost) return {ok:false,msg:`需要 ${U.money(cost)}`};
  if(r.coop<20&&kind!=='exchange') return {ok:false,msg:'對方態度冷淡，先從教學交流開始'};
  if(kind==='exchange'){ L.exp(s,'eOther',cost); r.coop=Math.min(100,r.coop+8); s.flags.exchange=(s.flags.exchange||0)+3; r.quality=Math.min(95,r.quality+.2); s.rep.social=Math.min(100,s.rep.social+.15); return {ok:true,msg:`與${r.name}教學交流：雙方關係提升，國際化與社會聲望小幅上升。`}; }
  if(kind==='contest'){ L.exp(s,'eOther',cost); r.coop=Math.min(100,r.coop+10); s.rep.social=Math.min(100,s.rep.social+.5); s.trustAdj+=1.5; for(const x of s.students) x.mood=Math.min(100,x.mood+1); return {ok:true,msg:`聯合競賽辦得很成功，兩校聲望提升。`}; }
  if(kind==='feeder'){
    const T=D.TYPES[s.type]; const ok=T.next.includes(r.type)||D.TYPES[r.type].next.includes(s.type);
    if(!ok) return {ok:false,msg:'升學合作需為上下銜接的學制'}; if(r.coop<45) return {ok:false,msg:'關係需達 45 以上才能簽署升學合作'};
    if(s.coop[rid]) return {ok:false,msg:'已有升學合作'};
    L.exp(s,'eOther',cost); s.coop[rid]=1; r.agree.push(s.id);
    if(T.next.includes(r.type)){ s.m.tier=Math.min(100,s.m.tier+5); } return {ok:true,msg:`與${r.name}簽署升學合作：${T.next.includes(r.type)?'畢業生升學管道擴大':'將為本校帶來穩定生源'}。`};
  }
  return {ok:false};
};
Rv.ranking = function(g,typeId){
  const L2=[];
  for(const s of g.schools) if(!s.closed&&s.type===typeId) L2.push({n:s.name,ov:s.rep.ov,enr:s.students.length,own:1,id:s.id,q:s.quality});
  for(const r of g.rivals) if(r.status==='active'&&r.type===typeId) L2.push({n:r.name,ov:r.rep.ov,enr:r.enr,own:0,id:r.id,q:r.quality,spec:r.spec,tuition:r.tuition,coop:r.coop});
  L2.sort((a,b)=>b.ov-a.ov); return L2;
};
})(typeof window!=='undefined'?window:globalThis);
