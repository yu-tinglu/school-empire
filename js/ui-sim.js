// 活校園的 UI 端：動畫迴圈、時間控制、人物繪製與點擊、資訊卡、關注清單。
(function(root){
'use strict';
const SE=root.SE, {D,CS}=SE, UI=SE.UI, ART=SE.ART, M=UI.map, HW=ART.HW, HH=ART.HH, esc=UI.esc;
const CUT=['classroom','lab','library','dorm','canteen','clinic','workshop','research'];
M.speed=1; M.observe=false; try{ M.quality=localStorage.getItem('se_q')||'std'; }catch(_){ M.quality='std'; } M.showPeople=true;
const simOf=(g,s)=>{ if(!g.day) g.day={d:0,m:450}; if(!g._sim||g._sim.sid!==s.id||g._sim.q!==M.quality){ CS.init(g,s,M.quality); } return g._sim; };
M.sim=()=>{ const g=UI.g,s=UI.cur(); return g&&s?simOf(g,s):null; };
const REF=(root.matchMedia&&root.matchMedia('(prefers-reduced-motion: reduce)').matches);
// 人物 → 可繪製物
M.extra=sc=>{ const g=UI.g,s=UI.cur(); if(!g||!s||!M.showPeople) return null; const sim=simOf(g,s); const out=[]; const stage=sc.stage, t=M.tAnim||0; const z=M.cam?M.cam.z:1;
  const W=M.cv.clientWidth,H=M.cv.clientHeight; const vx0=M.cam.cx-W/2/z-60,vx1=M.cam.cx+W/2/z+60,vy0=M.cam.cy-H/2/z-80,vy1=M.cam.cy+H/2/z+80;
  for(const p of sim.people){ if(p.home) continue; let bd=null; if(p.inside){ if(!CUT.includes(p.inside.t)) continue; bd=p.inside; if(bd.prog>0||M.xray!==bd.id) continue; }
    const X=(p.x-p.y)*HW,Y=(p.x+p.y)*HH; if(X<vx0||X>vx1||Y<vy0||Y>vy1) continue; const src=p.src; if(!p.look){ p.look=ART.lookOf(src,p.kind,s,stage); } const sh=ART.chibiSheet(p.look); const pose=CS.pose(p,t); const sitting=p.inside&&['study','work','rest'].includes(p.act); const pz=sitting?(p.act==='study'?'study':p.act==='work'?'work':'rest'):(p.act==='sit'&&!p.path.length?'sit':(p.act==='talk'&&!p.path.length?'talk':pose)); const fr=ART.frameOf(pz==='stay'?'idle':pz,t+p.phase,p.dir); const flip=p.face<0; const SC=.66; const md=p.kind==='s'?src.mood:src.sat; const idleOut=!p.path.length&&!p.inside; const emo=md<30?'sad':md>85?'happy':null; const fr2=(emo&&idleOut&&pz==='stay')?ART.frameOf(emo,0,0):fr;
    const e={k:'p',id:p.id,p,draw(c){ const dx=X-sh.ax*SC, dy=Y-sh.ay*SC-(p.inside?0:0); c.save(); if(M.watching&&(g.watch||[]).includes(p.id)||M.selP===p.id){ c.strokeStyle=M.selP===p.id?'#C9A14B':'#76bfe0'; c.lineWidth=2.4; c.beginPath(); c.ellipse(X,Y,10,4.6,0,0,7); c.stroke(); } if(flip){ c.translate(X,0); c.scale(-1,1); c.translate(-X,0); } c.drawImage(sh.cv,fr2*sh.fw*(sh.q||1),0,sh.fw*(sh.q||1),sh.fh*(sh.q||1),dx,dy,sh.fw*SC*(p.look.h||1),sh.fh*SC*(p.look.h||1)); c.restore(); { const g2=p.run&&p.path.length?'!':(p.act==='talk'&&!p.path.length&&((M.tAnim*.7+p.phase)%4<1.2))?'…':(emo==='happy'&&idleOut&&((M.tAnim*.5+p.phase)%5<1.4))?'♪':(emo==='sad'&&idleOut)?'…':''; if(g2){ c.save(); c.font='bold 12px sans-serif'; c.textAlign='center'; c.fillStyle='rgba(255,255,255,.95)'; c.strokeStyle='#4a3328'; c.lineWidth=1; const bx=X+8,by=dy-1; c.beginPath(); c.ellipse(bx,by,7,6,0,0,7); c.fill(); c.stroke(); c.fillStyle=g2==='!'?'#c0392b':'#4a3328'; c.fillText(g2,bx,by+4); c.restore(); } } if(M.selP===p.id||(M.hoverP===p.id)){ c.save(); c.font='bold 11px sans-serif'; c.textAlign='center'; const w=c.measureText(src.nm).width+10; c.fillStyle='rgba(32,61,50,.9)'; c.fillRect(X-w/2,dy-14,w,15); c.fillStyle='#F7F2E7'; c.fillText(src.nm,X,dy-3); c.restore(); } },
      hit(Xw,Yw){ return Math.abs(Xw-X)<9&&Yw<Y+4&&Yw>Y-sh.ay*SC*(p.look.h||1)-4; }, onTap(){ UI.act.person({id:p.id}); } };
    if(bd){ const d=D.BLD[bd.t]; e.x0=bd.x; e.y0=bd.y; e.x1=bd.x+d.w; e.y1=bd.y+d.h; e.after=bd.id; e.sub=(p.x+p.y)*.001; } else { e.x0=p.x-.2; e.x1=p.x+.2; e.y0=p.y-.2; e.y1=p.y+.2; }
    out.push(e); } return out; };
// ---------- 迴圈 ----------
let last=0,acc=0,tick=0;
const frameMs=()=>M.quality==='fine'?0:M.quality==='eco'?66:33;
M.stepSim=(realSec)=>{ const g=UI.g,s=UI.cur(); if(!g||!s||!M.speed) return; const sim=simOf(g,s); const h=g.day.m/60; const night=(h<6.5||h>18.5)?CS.NIGHT:1; let gm=Math.min(realSec,.1)*CS.BASE*M.speed*night; let wk=0; while(gm>0){ const st=Math.min(gm,4); const r=CS.step(g,s,st); gm-=st; if(r.days&&g.day.d===0) wk++; } if(wk&&!UI.busy&&!M.weekPending){ M.weekPending=1; const sp=M.speed; M.speed=0; Promise.resolve(UI.advance(1)).finally(()=>{ M.weekPending=0; M.speed=sp; }); } };
M.frame=ts=>{ M._lp=requestAnimationFrame(M.frame); if(!M.cv||!M.cv.isConnected){ cancelAnimationFrame(M._lp); M._lp=0; return; } if(document.hidden){ last=0; return; } if(!last){ last=ts; return; } const dt=ts-last; if(dt<frameMs()) return; last=ts; const g=UI.g; if(!g) return; M.tAnim=(M.tAnim||0)+(REF?0:dt/1000); M.stepSim(dt/1000); if(++tick%45===0){ const s=UI.cur(); if(g._sim) CS.sync(g,s); } M.hour=g.day.m/60; M.draw(); M.hud(); };
M.start=()=>{ if(M._lp) return; last=0; M._lp=requestAnimationFrame(M.frame); };
document.addEventListener('visibilitychange',()=>{ last=0; });
// ---------- HUD ----------
M.hud=()=>{ const nm=document.getElementById('mapname'); const g=UI.g; if(!g.day) g.day={d:0,m:450}; if(nm){ const tx=M.xray?'透視中：點其他建築可切換':'點任一建築 → 樓層與教室'; if(nm.textContent!==tx) nm.textContent=tx; }
  const el=document.getElementById('maphud'); if(!el) return; if(!el.dataset.built){ el.dataset.built=1; const sp=[0,1,2,4,8]; el.innerHTML=`<span class="clk"></span><span class="spd">${sp.map(v=>`<button data-act="spd" data-v="${v}" aria-label="${v?v+'倍速':'暫停'}">${v?v+'×':'⏸'}</button>`).join('')}</span><button data-act="xray" class="xr" aria-label="透視模式">透視</button><select data-chg="quality" aria-label="畫質">${[['fine','精緻'],['std','標準'],['eco','省電']].map(([k,n])=>`<option value="${k}">${n}</option>`).join('')}</select>`; el.addEventListener('pointerdown',e=>e.stopPropagation()); }
  const clk=el.querySelector('.clk'); const ct=CS.DAYN[g.day.d]+' '+CS.clock(g); if(clk.textContent!==ct) clk.textContent=ct; el.querySelectorAll('.spd button').forEach(b=>b.classList.toggle('on',+b.dataset.v===M.speed)); const xr=el.querySelector('.xr'); xr.classList.toggle('on',!!M.xray); const xt=M.xray?'關閉透視':'透視'; if(xr.textContent!==xt) xr.textContent=xt; const sel=el.querySelector('select'); if(document.activeElement!==sel&&sel.value!==M.quality) sel.value=M.quality; };
UI.act.spd=d=>{ M.speed=+d.v; M.hud(); };
UI.chg.quality=v=>{ M.quality=v; try{ localStorage.setItem('se_q',M.quality); }catch(_){} const g=UI.g; if(g) g._sim=null; M.need(); };
// ---------- 人物資訊 ----------
UI.act.person=d=>{ const g=UI.g,s=UI.cur(); const sim=g._sim; const p=sim&&sim.byId.get(+d.id); const src=p?p.src:(s.students.find(x=>x.id===+d.id)||s.staff.find(x=>x.id===+d.id)); if(!src) return; const kind=p?p.kind:(s.staff.includes(src)?'t':'s'); const look=ART.lookOf(src,kind,s,ART.eraStage(g.y)); const img=ART.portrait(look,96); M.selP=src.id; const w=(g.watch||[]).includes(src.id);
  const role=kind==='t'?({p:'校長',d:'主任',a:'行政',t:'教師'}[src.role]||'教職員'):`${src.gr} 年級學生`;
  const act=p?CS.label(g,s,p):'—';
  const rows=kind==='s'?[['心情',src.mood],['學業',src.sc],['學習動機',src.mo],['健康',src.hl]]:[['滿意度',src.sat],['教學',src.teach],['專業',src.prof],['資歷',src.ex+' 年']];
  const rel=(src.rl||[]).slice(0,5).map(r=>{ const o=SE.P.find(g,r[0]); return o?`${esc(o.nm)}（${SE.P.REL[r[1]]||r[1]}）`:''; }).filter(Boolean).join('、')||'尚無明顯關係';
  UI.modal(`<div class="pcard"><img class="ptr" src="${img}" alt="${esc(src.nm)}"><div><h3>${esc(src.nm)}</h3><p class="sm mut">${role}</p><p class="act">${esc(act)}</p></div></div>${rows.map(r=>UI.kv(r[0],typeof r[1]==='number'?Math.round(r[1]):r[1])).join('')}<p class="sm"><b>人際：</b>${esc(rel)}</p><div class="row"><button class="btn sm" data-act="watch" data-id="${src.id}">${w?'取消關注':'☆ 加入關注'}</button><button class="btn sm wal" data-act="locate" data-id="${src.id}">在地圖上定位</button></div>`); M.need(); };
UI.act.watch=d=>{ const g=UI.g; g.watch=g.watch||[]; const id=+d.id,i=g.watch.indexOf(id); if(i>=0) g.watch.splice(i,1); else g.watch.push(id); if(g._sim) CS.sync(g,UI.cur(),true); UI.act.person({id}); };
UI.act.locate=d=>{ const p=UI.g._sim&&UI.g._sim.byId.get(+d.id); UI.closeModal(); if(p&&!p.home&&M.cam){ M.cam.cx=(p.x-p.y)*HW; M.cam.cy=(p.x+p.y)*HH-20; M.cam.z=Math.max(M.cam.z,1.1); M.selP=p.id; M.need(); } else UI.toast('此人目前不在校內'); };
const oldAfter=UI.after.campus; UI.after.campus=()=>{ oldAfter(); M.start(); M.hud(); }; const oldB=UI.after.build; UI.after.build=()=>{ oldB(); M.start(); M.hud(); };
})(typeof window!=='undefined'?window:globalThis);
