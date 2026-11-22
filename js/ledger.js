(function(root){
'use strict';
const SE = root.SE, U=SE.U, W=SE.W, R=SE.R;
const L = SE.L = {};

/* ---------- 科目 ---------- */
L.TYPE = {cash:'A',ar:'A',icAr:'A',fa:'A',accDep:'A',endow:'A',invSub:'A',gw:'A',
  loans:'L',defRev:'L',icAp:'L',ap:'L',paid:'E',ret:'E',dist:'E',
  rTuition:'R',rSubsidy:'R',rDonation:'R',rResearch:'R',rIndustry:'R',rAux:'R',rInvest:'R',rOther:'R',rGain:'R',rMgmt:'R',rDiv:'R',rIcInt:'R',
  eSalary:'X',eWelfare:'X',eSupply:'X',eMaint:'X',eAdmin:'X',eScholar:'X',eInterest:'X',eMkt:'X',eTrain:'X',eDep:'X',eBad:'X',eOther:'X',eLoss:'X',eMgmt:'X',eIcInt:'X',eTax:'X'};
L.NAME = {cash:'現金',ar:'應收學費',icAr:'集團內應收款',fa:'固定資產原值',accDep:'累計折舊',endow:'校友基金/投資',invSub:'對子公司投資',gw:'商譽',
  loans:'銀行借款',defRev:'預收學費(合約負債)',icAp:'集團內應付款',ap:'積欠款項',paid:'實收資本',ret:'保留盈餘',dist:'分配股利',
  rTuition:'學費收入',rSubsidy:'政府補助',rDonation:'捐款收入',rResearch:'研究經費',rIndustry:'產學合作收入',rAux:'附屬事業收入',rInvest:'投資收益',rOther:'其他收入',rGain:'資產處分及債務重整利益',rMgmt:'集團管理費收入',rDiv:'股利收入',rIcInt:'集團內利息收入',
  eSalary:'薪資',eWelfare:'福利與退休金',eSupply:'教學耗材',eMaint:'建築維護',eAdmin:'行政營運',eScholar:'獎學金',eInterest:'利息費用',eMkt:'招生宣傳',eTrain:'教師培訓',eDep:'折舊',eBad:'呆帳',eOther:'其他費用',eLoss:'資產處分損失',eMgmt:'集團管理費',eIcInt:'集團內利息費用',eTax:'營利事業稅'};
L.IC = new Set(['icAr','icAp','invSub','rMgmt','eMgmt','rDiv','dist','rIcInt','eIcInt']);
L.REVS = Object.keys(L.TYPE).filter(k=>L.TYPE[k]==='R');
L.EXPS = Object.keys(L.TYPE).filter(k=>L.TYPE[k]==='X');
L.isPL = a=> L.TYPE[a]==='R'||L.TYPE[a]==='X';

L.initEnt = function(ent){
  ent.led={bal:{},per:{},pcf:{op:0,inv:0,fin:0},cfd:{op:{},inv:{},fin:{}},months:[],years:[]};
  ent.loans=[]; ent.assets=[]; ent.insW=0; ent.emg=0; ent.budget=ent.budget||{};
  return ent;
};

/* ---------- 過帳 ---------- */
L.post = function(led, lines, cf, label){
  let s=0, cash=0;
  for(const l of lines){ if(!(l[0] in L.TYPE)) throw new Error('bad acct '+l[0]); if(!isFinite(l[1])) throw new Error('NaN amount '+l[0]); s+=l[1]; if(l[0]==='cash') cash+=l[1]; }
  if(Math.abs(s)>0.05) throw new Error('unbalanced '+JSON.stringify(lines));
  for(const [a,x] of lines){
    led.bal[a]=(led.bal[a]||0)+x;
    if(L.isPL(a)) led.per[a]=(led.per[a]||0)+x;
  }
  if(Math.abs(cash)>1e-9){
    if(!cf) throw new Error('cash post needs cf '+JSON.stringify(lines));
    led.pcf[cf]+=cash; const d=led.cfd[cf]; d[label||'其他']=(d[label||'其他']||0)+cash;
  }
};
L.rev = function(ent, acct, amt, cf){ amt=Math.round(amt); if(!amt) return; L.post(ent.led,[['cash',amt],[acct,-amt]],cf||'op',L.NAME[acct]); };
L.exp = function(ent, acct, amt, cf){ amt=Math.round(amt); if(!amt) return; L.post(ent.led,[[acct,amt],['cash',-amt]],cf||'op',L.NAME[acct]); };
L.cash = ent=> ent.led.bal.cash||0;
L.bal = (ent,a)=> ent.led.bal[a]||0;

/* ---------- 固定資產 ---------- */
L.buyAsset = function(g, ent, kind, label, cost, lifeYears, res, startNow, bid){
  cost=Math.round(cost);
  L.post(ent.led,[['fa',cost],['cash',-cost]],'inv',kind==='land'?'購置土地':(kind==='bld'?'興建/購置建築':'購置設備'));
  const a={id:g.nextId++,k:kind,n:label,c:cost,ad:0,life:lifeYears,res:res||0,start:startNow===false?null:g.abs,bid:bid||0};
  ent.assets.push(a); return a;
};
L.depreciate = function(g, ent){
  let tot=0, gone=[];
  for(const a of ent.assets){
    if(a.k==='land'||a.start==null) continue;
    const maxd=a.c*(1-a.res); if(a.ad>=maxd-0.005){ if(a.k==='eqp') gone.push(a); continue; }
    const d=Math.min(maxd-a.ad, maxd/(a.life*52)); a.ad+=d; tot+=d;
    if(a.k==='eqp'&&a.ad>=maxd-0.005) gone.push(a);
  }
  if(tot>0) L.post(ent.led,[['eDep',tot],['accDep',-tot]]);
  for(const a of gone){
    const loss=a.c-a.ad;
    const lines=[['accDep',a.ad],['fa',-a.c]];
    if(Math.abs(loss)>0.005) lines.push([loss>0?'eLoss':'rGain',loss]);
    L.post(ent.led,lines);
    ent.assets.splice(ent.assets.indexOf(a),1);
  }
};
L.bookValue = a=> a.c-a.ad;
L.disposeAsset = function(ent, a, proceeds){
  proceeds=Math.round(proceeds);
  const loss=a.c-a.ad-proceeds;
  const lines=[['cash',proceeds],['accDep',a.ad],['fa',-a.c]];
  if(Math.abs(loss)>0.005) lines.push([loss>0?'eLoss':'rGain',loss]);
  L.post(ent.led,lines,'inv','處分資產');
  const i=ent.assets.indexOf(a); if(i>=0) ent.assets.splice(i,1);
};
L.writeOff = function(ent, a){ // 無價款報廢
  const lines=[['accDep',a.ad],['fa',-a.c]]; const loss=a.c-a.ad;
  if(Math.abs(loss)>0.005) lines.push([loss>0?'eLoss':'rGain',loss]);
  L.post(ent.led,lines); const i=ent.assets.indexOf(a); if(i>=0) ent.assets.splice(i,1);
};
L.netFixed = ent=> U.sum(ent.assets,a=>a.c-a.ad);

/* ---------- 貸款 ---------- */
L.creditLimit = function(g, ent){
  const b=ent.led.bal, assets=(L.netFixed(ent))+Math.max(0,b.cash||0)+(b.endow||0);
  const rev=ent.isHQ? 0 : Math.max(0,(ent.last12rev||0));
  const rep=ent.isHQ? (g.group.brand||30) : (ent.rep? ent.rep.ov:30);
  const cyc=U.clamp(1+0.1*g.world.cyc,.6,1.25);
  let cap=(0.45*assets+0.35*rev)*(0.55+rep/180)*cyc;
  const debt=L.debt(ent,true);
  return Math.max(0,cap-debt);
};
L.debt = (ent,bankOnly)=> U.sum(ent.loans.filter(l=>!bankOnly||!l.ic),l=>l.bal);
L.rate = function(g, ent, kind){
  const b=ent.led.bal; const assets=L.netFixed(ent)+Math.max(0,b.cash||0)+1;
  const lev=U.clamp(L.debt(ent,true)/assets,0,2);
  return U.clamp(W.baseRate(g)+0.01+0.03*lev+(kind==='emg'?0.04:0)+(ent.insW>0?0.03:0),0.02,0.3);
};
L.addLoan = function(g, ent, amt, months, kind, hq){ // hq: 內部放款方(HQ ent)；否則為銀行
  amt=Math.round(amt); if(amt<=0) return null;
  const rate = hq? Math.max(0.01,W.baseRate(g)*0.8) : L.rate(g,ent,kind);
  const ln={id:g.nextId++,p0:amt,bal:amt,r:rate,term:months,left:months,kind:kind||'bank',ic:!!hq,y:g.y};
  ent.loans.push(ln);
  if(hq){
    L.post(ent.led,[['cash',amt],['icAp',-amt]],'fin','集團內借款');
    L.post(hq.led,[['icAr',amt],['cash',-amt]],'inv','集團內放款');
    ln.lender=hq.id;
  } else L.post(ent.led,[['cash',amt],['loans',-amt]],'fin','銀行借款');
  return ln;
};
L.repay = function(g, ent, ln, princ, interest, byId){
  princ=Math.round(Math.min(princ,ln.bal)); interest=Math.round(interest);
  const hq = ln.ic? byId(ln.lender):null;
  if(interest>0){ L.post(ent.led,[[ln.ic?'eIcInt':'eInterest',interest],['cash',-interest]],'op',ln.ic?'集團內利息':'利息費用');
    if(hq) L.post(hq.led,[['cash',interest],['rIcInt',-interest]],'op','集團內利息收入'); }
  if(princ>0){ L.post(ent.led,[[ln.ic?'icAp':'loans',princ],['cash',-princ]],'fin','償還借款');
    if(hq) L.post(hq.led,[['cash',princ],['icAr',-princ]],'inv','收回集團內放款'); }
  ln.bal-=princ;
};
L.serviceLoans = function(g, ent, byId){
  for(const ln of ent.loans.slice()){
    const interest=ln.bal*ln.r/12;
    const princ = ln.left<=1? ln.bal : Math.min(ln.bal, ln.p0/ln.term);
    L.repay(g,ent,ln,princ,interest,byId); ln.left--;
    if(ln.bal<=0.5||ln.left<=0){ if(ln.bal>0.5) L.repay(g,ent,ln,ln.bal,0,byId); ent.loans.splice(ent.loans.indexOf(ln),1); }
  }
};
// 週末結算：透支→緊急借款→積欠款；有餘裕先清積欠
L.settle = function(g, ent){
  const b=ent.led.bal;
  if((b.cash||0)<0){
    const need=-(b.cash);
    const cap=L.creditLimit(g,ent);
    if(cap>=need){ const chunk=Math.min(cap,Math.max(Math.ceil(need*1.3),ent.isHQ?0:(ent.last12rev||0)/26)); const ex=ent.loans.find(l=>l.kind==='emg'&&!l.ic);
      if(ex){ L.post(ent.led,[['cash',chunk],['loans',-chunk]],'fin','銀行借款(緊急週轉)'); ex.p0+=chunk; ex.bal+=chunk; ex.term=12; ex.left=12; ex.r=Math.max(ex.r,L.rate(g,ent,'emg')); }
      else L.addLoan(g,ent,chunk,12,'emg'); ent.emg++; }
    else { const x=need; L.post(ent.led,[['cash',x],['ap',-x]],'op','應付款項增加(未付)'); }
  } else if((b.ap||0)<-0.5 && (b.cash||0)>0){
    const pay=Math.min(b.cash,-b.ap); L.post(ent.led,[['ap',pay],['cash',-pay]],'op','清償積欠款');
  }
  ent.insW = ((b.ap||0)<-0.5)? ent.insW+1 : 0;
};

/* ---------- 期間結算 ---------- */
L.closeMonth = function(ent, y, m){
  const led=ent.led;
  led.months.push({y,m,pl:Object.assign({},led.per),cf:Object.assign({},led.pcf),cash:led.bal.cash||0});
  if(led.months.length>60) led.months.shift();
  led.per={}; led.pcf={op:0,inv:0,fin:0};
};
L.ni = bal=>{ let s=0; for(const a of Object.keys(bal)) if(L.isPL(a)) s-=bal[a]; return s; };
L.summary = function(bal, assetsNet){
  let A=0,Lb=0,E=0;
  for(const a of Object.keys(bal)){ const t=L.TYPE[a]; if(t==='A') A+=bal[a]; else if(t==='L') Lb-=bal[a]; else if(t==='E') E-=bal[a]; }
  const ni=L.ni(bal);
  return {assets:A,liab:Lb,equity:E+ni,ni,cash:bal.cash||0};
};
L.closeYear = function(ent, y){
  const led=ent.led, ni=L.ni(led.bal), s=L.summary(led.bal);
  const pl={}; for(const a of Object.keys(led.bal)) if(L.isPL(a)) pl[a]=led.bal[a];
  const cfT={op:0,inv:0,fin:0}; for(const k of ['op','inv','fin']) for(const l of Object.keys(led.cfd[k])) cfT[k]+=led.cfd[k][l];
  led.years.push({y,pl,ni,cf:cfT,cfd:U.clone(led.cfd),assets:s.assets,liab:s.liab,equity:s.equity,cash:s.cash,debt:L.debt(ent)});
  for(const a of Object.keys(pl)){ led.bal[a]=0; }
  led.bal.ret=(led.bal.ret||0)-ni;
  if(led.bal.dist){ led.bal.ret+=led.bal.dist; led.bal.dist=0; }
  led.cfd={op:{},inv:{},fin:{}};
  return ni;
};

/* ---------- 報表 ---------- */
L.incomeStmt = function(bal, consol){
  const rev=[],exp=[]; let rt=0,et=0;
  for(const a of L.REVS){ if(consol&&L.IC.has(a)) continue; const v=-(bal[a]||0); if(Math.abs(v)>0.5){ rev.push([L.NAME[a],v,a]); rt+=v; } }
  for(const a of L.EXPS){ if(consol&&L.IC.has(a)) continue; const v=(bal[a]||0); if(Math.abs(v)>0.5){ exp.push([L.NAME[a],v,a]); et+=v; } }
  return {rev,exp,revT:rt,expT:et,ni:rt-et};
};
L.balanceSheet = function(bal, consol, icAdj){
  const g=a=>(bal[a]||0);
  const as=[['現金',g('cash')],['應收學費',g('ar')],['校友基金/投資',g('endow')],['固定資產原值',g('fa')],['減：累計折舊',g('accDep')],['商譽',g('gw')]];
  if(!consol){ as.splice(2,0,['集團內應收款',g('icAr')]); as.push(['對子公司投資',g('invSub')]); }
  const lb=[['銀行借款',-g('loans')],['預收學費(合約負債)',-g('defRev')],['積欠款項',-g('ap')]];
  if(!consol) lb.splice(2,0,['集團內應付款',-g('icAp')]);
  let paid=-g('paid'); if(consol&&icAdj) paid-=icAdj.subPaid;
  const ni=L.ni(bal);
  const eq=[['實收資本',paid],['保留盈餘（以前年度）',-g('ret')+(-g('dist'))],['本期損益',ni]];
  const aT=U.sum(as,x=>x[1]), lT=U.sum(lb,x=>x[1]), eT=U.sum(eq,x=>x[1]);
  return {as,lb,eq,aT,lT,eT};
};
L.cashFlowStmt = function(ent){
  const led=ent.led, out={};
  for(const k of ['op','inv','fin']){ out[k]={lines:Object.entries(led.cfd[k]).filter(e=>Math.abs(e[1])>0.5), total:U.sum(Object.values(led.cfd[k]))}; }
  out.net=out.op.total+out.inv.total+out.fin.total;
  return out;
};
L.mergeLeds = function(ents){
  const m={bal:{},per:{},pcf:{op:0,inv:0,fin:0},cfd:{op:{},inv:{},fin:{}},months:[],years:[]};
  const mm={};
  for(const e of ents){
    for(const a of Object.keys(e.led.bal)) m.bal[a]=(m.bal[a]||0)+e.led.bal[a];
    for(const a of Object.keys(e.led.per)) m.per[a]=(m.per[a]||0)+e.led.per[a];
    for(const k of ['op','inv','fin']){ m.pcf[k]+=e.led.pcf[k]; for(const l of Object.keys(e.led.cfd[k])) m.cfd[k][l]=(m.cfd[k][l]||0)+e.led.cfd[k][l]; }
    for(const r of e.led.months){ const key=r.y*100+r.m; const x=mm[key]||(mm[key]={y:r.y,m:r.m,pl:{},cf:{op:0,inv:0,fin:0},cash:0});
      for(const a of Object.keys(r.pl)) x.pl[a]=(x.pl[a]||0)+r.pl[a]; for(const k of ['op','inv','fin']) x.cf[k]+=r.cf[k]; x.cash+=r.cash; }
    for(const r of e.led.years){ const key=r.y; const x=(m.yrmap||(m.yrmap={}))[key]||(m.yrmap[key]={y:r.y,pl:{},ni:0,cf:{op:0,inv:0,fin:0},assets:0,liab:0,equity:0,cash:0,debt:0});
      for(const a of Object.keys(r.pl)) x.pl[a]=(x.pl[a]||0)+r.pl[a]; x.ni+=r.ni; for(const k of ['op','inv','fin']) x.cf[k]+=r.cf[k]; x.assets+=r.assets; x.liab+=r.liab; x.equity+=r.equity; x.cash+=r.cash; x.debt+=r.debt; }
  }
  m.months=Object.values(mm).sort((a,b)=>a.y*100+a.m-(b.y*100+b.m));
  m.years=Object.values(m.yrmap||{}).sort((a,b)=>a.y-b.y);
  return m;
};
// 合併報表：集團內交易（管理費、股利、集團內借款與利息、對子公司投資）於合併時抵銷
L.consolidate = function(g, ents){
  const m=L.mergeLeds(ents);
  const subPaid = -(U.sum(ents.filter(e=>!e.isHQ),e=>e.led.bal.paid||0));
  const icAr = U.sum(ents,e=>e.led.bal.icAr||0), icAp=-U.sum(ents,e=>e.led.bal.icAp||0);
  const inv = U.sum(ents,e=>e.led.bal.invSub||0);
  const chk={icMatch:Math.abs(icAr-icAp)<1, invMatch:Math.abs(inv-subPaid)<1, icAr,icAp,inv,subPaid};
  m.chk=chk;
  // 合併資產負債表需剔除內部科目
  const bal=Object.assign({},m.bal); bal.icAr=0; bal.icAp=0; bal.invSub=0;
  return {led:m,bal,adj:{subPaid},chk,
    is:L.incomeStmt(m.bal,true),
    bs:L.balanceSheet(bal,true,{subPaid})};
};

/* ---------- 預測與風險 ---------- */
L.forecast = function(g, ent, n){
  n=n||12; const led=ent.led, ms=led.months;
  let cash=led.bal.cash||0, series=[], min=cash, minM=0;
  const loanPay=[]; for(let i=0;i<n;i++){ let s=0; for(const ln of ent.loans){ if(ln.left>i) s+= Math.min(ln.bal, ln.p0/ln.term); } loanPay.push(s); }
  const avgOp = ms.length? U.avg(ms.slice(-6),r=>r.cf.op):0;
  let m0=CAL_M(g.w), y0=g.y;
  for(let i=1;i<=n;i++){
    let mm=m0+i, yy=y0; while(mm>12){mm-=12;yy++;}
    const last=ms.find(r=>r.y===yy-1&&r.m===mm);
    let op = last? last.cf.op : avgOp;
    if(last) op = 0.5*last.cf.op+0.5*avgOp;
    cash += op - loanPay[i-1]; series.push(cash);
    if(cash<min){ min=cash; minM=i; }
  }
  return {series,min,minM,avgOp};
};
function CAL_M(w){ return SE.CAL.monthOf(w); }
L.risk = function(g, ent){
  const b=ent.led.bal, cash=b.cash||0, fc=L.forecast(g,ent,12);
  const assets=Math.max(1,L.netFixed(ent)+Math.max(0,cash)+(b.endow||0));
  const debtRatio=L.debt(ent)/assets;
  let r=0;
  if((b.ap||0)<-0.5) r+=40;
  if(fc.min<0) r+=25+Math.min(20,-fc.min/Math.max(1,assets)*100);
  if(fc.avgOp<0) r+=15;
  r+=Math.min(15,debtRatio*20);
  if(cash<0) r+=10;
  return U.clamp(Math.round(r),0,100);
};
})(typeof window!=='undefined'?window:globalThis);
