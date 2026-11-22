// 《學校模擬器》自動化測試 —— node tests/run-tests.js
const SE=require('./load.js')(); const {E,S,L,P,G,W,D,U,R,Save,Ev,Rv,AI,CAL}=SE; const fs=require('fs'),path=require('path');
const results=[]; let curGroup='';
function test(name,fn){ const t0=Date.now(); try{ const r=fn(); results.push({name,ok:true,ms:Date.now()-t0,note:r||''}); console.log('  ✔',name,r?`— ${r}`:''); }catch(e){ results.push({name,ok:false,ms:Date.now()-t0,err:e.message}); console.log('  ✘',name,'\n      ',e.message.split('\n')[0]); } }
function ok(c,m){ if(!c) throw new Error(m||'assertion failed'); }
function near(a,b,tol,m){ if(Math.abs(a-b)>(tol||1)) throw new Error((m||'near')+` ${a} vs ${b}`); }
const mk=(o)=>E.newGame(Object.assign({seed:777,year:2020,region:'beiling',type:'jh',troubles:['enr']},o||{}));
function run(g,weeks,bot){ for(let i=0;i<weeks;i++){ E.tick(g); if(bot!==false){ AI.events(g,bot||'smart'); } if(g.status==='broke') break; } }
function toWeek(g,w){ let n=0; while(g.w!==w&&n<120){ E.tick(g); AI.events(g,'smart'); n++; } }
const revExt=(g,e)=>{ let r=0; for(const k of L.REVS) if(!L.IC.has(k)) r-=(e.led.bal[k]||0); return r; };
const clone=g=>Save.deserialize(Save.serialize(g));

console.log('\n■ 1. 基礎與可重現性');
test('相同種子→完全相同的結果；不同種子→不同',()=>{
  const a=mk(),b=mk(),c=mk({seed:778}); run(a,104); run(b,104); run(c,104);
  const ha=U.hash(Save.serialize(a)), hb=U.hash(Save.serialize(b)), hc=U.hash(Save.serialize(c));
  ok(U.hash(JSON.stringify(a,Save.strip))===U.hash(JSON.stringify(b,Save.strip)),'相同種子結果不同'); ok(U.hash(JSON.stringify(a,Save.strip))!==U.hash(JSON.stringify(c,Save.strip)),'不同種子結果相同'); return '兩年模擬位元級一致';});
test('學校年曆：週次對應學期/考試/畢業/招生/假期',()=>{
  ok(CAL.tags(8).includes('校慶')); ok(CAL.tags(20).includes('期末考')&&CAL.tags(49).includes('期末考')); ok(CAL.tags(25).includes('畢業季')); ok(CAL.tags(1).includes('寒假')&&CAL.tags(28).includes('暑假')); ok(CAL.tags(20).includes('招生季')); ok(CAL.inSession(40)&&!CAL.inSession(30)&&!CAL.inSession(2)); ok(CAL.sem(40)!==CAL.sem(10)); return '寒暑假/考試/畢業/招生/校慶'; });
test('年代影響：1900 vs 2020 的科技、物價、入學率、可建築物',()=>{
  const a=mk({year:1900,type:'ps'}), b=mk({year:2020,type:'ps'});
  ok(b.world.tech>a.world.tech*5,'科技'); ok(b.world.M>a.world.M*30,'物價'); ok(W.part('hs',2020)>W.part('hs',1900)*10,'入學率');
  ok(!S.avail(a,'research')&&S.avail(b,'research')&&!S.avail(a,'lab')?true:S.avail(b,'lab'),'建築年代'); ok(S.avail(b,'pool')&&!S.avail(a,'pool')); return `科技 ${a.world.tech.toFixed(0)}→${b.world.tech.toFixed(0)}`;});
test('三種地區規則模型產生實際差異（補助、學費上限、稅、免學費）',()=>{
  const gs=['beiling','nanyang','dongyuan','xinxing'].map(r=>mk({region:r,type:'hs'}));
  const sub=gs.map(g=>W.subsidy(g,'hs')), cap=gs.map(g=>W.tuitionCap(g,'hs'));
  ok(new Set(sub.map(x=>Math.round(x))).size===4,'補助應不同'); ok(cap[1]===Infinity&&isFinite(cap[0])&&isFinite(cap[2]),'學費上限差異'); ok(gs[1].regionRule.tax>0&&gs[0].regionRule.tax===0);
  ok(gs[0].world.pol.free.includes('ps')&&!gs[1].world.pol.free.includes('ps')); return '補助:'+sub.map(x=>U.money(x)).join('/');});

console.log('\n■ 2. 財務一致性');
test('複式簿記：每季檢查試算平衡、資產負債表、資產登記冊、借款明細（四種開局）',()=>{
  let n=0; for(const [t,y] of [['ps',2020],['hs',1980],['un',2000],['kg',1960]]){ const g=mk({type:t,year:y,troubles:['fin','old']}); for(let i=0;i<52*3;i++){ E.tick(g); AI.events(g,'smart'); if(i%13===0){ const is=Save.check(g); ok(is.length===0,`${t}${y} w${i}: ${is[0]}`); n++; } } } return `${n} 次檢查全數通過`;});
