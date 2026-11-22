// 等角（isometric）繪圖：建築、植栽、地面。全部程序化繪製於 canvas，並以快取避免每幀重畫。
// 素材替換接口：SE.ART.external[key] = {img,ox,oy}（見 ASSETS.md），key 例如 'bld:classroom:2'；有提供就優先使用。
(function(root){
'use strict';
const SE=root.SE; const ART=SE.ART=SE.ART||{}; ART.external=ART.external||{};
const HW=32,HH=16; ART.HW=HW; ART.HH=HH;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const hex=h=>{ const n=parseInt(h.slice(1),16); return [n>>16,(n>>8)&255,n&255]; };
const rgb=a=>`rgb(${a[0]|0},${a[1]|0},${a[2]|0})`;
const sh=(h,k)=>rgb(hex(h).map(v=>clamp(v+k,0,255)));
const mix=(a,b,t)=>{ const A=hex(a),B=hex(b); return rgb(A.map((v,i)=>v+(B[i]-v)*t)); };
const hs=(x,y,k)=>{ let h=(x*374761393+y*668265263+(k|0)*2147483647)|0; h=(h^(h>>>13))*1274126177|0; return ((h^(h>>>16))>>>0)/4294967296; };
ART.hs=hs; ART.mix=mix; ART.sh=sh;
ART.iso=(x,y)=>[(x-y)*HW,(x+y)*HH];
ART.eraStage=(year)=>year<1930?0:year<1975?1:year<2005?2:year<2035?3:4;
// 色票（砂岩為主；年代微調）
const PAL=[
  {wall:'#c98a6c',trim:'#ecdcc0',roof:'#58545e',glass:'#a9c6d2',floor:'#d9c9a6',inner:'#efe3c9'},
  {wall:'#e2c288',trim:'#f4e6bd',roof:'#6f7a8c',glass:'#a9c6d2',floor:'#d7c39a',inner:'#f3e8cf'},
  {wall:'#e6cf9c',trim:'#f6ecd0',roof:'#7a8494',glass:'#8fb8cc',floor:'#cfd6d4',inner:'#f1ecdc'},
  {wall:'#ebdcb4',trim:'#fbf3dc',roof:'#8a95a2',glass:'#7ab6cf',floor:'#d4dad6',inner:'#f4f1e6'},
  {wall:'#e4efe9',trim:'#ffffff',roof:'#9fb6b8',glass:'#6fe0cc',floor:'#d6ece6',inner:'#f1fbf8'}];
ART.PAL=PAL;
function P(o,x,y,z){ return [(x-y)*HW+o.x,(x+y)*HH-z+o.y]; }
function poly(c,pts,fill,stroke,lw){ c.beginPath(); for(let i=0;i<pts.length;i++){ const p=pts[i]; i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]); } c.closePath(); if(fill){ c.fillStyle=fill; c.fill(); } if(stroke){ c.strokeStyle=stroke; c.lineWidth=lw||1; c.stroke(); } }
// 立方體：三面（上=最亮、+y 面=中、+x 面=最暗）
function box(c,o,x0,y0,x1,y1,z0,z1,col,opt){ opt=opt||{}; const top=opt.top||sh(col,26),L=opt.left||col,R=opt.right||sh(col,-34),ln=opt.line===undefined?'rgba(60,40,20,.28)':opt.line;
  if(!opt.noLeft) poly(c,[P(o,x0,y1,z0),P(o,x1,y1,z0),P(o,x1,y1,z1),P(o,x0,y1,z1)],L,ln);
  if(!opt.noRight) poly(c,[P(o,x1,y0,z0),P(o,x1,y1,z0),P(o,x1,y1,z1),P(o,x1,y0,z1)],R,ln);
  if(!opt.noTop) poly(c,[P(o,x0,y0,z1),P(o,x1,y0,z1),P(o,x1,y1,z1),P(o,x0,y1,z1)],top,ln);
  if(opt.course&&z1-z0>8){ c.strokeStyle='rgba(90,60,30,.13)'; c.lineWidth=1; for(let z=z0+6;z<z1-1;z+=6){ let a=P(o,x0,y1,z),b=P(o,x1,y1,z); c.beginPath(); c.moveTo(a[0],a[1]); c.lineTo(b[0],b[1]); c.stroke(); a=P(o,x1,y0,z); b=P(o,x1,y1,z); c.beginPath(); c.moveTo(a[0],a[1]); c.lineTo(b[0],b[1]); c.stroke(); } } }
// 窗：face 'L'(+y 面，沿 x) 或 'R'(+x 面，沿 y)
function win(c,o,face,fixed,a,b,z0,z1,col,opt){ opt=opt||{}; const f=(u,z)=>face==='L'?P(o,u,fixed,z):P(o,fixed,u,z); const pts=[f(a,z0),f(b,z0),f(b,z1),f(a,z1)]; poly(c,pts,opt.dark?'#3b3a3a':col,'#6b4a2a',1.2);
  if(!opt.dark){ const m=f((a+b)/2,z0),n=f((a+b)/2,z1); c.strokeStyle='#8a6a42'; c.lineWidth=.9; c.beginPath(); c.moveTo(m[0],m[1]); c.lineTo(n[0],n[1]); c.stroke(); const g=f(a,(z0+z1)/2),h=f(b,(z0+z1)/2); c.beginPath(); c.moveTo(g[0],g[1]); c.lineTo(h[0],h[1]); c.stroke(); c.fillStyle='rgba(255,255,255,.35)'; poly(c,[f(a,z1-(z1-z0)*.45),f(a+(b-a)*.35,z1-(z1-z0)*.45),f(a,z1)],'rgba(255,255,255,.28)'); }
  if(opt.lit){ poly(c,pts,'rgba(255,214,120,.0)'); } }
function windows(c,o,face,fixed,from,to,z0,z1,n,col,dec){ const span=(to-from)/n; for(let i=0;i<n;i++){ const a=from+i*span+span*.2,b=from+(i+1)*span-span*.2; win(c,o,face,fixed,a,b,z0,z1,col,{dark:dec>=2&&hs(i,fixed*10,3)>.35}); } }
function crenel(c,o,x0,y0,x1,y1,z,col,step){ step=step||.34; const sz=.13,hh=5; for(let x=x0;x<x1-sz*.5;x+=step) box(c,o,x,y1-sz,x+sz*1.2,y1,z,z+hh,col,{line:'rgba(60,40,20,.25)'}); for(let y=y0;y<y1-sz*1.5;y+=step) box(c,o,x1-sz,y,x1,y+sz*1.2,z,z+hh,col,{line:'rgba(60,40,20,.25)'}); }
function hip(c,o,x0,y0,x1,y1,zt,rh,col,over){ over=over||.12; x0-=over; y0-=over; x1+=over; y1+=over; const w=x1-x0,h=y1-y0; const ins=Math.min(w,h)/2; let r0,r1; if(w>=h){ const ym=(y0+y1)/2; r0=[x0+ins,ym]; r1=[x1-ins,ym]; } else { const xm=(x0+x1)/2; r0=[xm,y0+ins]; r1=[xm,y1-ins]; }
  const A=(x,y)=>P(o,x,y,zt), B=(x,y)=>P(o,x,y,zt+rh);
  poly(c,[A(x0,y0),A(x1,y0),B(r1[0],r1[1]),B(r0[0],r0[1])],sh(col,-18),'rgba(20,20,30,.35)');
  poly(c,[A(x0,y0),A(x0,y1),B(r0[0],r0[1])],sh(col,-8),'rgba(20,20,30,.35)');
  poly(c,[A(x0,y1),A(x1,y1),B(r1[0],r1[1]),B(r0[0],r0[1])],sh(col,16),'rgba(20,20,30,.35)');
  poly(c,[A(x1,y0),A(x1,y1),B(r1[0],r1[1])],sh(col,-30),'rgba(20,20,30,.35)');
  c.strokeStyle='rgba(255,255,255,.12)'; c.lineWidth=1; for(let k=1;k<4;k++){ const t=k/4; const a=P(o,x0+(r0[0]-x0)*t,y1+(r0[1]-y1)*t,zt+rh*t),b=P(o,x1+(r1[0]-x1)*t,y1+(r1[1]-y1)*t,zt+rh*t); c.beginPath(); c.moveTo(a[0],a[1]); c.lineTo(b[0],b[1]); c.stroke(); } }
