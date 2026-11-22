(function(root){
'use strict';
const SE=root.SE, {E,S,L,P,G,W,D,U,R,CAL}=SE, UI=SE.UI, esc=UI.esc;
const M=UI.map={sel:null,type:null,gx:null,gy:null,cam:null,hover:null};
UI.mapHTML=(mode,opt)=>`<div class="mapwrap iso ${opt&&opt.tall?'tall':''}" id="mapwrap"><canvas id="cv" data-mode="${mode||'view'}"></canvas><div class="mapctl"><button data-act="zin" aria-label="放大">＋</button><button data-act="zout" aria-label="縮小">－</button><button data-act="zrst" aria-label="重設視角">⌂</button></div><div class="maphud" id="maphud"></div><div class="mapname" id="mapname"></div></div>`;
M.placeInfo=()=>{ const s=UI.cur(),g=UI.g; if(!M.type) return ''; const d=D.BLD[M.type]; if(M.gx==null) return `<div class="note">點擊地圖選擇「${d.n}」的位置（${d.w}×${d.h} 格）。可拖曳、縮放地圖。</div>`; const ok=S.canPlace(s,M.type,M.gx,M.gy); return `<div class="note">${d.n} @(${M.gx},${M.gy}) ${ok?'<b class="pos">可建造</b>':'<b class="neg">位置不可用</b>'}｜造價 ${UI.$m(S.costOf(g,s,M.type,1))}｜工期 ${d.wk} 週 <button class="btn gold sm" data-act="placeOk" ${ok?'':'disabled'}>確認興建</button> <button class="btn ghost sm" data-act="placeNo">取消</button></div>`; };
UI.act.placeOk=()=>{ const s=UI.cur(),g=UI.g; const r=S.build(g,s,M.type,M.gx,M.gy); if(r.ok){ M.type=null; M.gx=null; UI.did.add('build'); M.pulse=performance.now(); } UI.res(r); };
UI.act.placeNo=()=>{ M.type=null; M.gx=null; UI.render(); };
UI.act.pickType=d=>{ M.type=d.t; M.gx=null; M.sel=null; UI.render(); setTimeout(()=>{ const c=document.getElementById('mapwrap'); if(c) c.scrollIntoView({block:'center',behavior:UI.noMotion?'auto':'smooth'}); },30); };
UI.bldPanel=(s,b)=>{ const g=UI.g,d=D.BLD[b.t]; const st=b.prog>0?`施工中（剩 ${b.prog} 週）`:'營運中'; const conv=Object.keys(D.BLD).filter(k=>k!==b.t&&D.BLD[k].w<=d.w&&D.BLD[k].h<=d.h&&S.avail(g,k)); const tier=b.dur<25?'荒廢':b.dur<45?'破舊':['','普通','現代','高級'][b.lv]||'普通';
  return `<div class="card"><h3>${d.n} Lv${b.lv}　<span class="tag ${b.dur<45?'r':'g'}">${tier}</span></h3><p class="sm mut">${d.d}</p>${UI.kv('狀態',st)}${UI.kv('耐久度',b.dur.toFixed(0)+'%',b.dur<35?'neg':'')}${UI.bar(b.dur,b.dur<35?'r':'')}${UI.kv('建於',b.born+'年')}${UI.kv('占地',d.w+'×'+d.h+' 格')}
  <div class="row" style="margin-top:10px"><button class="btn sm" data-act="bview" data-id="${b.id}">查看樓層與教室</button><button class="btn sm wal" data-act="xray">透視模式</button></div><div class="row" style="margin-top:8px"><button class="btn sm" data-act="bUp" data-id="${b.id}" ${b.lv>=3?'disabled':''}>升級 ${b.lv<3?UI.$m(S.upgradeCost(g,s,b)):''}</button><button class="btn sm wal" data-act="bRep" data-id="${b.id}">維修 ${UI.$m(S.repairCost(g,s,b,Math.max(0,100-b.dur)))}</button><button class="btn sm red" data-act="bDem" data-id="${b.id}">拆除</button></div>
  ${conv.length?`<div class="row" style="margin-top:8px"><select id="cvt">${conv.map(k=>`<option value="${k}">${D.BLD[k].n}（改建 ${UI.$m(Math.round(S.costOf(g,s,k,1)*.55))}）</option>`).join('')}</select><button class="btn sm" data-act="bConv" data-id="${b.id}">改建</button></div>`:''}</div>`; };
UI.act.bUp=d=>{ const r=S.upgrade(UI.g,UI.cur(),+d.id); if(r.ok) M.pulse=performance.now(); UI.res(r); };
UI.act.bRep=d=>UI.res(S.repair(UI.g,UI.cur(),+d.id));
UI.act.bDem=d=>UI.confirm('確定拆除？只能取回少量殘值。',()=>{ M.sel=null; UI.res(S.demolish(UI.g,UI.cur(),+d.id)); });
UI.act.bConv=d=>UI.res(S.convert(UI.g,UI.cur(),+d.id,UI.$('#cvt').value));
UI.act.land=d=>{ const r=S.expandLand(UI.g,UI.cur(),d.dir); if(r.ok) M.cam=null; UI.res(r); };
UI.act.selB=d=>{ M.sel=+d.id; M.type=null; UI.render(); window.scrollTo(0,0); };
})(typeof window!=='undefined'?window:globalThis);