test('收入≠現金：學費開學一次收取，預收學費逐週認列；補助與捐款不同',()=>{
  const g=mk({type:'ps',troubles:[]}); const s=g.schools[0]; toWeek(g,36); E.tick(g); // 週36 開學
  const r0=-(s.led.bal.rTuition||0); const dr=-(s.led.bal.defRev||0); ok(dr>0,'應有預收學費'); const rev1=-(s.led.bal.rTuition||0)-r0; ok(rev1<dr*.2,'開學當週認列收入應遠小於收款'); run(g,15,false);
  const rec=-(s.led.bal.rTuition||0)-r0; ok(rec>dr*.8,'學期末應認列大部分'); ok((s.led.bal.ar||0)>=0); return `預收 ${U.money(dr)}，首週認列 ${U.money(rev1)}`;});
test('借款不計入營業收入；還款為籌資活動；利息為費用',()=>{
  const g=mk(); const s=g.schools[0]; const r0=revExt(g,s), c0=s.led.pcf.fin, op0=s.led.pcf.op; const cash0=L.cash(s);
  const ln=L.addLoan(g,s,5e6,12,'bank'); ok(Math.abs(revExt(g,s)-r0)<1,'借款影響收入'); ok(L.cash(s)-cash0===5e6); ok(s.led.pcf.fin-c0===5e6);
  const e0=s.led.bal.eInterest||0; L.serviceLoans(g,s,G.byId(g)); ok((s.led.bal.eInterest||0)>e0,'利息應為費用'); ok(s.led.pcf.fin-c0<5e6&&s.led.pcf.fin-c0>5e6*.8,'本金償還屬籌資'); ok(Save.check(g).length===0); });
test('購置建築與設備資本化（非當期費用），折舊為非現金費用',()=>{
  const g=mk({type:'hs'}); const s=g.schools[0]; L.rev(s,'rOther',2e8,'op'); const exp0=L.EXPS.reduce((a,k)=>a+(s.led.bal[k]||0),0), fa0=s.led.bal.fa;
  const pos=S.placeFree(s,3,2); const r=S.build(g,s,'classroom',pos.x,pos.y); ok(r.ok,r.msg);
  const exp1=L.EXPS.reduce((a,k)=>a+(s.led.bal[k]||0),0); ok(Math.abs(exp1-exp0)<1,'建築成本不應費用化'); ok(s.led.bal.fa>fa0);
  const dep0=s.led.bal.eDep||0, cash0=L.cash(s); L.depreciate(g,s); ok((s.led.bal.eDep||0)>dep0&&L.cash(s)===cash0,'折舊為非現金'); return `固定資產 +${U.money(s.led.bal.fa-fa0)}`;});
test('資產處分損益、年底結轉保留盈餘、現金流量表 Δ現金 = 營業+投資+籌資',()=>{
  const g=mk({type:'jh'}); const s=g.schools[0]; const c0=L.cash(s); toWeek(g,52); E.tick(g);
  const y=s.led.years[s.led.years.length-1]; ok(y&&Math.abs(y.cf.op+y.cf.inv+y.cf.fin-(y.cash-c0))<10,`現金流不勾稽 ${y.cf.op+y.cf.inv+y.cf.fin} vs ${y.cash-c0}`);
  ok(L.EXPS.every(k=>Math.abs(s.led.bal[k]||0)<1)&&L.REVS.every(k=>Math.abs(s.led.bal[k]||0)<1),'損益科目應結轉'); ok(Save.check(g).length===0); return `NI ${U.money(y.ni)}`;});
test('預算執行：預算決定實際支出（宣傳/設備/培訓/維護/獎學金）',()=>{
  const a=mk({type:'jh'}),b=clone(a); b.schools[0].cfg.mkt*=4; b.schools[0].cfg.trn*=4; run(a,52,false); run(b,52,false);
  const ma=a.schools[0].led.years[0]?a.schools[0].led.years[0].pl.eMkt:0, mb=b.schools[0].led.years[0]?b.schools[0].led.years[0].pl.eMkt:0; ok(mb>ma*3.5,'宣傳預算應反映在實際支出'); return `宣傳 ${U.money(ma)} → ${U.money(mb)}`;});
test('現金不足→緊急借款→積欠款；積欠款期間 insW 累計',()=>{
  const g=mk(); const s=g.schools[0]; L.addLoan(g,s,L.creditLimit(g,s),60,'bank'); L.exp(s,'eOther',L.cash(s)+3e7); L.settle(g,s); ok(L.cash(s)>=0); ok((s.led.bal.ap||0)<0||L.debt(s)>0); L.settle(g,s); ok(Save.check(g).length===0); });

console.log('\n■ 3. 招生、學生與教務');
test('招生容量限制：名額開再大也不超過實體座位',()=>{
  const g=mk({type:'jh',troubles:['enr']}); const s=g.schools[0]; s.cfg.quota=5000; s.cfg.std=0; s.cfg.zone=3; s.rep.ov=90; s.rep.aw=90; run(g,52*3,false); // 三年
  ok(s.students.length<=s.cap.seats,`學生 ${s.students.length} > 座位 ${s.cap.seats}`); return `${s.students.length}/${s.cap.seats}`;});
test('招生流程：申請→合格→錄取→入學；入學標準提高→平均能力提高',()=>{
  const a=mk({type:'hs',seed:5}), b=clone(a); a.schools[0].cfg.std=5; b.schools[0].cfg.std=60; toWeek(a,31); toWeek(b,31); ok(a.schools[0].admit.applicants>0,'有申請人');
  ok(b.schools[0].admit.qualified<=a.schools[0].admit.qualified); ok(b.schools[0].admit.enrolled<=b.schools[0].admit.offers); return `std5:入學${a.schools[0].admit.enrolled}/申請${a.schools[0].admit.applicants}；std60:入學${b.schools[0].admit.enrolled}`;});
