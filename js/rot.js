/* 直向時自動把整個畫面轉成橫向（iOS Safari 無法鎖定方向） */
(function(){
  const root=typeof window!=='undefined'?window:globalThis; if(!root.document) return;
  const SE=root.SE=root.SE||{}; let on=true; try{ on=localStorage.getItem('se_rot')!=='0'; }catch(e){}
  function upd(){
    const w=root.innerWidth,h=root.innerHeight;
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
  root.addEventListener('resize',upd); root.addEventListener('orientationchange',()=>setTimeout(upd,120));
  if(document.readyState!=='loading') upd(); else document.addEventListener('DOMContentLoaded',upd);
})();
