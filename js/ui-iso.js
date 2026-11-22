// 等角校園渲染：相機、深度排序、點擊（像素級）、放置預覽、光照／季節。人物由 campus-sim 以 M.extra 掛入。
(function(root){
'use strict';
const SE=root.SE, {S,D,CAL}=SE, UI=SE.UI, ART=SE.ART, M=UI.map, HW=ART.HW, HH=ART.HH;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
M.hour=M.hour==null?12:M.hour; M.fx=M.fx||{}; M.extra=M.extra||null; M.quality=M.quality||'std';
M.season=g=>{ const m=CAL.monthOf(g.w); return m>=3&&m<=5?'spring':m>=6&&m<=8?'summer':m>=9&&m<=11?'autumn':'winter'; };
M.prosperity=s=>{ const bl=s.bld.filter(b=>!b.prog); if(!bl.length) return 40; const dur=bl.reduce((a,b)=>a+b.dur,0)/bl.length, lv=bl.reduce((a,b)=>a+b.lv,0)/bl.length; return clamp(dur*.7+lv*10+(s.rank&&s.rank.n?(1-(s.rank.r-1)/Math.max(1,s.rank.n-1))*10:0),0,100); };
function occ(s){ const o=new Set(); for(const b of s.bld){ const d=D.BLD[b.t]; for(let i=0;i<d.w;i++) for(let j=0;j<d.h;j++) o.add((b.x+i)+','+(b.y+j)); } return o; }
// 靜態場景（建築、樹、裝飾）；只在內容改變時重建
function scene(g,s){ const season=M.season(g), pros=M.prosperity(s), stage=ART.eraStage(g.y); const sig=[s.id,M.xray||0,g.y,season,Math.round(pros/10),s.land.w,s.land.h,s.bld.map(b=>[b.id,b.t,b.lv,b.x,b.y,b.dur<25?2:b.dur<45?1:0,b.prog>0?Math.min(5,b.prog):0].join('.')).join('|')].join('#');
  if(M._sc&&M._sc.sig===sig) return M._sc; const o=occ(s); const lw=s.land.w,lh=s.land.h; const dec=SE.CS.decor(s,pros); const road=dec.road; const gx=dec.gx;
  const gd=ART.ground(s,{pros,season,road,gx,occ:o}); const list=[];
  for(const b of s.bld){ const d=D.BLD[b.t]; const sp=ART.buildingSprite(b,d,{stage,season,cut:M.xray===b.id}); list.push({k:'b',id:b.id,b,x0:b.x,y0:b.y,x1:b.x+d.w,y1:b.y+d.h,sp}); }
  const used=new Set(o); for(const k of road) used.add(k);
  for(const [x,y,kind,v] of dec.trees){ used.add(x+','+y); list.push({k:'d',ctr:1,x0:x,y0:y,x1:x+1,y1:y+1,sp:ART.treeSprite(kind,season,v,pros<18)}); }
  for(const [x,y] of dec.benches){ used.add(x+','+y); list.push({k:'d',x0:x,y0:y,x1:x+1,y1:y+1,sp:ART.decorSprite('bench',season)}); }
  const dens=.05+pros/100*.2;
  for(const [x,y] of dec.free){ const k=x+','+y; if(used.has(k)) continue; const r=ART.hs(x,y,79), r2=ART.hs(x,y,80); let sp=null,wc=1,ctr=0;
    if(pros<30&&r<.18){ sp=ART.decorSprite('weeds',season); ctr=1; }
    else if(pros>=45&&r<.07){ sp=ART.decorSprite(['flowers','lamp','hedge','flowers'][(r2*4|0)],season); }
    else if(pros>=60&&r<.09&&x%5===2&&y%5===2&&!used.has((x+1)+','+y)&&!used.has(x+','+(y+1))&&!used.has((x+1)+','+(y+1))){ sp=ART.decorSprite('fountain',season); wc=2; used.add((x+1)+','+y); used.add(x+','+(y+1)); used.add((x+1)+','+(y+1)); }
    if(sp){ used.add(k); list.push({k:'d',ctr,x0:x,y0:y,x1:x+wc,y1:y+wc,sp}); } }
  for(let x=0;x<lw;x++){ const k=x+','+lh; } 
  list.push({k:'d',x0:gx,y0:lh,x1:gx+2,y1:lh+1,sp:ART.decorSprite('gate',season)});
  M._sc={sig,list,gd,road,season,pros,stage,sorted:null}; return M._sc; }
// 深度排序：拓撲（footprint 盒）
function sortList(list){ const n=list.length,out=[],ind=new Array(n).fill(0),adj=Array.from({length:n},()=>[]);
  for(let i=0;i<n;i++) for(let j=i+1;j<n;j++){ const a=list[i],b=list[j]; if(a.after===b.id||b.after===a.id){ if(b.after===a.id){ adj[i].push(j); ind[j]++; } else { adj[j].push(i); ind[i]++; } continue; } const ab=a.x1<=b.x0+1e-6||a.y1<=b.y0+1e-6, ba=b.x1<=a.x0+1e-6||b.y1<=a.y0+1e-6; if(ab&&!ba){ adj[i].push(j); ind[j]++; } else if(ba&&!ab){ adj[j].push(i); ind[i]++; } }
  const key=i=>list[i].x0+list[i].y0+list[i].x1+list[i].y1+(list[i].sub||0); let q=[]; for(let i=0;i<n;i++) if(!ind[i]) q.push(i);
  while(q.length){ q.sort((a,b)=>key(b)-key(a)); const i=q.pop(); out.push(list[i]); for(const j of adj[i]) if(--ind[j]===0) q.push(j); }
  if(out.length<n){ const seen=new Set(out); for(const e of list) if(!seen.has(e)) out.push(e); } return out; }
M.sortedList=sc=>{ const ex=M.extra?M.extra(sc):null; if(!ex||!ex.length){ if(!sc.sorted) sc.sorted=sortList(sc.list); return sc.sorted; } return sortList(sc.list.concat(ex)); };
// ---------- 相機 ----------
M.fit=(cv,s)=>{ const lw=s.land.w,lh=s.land.h; const w=(lw+lh)*HW,h=(lw+lh)*HH+80; const z=clamp(Math.min(cv.clientWidth/(w+80),cv.clientHeight/(h+40)),.35,1.6); M.cam={z,cx:0,cy:((lw+lh)*HH)/2-20}; };
const w2s=(cv,X,Y)=>[(X-M.cam.cx)*M.cam.z+cv.clientWidth/2,(Y-M.cam.cy)*M.cam.z+cv.clientHeight/2];
const s2w=(cv,sx,sy)=>[(sx-cv.clientWidth/2)/M.cam.z+M.cam.cx,(sy-cv.clientHeight/2)/M.cam.z+M.cam.cy];
M.w2s=w2s; M.s2w=s2w;
M.cell=(cv,sx,sy)=>{ const [X,Y]=s2w(cv,sx,sy); return [Math.floor((X/HW+Y/HH)/2),Math.floor((Y/HH-X/HW)/2)]; };
M.clampCam=(s)=>{ const lw=s.land.w,lh=s.land.h; const ex=(lw+lh)*HW/2+200; M.cam.cx=clamp(M.cam.cx,-ex,ex); M.cam.cy=clamp(M.cam.cy,-80,(lw+lh)*HH+160); };
// ---------- 光照 ----------
M.light=h=>{ // 回傳 {tint:[r,g,b,a], night:0..1}
  const k=[[0,[18,28,70,.62]],[5,[40,40,90,.5]],[6.5,[255,170,110,.22]],[8,[255,226,180,.07]],[12,[255,255,255,0]],[16,[255,240,200,.05]],[17.5,[255,150,90,.24]],[19,[60,50,110,.5]],[21,[18,28,70,.62]],[24,[18,28,70,.62]]];
  for(let i=0;i<k.length-1;i++){ const a=k[i],b=k[i+1]; if(h>=a[0]&&h<=b[0]){ const t=(h-a[0])/(b[0]-a[0]); return {tint:a[1].map((v,j)=>v+(b[1][j]-v)*t),night:clamp(((a[1][3]+(b[1][3]-a[1][3])*t)-.2)/.4,0,1)}; } } return {tint:[255,255,255,0],night:0}; };
// ---------- 繪製 ----------
M.draw=()=>{ const cv=M.cv; if(!cv||!cv.isConnected) return; const g=UI.g,s=UI.cur(); if(!g||!s) return; const dpr=Math.min(root.devicePixelRatio||1,M.quality==='eco'?1:2); const W=cv.clientWidth,H=cv.clientHeight; if(!W||!H) return; if(cv.width!==W*dpr|cv.height!==H*dpr){ cv.width=W*dpr; cv.height=H*dpr; }
  if(!M.cam) M.fit(cv,s); const c=cv.getContext('2d'); c.setTransform(dpr,0,0,dpr,0,0); const sc=scene(g,s); const z=M.cam.z;
  (M.sky||function(c,W,H){ c.fillStyle='#9ad0f4'; c.fillRect(0,0,W,H); })(c,W,H);
  c.save(); c.translate(W/2-M.cam.cx*z,H/2-M.cam.cy*z); c.scale(z,z); c.imageSmoothingQuality='high';
  c.drawImage(sc.gd.cv,-sc.gd.ox,-sc.gd.oy);
  const vx0=M.cam.cx-W/2/z-120,vx1=M.cam.cx+W/2/z+120,vy0=M.cam.cy-H/2/z-160,vy1=M.cam.cy+H/2/z+160; const sorted=M.sortedList(sc); M.vis=0;
  const pulseT=M.pulse?(performance.now()-M.pulse)/600:2;
  for(const e of sorted){ if(e.draw){ e.draw(c,vx0,vx1,vy0,vy1); continue; } const X=(e.x0-e.y0)*HW,Y=(e.x0+e.y0)*HH; // sprite 原點對應 footprint 的 (x0,y0) 角
    const sp=e.sp; const dx=X-sp.ox, dy=Y-sp.oy; const kk=sp.k||1; const w=sp.cv.width*kk,h=sp.cv.height*kk; const ex=e.k==='b'?0:(e.x1-e.x0>1?HW:0); if(dx+w<vx0||dx>vx1||dy+h<vy0||dy>vy1) continue; M.vis++;
    let ox=0,oy=0; if(e.k==='b'&&pulseT<1&&M._pulseId===e.id){ oy=-Math.sin(pulseT*Math.PI)*6; }
    c.drawImage(sp.cv,dx+ox,dy+oy+(e.ctr?HH:0),w,h);
    if(e.k==='b'&&M.sel===e.id){ c.save(); c.globalAlpha=.9; c.strokeStyle='#C9A14B'; c.lineWidth=2.5/z; const d=D.BLD[e.b.t]; const pts=[[e.x0,e.y0],[e.x1,e.y0],[e.x1,e.y1],[e.x0,e.y1]].map(p=>[(p[0]-p[1])*HW,(p[0]+p[1])*HH]); c.beginPath(); pts.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1])); c.closePath(); c.stroke(); c.restore(); } }
  // 放置預覽
  if(M.type){ const d=D.BLD[M.type]; const gx=M.gx!=null?M.gx:M.hover&&M.hover[0], gy=M.gx!=null?M.gy:M.hover&&M.hover[1]; if(gx!=null&&gx!==undefined){ const ok=S.canPlace(s,M.type,gx,gy); const pts=[[gx,gy],[gx+d.w,gy],[gx+d.w,gy+d.h],[gx,gy+d.h]].map(p=>[(p[0]-p[1])*HW,(p[0]+p[1])*HH]); c.beginPath(); pts.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1])); c.closePath(); c.fillStyle=ok?'rgba(110,200,120,.45)':'rgba(220,80,70,.45)'; c.fill(); c.strokeStyle=ok?'#2f7a3f':'#a8352a'; c.lineWidth=2/z; c.stroke(); } }
  // 光照
  c.restore(); const L=M.light(M.hour); if(L.tint[3]>.01){ c.globalCompositeOperation='multiply'; const t=L.tint; c.fillStyle=`rgba(${t[0]|0},${t[1]|0},${t[2]|0},${Math.min(.85,t[3]*1.3)})`; c.fillRect(0,0,W,H); c.globalCompositeOperation='source-over'; }
  if(L.night>.15&&M.quality!=='eco'){ // 夜間窗光（以建築位置加暖色光暈）
    c.globalCompositeOperation='lighter'; for(const e of sc.list) if(e.k==='b'&&!e.b.prog&&!['field','pool','parking','landscape'].includes(e.b.t)&&M.hour<22){ const d=D.BLD[e.b.t]; const [X,Y]=w2s(cv,((e.x0+d.w/2)-(e.y0+d.h/2))*HW,((e.x0+d.w/2)+(e.y0+d.h/2))*HH-14); const r=(18+d.w*8)*z; const gr=c.createRadialGradient(X,Y,1,X,Y,r); gr.addColorStop(0,`rgba(255,200,110,${.32*L.night})`); gr.addColorStop(1,'rgba(255,200,110,0)'); c.fillStyle=gr; c.fillRect(X-r,Y-r,r*2,r*2); } c.globalCompositeOperation='source-over'; }
  if(M.fx.rain){ c.strokeStyle='rgba(200,215,235,.55)'; c.lineWidth=1; const t=performance.now()/22; c.beginPath(); for(let i=0;i<(M.quality==='eco'?40:110);i++){ const x=(i*97+t*3)%W,y=(i*53+t*9)%H; c.moveTo(x,y); c.lineTo(x-3,y+9); } c.stroke(); }
  if(M.post) M.post(c,W,H,sc); M.dirty=false; };
