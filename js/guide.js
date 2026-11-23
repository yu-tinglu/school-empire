/* 玩法引導：目標、下一步、週報、飄字、成就、名詞說明 */
(function(root){ const SE=root.SE, UI=SE.UI, L=SE.L, esc=UI.esc||(x=>String(x).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])));
const G={};
const ST=[
 {n:'站穩腳跟',goals:[
  {t:'聘請 3 位老師',ok:(g,s)=>s.staff.length>=3,p:(g,s)=>s.staff.length+'/3',go:'staff',h:'到「應徵履歷」挑人，按錄取。'},
  {t:'學生達 60 人',ok:(g,s)=>s.students.length>=60,p:(g,s)=>s.students.length+'/60',go:'admit',h:'到「招生入學」調整名額與宣傳。'},
  {t:'現金保持為正',ok:(g,s)=>L.cash(s)>0&&s.insW===0,p:(g,s)=>L.cash(s)>0?'OK':'赤字',go:'finance',h:'到「財務中心」看收支。'}]},
 {n:'穩定成長',goals:[
  {t:'聘請 10 位老師',ok:(g,s)=>s.staff.length>=10,p:(g,s)=>s.staff.length+'/10',go:'staff',h:'師生比會影響教學品質。'},
  {t:'學生達 150 人',ok:(g,s)=>s.students.length>=150,p:(g,s)=>s.students.length+'/150',go:'admit',h:'人多要記得蓋教室。'},
  {t:'聲望達 40',ok:(g,s)=>s.rep.ov>=40,p:(g,s)=>s.rep.ov.toFixed(0)+'/40',go:'academics',h:'教學品質與活動能提高聲望。'}]},
 {n:'聲名鵲起',goals:[
  {t:'聲望達 60',ok:(g,s)=>s.rep.ov>=60,p:(g,s)=>s.rep.ov.toFixed(0)+'/60',go:'academics',h:'持續經營教務與校風。'},
  {t:'學生達 400 人',ok:(g,s)=>s.students.length>=400,p:(g,s)=>s.students.length+'/400',go:'admit',h:'擴建校舍。'},
  {t:'財務風險為「低」',ok:(g,s)=>L.risk(g,s)<1,p:(g,s)=>L.risk(g,s)<1?'低':'偏高',go:'finance',h:'存下現金緩衝。'}]},
 {n:'百年名校',goals:[
  {t:'聲望達 85',ok:(g,s)=>s.rep.ov>=85,p:(g,s)=>s.rep.ov.toFixed(0)+'/85',go:'academics',h:'最後的衝刺。'},
  {t:'學生達 1000 人',ok:(g,s)=>s.students.length>=1000,p:(g,s)=>s.students.length+'/1000',go:'build',h:'需要大型校舍與多所學校。'}]}];
G.PREMISE='把一所破舊的學校，經營成百年名校';
G.key=g=>'se_guide_'+(g.group&&g.group.name||'x');
G.done=g=>{ try{ return JSON.parse(localStorage.getItem(G.key(g))||'{}'); }catch(e){ return {}; } };
G.save=(g,d)=>{ try{ localStorage.setItem(G.key(g),JSON.stringify(d)); }catch(e){} };
G.stage=(g,s)=>{ for(let i=0;i<ST.length;i++) if(!ST[i].goals.every(x=>x.ok(g,s))) return i; return ST.length; };
G.todos=(g,s)=>{ const a=[]; const pend=(g.events.pending||[]).length; const need=Math.ceil(s.cap.staff*.9);
  if(s.insW>0||L.cash(s)<0) a.push({u:3,t:'現金危急',h:'先處理財務：提高學費、借款或縮減預算。',go:'finance',b:'前往財務'});
  if(pend) a.push({u:3,t:pend+' 件公文待處理',h:'不處理會自動採用預設選項。',go:'events',b:'查看公文'});
  if((s.cands||[]).length&&SE.S.fte(s)<need) a.push({u:2,t:(s.cands.length)+' 份履歷待看',h:'老師不足，快錄取人才。',go:'staff',b:'看履歷'});
  else if(SE.S.fte(s)<need*.85) a.push({u:2,t:'教師不足',h:'到招募刊登職缺。',go:'staff',b:'前往招募'});
  if(s.ratio>1.05) a.push({u:2,t:'校舍擠爆',h:'蓋教室或降低招生名額。',go:'build',b:'前往建設'});
  return a.sort((x,y)=>y.u-x.u); };
