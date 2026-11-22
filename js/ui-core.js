(function(root){
'use strict';
const SE=root.SE, {E,S,L,P,G,W,D,U,R,Save,Ev,Rv,AI,CAL}=SE;
const UI=SE.UI={g:null,screen:'home',sub:{},sel:{},autosave:true,busy:false,act:{},chg:{},screens:{},ents:'cur'};
const $=(s,r)=>(r||document).querySelector(s);
UI.$=$;
UI.esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const esc=UI.esc;
UI.visited=UI.visited||new Set(); UI.did=UI.did||new Set(); UI.sub=UI.sub||{};
UI.cur=()=>UI.g&&E.cur(UI.g);
const $m=x=>U.money(x), $n=x=>U.num(x);
UI.$m=$m; UI.$n=$n;
UI.sg=(v)=>v>0?'pos':v<0?'neg':'';
UI.bar=(v,cls)=>`<div class="bar ${cls||''}"><i style="width:${U.clamp(v,0,100)}%"></i></div>`;
UI.kv=(a,b,cls)=>`<div class="kv"><span>${a}</span><b class="${cls||''}">${b}</b></div>`;
UI.card=(t,body,extra)=>`<div class="card" ${extra||''}>${t?`<h3>${t}</h3>`:''}${body}</div>`;
UI.tabs=(key,list,cur)=>`<div class="tabs">${list.map(([k,n])=>`<a data-act="tab" data-k="${key}" data-v="${k}" class="${k===cur?'on':''}">${n}</a>`).join('')}</div>`;
UI.tab=(key,def)=>UI.sub[key]||def;
UI.table=(head,rows,o)=>{ o=o||{}; return `<div class="scroll"><table><thead><tr>${head.map(h=>`<th class="${h[1]||''}">${h[0]||h}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr class="${r.cls||''}" ${r.attr||''}>${r.c.map((c,i)=>`<td class="${(head[i]&&head[i][1])||''}">${c}</td>`).join('')}</tr>`).join('')||`<tr><td colspan="${head.length}" class="empty">${o.empty||'（無資料）'}</td></tr>`}</tbody></table></div>`; };
UI.stars=(v)=>v>=80?'S':v>=65?'A':v>=50?'B':v>=35?'C':'D';
UI.pctc=v=>v>=65?'pos':v<35?'neg':'';

/* ---------- 圖表 ---------- */
const PAL=['#1f3d2f','#c9a24b','#a8442f','#3f7a4f','#6b4226','#5c7d94','#8a6aa0'];
UI.line=(labels,series,o)=>{ o=o||{}; const W_=600,H=o.h||200,pl=48,pr=10,pt=10,pb=24; const all=series.flatMap(s=>s.v).filter(x=>isFinite(x)); if(!all.length||labels.length<2) return '<div class="empty">資料不足（需要至少兩年紀錄）</div>';
  let mn=o.min!==undefined?o.min:Math.min(0,...all), mx=o.max!==undefined?o.max:Math.max(...all); if(mx===mn) mx=mn+1; const n=labels.length; const X=i=>pl+(W_-pl-pr)*i/(n-1), Y=v=>pt+(H-pt-pb)*(1-(v-mn)/(mx-mn)); const fm=o.fmt||(v=>Math.abs(v)>=1e8?(v/1e8).toFixed(1)+'億':Math.abs(v)>=1e4?(v/1e4).toFixed(0)+'萬':v.toFixed(0));
  let s=`<svg class="ch" viewBox="0 0 ${W_} ${H}" role="img">`; for(let k=0;k<=4;k++){ const v=mn+(mx-mn)*k/4,y=Y(v); s+=`<line x1="${pl}" x2="${W_-pr}" y1="${y}" y2="${y}" stroke="#d9ccaa" stroke-dasharray="3 3"/><text x="${pl-4}" y="${y+4}" text-anchor="end">${fm(v)}</text>`; }
  const st=Math.ceil(n/8); labels.forEach((l,i)=>{ if(i%st===0||i===n-1) s+=`<text x="${X(i)}" y="${H-6}" text-anchor="middle">${l}</text>`; });
  if(mn<0&&mx>0) s+=`<line x1="${pl}" x2="${W_-pr}" y1="${Y(0)}" y2="${Y(0)}" stroke="#6b4226"/>`;
  series.forEach((se,k)=>{ const c=se.c||PAL[k%PAL.length]; const pts=se.v.map((v,i)=>isFinite(v)?`${X(i).toFixed(1)},${Y(v).toFixed(1)}`:null).filter(Boolean).join(' '); s+=`<polyline fill="none" stroke="${c}" stroke-width="2.2" stroke-linejoin="round" points="${pts}"/>`; });
  s+='</svg>'; if(series.length>1||series[0].n) s+=`<div class="legend">${series.map((se,k)=>`<span><i style="background:${se.c||PAL[k%PAL.length]}"></i>${se.n}</span>`).join('')}</div>`; return s; };
UI.bars=(items,o)=>{ o=o||{}; const mx=Math.max(1,...items.map(i=>Math.abs(i.v))); return items.map(i=>`<div class="row" style="flex-wrap:nowrap;margin:3px 0"><span class="sm" style="width:6.5em;flex:none">${i.n}</span><div class="bar ${i.v<0?'r':''}" style="flex:1"><i style="width:${Math.abs(i.v)/mx*100}%;${i.c?'background:'+i.c:''}"></i></div><span class="sm" style="width:5.5em;text-align:right;flex:none">${o.fmt?o.fmt(i.v):i.v.toFixed(0)}</span></div>`).join(''); };
UI.cols=(labels,series,o)=>{ o=o||{}; const W_=600,H=o.h||180,pl=48,pr=6,pt=8,pb=22; const all=series.flatMap(s=>s.v); if(!all.length) return '<div class="empty">資料不足</div>'; const mn=Math.min(0,...all),mx=Math.max(1,...all); const n=labels.length,k=series.length,bw=(W_-pl-pr)/n; const Y=v=>pt+(H-pt-pb)*(1-(v-mn)/(mx-mn)); const fm=o.fmt||(v=>Math.abs(v)>=1e8?(v/1e8).toFixed(1)+'億':Math.abs(v)>=1e4?(v/1e4).toFixed(0)+'萬':v.toFixed(0));
  let s=`<svg class="ch" viewBox="0 0 ${W_} ${H}">`; for(let q=0;q<=3;q++){ const v=mn+(mx-mn)*q/3; s+=`<line x1="${pl}" x2="${W_-pr}" y1="${Y(v)}" y2="${Y(v)}" stroke="#d9ccaa" stroke-dasharray="3 3"/><text x="${pl-4}" y="${Y(v)+4}" text-anchor="end">${fm(v)}</text>`; }
  const st=Math.ceil(n/9); series.forEach((se,j)=>se.v.forEach((v,i)=>{ const x=pl+i*bw+bw*.12+j*(bw*.76/k),w=bw*.76/k; s+=`<rect x="${x}" y="${Math.min(Y(v),Y(0))}" width="${w}" height="${Math.abs(Y(v)-Y(0))}" fill="${v<0?'#a8442f':(se.c||PAL[j])}" rx="1.5"/>`; })); labels.forEach((l,i)=>{ if(i%st===0) s+=`<text x="${pl+i*bw+bw/2}" y="${H-6}" text-anchor="middle">${l}</text>`; }); return s+'</svg>'; };
UI.radar=(vals,labels)=>{ const n=vals.length,c=110,r=80; const P_=(i,v)=>{ const a=-Math.PI/2+2*Math.PI*i/n; return [c+Math.cos(a)*r*v/100,c+Math.sin(a)*r*v/100+6]; }; let s='<svg class="ch" viewBox="0 0 220 230" style="max-width:300px;margin:auto">'; for(const f of [25,50,75,100]) s+=`<polygon fill="none" stroke="#d9ccaa" points="${vals.map((_,i)=>P_(i,f).join(',')).join(' ')}"/>`;
  s+=`<polygon fill="rgba(201,162,75,.45)" stroke="#6b4226" stroke-width="2" points="${vals.map((v,i)=>P_(i,U.clamp(v,0,100)).join(',')).join(' ')}"/>`; labels.forEach((l,i)=>{ const [x,y]=P_(i,122); s+=`<text x="${x}" y="${y+3}" text-anchor="middle" style="font-size:10px">${l}</text>`; }); return s+'</svg>'; };

/* ---------- 對話框 / 提示 ---------- */
UI.modal=(html,cls)=>{ UI.closeModal(); const d=document.createElement('div'); d.className='modal'; d.id='modal'; d.innerHTML=`<div class="box ${cls||''}">${html}</div>`; d.addEventListener('click',e=>{ if(e.target===d&&!d.dataset.lock) UI.closeModal(); }); document.body.appendChild(d); return d; };
UI.closeModal=()=>{ const m=$('#modal'); if(m) m.remove(); };
UI.toast=(t,bad)=>{ const d=document.createElement('div'); d.className='toast'+(bad?' bad':''); d.textContent=t; document.body.appendChild(d); setTimeout(()=>d.remove(),bad?4200:3000); };
UI.res=(r,keep)=>{ if(r&&r.msg) UI.toast(r.msg,r.ok===false); if(!keep){ UI.render(); } return r; };
UI.confirm=(msg,fn)=>{ const d=UI.modal(`<p>${esc(msg)}</p><div class="row sp"><button class="btn ghost" data-act="closeModal">取消</button><button class="btn gold" id="cfm">確定</button></div>`); $('#cfm',d).onclick=()=>{ UI.closeModal(); fn(); }; };
UI.prompt=(msg,def,fn)=>{ const d=UI.modal(`<p>${esc(msg)}</p><input id="pv" value="${esc(def)}" style="width:100%"><div class="row sp" style="margin-top:10px"><button class="btn ghost" data-act="closeModal">取消</button><button class="btn gold" id="cfm">確定</button></div>`); const i=$('#pv',d); i.focus(); $('#cfm',d).onclick=()=>{ const v=i.value; UI.closeModal(); fn(v); }; };

/* ---------- 導覽 ---------- */
UI.IC={office:'<path d="M3 20h18M5 20V9l7-5 7 5v11M9 20v-6h6v6M9 11h.01M15 11h.01"/>',campus:'<path d="M3 21h18M5 21V10l7-6 7 6v11M9 21v-5h6v5M3 10h18"/>',finance:'<circle cx="12" cy="12" r="8"/><path d="M12 7v10M9.5 9.5c0-1 1-1.6 2.5-1.6s2.5.6 2.5 1.6-1 1.5-2.5 1.9-2.5.9-2.5 1.9 1 1.6 2.5 1.6 2.5-.6 2.5-1.6"/>',admit:'<path d="M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h7M9 9h3"/>',academics:'<path d="M3 6c3-1.5 6-1.5 9 1 3-2.5 6-2.5 9-1v13c-3-1.5-6-1.5-9 1-3-2.5-6-2.5-9-1zM12 7v13"/>',students:'<path d="M2 9l10-5 10 5-10 5zM6 11v5c3 2.5 9 2.5 12 0v-5M22 9v6"/>',staff:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.5 3.5-7 8-7s8 2.5 8 7"/>',build:'<path d="M14 7l3-3 3 3-3 3M3 21l10-10M11 5l8 8M4 17l3 3"/>',rel:'<circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="8" r="2.5"/><circle cx="12" cy="18" r="2.5"/><path d="M8 7l8 1M7 8l4 8M17 10l-4 6"/>',events:'<path d="M4 6h16v12H4zM4 7l8 6 8-6"/>',rivals:'<path d="M5 20l7-16 7 16M8 14h8"/>',group:'<path d="M3 21V9l5-3v15M8 21V4l6-2v19M14 21V10l7 2v9M11 8h.01M11 12h.01M11 16h.01"/>',world:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',alumni:'<circle cx="12" cy="9" r="5"/><path d="M8.5 13.5L7 21l5-3 5 3-1.5-7.5"/>',history:'<path d="M4 4h12a3 3 0 013 3v13H7a3 3 0 01-3-3zM8 8h7M8 12h7"/>',stats:'<path d="M4 20V4M4 20h16M8 16v-5M12 16V8M16 16v-8"/>',saves:'<path d="M5 3h12l3 3v15H5zM8 3v6h8V3M8 21v-7h8v7"/>',coin:'<circle cx="12" cy="12" r="8"/><path d="M12 7v10M9.5 10c0-1 1-1.6 2.5-1.6s2.5.6 2.5 1.6-1 1.5-2.5 1.9-2.5.9-2.5 1.9"/>',people:'<circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-4 3-6 7-6s7 2 7 6M16 4.5a3.5 3.5 0 010 7M18 14c2.5.5 4 2.5 4 6"/>',star:'<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',shield:'<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',crest:'<path d="M12 2l8 3v7c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V5zM8 10l4-3 4 3M9 10v5M12 10v5M15 10v5"/>'};
UI.ic=(k,w)=>`<svg viewBox="0 0 24 24" width="${w||20}" height="${w||20}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${UI.IC[k]||''}</svg>`;
UI.NAVG=[['校長室',[['office','校長辦公室']]],['校務管理',[['finance','財務中心'],['admit','招生入學'],['academics','教務課程'],['staff','教職員']]],['人物與校園',[['campus','校園總覽'],['build','校園建設'],['students','學生'],['rel','人物關係'],['alumni','校友']]],['經營與發展',[['events','校園事件'],['rivals','競爭學校'],['group','教育集團']]],['世界與歷史',[['world','世界與政策'],['history','校史年鑑'],['stats','統計圖表'],['saves','存檔管理'],['artdemo','美術示範']]]];
UI.NAV=UI.NAVG.flatMap(g=>g[1].map(([k,n])=>[k,n]));
UI.navShut=UI.navShut||{};
UI.MOBILE=['office','campus','finance','events'];
UI.go=(name,sub)=>{ UI.screen=name; UI.visited.add(name); if(sub) Object.assign(UI.sub,sub); UI.closeModal(); UI.render(); window.scrollTo(0,0); };
UI.pending=()=>UI.g?UI.g.events.pending.length:0;

function header(){ const g=UI.g,s=UI.cur(); if(!s) return `<div class="top"><div class="r1"><span class="tname">${esc(g.group.name)}</span><span class="pill" style="background:#f2d6cd">事業已破產</span></div></div>`;
  const cash=L.cash(s), risk=L.risk(g,s); const w=g.w; const se=w>=4&&w<=13?'🌸':w>=14&&w<=35?'☀️':w>=36&&w<=48?'🍂':'❄️';
  const opts=g.schools.map(x=>`<option value="${x.id}" ${x.id===s.id?'selected':''}>${esc(x.name)}（${D.TYPES[x.type].n}）</option>`).join('');
  const tags=(CAL.tags(g.w)||[]).map(t=>`<span class="pill">${t}</span>`).join('');
  const gg=(ic,v,l,bad)=>`<div class="gg ${bad?'bad':''}">${UI.ic(ic,20)}<div><div class="v">${v}</div><div class="l">${l}</div></div></div>`;
  const rk=['低','中','高','極高'][Math.min(3,risk)]||risk;
  return `<header class="top"><div class="r1"><button class="tbtn out menu-btn" data-act="more" aria-label="選單">${UI.ic('menu',18)}</button><span class="tname">${g.schools.length>1?`<select data-chg="school">${opts}</select>`:esc(s.name)}</span><span class="tdate">${se} ${CAL.label(g.y,g.w)} ${tags}</span></div>
  <div class="gauges">${gg('coin',$m(cash),'現金',cash<0)}${gg('people',s.students.length+'<small style="font-weight:400;color:var(--gray)">/'+s.cap.seats+'</small>','學生')}${gg('staff',s.staff.length,'教職員')}${gg('star',s.rep.ov.toFixed(0),'聲望')}${gg('shield',s.insW>0?'積欠'+s.insW+'週':rk,'財務風險',risk>=2||s.insW>0)}</div>
  <div class="tc"><button class="tbtn go" data-act="adv" data-w="1">▶ 推進1週</button><button class="tbtn" data-act="adv" data-w="4">1月</button><button class="tbtn" data-act="adv" data-w="${semWeeks()}">1學期</button><button class="tbtn" data-act="adv" data-w="52">1年</button><button class="tbtn out" data-act="advTo">指定日期…</button></div></header>`; }
function semWeeks(){ const g=UI.g,w=g.w; const t=w<4?4-w:w<36?36-w:52-w+4; return Math.max(1,t); }

UI.render=()=>{ const app=$('#app');
  if(UI.screen==='setup'){ UI.screens.setup(app); return; }
  if(!UI.g||UI.screen==='home'){ UI.screens.home(app); return; }
  const g=UI.g, pc=UI.pending();
  const nav=UI.NAVG.map(([gn,items])=>`<div class="ng ${UI.navShut[gn]?'shut':''}"><div class="gh" data-act="navTog" data-g="${gn}">${gn}</div><div class="gi">${items.map(([k,n])=>`<a class="nv ${UI.screen===k?'on':''}" data-act="go" data-k="${k}">${UI.ic(k,18)} ${n}${k==='events'&&pc?`<span class="bd">${pc}</span>`:''}</a>`).join('')}</div></div>`).join('');
  const nameOf=k=>(UI.NAV.find(n=>n[0]===k)||[])[1];
  const bt=UI.MOBILE.map(k=>`<a data-act="go" data-k="${k}" class="${UI.screen===k?'on':''}">${UI.ic(k,22)}${k==='office'?'辦公室':nameOf(k)}${k==='events'&&pc?`<span class="bd">${pc}</span>`:''}</a>`).join('')+`<a data-act="more" class="${UI.MOBILE.includes(UI.screen)?'':'on'}">${UI.ic('menu',22)}選單</a>`;
  const f=UI.screens[UI.screen]; const scrollY=window.scrollY;
  app.innerHTML=`<div class="app"><nav class="side"><div class="brand">${UI.ic('crest',34)}<div><b>School Empire</b><small>學校模擬器</small></div></div>${nav}</nav><div class="main">${header()}<div class="content th-${UI.screen}" id="content">${UI.pageHead(UI.screen)}${f?f(g,UI.cur()):'<div class="empty">此畫面尚未建置</div>'}</div></div></div><div class="fab"><button class="tbtn go" data-act="adv" data-w="1">▶ 1週</button><button class="tbtn" data-act="adv" data-w="4">1月</button></div><nav class="btm">${bt}</nav>`;
  const af=UI.after&&UI.after[UI.screen]; if(af) af(g,UI.cur()); window.scrollTo(0,scrollY); };
UI.act.navTog=d=>{ UI.navShut[d.g]=!UI.navShut[d.g]; UI.render(); };
UI.after={};
UI.BANNER={office:['校長辦公室','今天也有許多文件等你批閱'],campus:['校園總覽','今天的校園，由你守護'],finance:['財務中心','每一分錢都要記上帳'],admit:['招生入學','好學生不會自己走進來'],academics:['教務課程','理念決定學校的樣子'],students:['學生檔案室','每個名字背後都有故事'],staff:['教職員','學校就是人'],build:['校園建設','一磚一瓦，一屆一屆'],rel:['人物關係','誰和誰是朋友，誰和誰不對盤'],events:['校園事件','信件與公告，等你裁示'],rivals:['競爭學校','知己知彼'],group:['教育集團','從一所學校到教育帝國'],world:['世界與政策','學校逃不開時代'],alumni:['校友','他們會回來，或帶孩子回來'],history:['校史年鑑','一屆一屆的故事'],stats:['統計圖表','數字不會說謊'],saves:['存檔管理','妥善保管']};
UI.pageHead=k=>{ const b=UI.BANNER[k]; if(!b) return ''; const w=UI.g?UI.g.w:1; const se=w>=4&&w<=13?'🌸':w>=14&&w<=35?'☀️':w>=36&&w<=48?'🍂':'❄️'; return `<div class="ph"><div><h1>${b[0]}</h1><div class="sub">${b[1]}</div></div><div class="sea">${se}</div></div>`; };

/* ---------- 時間推進 ---------- */
UI.worker=null; UI.wid=0;
UI.runWorker=(weeks,opt,pg)=>new Promise((resolve,reject)=>{ if(!UI.worker){ try{ UI.worker=new Worker('js/worker.js'); }catch(e){ return reject(e); } }
  const w=UI.worker, id=++UI.wid; const h=ev=>{ const m=ev.data; if(m.id!==id) return; if(m.progress){ pg.style.transform=`scaleX(${m.progress/m.total})`; return; } w.removeEventListener('message',h); w.removeEventListener('error',he); if(m.error) reject(new Error(m.error)); else resolve(m); }; const he=e=>{ w.removeEventListener('message',h); w.removeEventListener('error',he); try{ w.terminate(); }catch(_){} UI.worker=null; reject(new Error(e.message||'worker error')); };
  w.addEventListener('message',h); w.addEventListener('error',he); w.postMessage({id,state:Save.serialize(UI.g),weeks,opt:{stop:opt&&opt.stop,stopAny:opt&&opt.stopAny}}); });
UI.advance=async function(weeks,opt){ if(UI.busy||!UI.g) return; let g=UI.g; if(g.status==='broke'){ UI.toast('事業已破產，請至「教育集團」重新創業',true); return; }
  UI.busy=true; const pg=$('#prog'); const y0=g.y; let r; const keepSel=g.curId;
  try{ if(UI.useWorker===false) throw new Error('nw'); const m=await UI.runWorker(weeks,opt||{},pg); const ng=Save.deserialize(m.state); if(!ng.schools.some(x=>x.id===ng.curId)||ng.schools.some(x=>x.id===keepSel)) ng.curId=ng.schools.some(x=>x.id===keepSel)?keepSel:ng.curId; UI.g=g=ng; r=m.r; UI.mode='worker'; }
  catch(e){ if(e.message!=='nw'){ UI.useWorker=false; console.warn('Worker 不可用，改用分片推進：',e.message); } UI.mode='slice'; r=await E.advanceAsync(g,weeks,opt||{},(n,t)=>{ pg.style.transform=`scaleX(${n/t})`; }); }
  pg.style.transform='scaleX(0)'; UI.busy=false;
  if(g.y!==y0&&UI.autosave){ try{ await Save.autoSave(g); }catch(e){} }
  UI.render(); UI.popEvent(r);
  if(g.status==='broke') UI.modal(`<h3>事業破產</h3><p>所有學校均已停辦。你仍可到「教育集團」頁面申請重新創業（資金會大幅縮水），或回到首頁開始新局。</p><button class="btn gold" data-act="go" data-k="group">前往教育集團</button>`);
  return r; };
UI.popEvent=(r)=>{ const g=UI.g; if(!g||$('#modal')) return; const ev=g.events.pending.find(e=>e.urgent)||(r&&r.stop==='event'&&g.events.pending[g.events.pending.length-1]); if(ev) UI.showEvent(ev.id); };
UI.showEvent=(id)=>{ const g=UI.g; const e=g.events.pending.find(x=>x.id===id); if(!e) return; const wk=e.dl?Math.max(0,e.dl-g.abs):0; const d=UI.modal(`<div class="mut sm">${esc(e.sn||'')}・${CAL.label(e.y,e.w)}${e.urgent?' <span class="tag r">緊急</span>':''}</div><h3>${esc(e.title)}</h3><p>${esc(e.text)}</p>${e.opts.map(o=>`<button class="opt ${o.k===e.def?'def':''}" data-act="resolve" data-id="${e.id}" data-k="${o.k}">${esc(o.label)}</button>`).join('')}<div class="mut sm">${e.dl?`若 ${wk} 週內未處理，將自動採用預設選項（金框）。`:''}</div><div class="row sp"><button class="btn ghost sm" data-act="closeModal">稍後處理</button><button class="btn ghost sm" data-act="go" data-k="events">事件中心</button></div>`); d.dataset.lock=''; };
UI.resolve=(id,k)=>{ const r=Ev.resolve(UI.g,id,k); UI.closeModal(); if(r&&r.msg) UI.modal(`<h3>處理結果</h3><p>${esc(r.msg)}</p><button class="btn gold" data-act="closeModal">好</button>`); UI.render(); };

/* ---------- 事件委派 ---------- */
document.addEventListener('click',e=>{ const el=e.target.closest('[data-act]'); if(!el) return; const f=UI.act[el.dataset.act]; if(f){ e.preventDefault(); f(el.dataset,el,e); } });
document.addEventListener('change',e=>{ const el=e.target.closest('[data-chg]'); if(!el) return; const f=UI.chg[el.dataset.chg]; if(f) f(el.type==='checkbox'?el.checked:el.value,el.dataset,el); });
UI.act.go=d=>UI.go(d.k);
UI.act.tab=d=>{ UI.sub[d.k]=d.v; UI.render(); };
UI.act.closeModal=()=>UI.closeModal();
UI.act.adv=d=>UI.advance(+d.w);
UI.act.resolve=d=>UI.resolve(+d.id,d.k);
UI.act.ev=d=>UI.showEvent(+d.id);
UI.act.more=()=>UI.modal(`<div class="drawer">${UI.NAVG.map(([gn,items])=>`<div class="dg"><h4>${gn}</h4><div class="gi">${items.map(([k,n])=>`<a data-act="go" data-k="${k}" class="${UI.screen===k?'on':''}">${UI.ic(k,24)}${n}</a>`).join('')}</div></div>`).join('')}<div class="row sp"><label class="sm"><input type="checkbox" data-chg="nomotion" ${UI.noMotion?'checked':''}> 減少動畫</label><button class="btn ghost sm" data-act="toTitle">回標題畫面</button></div></div>`);
UI.chg.nomotion=v=>{ UI.noMotion=v; document.documentElement.classList.toggle('no-motion',v); try{ localStorage.setItem('se_nomotion',v?'1':'0'); }catch(e){} };
UI.act.toTitle=()=>{ UI.closeModal(); UI.screen='home'; UI.render(); };
try{ if(localStorage.getItem('se_nomotion')==='1'){ UI.noMotion=true; document.documentElement.classList.add('no-motion'); } }catch(e){}
UI.act.advTo=()=>{ const g=UI.g; const ys=[...Array(11)].map((_,i)=>g.y+i); UI.modal(`<h3>推進到指定日期</h3><div class="row"><select id="ty">${ys.map(y=>`<option>${y}</option>`).join('')}</select> 年 第 <input id="tw" type="number" min="1" max="52" value="${g.w}" style="width:5em"> 週</div><p class="sm mut">遇緊急事件會自動停下。常用：<a data-act="advW" data-w="${E.weeksTo(g,g.y,36)>0?E.weeksTo(g,g.y,36):E.weeksTo(g,g.y+1,36)}">下個開學</a>、<a data-act="advW" data-w="${E.weeksTo(g,g.w<=30?g.y:g.y+1,30)}">下個招生季</a>、<a data-act="advW" data-w="${E.weeksTo(g,g.w<=26?g.y:g.y+1,26)}">下次畢業</a></p><button class="btn gold" id="go">出發</button>`); $('#go').onclick=()=>{ const n=E.weeksTo(g,+$('#ty').value,+$('#tw').value); UI.closeModal(); if(n>0) UI.advance(n); else UI.toast('日期已過',true); }; };
UI.act.advW=d=>{ UI.closeModal(); if(+d.w>0) UI.advance(+d.w); };
UI.chg.school=v=>{ UI.g.curId=+v; UI.render(); };
UI.sch=()=>UI.cur();
// 持久設定輸入
UI.chg.cfg=(v,d)=>{ const s=UI.cur(); const k=d.k; if(d.t==='bool') s.cfg[k]=!!v; else if(d.t==='str') s.cfg[k]=v; else s.cfg[k]=+v; if(d.after) { if(d.after==='calc') S.calc(UI.g,s); } UI.render(); };
UI.cfgNum=(k,val,o)=>`<input type="number" data-chg="cfg" data-k="${k}" value="${Math.round(val)}" step="${o&&o.step||1}" min="${o&&o.min||0}" ${o&&o.max?`max="${o.max}"`:''}>`;
UI.cfgRange=(k,val,min,max,step,fmt)=>`<div class="row" style="flex-wrap:nowrap"><input type="range" data-chg="cfg" data-k="${k}" min="${min}" max="${max}" step="${step||1}" value="${val}"><b style="min-width:3.5em;text-align:right">${fmt?fmt(val):val}</b></div>`;
})(typeof window!=='undefined'?window:globalThis);
