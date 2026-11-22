// 建築內部：樓層剖面 → 點教室放大 → 透視模式。遊戲時間持續進行（本視窗只讀取模擬，不暫停）。
(function(root){
'use strict';
const SE=root.SE, {D,CS}=SE, UI=SE.UI, ART=SE.ART, M=UI.map, esc=UI.esc, H=ART._h;
const ROOMS={classroom:{nf:2,np:4,n:'教室'},lab:{nf:2,np:2,n:'實驗室'},library:{nf:2,np:2,n:['閱覽室','書庫']},dorm:{nf:3,np:3,n:'寢室'},canteen:{nf:1,np:3,n:'用餐區'},clinic:{nf:1,np:2,n:['診間','病床區']},office:{nf:2,np:3,n:'辦公室'},admin:{nf:3,np:3,n:'辦公室'},audit:{nf:1,np:1,n:'大禮堂'},research:{nf:3,np:2,n:'研究室'},workshop:{nf:1,np:3,n:'工作區'},gym:{nf:1,np:2,n:['球場','器材室']}};
const ROOF={classroom:'#e0824f',lab:'#6fb0cf',library:'#b0614a',dorm:'#d2604a',canteen:'#e89a3e',clinic:'#ec8484',office:'#6f9ab8',admin:'#5f9a82',audit:'#9a6484',research:'#6490ba',workshop:'#8296a2',gym:'#58a0c0'};
const V=UI.bv={b:null,mode:'sec',room:null,hits:[],raf:0};
const cfg=b=>{ const r=ROOMS[b.t]||{nf:1,np:2,n:'房間'}; const nf=r.nf+(b.lv>=3&&(b.t==='classroom'||b.t==='dorm')?1:0); return {nf,np:r.np,names:r.n}; };
const roomName=(b,i)=>{ const c=cfg(b); const n=Array.isArray(c.names)?c.names[i%c.names.length]:c.names; return Array.isArray(c.names)?n:`${n} ${i+1}`; };
// 每個房間的人：依在建築內的人員順序平均分配（教師優先放到教室）
const pseudo=(src,kind,act)=>({id:src.id,src,kind,act,phase:SE.CS.hs(src.id,1,1)*6.28,look:null});
function classFull(b){ const g=UI.g,s=UI.cur(); const bl=CS.blocksFor(g,s); const ty=bl[CS.blockAt(bl,g.day.m)][2]; if(g.day.d>=5||!['class'].includes(ty)) return null; const cls=s.bld.filter(x=>x.t==='classroom'&&!x.prog); const c=cfg(b),n=c.nf*c.np; const bi=cls.findIndex(x=>x.id===b.id); const tot=cls.length*n; if(bi<0||tot<=0) return null; const rooms=Array.from({length:n},()=>[]); for(const st of s.students){ const gi=Math.floor(SE.CS.hs(st.id,17,3)*tot); const lb=Math.floor(gi/n); if(lb===bi&&rooms[gi%n].length<14) rooms[gi%n].push(pseudo(st,'s','study')); } const ts=s.staff.filter(x=>x.role==='t'); for(let r=0;r<n;r++){ const tt=ts[(bi*n+r)%Math.max(1,ts.length)]; if(tt&&ts.length>bi*n+r) rooms[r].push(pseudo(tt,'t','work')); } return rooms; }
function occupants(b){ const g=UI.g,sim=g._sim; if(b.t==='classroom'){ const f=classFull(b); if(f) return f; } if(!sim) return []; const c=cfg(b),n=c.nf*c.np; const rooms=Array.from({length:n},()=>[]); const list=sim.people.filter(p=>p.inside&&p.inside.id===b.id); const ts=list.filter(p=>p.kind==='t'),ss=list.filter(p=>p.kind!=='t'); ss.forEach((p,i)=>rooms[i%n].push(p)); ts.forEach((p,i)=>rooms[(i*Math.max(1,Math.floor(n/Math.max(1,ts.length))))%n].push(p)); return rooms; }
UI.act.bview=d=>{ const s=UI.cur(),b=s.bld.find(x=>x.id===+d.id); if(!b) return; if(b.prog>0){ UI.toast('施工中，尚無內部可看'); return; } V.b=b; V.mode='sec'; V.room=null; UI.closeModal&&UI.closeModal(); let el=document.getElementById('bview'); if(el) el.remove(); el=document.createElement('div'); el.id='bview'; el.className='bview'; el.innerHTML='<div class="bvbar"></div><canvas id="bvc"></canvas>'; document.body.appendChild(el); const cv=el.querySelector('canvas'); cv.onclick=e=>{ const r=cv.getBoundingClientRect(); onClick(e.clientX-r.left,e.clientY-r.top); }; V.cv=cv; if(!V.raf) V.raf=requestAnimationFrame(loop); };
UI.act.bvClose=()=>{ const el=document.getElementById('bview'); if(el) el.remove(); V.b=null; cancelAnimationFrame(V.raf); V.raf=0; M.need&&M.need(); };
UI.act.bvManage=()=>{ const id=V.b&&V.b.id; UI.act.bvClose(); M.sel=id; UI.go('campus'); };
UI.act.bvBack=()=>{ if(V.mode==='room'){ V.mode='sec'; V.room=null; } else UI.act.bvClose(); };
UI.act.xray=()=>{ if(M.xray){ M.xray=null; M.need(); M._hk=''; return; } const id=V.b?V.b.id:M.sel; if(!id){ UI.toast('先點選一棟建築，再開啟透視'); return; } M.xray=id; M._hk=''; UI.act.bvClose(); M.need(); };
function onClick(x,y){ for(const h of V.hits){ if(x>=h.x&&x<=h.x+h.w&&y>=h.y&&y<=h.y+h.h){ if(h.type==='person'){ UI.act.person({id:h.id}); return; } if(h.type==='room'&&V.mode==='sec'){ V.mode='room'; V.room=h.i; return; } } } }
function bar(){ const el=document.querySelector('#bview .bvbar'); if(!el||!V.b) return; const g=UI.g,b=V.b,d=D.BLD[b.t]; const sk=V.mode+'|'+V.room+'|'+b.id; if(el.dataset.k!==sk){ el.dataset.k=sk; el.innerHTML=`<button data-act="bvBack">← ${V.mode==='room'?'回樓層':'返回'}</button><b>${d.n}${V.mode==='room'?' · '+roomName(b,V.room):' · 樓層剖面'}</b><span class="clk"></span><span class="spd">${[0,1,2,4,8].map(v=>`<button data-act="spd" data-v="${v}">${v?v+'×':'⏸'}</button>`).join('')}</span><button data-act="xray" class="xr"></button><button data-act="bvManage">建築管理</button>`; }
  const clk=el.querySelector('.clk'),ct=CS.DAYN[g.day.d]+' '+CS.clock(g); if(clk.textContent!==ct) clk.textContent=ct; el.querySelectorAll('.spd button').forEach(x=>x.classList.toggle('on',+x.dataset.v===M.speed)); const xr=el.querySelector('.xr'),xt=M.xray===b.id?'關閉透視':'透視模式'; if(xr.textContent!==xt) xr.textContent=xt; }
const rrect=(c,x,y,w,h,r)=>{ c.beginPath(); c.moveTo(x+r,y); c.arcTo(x+w,y,x+w,y+h,r); c.arcTo(x+w,y+h,x,y+h,r); c.arcTo(x,y+h,x,y,r); c.arcTo(x,y,x+w,y,r); c.closePath(); };
function look(p){ if(!p.look) p.look=ART.lookOf(p.src,p.kind,UI.cur(),ART.eraStage(UI.g.y)); return p.look; }
function fig(c,p,x,y,sc,pose,t){ const sh=ART.chibiSheet(look(p)); const fr=ART.frameOf(pose,t,0); const k=sc*(p.look.h||1); c.drawImage(sh.cv,fr*sh.fw,0,sh.fw,sh.fh,x-sh.ax*k,y-sh.ay*k,sh.fw*k,sh.fh*k); V.hits.push({type:'person',id:p.id,x:x-sh.fw*k*.35,y:y-sh.ay*k,w:sh.fw*k*.7,h:sh.ay*k+4}); }
// 房間內擺設（平面剖面）：依建築類型
function roomDeco(c,t,x,y,w,h,fl){ const fy=y+h-fl; const col={classroom:'#2f5a48',lab:'#dfe9ec',library:'#8a5a37',dorm:'#e8b6a8',canteen:'#e9c58a',clinic:'#f4f7f7',office:'#c9d6e0',admin:'#c9d6e0',audit:'#8a3a4a',research:'#dfe9ec',workshop:'#b0b8bf',gym:'#d9a05a'}[t]||'#ddd';
  if(t==='classroom'){ c.fillStyle='#2f5a48'; rrect(c,x+w*.3,y+h*.12,w*.4,h*.26,3); c.fill(); c.strokeStyle='#c9a06e'; c.lineWidth=2; c.stroke(); c.fillStyle='rgba(255,255,255,.7)'; c.fillRect(x+w*.34,y+h*.18,w*.2,2); c.fillRect(x+w*.34,y+h*.25,w*.12,2); }
  else if(t==='library'||t==='research'&&false){ for(let i=0;i<4;i++){ c.fillStyle='#8a5a37'; c.fillRect(x+8+i*(w-16)/4,y+h*.1,(w-16)/4-4,fy-y-h*.12); for(let k=0;k<4;k++){ c.fillStyle=['#e0824f','#6fb0cf','#f2d36a','#8fd16a'][(i+k)%4]; c.fillRect(x+11+i*(w-16)/4,y+h*.14+k*(fy-y-h*.2)/4,(w-16)/4-10,(fy-y-h*.2)/4-3); } } }
  else if(t==='dorm'){ for(let i=0;i<2;i++){ c.fillStyle='#8a5a37'; c.fillRect(x+8+i*w*.46,fy-14,w*.4,14); c.fillStyle=['#f2a1b4','#9fd0ee'][i]; c.fillRect(x+10+i*w*.46,fy-19,w*.36,6); c.fillStyle='#fffbe8'; c.fillRect(x+10+i*w*.46,fy-22,w*.12,4); } }
  else if(t==='lab'||t==='research'){ c.fillStyle='#e8eef0'; c.fillRect(x+8,fy-16,w-16,16); c.strokeStyle='#9ab'; c.strokeRect(x+8,fy-16,w-16,16); for(let i=0;i<4;i++){ c.fillStyle=['#6fe0cc','#f2a1b4','#f2d36a','#9fd0ee'][i]; c.fillRect(x+16+i*(w-40)/4,fy-24,6,8); } }
  else if(t==='canteen'){ for(let i=0;i<3;i++){ c.fillStyle='#b88a58'; c.fillRect(x+10+i*(w-20)/3,fy-12,(w-20)/3-8,5); c.fillRect(x+16+i*(w-20)/3,fy-7,3,7); } c.fillStyle='#e86a4a'; c.fillRect(x+6,y+h*.12,w-12,8); }
  else if(t==='clinic'){ c.fillStyle='#fff'; c.fillRect(x+10,fy-12,w*.4,12); c.fillStyle='#e85a5a'; c.fillRect(x+w*.7,y+h*.18,12,4); c.fillRect(x+w*.7+4,y+h*.18-4,4,12); }
  else if(t==='gym'){ c.strokeStyle='#d9783a'; c.lineWidth=3; c.beginPath(); c.arc(x+w*.5,y+h*.3,9,0,7); c.stroke(); c.fillStyle='rgba(255,255,255,.6)'; c.fillRect(x+w*.5-1,y+h*.3,2,fy-y-h*.3); }
  else { c.fillStyle='#b88a58'; c.fillRect(x+10,fy-14,w*.35,14); c.fillStyle='#2c3a46'; c.fillRect(x+16,fy-24,12,10); c.fillStyle='#b88a58'; c.fillRect(x+w*.55,fy-14,w*.35,14); c.fillStyle='#2c3a46'; c.fillRect(x+w*.6,fy-24,12,10); } }
function drawSection(c,W,Hh,t){ const b=V.b,d=D.BLD[b.t],cf=cfg(b); const rooms=occupants(b); V.hits=[]; const top=54,mx=24; const availH=Hh-top-26; const roofH=34; const rh=Math.min(130,(availH-roofH)/cf.nf), rw=Math.min(200,(W-mx*2)/cf.np); const bw=rw*cf.np,bh=rh*cf.nf; const x0=(W-bw)/2,y0=top+roofH+ (availH-roofH-bh)/2;
  // 背景
  const sk=c.createLinearGradient(0,0,0,Hh); sk.addColorStop(0,'#bfe3fa'); sk.addColorStop(1,'#eaf6e4'); c.fillStyle=sk; c.fillRect(0,0,W,Hh); c.fillStyle='#8fd16a'; c.fillRect(0,y0+bh,W,Hh); c.fillStyle='#c9a06e'; c.fillRect(0,y0+bh,W,4);
  // 屋頂
  c.fillStyle=ROOF[b.t]||'#d9784a'; c.beginPath(); c.moveTo(x0-12,y0); c.lineTo(x0+14,y0-roofH); c.lineTo(x0+bw-14,y0-roofH); c.lineTo(x0+bw+12,y0); c.closePath(); c.fill(); c.strokeStyle='rgba(120,84,60,.5)'; c.lineWidth=1.4; c.stroke();
  // 外牆框
  c.fillStyle='#fff6e3'; rrect(c,x0-6,y0,bw+12,bh+6,4); c.fill(); c.stroke();
  for(let f=0;f<cf.nf;f++) for(let k=0;k<cf.np;k++){ const idx=f*cf.np+k; const fl=cf.nf-1-f; const ri=fl*cf.np+k; const x=x0+k*rw,y=y0+f*rh; const hover=false;
    const wg=c.createLinearGradient(0,y,0,y+rh); wg.addColorStop(0,'#fbf1d8'); wg.addColorStop(1,'#f0e2c0'); c.fillStyle=wg; c.fillRect(x+3,y+3,rw-6,rh-6); c.fillStyle='#c9a06e'; c.fillRect(x+3,y+rh-14,rw-6,11);
    c.fillStyle='#bfe3f2'; rrect(c,x+rw*.7,y+rh*.14,rw*.2,rh*.3,2); c.fill(); c.strokeStyle='#fff'; c.lineWidth=1.2; c.stroke(); c.beginPath(); c.moveTo(x+rw*.8,y+rh*.14); c.lineTo(x+rw*.8,y+rh*.44); c.stroke(); c.lineWidth=1.4; c.strokeStyle='rgba(120,84,60,.5)';
    roomDeco(c,b.t,x+3,y+3,rw-6,rh-6,11);
    const ppl=rooms[ri]||[]; const n=ppl.length; const sc=Math.max(.5,Math.min(1,rh/120))*.9; ppl.slice(0,8).forEach((p,i)=>{ const px=x+16+(i+.5)*(rw-32)/Math.min(8,Math.max(n,1)); const seated=p.act==='study'||p.act==='rest'||(p.kind!=='t'&&b.t==='classroom'); const pose=p.kind==='t'&&b.t==='classroom'?'talk':(p.act==='study'?(hsr(p.id,t)?'talk2':'study'):p.act==='work'?'work':p.act==='rest'?'rest':'idle'); fig(c,p,px,y+rh-12+(seated?3:0),sc,pose,t+p.phase); if(b.t==='classroom'&&p.kind!=='t'){ c.fillStyle='#b88a58'; c.fillRect(px-9*sc,y+rh-17,18*sc,4); } });
    if(n>8){ c.fillStyle='rgba(32,61,50,.85)'; rrect(c,x+rw-34,y+6,28,15,6); c.fill(); c.fillStyle='#fff'; c.font='bold 10px sans-serif'; c.textAlign='center'; c.fillText('+'+(n-8),x+rw-20,y+17); }
    c.fillStyle='rgba(32,61,50,.85)'; c.font='bold 10px sans-serif'; c.textAlign='left'; c.fillText(roomName(b,ri)+(n?'':'（空）'),x+8,y+15); c.strokeStyle='rgba(150,110,80,.6)'; c.lineWidth=2; c.strokeRect(x+3,y+3,rw-6,rh-6);
    V.hits.unshift({type:'room',i:ri,x,y,w:rw,h:rh}); }
  // 樓梯/門口
  c.fillStyle='#8a5a3a'; c.fillRect(x0+bw/2-12,y0+bh-22,24,28); }
const hsr=(id,t)=>SE.CS.hs(id,Math.floor(t/3),77)<.12;
// 放大教室：等角室內
function drawRoom(c,W,Hh,t){ const b=V.b; const rooms=occupants(b); const ri=V.room; const ppl=rooms[ri]||[]; V.hits=[]; const sk=c.createLinearGradient(0,0,0,Hh); sk.addColorStop(0,'#dcecf7'); sk.addColorStop(1,'#f3ead3'); c.fillStyle=sk; c.fillRect(0,0,W,Hh);
  const w=4.6,h=3.6,Hh2=30,tw=.16; const sc=Math.min((W-40)/((w+h)*32),(Hh-80)/((w+h)*16+Hh2+20)); const o={x:W/2+(h-w)*16*sc,y:54+Hh2*sc+ ((Hh-80)-((w+h)*16+Hh2)*sc)/2};
  c.save(); c.translate(o.x,o.y); c.scale(sc,sc); const oo={x:0,y:0}; const {box,poly,P,furniture}=H; const kind=b.t; const floorCol=kind==='canteen'?'#d6b482':kind==='library'?'#b88a60':kind==='dorm'?'#c9a67a':(kind==='lab'||kind==='research'||kind==='clinic')?'#e4ecee':'#d8bf8f';
  poly(c,[P(oo,0,0,0),P(oo,w,0,0),P(oo,w,h,0),P(oo,0,h,0)],floorCol,'rgba(90,60,30,.3)');
  c.fillStyle='rgba(90,60,30,.09)'; for(let x=0;x<w;x+=.5) for(let y=0;y<h;y+=.5) if(((x*2|0)+(y*2|0))%2) poly(c,[P(oo,x,y,0),P(oo,x+.5,y,0),P(oo,x+.5,y+.5,0),P(oo,x,y+.5,0)],'rgba(90,60,30,.08)');
  const wallC='#fbf3dc'; poly(c,[P(oo,0,0,0),P(oo,w,0,0),P(oo,w,0,Hh2),P(oo,0,0,Hh2)],wallC,'rgba(120,84,60,.4)'); poly(c,[P(oo,0,0,0),P(oo,0,h,0),P(oo,0,h,Hh2),P(oo,0,0,Hh2)],'#efe3c6','rgba(120,84,60,.4)'); box(c,oo,0,0,w,tw,0,2.4,'#c9a06e',{line:null,noTop:true}); 
  if(kind==='classroom'){ poly(c,[P(oo,w*.25,.02,8),P(oo,w*.7,.02,8),P(oo,w*.7,.02,Hh2-5),P(oo,w*.25,.02,Hh2-5)],'#2f5a48','#c9a06e',2); } for(let i=0;i<2;i++){ const a=.2+i*(h*.42); poly(c,[P(oo,.02,a,9),P(oo,.02,a+h*.34,9),P(oo,.02,a+h*.34,Hh2-4),P(oo,.02,a,Hh2-4)],'#bfe3f2','#fff',1.6); }
  const Lx=ART.layout(kind==='classroom'?'classroom':kind,w,h); furniture(c,oo,Lx,1,0);
  // 人物：依深度排序
  const seats=Lx.seats.length?Lx.seats:[[1,1]]; const dr=ppl.slice(0,14).map((p,i)=>{ const st=p.kind==='t'&&kind==='classroom'?[w*.5,.7]:seats[i%seats.length]; return {p,st}; }); dr.sort((a,b2)=>(a.st[0]+a.st[1])-(b2.st[0]+b2.st[1]));
  for(const {p,st} of dr){ const q=P(oo,st[0],st[1],0); const pose=p.kind==='t'&&kind==='classroom'?'talk':(p.act==='work'?'work':p.act==='rest'?'rest':(hsr(p.id,t)?'talk2':'study')); const sh=ART.chibiSheet(look(p)); const k=.95*(p.look.h||1); const fr=ART.frameOf(pose,t+p.phase,1); c.drawImage(sh.cv,fr*sh.fw,0,sh.fw,sh.fh,q[0]-sh.ax*k,q[1]-sh.ay*k-2,sh.fw*k,sh.fh*k); const sx=o.x+q[0]*sc,sy=o.y+q[1]*sc; V.hits.push({type:'person',id:p.id,x:sx-sh.fw*k*sc*.35,y:sy-sh.ay*k*sc,w:sh.fw*k*sc*.7,h:sh.ay*k*sc}); }
  c.restore(); c.fillStyle='rgba(32,61,50,.85)'; c.font='bold 13px sans-serif'; c.textAlign='left'; c.fillText(`${roomName(b,ri)}　在場 ${ppl.length} 人（點人物看資料）`,14,Hh-12); }
function loop(ts){ V.raf=requestAnimationFrame(loop); const cv=V.cv; if(!cv||!cv.isConnected||!V.b){ cancelAnimationFrame(V.raf); V.raf=0; return; } if(document.hidden) return; const el=cv.parentElement; const W=el.clientWidth,Hh=el.clientHeight-48,dpr=Math.min(root.devicePixelRatio||1,2); if(cv.width!==W*dpr||cv.height!==Hh*dpr){ cv.width=W*dpr; cv.height=Hh*dpr; cv.style.width=W+'px'; cv.style.height=Hh+'px'; } const c=cv.getContext('2d'); c.setTransform(dpr,0,0,dpr,0,0); const t=ts/1000; if(M.stepSim){ const dt=Math.min(.1,(ts-(V.last||ts))/1000); V.last=ts; if(!M._lp) M.stepSim(dt); }
  if(V.mode==='room') drawRoom(c,W,Hh,t); else drawSection(c,W,Hh,t); bar(); }
// 地圖上的操作入口
UI.act.xrayBtn=UI.act.xray;
})(typeof window!=='undefined'?window:globalThis);