function cone(c,o,cx,cy,z,r,h,col){ const base=P(o,cx,cy,z),tip=P(o,cx,cy,z+h); const rx=r*HW*1.3,ry=r*HH*1.3; c.beginPath(); c.moveTo(base[0]-rx,base[1]); c.lineTo(tip[0],tip[1]); c.lineTo(base[0]+rx,base[1]); c.ellipse(base[0],base[1],rx,ry,0,0,Math.PI,false); c.closePath(); const g=c.createLinearGradient(base[0]-rx,0,base[0]+rx,0); g.addColorStop(0,sh(col,20)); g.addColorStop(1,sh(col,-35)); c.fillStyle=g; c.fill(); c.strokeStyle='rgba(20,20,30,.4)'; c.stroke(); }
function tower(c,o,x0,y0,s,h,wall,roof,cren){ box(c,o,x0,y0,x0+s,y0+s,0,h,wall,{course:true}); const hw=s*.28; win(c,o,'L',y0+s,x0+s*.32,x0+s*.68,h*.42,h*.78,'#a9c6d2'); win(c,o,'R',x0+s,y0+s*.32,y0+s*.68,h*.42,h*.78,'#a9c6d2'); if(cren){ box(c,o,x0-.04,y0-.04,x0+s+.04,y0+s+.04,h,h+4,sh(wall,12),{}); crenel(c,o,x0-.04,y0-.04,x0+s+.04,y0+s+.04,h+4,sh(wall,6),.3); } if(roof) cone(c,o,x0+s/2,y0+s/2,cren?h+4:h,s*.62,s*34,roof); }
function dome(c,o,cx,cy,z,r,col){ const p=P(o,cx,cy,z); const rx=r*HW*1.35,ry=rx*.8; const g=c.createRadialGradient(p[0]-rx*.3,p[1]-ry*.9,2,p[0],p[1]-ry*.4,rx*1.2); g.addColorStop(0,'#fff6d8'); g.addColorStop(.35,col); g.addColorStop(1,sh(col,-60)); c.beginPath(); c.ellipse(p[0],p[1],rx,ry*.6,0,0,Math.PI*2); c.fillStyle=sh(col,-50); c.fill(); c.beginPath(); c.moveTo(p[0]-rx,p[1]); c.bezierCurveTo(p[0]-rx,p[1]-ry*1.5,p[0]+rx,p[1]-ry*1.5,p[0]+rx,p[1]); c.closePath(); c.fillStyle=g; c.fill(); c.strokeStyle='rgba(30,30,30,.35)'; c.stroke(); c.fillStyle='#d9b45a'; c.fillRect(p[0]-1.5,p[1]-ry*1.15-9,3,9); }
function flag(c,o,x,y,z,col){ const a=P(o,x,y,z),b=P(o,x,y,z+22); c.strokeStyle='#5a4a3a'; c.lineWidth=1.5; c.beginPath(); c.moveTo(a[0],a[1]); c.lineTo(b[0],b[1]); c.stroke(); c.fillStyle=col; c.beginPath(); c.moveTo(b[0],b[1]); c.lineTo(b[0]+13,b[1]+3); c.lineTo(b[0],b[1]+8); c.closePath(); c.fill(); }
ART._h={furniture:(...a)=>furniture(...a),box,win,windows,hip,cone,dome,flag,tower,poly,P,crenel,sh,mix};
// ---------- 內部佈局（建築圖與人物坐位共用） ----------
ART.layout=(t,w,h)=>{ const seats=[]; const out={seats,items:[]}; const T=.16; // 牆厚
  if(t==='classroom'){ const rows=Math.max(2,Math.floor((h-.5)/.55)),cols=Math.max(2,Math.floor((w-.9)/.62)); for(let r=0;r<rows;r++) for(let q=0;q<cols;q++){ const x=T+.5+q*(w-T-.9)/cols,y=T+.35+r*(h-T-.6)/rows; out.items.push(['desk',x,y]); seats.push([x+.28,y+.55]); } out.items.push(['board']); }
  else if(t==='lab'||t==='research'||t==='workshop'){ const n=Math.max(2,Math.floor((w-.5)/.7)); for(let q=0;q<n;q++){ const x=T+.3+q*(w-T-.5)/n; out.items.push(['bench',x,h*.5]); seats.push([x+.35,h*.5+.7]); } out.items.push(['cabinet']); }
  else if(t==='library'){ const n=Math.max(2,Math.floor((w-.5)/.55)); for(let q=0;q<n;q++) out.items.push(['shelf',T+.2+q*(w-T-.4)/n,T]); out.items.push(['table',w*.4,h*.62]); seats.push([w*.4+.2,h*.62+.45],[w*.4+.7,h*.62+.45],[w*.4+.2,h*.62-.1]); }
  else if(t==='canteen'){ const cols=Math.max(2,Math.floor((w-.4)/.8)); for(let q=0;q<cols;q++) for(let r=0;r<2;r++){ const x=T+.3+q*(w-T-.4)/cols,y=T+.5+r*(h-T-.6)/2; out.items.push(['dtable',x,y]); seats.push([x+.1,y+.45],[x+.6,y+.45]); } out.items.push(['counter']); }
  else if(t==='dorm'){ const n=Math.max(2,Math.floor((w-.4)/.62)); for(let q=0;q<n;q++){ const x=T+.25+q*(w-T-.4)/n; out.items.push(['bed',x,T+.1]); seats.push([x+.2,T+.55]); out.items.push(['bed',x,h-.7]); seats.push([x+.2,h-.15]); } }
  else if(t==='clinic'){ out.items.push(['cot',.4,.3]); seats.push([.5,.7]); out.items.push(['cabinet']); }
  return out; };