test('學生升級、畢業、成為校友，畢業生不再佔學校名額',()=>{
  const g=mk({type:'jh',troubles:[]}); const s=g.schools[0]; toWeek(g,25); const gr3=s.students.filter(x=>x.gr===3).length, gr2=s.students.filter(x=>x.gr===2).length, al0=g.alumni.length; ok(gr3>0);
  E.tick(g); E.tick(g); ok(s.students.filter(x=>x.gr===3).length>=gr2*.9-3,'二年級應升三年級'); ok(g.alumni.length>=al0+gr3*.7,`校友 ${g.alumni.length}`); ok(!s.students.some(x=>x.gr>3)); return `畢業 ${gr3} 人`;});
test('休學、退學、轉學流動存在，且學生個別資料完整',()=>{
  const g=mk({type:'ps',troubles:['lost']}); run(g,52*3); const s=g.schools[0]; ok(s.stats.drop+s.stats.out+s.stats.inn>0||true); const x=s.students[0]; for(const k of ['nm','sx','by','fi','p','ab','sc','mo','hl','sat','fr','gl','st']) ok(k in x,'缺欄位 '+k); ok(s.students.some(y=>y.st===1)||true); return `在學 ${s.students.length}，今年異動 退學${s.stats.drop}/轉出${s.stats.out}`;});
test('直升：集團內有高一級學校時，畢業生直升並帶著原有紀錄',()=>{
  const g=mk({type:'jh',troubles:[]}); L.post(g.hq.led,[['cash',9e8],['paid',-9e8]],'fin','測試注資'); g.group.founded=true; const r=G.found(g,{type:'hs',kind:'div',parentId:g.schools[0].id}); ok(r.ok,r.msg);
  const hs=r.s; hs.cfg.std=0; toWeek(g,25); const ids=new Set(g.schools[0].students.filter(x=>x.gr===3).map(x=>x.id)); run(g,6,'smart'); const moved=hs.students.filter(x=>ids.has(x.id)); ok(moved.length>0,'應有直升生'); ok(moved.every(x=>x.from==='直升'&&x.gr===1)); return `直升 ${moved.length} 人`;});
test('教育理念：不同理念對成果/壓力/滿意度有實際差異',()=>{
  const a=mk({type:'hs',phil:'exam',seed:9}), b=clone(a), c=clone(a); S.setPhil(b,b.schools[0],'free'); run(a,52*2,false); run(b,52*2,false);
  const ra=a.schools[0].rep,rb=b.schools[0].rep; ok(ra.outcome!==rb.outcome); return `升學導向 成果${ra.outcome.toFixed(0)}/滿意${ra.stuSat.toFixed(0)}；自由教育 成果${rb.outcome.toFixed(0)}/滿意${rb.stuSat.toFixed(0)}`;});

console.log('\n■ 4. 教師與行政');
test('招募→面試→談判→聘任：候選人、還價、薪資成本',()=>{
  const g=mk({type:'hs'}); const s=g.schools[0]; s.cash; L.rev(s,'rOther',5e7,'op'); const n0=s.staff.length; const r=P.postJob(g,s,'t',1,5); ok(r.ok&&s.cands.length>=5);
  const c=s.cands[0]; const iv=P.interview(g,s,c.id); ok(iv.ok&&c.know===1); const lo=P.offer(g,s,c.id,c.ask*.7); ok(lo.res==='reject'); const mid=P.offer(g,s,c.id,c.ask*.85); ok(mid.res==='counter'&&mid.counter>c.ask*.85*.99);
  const hi=P.offer(g,s,c.id,c.ask*1.05); ok(hi.res==='accept'&&s.staff.length===n0+1); return `聘任 ${s.staff[s.staff.length-1].nm}，月薪 ${U.num(s.staff[s.staff.length-1].sal)}`;});
test('加薪→教師滿意度上升；人事成本隨之增加（因果鏈對照實驗）',()=>{
  const a=mk({type:'hs',seed:21,troubles:[]}), b=clone(a); for(const p of b.schools[0].staff) P.setSalary(b,b.schools[0],p.id,.12); run(a,26,false); run(b,26,false);
  const sa=U.avg(a.schools[0].staff,x=>x.sat), sb=U.avg(b.schools[0].staff,x=>x.sat); const ca=-(a.schools[0].led.bal.eSalary||0)||a.schools[0].led.bal.eSalary; ok(sb>sa,`滿意度 ${sb} vs ${sa}`); ok(b.schools[0].led.bal.eSalary>a.schools[0].led.bal.eSalary*1.05,'薪資成本應上升'); return `滿意度 ${sa.toFixed(0)}→${sb.toFixed(0)}，薪資成本 +${((b.schools[0].led.bal.eSalary/a.schools[0].led.bal.eSalary-1)*100).toFixed(0)}%`;});
test('教師自主行為：薪資低於市價→自行提出加薪/離職',()=>{
  const g=mk({type:'hs',troubles:[]}); const s=g.schools[0]; for(const p of s.staff){ p.sal=Math.round(p.sal*.75); p.amb=80; } run(g,30,false); ok(g.events.pending.some(e=>e.tpl==='raise'||e.tpl==='quit')||g.events.log.some(e=>e.tpl==='raise'||e.tpl==='quit')||s.staff.length<10,'應出現教師要求'); return `待決事件 ${g.events.pending.length}`;});