M.need=()=>{ M.dirty=true; if(M._raf) return; M._raf=requestAnimationFrame(()=>{ M._raf=0; M.draw(); }); };
// ---------- 點擊（像素級） ----------
M.pick=(sx,sy)=>{ const cv=M.cv,sc=M._sc; if(!sc) return null; const [X,Y]=s2w(cv,sx,sy); const sorted=M.sortedList(sc); for(let i=sorted.length-1;i>=0;i--){ const e=sorted[i]; if(e.k!=='b'&&e.k!=='p') continue; if(e.k==='p'){ if(e.hit&&e.hit(X,Y)) return e; continue; } const sp=e.sp; const kk=sp.k||1; const px=Math.floor((X-((e.x0-e.y0)*HW-sp.ox))/kk), py=Math.floor((Y-((e.x0+e.y0)*HH-sp.oy))/kk); if(px<0||py<0||px>=sp.cv.width||py>=sp.cv.height) continue; try{ if(sp.cv.getContext('2d').getImageData(px,py,1,1).data[3]>24) return e; }catch(_){ return e; } } return null; };
// ---------- 輸入 ----------
M.mount=()=>{ const cv=document.getElementById('cv'); if(!cv) return; M.cv=cv; const s=UI.cur(); if(!M.cam) M.fit(cv,s); const mode=cv.dataset.mode; const ptr=new Map(); let drag=null,pinch=null,moved=0;
  const pos=e=>{ return SE.ptr(e,cv); };
  cv.onpointerdown=e=>{ cv.setPointerCapture(e.pointerId); ptr.set(e.pointerId,pos(e)); moved=0; if(ptr.size===2){ const [a,b]=[...ptr.values()]; pinch={d:Math.hypot(a[0]-b[0],a[1]-b[1]),z:M.cam.z}; drag=null; } else drag={p:pos(e),cx:M.cam.cx,cy:M.cam.cy}; };
  cv.onpointermove=e=>{ const p=pos(e); if(ptr.has(e.pointerId)) ptr.set(e.pointerId,p); if(pinch&&ptr.size>=2){ const [a,b]=[...ptr.values()]; const d=Math.hypot(a[0]-b[0],a[1]-b[1]); M.cam.z=clamp(pinch.z*d/pinch.d,.3,2.6); moved=9; M.need(); return; }
    if(drag&&ptr.has(e.pointerId)){ const dx=p[0]-drag.p[0],dy=p[1]-drag.p[1]; moved=Math.max(moved,Math.hypot(dx,dy)); if(moved>5){ M.cam.cx=drag.cx-dx/M.cam.z; M.cam.cy=drag.cy-dy/M.cam.z; M.clampCam(UI.cur()); M.need(); } }
    else if(M.type&&e.pointerType==='mouse'){ M.hover=M.cell(cv,p[0],p[1]); M.need(); } };
  const up=e=>{ const was=ptr.has(e.pointerId); const p=pos(e); ptr.delete(e.pointerId); if(ptr.size<2) pinch=null; if(!was) return; if(ptr.size===0){ if(moved<=5){ M.tap(p[0],p[1],mode); } drag=null; } };
  cv.onpointerup=up; cv.onpointercancel=e=>{ ptr.delete(e.pointerId); pinch=null; drag=null; };
  cv.onwheel=e=>{ e.preventDefault(); const [sx,sy]=pos(e); const before=s2w(cv,sx,sy); M.cam.z=clamp(M.cam.z*(e.deltaY<0?1.12:1/1.12),.3,2.6); const after=s2w(cv,sx,sy); M.cam.cx+=before[0]-after[0]; M.cam.cy+=before[1]-after[1]; M.clampCam(UI.cur()); M.need(); };
  cv.style.touchAction='none';
  if(M._ro) M._ro.disconnect(); if(root.ResizeObserver){ M._ro=new ResizeObserver(()=>M.need()); M._ro.observe(cv.parentElement); }
  M.need(); };
