// Q 版人物（程序化繪製）：精靈圖（走路/坐/讀書/聊天/運動/工作/休息）與半身肖像。
// 素材替換：SE.ART.external['chibi:<key>'] = {img, fw, fh}（見 ASSETS.md）；沒有就用下面的程序化繪製。
(function(root){
'use strict';
const SE=root.SE; const ART=SE.ART=SE.ART||{}; const hs=(a,b,c)=>{ let h=(a*374761393+b*668265263+(c|0)*2147483647)|0; h=(h^(h>>>13))*1274126177|0; return ((h^(h>>>16))>>>0)/4294967296; };
const SKIN=['#fbdcc2','#f4cfae','#e6b98f','#c99468','#9a6a46'], HAIR=['#2b2220','#4a3224','#7a4a2a','#b8863a','#d8b86a','#8a8f94','#3a2a4a','#7a2f2f'], FW=34, FH=54;
const FRN=['idle','w1','w2','bidle','bw1','bw2','sit','study','talk','talk2','ex1','ex2','work','rest','r1','r2','br1','br2','sweep','happy','sad','sitchat','wk0','wk1','wk2','wk3','wk4','wk5','bwk0','bwk1','bwk2','bwk3','bwk4','bwk5','rn0','rn1','rn2','rn3'];
ART.CHIBI={FW,FH,FR:FRN};
// 由真實資料導出外觀（同一人永遠同樣外觀；年齡、年級、身分影響身高與穿著）
ART.lookOf=(p,kind,s,stage)=>{ const id=p.id; const staff=kind==='t'; const st=stage==null?2:stage; const sx=p.sx?1:0; const R=(k,n)=>Math.floor(hs(id,k,1)*n);
  const yr=SE.UI&&SE.UI.g?SE.UI.g.y:2020; const age=staff?(p.by!=null?yr-p.by:35):(p.by!=null?yr-p.by:12); const old=staff&&age>52;
  const uniS=st<=1?'#25324a':st===2?'#203D32':st===3?'#2e4a6a':'#2c5a52'; const uni=staff?['#46506a','#6a4a4a','#4a5a4a','#5a4a6a','#7a6a4a'][id%5]:uniS;
  const role=staff?(p.role==='p'?'principal':p.role==='d'?'lead':p.role==='a'?'admin':'teacher'):'student'; const kid=!staff&&age<=11;
  const h=staff?.97+hs(id,6,1)*.14:Math.min(1.02,.62+Math.max(0,age-5)*.045)+ (hs(id,6,1)-.5)*.08; const w=.9+hs(id,7,1)*.24+(role==='principal'?.06:0);
  return {sx,skin:SKIN[R(2,5)],hair:old?HAIR[5]:HAIR[R(3,HAIR.length)],style:R(4,6),uni,role,kid,acc:R(5,6),face:R(9,3),eye:R(10,3),h:+h.toFixed(2),w:+w.toFixed(2),brow:R(11,3),bag:role==='student'&&R(12,3)>0,era:st}; };
ART.lookKey=l=>[l.sx,l.skin,l.hair,l.style,l.uni,l.role,l.kid?1:0,l.acc,l.face,l.eye,l.h,l.w,l.brow,l.bag?1:0,l.era].join('|');
function rr(c,x,y,w,h,r){ c.beginPath(); c.moveTo(x+r,y); c.arcTo(x+w,y,x+w,y+h,r); c.arcTo(x+w,y+h,x,y+h,r); c.arcTo(x,y+h,x,y,r); c.arcTo(x,y,x+w,y,r); c.closePath(); }
const dk=(h,k)=>{ const n=parseInt(h.slice(1),16); const f=v=>Math.max(0,Math.min(255,v+k)); return `rgb(${f(n>>16)},${f((n>>8)&255)},${f(n&255)})`; };
// 繪製角色：(cx, fy)＝腳底中心。pose 名稱見 FRN；back＝背面
function figure(c,cx,fy,L,pose,back,sc,emo){ sc=sc||1; c.save(); c.translate(cx,fy); c.scale(sc*L.h,sc*L.h); const sit=['sit','study','work','rest','sitchat'].includes(pose); const run=pose==='r1'||pose==='r2'||pose==='br1'||pose==='br2'; const walk=pose==='w1'||pose==='w2'||pose==='bw1'||pose==='bw2'; const ph=(pose.endsWith('1'))?1:(pose.endsWith('2')?-1:0);
  const hr=L.kid?7.9:7.1, bodyH=L.kid?10.5:14, legH=L.kid?7.5:11.5, bw=5.2*L.w; const dy=sit?6:0; const bob=(walk||run)&&ph>0?-1.3:0;
  c.lineJoin='round'; c.lineCap='round'; const out='#8a5a48'; c.strokeStyle=out; c.lineWidth=.9;
  c.fillStyle='rgba(20,30,10,.22)'; c.beginPath(); c.ellipse(0,0,8.5*L.w,3,0,0,7); c.fill();
  if(run){ c.rotate(.12*(back?-1:1)); }
  const pants=L.role==='student'?(L.sx?dk(L.uni,-5):dk(L.uni,-22)):dk(L.uni,-18);
  if(!sit){ const sw=run?4.2:walk?2.6:0; for(const sgn of [-1,1]){ const off=sgn*ph*sw; c.fillStyle=pants; rr(c,sgn*2.7-1.9+off*.5,-legH+(run&&sgn*ph<0?-2.5:0),3.8,legH-(run&&sgn*ph<0?-2.5:0)*.0,1.5); c.fill(); c.stroke(); c.fillStyle=L.role==='student'?'#f4efe4':'#3a2c24'; c.fillRect(sgn*2.7-1.9+off*.5,-2.2,3.8,2.2); c.strokeRect(sgn*2.7-1.9+off*.5,-2.2,3.8,2.2); } }
  else { c.fillStyle=pants; rr(c,-bw+.5,-legH-dy+4.5,bw*2-1,4.2,1.6); c.fill(); c.stroke(); c.fillStyle='#3a2c24'; c.fillRect(-4,-1.8,3,1.8); c.fillRect(1,-1.8,3,1.8); }
  const by=-legH-dy+bob; const topY=by-bodyH;
  const arm=(x,ang,len)=>{ c.save(); c.translate(x,topY+3.2); c.rotate(ang); c.fillStyle=dk(L.uni,-6); rr(c,-1.8,0,3.6,len*.55,1.6); c.fill(); c.stroke(); c.fillStyle=L.skin; rr(c,-1.5,len*.45,3,len*.5,1.4); c.fill(); c.stroke(); c.restore(); };
  let la=ph>0?.55:ph<0?-.55:.1, ra=-la; if(run){ la=ph>0?1.1:-1.1; ra=-la; } if(pose==='talk') ra=-2.4; if(pose==='talk2') ra=-1.8; if(pose==='ex1'){ la=-2.7; ra=2.7; } if(pose==='ex2'){ la=-2.1; ra=-2.1; } if(sit){ la=-.55; ra=.55; } if(pose==='happy'){ la=-2.6; ra=2.6; } if(pose==='sad'){ la=.05; ra=-.05; } if(pose==='sweep'){ la=-.5; ra=-.8; } if(pose==='sitchat'){ ra=-1.9; }
  if(L.bag&&back){ c.fillStyle=L.sx?'#b8523a':'#4a6f8a'; rr(c,-bw+.4,topY+1.5,bw*2-.8,bodyH-1.5,2.4); c.fill(); c.stroke(); }
  arm(-bw-.4,la,L.kid?6.5:8.5);
  const g=c.createLinearGradient(-bw,0,bw,0); g.addColorStop(0,dk(L.uni,18)); g.addColorStop(1,dk(L.uni,-24)); c.fillStyle=g; rr(c,-bw,topY,bw*2,bodyH,3.6); c.fill(); c.stroke();
  if(!back){ if(L.role==='student'){ c.fillStyle='#fffbe8'; c.beginPath(); c.moveTo(-2.8,topY); c.lineTo(0,topY+3.8); c.lineTo(2.8,topY); c.closePath(); c.fill(); c.fillStyle='#b8523a'; c.fillRect(-.9,topY+1.8,1.8,5); if(L.sx){ c.fillStyle=dk(L.uni,-26); c.beginPath(); c.moveTo(-bw,by-3.4); c.lineTo(bw,by-3.4); c.lineTo(bw+1.6,by); c.lineTo(-bw-1.6,by); c.closePath(); c.fill(); } }
    else { c.fillStyle='#fffbe8'; c.fillRect(-1.5,topY+.4,3,5.5); c.fillStyle=L.role==='principal'?'#C9A14B':L.role==='admin'?'#3f8fa8':'#b8523a'; c.fillRect(-.8,topY+1.5,1.6,5.4); if(L.role==='principal'){ c.fillStyle='#C9A14B'; c.fillRect(bw-3,topY+3.4,2.2,2.2); } if(L.acc===4){ c.fillStyle='#d9788a'; c.fillRect(-bw+.5,topY+.6,bw*2-1,2.2); } if(L.role==='teacher'&&L.acc===3){ c.fillStyle='#eef0f0'; rr(c,-bw+.6,topY+4,bw*2-1.2,bodyH-4,2); c.fill(); } } }
  else if(!L.bag){ c.fillStyle=dk(L.uni,-10); c.fillRect(-2.2,topY+2,4.4,6); }
  arm(bw+.4,ra,L.kid?6.5:8.5);
  if(pose==='study'){ c.fillStyle='#fffbe8'; c.strokeStyle=out; rr(c,-4.2,by-7,8.4,5.4,1); c.fill(); c.stroke(); c.fillStyle='#b8523a'; c.fillRect(-.4,by-7,.8,5.4); }
  if(pose==='work'){ c.fillStyle='#eef0f0'; c.strokeStyle=out; rr(c,-5,by-6,10,4.4,1); c.fill(); c.stroke(); c.fillStyle='#3f8fa8'; c.fillRect(-3.4,by-5.2,3.4,2.2); }
  if(pose==='rest'||pose==='sitchat'){ c.fillStyle='#f4efe4'; c.strokeStyle=out; rr(c,bw-.5,by-6.5,3.8,4.2,1); c.fill(); c.stroke(); }
  if(pose==='sweep'){ c.strokeStyle='#8a5a37'; c.lineWidth=1.6; c.beginPath(); c.moveTo(bw+3,topY+3); c.lineTo(bw+8,by); c.stroke(); c.strokeStyle='#d9b45a'; c.lineWidth=3; c.beginPath(); c.moveTo(bw+6,by-.5); c.lineTo(bw+10,by+.2); c.stroke(); c.lineWidth=1.05; c.strokeStyle=out; }
  // 頭
  const frx=hr*[1.04,.96,1.0][L.face]+.6, fry=hr*[1,1.07,.94][L.face]; const hy=topY-fry+3.4+(pose==='ex1'||pose==='happy'?-1.8:0)+(pose==='sad'?1:0); const hg=c.createRadialGradient(-2,hy-3,1,0,hy,hr+2); hg.addColorStop(0,dk(L.skin,10)); hg.addColorStop(1,dk(L.skin,-28));
  const hc=L.hair, hl=dk(L.hair,38), st=L.style;
  c.fillStyle=hc; c.strokeStyle=out; if(st===1||st===5){ rr(c,-frx-1.3,hy-fry*.55,frx*2+2.6,fry*(st===5?2.7:1.9),frx*.8); c.fill(); c.stroke(); } if(st===2){ c.beginPath(); c.ellipse(frx*.95+1,hy+2.5,3.2,6,.25,0,7); c.fill(); c.stroke(); } if(st===3){ for(const sgn of [-1,1]){ c.beginPath(); c.arc(sgn*(frx-.6),hy-fry+.8,3.6,0,7); c.fill(); c.stroke(); } }
  c.fillStyle=hg; c.strokeStyle=out; c.lineWidth=1.15; c.beginPath(); c.ellipse(0,hy,frx,fry,0,0,7); c.fill(); c.stroke(); c.lineWidth=1.05;
  const fringe=()=>{ c.fillStyle=hc; c.strokeStyle=out; c.beginPath(); c.moveTo(-frx-.6,hy-.4); c.bezierCurveTo(-frx-1.2,hy-fry-2.4,frx+1.2,hy-fry-2.4,frx+.6,hy-.4);
    if(st===4){ const pts=[[frx-.8,hy-2],[frx*.55,hy-5.5],[frx*.2,hy-2.6],[-frx*.2,hy-5.8],[-frx*.55,hy-2.4],[-frx+.8,hy-5],[-frx-.6,hy-.4]]; for(const p of pts) c.lineTo(p[0],p[1]); } else if(L.brow===1){ c.bezierCurveTo(frx-1,hy-3,2,hy-5.4,-1,hy-3.4); c.bezierCurveTo(-4,hy-2,-frx+1,hy-2.5,-frx-.6,hy-.4); } else { c.bezierCurveTo(frx-1,hy-3.6,3,hy-4.6,0,hy-3.2); c.bezierCurveTo(-3,hy-4.8,-frx+1,hy-3.6,-frx-.6,hy-.4); } c.closePath(); c.fill(); c.stroke(); c.fillStyle=hl; c.beginPath(); c.ellipse(-2.6,hy-fry+1.8,3,1.2,-.25,0,7); c.fill(); };
  if(back){ c.fillStyle=hc; c.beginPath(); c.ellipse(0,hy-.4,frx,fry,0,0,7); c.fill(); c.stroke(); c.fillStyle=hl; c.beginPath(); c.ellipse(-2,hy-fry*.55,3.5,1.6,-.3,0,7); c.fill(); }
  else { const ey=hy+1.2, eo=[3.1,2.8,3.4][L.eye], eh=[3.9,3.3,4.4][L.eye]; const happy=pose==='happy'||emo==='happy', sad=pose==='sad'||emo==='sad';
    for(const sgn of [-1,1]){ if(happy){ c.strokeStyle='#2a1a14'; c.lineWidth=1.3; c.beginPath(); c.arc(sgn*eo,ey+.6,1.9,Math.PI*1.1,Math.PI*1.9); c.stroke(); c.lineWidth=1.05; } else { c.fillStyle='#2a1a14'; c.beginPath(); c.ellipse(sgn*eo,ey,L.eye===1?1.05:1.25,eh*.44,0,0,7); c.fill(); c.fillStyle='#fff'; c.beginPath(); c.arc(sgn*eo-.35,ey-.8,.5,0,7); c.fill(); } if(L.sx&&!happy){ c.strokeStyle='#2a1a14'; c.lineWidth=.8; c.beginPath(); c.moveTo(sgn*eo+sgn*1.8,ey-1); c.lineTo(sgn*eo+sgn*3,ey-1.9); c.stroke(); c.lineWidth=1.05; } }
    c.fillStyle='rgba(235,120,110,.24)'; for(const sgn of [-1,1]){ c.beginPath(); c.ellipse(sgn*(frx-2.8),ey+2.8,1.8,1.05,0,0,7); c.fill(); } c.strokeStyle='rgba(150,90,70,.7)'; c.lineWidth=.7; c.beginPath(); c.moveTo(-.5,ey+2.2); c.quadraticCurveTo(0,ey+3,.6,ey+2.3); c.stroke(); c.lineWidth=1.05;
    c.strokeStyle='#7a3b2e'; c.lineWidth=.95; c.beginPath(); if(pose==='talk'||pose==='talk2'||pose==='sitchat'){ c.fillStyle='#8a3a30'; c.ellipse(0,ey+4.4,1.5,1.1+(pose==='talk'?.55:0),0,0,7); c.fill(); } else if(happy){ c.fillStyle='#8a3a30'; c.arc(0,ey+3.6,2.1,0,Math.PI); c.fill(); } else if(sad){ c.arc(0,ey+5.2,1.5,Math.PI*1.15,Math.PI*1.85); c.stroke(); c.fillStyle='#9ad4f0'; c.beginPath(); c.ellipse(eo+1.6,ey+3.2,.8,1.3,0,0,7); c.fill(); } else { c.arc(0,ey+3.7,1.4,.25,Math.PI-.25); c.stroke(); }
    fringe();
    if(st===0&&!L.sx){ c.fillStyle=hc; for(const sgn of [-1,1]){ c.beginPath(); c.arc(sgn*(frx-.8),hy-1.6,2.3,0,7); c.fill(); } }
    if(L.acc===1&&L.role!=='student'||L.acc===5&&L.role==='student'){ c.strokeStyle='#5a4030'; c.lineWidth=.95; for(const sgn of [-1,1]){ c.beginPath(); c.arc(sgn*eo,ey,3,0,7); c.stroke(); } c.beginPath(); c.moveTo(-.8,ey); c.lineTo(.8,ey); c.stroke(); }
    if(L.acc===2){ if(L.sx){ c.fillStyle='#d9788a'; c.beginPath(); c.arc(frx*.7,hy-fry+1.4,2.1,0,7); c.fill(); c.beginPath(); c.arc(frx*.7+2.6,hy-fry+2.6,1.7,0,7); c.fill(); } else { c.fillStyle=L.era>=2?'#b8523a':'#25324a'; c.strokeStyle=out; c.beginPath(); c.ellipse(0,hy-fry+2,frx*.9,2.6,0,Math.PI,0); c.fill(); c.stroke(); c.fillRect(-frx*.9,hy-fry+1.6,frx*1.8,1.2); } }
    if(L.acc===3&&L.role==='student'){ c.fillStyle='#d9a22a'; c.fillRect(-frx*.9,hy-fry+3.2,frx*1.8,1.8); } }
  if(L.role==='principal'){ c.fillStyle='#C9A14B'; c.strokeStyle=out; rr(c,-4.2,hy-fry-1.9,8.4,2.5,1); c.fill(); c.stroke(); }
  if(L.role==='admin'&&!back){ c.fillStyle='#3f8fa8'; c.strokeStyle=out; c.beginPath(); c.ellipse(0,hy-fry+1.8,frx*.8,2.3,0,Math.PI,0); c.fill(); c.stroke(); }
  c.restore(); }
ART.figure=figure;
// 精靈圖（依外觀快取）；回傳 {cv,fw,fh,fx(frameIndex)}
ART.chibiSheet=L=>{ const key=ART.lookKey(L); const cache=ART._cs||(ART._cs=new Map()); if(cache.has(key)) return cache.get(key); const ex=ART.external['chibi:'+key]; if(ex){ cache.set(key,ex); return ex; }
  const FR=ART.CHIBI.FR; const cv=document.createElement('canvas'); cv.width=FW*FR.length; cv.height=FH; const c=cv.getContext('2d');
  FR.forEach((n,i)=>{ c.save(); c.beginPath(); c.rect(i*FW,0,FW,FH); c.clip(); figure(c,i*FW+FW/2,FH-4,L,/^rn\d$/.test(n)?(+n[2]&1?'r2':'r1'):/^b?wk\d$/.test(n)?(+n.slice(-1)&1?'w2':'w1'):n==='bidle'?'idle':n==='bw1'?'w1':n==='bw2'?'w2':n==='br1'?'r1':n==='br2'?'r2':n,n[0]==='b',1); c.restore(); }); const r={cv,fw:FW,fh:FH,ax:FW/2,ay:FH-4}; cache.set(key,r); return r; };
ART.frameOf=(pose,t,dir)=>{ const b=dir?1:0; const f=n=>ART.CHIBI.FR.indexOf(n); const k=(t*6|0)&1; if(pose==='walk') return f((b?'bwk':'wk')+(((t*9)|0)%6)); if(pose==='run'&&!b) return f('rn'+(((t*9)|0)%4)); if(pose==='run') return f(b?(((t*9|0)&1)?'br1':'br2'):(((t*9|0)&1)?'r1':'r2')); if(pose==='study') return f('study'); if(pose==='talk') return f(((t*3|0)&1)?'talk':'talk2'); if(pose==='exercise') return f(((t*5|0)&1)?'ex1':'ex2'); if(pose==='work') return f('work'); if(pose==='rest') return f('rest'); if(pose==='sit') return f('sitchat'); if(pose==='sweep') return f('sweep'); if(pose==='happy') return f('happy'); if(pose==='sad') return f('sad'); return f(b?'bidle':'idle'); };
// 半身肖像（大頭＋肩），回傳 dataURL（快取）
ART.portrait=(L,size)=>{ size=size||96; const key='pt|'+ART.lookKey(L)+'|'+size; const cache=ART._cs||(ART._cs=new Map()); if(cache.has(key)) return cache.get(key); const cv=document.createElement('canvas'); cv.width=cv.height=size; const c=cv.getContext('2d'); const bg=c.createLinearGradient(0,0,0,size); bg.addColorStop(0,'#efe6cf'); bg.addColorStop(1,'#d8c9a6'); c.fillStyle=bg; c.fillRect(0,0,size,size); const sc=size/30; c.save(); c.beginPath(); c.rect(0,0,size,size); c.clip(); figure(c,size/2,size*1.2,L,'idle',false,sc*.93); c.restore(); c.strokeStyle='rgba(120,84,59,.6)'; c.lineWidth=2; c.strokeRect(1,1,size-2,size-2); const u=cv.toDataURL('image/png'); cache.set(key,u); return u; };
})(typeof window!=='undefined'?window:globalThis);