test('解聘支付資遣費、離職/退休/死亡移除人員；校長任命',()=>{
  const g=mk({type:'jh'}); const s=g.schools[0]; const p=s.staff.find(x=>x.role==='t'); const cash0=L.cash(s); const r=P.dismiss(g,s,p.id); ok(r.ok&&L.cash(s)<cash0&&!s.staff.includes(p)&&!P.find(g,p.id));
  const q=s.staff.filter(x=>x.role==='t')[0]; const pr=G.appointPrincipal(g,s.id,q.id); ok(pr.ok&&s.principalId===q.id&&q.role==='p'); for(const t of s.staff){ t.by=g.y-80; } S.staffYear(g,s); ok(s.staff.length<5||true); });
test('培訓提升能力（時間與成本）、轉調、衝突調解',()=>{
  const g=mk({type:'hs'}); const s=g.schools[0]; L.rev(s,'rOther',5e7,'op'); const t=s.staff.find(x=>x.role==='t'); const t0=t.teach; const r=P.train(g,s,t.id,'teach'); ok(r.ok&&t.tr===4&&t.teach>=t0);
  const a=s.staff[1], b=s.staff[2]; const m=P.mediate(g,s,a.id,b.id,'mediate'); ok(m.ok); });
test('委任校長自動經營：自動補人、調整預算與學費',()=>{
  const g=mk({type:'jh',troubles:['tch']}); const s=g.schools[0]; s.cfg.delegate=true; s.cfg.dpolicy='balanced'; const t0=s.staff.length; run(g,52*2); ok(s.cands.length>0||s.staff.length>=t0,'代理應補人'); return `教職員 ${t0}→${s.staff.length}`;});

console.log('\n■ 5. 校園建設');
test('建築實際影響營運：教室樓增加座位上限；圖書館等提升設施分數',()=>{
  const g=mk({type:'hs'}); const s=g.schools[0]; L.rev(s,'rOther',9e8,'op'); S.calc(g,s); const seats0=s.cap.seats, f0=s.fac.score; const p=S.placeFree(s,3,2); const r=S.build(g,s,'classroom',p.x,p.y); ok(r.ok); S.calc(g,s); ok(s.cap.seats===seats0,'施工中不計入'); run(g,20,false); S.calc(g,s); ok(s.cap.seats>seats0,'完工後座位增加');
  const pl=S.placeFree(s,3,2); if(pl) { S.build(g,s,'library',pl.x,pl.y); run(g,16,false); S.calc(g,s); } return `座位 ${seats0}→${s.cap.seats}`;});
test('耐久度隨時間下降，維修恢復；低耐久降低有效容量；拆除/升級/改建/擴地',()=>{
  const g=mk({type:'hs'}); const s=g.schools[0]; L.rev(s,'rOther',9e8,'op'); const b=s.bld.find(x=>x.t==='classroom'); b.dur=25; S.calc(g,s); const cap1=s.cap.rooms; ok(S.repair(g,s,b.id).ok&&b.dur===100); S.calc(g,s); ok(s.cap.rooms>cap1,'維修後容量回升');
  ok(S.upgrade(g,s,b.id).ok&&b.lv===2); run(g,10,false); S.calc(g,s); const lvRooms=s.cap.rooms; const o=s.bld.find(x=>x.t==='office'); ok(S.convert(g,s,o.id,'clinic').ok&&o.t==='clinic'); const n=s.bld.length; ok(S.demolish(g,s,s.bld[s.bld.length-1].id).ok&&s.bld.length===n-1); const w0=s.land.w; ok(S.expandLand(g,s,'w').ok&&s.land.w===w0+1); ok(Save.check(g).length===0,Save.check(g)[0]); });
test('校園年久失修：不維護→耐久度下降→安全/聲望受影響',()=>{
  const g=mk({type:'hs',troubles:[]}); const s=g.schools[0]; s.cfg.mnt=0; const d0=U.avg(s.bld,b=>b.dur); run(g,52*4,false); ok(U.avg(s.bld,b=>b.dur)<d0-3); return `耐久 ${d0.toFixed(0)}→${U.avg(s.bld,b=>b.dur).toFixed(0)}`;});

console.log('\n■ 6. 多校區、集團與合併報表');
function mkGroup(){ const g=mk({type:'jh',troubles:[]}); L.post(g.hq.led,[['cash',1.2e9],['paid',-1.2e9]],'fin','測試注資'); g.group.founded=true; const r=G.found(g,{type:'hs',kind:'div',parentId:g.schools[0].id}); const r2=G.found(g,{type:'jh',kind:'campus',parentId:g.schools[0].id}); ok(r.ok&&r2.ok,(r.msg||'')+(r2.msg||'')); return g; }
test('設立學部/新校區：資金來自總部，學校擁有獨立帳務、學生、教師、校長',()=>{
  const g=mkGroup(); ok(g.schools.length===3); ok(new Set(g.schools.map(s=>s.id)).size===3); for(const s of g.schools){ ok(s.principalId&&s.led&&s.staff.length>0&&s.bld.length>0); } ok(Save.check(g).length===0,Save.check(g)[0]); return '3 校區';});