function furniture(c,o,L,era,dec){ const wood='#9a6a40',wd=dec>=2?'#6e5a48':wood; for(const it of L.items){ const k=it[0],x=it[1],y=it[2];
    if(k==='desk'){ box(c,o,x,y,x+.42,y+.28,0,5,wd,{line:'rgba(40,25,10,.3)'}); box(c,o,x+.12,y+.38,x+.3,y+.52,0,3,'#b8523a',{line:null}); if(era>=2&&dec<2){ box(c,o,x+.1,y+.02,x+.28,y+.14,5,9,'#2c3a46',{line:null}); } }
    else if(k==='bench'){ box(c,o,x,y,x+.6,y+.3,0,6,'#e8ecec',{line:'rgba(40,40,40,.3)'}); box(c,o,x+.1,y+.05,x+.18,y+.13,6,10,'#6fc4e0',{line:null}); box(c,o,x+.35,y+.08,x+.43,y+.16,6,9,'#e0a84a',{line:null}); }
    else if(k==='shelf'){ box(c,o,x,y,x+.42,y+.16,0,17,'#7a5230',{line:'rgba(30,20,10,.4)'}); for(let z=3;z<16;z+=4){ const a=P(o,x+.03,y+.16,z),b=P(o,x+.39,y+.16,z); c.strokeStyle=['#b8523a','#4a7fa8','#d9b45a','#4f8a46'][(z/4|0)%4]; c.lineWidth=2.4; c.beginPath(); c.moveTo(a[0],a[1]); c.lineTo(b[0],b[1]); c.stroke(); } }
    else if(k==='table'||k==='dtable'){ box(c,o,x,y,x+.62,y+.34,0,6,'#b88a58',{line:'rgba(40,25,10,.3)'}); box(c,o,x+.08,y+.4,x+.2,y+.52,0,3,'#6b4226',{line:null}); box(c,o,x+.4,y+.4,x+.52,y+.52,0,3,'#6b4226',{line:null}); }
    else if(k==='bed'){ box(c,o,x,y,x+.5,y+.58,0,4,'#7a5230',{line:'rgba(30,20,10,.35)'}); box(c,o,x+.03,y+.06,x+.47,y+.5,4,6,['#6aa6c4','#d9788a','#8ac47a'][(x*7|0)%3],{line:null}); box(c,o,x+.05,y+.02,x+.4,y+.2,6,8,'#fffbe8',{line:null}); }
    else if(k==='cot'){ box(c,o,x,y,x+.5,y+.6,0,4,'#e8ecec',{}); box(c,o,x+.04,y+.08,x+.46,y+.55,4,5,'#fff',{line:null}); }
    else if(k==='counter'){ box(c,o,.3,.2,Math.min(1.6,.3+1.2),.5,0,7,'#8a5a3a',{}); box(c,o,.5,.2,.9,.35,7,9,'#d9d4c8',{line:null}); }
    else if(k==='cabinet'){ box(c,o,.25,.2,.8,.4,0,14,'#c8c2b2',{}); }
    else if(k==='board'){ /* 黑板在後牆，由牆面繪製 */ } } }