G.next=(g,s)=>{ const td=G.todos(g,s); if(td.length) return td[0]; const st=G.stage(g,s); if(st>=ST.length) return {t:'你已是百年名校！',h:'繼續經營，或開設第二所學校。',go:'group',b:'集團'}; const gl=ST[st].goals.find(x=>!x.ok(g,s)); return {t:'目標：'+gl.t,h:gl.h+'　沒事就按「推進1週」。',go:gl.go,b:'前往'}; };
G.card=(g,s)=>{ const st=G.stage(g,s), n=G.next(g,s);
  const goals=st<ST.length?ST[st].goals.map(x=>`<div class="gl ${x.ok(g,s)?'ok':''}"><span>${x.ok(g,s)?'✅':'⬜'} ${esc(x.t)}</span><small>${esc(x.p(g,s))}</small></div>`).join(''):'<div class="gl ok">🏆 全部階段完成</div>';
  return `<div class="gprem">🏫 終極目標：${esc(G.PREMISE)}</div><div class="gcard"><div class="gnext"><small>現在最該做的事</small><b>${esc(n.t)}</b><span>${esc(n.h)}</span><button class="btn gold sm" data-act="go" data-k="${n.go}">${esc(n.b)} ›</button></div>
  <div class="gstage"><small>階段 ${Math.min(st+1,ST.length)}／${ST.length}：${esc(ST[Math.min(st,ST.length-1)].n)}</small>${goals}</div>
  ${UI.lastReport?`<details class="grep"><summary>上次推進回顧</summary>${UI.lastReport}</details>`:''}</div>`; };
/* 成就慶祝 */
G.check=()=>{ const g=UI.g,s=UI.cur&&UI.cur(); if(!g||!s) return; const d=G.done(g); let nw=[];
  ST.forEach((st,i)=>st.goals.forEach((x,j)=>{ const k=i+'.'+j; if(x.ok(g,s)&&!d[k]){ d[k]=1; nw.push(x.t); } }));
  if(nw.length){ G.save(g,d); if(Object.keys(d).length>nw.length||d.seen){ G.celebrate(nw); } else { /* 第一次載入：不補放煙火 */ } } };
G.celebrate=(nw)=>{ UI.toast('🎉 目標達成：'+nw.join('、')); const el=document.createElement('div'); el.className='confetti'; el.innerHTML=Array.from({length:24},(_,i)=>`<i style="left:${Math.random()*100}%;animation-delay:${Math.random()*.6}s;background:hsl(${i*37%360},80%,60%)"></i>`).join(''); document.body.appendChild(el); setTimeout(()=>el.remove(),2500); };
/* 週報與飄字 */
G.snap=(g,s)=>s?{c:L.cash(s),n:s.students.length,t:s.staff.length,r:s.rep.ov,sid:s.id}:null;
G.diff=(a,b,wk)=>{ if(!a||!b||a.sid!==b.sid) return null; const m=SE.UI.$m||(x=>x); const dc=b.c-a.c;
  const row=(l,d,fmt,inv)=>d===0?'':`<div class="rr ${(d>0)!==!!inv?'up':'dn'}"><span>${l}</span><b>${d>0?'▲ +':'▼ '}${fmt(d)}</b></div>`;
  const items=[row('現金',dc,x=>m(x)),row('學生',b.n-a.n,x=>x),row('教職員',b.t-a.t,x=>x),row('聲望',+(b.r-a.r).toFixed(1),x=>x)].filter(Boolean);
  return {items,float:[dc?[(dc>0?'+':'')+m(dc),dc>0]:null,b.n-a.n?[(b.n>a.n?'+':'')+(b.n-a.n)+' 學生',b.n>a.n]:null,Math.abs(b.r-a.r)>=.5?[(b.r>a.r?'+':'')+(b.r-a.r).toFixed(1)+' 聲望',b.r>a.r]:null].filter(Boolean)}; };