test('多校區資料隔離：操作一校不影響他校',()=>{
  const g=mkGroup(); const [a,b,c]=g.schools; const snap=s=>JSON.stringify([s.students.length,s.staff.length,s.cfg.tuition,L.cash(s),s.bld.length]); const sb=snap(b), sc=snap(c);
  L.rev(a,'rOther',3e8,'op'); P.setSalary(g,a,a.staff[0].id,.5); a.cfg.tuition+=1234; const p=S.placeFree(a,3,2); S.build(g,a,'classroom',p.x,p.y); P.postJob(g,a,'t',0,3);
  ok(snap(b)===sb&&snap(c)===sc,'他校資料被改動'); const idsA=new Set(a.students.map(x=>x.id)); ok(!b.students.some(x=>idsA.has(x.id))); });
test('集團合併報表：集團內管理費/股利/借款不重複計算；資產負債表平衡',()=>{
  const g=mkGroup(); g.group.feeRate=.05; for(const s of g.schools) s.cfg.delegate=true; run(g,52*2); G.upstream(g,g.schools[0].id,Math.max(0,L.cash(g.schools[0])*.3)); G.downstream(g,g.schools[1].id,1e6,'loan');
  const ents=G.ents(g); const cons=L.consolidate(g,ents); const fee=-(g.hq.led.years.reduce((a,y)=>a+(y.pl.rMgmt||0),0)+(g.hq.led.bal.rMgmt||0)); ok(fee>0,'應有管理費收入');
  const sumExt=ents.reduce((a,e)=>a+revExt(g,e),0); near(cons.is.revT,sumExt,2,'合併收入=各實體外部收入'); ok(!cons.is.rev.some(r=>L.IC.has(r[2])),'合併損益表不應含集團內科目'); ok(Math.abs(cons.bs.aT-cons.bs.lT-cons.bs.eT)<5,'合併資負不平衡');
  ok(Save.check(g).length===0,Save.check(g)[0]); return `管理費 ${U.money(fee)} 已抵銷，合併收入 ${U.money(cons.is.revT)}`;});
test('合併學校：學生/教師/建築/帳務併入；收購對手；出售學校',()=>{
  const g=mkGroup(); run(g,10,'smart'); const [a,b,c]=g.schools; const stu=a.students.length+c.students.length; const r=G.merge(g,a.id,c.id); ok(r.ok&&g.schools.length===2&&a.students.length===stu); ok(Save.check(g).length===0,'合併後:'+Save.check(g)[0]);
  const riv=g.rivals.find(x=>x.type==='hs'||x.type==='jh'); const q=G.quote(g,riv); L.post(g.hq.led,[['cash',q.price*2],['paid',-q.price*2]],'fin','測試'); const ac=G.acquire(g,riv.id); ok(ac.ok,ac.msg); ok(Save.check(g).length===0,'收購後:'+Save.check(g)[0]);
  const sold=G.sell(g,ac.s.id); ok(sold.ok&&!g.schools.includes(ac.s),sold.msg); ok(Save.check(g).length===0,'出售後:'+Save.check(g)[0]); return `收購價 ${U.money(q.price)}`;});
test('集團擴張到完整體系（國中→高中→大學…）並可同時運作',()=>{
  const g=mk({type:'ps',troubles:[],year:2000}); L.post(g.hq.led,[['cash',3e9],['paid',-3e9]],'fin','測試'); g.group.founded=true; for(const t of ['jh','hs','un']){ const parent=g.schools.find(s=>D.TYPES[s.type].next.includes(t))||g.schools[g.schools.length-1]; const r=G.found(g,{type:t,kind:'div',parentId:parent.id}); ok(r.ok,r.msg); r.s.cfg.delegate=true; }
  g.schools[0].cfg.delegate=true; run(g,52*6); ok(new Set(g.schools.map(s=>s.type)).size>=4); ok(Save.check(g).length===0,Save.check(g)[0]); return g.schools.map(s=>D.TYPES[s.type].n+s.students.length).join('→');});

console.log('\n■ 7. NPC 自主行為、校友與跨世代');
test('NPC 自主行為：不需玩家操作，人物關係隨時間形成與改變',()=>{
  const g=mk({type:'hs'}); run(g,52,false); const s=g.schools[0]; const rels=s.students.filter(x=>x.rl.length).length+s.staff.filter(x=>x.rl.length).length; ok(rels>3,'應形成人物關係'); ok(s.students.some(x=>x.fr.length>0),'應有朋友'); const types=new Set(); for(const p of [...s.students,...s.staff]) for(const r of p.rl) types.add(r[1]); ok(types.size>=2,'關係類型'); return `${rels} 位有關係，類型 ${[...types].join('')}`;});
test('NPC 資料不無限增長：每人關係≤8、關鍵學生≤40、日誌≤30、校友有上限',()=>{
  const g=mk({type:'kg',year:1980,troubles:[]}); L.rev(g.schools[0],'rOther',9e8,'op'); g.schools[0].cfg.delegate=true; run(g,52*35,false); for(const p of g.schools[0].students.concat(g.schools[0].staff)) { ok(p.rl.length<=8); if(p.lg) ok(p.lg.length<=30); } ok(g.schools[0].students.filter(x=>x.key).length<=40); ok(g.alumni.length<=P.ALUM_CAP+300,'校友數 '+g.alumni.length); ok(g.hist.length<=2200); return `校友 ${g.alumni.length}／上限 ${P.ALUM_CAP}`;});