M.tap=(sx,sy,mode)=>{ const cv=M.cv,s=UI.cur(); if(M.type){ const [gx,gy]=M.cell(cv,sx,sy); const d=D.BLD[M.type]; M.gx=clamp(gx-((d.w/2)|0),0,s.land.w-d.w); M.gy=clamp(gy-((d.h/2)|0),0,s.land.h-d.h); UI.render(); return; }
  const e=M.pick(sx,sy); if(e&&e.k==='p'){ if(e.onTap) e.onTap(); return; } if(e&&e.k==='b'){ M.sel=e.id; M._pulseId=e.id; M.pulse=performance.now(); if(M.xray){ M.xray=e.id; M.need(); return; } if(mode==='build'){ UI.render(); return; } UI.act.bview({id:e.id}); return; } else if(M.sel){ M.sel=null; if(mode==='view'||mode==='build') UI.render(); else M.need(); } };
UI.act.zin=()=>{ M.cam.z=clamp(M.cam.z*1.25,.3,2.6); M.need(); };
UI.act.zout=()=>{ M.cam.z=clamp(M.cam.z/1.25,.3,2.6); M.need(); };
UI.act.zrst=()=>{ M.fit(M.cv,UI.cur()); M.need(); };
// 動畫迴圈（小幅：旗幟/噴泉暫無；僅脈衝與雨）。有需要才持續繪製
M.loop=()=>{ if(M._loop) return; const f=()=>{ if(!M.cv||!M.cv.isConnected){ M._loop=0; return; } if(M.fx.rain||(M.pulse&&performance.now()-M.pulse<650)) M.draw(); M._loop=requestAnimationFrame(f); }; M._loop=requestAnimationFrame(f); };
UI.after.campus=()=>{ M.mount(); M.loop(); };
UI.after.build=()=>{ M.mount(); M.loop(); };
})(typeof window!=='undefined'?window:globalThis);