// ---------- 建築 ----------
// ctx: {stage, season}; b: {t,lv,dur,prog}; 回傳 {cv,ox,oy}
ART.buildingSprite=(b,d,ctx)=>{ const dec=b.dur<25?2:b.dur<45?1:0; const key=['bld',b.t,b.lv,dec,ctx.stage,ctx.season,b.prog>0?'c'+Math.min(5,b.prog):''].join(':'); const cache=ART._bc||(ART._bc=new Map()); if(cache.has(key)) return cache.get(key); const ex=ART.external['bld:'+b.t+':'+b.lv]; if(ex){ cache.set(key,ex); return ex; }
  const w=d.w,h=d.h; const zmax=120; const pad=14; const cv=document.createElement('canvas'); const W=(w+h)*HW+pad*2,H=(w+h)*HH+zmax+pad*2; cv.width=W; cv.height=H; const c=cv.getContext('2d'); const o={x:h*HW+pad,y:zmax+pad}; const pal=PAL[ctx.stage]; const t=b.t, lv=b.lv;
  const wall=dec>=1?mix(pal.wall,'#8a7a66',dec===1?.28:.5):pal.wall, trim=dec>=1?mix(pal.trim,'#9a8f7a',.3):pal.trim, roof=dec>=1?mix(pal.roof,'#4a4a48',.3):pal.roof;
  // 基座（石台）
  poly(c,[P(o,-.12,-.12,0),P(o,w+.12,-.12,0),P(o,w+.12,h+.12,0),P(o,-.12,h+.12,0)],dec>=2?'#9a9684':'#cfc8b4','rgba(60,50,30,.3)');
  const shadow=()=>{ c.fillStyle='rgba(20,30,10,.20)'; poly(c,[P(o,w+.1,0,0),P(o,w+.1+1.1,0+1.1,0),P(o,w+1.1,h+1.1,0),P(o,w+.1,h,0)]); poly(c,[P(o,0,h+.1,0),P(o,w,h+.1,0),P(o,w+1.1,h+1.1,0),P(o,1.1,h+1.1,0)]); };
  if(b.prog>0){ const frac=1-clamp(b.prog/d.wk,0,1); const hh=8+30*frac; shadow(); box(c,o,.2,.2,w-.2,h-.2,0,hh,'#d9c9a0',{course:true}); c.strokeStyle='#8a5a37'; c.lineWidth=1.6; for(let q=0;q<=w;q+=.5){ const a=P(o,q,h,0),z=P(o,q,h,hh+16); c.beginPath(); c.moveTo(a[0],a[1]); c.lineTo(z[0],z[1]); c.stroke(); } for(let z=8;z<hh+16;z+=9){ const a=P(o,0,h,z),bq=P(o,w,h,z),cq=P(o,w,0,z); c.beginPath(); c.moveTo(a[0],a[1]); c.lineTo(bq[0],bq[1]); c.lineTo(cq[0],cq[1]); c.stroke(); } c.fillStyle='rgba(255,255,255,.35)'; poly(c,[P(o,0,h,0),P(o,w,h,0),P(o,w,h,hh+16),P(o,0,h,hh+16)]); // 起重機
    const cb=P(o,w-.2,.2,0); c.strokeStyle='#d9a22a'; c.lineWidth=3; c.beginPath(); c.moveTo(cb[0],cb[1]); c.lineTo(cb[0],cb[1]-60); c.lineTo(cb[0]-34,cb[1]-52); c.stroke(); c.lineWidth=1; c.beginPath(); c.moveTo(cb[0]-28,cb[1]-53); c.lineTo(cb[0]-28,cb[1]-30); c.stroke(); const r={cv,ox:o.x,oy:o.y}; cache.set(key,r); return r; }
  shadow();
  const cutT=['classroom','lab','library','dorm','canteen','clinic','workshop','research'].includes(t);
  if(cutT){ const Hh=18+lv*4, tw=.17, low=8; const floorCol=t==='canteen'?'#c9a878':t==='dorm'?'#b89a72':(t==='lab'||t==='research'||t==='clinic')?'#dfe6e4':t==='library'?'#a8805a':pal.floor;
    poly(c,[P(o,tw,tw,0),P(o,w-tw,tw,0),P(o,w-tw,h-tw,0),P(o,tw,h-tw,0)],floorCol,'rgba(60,40,20,.25)');
    if(t!=='library'&&t!=='dorm'){ c.fillStyle='rgba(80,60,40,.10)'; for(let x=tw;x<w-tw;x+=.5) for(let y=tw;y<h-tw;y+=.5) if(((x*2|0)+(y*2|0))%2) poly(c,[P(o,x,y,0),P(o,Math.min(x+.5,w-tw),y,0),P(o,Math.min(x+.5,w-tw),Math.min(y+.5,h-tw),0),P(o,x,Math.min(y+.5,h-tw),0)],'rgba(80,60,40,.10)'); }
    // 後牆（內側可見）
    box(c,o,0,0,w,tw,0,Hh,wall,{course:true,noRight:false}); box(c,o,0,tw,tw,h,0,Hh,wall,{course:true});
    // 內牆面（較亮）
    poly(c,[P(o,tw,tw+.001,0),P(o,w,tw+.001,0),P(o,w,tw+.001,Hh),P(o,tw,tw+.001,Hh)],pal.inner); poly(c,[P(o,tw+.001,tw,0),P(o,tw+.001,h,0),P(o,tw+.001,h,Hh),P(o,tw+.001,tw,Hh)],sh(pal.inner,-22));
    if(t==='classroom'){ poly(c,[P(o,w*.2,tw+.002,6),P(o,w*.6,tw+.002,6),P(o,w*.6,tw+.002,Hh-4),P(o,w*.2,tw+.002,Hh-4)],'#2f4a3e','#7a5230',1.5); }
    windows(c,o,'L',tw+.003,w*.62,w-.1,5,Hh-4,Math.max(1,Math.floor(w*.5)),'#cfe3ea',dec);
    const L=ART.layout(t,w,h); if(dec<2) furniture(c,o,L,ctx.stage,dec); else { box(c,o,.6,.6,1.0,.9,0,4,'#6e5a48',{}); }
    // 前牆（降低）
    box(c,o,0,h-tw,w,h,0,low,wall,{course:false}); box(c,o,w-tw,0,w,h,0,low,wall,{});
    // 外牆窗（前低牆上方矮窗）、柱角
    for(const [cx,cy] of [[0,0],[w,0],[0,h],[w,h]]) box(c,o,cx-.1,cy-.1,cx+.1,cy+.1,0,Hh+3,sh(trim,-6),{});
    box(c,o,-.04,h-tw-.02,w+.04,h+.04,low,low+2.5,trim,{}); box(c,o,w-tw-.02,-.04,w+.04,h+.04,low,low+2.5,trim,{});
    // 招牌色條
    const sg={classroom:'#b8523a',lab:'#3f8fa8',library:'#6a4f7a',dorm:'#c98a2b',canteen:'#d9783a',clinic:'#d6573b',workshop:'#7a7a7a',research:'#3f5a7a'}[t];
    const a=P(o,0,h,low+3),bq=P(o,w,h,low+3),cq=P(o,w,0,low+3); c.strokeStyle=sg; c.lineWidth=3; c.beginPath(); c.moveTo(a[0],a[1]); c.lineTo(bq[0],bq[1]); c.lineTo(cq[0],cq[1]); c.stroke();
    if(t==='clinic'){ const p=P(o,w*.5,h,low+10); c.fillStyle='#d6573b'; c.fillRect(p[0]-6,p[1]-2,12,4); c.fillRect(p[0]-2,p[1]-6,4,12); }
    if(lv>=2){ // 屋頂玻璃採光罩／太陽能板
      if(ctx.stage>=3){ for(let q=0;q<2;q++){ const x=w*.3+q*.5; poly(c,[P(o,x,.05,Hh),P(o,x+.4,.05,Hh),P(o,x+.4,.05,Hh+5),P(o,x,.05,Hh+5)],'#1f3d6a'); } } box(c,o,.06,.06,.42,.42,Hh,Hh+7,wall,{}); cone(c,o,.24,.24,Hh+7,.3,16,roof); }
    if(lv>=3){ crenel(c,o,0,0,w,tw,Hh,sh(wall,10),.34); tower(c,o,w-.4,-.05,.55,Hh+16,wall,roof,true); flag(c,o,.24,.24,Hh+23,'#b8523a'); const ba=P(o,w*.5,h,low+2); }
  } else if(t==='gym'){ const Hh=22+lv*3; box(c,o,0,0,w,h,0,Hh,sh(wall,-6),{course:true}); windows(c,o,'L',h,.3,w-.3,Hh*.55,Hh-4,Math.max(2,w*1.2|0),pal.glass,dec); windows(c,o,'R',w,.3,h-.3,Hh*.55,Hh-4,Math.max(2,h*1.2|0),pal.glass,dec);
    // 弧形屋頂（半圓柱近似）：沿 x 方向 5 段
    const segs=7; for(let i=0;i<segs;i++){ const a0=Math.PI*i/segs,a1=Math.PI*(i+1)/segs; const z0=Hh+Math.sin(a0)*9,z1=Hh+Math.sin(a1)*9,y0=h/2-Math.cos(a0)*h/2,y1=h/2-Math.cos(a1)*h/2; poly(c,[P(o,0,y0,z0),P(o,w,y0,z0),P(o,w,y1,z1),P(o,0,y1,z1)],mix(pal.roof,'#ffffff',.1+i*.06*(dec?0:1)),'rgba(20,20,30,.25)'); }
    if(lv>=2) box(c,o,w*.35,h*.35,w*.65,h*.65,Hh+8,Hh+12,pal.glass,{}); if(lv>=3){ tower(c,o,-.1,h-.5,.6,Hh+14,wall,roof,true); flag(c,o,w-.2,.2,Hh+8,'#3f7a4f'); }
    const dp=P(o,w*.5,h,0); c.fillStyle='#4a2f1a'; poly(c,[P(o,w*.35,h,0),P(o,w*.65,h,0),P(o,w*.65,h,14),P(o,w*.35,h,14)],'#4a3a2a','#2a1a0a');
  } else if(t==='office'||t==='admin'||t==='audit'){ const big=t!=='office'; const f=lv+(big?1:0); const Hh=(big?34:26)+lv*6;
    box(c,o,0,0,w,h,0,Hh,wall,{course:true}); const rows=big?2:1; for(let r=0;r<rows;r++){ windows(c,o,'L',h,.25,w-.25,6+r*Hh*.5,Hh*.5-(r?2:0)+r*Hh*.04,Math.max(2,Math.floor(w*1.4)),pal.glass,dec); windows(c,o,'R',w,.25,h-.25,6+r*Hh*.5,Hh*.5-(r?2:0)+r*Hh*.04,Math.max(2,Math.floor(h*1.4)),pal.glass,dec); }
    box(c,o,-.06,-.06,w+.06,h+.06,Hh,Hh+3,trim,{});
    if(t==='audit'){ for(let q=0;q<4;q++){ const x=w*.2+q*w*.2; box(c,o,x,h+.02,x+.12,h+.14,0,Hh,'#f4ebd0',{}); } poly(c,[P(o,w*.12,h+.16,Hh),P(o,w*.88,h+.16,Hh),P(o,w*.5,h+.16,Hh+12)],trim,'rgba(60,40,20,.35)'); hip(c,o,.05,.05,w-.05,h-.05,Hh+3,13,roof); if(lv>=3) dome(c,o,w*.5,h*.5,Hh+16,.7,'#d9b45a'); }
    else { hip(c,o,.05,.05,w-.05,h-.05,Hh+3,big?17:13,roof); if(lv>=2){ box(c,o,w*.5-.28,h*.5-.28,w*.5+.28,h*.5+.28,Hh+10,Hh+26,wall,{course:true}); cone(c,o,w*.5,h*.5,Hh+26,.4,18,roof); const cp=P(o,w*.5,h*.5+.28,Hh+19); c.fillStyle='#fffbe8'; c.beginPath(); c.arc(cp[0]-4,cp[1],4.2,0,7); c.fill(); c.strokeStyle='#5a4030'; c.stroke(); }
      if(lv>=3){ tower(c,o,-.14,h-.46,.6,Hh+10,wall,roof,true); tower(c,o,w-.46,h-.46,.6,Hh+10,wall,roof,true); flag(c,o,w*.5,h*.5,Hh+36,'#b8523a'); } }
    // 大門
    poly(c,[P(o,w*.5-.28,h,0),P(o,w*.5+.28,h,0),P(o,w*.5+.28,h,15),P(o,w*.5-.28,h,15)],'#5a3b22','#2a1a0a',1.2);
    if(ctx.stage===0){ box(c,o,.2,.15,.38,.33,Hh+3,Hh+16,'#9a5a44',{}); }
  } else if(t==='field'){ poly(c,[P(o,0,0,0),P(o,w,0,0),P(o,w,h,0),P(o,0,h,0)],'#6fae5a','rgba(40,70,30,.4)'); const cx=w/2,cy=h/2; const ell=(rx,ry,col,lw)=>{ c.beginPath(); for(let a=0;a<=Math.PI*2+.1;a+=.15){ const p=P(o,cx+Math.cos(a)*rx,cy+Math.sin(a)*ry,0); a?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]); } c.closePath(); c.fillStyle=col; if(lw){ c.strokeStyle=col; c.lineWidth=lw; c.stroke(); } else c.fill(); };
    ell(w/2-.08,h/2-.08,'#c47a58'); ell(w/2-.5,h/2-.5,'#78b563'); c.strokeStyle='rgba(255,255,255,.9)'; c.lineWidth=1.6; for(const [a,bq] of [[[cx-.8,cy],[cx+.8,cy]]]){ const p=P(o,a[0],a[1],0),q=P(o,bq[0],bq[1],0); c.beginPath(); c.moveTo(p[0],p[1]); c.lineTo(q[0],q[1]); c.stroke(); } box(c,o,cx-.9,cy-.25,cx-.8,cy+.25,0,9,'#f2f2f2',{line:'#999'}); box(c,o,cx+.8,cy-.25,cx+.9,cy+.25,0,9,'#f2f2f2',{line:'#999'}); if(lv>=2){ box(c,o,.1,h-.35,w*.6,h-.1,0,8,'#8a5a37',{}); } if(lv>=3){ flag(c,o,w-.15,.15,0,'#3f7a4f'); }
    if(dec>=1){ c.fillStyle='rgba(140,110,60,.4)'; for(let i=0;i<8;i++){ const p=P(o,hs(i,1,5)*w,hs(i,2,5)*h,0); c.beginPath(); c.ellipse(p[0],p[1],8,4,0,0,7); c.fill(); } }
  } else if(t==='pool'){ poly(c,[P(o,0,0,0),P(o,w,0,0),P(o,w,h,0),P(o,0,h,0)],'#e6dfc6','rgba(60,50,30,.3)'); poly(c,[P(o,.25,.25,0),P(o,w-.25,.25,0),P(o,w-.25,h-.25,0),P(o,.25,h-.25,0)],dec>=2?'#6b8a78':'#4fa6cf','rgba(255,255,255,.7)',1.5); c.strokeStyle='rgba(255,255,255,.6)'; for(let i=1;i<4;i++){ const a=P(o,.3,.25+(h-.5)*i/4,0),bq=P(o,w-.3,.25+(h-.5)*i/4,0); c.beginPath(); c.moveTo(a[0],a[1]); c.lineTo(bq[0],bq[1]); c.stroke(); } box(c,o,w-.3,h*.4,w-.12,h*.4+.15,0,8,'#d9d4c8',{}); }
  else if(t==='parking'){ poly(c,[P(o,0,0,0),P(o,w,0,0),P(o,w,h,0),P(o,0,h,0)],'#8b8d86','rgba(40,40,40,.4)'); c.strokeStyle='rgba(255,255,255,.8)'; c.lineWidth=1.4; for(let i=1;i<w*2;i++){ const a=P(o,i/2,.1,0),bq=P(o,i/2,h*.55,0); c.beginPath(); c.moveTo(a[0],a[1]); c.lineTo(bq[0],bq[1]); c.stroke(); } const cols=['#a8442f','#4a6f8a','#e6e0d0']; for(let i=0;i<Math.min(3,w);i++){ const x=.15+i*1.0; box(c,o,x,.2,x+.35,.62,0,6,cols[i%3],{}); box(c,o,x+.04,.26,x+.31,.5,6,9,'#a9c6d2',{}); } }
  else if(t==='landscape'){ poly(c,[P(o,0,0,0),P(o,w,0,0),P(o,w,h,0),P(o,0,h,0)],dec>=2?'#a89a6a':'#8fc07a','rgba(40,70,30,.35)'); poly(c,[P(o,.35,.35,0),P(o,w-.35,.35,0),P(o,w-.35,h-.35,0),P(o,.35,h-.35,0)],'#d9ccaa'); const fc=P(o,w/2,h/2,0); c.fillStyle='#b9d4de'; c.beginPath(); c.ellipse(fc[0],fc[1],20,10,0,0,7); c.fill(); c.strokeStyle='#d9d4c8'; c.lineWidth=3; c.stroke(); c.fillStyle='#e9f4f8'; c.beginPath(); c.ellipse(fc[0],fc[1]-4,4,6,0,0,7); c.fill(); for(const [x,y] of [[.15,.15],[w-.3,.15],[.15,h-.3],[w-.3,h-.3]]) box(c,o,x,y,x+.15,y+.15,0,7,'#4f8a46',{}); for(let i=0;i<6;i++){ const p=P(o,.4+hs(i,3,3)*(w-.8),.4+hs(i,4,3)*(h-.8),0); c.fillStyle=['#e7a1b4','#f2d36a','#b9a1e7'][i%3]; c.beginPath(); c.arc(p[0],p[1],2.4,0,7); c.fill(); } }
  else { box(c,o,0,0,w,h,0,24,wall,{course:true}); hip(c,o,0,0,w,h,24,12,roof); }
  // 破舊／荒廢覆層
  if(dec>=1&&!['field','pool','parking','landscape'].includes(t)){ c.strokeStyle='rgba(50,35,20,.55)'; c.lineWidth=1.3; for(let i=0;i<4+dec*4;i++){ const p=P(o,hs(i,1,9)*w,h,2+hs(i,2,9)*18); c.beginPath(); c.moveTo(p[0],p[1]); c.lineTo(p[0]+3,p[1]+6); c.lineTo(p[0]-2,p[1]+12); c.stroke(); } if(dec>=2){ c.strokeStyle='#7a5a38'; c.lineWidth=2.6; for(let i=0;i<3;i++){ const a=P(o,w*(.15+i*.28),h,8),bq=P(o,w*(.15+i*.28)+.22,h,18); c.beginPath(); c.moveTo(a[0],a[1]); c.lineTo(bq[0],bq[1]); c.stroke(); } c.fillStyle='rgba(70,110,50,.55)'; for(let i=0;i<14;i++){ const p=P(o,hs(i,3,9)*w,h+.02,hs(i,4,9)*16); c.beginPath(); c.arc(p[0],p[1],3+hs(i,5,9)*3,0,7); c.fill(); } } c.fillStyle='rgba(90,120,60,.7)'; for(let i=0;i<7;i++){ const p=P(o,hs(i,6,9)*w,h+.05,0); c.beginPath(); c.ellipse(p[0],p[1],4,2,0,0,7); c.fill(); } }
  if(dec>=1) { c.fillStyle='rgba(60,50,30,.12)'; c.fillRect(0,0,W,H); c.globalCompositeOperation='destination-in'; c.drawImage(cv,0,0); c.globalCompositeOperation='source-over'; }
  const r={cv,ox:o.x,oy:o.y}; cache.set(key,r); return r; };