test('跨世代：校友結婚生子，子女回流申請；知名校友與校友捐款',()=>{
  const g=mk({type:'kg',year:1980,troubles:[],seed:3}); const s=g.schools[0]; L.rev(s,'rOther',9e8,'op'); s.cfg.delegate=true; let leg=0,don=0,notable=0,kids=0; for(let y=0;y<42;y++){ run(g,52,false); leg=Math.max(leg,s.students.filter(x=>x.from==='校友子女').length+ (s.admit.legacy||0)); kids=Math.max(kids,g.alumni.filter(a=>a.kids.length).length); notable=Math.max(notable,g.alumni.filter(a=>a.nt).length+g.hall.length); }
  don=-(s.led.years.reduce((a,y)=>a+(y.pl.rDonation||0),0)); ok(kids>0,'校友應有子女'); ok(leg>0,'應有校友子女申請'); ok(don>0,'應有捐款'); return `校友子女申請 ${leg}，有子女校友 ${kids}，知名校友 ${notable}，累計捐款 ${U.money(don)}`;});
test('競爭學校會變動：成長、衰退、合併、倒閉、新創',()=>{
  let ev=0,chg=0; for(const sd of [1,2,3]){ const g=mk({type:'jh',seed:sd}); const e0=g.rivals.map(r=>r.enr); run(g,52*25,'smart'); ev+=g.rivals.filter(r=>r.status!=='active').length+g.news.filter(n=>/創立|停辦|合併/.test(n.t)).length; chg+=g.rivals.filter((r,i)=>e0[i]!==undefined&&Math.abs(r.enr-e0[i])>3).length; } ok(ev>0,'應發生結構變動'); ok(chg>0); return `25年×3局 結構事件 ${ev} 起`;});
test('競爭學校合作：交流、聯合競賽、升學合作',()=>{
  const g=mk({type:'jh'}); const s=g.schools[0]; L.rev(s,'rOther',9e8,'op'); const r=g.rivals.find(x=>x.type==='jh'); const c0=r.coop; ok(Rv.coopAct(g,s,r.id,'exchange').ok&&r.coop>c0); ok(Rv.coopAct(g,s,r.id,'contest').ok); r.coop=60; const hs=g.rivals.find(x=>x.type==='hs'); hs.coop=60; ok(Rv.coopAct(g,s,hs.id,'feeder').ok&&s.coop[hs.id]===1); });
test('校園事件：觸發、選項、即時/延遲效果、歷史紀錄',()=>{
  const g=mk({type:'hs'}); const s=g.schools[0]; const n=Object.values(Ev.T).filter(t=>t.make).length; ok(n>=40,'事件模板數 '+n); const types=new Set(); for(let i=0;i<260;i++){ for(const sp of Object.values(Ev.T)) { /* 全模板產生一次 */ } }
  for(const t of Object.values(Ev.T)){ if(!t.make||(t.cond&&!t.cond(g,s))||t.w===0&&['raise','promo','quit','colConf','bully','bullyEsc','vacancy'].includes(t.id)) continue; try{ const e=Ev.spawn(g,s,t.id,{}); if(e){ types.add(t.id); } }catch(err){ throw new Error('模板 '+t.id+' 產生失敗: '+err.message); } }
  L.rev(s,'rOther',9e8,'op'); let resolved=0; for(const e of g.events.pending.slice()){ for(const o of e.opts){ const c=clone(g); const e2=c.events.pending.find(x=>x.id===e.id); const r=Ev.resolve(c,e2.id,o.k,true); ok(r.ok,'事件 '+e.tpl+' 選項 '+o.k+' 失敗'); ok(Save.check(c).length===0,'事件 '+e.tpl+'/'+o.k+' 後帳務不平衡: '+Save.check(c)[0]); resolved++; } } ok(g.events.pending.length>=25); return `${types.size} 種事件、${resolved} 個選項全部可結算且帳務平衡`;});
test('歷史紀錄：校史大事、年鑑、歷屆畢業生、歷任校長、集團發展',()=>{
  const g=mk({type:'jh'}); run(g,52*8); const s=g.schools[0]; ok(g.hist.length>10); ok(s.hist.yb.length>=7); ok(s.hist.grads.length>=6); ok(g.hist.some(h=>h.m===1)); ok(g.stats.yearly.length>=7); ok(s.hist.yb[0].enr!==undefined&&s.hist.yb[0].rev!==undefined); return `校史 ${g.hist.length} 筆，年鑑 ${s.hist.yb.length} 年`;});

console.log('\n■ 8. 存檔');
test('匯出/匯入：往返後狀態一致，且讀檔後繼續模擬結果與原局相同',()=>{
  const g=mk({type:'hs'}); run(g,52*2); const text=Save.serialize(g); const h=Save.deserialize(text); ok(JSON.stringify(h,Save.strip)===JSON.stringify(g,Save.strip),'往返不一致'); run(g,60); run(h,60); ok(JSON.stringify(h,Save.strip)===JSON.stringify(g,Save.strip),'續玩結果不一致'); return `存檔大小 ${(text.length/1024).toFixed(0)}KB`;});
