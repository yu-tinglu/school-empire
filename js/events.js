(function(root){
'use strict';
const SE = root.SE, R=SE.R, U=SE.U, D=SE.D, W=SE.W, L=SE.L, P=SE.P, S=SE.S, Rv=SE.Rv, CAL=SE.CAL;
const Ev = SE.Ev = {};
const T = Ev.T = {};
const O=(k,label,cost)=>({k,label,cost:Math.round(cost||0)});
const M=g=>W.M(g);
const rep=(s,d,v)=>{ s.rep[d]=U.clamp(s.rep[d]+v,0,100); };
const stSat=(s,v)=>{ for(const x of s.students) x.sat=U.clamp(x.sat+v,0,100); };
const stMood=(s,v)=>{ for(const x of s.students) x.mood=U.clamp(x.mood+v,0,100); };
const stfSat=(s,v)=>{ for(const x of s.staff) x.sat=U.clamp(x.sat+v,0,100); };
const pay=(s,amt,acct)=>L.exp(s,acct||'eOther',amt);
const getS=(g,id)=>g.schools.find(x=>x.id===id&&!x.closed);
const enr=s=>s.students.length;
const pickKeyStu=(g,s)=>{ const k=s.students.filter(x=>x.key); return k.length?R.pick(g,k):(s.students.length?R.pick(g,s.students):null); };
const pickStaff=(g,s,f)=>{ const a=f?s.staff.filter(f):s.staff; return a.length?R.pick(g,a):null; };
function tpl(id,def){ def.id=id; T[id]=def; }
Ev.canPay = (g,s,c)=> c<=0 || L.cash(s)>=c || L.creditLimit(g,s)>=c-Math.max(0,L.cash(s));

/* ---------- 延遲效果註冊 ---------- */
const DEL = Ev.DEL = {
  cash:(g,a)=>{ const s=getS(g,a.sid); if(s&&a.amt>0){ L.rev(s,a.acct||'rDonation',a.amt); S.log(g,s,a.txt||`收到款項 ${U.money(a.amt)}`,a.amt>1e7*M(g)); } },
  trust:(g,a)=>{ const s=getS(g,a.sid); if(s) s.trustAdj+=a.v; },
  rep:(g,a)=>{ const s=getS(g,a.sid); if(s) rep(s,a.d,a.v); },
  curr:(g,a)=>{ const s=getS(g,a.sid); if(s) s.curr=U.clamp(s.curr+a.v,0,100); },
  stfsat:(g,a)=>{ const s=getS(g,a.sid); if(s) stfSat(s,a.v); },
  spawn:(g,a)=>{ const s=getS(g,a.sid); if(s) Ev.spawn(g,s,a.tpl,a.ctx||{}); },
  flag:(g,a)=>{ const s=getS(g,a.sid); if(s) s.flags[a.k]=a.v; },
  contract:(g,a)=>{ g.contracts.push({sid:a.sid,amt:a.amt,until:g.y+a.yrs,who:a.who}); },
};
Ev.delay=(g,weeks,fn,args)=>{ g.events.delayed.push({at:g.abs+weeks,fn,args}); };
Ev.processDelayed = function(g){
  const d=g.events.delayed; if(!d.length) return;
  const rest=[]; for(const e of d){ if(e.at<=g.abs){ const f=DEL[e.fn]; if(f) try{ f(g,e.args); }catch(err){ } } else rest.push(e); }
  g.events.delayed=rest;
};

/* ---------- 實例化 / 結算 ---------- */
Ev.add = function(g,s,tid,data,def){
  const e={id:g.nextId++,tpl:tid,sid:s?s.id:0,sn:s?s.name:'集團',y:g.y,w:g.w,abs:g.abs,title:data.title,text:data.text,ctx:data.ctx||{},opts:data.opts,def:def||data.def||data.opts[0].k,
    urgent:!!data.urgent,dl:g.abs+(data.dl||8)};
  e.ctx.c={}; for(const o of e.opts) e.ctx.c[o.k]=o.cost;
  g.events.pending.push(e); return e;
};
Ev.spawn = function(g,s,tid,ctx){
  const t=T[tid]; if(!t) return null; ctx=ctx||{}; const data=t.make(g,s,ctx); if(!data) return null;
  data.ctx=Object.assign(ctx,data.ctx||{});
  return Ev.add(g,s,tid,data);
};
Ev.info = function(g,s,title,text){ return Ev.add(g,s,'info',{title,text,opts:[O('ok','知道了')],ctx:{},dl:6}); };
tpl('info',{run:()=>'' });
Ev.resolve = function(g,id,k,auto){
  const i=g.events.pending.findIndex(e=>e.id===id); if(i<0) return {ok:false,msg:'事件已失效'};
  const e=g.events.pending[i], s=getS(g,e.sid)||g.schools[0]; const t=T[e.tpl];
  const cost=e.ctx.c[k]||0;
  if(!auto && cost>0 && !Ev.canPay(g,s,cost)) return {ok:false,msg:`資金不足（需要 ${U.money(cost)}）`};
  let msg=''; try{ msg=t.run(g,s,e.ctx,k)||''; }catch(err){ msg='（事件處理發生例外，已略過）'; }
  g.events.pending.splice(i,1);
  const lab=(e.opts.find(o=>o.k===k)||{}).label||k;
  g.events.log.unshift({y:g.y,w:g.w,sn:e.sn,title:e.title,choice:lab,res:msg,auto:!!auto,tpl:e.tpl});
  if(g.events.log.length>160) g.events.log.length=160;
  if(e.tpl!=='info') S.log(g,s,`事件「${e.title}」→ ${lab}${msg?'：'+msg:''}`,false);
  return {ok:true,msg};
};
Ev.expire = function(g){
  for(const e of g.events.pending.slice()){
    if(g.abs>=e.dl){ const s=getS(g,e.sid); const r=Ev.resolve(g,e.id,e.def,true); if(s&&e.tpl!=='info'&&!e.ctx.noNeglect) s.trustAdj-=.6; }
  }
  if(g.events.pending.length>10){ const x=g.events.pending.filter(e=>!e.urgent)[0]; if(x) Ev.resolve(g,x.id,x.def,true); }
};

/* ---------- 週度擲骰 ---------- */
Ev.weekly = function(g){
  for(const s of g.schools){
    if(s.closed) continue;
    const pend=g.events.pending.filter(e=>e.sid===s.id).length; if(pend>=4) continue;
    if(!R.chance(g,.2*g.diff.evt)) continue;
    const list=Object.values(T).filter(t=>t.w>0&&t.cond&&t.cond(g,s));
    if(!list.length) continue;
    const t=R.wpick(g,list,x=>x.w*(x.wf?x.wf(g,s):1));
    if(g.events.last[s.id+t.id]&&g.abs-g.events.last[s.id+t.id]<t.cd) continue;
    const e=Ev.spawn(g,s,t.id,{}); if(e) g.events.last[s.id+t.id]=g.abs;
  }
};
Ev.requestStaff = function(g,s,kind,p){
  if(kind==='raise') { Ev.spawn(g,s,'raise',{pid:p.id}); return true; }
  if(kind==='promo') { Ev.spawn(g,s,'promo',{pid:p.id}); return true; }
  if(kind==='quit') { Ev.spawn(g,s,'quit',{pid:p.id}); return true; }
  return false;
};
Ev.vacancy = function(g,s){ Ev.spawn(g,s,'vacancy',{}); };

/* ============================ 模板 ============================ */
// ---- 人事 ----
tpl('raise',{cat:'教師',w:0,make:(g,s,x)=>{ const p=s.staff.find(y=>y.id===x.pid); if(!p) return null;
  const mk=P.marketSalary(g,s,p); const need=Math.max(.03,Math.min(.2,mk/p.sal-1+.02));
  x.pct=need; return {title:`${p.nm}要求加薪`,text:`${p.role==='t'?'教師':'職員'}${p.nm}（年資 ${p.ex} 年，考核 ${p.perf}）認為薪資低於市場行情（目前為市價的 ${Math.round(p.sal/mk*100)}%），向校方提出加薪要求。滿意度 ${Math.round(p.sat)}。`,
  opts:[O('full',`加薪 ${Math.round(need*100)}%`),O('half',`折衷加薪 ${Math.round(need*50)}%`),O('no','拒絕')],def:'no',dl:6}; },
  run:(g,s,x,k)=>{ const p=s.staff.find(y=>y.id===x.pid); if(!p) return '對方已離開。';
    if(k==='full'){ P.setSalary(g,s,p.id,x.pct); return `${p.nm}接受新薪資，士氣回升。`; }
    if(k==='half'){ P.setSalary(g,s,p.id,x.pct/2); p.sat=Math.min(100,p.sat+2); if(R.chance(g,.35)){ return `${p.nm}勉強接受，但仍不太滿意。`; } return `${p.nm}接受了折衷方案。`; }
    p.sat=Math.max(0,p.sat-8); p.req=0; if(p.amb>55&&R.chance(g,.3)){ P.leave(g,s,p,'quit'); return `${p.nm}失望離職。`; } return `${p.nm}失望但暫時留任。`; }});
tpl('promo',{cat:'教師',w:0,make:(g,s,x)=>{ const p=s.staff.find(y=>y.id===x.pid); if(!p) return null;
  return {title:`${p.nm}希望晉升主任`,text:`${p.nm}（教學 ${p.teach}、管理 ${p.mgmt}、考核 ${p.perf}）野心勃勃，希望擔任行政主管。`,opts:[O('yes','晉升為主任（薪資+15%）'),O('no','婉拒，鼓勵繼續努力')],def:'no',dl:6}; },
  run:(g,s,x,k)=>{ const p=s.staff.find(y=>y.id===x.pid); if(!p) return ''; if(k==='yes'){ P.promote(g,s,p.id,'d'); return `${p.nm}升任${p.dt}主任。`; } p.req=0; p.sat=Math.max(0,p.sat-5); return `${p.nm}略顯失落。`; }});
tpl('quit',{cat:'教師',w:0,urgent:true,make:(g,s,x)=>{ const p=s.staff.find(y=>y.id===x.pid); if(!p) return null;
  return {title:`${p.nm}提出辭呈`,text:`${p.role==='t'?'教師':'職員'}${p.nm}（教學 ${p.teach}、考核 ${p.perf}）表示將接受他校邀約。是否慰留？`,opts:[O('raise10','慰留並加薪 10%（成功率約 70%）'),O('raise5','加薪 5% 慰留（成功率約 45%）'),O('go','尊重決定')],def:'go',dl:3,urgent:true}; },
  run:(g,s,x,k)=>{ const p=s.staff.find(y=>y.id===x.pid); if(!p) return '';
    if(k==='go'){ P.leave(g,s,p,'quit'); S.log(g,s,`${p.nm}離職`,false); return `${p.nm}離職。`; }
    const pr=k==='raise10'?.7:.45; if(R.chance(g,pr+(p.sat>40?.1:0))){ P.setSalary(g,s,p.id,k==='raise10'?.1:.05); p.sat=Math.min(100,p.sat+12); return `${p.nm}答應留下。`; }
    P.leave(g,s,p,'quit'); return `${p.nm}仍然離職。`; }});
tpl('vacancy',{cat:'經營',w:0,urgent:true,make:(g,s)=>{ const c=s.staff.filter(x=>x.role!=='a').sort((a,b)=>b.mgmt-a.mgmt).slice(0,3);
  if(!c.length) return null;
  return {title:'校長出缺',text:'校長退休或離任，請選擇接任人選。管理能力高者較能穩定校務。',ctx:{ids:c.map(x=>x.id)},opts:c.map(x=>O('p'+x.id,`${x.nm}（管理 ${x.mgmt}／考核 ${x.perf}）`)).concat([O('act','由主任代理（管理較弱）')]),def:'p'+c[0].id,dl:6,urgent:true}; },
  run:(g,s,x,k)=>{ if(k==='act') return '由主任代理校務。'; const id=+k.slice(1); const p=s.staff.find(y=>y.id===id); if(!p) return ''; P.promote(g,s,id,'p'); p.pStart=g.y; return `${p.nm}出任校長。`; }});
tpl('colConf',{cat:'教師',w:0,urgent:false,make:(g,s,x)=>{ const a=s.staff.find(y=>y.id===x.a), b=s.staff.find(y=>y.id===x.b); if(!a||!b) return null;
  return {title:'同事衝突',text:`${a.nm}與${b.nm}長期不合，辦公室氣氛緊張，影響教師士氣與協作。`,opts:[O('mediate','出面調解',W.M(g)*20000),O('sep','調離其中一人'),O('ign','不介入')],def:'ign',dl:8}; },
  run:(g,s,x,k)=>{ s._cf=0; if(k==='ign'){ stfSat(s,-1.5); return '衝突持續，士氣略受影響。'; } return (P.mediate(g,s,x.a,x.b,k==='mediate'?'mediate':'separate')||{}).msg||''; }});
tpl('union',{cat:'教師',w:.5,cd:260,cond:(g,s)=>g.y>=1950&&s.staff.length>=10&&s.avgSalRatio<1.02&&s.rep.staffSat<65,
  make:(g,s)=>({title:'教職員提出集體要求',text:`教職員代表要求全體加薪 6% 並改善工作條件。目前教師滿意度 ${Math.round(s.rep.staffSat)}。`,opts:[O('yes','接受（全體加薪 6%）'),O('neg','協商（加薪 3%，成功率 60%）'),O('no','拒絕')],def:'neg',dl:6}),
  run:(g,s,x,k)=>{ if(k==='yes'){ for(const p of s.staff) P.setSalary(g,s,p.id,.06); return '全體加薪 6%，勞資關係和諧。'; }
    if(k==='neg'){ if(R.chance(g,.6)){ for(const p of s.staff) P.setSalary(g,s,p.id,.03); return '協商成功，加薪 3%。'; } stfSat(s,-4); return '協商破裂，教職員不滿。'; }
    stfSat(s,-8); if(R.chance(g,.3)){ Ev.delay(g,2,'spawn',{sid:s.id,tpl:'strike'}); return '拒絕後教職員醞釀罷教……'; } return '教職員不滿，士氣低落。'; }});
tpl('strike',{cat:'教師',w:0,urgent:true,make:(g,s)=>({title:'教師罷教',text:'教師集體罷教，教學中斷，家長焦慮。',opts:[O('settle','立即談判（加薪 5%）'),O('wait','強硬等待')],def:'settle',dl:2,urgent:true}),
  run:(g,s,x,k)=>{ if(k==='settle'){ for(const p of s.staff) P.setSalary(g,s,p.id,.05); s.trustAdj-=2; return '談判結束，復課。'; } s.trustAdj-=8; s.quality=Math.max(0,s.quality-4); for(const p of s.staff) p.sat=Math.max(0,p.sat-6); return '僵持多日後復課，傷害深重。'; }});
tpl('misconduct',{cat:'教師',w:.35,cd:200,cond:(g,s)=>s.staff.length>8,make:(g,s,x)=>{ const p=pickStaff(g,s,y=>y.role==='t'); if(!p) return null; x.pid=p.id; x.guilty=R.chance(g,.55);
  return {title:`${p.nm}遭指控教學不當`,text:`有家長指控教師${p.nm}管教或言行不當，輿論關注。實情尚待釐清。`,opts:[O('inv','停職調查（成本 '+U.money(W.M(g)*80000)+'）',W.M(g)*80000),O('fire','立即解聘'),O('warn','口頭警告')],def:'inv',dl:6}; },
  run:(g,s,x,k)=>{ const p=s.staff.find(y=>y.id===x.pid); if(!p) return '';
    if(k==='inv'){ if(x.guilty){ P.dismiss(g,s,p.id,'misconduct'); s.trustAdj+=2; rep(s,'safety',1); return '調查屬實，依規解聘。'; } p.sat=Math.min(100,p.sat+4); s.trustAdj+=1; return '調查結果還了教師清白。'; }
    if(k==='fire'){ P.dismiss(g,s,p.id,'misconduct'); if(!x.guilty){ pay(s,W.M(g)*600000); s.rep.staffSat=Math.max(0,s.rep.staffSat-2); return '事後證明誤判，賠償與士氣損失。'; } s.trustAdj+=1; return '果斷處理，家長肯定。'; }
    if(x.guilty&&R.chance(g,.6)){ s.trustAdj-=6; rep(s,'safety',-1.5); return '輕輕放下，事後再度爆發，公信力受損。'; } return '事情平息。'; }});
tpl('teacherShort',{cat:'教師',w:.9,cd:70,cond:(g,s)=>s.cover<.85&&s.students.length>20,make:(g,s)=>({title:'教師人力吃緊',text:`教師人力僅達需求的 ${Math.round(s.cover*100)}%，班級負荷過重。`,opts:[O('post','刊登徵才（自動徵 4 人）',W.M(g)*30000),O('ot','要求現有教師加課'),O('hold','先觀察')],def:'hold',dl:6}),
  run:(g,s,x,k)=>{ if(k==='post'){ const r=P.postJob(g,s,'t',R.i(g,0,3),4); return r.msg+' 請至教職員中心面試與聘任。'; } if(k==='ot'){ stfSat(s,-4); return '教師加班，滿意度下降但暫時補位。'; } return ''; }});
tpl('award',{cat:'教師',w:.5,cd:150,cond:(g,s)=>S.teachers(s).length>5&&s.tq>55,make:(g,s,x)=>{ const p=pickStaff(g,s,y=>y.role==='t'&&y.teach>60)||pickStaff(g,s,y=>y.role==='t'); if(!p) return null; x.pid=p.id;
  return {title:`${p.nm}老師獲得教學獎項`,text:'優秀教師獲得外界肯定，是宣傳學校的好時機。',opts:[O('pr','大力宣傳（'+U.money(W.M(g)*120000)+'）',W.M(g)*120000),O('low','低調處理')],def:'low',dl:6}; },
  run:(g,s,x,k)=>{ const p=s.staff.find(y=>y.id===x.pid); if(p){ p.sat=Math.min(100,p.sat+6); } if(k==='pr'){ s.trustAdj+=3; rep(s,'social',.6); s.rep.aw=Math.min(100,s.rep.aw+3); return '宣傳奏效，知名度與信任上升。'; } return '教師士氣提升。'; }});

// ---- 學生 ----
tpl('bully',{cat:'學生',w:0,urgent:false,make:(g,s,x)=>{ const a=P.find(g,x.a), b=P.find(g,x.b); if(!a||!b) return null;
  const cn=s.staff.filter(y=>y.role==='d'&&y.dt==='輔導')[0];
  return {title:'校園霸凌事件',text:`${a.nm}被指長期欺負${b.nm}。${b.nm}情緒低落、成績下滑，家長已向導師反映。`,opts:[O('punish','嚴正處分加害者'),O('counsel','調解並安排輔導',W.M(g)*40000),O('quiet','請雙方和解、低調處理')],def:'quiet',dl:6,urgent:true}; },
  run:(g,s,x,k)=>{ const a=P.find(g,x.a), b=P.find(g,x.b); if(!a||!b) return '';
    const cn=s.staff.filter(y=>y.role==='d'&&y.dt==='輔導')[0]; const cm=cn?cn.mgmt/100:.3;
    if(k==='punish'){ a.st=1; a.lv=12; a.mo=Math.max(0,a.mo-10); b.mood=Math.min(100,b.mood+15); s.safeAdj+=3; s.trustAdj+=3; P.relBump(a,b,'x',-20); if(a.key) P.logOf(a,g,'因霸凌遭停學處分'); return '加害者受到處分，校園安全感提升。'; }
    if(k==='counsel'){ if(R.chance(g,.45+cm*.5)){ P.relBump(a,b,'c',55); b.mood=Math.min(100,b.mood+12); a.p[3]=Math.min(100,a.p[3]+3); s.trustAdj+=2; s.safeAdj+=1.5; return '調解成功，兩人關係改善。'; } b.mood=Math.min(100,b.mood+4); return '調解效果有限，持續追蹤。'; }
    if(R.chance(g,.45)){ Ev.delay(g,4,'spawn',{sid:s.id,tpl:'bullyEsc',ctx:{a:x.a,b:x.b}}); return '表面和解，但問題可能未解決……'; } b.mood=Math.max(0,b.mood-4); return '暫時平息。'; }});
tpl('bullyEsc',{cat:'學生',w:0,urgent:true,make:(g,s,x)=>{ const b=P.find(g,x.b); if(!b) return null; return {title:'霸凌事件擴大',text:`${b.nm}的家長向媒體投訴校方處理不當，輿論發酵。`,opts:[O('apol','公開道歉並檢討',W.M(g)*150000),O('def','發表聲明澄清')],def:'apol',dl:3,urgent:true}; },
  run:(g,s,x,k)=>{ if(k==='apol'){ s.trustAdj-=2; s.safeAdj+=2; return '誠懇道歉，風波逐漸平息。'; } if(R.chance(g,.6)){ s.trustAdj-=8; rep(s,'safety',-2); return '澄清被認為卸責，信任度大跌。'; } s.trustAdj-=3; return '風波逐漸平息。'; }});
tpl('cheat',{cat:'學生',w:.7,cd:100,cond:(g,s)=>enr(s)>40&&s.m.exam>0,make:(g,s,x)=>{ x.n=Math.max(2,Math.round(enr(s)*.015)); return {title:'考試作弊風波',text:`考試中發現約 ${x.n} 人涉嫌作弊，可能牽涉補習班或手機/紙條。`,opts:[O('hard','嚴懲並公告'),O('coun','輔導與補考',W.M(g)*30000),O('hush','低調處理')],def:'coun',dl:6}; },
  run:(g,s,x,k)=>{ if(k==='hard'){ s.trustAdj+=2; stMood(s,-1.5); rep(s,'outcome',.4); return '嚴懲立威，考風改善，學生壓力上升。'; } if(k==='coun'){ stMood(s,.5); s.trustAdj+=1; return '輔導後補考，學生感受到關懷。'; } if(R.chance(g,.35)){ s.trustAdj-=5; return '事件外洩，被質疑包庇。'; } return '事件不了了之。'; }});
tpl('hardship',{cat:'學生',w:1,cd:50,cond:(g,s)=>enr(s)>20,make:(g,s,x)=>{ const c=s.students.filter(y=>y.fi<28&&!y.sch); if(!c.length) return null; const st=R.pick(g,c); x.sid2=st.id; const full=Math.round(s.cfg.tuition*2);
  return {title:`${st.nm}家庭遭逢變故`,text:`${st.nm}（能力 ${st.ab}、成績 ${Math.round(st.sc)}）的家長失業，恐無力負擔學費，可能休學或轉學。`,opts:[O('full','提供一年全額獎學金（'+U.money(full)+'）',full),O('half','提供半額獎學金（'+U.money(full/2)+'）',full/2),O('no','依規定處理')],def:'half',dl:8}; },
  run:(g,s,x,k)=>{ const st=s.students.find(y=>y.id===x.sid2); if(!st) return ''; if(k==='no'){ if(R.chance(g,.5)){ s.students.splice(s.students.indexOf(st),1); P.del(g,st); s.stats.drop++; return `${st.nm}因經濟困難退學。`; } st.mood-=8; return `${st.nm}情緒低落但留校。`; }
    st.sch=Math.round(s.cfg.tuition*(k==='full'?1:.5)); st.mo=Math.min(100,st.mo+6); s.trustAdj+=1.2; if(st.key) P.logOf(st,g,'獲學校獎學金支持完成學業'); return `${st.nm}得以安心就學。`; }});
tpl('talent',{cat:'學生',w:.8,cd:60,cond:(g,s)=>s.students.some(x=>x.key&&Math.max(x.ar,x.sp,x.tc)>85),make:(g,s,x)=>{ const st=R.pick(g,s.students.filter(y=>y.key&&Math.max(y.ar,y.sp,y.tc)>85)); x.sid2=st.id; const f=[st.ar,st.sp,st.tc].indexOf(Math.max(st.ar,st.sp,st.tc))+1;
  return {title:`${st.nm}展現${D.FIELDS[f]}天賦`,text:`老師發現${st.nm}在${D.FIELDS[f]}領域極具天賦，建議投入資源培養。`,opts:[O('train','專案培養（'+U.money(W.M(g)*220000)+'）',W.M(g)*220000),O('comp','推薦參加競賽'),O('no','維持一般教學')],def:'no',dl:8,ctx:{f}}; },
  run:(g,s,x,k)=>{ const st=s.students.find(y=>y.id===x.sid2); if(!st) return ''; if(k==='train'){ const f=['ab','ar','sp','tc'][x.f||0]; st[f]=Math.min(99,st[f]+6); st.mo=Math.min(100,st.mo+8); st.fame=1; P.logOf(st,g,'獲學校專案培養'); return `${st.nm}進步神速，將為學校爭光。`; }
    if(k==='comp'){ const r=S.compete(g,s,x.f||0); return r.msg||''; } return ''; }});
tpl('clubReq',{cat:'學生',w:.9,cd:90,cond:(g,s)=>enr(s)>30&&s.cfg.clubs.length<8,make:(g,s,x)=>{ const avail=D.CLUBS.filter(c=>!s.cfg.clubs.includes(c.id)); if(!avail.length) return null; const c=R.pick(g,avail); x.cid=c.id;
  return {title:`學生提議成立「${c.n}」`,text:'一群學生連署希望成立新社團，需要經費與指導老師。',opts:[O('yes','核准（'+U.money(W.M(g)*50000)+'）',W.M(g)*50000),O('no','駁回')],def:'no',dl:8}; },
  run:(g,s,x,k)=>{ if(k==='yes'){ s.cfg.clubs.push(x.cid); stSat(s,1); return `${D.CLUBS[x.cid].n}成立。`; } stSat(s,-.8); return '學生有些失望。'; }});
tpl('protest',{cat:'學生',w:1,cd:100,cond:(g,s)=>enr(s)>40&&s.rep.stuSat<48,make:(g,s)=>({title:'學生連署陳情',text:`學生滿意度偏低（${Math.round(s.rep.stuSat)}），就餐、設施或課業壓力引發連署陳情。`,opts:[O('talk','召開座談並改善',W.M(g)*120000),O('part','部分讓步'),O('ign','不予理會')],def:'part',dl:6}),
  run:(g,s,x,k)=>{ if(k==='talk'){ stSat(s,5); stMood(s,3); s.trustAdj+=1; return '座談後推出改善措施，學生態度緩和。'; } if(k==='part'){ stSat(s,2); return '部分採納意見。'; } stSat(s,-4); stMood(s,-3); s.trustAdj-=2; return '學生不滿擴大。'; }});
tpl('flu',{cat:'學生',w:.8,cd:90,cond:(g,s)=>(g.w<=12||g.w>=44)&&enr(s)>30,make:(g,s)=>({title:'流感群聚',text:`校內出現流感群聚。醫護設施覆蓋率 ${Math.round((s.fac.cov.clinic||0)*100)}%。`,opts:[O('close','停課消毒一週'),O('clean','加強消毒與防護',W.M(g)*80000),O('keep','照常上課')],def:'clean',dl:3,urgent:true}),
  run:(g,s,x,k)=>{ const cc=s.fac.cov.clinic||0; if(k==='close'){ s.trustAdj+=2; rep(s,'safety',.5); return '停課後疫情受控，家長稱許。'; } if(k==='clean'){ for(const st of s.students) st.hl=Math.max(10,st.hl-(cc>.6?1:3)); return cc>.6?'醫護室運作良好，疫情輕微。':'疫情仍造成部分學生缺課。'; }
    for(const st of s.students) st.hl=Math.max(10,st.hl-8); s.trustAdj-=2; rep(s,'safety',-1); if(R.chance(g,.3)){ s.trustAdj-=3; return '疫情擴大，家長不滿。'; } return '疫情蔓延，學生健康下滑。'; }});
tpl('stress',{cat:'學生',w:.8,cd:120,cond:(g,s)=>enr(s)>30&&D.PHIL[s.cfg.phil].stress>=.6&&U.avg(s.students,x=>x.mood)<55,make:(g,s)=>({title:'學生壓力與心理健康',text:'升學壓力讓許多學生情緒低落，輔導室呼籲增加心理支持。',opts:[O('add','增聘輔導人力與課程',W.M(g)*350000),O('talk','舉辦講座',W.M(g)*60000),O('no','不處理')],def:'talk',dl:8}),
  run:(g,s,x,k)=>{ if(k==='add'){ stMood(s,6); s.safeAdj+=2; s.trustAdj+=2; return '輔導資源到位，學生狀況好轉。'; } if(k==='talk'){ stMood(s,2); return '講座有幫助，但根本問題仍在。'; } stMood(s,-3); s.trustAdj-=1.5; return '學生壓力持續累積。'; }});
tpl('exchStu',{cat:'學生',w:.6,cd:200,cond:(g,s)=>g.world.intl>.3&&enr(s)>40,make:(g,s)=>({title:'海外交換學生計畫',text:'姊妹學制提出交換學生計畫，可提升國際化程度，但需籌措經費。',opts:[O('yes','參加（'+U.money(W.M(g)*300000)+'）',W.M(g)*300000),O('no','婉拒')],def:'no',dl:8}),
  run:(g,s,x,k)=>{ if(k==='yes'){ s.flags.exchange=(s.flags.exchange||0)+8; stSat(s,1); return '國際化程度逐步提升。'; } return ''; }});

// ---- 教學 ----
tpl('curReform',{cat:'教學',w:.8,cd:200,cond:(g,s)=>s.curr<70,make:(g,s)=>({title:'課程改革提案',text:`教務處提出課程改革方案（目前課程品質 ${Math.round(s.curr)}）。`,opts:[O('full','全面改革（'+U.money(W.M(g)*600000)+'）',W.M(g)*600000),O('pilot','試辦（'+U.money(W.M(g)*200000)+'）',W.M(g)*200000),O('no','暫緩')],def:'pilot',dl:8}),
  run:(g,s,x,k)=>{ if(k==='full'){ s.curr=Math.min(100,s.curr+10); stfSat(s,-3); Ev.delay(g,16,'curr',{sid:s.id,v:3}); return '全面改革完成，教師需要適應，長期效益可期。'; } if(k==='pilot'){ s.curr=Math.min(100,s.curr+4); return '試辦成效良好。'; } return ''; }});
tpl('compInv',{cat:'教學',w:1,cd:80,cond:(g,s)=>enr(s)>40&&!['kg'].includes(s.type),make:(g,s,x)=>{ const f=R.i(g,0,3); x.f=f; return {title:`${D.FIELDS[f]}競賽邀請`,text:`教育單位邀請本校參加${D.FIELDS[f]}競賽，優勝可提升聲望。`,opts:[O('go','報名參加（'+U.money(W.M(g)*70000)+'）',W.M(g)*70000),O('no','婉拒')],def:'no',dl:8}; },
  run:(g,s,x,k)=>{ if(k!=='go') return ''; return S.compete(g,s,x.f).msg||''; }});
tpl('grant',{cat:'教學',w:.9,cd:90,cond:(g,s)=>['un','gs','jc'].includes(s.type)&&s.staff.filter(x=>x.prof>65).length>1,make:(g,s,x)=>{ x.amt=Math.round(W.M(g)*(2e6+R.f(g)*5e6)); return {title:'研究計畫補助申請',text:`政府開放研究計畫申請，最高補助 ${U.money(x.amt)}。成功率取決於研究能力。`,opts:[O('go','提出申請（'+U.money(W.M(g)*120000)+'）',W.M(g)*120000),O('no','不申請')],def:'go',dl:8}; },
  run:(g,s,x,k)=>{ if(k!=='go') return ''; const p=.15+s.rep.research/160+(s.fac.research||0)*.1; if(R.chance(g,p)){ Ev.delay(g,10,'cash',{sid:s.id,amt:x.amt,acct:'rResearch',txt:'研究補助撥款'}); rep(s,'research',1.5); return '申請成功！補助款將於數週後撥入。'; } return '未獲通過。'; }});
tpl('tech',{cat:'社會',w:.7,cd:260,cond:(g,s)=>s.equip<75&&g.world.tech>10,make:(g,s)=>({title:'新教學科技出現',text:`新科技正改變教學現場，本校設備水準 ${Math.round(s.equip)}。是否導入？`,opts:[O('big','全面導入（'+U.money(W.M(g)*(s.students.length+30)*12000)+'）',W.M(g)*(s.students.length+30)*12000),O('small','小規模試辦（'+U.money(W.M(g)*(s.students.length+30)*4000)+'）',W.M(g)*(s.students.length+30)*4000),O('wait','觀望')],def:'small',dl:10}),
  run:(g,s,x,k)=>{ if(k==='big'){ s.equip=Math.min(100,s.equip+16); stfSat(s,-2); s.curr=Math.min(100,s.curr+2); return '設備大幅升級。'; } if(k==='small'){ s.equip=Math.min(100,s.equip+6); return '試辦成效不錯。'; } s.equip=Math.max(0,s.equip-1); return ''; }});
tpl('obsolete',{cat:'經營',w:1,cd:120,cond:(g,s)=>s.equip<28&&enr(s)>20,make:(g,s)=>({title:'教學設備老舊警示',text:`教學設備水準僅 ${Math.round(s.equip)}，影響教學品質與師生士氣。`,opts:[O('buy','緊急採購（'+U.money(W.M(g)*(s.students.length+30)*7000)+'）',W.M(g)*(s.students.length+30)*7000),O('late','延後')],def:'late',dl:8}),
  run:(g,s,x,k)=>{ if(k==='buy'){ const c=x.c.buy; L.buyAsset(g,s,'eqp','教學設備(緊急)',c,8,0,true); s.equip=Math.min(100,s.equip+18); return '設備更新完成。'; } stfSat(s,-2); return '設備繼續老化。'; }});

// ---- 家長 / 社會 ----
tpl('parentComp',{cat:'家長',w:1.2,cd:40,cond:(g,s)=>enr(s)>20,make:(g,s)=>({title:'家長投訴',text:`家長就成績評量與教師處理方式提出強烈申訴，要求校方給交代。家長信任度 ${Math.round(s.rep.trust)}。`,opts:[O('exp','公開說明並維持原判'),O('apol','私下致歉並補償（'+U.money(W.M(g)*60000)+'）',W.M(g)*60000),O('ign','不予回應')],def:'exp',dl:6}),
  run:(g,s,x,k)=>{ if(k==='apol'){ s.trustAdj+=2; return '家長情緒平復，讚許學校誠意。'; } if(k==='exp'){ if(R.chance(g,.5+s.rep.trust/200)){ s.trustAdj+=1; return '說明獲得多數家長理解。'; } s.trustAdj-=1.5; return '家長仍不滿意。'; } s.trustAdj-=3; return '家長在社群發文批評，信任下滑。'; }});
tpl('donOffer',{cat:'家長',w:.8,cd:140,cond:(g,s)=>enr(s)>30&&s.rep.trust>40,make:(g,s,x)=>{ x.amt=Math.round(W.M(g)*(6e5+R.f(g)*3e6)*g.regionRule.donate); return {title:'家長捐款提議',text:`一位家長願捐 ${U.money(x.amt)}，但希望子女獲得特別關照（升班/保送）。`,opts:[O('yes','接受'),O('no','婉拒，保持公正'),O('neg','洽談捐款不附帶條件')],def:'neg',dl:8}; },
  run:(g,s,x,k)=>{ if(k==='yes'){ Ev.delay(g,2,'cash',{sid:s.id,amt:x.amt,txt:'家長捐款'}); s.trustAdj-=3; return '收下捐款，但風聲外洩影響公信力。'; } if(k==='no'){ s.trustAdj+=2; return '堅守原則，贏得敬重。'; } if(R.chance(g,.5)){ Ev.delay(g,3,'cash',{sid:s.id,amt:x.amt*.6,txt:'家長捐款（無條件）'}); return '對方被說服，無條件捐贈。'; } return '洽談未果。'; }});
tpl('pta',{cat:'家長',w:.8,cd:100,cond:(g,s)=>enr(s)>40,make:(g,s)=>({title:'家長會提案',text:'家長會希望學校投入經費改善校園安全與接送動線。',opts:[O('yes','全力配合（'+U.money(W.M(g)*180000)+'）',W.M(g)*180000),O('part','部分配合'),O('no','婉拒')],def:'part',dl:8}),
  run:(g,s,x,k)=>{ if(k==='yes'){ s.trustAdj+=3; s.safeAdj+=2; return '家長會滿意，校園更安全。'; } if(k==='part'){ s.trustAdj+=1; return ''; } s.trustAdj-=1.5; return '家長會有怨言。'; }});
tpl('rumor',{cat:'家長',w:.7,cd:150,cond:(g,s)=>enr(s)>30&&(s.rep.ov>45||s.unrest>0),make:(g,s)=>({title:g.y>=2010?'網路謠言':'流言四起',text:g.y>=2010?'社群平台流傳不實指控，點閱量飆升。':'街談巷議流傳著對學校的不實傳言。',opts:[O('clar','主動澄清（'+U.money(W.M(g)*90000)+'）',W.M(g)*90000),O('sil','保持沉默')],def:'clar',dl:4}),
  run:(g,s,x,k)=>{ if(k==='clar'){ s.trustAdj+=.5; return '澄清奏效。'; } if(R.chance(g,.5)){ s.trustAdj-=4; s.rep.aw=Math.max(0,s.rep.aw-3); return '謠言擴散，聲譽受損。'; } return '謠言漸漸平息。'; }});
tpl('policyNote',{cat:'社會',w:0,make:(g,s,x)=>({title:'教育政策調整：'+x.t,text:x.x+' 請評估是否調整學費、招生或預算。',opts:[O('ack','了解，檢討策略'),O('adj','啟動配套（'+U.money(W.M(g)*100000)+'）',W.M(g)*100000)],def:'ack',dl:10,ctx:{noNeglect:1}}),
  run:(g,s,x,k)=>{ if(k==='adj'){ s.curr=Math.min(100,s.curr+2); s.trustAdj+=1; return '因應新政策完成配套。'; } return ''; }});
tpl('worldNote',{cat:'社會',w:0,make:(g,s,x)=>({title:'歷史事件：'+x.name,text:x.txt,opts:[O('ack','了解')],def:'ack',dl:6,ctx:{noNeglect:1}}),run:()=>''});

// ---- 經營 ----
tpl('audit',{cat:'經營',w:.9,cd:150,cond:(g,s)=>g.y>=1920&&enr(s)>20,make:(g,s,x)=>({title:'主管機關稽查',text:`主管機關將進行督導評鑑。督導強度 ${g.world.pol.strict.toFixed(2)}。若有違規（學費逾上限、班級過大、危樓）將受罰。`,opts:[O('co','積極配合並先自查（'+U.money(W.M(g)*100000)+'）',W.M(g)*100000),O('norm','照常接受')],def:'co',dl:6}),
  run:(g,s,x,k)=>{ let v=0; if(s.cfg.tuition>W.tuitionCap(g,s.type)*1.0001) v++; if(s.ratio>g.world.pol.classMax) v++; if(U.avg(s.bld,b=>b.dur)<40) v++; if(s.insW>0) v++;
    if(!v) { s.trustAdj+=1.5; return '評鑑通過，獲得肯定。'; } const fine=Math.round(W.M(g)*220000*v*g.world.pol.strict*(k==='co'?.45:1)); pay(s,fine); s.trustAdj-=v*(k==='co'?.8:2); return `發現 ${v} 項缺失，罰款 ${U.money(fine)}。`; }});
tpl('loanOffer',{cat:'經營',w:.7,cd:160,cond:(g,s)=>g.y>=1920&&L.creditLimit(g,s)>W.M(g)*3e6,make:(g,s,x)=>{ const lim=L.creditLimit(g,s); x.amt=Math.round(Math.min(lim*.6,W.M(g)*2e7)/1e5)*1e5; x.r=Math.max(.015,L.rate(g,s,'bank')-.01); return {title:'銀行優惠貸款方案',text:`銀行提供 ${U.money(x.amt)} 的優惠貸款（年利率 ${(x.r*100).toFixed(1)}%，5年期）。`,opts:[O('yes','承作'),O('no','婉拒')],def:'no',dl:8}; },
  run:(g,s,x,k)=>{ if(k==='yes'){ const ln=L.addLoan(g,s,x.amt,60,'bank'); if(ln) ln.r=x.r; return '貸款已撥入，請妥善規劃用途。'; } return ''; }});
tpl('bldDamage',{cat:'經營',w:1.1,cd:60,cond:(g,s)=>s.bld.some(b=>b.prog<=0&&b.dur<48),wf:(g,s)=>1+s.bld.filter(b=>b.dur<35).length,make:(g,s,x)=>{ const b=s.bld.filter(y=>y.prog<=0&&y.dur<48).sort((a,c)=>a.dur-c.dur)[0]; if(!b) return null; x.bid=b.id; const rc=S.repairCost(g,s,b,100-b.dur);
  return {title:`${D.BLD[b.t].n}結構損壞`,text:`${D.BLD[b.t].n}（耐久 ${Math.round(b.dur)}）出現漏水與裂縫，安全堪慮。`,opts:[O('fix','立即全面修繕（'+U.money(rc)+'）',rc),O('patch','臨時補強（'+U.money(rc*.35)+'）',rc*.35),O('close','封閉使用 8 週')],def:'patch',dl:4,urgent:true}; },
  run:(g,s,x,k)=>{ const b=s.bld.find(y=>y.id===x.bid); if(!b) return ''; if(k==='fix'){ b.dur=100; S.calc(g,s); return '修繕完成，狀況良好。'; } if(k==='patch'){ b.dur=Math.min(100,b.dur+18); if(R.chance(g,.2)){ s.safeAdj-=3; return '補強後仍發生小意外，安全疑慮浮現。'; } return '暫時穩住。'; } b.prog=8; S.calc(g,s); s.safeAdj+=1; return '建築封閉，容量暫時降低。'; }});
tpl('landSale',{cat:'經營',w:.5,cd:260,cond:(g,s)=>L.cash(s)>W.M(g)*1.2e7&&s.land.w*s.land.h<400,make:(g,s,x)=>{ const c=S.landCost(g,s,s.land.h)*.75; return {title:'鄰地出售',text:'鄰近土地業主願以優惠價出售，可擴張校地一整列。',opts:[O('buy','購買（'+U.money(c)+'）',c),O('no','錯過')],def:'no',dl:10}; },
  run:(g,s,x,k)=>{ if(k==='buy'){ const c=x.c.buy; L.buyAsset(g,s,'land','校地擴張(優惠)',c,0,0,true); s.land.w++; return '校地向東擴張一列。'; } return ''; }});

tpl('utility',{cat:'經營',w:.6,cd:250,cond:(g,s)=>g.world.cyc<.3,make:(g,s)=>({title:'能源價格飆升',text:'能源與物價上漲，校園營運成本增加。',opts:[O('eco','節能改造（'+U.money(W.M(g)*500000)+'）',W.M(g)*500000),O('abs','自行吸收（'+U.money(W.M(g)*220000)+'）',W.M(g)*220000)],def:'abs',dl:6}),
  run:(g,s,x,k)=>{ if(k==='eco'){ s.flags.eco=1; return '節能改造完成。'; } return ''; }});
tpl('rivalAd',{cat:'社會',w:.9,cd:120,cond:(g,s)=>g.rivals.some(r=>r.type===s.type&&r.status==='active'&&r.quality>s.quality),make:(g,s,x)=>{ const r=g.rivals.filter(y=>y.type===s.type&&y.status==='active').sort((a,b)=>b.quality-a.quality)[0]; x.rid=r.id; return {title:`${r.name}展開招生攻勢`,text:`競爭對手${r.name}（辦學品質 ${Math.round(r.quality)}）大幅投放宣傳並推出特色課程，本校報名可能受影響。`,opts:[O('ad','反擊宣傳（'+U.money(W.M(g)*400000)+'）',W.M(g)*400000),O('ign','專注辦學，不回應')],def:'ign',dl:6}; },
  run:(g,s,x,k)=>{ if(k==='ad'){ s.rep.aw=Math.min(100,s.rep.aw+4); return '知名度小幅提升。'; } s.rep.aw=Math.max(0,s.rep.aw-2.5); return '部分家長轉向對手。'; }});
tpl('budgetWarn',{cat:'經營',w:1.3,cd:60,cond:(g,s)=>L.cash(s)<W.M(g)*2e6&&s.last12rev>0&&L.cash(s)<s.last12rev*.05,make:(g,s)=>({title:'現金吃緊警示',text:`現金僅 ${U.money(L.cash(s))}，低於營收的 5%。總務處建議縮減非必要支出。`,opts:[O('cut','縮減宣傳/設備/培訓預算 30%'),O('loan','洽銀行借款（本次不借，改由您在財務中心操作）'),O('ign','維持現狀')],def:'ign',dl:6}),
  run:(g,s,x,k)=>{ if(k==='cut'){ s.cfg.mkt=Math.round(s.cfg.mkt*.7); s.cfg.eqp=Math.round(s.cfg.eqp*.7); s.cfg.trn=Math.round(s.cfg.trn*.7); return '已縮減預算。'; } return ''; }});
tpl('food',{cat:'學生',w:.5,cd:200,cond:(g,s)=>(s.fac.sup.canteen||0)>0,make:(g,s)=>({title:'餐廳食安疑慮',text:'部分學生用餐後身體不適，疑似食材保存不當。',opts:[O('full','停業整頓並公開檢驗（'+U.money(W.M(g)*150000)+'）',W.M(g)*150000),O('quiet','內部檢討')],def:'full',dl:3,urgent:true}),
  run:(g,s,x,k)=>{ if(k==='full'){ s.trustAdj+=1; s.safeAdj+=1; return '整頓後恢復信任。'; } if(R.chance(g,.45)){ s.trustAdj-=5; s.safeAdj-=3; return '再次發生，信任重創。'; } return '暫時無事。'; }});
tpl('disaster',{cat:'社會',w:.45,cd:200,cond:(g,s)=>g.y>=1900&&s.bld.length>0,make:(g,s,x)=>{ const k=R.pick(g,['颱風','地震','豪雨','寒流']); x.k=k; return {title:k+'侵襲',text:`${k}造成校舍受損，部分設施需要檢查修復。`,opts:[O('em','啟動緊急應變並全面檢修（'+U.money(W.M(g)*600000)+'）',W.M(g)*600000),O('min','基本處理（'+U.money(W.M(g)*180000)+'）',W.M(g)*180000)],def:'min',dl:3,urgent:true}; },
  run:(g,s,x,k)=>{ const dm=k==='em'?4:12; for(const b of s.bld) b.dur=Math.max(5,b.dur-R.f(g)*dm*(x.k==='地震'?1.5:1)); S.calc(g,s); s.safeAdj+=k==='em'?2:-1; return k==='em'?'損害輕微，師生安全無虞。':'部分建築受損較嚴重。'; }});
tpl('pandemic',{cat:'社會',w:0,make:(g,s)=>({title:'疫情停課決策',text:'疫情蔓延，主管機關開放學校自行決定停課或遠距教學。',opts:[O('remote','全面遠距教學（需設備）'),O('rot','分流上課'),O('keep','照常上課')],def:'rot',dl:2,urgent:true}),
  run:(g,s,x,k)=>{ const ok=s.equip>50; if(k==='remote'){ if(ok){ s.quality=Math.max(0,s.quality-2); s.safeAdj+=3; s.trustAdj+=1; return '遠距教學順利。'; } s.quality=Math.max(0,s.quality-8); stMood(s,-4); s.trustAdj-=2; return '設備不足，遠距教學品質低落。'; } if(k==='rot'){ s.safeAdj+=1.5; stMood(s,-1); return '分流上課平穩度過。'; } for(const st of s.students) st.hl=Math.max(10,st.hl-6); s.safeAdj-=4; s.trustAdj-=3; return '疫情在校園擴散。'; }});
tpl('conscript',{cat:'社會',w:0,make:(g,s)=>({title:'戰時徵召',text:'戰爭使教師與年長學生面臨徵召，校務運作困難。',opts:[O('def','申請緩召（'+U.money(W.M(g)*200000)+'）',W.M(g)*200000),O('acc','接受')],def:'def',dl:3,urgent:true}),
  run:(g,s,x,k)=>{ const n=Math.round(s.staff.filter(p=>p.role==='t'&&p.sx===0&&P.staffAge(g,p)<40).length*(k==='def'?.15:.45)); const lost=s.staff.filter(p=>p.role==='t'&&p.sx===0&&P.staffAge(g,p)<40).slice(0,n); for(const p of lost) P.leave(g,s,p,'quit'); stMood(s,-3); return `${lost.length} 位教師被徵召離校。`; }});

// ---- 特殊 ----
tpl('anniv',{cat:'特殊',w:0,make:(g,s,x)=>({title:`創校 ${x.n} 週年校慶`,text:'校慶將至，校友與社區都期待盛大活動。',opts:[O('big','盛大慶祝（'+U.money(W.M(g)*900000)+'）',W.M(g)*900000),O('mid','一般慶祝（'+U.money(W.M(g)*300000)+'）',W.M(g)*300000),O('low','簡約舉辦')],def:'mid',dl:6,ctx:{n:x.n}}),
  run:(g,s,x,k)=>{ const al=g.alumni.filter(a=>a.sid===s.id&&!a.dead).length; const f={big:1,mid:.5,low:0}[k]; stSat(s,f*5); s.trustAdj+=f*3; rep(s,'social',f*1.2); const amt=Math.round(W.M(g)*(al*1200+2e5)*f*g.regionRule.donate); if(amt>0) Ev.delay(g,3,'cash',{sid:s.id,amt,txt:'校慶募款'}); return `校慶${f>0?'圓滿成功':'低調舉行'}${amt>0?`，預計校友捐款約 ${U.money(amt)}`:''}。`; }});
tpl('alumVisit',{cat:'特殊',w:.8,cd:200,cond:(g,s)=>g.alumni.some(a=>a.sid===s.id&&a.nt&&!a.dead),make:(g,s,x)=>{ const a=R.pick(g,g.alumni.filter(y=>y.sid===s.id&&y.nt&&!y.dead)); x.aid=a.id; return {title:`知名校友${a.nm}返校`,text:`${a.nm}（${a.jb>=0?D.JOBS[a.jb]:''}，聲望 ${a.fame}）願意回校演講。`,opts:[O('talk','舉辦演講並邀請座談（'+U.money(W.M(g)*60000)+'）',W.M(g)*60000),O('vis','邀任客座教授（'+U.money(W.M(g)*200000)+'）',W.M(g)*200000),O('no','婉謝')],def:'talk',dl:8}; },
  run:(g,s,x,k)=>{ const a=P.find(g,x.aid); if(!a) return ''; if(k==='no') return ''; stMood(s,2); rep(s,'social',k==='vis'?1:.4); s.trustAdj+=1.5; P.alumLog(a,g,'返校'+(k==='vis'?'客座':'演講')); a.dn=Math.min(100,a.dn+10); if(R.chance(g,.45)){ const amt=Math.round(W.M(g)*(5e5+a.fame*2e4)); Ev.delay(g,6,'cash',{sid:s.id,amt,txt:`校友${a.nm}捐款`}); a.dd+=amt; return `${a.nm}深受感動，承諾捐款。`; } return '活動圓滿，學生深受啟發。'; }});
tpl('media',{cat:'特殊',w:.6,cd:200,cond:(g,s)=>s.rep.ov>55,make:(g,s)=>({title:'媒體專題報導',text:'媒體希望專訪學校的辦學特色，是難得的曝光機會，但也可能被放大檢視。',opts:[O('yes','接受專訪'),O('no','婉拒')],def:'yes',dl:6}),
  run:(g,s,x,k)=>{ if(k==='yes'){ if(R.chance(g,.3+s.rep.trust/200)){ s.rep.aw=Math.min(100,s.rep.aw+5); rep(s,'social',.8); return '報導正面，知名度大增。'; } s.trustAdj-=2; return '報導著重負面細節。'; } return ''; }});
tpl('sister',{cat:'特殊',w:.7,cd:160,cond:(g,s)=>g.rivals.some(r=>r.type===s.type&&r.status==='active'&&r.coop>50),make:(g,s,x)=>{ const r=R.pick(g,g.rivals.filter(y=>y.type===s.type&&y.status==='active'&&y.coop>50)); x.rid=r.id; return {title:`${r.name}提議結為姊妹校`,text:'對方希望建立長期教學交流。',opts:[O('yes','同意（'+U.money(W.M(g)*150000)+'）',W.M(g)*150000),O('no','婉拒')],def:'yes',dl:8}; },
  run:(g,s,x,k)=>{ if(k==='yes'){ const r=Rv.coopAct(g,s,x.rid,'exchange'); return r.msg; } return ''; }});
tpl('distMerge',{cat:'特殊',w:.8,cd:200,cond:(g,s)=>g.rivals.some(r=>r.status==='active'&&r.poor>6),make:(g,s,x)=>{ const r=g.rivals.filter(y=>y.status==='active'&&y.poor>6)[0]; x.rid=r.id; return {title:`${r.name}洽談出售`,text:`${D.TYPES[r.type].n}「${r.name}」財務困難，詢問是否有意收購。請至「教育集團」頁面評估收購。`,opts:[O('ack','了解')],def:'ack',dl:12,ctx:{noNeglect:1}}; },run:()=>''});
tpl('alumAssoc',{cat:'特殊',w:1,cd:2000,cond:(g,s)=>!s.flags.assoc&&g.alumni.filter(a=>a.sid===s.id).length>=60,make:(g,s)=>({title:'校友會籌組',text:'數位熱心校友希望成立校友會，協助募款、推薦學生並促進產學合作。',opts:[O('yes','全力支持（'+U.money(W.M(g)*200000)+'）',W.M(g)*200000),O('no','暫緩')],def:'yes',dl:10}),
  run:(g,s,x,k)=>{ if(k==='yes'){ s.flags.assoc=1; rep(s,'social',1); return '校友會成立，捐款與推薦管道打開。'; } return ''; }});
tpl('industry',{cat:'特殊',w:.9,cd:120,cond:(g,s)=>g.alumni.some(a=>a.sid===s.id&&a.co&&a.co.sz>=2&&!a.dead),make:(g,s,x)=>{ const a=R.pick(g,g.alumni.filter(y=>y.sid===s.id&&y.co&&y.co.sz>=2&&!y.dead)); x.aid=a.id; x.amt=Math.round(W.M(g)*(8e5*a.co.sz)); return {title:`校友企業「${a.co.nm}」提出產學合作`,text:`校友${a.nm}的企業願每年挹注 ${U.money(x.amt)} 進行實習與研發合作，為期 4 年。`,opts:[O('yes','簽約'),O('no','婉拒')],def:'yes',dl:8}; },
  run:(g,s,x,k)=>{ if(k!=='yes') return ''; g.contracts.push({sid:s.id,amt:x.amt,until:g.y+4,who:x.aid}); s.rep.outcome=Math.min(100,s.rep.outcome+.5); return '產學合作簽約，學生有更多實習機會。'; }});
tpl('fundDrive',{cat:'經營',w:.6,cd:200,cond:(g,s)=>g.alumni.filter(a=>a.sid===s.id).length>=30,make:(g,s)=>({title:'募款活動',text:'校友與家長期待參與募款，可補充教學設備或獎學金。',opts:[O('big','大型募款餐會（'+U.money(W.M(g)*220000)+'）',W.M(g)*220000),O('no','不辦')],def:'big',dl:8}),
  run:(g,s,x,k)=>{ if(k!=='big') return ''; const al=g.alumni.filter(a=>a.sid===s.id&&!a.dead); const amt=Math.round(U.sum(al,a=>a.dn*a.wl)/100*W.M(g)*220*g.regionRule.donate*(s.flags.assoc?1.5:1)); Ev.delay(g,4,'cash',{sid:s.id,amt,txt:'募款活動款項'}); return `預期可募得約 ${U.money(amt)}。`; }});
tpl('shortage',{cat:'學生',w:.6,cd:200,cond:(g,s)=>s.students.some(x=>x.fi<20&&x.ab>70),make:(g,s,x)=>{ const st=R.pick(g,s.students.filter(y=>y.fi<20&&y.ab>70)); x.sid2=st.id; return {title:`資優貧困生${st.nm}`,text:`${st.nm}（能力 ${st.ab}）家境清寒卻天資聰穎。`,opts:[O('sch','設立專案獎學金（'+U.money(s.cfg.tuition*2)+'）',s.cfg.tuition*2),O('no','不處理')],def:'sch',dl:8}; },
  run:(g,s,x,k)=>{ const st=s.students.find(y=>y.id===x.sid2); if(!st) return ''; if(k==='sch'){ st.sch=Math.round(s.cfg.tuition*2); st.mo=Math.min(100,st.mo+8); if(st.key) P.logOf(st,g,'獲得專案獎學金'); s.trustAdj+=1; return `${st.nm}不用再為學費煩惱。`; } return ''; }});
tpl('teacherTrain',{cat:'教學',w:.6,cd:150,cond:(g,s)=>S.teachers(s).length>6&&s.curr<65,make:(g,s)=>({title:'教師研習邀約',text:'教育單位開辦新課程研習，邀請本校教師參加。',opts:[O('all','全員參加（'+U.money(W.M(g)*S.teachers(s).length*30000)+'）',W.M(g)*S.teachers(s).length*30000),O('half','選派代表'),O('no','婉拒')],def:'half',dl:8}),
  run:(g,s,x,k)=>{ if(k==='all'){ s.curr=Math.min(100,s.curr+3); for(const p of S.teachers(s)) p.teach=Math.min(99,p.teach+(R.chance(g,.5)?1:0)); stfSat(s,1.5); return '研習收穫豐富。'; } if(k==='half'){ s.curr=Math.min(100,s.curr+1); return ''; } return ''; }});
})(typeof window!=='undefined'?window:globalThis);
