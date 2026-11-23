/* 直向時自動把整個畫面轉成橫向（iOS Safari 無法鎖定方向） */
(function(){
  const root=typeof window!=='undefined'?window:globalThis; if(!root.document) return;
  const SE=root.SE=root.SE||{}; let on=true; try{ on=localStorage.getItem('se_rot')!=='0'; }catch(e){}
  /* 量測真正可用範圍：fixed 探針（含 env 安全區）取代 innerWidth/Height，避免 iOS 回報值與實際可視不符 */
  let probe=null;
  function mk(){ if(probe||!document.body) return; probe=document.createElement('div');
    probe.style.cssText='position:fixed;left:0;top:0;width:100%;height:100%;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px);box-sizing:border-box';
    document.documentElement.appendChild(probe); }
  const M=SE.metrics={};
  function measure(){ mk(); const vv=root.visualViewport; const de=document.documentElement;
    let W=root.innerWidth,H=root.innerHeight;
    if(probe){ const r=probe.getBoundingClientRect(); if(r.width>50) W=Math.min(W,Math.round(r.width)); if(r.height>50) H=Math.min(H,Math.round(r.height)); }
    if(vv&&vv.height>50) H=Math.min(H,Math.round(vv.height)); if(vv&&vv.width>50) W=Math.min(W,Math.round(vv.width));
    let T=0,R=0,B=0,L=0; if(probe){ const cs=getComputedStyle(probe); T=parseFloat(cs.paddingTop)||0; R=parseFloat(cs.paddingRight)||0; B=parseFloat(cs.paddingBottom)||0; L=parseFloat(cs.paddingLeft)||0; }
    Object.assign(M,{iw:root.innerWidth,ih:root.innerHeight,W,H,T,R,B,L,dpr:root.devicePixelRatio,standalone:!!(navigator.standalone||(root.matchMedia&&matchMedia('(display-mode: standalone)').matches))});
    return M; }
  function upd(){
    const m=measure(); const W=m.W,H=m.H; const st=document.documentElement.style;
    const r=on && H>W && W<=700;
    /* 轉成橫向後：旋轉前的「上/下」安全區變成畫面左/右；可用寬 = H-上-下，可用高 = W-左-右 */
    const uw=r?H-m.T-m.B:W, uh=r?W-m.L-m.R:H;
    st.setProperty('--rw',uw+'px'); st.setProperty('--rh',uh+'px'); st.setProperty('--rvw',(uw/100)+'px'); st.setProperty('--ot',(r?m.T:0)+'px'); st.setProperty('--ol',(r?m.L:0)+'px');
    M.rot=r; M.uw=uw; M.uh=uh;
    const b=document.body; if(!b) return;
    if(b.classList.contains('rot')===r) return;
    b.classList.toggle('rot',r); document.documentElement.classList.toggle('rot',r);
    root.dispatchEvent(new Event('resize'));
  }
  SE.rot={toggle(){ on=!on; try{localStorage.setItem('se_rot',on?'1':'0');}catch(e){} upd(); return on; }, get on(){return document.body.classList.contains('rot');}};
  /* 指標座標換算：旋轉時 canvas 的外框是轉過的 */
  SE.ptr=function(e,cv){ const r=cv.getBoundingClientRect();
    return document.body.classList.contains('rot')?[e.clientY-r.top, r.right-e.clientX]:[e.clientX-r.left,e.clientY-r.top]; };
  const SZ=[.5,.62,.75,.88,1]; let hz=null; try{ hz=parseFloat(localStorage.getItem('se_hz')); }catch(e){}
  if(!(hz>0)) hz=Math.min(root.innerWidth,root.innerHeight)<=500?.62:1;
  const setHz=v=>{ hz=v; document.documentElement.style.setProperty('--hz',v); document.documentElement.style.setProperty('--fz',(0.9+(v-.5)*.4).toFixed(3)); try{localStorage.setItem('se_hz',v);}catch(e){} root.dispatchEvent(new Event('resize')); };
  document.documentElement.style.setProperty('--hz',hz); document.documentElement.style.setProperty('--fz',(0.9+(hz-.5)*.4).toFixed(3));
  SE.hz={cycle(){ const i=SZ.findIndex(x=>Math.abs(x-hz)<.02); setHz(SZ[(i+1)%SZ.length]); return hz; }, get v(){return hz;}};
  /* 旋轉後原生捲動方向不可靠（iOS），自己處理：手指右移=內容往後捲 */
  (function(){ let t=null,last=null,v=0;
    const sc=(el,ax)=>{ for(;el&&el!==document.documentElement;el=el.parentElement){ const cs=getComputedStyle(el); const o=ax==='y'?cs.overflowY:cs.overflowX; if((o==='auto'||o==='scroll'||el===document.body)&&(ax==='y'?el.scrollHeight>el.clientHeight+1:el.scrollWidth>el.clientWidth+1)) return el; } return null; };
    document.addEventListener('touchstart',e=>{ if(!document.body.classList.contains('rot')||e.touches.length!==1) {t=null;return;} const el=e.target; if(el.closest&&el.closest('canvas,.mapwrap,.stage,input,select,textarea,[contenteditable]')){t=null;return;} const q=e.touches[0]; t={x:q.clientX,y:q.clientY,el,m:false}; last=null; },{passive:true});
    document.addEventListener('touchmove',e=>{ if(!t) return; const q=e.touches[0]; const dx=q.clientX-t.x,dy=q.clientY-t.y; t.x=q.clientX; t.y=q.clientY;
      if(!t.m && Math.abs(dx)+Math.abs(dy)<4) return; t.m=true;
      const a=sc(t.el,'y'); if(a&&dx){ a.scrollTop+=dx; } const b=sc(t.el,'x'); if(b&&dy){ b.scrollLeft-=dy; }
      e.preventDefault(); },{passive:false});
  })();
  root.addEventListener('resize',upd); root.addEventListener('orientationchange',()=>setTimeout(upd,120));
  upd(); document.addEventListener('DOMContentLoaded',upd); if(root.visualViewport) root.visualViewport.addEventListener('resize',upd); root.addEventListener('load',upd);
})();
