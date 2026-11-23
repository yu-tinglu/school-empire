/* 啟動畫面 + 檢查更新 */
(function(r){ const SE=r.SE=r.SE||{}; const d=r.document; if(!d) return;
const num=v=>parseFloat(v)||0;
const U=SE.update={latest:null};
U.apply=()=>{ const go=()=>{ location.replace(location.pathname+'?v='+encodeURIComponent(U.latest||Date.now())); };
  try{ if(r.caches&&caches.keys) caches.keys().then(ks=>Promise.all(ks.map(k=>caches.delete(k)))).then(go,go); else go(); }catch(e){ go(); } };
U.check=(manual)=>fetch('version.json?t='+Date.now(),{cache:'no-store'}).then(x=>x.json()).then(j=>{
  U.latest=j.version; const newer=num(j.version)>num(SE.APPVER); U.show(newer,manual); return newer; }).catch(()=>{ U.show(false,manual,true); return false; });
U.show=(newer,manual,err)=>{ const b=d.getElementById('spUpd'); if(!b) return;
  if(newer){ b.className='sp-upd new'; b.innerHTML='發現新版本 '+U.latest+'　<u>點此更新</u>'; b.onclick=e=>{ e.stopPropagation(); U.apply(); }; }
  else{ b.className='sp-upd'; b.textContent=err?(manual?'無法檢查更新（請確認網路）':''):(manual?'已是最新版本':''); b.onclick=null; } };
function init(){ const sp=d.getElementById('spl'); if(!sp) return;
  d.getElementById('spVer').textContent='v'+SE.APPVER; d.getElementById('spCp').textContent=SE.COPYRIGHT;
  const rb=d.getElementById('spRot'); const rs=()=>{ rb.textContent=(SE.rot&&SE.rot.on)?'':''; rb.textContent=(localStorage.getItem('se_rot')==='0')?'開啟自動旋轉':'關閉自動旋轉'; }; try{ rs(); rb.addEventListener('click',e=>{ e.stopPropagation(); SE.rot&&SE.rot.toggle(); rs(); }); }catch(e){}
  // 長按版本號：顯示診斷資訊（回報畫面問題用）
  let lp=0; const vb=d.getElementById('spVer'); const dg=()=>{ let x=d.getElementById('diag'); if(x){ x.remove(); return; } x=d.createElement('div'); x.id='diag'; const m=SE.metrics||{}; x.textContent=['v'+SE.APPVER,'inner '+m.iw+'x'+m.ih,'usable '+m.W+'x'+m.H,'safe T'+m.T+' R'+m.R+' B'+m.B+' L'+m.L,'rot '+m.rot+'  uw/uh '+m.uw+'/'+m.uh,'dpr '+m.dpr+'  standalone '+m.standalone,'ua '+navigator.userAgent.slice(-40),'(點此關閉)'].join('\n'); x.onclick=()=>x.remove(); d.body.appendChild(x); };
  vb.addEventListener('touchstart',()=>{ lp=setTimeout(dg,600); },{passive:true}); ['touchend','touchmove'].forEach(t=>vb.addEventListener(t,()=>clearTimeout(lp),{passive:true})); vb.addEventListener('dblclick',dg);
  let closed=false; const close=()=>{ if(closed) return; closed=true; sp.classList.add('out'); setTimeout(()=>sp.remove(),500); };
  sp.addEventListener('click',close); sp.addEventListener('touchend',e=>{ e.preventDefault(); close(); },{passive:false});
  U.check(false); }
d.addEventListener('visibilitychange',()=>{ if(!d.hidden) U.check(false); });
if(d.readyState==='loading') d.addEventListener('DOMContentLoaded',init); else init();
// 像一般 App：禁止雙指縮放、雙擊放大、長按選單
['gesturestart','gesturechange','gestureend'].forEach(t=>d.addEventListener(t,e=>e.preventDefault()));
let lt=0; d.addEventListener('touchend',e=>{ const n=Date.now(); if(n-lt<300&&!/INPUT|TEXTAREA|SELECT/.test((e.target.tagName||''))) e.preventDefault(); lt=n; },{passive:false});
d.addEventListener('contextmenu',e=>{ if(!/INPUT|TEXTAREA/.test(e.target.tagName||'')) e.preventDefault(); });
})(typeof window!=='undefined'?window:globalThis);