// ---------- 植栽與裝飾 ----------
ART.treeSprite=(kind,season,v,dead)=>{ const key=['tr',kind,season,v,dead?1:0].join(':'); const cache=ART._bc||(ART._bc=new Map()); if(cache.has(key)) return cache.get(key); const cv=document.createElement('canvas'); cv.width=84; cv.height=106; const c=cv.getContext('2d'); c.scale(1.18,1.18); const ox=35.5,oy=82;
  c.fillStyle='rgba(20,30,10,.22)'; c.beginPath(); c.ellipse(ox+8,oy+1,16,6,0,0,7); c.fill();
  const cols={spring:['#7fc06a','#94d07a','#f0b0c4'],summer:['#3f8a48','#52a055','#68b565'],autumn:['#d07a2c','#c9a02c','#b8532a'],winter:['#7a8a7e','#8a9a8e','#dfe8e4']}[season];
  c.fillStyle='#6b4a2c'; c.fillRect(ox-3,oy-24,6,24); c.fillStyle='#55391f'; c.fillRect(ox+1,oy-24,2,24);
  if(dead||season==='winter'&&kind!=='cone'){ c.strokeStyle='#5a4128'; c.lineWidth=2; for(const [dx,dy] of [[-12,-40],[0,-48],[12,-38],[-6,-34],[8,-30]]){ c.beginPath(); c.moveTo(ox,oy-22); c.lineTo(ox+dx,oy+dy); c.stroke(); c.lineWidth=1; c.beginPath(); c.moveTo(ox+dx,oy+dy); c.lineTo(ox+dx*1.4,oy+dy-6); c.stroke(); c.lineWidth=2; } if(season==='winter'&&!dead){ c.fillStyle='rgba(255,255,255,.8)'; c.beginPath(); c.ellipse(ox,oy-40,12,4,0,0,7); c.fill(); } cache.set(key,{cv,ox:ox*1.18,oy:oy*1.18}); return cache.get(key); }
  if(kind==='cone'){ for(let i=0;i<4;i++){ const w=11-i*2,y=oy-20-i*13; const g=c.createLinearGradient(ox-w,0,ox+w,0); g.addColorStop(0,sh('#4a7a3a',24)); g.addColorStop(1,sh('#3a6a2e',-30)); c.fillStyle=season==='autumn'&&v%2?'#c9a02c':season==='winter'?'#6a8a74':g; c.beginPath(); c.moveTo(ox,y-18); c.lineTo(ox+w,y); c.lineTo(ox-w,y); c.closePath(); c.fill(); } if(season==='winter'){ c.fillStyle='rgba(255,255,255,.75)'; c.beginPath(); c.moveTo(ox,oy-76); c.lineTo(ox+4,oy-68); c.lineTo(ox-4,oy-68); c.fill(); } }
  else { const blobs=[[0,-46,17],[-13,-37,14],[13,-38,14],[0,-31,15],[-5,-57,12],[-17,-30,10],[17,-31,10],[7,-53,10]]; for(const [dx,dy,r] of blobs){ const g=c.createRadialGradient(ox+dx-r*.3,oy+dy-r*.4,r*.1,ox+dx,oy+dy,r); const col=(kind==='blossom'&&season==='spring')?cols[2]:cols[(dx+dy+v)&1]; g.addColorStop(0,sh(col,38)); g.addColorStop(.7,col); g.addColorStop(1,sh(col,-42)); c.fillStyle=g; c.beginPath(); c.arc(ox+dx,oy+dy,r,0,7); c.fill(); } c.fillStyle='rgba(235,250,170,.35)'; for(let i=0;i<9;i++){ c.beginPath(); c.ellipse(ox-14+hs(i,v,4)*26,oy-62+hs(i,v,5)*30,3.2,1.8,hs(i,v,6)*3,0,7); c.fill(); } c.fillStyle='rgba(20,60,30,.22)'; for(let i=0;i<7;i++){ c.beginPath(); c.ellipse(ox-12+hs(i,v,7)*26,oy-34+hs(i,v,8)*10,3,1.6,0,0,7); c.fill(); } }
  cache.set(key,{cv,ox:ox*1.18,oy:oy*1.18}); return cache.get(key); };
