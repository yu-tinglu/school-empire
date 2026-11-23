/* 直向時自動把整個畫面轉成橫向（iOS Safari 無法鎖定方向） */
(function(){
  const root=typeof window!=='undefined'?window:globalThis; if(!root.document) return;
  const SE=root.SE=root.SE||{}; let on=true; try{ on=localStorage.getItem('se_rot')!=='0'; }catch(e){}
  function upd(){
    const w=root.innerWidth,h=root.innerHeight; const st=document.documentElement.style; st.setProperty('--rw',h+'px'); st.setProperty('--rh',w+'px'); st.setProperty('--rvw',(h/100)+'px');
    const r=on && h>w && w<=700;
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
  const setHz=v=>{ hz=v; document.documentElement.style.setProperty('--hz',v); try{localStorage.setItem('se_hz',v);}catch(e){} root.dispatchEvent(new Event('resize')); };
  document.documentElement.style.setProperty('--hz',hz);
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
  if(document.readyState!=='loading') upd(); else document.addEventListener('DOMContentLoaded',upd);
})();