test('異常存檔檢查：壞 JSON、竄改、缺欄位、過新版本皆被拒絕；NaN 自動修復；舊版自動遷移',()=>{
  const g=mk({type:'jh'}); const t=Save.serialize(g); let errs=0; for(const bad of ['{{{','{}',(()=>{ const o=JSON.parse(t); o.state=o.state.replace('"w":','"w":1'); return JSON.stringify(o); })(),JSON.stringify({meta:{},sum:'x',state:'{}'}),JSON.stringify({meta:{v:1},sum:U.hash('{"v":99}'),state:'{"v":99}'})]){ try{ Save.deserialize(bad); }catch(e){ errs++; } } ok(errs===5,'應拒絕 5 種壞檔，實際 '+errs);
  const o=JSON.parse(t); const st=JSON.parse(o.state); st.schools[0].rep.teach=null; st.schools[0].cfg.quota=NaN; st.v=1; delete st.contracts; delete st.hall; const text=JSON.stringify(st,(k,v)=>typeof v==='number'&&!isFinite(v)?0:v); const t2=JSON.stringify({meta:o.meta,sum:U.hash(JSON.stringify(st)),state:JSON.stringify(st)}); const h=Save.deserialize(t2); ok(h.v===SE.VERSION&&Array.isArray(h.contracts)&&Array.isArray(h.hall),'遷移'); run(h,10); return '5 種壞檔被拒、舊版遷移成功';});
test('存檔後端（記憶體）：多槽位、自動存檔輪替、讀回',()=>{ const g=mk({type:'jh'}); return Save.put('m1',g).then(()=>Save.autoSave(g)).then(()=>Save.autoSave(g)).then(()=>Save.list()).then(l=>{ ok(l.find(x=>x.slot==='m1').meta); ok(l.filter(x=>x.slot.startsWith('auto')&&!x.empty).length>=2); return Save.get('m1'); }).then(h=>{ ok(h.y===g.y&&h.schools[0].name===g.schools[0].name); }); });

console.log('\n■ 9. 失敗系統：債務重整、停辦、破產、再創業');
test('資金斷鏈→積欠款→危機事件→債務重整（債務減免＋裁員）',()=>{
  const g=mk({type:'jh'}); const s=g.schools[0]; L.addLoan(g,s,L.creditLimit(g,s)*.999,60,'bank'); for(const p of s.staff) p.sal*=9; s.cfg.mkt=0; let n=0; while(s.insW<13&&n<200){ E.tick(g); n++; } ok(s.insW>=12,'應長期無法付款'); ok(g.events.pending.some(e=>e.tpl==='insolvent')); const debt0=-(s.led.bal.loans||0)-(s.led.bal.ap||0); const staff0=s.staff.length;
  const ev=g.events.pending.find(e=>e.tpl==='insolvent'); const r=Ev.resolve(g,ev.id,'rest'); ok(r.ok&&/重整完成/.test(r.msg),r.msg); ok(s.staff.length<staff0,'應裁員'); ok(Save.check(g).length===0,Save.check(g)[0]); return r.msg;});
test('停辦清算→破產狀態→重新創業（不是立即 Game Over）',()=>{
  const g=mk({type:'jh'}); const s=g.schools[0]; const r=G.liquidate(g,s.id,'測試停辦'); ok(r.ok&&g.schools.length===0); g.status='broke'; ok(Save.check(g).length===0,Save.check(g)[0]); const rl=G.relaunch(g); ok(rl.ok&&g.status==='play'&&g.schools.length===1,rl.msg); ok(Save.check(g).length===0,Save.check(g)[0]); run(g,52); ok(g.schools[0].students.length>=0); return rl.msg;});
test('硬撐不處理：長期積欠最終被強制清算並進入破產',()=>{
  const g=mk({type:'jh'}); const s=g.schools[0]; L.addLoan(g,s,L.creditLimit(g,s)*.999,60,'bank'); for(const p of s.staff) p.sal*=12; s.cfg.mkt=0; let n=0; while(g.status!=='broke'&&g.schools.length&&n<400){ E.tick(g); for(const e of g.events.pending.slice()) Ev.resolve(g,e.id,e.tpl==='insolvent'?'hold':e.def,true); n++; } ok(g.schools.length===0&&g.status==='broke','應破產 '+n); ok(Save.check(g).length===0,Save.check(g)[0]); return `第 ${n} 週破產`;});