G.floatUp=(arr)=>{ arr.forEach(([t,up],i)=>{ const e=document.createElement('div'); e.className='fl '+(up?'up':'dn'); e.textContent=t; e.style.animationDelay=(i*.25)+'s'; document.body.appendChild(e); setTimeout(()=>e.remove(),2600); }); };
const adv0=UI.advance;
UI.advance=async function(weeks,opt){ const g0=UI.g; if(!g0||UI.busy) return adv0.apply(this,arguments); const a=G.snap(g0,UI.cur&&UI.cur()); const lab=SE.CAL.label(g0.y,g0.w);
  const r=await adv0.apply(this,arguments); try{ const g=UI.g,b=G.snap(g,UI.cur&&UI.cur()); const d=G.diff(a,b,weeks);
    if(d){ UI.lastReport=`<div class="mut sm">${esc(lab)} → ${esc(SE.CAL.label(g.y,g.w))}（${weeks} 週）</div>`+(d.items.join('')||'<div class="mut sm">沒有明顯變化</div>'); G.floatUp(d.float); UI.render(); }
    G.check(); }catch(e){ console.warn(e); } return r; };
/* 渲染後處理：待辦徽章、? 說明 */
const r0=UI.render;
UI.render=function(){ const out=r0.apply(this,arguments); try{ const g=UI.g,s=UI.cur&&UI.cur(); if(g&&s){ const n=G.todos(g,s).length; document.querySelectorAll('.tbtn.go[data-act="adv"]').forEach(b=>{ if(n){ b.classList.add('todo'); if(!b.dataset.n) b.dataset.n=n; b.dataset.n=n; } else { b.classList.remove('todo'); b.removeAttribute('data-n'); } });
    document.querySelectorAll('.gauges .gg .l').forEach(l=>{ const t=l.textContent; const k={'財務風險':'risk','學生':'stu','教職員':'fte','聲望':'rep','現金':'cash'}[t]; if(k&&!l.querySelector('.q')) l.insertAdjacentHTML('beforeend',`<i class="q" data-act="gloss" data-k="${k}">?</i>`); }); }
  if(UI.g&&!G.premised){ G.premised=true; const d=G.done(UI.g); if(!d.seen){ d.seen=1; ST.forEach((st,i)=>st.goals.forEach((x,j)=>{ if(x.ok(UI.g,UI.cur())) d[i+'.'+j]=1; })); G.save(UI.g,d); setTimeout(()=>{ if(!document.getElementById('modal')) UI.modal(`<h3>🏫 ${esc(G.PREMISE)}</h3><p>你是新任校長。每「推進1週」，時間就往前走，學生入學、老師領薪、事件發生。</p><p><b>三步開始：</b><br>① 辦公室「應徵履歷」錄取老師<br>② 「招生入學」招到學生<br>③ 看著現金，別讓它變負數</p><p class="mut sm">辦公室最上方永遠會告訴你「現在最該做的事」。</p><button class="btn gold" data-act="closeModal">開始經營</button>`); },600); } } }catch(e){ console.warn(e); } return out; };
const GL={risk:['財務風險','現金不夠付薪水與開銷的程度。「高」代表快周轉不靈，連續積欠 34 週會被清算。'],stu:['學生數／容量','目前在校學生數與校舍可容納座位。超過 100% 會擁擠、品質下滑。'],fte:['教職員（FTE）','FTE 是「全職人力當量」，兩位半職老師約等於 1.0。師生比不足會拉低教學品質。'],rep:['聲望','影響招生與學費。教學品質、成績、活動與口碑會慢慢累積。'],cash:['現金','校內可用的錢。每週收學費、付薪水與維護。']};
UI.act.gloss=d=>{ const x=GL[d.k]; if(x) UI.modal(`<h3>${x[0]}</h3><p>${x[1]}</p><button class="btn gold" data-act="closeModal">知道了</button>`); };
UI.act.goals=()=>{ const g=UI.g,s=UI.cur(); UI.modal(`<h3>目標</h3>${G.card(g,s)}<button class="btn ghost" data-act="closeModal">關閉</button>`); };
SE.guide=G;
/* 辦公室：把引導卡放在最上方 */
const o0=UI.screens.office; UI.screens.office=(g,s)=>G.card(g,s)+o0(g,s);
})(typeof window!=='undefined'?window:globalThis);
