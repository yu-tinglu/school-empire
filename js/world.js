(function(root){
'use strict';
const SE = root.SE, R=SE.R, U=SE.U, D=SE.D;
const W = SE.W = {};

W.era = function(y){
  const E=D.ERA, K=D.ERA_KEYS, o={};
  const last=E[E.length-1];
  const yy=Math.min(y,last[0]);
  for(let k=0;k<K.length;k++){
    const pts=E.map(r=>[r[0],r[k+1]]);
    o[K[k]]=U.interp(pts,yy,K[k]==='M');
  }
  if(y>last[0]){ const d=y-last[0]; o.M*=Math.pow(1.02,d); o.tech=Math.min(160,o.tech+0.8*d); o.income*=Math.pow(1.005,d); }
  if(y<D.ERA[0][0]){ o.M=D.ERA[0][1]; }
  return o;
};
W.part = function(type,y){ return U.interp(D.PART[type], Math.min(Math.max(y,1900),2040)); };

W.init = function(g){
  const reg=g.regionRule;
  g.world={year:g.y,cyc:0,act:[],fut:[],birthHist:{},news:[],polLog:[],
    pol:{sub:1,capMult:reg.cap,classMax:reg.classMax,strict:reg.strict,free:reg.free.slice(),exam:reg.exam}};
  for(let y=g.y-32;y<g.y;y++){ g.world.birthHist[y]=W.era(y).birth*(1+R.n(g,0,.03))*W.histBirthMult(y); }
  return W.yearly(g,true);
};
W.histBirthMult = function(y){ let m=1; for(const h of D.HIST) if(y>=h.a&&y<=h.b) m*=h.birth; return m; };

W.yearly = function(g,first){
  const w=g.world, y=g.y, e=W.era(y), reg=g.regionRule, news=[];
  // 活動事件
  const prev=new Set(w.act.map(a=>a.id));
  w.act = D.HIST.filter(h=>y>=h.a&&y<=h.b).map(h=>({id:h.id,name:h.name,until:h.b,txt:h.txt,birth:h.birth,econ:h.econ,demand:h.demand,safety:h.safety,cost:h.cost,intl:h.intl}));
  if(y>2030){
    w.fut=w.fut.filter(f=>f.until>=y);
    if(!first && R.chance(g,.03*g.diff.evt)){ const f=R.pick(g,D.FUT); w.fut.push(Object.assign({until:y+f.dur},f)); }
    for(const f of w.fut) w.act.push(f);
  }
  for(const a of w.act) if(!prev.has(a.id) && !first) news.push(a);
  const ef=W.eff(g);
  w.cyc = 0.6*w.cyc + R.n(g,0,.32) + ef.econ*0.35;
  w.cyc = U.clamp(w.cyc,-2.5,2.5);
  w.year=y; w.M=e.M; w.tech=e.tech; w.popIdx=e.pop; w.income=e.income*(1+0.07*w.cyc);
  w.unemp=U.clamp(e.unemp-2.2*w.cyc,.5,28); w.trad=e.trad; w.intl=U.clamp(e.intl+ef.intl*.2,0,1);
  w.welfare=e.welfare; w.life=e.life; w.retire=e.retire;
  w.birth=e.birth*(1+R.n(g,0,.04))*ef.birth; w.birthHist[y]=w.birth;
  for(const k of Object.keys(w.birthHist)) if(+k<y-60) delete w.birthHist[k];
  w.infl = (y>1900? (W.era(y).M/W.era(y-1).M-1):0.02);
  w.voc=reg.voc; w.demandMult=ef.demand;
  // 政策改革
  let reform=null;
  if(!first && R.chance(g,.07)){
    const k=R.i(g,0,5), p=w.pol;
    if(k===0){ const d=R.pick(g,[-.15,.2]); p.sub=U.clamp(p.sub*(1+d),.5,2); reform={t:'補助政策調整',x:`政府${d>0?'提高':'削減'}教育補助 ${Math.round(Math.abs(d)*100)}%。`}; }
    else if(k===1&&p.capMult){ const d=R.pick(g,[-.1,.12]); p.capMult=U.clamp(p.capMult*(1+d),.7,1.6); reform={t:'學費政策調整',x:`學費上限${d>0?'放寬':'收緊'}為基準的 ${p.capMult.toFixed(2)} 倍。`}; }
    else if(k===2){ const d=R.pick(g,[-.05,.05]); p.classMax=U.clamp(p.classMax+d,1.05,1.5); reform={t:'班級人數規範',x:`班級人數上限調整為理想人數的 ${p.classMax.toFixed(2)} 倍。`}; }
    else if(k===3){ const nx=['ps','jh','hs'].find(t=>!p.free.includes(t)); if(nx){ p.free.push(nx); reform={t:'延長免學費教育',x:`${D.TYPES[nx].n}納入免學費範圍，私校學費上限下降、補助提高。`}; } }
    else if(k===4){ const d=R.pick(g,[-.1,.1]); p.exam=U.clamp(p.exam+d,.2,1); reform={t:'教育改革',x:`升學制度${d>0?'強化考試':'走向多元入學'}。`}; }
    else { const d=R.pick(g,[-.1,.1]); p.strict=U.clamp(p.strict+d,.2,1); reform={t:'督導強度調整',x:`教育部督導${d>0?'加強':'放鬆'}。`}; }
    if(reform){ w.polLog.push({y,t:reform.t,x:reform.x}); if(w.polLog.length>60) w.polLog.shift(); }
  }
  return {news,reform};
};
W.eff = function(g){
  const e={birth:1,econ:0,demand:1,safety:0,cost:1,intl:0};
  for(const a of (g.world.act||[])){ e.birth*=a.birth; e.econ+=a.econ; e.demand*=a.demand; e.safety+=a.safety; e.cost*=a.cost; e.intl+=a.intl; }
  e.econ=U.clamp(e.econ,-1.5,1.5);
  return e;
};
// 年齡層人口（本地招生區）
W.cohort = function(g,typeId,y){
  y=y||g.y; const T=D.TYPES[typeId], reg=g.regionRule, w=g.world;
  const by=y-T.e, bi=w.birthHist[by]!==undefined? w.birthHist[by] : W.era(by).birth*W.histBirthMult(by);
  const popScale=reg.pop*W.era(y).pop/1.0;
  return popScale*bi/1000;
};
W.participation = function(g,typeId,y){ return W.part(typeId,y||g.y); };
W.M = g=> g.world.M*g.regionRule.cost;
W.tuitionNorm = (g,t)=> D.TYPES[t].tu*g.world.M*(0.55+0.45*g.world.income)*g.regionRule.wage;
W.tuitionCap = function(g,t){
  const reg=g.regionRule, p=g.world.pol; if(!p.capMult) return Infinity;
  return W.tuitionNorm(g,t)*p.capMult*(p.free.includes(t)?0.35:1);
};
W.subsidy = function(g,t){ const p=g.world.pol; return D.TYPES[t].sub*g.world.M*g.regionRule.subX*p.sub*(p.free.includes(t)?1.8:1)*(0.8+0.2*g.world.income); };
W.salary = function(g,t,role){ // 月薪
  const rm={t:1,a:.7,d:1.0,p:1.4}[role]||1;
  return 700000*D.TYPES[t].sal*rm*g.world.M*g.regionRule.wage/12*(0.85+0.15*g.world.income);
};
W.baseRate = function(g){ const w=g.world; return U.clamp(0.025+Math.max(0,w.infl)*0.7+0.01*Math.max(0,w.cyc)-0.006*Math.min(0,w.cyc),0.015,0.14); };
W.landCell = g=> 1.1e6*g.world.M*g.regionRule.land;
})(typeof window!=='undefined'?window:globalThis);