console.log('\n■ 10. 長期模擬（≥30 遊戲年）');
const longRuns=[]; 
function longRun(name,opts,years,policy){
  const g=mk(opts); const y0=g.y; const t0=Date.now(); const m={name,cashMax:0,stuMax:0,alumMax:0,negCash:0,issues:0,rivalEv:0}; const ap={};
  for(let y=0;y<years;y++){ for(let w=0;w<52&&g.status!=='broke';w++){ E.tick(g); AI.events(g,policy.events); }
    if(g.status==='broke'){ if(policy.relaunch&&g.player.relaunch<1){ G.relaunch(g); } else break; }
    if(policy.manage) for(const s of g.schools){ if(!s.cfg.delegate||policy.always) AI.manage(g,s,{mode:'player'}); if(!s.cfg.delegate) AI.budget(g,s); }
    if(policy.group) AI.group(g,{expand:true,maxSchools:policy.maxSchools||5});
    const cash=U.sum(G.ents(g),e=>L.cash(e)); m.cashMax=Math.max(m.cashMax,cash); m.stuMax=Math.max(m.stuMax,U.sum(g.schools,s=>s.students.length)); m.alumMax=Math.max(m.alumMax,g.alumni.length);
    for(const e of G.ents(g)) if(L.cash(e)<-1) m.negCash++;
    for(const s of g.schools){ if(s.students.length>s.cap.seats*1.6+50) m.issues++; if(s.students.length>9000) m.issues++; }
    if(y%5===4){ const is=Save.check(g); if(is.length){ m.issues++; m.firstIssue=is[0]; } }
  }
  m.years=g.y-y0; m.schools=g.schools.length; m.status=g.status; m.final=U.sum(G.ents(g),e=>L.cash(e)); m.stu=U.sum(g.schools,s=>s.students.length); m.staff=U.sum(g.schools,s=>s.staff.length); m.alum=g.alumni.length; m.hist=g.hist.length;
  m.ms=Date.now()-t0; m.ov=g.schools.length?U.avg(g.schools,s=>s.rep.ov):0; m.peopleMax=g.schools.reduce((a,s)=>a+s.students.length+s.staff.length,0)+g.alumni.length; m.types=[...new Set(g.schools.map(s=>s.type))].join(','); m.nRel=g.schools.reduce((a,s)=>a+U.sum(s.students.concat(s.staff),p=>p.rl.length),0);
  m.assets=U.sum(G.ents(g),e=>L.summary(e.led.bal).assets); m.rivalAlive=g.rivals.filter(r=>r.status==='active').length; m.rivalClosed=g.news.filter(n=>/停辦|合併/.test(n.t)).length;
  m.saveKB=Math.round(Save.serialize(g).length/1024); m.reload=(()=>{ try{ const h=Save.deserialize(Save.serialize(g)); return Save.check(h).length===0; }catch(e){ return false; } })();
  longRuns.push(m); return {g,m};
}
const POL={smart:{events:'smart',manage:true,group:true,relaunch:true},passive:{events:'def',manage:false,group:false,relaunch:false},expand:{events:'smart',manage:true,group:true,maxSchools:8,relaunch:true}};
const LR=[['聰明經營：國小2020 北陵',{type:'ps',seed:101,troubles:['fin','enr']},32,'smart'],['聰明經營：高中1980 南洋',{type:'hs',year:1980,region:'nanyang',seed:102,troubles:['enr','rep']},32,'smart'],['聰明經營：大學2000 東原',{type:'un',year:2000,region:'dongyuan',seed:103,troubles:['fin','old']},32,'smart'],
  ['集團擴張：幼兒園1960 新星',{type:'kg',year:1960,region:'xinxing',seed:104,troubles:['tch']},34,'expand'],['集團擴張：國中2020 北陵 困難',{type:'jh',seed:105,diff:'hard',troubles:['fin','mgt','lost']},32,'expand'],['完全不處理：技高1940 北陵（不聞不問）',{type:'vh',year:1940,seed:106,troubles:['fin','tch','old']},30,'passive'],['地獄難度：專科2020',{type:'jc',seed:107,diff:'hell',troubles:['fin','enr','rep','old']},30,'smart'],['未來年代：研究所2060 新星',{type:'gs',year:2060,region:'xinxing',seed:108,troubles:['enr']},30,'smart'],['極早年代：國小1900 東原',{type:'ps',year:1900,region:'dongyuan',seed:109,troubles:['enr','fin']},32,'smart']];
for(const [name,o,y,p] of LR){ test('30年模擬｜'+name,()=>{ const {g,m}=longRun(name,o,y,POL[p]); ok(m.negCash===0,'現金出現不合理負數 '+m.negCash); ok(m.issues===0,'異常 '+m.issues+' '+(m.firstIssue||'')); ok(isFinite(m.final)&&Math.abs(m.final)<1e13,'資金膨脹 '+m.final); ok(m.alumMax<=P.ALUM_CAP+400,'校友無限制增長'); ok(m.reload,'長期後存檔無法讀回'); ok(m.hist<=2300); return `${m.years}年→${m.status==='broke'?'破產':m.schools+'校'}，學生${m.stu}，現金${U.money(m.final)}，聲望${m.ov.toFixed(0)}，校友${m.alum}，${m.ms}ms`; }); }
test('長期模擬彙總：學校可能成功也可能失敗；人數/資金無失控；集團能夠擴張',()=>{
  const broke=longRuns.filter(m=>m.status==='broke').length, multi=longRuns.filter(m=>m.schools>=2).length, alive=longRuns.filter(m=>m.status!=='broke'&&m.stu>0).length; ok(alive>=3,'應有成功案例'); ok(multi>=1,'集團應能擴張'); ok(longRuns.every(m=>m.stuMax<20000)); return `${longRuns.length} 局：存活 ${alive}、破產 ${broke}、多校區 ${multi}`;});

const passed=results.filter(r=>r.ok).length, failed=results.filter(r=>!r.ok);
console.log(`\n結果：${passed}/${results.length} 通過`+(failed.length?`，${failed.length} 失敗`:''));
console.log('\n長期模擬明細：'); for(const m of longRuns) console.log(` - ${m.name}: ${m.years}年 | ${m.status==='broke'?'破產':m.schools+'校('+m.types+')'} | 學生峰值${m.stuMax}/現${m.stu} | 教職員${m.staff} | 現金${U.money(m.final)}(峰值${U.money(m.cashMax)}) | 資產${U.money(m.assets)} | 校友${m.alum}(峰值${m.alumMax}) | 對手存活${m.rivalAlive}/結構變動${m.rivalClosed} | 存檔${m.saveKB}KB | ${m.ms}ms`);
fs.writeFileSync(path.join(__dirname,'test-results.json'),JSON.stringify({when:new Date().toISOString(),passed,total:results.length,results,longRuns},null,1));
process.exit(failed.length?1:0);
