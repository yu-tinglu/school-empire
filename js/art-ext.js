// 建築外觀（日系：奶油牆、橘/藍屋頂、白框窗、鐘塔、屋頂花園）。內部剖面仍由 art-iso 的 buildingSprite(ctx.cut) 提供。
(function(root){
'use strict';
const SE=root.SE, ART=SE.ART, H=ART._h, HW=ART.HW, HH=ART.HH, hs=ART.hs, mix=ART.mix, sh=ART.sh;
const WALL={classroom:'#f1e1bd',lab:'#e6ece0',library:'#e8d3ac',dorm:'#f2d9bf',canteen:'#f3dfb3',clinic:'#eef0e6',office:'#ecdfbf',admin:'#e9e0c4',audit:'#ecd8c4',research:'#dde8e6',workshop:'#ddd0b6',gym:'#e3d6b8'};
const ROOF={classroom:'#c8683f',lab:'#5f9c8a',library:'#9c5a43',dorm:'#bf5a42',canteen:'#d98a3a',clinic:'#d98078',office:'#5f8f7c',admin:'#4f8a76',audit:'#8a5a70',research:'#5a8aa0',workshop:'#7c8c86',gym:'#4f8f98'};
const NF={classroom:2,library:2,lab:2,dorm:3,canteen:1,clinic:1,office:2,admin:3,audit:2,research:3,workshop:1,gym:1};
const FLAT=['field','pool','parking','landscape'];
const orig=ART.buildingSprite;
ART.buildingSprite=(b,d,ctx)=>{ if(ctx.cut||b.prog>0||FLAT.includes(b.t)||ART.external['bld:'+b.t+':'+b.lv]) return orig(b,d,ctx); return ext(b,d,ctx); };
function ext(b,d,ctx){ const dec=b.dur<25?2:b.dur<45?1:0; const key=['ext',b.t,b.lv,dec,ctx.stage,ctx.season].join(':'); const cache=ART._bc||(ART._bc=new Map()); if(cache.has(key)) return cache.get(key);
  const {box,win,windows,hip,cone,dome,flag,poly,P}=H; const w=d.w,h=d.h,t=b.t,lv=b.lv; const nf=(NF[t]||2)+(lv>=3&&(t==='classroom'||t==='dorm')?1:0); const FHt=22,Ht=nf*FHt+3; const zmax=Ht+120,pad=16; const cv=document.createElement('canvas'); const W=(w+h)*HW+pad*2,Hh=(w+h)*HH+zmax+pad*2; cv.width=W; cv.height=Hh; const c=cv.getContext('2d'); const o={x:h*HW+pad,y:zmax+pad};
  let wall=WALL[t]||'#f6ecd6', roof=ROOF[t]||'#d9784a', trim='#fffaf0'; if(ctx.stage<=1){ wall=mix(wall,'#d9b88a',.35); trim='#f1e2c2'; } if(ctx.stage>=4){ wall=mix(wall,'#e4f1ee',.5); roof=mix(roof,'#8fd0c4',.35); }
  if(dec>=1){ wall=mix(wall,'#9a8c74',dec===1?.25:.45); roof=mix(roof,'#58524c',dec===1?.25:.45); trim=mix(trim,'#a89d86',.3); }
  const line='rgba(110,78,50,.30)';
  // 影與石基
  c.fillStyle='rgba(30,50,20,.18)'; poly(c,[P(o,w+.1,0,0),P(o,w+1.2,1.1,0),P(o,w+1.1,h+1.1,0),P(o,w+.1,h,0)]); poly(c,[P(o,0,h+.1,0),P(o,w,h+.1,0),P(o,w+1.1,h+1.1,0),P(o,1.1,h+1.1,0)]);
  box(c,o,-.08,-.08,w+.08,h+.08,0,3,dec>=2?'#a8a290':'#d8d2c0',{line});
  // 主體
  box(c,o,0,0,w,h,3,Ht,wall,{line,top:sh(wall,14),left:sh(wall,0),right:sh(wall,-30)});
  // 樓層飾帶與窗
  for(let f=0;f<nf;f++){ const z0=3+f*FHt; if(f>0){ box(c,o,-.03,-.03,w+.03,h+.03,z0-1,z0+1.4,trim,{line}); }
    const zw0=z0+(f===0?7:5), zw1=z0+FHt-5; const nl=Math.max(2,Math.round(w*1.5)), nr=Math.max(2,Math.round(h*1.5)); const skipDoor=f===0;
    if(t==='library'&&f===1){ for(let i=0;i<Math.max(2,Math.round(w)); i++){ const a=.25+i*(w-.5)/Math.max(2,Math.round(w)); win(c,o,'L',h,a,a+.5,zw0-2,zw1+1,'#b9dff0'); } } else if(!skipDoor) windows(c,o,'L',h,.2,w-.2,zw0,zw1,nl,'#bfe3f2',dec); else { const dw=.55,dc=w/2; const lp=w/2; const n1=Math.max(1,Math.floor((dc-dw/2-.15)/.55)); for(let i=0;i<n1;i++){ const a=.2+i*(dc-dw/2-.3)/n1; win(c,o,'L',h,a,a+(dc-dw/2-.3)/n1-.1,zw0,zw1,'#bfe3f2',{dark:dec>=2&&i%2}); } for(let i=0;i<n1;i++){ const a=dc+dw/2+.1+i*(w-dc-dw/2-.3)/n1; win(c,o,'L',h,a,a+(w-dc-dw/2-.3)/n1-.1,zw0,zw1,'#bfe3f2',{dark:dec>=2&&i%2}); } }
    windows(c,o,'R',w,.2,h-.2,zw0,zw1,nr,'#a9d4e6',dec);
    // 窗台
    c.strokeStyle='rgba(120,84,60,.35)'; c.lineWidth=1.4; const sa=P(o,.1,h,zw0-.5),sb=P(o,w-.1,h,zw0-.5); c.beginPath(); c.moveTo(sa[0],sa[1]); c.lineTo(sb[0],sb[1]); c.stroke(); }
  // 常春藤與窗板（繪本感）
  { const iv=(fx,fy,face)=>{ const n=7+((hs(fx*9,fy*9,5)*8)|0); for(let i=0;i<n;i++){ const u=face==='L'?fx+hs(i,1,fx+3)*.9:fy; const v=face==='L'?fy:fy+hs(i,1,fx+7)*.9; const z=4+hs(i,2,fy+2)*(Ht*.6); const p=face==='L'?P(o,u,h,z):P(o,w,v,z); c.fillStyle=['#5d9a4a','#74ad58','#4d8840'][i%3]; c.beginPath(); c.ellipse(p[0],p[1],4.6,3.2,hs(i,3,2)*3,0,7); c.fill(); } }; if(dec<2&&hs(b.id,1,1)>.15){ iv(0,h,'L'); iv(w-1,h,'L'); } if(hs(b.id,2,1)>.35) iv(w,0,'R'); }
  // 大門＋雨遮
  const dc=w/2; poly(c,[P(o,dc-.3,h,3),P(o,dc+.3,h,3),P(o,dc+.3,h,19),P(o,dc-.3,h,19)],'#8a5a3a',line); poly(c,[P(o,dc-.26,h,5),P(o,dc-.03,h,5),P(o,dc-.03,h,17),P(o,dc-.26,h,17)],'#bfe3f2'); poly(c,[P(o,dc+.03,h,5),P(o,dc+.26,h,5),P(o,dc+.26,h,17),P(o,dc+.03,h,17)],'#bfe3f2');
  box(c,o,dc-.5,h,dc+.5,h+.32,19,22,roof,{line,top:sh(roof,18)}); box(c,o,dc-.45,h+.02,dc+.45,h+.18,3,5,trim,{line});
  // 屋頂
  const roofType=(t==='gym')?'barrel':(t==='lab'||t==='research'||(t==='classroom'&&lv>=2)||t==='clinic'&&false)?'flat':'hip';
  if(roofType==='hip'){ hip(c,o,0,0,w,h,Ht,Math.min(16,6+Math.min(w,h)*5),roof,.18); if(t==='dorm'||t==='canteen'){ box(c,o,w*.7,h*.25,w*.7+.28,h*.25+.28,Ht+8,Ht+22,trim,{line}); } }
  else if(roofType==='barrel'){ const segs=8,amp=11; for(let i=0;i<segs;i++){ const a0=Math.PI*i/segs,a1=Math.PI*(i+1)/segs; const z0=Ht+Math.sin(a0)*amp,z1=Ht+Math.sin(a1)*amp,y0=h/2-Math.cos(a0)*h/2,y1=h/2-Math.cos(a1)*h/2; poly(c,[P(o,-.06,y0,z0),P(o,w+.06,y0,z0),P(o,w+.06,y1,z1),P(o,-.06,y1,z1)],mix(roof,'#ffffff',.08+i*.05),'rgba(40,60,80,.25)'); } }
  else { box(c,o,-.06,-.06,w+.06,h+.06,Ht,Ht+3,trim,{line}); // 屋頂花園／設備
    if(t==='classroom'){ poly(c,[P(o,.3,.3,Ht+3),P(o,w-.3,.3,Ht+3),P(o,w-.3,h-.3,Ht+3),P(o,.3,h-.3,Ht+3)],'#8fd16a','rgba(60,110,40,.5)'); for(let i=0;i<4;i++){ const q=P(o,.5+hs(i,1,2)*(w-1),.5+hs(i,2,2)*(h-1),Ht+3); c.fillStyle=['#f2a1b4','#f6dc6a','#fff'][i%3]; c.beginPath(); c.arc(q[0],q[1]-2,2.6,0,7); c.fill(); } }
    else { for(let i=0;i<2;i++){ const x=.3+i*(w-.9)/1.2; box(c,o,x,.3,x+.55,h-.3,Ht+3,Ht+6,'#4f7fb8',{line}); } box(c,o,w-.5,h-.5,w-.2,h-.2,Ht+3,Ht+12,'#d8dde0',{line}); }
    // 欄杆
    c.strokeStyle='rgba(120,100,80,.7)'; c.lineWidth=1.2; for(const [x1,y1,x2,y2] of [[0,h,w,h],[w,0,w,h]]){ for(const z of [Ht+7]){ const a=P(o,x1,y1,z),bb=P(o,x2,y2,z); c.beginPath(); c.moveTo(a[0],a[1]); c.lineTo(bb[0],bb[1]); c.stroke(); } } }
  if(t==='dorm'){ for(let f=1;f<nf;f++){ const z=3+f*FHt; box(c,o,.2,h,w-.2,h+.26,z,z+1.6,trim,{line}); c.strokeStyle='rgba(150,110,80,.7)'; c.lineWidth=1; const a=P(o,.2,h+.26,z+6),bb=P(o,w-.2,h+.26,z+6); c.beginPath(); c.moveTo(a[0],a[1]); c.lineTo(bb[0],bb[1]); c.stroke(); } }
  if(t==='canteen'){ for(let i=0;i<Math.round(w*2);i++){ const x=.15+i*(w-.3)/Math.round(w*2); poly(c,[P(o,x,h+.02,18),P(o,x+(w-.3)/Math.round(w*2),h+.02,18),P(o,x+(w-.3)/Math.round(w*2),h+.3,14),P(o,x,h+.3,14)],i%2?'#fffaf0':'#e86a4a'); } }
  if(t==='clinic'){ const p=P(o,w*.5,h,Ht-5); c.fillStyle='#e85a5a'; c.fillRect(p[0]-7,p[1]-2,14,4.4); c.fillRect(p[0]-2.2,p[1]-7,4.4,14); }
  if(t==='audit'){ for(let q=0;q<4;q++){ const x=w*.2+q*w*.2; box(c,o,x,h+.02,x+.14,h+.16,3,Ht,'#fffaf0',{line}); } poly(c,[P(o,w*.12,h+.18,Ht),P(o,w*.88,h+.18,Ht),P(o,w*.5,h+.18,Ht+13)],trim,line); }
  // 鐘塔（等級 3 的主要建築或辦公/行政）
  if((lv>=3&&['classroom','office','admin','library'].includes(t))||t==='admin'||(t==='office'&&lv>=2)){ const tx=w*.5-.3, ty=.2, tz=Ht+(roofType==='hip'?9:3); box(c,o,tx,ty,tx+.6,ty+.6,tz,tz+26,wall,{line}); const fc=P(o,tx+.3,ty+.6,tz+17); c.fillStyle='#fffbe8'; c.strokeStyle='#7a5a3a'; c.lineWidth=1.4; c.beginPath(); c.arc(fc[0],fc[1],6,0,7); c.fill(); c.stroke(); c.beginPath(); c.moveTo(fc[0],fc[1]); c.lineTo(fc[0],fc[1]-4); c.moveTo(fc[0],fc[1]); c.lineTo(fc[0]+3,fc[1]+1); c.stroke(); cone(c,o,tx+.3,ty+.3,tz+26,.46,15,roof); flag(c,o,tx+.3,ty+.3,tz+40,'#e0824f'); }
  if(t==='library'&&lv>=2) dome(c,o,w*.5,h*.45,Ht+3,.7,'#c98a4e');
  // 季節雪、破舊
  if(ctx.season==='winter'){ c.fillStyle='rgba(255,255,255,.85)'; const a=P(o,.05,.05,Ht+(roofType==='flat'?3:14)); c.beginPath(); c.ellipse(a[0]+HW*(w-h)/2,a[1]+ (w+h)*HH*.5-4,(w+h)*HW*.32,5,0,0,7); c.fill(); }
  if(dec>=1){ c.strokeStyle='rgba(80,55,35,.5)'; c.lineWidth=1.2; for(let i=0;i<4+dec*4;i++){ const p=P(o,hs(i,1,9)*w,h,6+hs(i,2,9)*(Ht-10)); c.beginPath(); c.moveTo(p[0],p[1]); c.lineTo(p[0]+3,p[1]+6); c.lineTo(p[0]-2,p[1]+11); c.stroke(); } if(dec>=2){ c.fillStyle='rgba(70,120,50,.55)'; for(let i=0;i<14;i++){ const p=P(o,hs(i,3,9)*w,h+.02,4+hs(i,4,9)*14); c.beginPath(); c.arc(p[0],p[1],3+hs(i,5,9)*3,0,7); c.fill(); } } }
  const r={cv,ox:o.x,oy:o.y}; cache.set(key,r); return r; }
})(typeof window!=='undefined'?window:globalThis);
