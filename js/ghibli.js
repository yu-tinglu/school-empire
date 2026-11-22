// 繪本風（受宮崎駿動畫的氣質啟發：水彩紙質、遼闊天空與積雲、溫暖自然光、風中的花瓣與落葉）。
// 只取風格手法，不使用任何作品的角色、場景或素材。天空與光線隨遊戲時間變化，天氣由日期確定性產生。
(function(root){
'use strict';
const SE=root.SE, UI=SE.UI, M=UI.map, ART=SE.ART, hs=ART.hs;
const hx=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
const mixc=(a,b,t)=>{ const A=hx(a),B=hx(b); return `rgb(${A.map((v,i)=>Math.round(v+(B[i]-v)*t)).join(',')})`; };
const KEYS=[[0,'#0e1a3d','#33407a'],[5,'#2a3566','#6a6fa0'],[6.3,'#7a98d4','#f7b896'],[7.6,'#74b2e8','#fbe3bd'],[10,'#5fa8e6','#d3ecff'],[16,'#68aee8','#e6f0f6'],[17.8,'#6a86c8','#f9b77c'],[19,'#35427e','#e58a6e'],[20.5,'#16224a','#3b4580'],[24,'#0e1a3d','#33407a']];
M.skyCols=h=>{ for(let i=0;i<KEYS.length-1;i++){ const a=KEYS[i],b=KEYS[i+1]; if(h>=a[0]&&h<=b[0]){ const t=(h-a[0])/(b[0]-a[0]); return [mixc(a[1],b[1],t),mixc(a[2],b[2],t)]; } } return [KEYS[0][1],KEYS[0][2]]; };
// 天氣（同一天固定）
M.weather=g=>{ const u=hs(g.abs,g.day?g.day.d:0,71); const m=SE.CAL.monthOf(g.w); const winter=m===12||m<=2; M.cloud=u<.12?.95:u<.35?.6:u<.6?.3:.12; M.fx.rain=u<.12&&!winter; M.fx.snow=u<.14&&winter; return M.cloud; };
let cloudSp=null; const cloud=()=>{ if(cloudSp) return cloudSp; const cv=document.createElement('canvas'); cv.width=220; cv.height=90; const c=cv.getContext('2d'); const blobs=[[60,56,30],[100,44,38],[142,52,32],[84,62,28],[120,64,30],[40,64,20],[168,64,20]]; for(const [x,y,r] of blobs){ const g=c.createRadialGradient(x-r*.3,y-r*.45,r*.1,x,y,r); g.addColorStop(0,'rgba(255,255,255,1)'); g.addColorStop(.7,'rgba(250,252,255,.97)'); g.addColorStop(1,'rgba(176,196,226,.0)'); c.fillStyle=g; c.beginPath(); c.arc(x,y,r,0,7); c.fill(); } const gb=c.createLinearGradient(0,50,0,90); gb.addColorStop(0,'rgba(150,170,205,0)'); gb.addColorStop(1,'rgba(150,170,205,.55)'); c.globalCompositeOperation='source-atop'; c.fillStyle=gb; c.fillRect(0,0,220,90); return cloudSp=cv; };
M.sky=(c,W,H)=>{ const g=UI.g; const h=g.day?g.day.m/60:12; const [top,bot]=M.skyCols(h); const gr=c.createLinearGradient(0,0,0,H); gr.addColorStop(0,top); gr.addColorStop(1,bot); c.fillStyle=gr; c.fillRect(0,0,W,H); const night=h<5.5||h>20.2; const t=performance.now()/1000;
  if(night){ c.fillStyle='rgba(255,255,255,.85)'; for(let i=0;i<60;i++){ const x=hs(i,1,1)*W,y=hs(i,2,1)*H*.6,tw=.5+.5*Math.sin(t*1.5+i); c.globalAlpha=.35+.5*tw; c.fillRect(x,y,1.6,1.6); } c.globalAlpha=1; }
  // 太陽／月亮
  const day=h>=5.8&&h<=18.4; const pr=day?(h-5.8)/12.6:((h+24-18.4)%24)/11.4; const sx=W*(.08+.84*pr),sy=H*(.62-.5*Math.sin(Math.PI*Math.min(1,pr))); const rg=c.createRadialGradient(sx,sy,2,sx,sy,day?110:70); rg.addColorStop(0,day?'rgba(255,244,200,.95)':'rgba(235,240,255,.9)'); rg.addColorStop(.18,day?'rgba(255,230,160,.35)':'rgba(200,215,255,.3)'); rg.addColorStop(1,'rgba(255,230,160,0)'); c.fillStyle=rg; c.fillRect(sx-120,sy-120,240,240); c.fillStyle=day?'#fff6d0':'#f3f6ff'; c.beginPath(); c.arc(sx,sy,day?13:10,0,7); c.fill(); M._sun=[sx,sy,day];
  // 遠山（兩層）
  const hill=(y0,amp,col,ph)=>{ c.fillStyle=col; c.beginPath(); c.moveTo(0,H); for(let x=0;x<=W;x+=12){ c.lineTo(x,y0-amp*(Math.sin(x/130+ph)*.6+Math.sin(x/53+ph*2)*.3+.5)); } c.lineTo(W,H); c.closePath(); c.fill(); };
  const hz=night?.55:day?0:.3; hill(H*.74,38,mixc('#9cc6b0','#27385c',hz+(night?0:0)),1.3); hill(H*.8,30,mixc('#7fb394','#1f3050',hz),4.1);
  // 積雲
  const cl=cloud(),cov=M.cloud==null?.4:M.cloud; const nC=M.quality==='eco'?3:6; const tint=night?.55:(h<7.5||h>17.5)?.25:0; for(let i=0;i<nC;i++){ const sp=(8+i*3)*(1+cov), x=((hs(i,3,3)*W*1.6+t*sp)%(W*1.5+260))-230, y=H*(.06+hs(i,4,3)*.32), s=.7+hs(i,5,3)*.9+cov*.3; c.globalAlpha=(.55+cov*.4)*(night?.5:1); c.drawImage(cl,x,y,220*s,90*s); if(tint&&!night){ c.globalAlpha=tint*.5; c.globalCompositeOperation='source-atop'; } c.globalCompositeOperation='source-over'; } c.globalAlpha=1;
  if(tint&&!night){ c.fillStyle='rgba(255,170,110,.10)'; c.fillRect(0,0,W,H*.6); } };
// 紙質顆粒、暈影、日光、天氣、飄散粒子
let grain=null; const pat=c=>{ if(grain) return grain; const cv=document.createElement('canvas'); cv.width=cv.height=128; const x=cv.getContext('2d'); const id=x.createImageData(128,128); for(let i=0;i<id.data.length;i+=4){ const v=225+Math.random()*30|0; id.data[i]=v; id.data[i+1]=v-3; id.data[i+2]=v-10; id.data[i+3]=255; } x.putImageData(id,0,0); return grain=c.createPattern(cv,'repeat'); };
const P=[]; const spawn=(W,H,i)=>({x:Math.random()*W,y:Math.random()*H,v:.4+Math.random()*.9,s:Math.random()*6.28,r:1.5+Math.random()*2.2});
M.post=(c,W,H,sc)=>{ const g=UI.g; if(!g) return; const h=g.day?g.day.m/60:12; const cov=M.cloud==null?.3:M.cloud; const t=performance.now()/1000;
  // 陰天壓暗
  if(cov>.5){ c.globalCompositeOperation='multiply'; c.fillStyle=`rgba(150,162,185,${(cov-.4)*.35})`; c.fillRect(0,0,W,H); c.globalCompositeOperation='source-over'; }
  // 低角度陽光（光束）
  if(M._sun&&M._sun[2]&&M.quality!=='eco'&&(h<9||h>16.2)&&cov<.7){ const [sx,sy]=M._sun; c.save(); c.globalCompositeOperation='lighter'; for(let i=0;i<5;i++){ const a=1.2+i*.22+Math.sin(t*.25+i)*.04; const g2=c.createLinearGradient(sx,sy,sx+Math.cos(a)*W,sy+Math.sin(a)*W); g2.addColorStop(0,'rgba(255,220,150,.11)'); g2.addColorStop(1,'rgba(255,220,150,0)'); c.fillStyle=g2; c.beginPath(); c.moveTo(sx,sy); c.lineTo(sx+Math.cos(a-.05)*W*1.2,sy+Math.sin(a-.05)*W*1.2); c.lineTo(sx+Math.cos(a+.05)*W*1.2,sy+Math.sin(a+.05)*W*1.2); c.closePath(); c.fill(); } c.restore(); }
  // 粒子
  const season=M._sc?M._sc.season:'summer'; const n=M.quality==='eco'?0:M.quality==='fine'?46:22; while(P.length<n) P.push(spawn(W,H)); P.length=Math.min(P.length,n); const night=h<5.5||h>19.5; const dt=1/30;
  for(const p of P){ p.s+=dt*1.4; const wind=(18+10*Math.sin(t*.4))*dt; if(season==='spring'){ p.x+=wind*p.v*1.4; p.y+=p.v*14*dt+Math.sin(p.s)*.3; c.fillStyle='rgba(250,190,205,.85)'; c.beginPath(); c.ellipse(p.x,p.y,p.r*1.6,p.r*.9,p.s,0,7); c.fill(); }
    else if(season==='autumn'){ p.x+=wind*p.v*1.2; p.y+=p.v*16*dt+Math.sin(p.s)*.4; c.fillStyle=['rgba(214,120,50,.9)','rgba(200,160,50,.9)','rgba(170,80,40,.9)'][(p.r*7|0)%3]; c.beginPath(); c.ellipse(p.x,p.y,p.r*1.8,p.r,p.s,0,7); c.fill(); }
    else if(season==='winter'){ p.x+=wind*p.v*.5; p.y+=p.v*22*dt; c.fillStyle='rgba(255,255,255,.9)'; c.beginPath(); c.arc(p.x,p.y,p.r*.8,0,7); c.fill(); }
    else if(night){ p.x+=Math.sin(p.s*.7)*.4; p.y+=Math.cos(p.s*.5)*.3; const a=.35+.6*Math.abs(Math.sin(p.s)); const gg=c.createRadialGradient(p.x,p.y,0,p.x,p.y,7); gg.addColorStop(0,`rgba(255,246,150,${a})`); gg.addColorStop(1,'rgba(255,246,150,0)'); c.fillStyle=gg; c.fillRect(p.x-7,p.y-7,14,14); }
    else { p.x+=wind*p.v*.7; p.y-=p.v*3*dt; c.fillStyle='rgba(255,236,170,.6)'; c.beginPath(); c.arc(p.x,p.y,p.r*.6,0,7); c.fill(); }
    if(p.x>W+10||p.y>H+10||p.y<-10){ p.x=Math.random()*W*.9-20; p.y=season==='summer'&&!night?H+5:-8; } if(p.x<-30) p.x=W+5; }
  // 暈影與紙質
  const vg=c.createRadialGradient(W/2,H/2,Math.min(W,H)*.35,W/2,H/2,Math.max(W,H)*.75); vg.addColorStop(0,'rgba(60,40,20,0)'); vg.addColorStop(1,'rgba(60,40,20,.22)'); c.fillStyle=vg; c.fillRect(0,0,W,H);
  c.globalAlpha=.10; c.globalCompositeOperation='multiply'; c.fillStyle=pat(c); c.fillRect(0,0,W,H); c.globalAlpha=1; c.globalCompositeOperation='source-over'; };

// ---------- 手繪化後處理（程序化）：筆觸抖動的邊緣、墨線外框、紙張／水彩顆粒 ----------
// 說明：這是對已生成的精靈圖做「像手繪」的處理，不是真正的手繪插畫。要真手繪質感請替換素材（見 ASSETS.md）。
let spk=null; const specks=()=>{ if(spk) return spk; const cv=document.createElement('canvas'); cv.width=cv.height=96; const x=cv.getContext('2d'); for(let i=0;i<900;i++){ x.fillStyle=Math.random()<.5?`rgba(70,50,20,${.03+Math.random()*.07})`:`rgba(255,250,225,${.05+Math.random()*.1})`; const r=.6+Math.random()*1.6; x.beginPath(); x.arc(Math.random()*96,Math.random()*96,r,0,7); x.fill(); } for(let i=0;i<40;i++){ x.strokeStyle=`rgba(80,55,30,${.04+Math.random()*.05})`; x.lineWidth=.8; const a=Math.random()*96,b=Math.random()*96; x.beginPath(); x.moveTo(a,b); x.lineTo(a+10+Math.random()*10,b+10+Math.random()*10); x.stroke(); } return spk=x.createPattern(cv,'repeat'); };
ART.hand=(sp,amp,ink)=>{ const src=sp.cv; const w=src.width,h=src.height; if(!w||!h) return sp; const sc=src.getContext('2d'); let id; try{ id=sc.getImageData(0,0,w,h); }catch(e){ return sp; } const out=new ImageData(w,h); const kk=sp.k&&sp.k<1?1/sp.k:1; const A=(amp||1.2)*kk, s1=Math.random()*9, s2=Math.random()*9; const d=id.data,o=out.data;
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){ const dx=Math.sin(x*.13+y*.07+s1)*Math.cos(y*.11-x*.05+s2)*A, dy=Math.cos(x*.09-y*.12+s2)*Math.sin(y*.1+x*.06+s1)*A; const sx=Math.round(x+dx),sy=Math.round(y+dy); if(sx<0||sy<0||sx>=w||sy>=h) continue; const si=(sy*w+sx)*4,di=(y*w+x)*4; o[di]=d[si]; o[di+1]=d[si+1]; o[di+2]=d[si+2]; o[di+3]=d[si+3]; }
  const base=document.createElement('canvas'); base.width=w; base.height=h; base.getContext('2d').putImageData(out,0,0);
  const res=document.createElement('canvas'); res.width=w; res.height=h; const c=res.getContext('2d');
  // 墨線外框：把輪廓向八個方向各描一次
  const ol=document.createElement('canvas'); ol.width=w; ol.height=h; const oc=ol.getContext('2d'); const r=(ink||1.1)*kk; for(const [dx,dy] of [[r,0],[-r,0],[0,r],[0,-r],[r*.7,r*.7],[-r*.7,r*.7],[r*.7,-r*.7],[-r*.7,-r*.7]]) oc.drawImage(base,dx,dy); oc.globalCompositeOperation='source-in'; oc.fillStyle='rgba(92,60,38,.88)'; oc.fillRect(0,0,w,h);
  c.drawImage(ol,0,0); c.drawImage(base,0,0);
  // 水彩／紙張顆粒（只落在有顏色的區域）＋輕微的色彩不均
  c.globalCompositeOperation='source-atop'; c.fillStyle=specks(); c.fillRect(0,0,w,h); for(let i=0;i<5;i++){ const x=Math.random()*w,y=Math.random()*h,rad=10+Math.random()*26; const g2=c.createRadialGradient(x,y,1,x,y,rad); const warm=Math.random()<.5; g2.addColorStop(0,warm?'rgba(255,225,160,.10)':'rgba(90,130,170,.07)'); g2.addColorStop(1,'rgba(0,0,0,0)'); c.fillStyle=g2; c.fillRect(x-rad,y-rad,rad*2,rad*2); }
  c.globalCompositeOperation='source-over'; return Object.assign({},sp,{cv:res}); };
// 包裝各類精靈：對每個（已快取的）原圖只處理一次
const HM=new WeakMap(); const wrap=(name,amp,ink)=>{ const f=ART[name]; ART[name]=function(){ const r=f.apply(this,arguments); if(!r||!r.cv||M.hand===false||r.external) return r; let h=HM.get(r); if(!h){ h=ART.hand(r,amp,ink); HM.set(r,h); } return h; }; };
wrap('buildingSprite',1.3,1.3); wrap('treeSprite',1.7,1.1); wrap('decorSprite',1.0,1.0);
{ const f=ART.chibiSheet; ART.chibiSheet=function(L){ const r=f.apply(this,arguments); if(!r||!r.cv||M.hand===false) return r; let h=HM.get(r); if(!h){ h=ART.hand(r,.5,.7); HM.set(r,h); } return h; }; }
// 每天更新天氣
const _w=M.weather; let lastD=-1; M.tickWeather=()=>{ const g=UI.g; if(!g||!g.day) return; const k=g.abs*8+g.day.d; if(k!==lastD){ lastD=k; M.weather(g); } };
const _hud=M.hud; M.hud=function(){ M.tickWeather(); return _hud.apply(this,arguments); };
// 事件信件的水彩小圖
ART.vignette=(seed,season)=>{ const key='vg|'+seed+'|'+season; const cache=ART._cs||(ART._cs=new Map()); if(cache.has(key)) return cache.get(key); const cv=document.createElement('canvas'); cv.width=520; cv.height=120; const c=cv.getContext('2d'); const pal={spring:['#9cc8ee','#fbe6e8','#8cc66a','#f6b9c8'],summer:['#5fa8e6','#e4f2ff','#6ab058','#f6dc6a'],autumn:['#8fb4d8','#fbe6c2','#c8a24a','#d0673a'],winter:['#a8c0d8','#f4f6fa','#dfe8e6','#ffffff']}[season]||['#9cc8ee','#e8f4ff','#8cc66a','#fff'];
  const g=c.createLinearGradient(0,0,0,120); g.addColorStop(0,pal[0]); g.addColorStop(1,pal[1]); c.fillStyle=g; c.fillRect(0,0,520,120); c.fillStyle='rgba(255,255,255,.9)'; for(let i=0;i<4;i++){ const x=hs(seed.length,i,1)*480,y=10+hs(i,seed.length,2)*40; for(let k=0;k<4;k++){ c.beginPath(); c.arc(x+k*18,y+(k%2)*5,16-k*2,0,7); c.fill(); } }
  const hill=(y0,col,ph)=>{ c.fillStyle=col; c.beginPath(); c.moveTo(0,120); for(let x=0;x<=520;x+=8) c.lineTo(x,y0-18*Math.sin(x/90+ph)-8*Math.sin(x/31+ph)); c.lineTo(520,120); c.fill(); }; hill(82,mixc(pal[2],'#8fb4a8',.45),1); hill(96,pal[2],3);
  // 校舍剪影與樹
  const bx=330; c.fillStyle='#f3e3c2'; c.fillRect(bx,58,86,34); c.fillStyle='#c8683f'; c.beginPath(); c.moveTo(bx-8,58); c.lineTo(bx+43,36); c.lineTo(bx+94,58); c.closePath(); c.fill(); c.fillStyle='#8fc7e0'; for(let i=0;i<4;i++) c.fillRect(bx+8+i*20,66,12,12); c.fillStyle='#fff3c0'; c.beginPath(); c.arc(bx+43,48,5,0,7); c.fill();
  for(const x of [60,110,450,490]){ c.fillStyle='#6b4a2c'; c.fillRect(x-2,84,4,16); c.fillStyle=mixc(pal[2],pal[3],.25+hs(x,1,1)*.3); c.beginPath(); c.arc(x,76,13,0,7); c.arc(x-9,84,9,0,7); c.arc(x+9,84,9,0,7); c.fill(); }
  const u=c.canvas.toDataURL('image/jpeg',.82); cache.set(key,u); return u; };
const _se=UI.showEvent; UI.showEvent=function(id){ _se.apply(this,arguments); const g=UI.g; const box=document.querySelector('#modal .box'); if(box&&!box.querySelector('.vig')){ const e=g.events.pending.find(x=>x.id===id); const mo=SE.CAL.monthOf(g.w); const season=mo>=3&&mo<=5?'spring':mo>=6&&mo<=8?'summer':mo>=9&&mo<=11?'autumn':'winter'; const im=document.createElement('img'); im.className='vig'; im.alt=''; im.src=ART.vignette((e&&e.title)||'x',season); box.insertBefore(im,box.firstChild); } };
})(typeof window!=='undefined'?window:globalThis);
