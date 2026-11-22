// 圖片素材載入系統：assets/manifest.json 描述每一張圖（檔案、錨點、狀態）。
// 有對應圖片就用圖片渲染；沒有的才退回程式暫代繪圖。狀態：final＝正式美術；placeholder＝佔位；（未列入 manifest＝待生成）。
// 替換方式：把正式圖放進 assets/ 同名路徑（或改 manifest 的 src），並把 status 改成 "final"。不需要改程式。
(function(root){
'use strict';
const SE=root.SE, ART=SE.ART||(SE.ART={}); const A=SE.ASSETS={man:null,img:new Map(),base:'assets/'};
const hs=(a,b,c)=>{ let h=(a*374761393+b*668265263+(c|0)*2147483647)|0; h=(h^(h>>>13))*1274126177|0; return ((h^(h>>>16))>>>0)/4294967296; };
let tm=0; A.changed=()=>{ clearTimeout(tm); tm=setTimeout(()=>{ if(ART._bc) ART._bc.clear(); if(ART._cs) ART._cs.clear(); const M=SE.UI&&SE.UI.map; if(M){ M._sc=null; M.need&&M.need(); } if(A.onChange) A.onChange(); },80); };
A.init=()=>fetch(A.base+'manifest.json',{cache:'no-cache'}).then(r=>r.ok?r.json():null).then(m=>{ if(m){ A.man=m; A.changed(); } }).catch(()=>{});
A.entry=k=>A.man&&A.man.assets&&A.man.assets[k];
A.get=k=>{ const e=A.entry(k); if(!e) return null; let r=A.img.get(k); if(r) return r.ok?r.sp:null; r={ok:false}; A.img.set(k,r); const im=new Image(); im.onload=()=>{ const cv=document.createElement('canvas'); cv.width=im.naturalWidth; cv.height=im.naturalHeight; cv.getContext('2d').drawImage(im,0,0); r.ok=true; r.sp={cv,ox:e.ox||0,oy:e.oy||0,k:e.k||1,wcell:e.wcell,external:true,status:e.status,key:k,e}; A.changed(); }; im.onerror=()=>{ r.bad=1; }; im.src=A.base+e.src; return null; };
A.first=keys=>{ for(const k of keys){ const r=A.get(k); if(r) return r; } return null; };
A.summary=()=>{ const s={final:0,placeholder:0,total:0}; if(A.man) for(const k in A.man.assets){ const e=A.man.assets[k]; s[e.status]=(s[e.status]||0)+1; s.total++; } return s; };
// ---- 包裝程式暫代繪圖：圖片優先 ----
const bs=ART.buildingSprite; ART.buildingSprite=function(b,d,ctx){ if(!ctx.cut&&!(b.prog>0)){ const cond=b.dur<25?2:b.dur<45?1:0; const ks=[`bld:${b.t}:${b.lv}:${ctx.stage}:${cond}`,`bld:${b.t}:${b.lv}:any:${cond}`,`bld:${b.t}:${b.lv}:any:0`]; for(let l=b.lv-1;l>=1;l--) ks.push(`bld:${b.t}:${l}:any:0`); const r=A.first(ks); if(r) return r; } return bs.apply(this,arguments); };
const ts=ART.treeSprite; ART.treeSprite=function(kind,season,v,dead){ const r=dead?A.get('tree:dead:any:0'):A.first([`tree:${kind}:${season}:${v%3}`,`tree:${kind}:any:${v%3}`]); return r||ts.apply(this,arguments); };
const ds=ART.decorSprite; ART.decorSprite=function(name,season,extra){ const r=A.first([`decor:${name}:${season}`,`decor:${name}:any`]); return r||ds.apply(this,arguments); };
ART._tile=(season,kind,x,y)=>{ if(!A.man) return null; const v=Math.floor(hs(x,y,5)*3); const r=A.first([`ground:${kind}:${season}:${v}`,`ground:${kind}:${season}:0`,`ground:${kind}:any:0`]); return r?r.cv:null; };
const cs=ART.chibiSheet; ART.chibiSheet=function(L){ if(A.man){ const variant=Math.floor(hs(L.hair.length,L.style,L.skin.length)*3); const role=L.role==='student'?'student':'teacher'; const r=A.first([`char:${role}:${L.sx}:${variant}`,`char:${role}:${L.sx}:0`]); if(r){ const key='x'+r.key; const cache=ART._cs||(ART._cs=new Map()); if(cache.has(key)) return cache.get(key); const e=r.e,FR=ART.CHIBI.FR.length,FW=ART.CHIBI.FW,FH=ART.CHIBI.FH; const cv=document.createElement('canvas'); cv.width=FW*FR; cv.height=FH; const c=cv.getContext('2d'); c.imageSmoothingQuality='high'; c.drawImage(r.cv,0,0,r.cv.width,r.cv.height,0,0,FW*FR,FH); const o={cv,fw:FW,fh:FH,ax:(e.ax||e.fw/2)*FW/e.fw,ay:(e.ay||e.fh-4)*FH/e.fh,external:true,status:e.status}; cache.set(key,o); return o; } } return cs.apply(this,arguments); };
// 人物頭像：用手繪頭像取代程式小人頭像（依外觀雜湊固定選一張，同一人永遠同一張）
A.pcount=(role,sx)=>{ if(!A.man) return 0; let n=0; while(A.man.assets[`portrait:${role}:${sx}:${n}`]) n++; return n; };
const pt=ART.portrait; ART.portrait=function(L,size){ if(A.man&&L){ const role=L.role==='student'?'s':'t', sx=L.sx?1:0, n=A.pcount(role,sx); if(n){ const j=Math.floor(hs(L.hair?L.hair.length:1,L.style||0,(L.h||1)*1000+(L.acc||0)*7+(L.face||0)*13+(L.skin?L.skin.length:0))*n); const r=A.get(`portrait:${role}:${sx}:${j}`); if(r){ size=size||96; const cache=ART._cs||(ART._cs=new Map()); const key=`apt|${role}${sx}${j}|${size}`; if(cache.has(key)) return cache.get(key); const cv=document.createElement('canvas'); cv.width=cv.height=size; const c=cv.getContext('2d'); c.imageSmoothingQuality='high'; c.drawImage(r.cv,0,0,size,size); const u=cv.toDataURL('image/png'); cache.set(key,u); return u; } } } return pt.apply(this,arguments); };
const initP=A.init; A.init=()=>initP().then(()=>{ if(A.man) for(const k in A.man.assets) if(k.startsWith('portrait:')) A.get(k); });
A.init();
})(typeof window!=='undefined'?window:globalThis);