ART.decorSprite=(name,season,extra)=>{ const key='dc:'+name+':'+season+':'+(extra||''); const cache=ART._bc||(ART._bc=new Map()); if(cache.has(key)) return cache.get(key); const cv=document.createElement('canvas'); cv.width=80; cv.height=90; const c=cv.getContext('2d'); const o={x:40,y:62}; const ox=40,oy=62; let wcell=1;
  if(name==='hedge'){ box(c,o,.05,.2,.95,.8,0,9,'#4f8a46',{top:'#68a85a',left:'#4a7e40',right:'#3a6a33',line:'rgba(20,50,20,.4)'}); }
  else if(name==='flowers'){ poly(c,[P(o,.1,.1,0),P(o,.9,.1,0),P(o,.9,.9,0),P(o,.1,.9,0)],'#6b4a2c'); for(let i=0;i<10;i++){ const p=P(o,.15+hs(i,1,2)*.7,.15+hs(i,2,2)*.7,2); c.fillStyle=['#e7a1b4','#f2d36a','#d9788a','#b9a1e7','#fff'][i%5]; c.beginPath(); c.arc(p[0],p[1]-2,2.8,0,7); c.fill(); c.fillStyle='#4f8a46'; c.fillRect(p[0]-.5,p[1],1,3); } }
  else if(name==='bench'){ box(c,o,.2,.35,.8,.55,5,7,'#8a5a37',{}); box(c,o,.22,.38,.28,.52,0,5,'#5a3b22',{line:null}); box(c,o,.72,.38,.78,.52,0,5,'#5a3b22',{line:null}); }
  else if(name==='lamp'){ box(c,o,.45,.45,.55,.55,0,26,'#3a3a3a',{line:null}); c.fillStyle='#ffe9a8'; const p=P(o,.5,.5,30); c.beginPath(); c.arc(p[0],p[1],4.2,0,7); c.fill(); c.strokeStyle='#3a3a3a'; c.stroke(); }
  else if(name==='fountain'){ wcell=2; const q=P(o,1,1,0); c.fillStyle='#d9d4c8'; c.beginPath(); c.ellipse(q[0],q[1],38,19,0,0,7); c.fill(); c.fillStyle='#8fc7dc'; c.beginPath(); c.ellipse(q[0],q[1]-2,32,15.5,0,0,7); c.fill(); c.fillStyle='#e8f4f8'; c.beginPath(); c.ellipse(q[0],q[1]-6,12,6,0,0,7); c.fill(); box(c,o,.9,.9,1.1,1.1,0,14,'#d9d4c8',{}); c.strokeStyle='rgba(255,255,255,.85)'; c.lineWidth=2; for(const a of [-1,0,1]){ c.beginPath(); c.moveTo(q[0],q[1]-24); c.quadraticCurveTo(q[0]+a*14,q[1]-34,q[0]+a*20,q[1]-12); c.stroke(); } }
  else if(name==='weeds'){ c.fillStyle='rgba(120,100,50,.5)'; c.beginPath(); c.ellipse(ox,oy+2,18,7,0,0,7); c.fill(); c.strokeStyle='#7a7a3a'; c.lineWidth=1.5; for(let i=0;i<7;i++){ const x=ox-12+i*4; c.beginPath(); c.moveTo(x,oy+3); c.lineTo(x+(i%2?3:-3),oy-8-hs(i,1,1)*4); c.stroke(); } c.fillStyle='#9a8f7a'; c.fillRect(ox-3,oy,6,3); }
  else if(name==='slide'){ box(c,o,.2,.2,.45,.45,0,16,'#d9a22a',{}); poly(c,[P(o,.45,.25,16),P(o,.7,.25,16),P(o,.95,.7,2),P(o,.7,.7,2)],'#c0392b'); box(c,o,.6,.1,.8,.3,0,2,'#5a8a3a',{line:null}); }
  else if(name==='swing'){ box(c,o,.1,.4,.9,.5,20,23,'#8a5a37',{}); c.strokeStyle='#5a3b22'; c.lineWidth=2; for(const x of [.1,.9]){ const a=P(o,x,.45,0),b=P(o,x,.45,22); c.beginPath(); c.moveTo(a[0],a[1]); c.lineTo(b[0],b[1]); c.stroke(); } c.strokeStyle='#999'; c.lineWidth=1; for(const x of [.4,.6]){ const a=P(o,x,.45,22),b=P(o,x,.45,7); c.beginPath(); c.moveTo(a[0],a[1]); c.lineTo(b[0],b[1]); c.stroke(); } box(c,o,.35,.38,.45,.52,5,7,'#d6573b',{line:null}); box(c,o,.55,.38,.65,.52,5,7,'#4a8ec9',{line:null}); }
  else if(name==='gate'){ wcell=2; for(const x of [-.1,1.9]) box(c,o,x,.4,x+.28,.68,0,30,'#e2c288',{course:true}); box(c,o,.15,.45,1.85,.6,26,29,'#2f5848',{}); c.fillStyle='#fffbe8'; c.font='bold 8px sans-serif'; c.textAlign='center'; const t=P(o,1,.52,22); c.fillText('SCHOOL',t[0],t[1]); }
  else if(name==='sign'){ box(c,o,.45,.45,.55,.55,0,14,'#6b4226',{line:null}); box(c,o,.2,.4,.8,.6,14,24,'#2f5848',{}); }
  cache.set(key,{cv,ox,oy,wcell}); return cache.get(key); };
// ---------- 地面層（快取） ----------
ART.ground=(s,ctx)=>{ const M=6; const lw=s.land.w,lh=s.land.h; const W=(lw+lh+2*M)*HW+8,H=(lw+lh+2*M)*HH+48; const cv=document.createElement('canvas'); cv.width=W; cv.height=H; const c=cv.getContext('2d'); const ox=(lh+M)*HW+4,oy=M*HH+4; // iso(0,0) 在 (ox,oy) 下移
  const pr=ctx.pros; const sea=ctx.season; const G={spring:['#a9d884','#b2dd8c','#a2d27c'],summer:['#8cc96a','#94cf70','#84c262'],autumn:['#cdbd68','#d3c46f','#c4b45e'],winter:['#ecf2f0','#f2f6f4','#e3eae8']}[sea];
  const dry=pr<30?(30-pr)/30:0; const cell=(x,y,col)=>{ const px=(x-y)*HW+ox,py=(x+y)*HH+oy; { const ti=ART._tile&&ART._tile(sea,col==='#e6d9b8'?'path':'grass',x,y); if(ti){ c.drawImage(ti,px-HW-.5,py-.5,2*HW+1,2*HH+1); return; } } c.fillStyle=col; c.beginPath(); c.moveTo(px,py); c.lineTo(px+HW,py+HH); c.lineTo(px,py+2*HH); c.lineTo(px-HW,py+HH); c.closePath(); c.fill(); };
  for(let x=0;x<lw;x++) for(let y=0;y<lh;y++){ const inside=true; const r=hs(x,y,1); let col=G[(r*3|0)%3]; if(!inside) col=mix(col,'#6f9a52',.22); if(sea!=='winter'&&dry>0&&inside) col=mix(col,'#b8a46a',dry*.7); cell(x,y,col); }
  // 水彩暈染：大塊柔邊色斑，蓋掉格線感
  { c.save(); c.beginPath(); for(const [x,y] of [[0,0],[lw,0],[lw,lh],[0,lh]]){ const q=[(x-y)*HW+ox,(x+y)*HH+oy]; c.lineTo(q[0],q[1]); } c.closePath(); c.clip(); const n=22+lw*lh/3|0; for(let i=0;i<n;i++){ const x=hs(i,1,91)*lw,y=hs(i,2,91)*lh; const px=(x-y)*HW+ox,py=(x+y)*HH+oy; const r=40+hs(i,3,91)*70; const g2=c.createRadialGradient(px,py,2,px,py,r); const lite=hs(i,4,91)>.5; g2.addColorStop(0,lite?(sea==='winter'?'rgba(255,255,255,.35)':'rgba(214,240,150,.30)'):(sea==='winter'?'rgba(190,212,228,.16)':'rgba(60,130,80,.20)')); g2.addColorStop(1,'rgba(0,0,0,0)'); c.fillStyle=g2; c.fillRect(px-r,py-r,r*2,r*2); } c.restore(); }
  // 道路
  for(const k of ctx.road){ const [x,y]=k.split(',').map(Number); cell(x,y,'#e6d9b8'); const px=(x-y)*HW+ox,py=(x+y)*HH+oy; c.strokeStyle='rgba(120,90,50,.22)'; c.lineWidth=1; c.beginPath(); c.moveTo(px-HW*.5,py+HH*.5); c.lineTo(px+HW*.5,py+HH*1.5); c.moveTo(px+HW*.5,py+HH*.5); c.lineTo(px-HW*.5,py+HH*1.5); c.stroke(); }
  const pp=(x,y,z)=>[(x-y)*HW+ox,(x+y)*HH+oy-(z||0)];
  { const D=26; const face=(x1,y1,x2,y2,col,col2)=>{ const a=pp(x1,y1),b=pp(x2,y2); c.fillStyle=col; c.beginPath(); c.moveTo(a[0],a[1]); c.lineTo(b[0],b[1]); c.lineTo(b[0],b[1]+D); c.lineTo(a[0],a[1]+D); c.closePath(); c.fill(); c.strokeStyle=col2; c.lineWidth=1; for(let k=1;k<4;k++){ c.beginPath(); c.moveTo(a[0],a[1]+k*D/4); c.lineTo(b[0],b[1]+k*D/4); c.stroke(); } c.fillStyle=sea==='winter'?'#fafcfb':'#7cc45a'; c.beginPath(); c.moveTo(a[0],a[1]); c.lineTo(b[0],b[1]); c.lineTo(b[0],b[1]+5); c.lineTo(a[0],a[1]+5); c.closePath(); c.fill(); }; face(0,lh,lw,lh,'#c98a63','rgba(110,70,45,.35)'); face(lw,lh,lw,0,'#b4764f','rgba(100,60,40,.35)'); }
  // 草叢與小花（只在校地內、非道路）
  for(let x=0;x<lw;x++) for(let y=0;y<lh;y++){ if(ctx.road.has(x+','+y)) continue; const n=2+((hs(x,y,5)*3)|0); for(let i=0;i<n;i++){ const p=pp(x+.15+hs(x,y,10+i)*.7,y+.15+hs(x,y,20+i)*.7); if(sea==='winter'){ c.fillStyle='rgba(255,255,255,.55)'; c.beginPath(); c.ellipse(p[0],p[1],3,1.4,0,0,7); c.fill(); continue; } c.strokeStyle=hs(x,y,30+i)>.5?'rgba(70,120,50,.55)':'rgba(120,160,70,.5)'; c.lineWidth=1.1; c.beginPath(); c.moveTo(p[0]-1.5,p[1]); c.lineTo(p[0]-2.5,p[1]-3.5); c.moveTo(p[0],p[1]); c.lineTo(p[0],p[1]-4.5); c.moveTo(p[0]+1.5,p[1]); c.lineTo(p[0]+2.6,p[1]-3.5); c.stroke(); if(sea==='spring'&&hs(x,y,40+i)>.7){ c.fillStyle=['#fff','#f6d2de','#f4e27a'][i%3]; c.beginPath(); c.arc(p[0]+3,p[1]-1,1.4,0,7); c.fill(); } } }
  // 道路邊緣、石磚紋、廣場
  const R=ctx.road; for(const k of R){ const [x,y]=k.split(',').map(Number); const edge=(dx,dy,a,b2)=>{ if(R.has((x+dx)+','+(y+dy))) return; const q1=pp(a[0],a[1]),q2=pp(b2[0],b2[1]); c.strokeStyle='rgba(120,92,56,.55)'; c.lineWidth=1.8; c.beginPath(); c.moveTo(q1[0],q1[1]); c.lineTo(q2[0],q2[1]); c.stroke(); };
    edge(0,-1,[x,y],[x+1,y]); edge(-1,0,[x,y],[x,y+1]); edge(1,0,[x+1,y],[x+1,y+1]); edge(0,1,[x,y+1],[x+1,y+1]);
    const q=pp(x+.5,y+.5); c.fillStyle='rgba(140,110,70,.18)'; for(let i=0;i<3;i++){ c.beginPath(); c.ellipse(q[0]+(hs(x,y,50+i)-.5)*30,q[1]+(hs(x,y,60+i)-.5)*12,2.2,1.1,0,0,7); c.fill(); } }
  const gxc=ctx.gx!=null?ctx.gx:Math.floor(lw/2); for(let x=gxc-2;x<=gxc+2;x++) for(let y=lh-3;y<lh;y++){ if(!R.has(x+','+y)&&!(ctx.occ&&ctx.occ.has(x+','+y))&&x>=0&&x<lw&&y>=0){ const q=pp(x+.5,y+.5); if((x+y)%2) { c.fillStyle='rgba(235,225,200,.0)'; } } }
  // 圍牆（後兩邊；前兩邊為低矮柵欄，校門留缺口）
  const post=(x,y)=>{ const a=pp(x,y),b=pp(x,y,10); c.strokeStyle='#8a6a42'; c.lineWidth=2.4; c.beginPath(); c.moveTo(a[0],a[1]); c.lineTo(b[0],b[1]); c.stroke(); c.fillStyle='#c9a14b'; c.beginPath(); c.arc(b[0],b[1]-1,1.8,0,7); c.fill(); };
  const rail=(x1,y1,x2,y2,h)=>{ c.strokeStyle='#a98456'; c.lineWidth=1.6; for(const z of [3,7]){ const a=pp(x1,y1,z),b=pp(x2,y2,z); c.beginPath(); c.moveTo(a[0],a[1]); c.lineTo(b[0],b[1]); c.stroke(); } };
  const mesh=(x1,y1,x2,y2)=>{ const n=Math.round(Math.hypot(x2-x1,y2-y1)*2); const dx=(x2-x1)/n,dy=(y2-y1)/n; c.strokeStyle='rgba(70,150,100,.8)'; c.lineWidth=1; for(let i=0;i<=n;i++){ const a=pp(x1+dx*i,y1+dy*i),b=pp(x1+dx*i,y1+dy*i,18); c.beginPath(); c.moveTo(a[0],a[1]); c.lineTo(b[0],b[1]); c.stroke(); if(i<n){ const e=pp(x1+dx*(i+1),y1+dy*(i+1),18),f2=pp(x1+dx*(i+1),y1+dy*(i+1)); c.beginPath(); c.moveTo(a[0],a[1]); c.lineTo(e[0],e[1]); c.moveTo(b[0],b[1]); c.lineTo(f2[0],f2[1]); c.stroke(); } } c.lineWidth=2.4; c.strokeStyle='#4f9a6a'; for(const z of [0,18]){ const a=pp(x1,y1,z),b=pp(x2,y2,z); c.beginPath(); c.moveTo(a[0],a[1]); c.lineTo(b[0],b[1]); c.stroke(); } };
  const brick=(x1,y1,x2,y2)=>{ const a=pp(x1,y1),b=pp(x2,y2),a2=pp(x1,y1,15),b2=pp(x2,y2,15); c.fillStyle=sea==='winter'?'#cfc3ac':'#d8b88a'; c.beginPath(); c.moveTo(a[0],a[1]); c.lineTo(b[0],b[1]); c.lineTo(b2[0],b2[1]); c.lineTo(a2[0],a2[1]); c.closePath(); c.fill(); c.strokeStyle='rgba(90,60,30,.45)'; c.stroke(); c.fillStyle='rgba(255,255,255,.35)'; const t1=pp(x1,y1,15),t2=pp(x2,y2,15),t3=pp(x2,y2,12.5),t4=pp(x1,y1,12.5); c.beginPath(); c.moveTo(t1[0],t1[1]); c.lineTo(t2[0],t2[1]); c.lineTo(t3[0],t3[1]); c.lineTo(t4[0],t4[1]); c.closePath(); c.fill(); };
  mesh(0,0,lw,0); mesh(0,0,0,lh); for(let x=0;x<=lw;x+=3){ const a=pp(x,0),b=pp(x,0,15); c.strokeStyle='rgba(90,60,30,.3)'; c.lineWidth=1; c.beginPath(); c.moveTo(a[0],a[1]); c.lineTo(b[0],b[1]); c.stroke(); } for(let y=0;y<=lh;y+=3){ const a=pp(0,y),b=pp(0,y,15); c.strokeStyle='rgba(90,60,30,.3)'; c.lineWidth=1; c.beginPath(); c.moveTo(a[0],a[1]); c.lineTo(b[0],b[1]); c.stroke(); }
  for(let y=0;y<=lh;y++){ if(y%2===0) post(lw,y); } rail(lw,0,lw,lh); for(let x=0;x<=lw;x++){ if(x>=gxc-.01&&x<=gxc+2.01) continue; if(x%2===0) post(x,lh); } rail(0,lh,gxc,lh); rail(gxc+2,lh,lw,lh);
  return {cv,ox,oy}; };
})(typeof window!=='undefined'?window:globalThis);
