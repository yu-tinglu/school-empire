// 活校園模擬：遊戲內時鐘 + 日程 + 行為狀態機 + 尋路。純邏輯（可在 Node 測試），不含繪圖。
// 位置不存檔：由 g.day（存檔）與日程推導，讀檔後確定性還原。
(function(root){
'use strict';
const SE=root.SE, D=SE.D; const CS=SE.CS={};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const hs=(a,b,c)=>{ let h=(a*374761393+b*668265263+(c|0)*2147483647)|0; h=(h^(h>>>13))*1274126177|0; return ((h^(h>>>16))>>>0)/4294967296; };
CS.hs=hs;
CS.CAP={fine:90,std:55,eco:24};
CS.SPEEDS=[0,1,2,4,8];
CS.BASE=10;            // 1× = 每真實秒 10 遊戲分鐘
CS.NIGHT=5;            // 夜間（18:30–06:30）壓縮倍率（在同一速度上再加快，避免空等）
// ---------- 日程 ----------
// 區塊 [起分, 迄分, 類型]；類型：home 不在校/arrive/class/lunch/lab/lib/pe/rest/work/leave
CS.schedule=(type,stage,wd)=>{ if(!wd) return [[0,1440,'home']]; const early=['hs','vh','gs','uni'].includes(type)?-30:0, kg=type==='kg'?60:0; const a=450+early+kg; const lunchS=720+(type==='kg'?-30:0);
  const b=[[0,a-20,'home'],[a-20,a,'arrive'],[a,lunchS-(type==='kg'?30:0),'class'],[lunchS,lunchS+60,'lunch'],[lunchS+60,lunchS+60+(stage>=2?100:140),'class'],[lunchS+160,lunchS+200,'rest'],[lunchS+200,lunchS+270,'club'],[lunchS+270,lunchS+290,'leave'],[lunchS+290,1440,'home']];
  // 修正：保證起迄遞增
  const out=[]; let t=0; for(const x of b){ if(x[1]<=x[0]) continue; out.push([Math.max(t,x[0]),x[1],x[2]]); t=x[1]; } return out; };
CS.blockAt=(blocks,m)=>{ for(let i=0;i<blocks.length;i++) if(m>=blocks[i][0]&&m<blocks[i][1]) return i; return blocks.length-1; };
CS.LABEL={home:'在家／離校',arrive:'走進校園',class:'上課中',lunch:'午餐',lab:'實驗課',lib:'在圖書館',pe:'體育課',rest:'課間休息',club:'社團活動',work:'辦公',leave:'放學回家',walk:'走路中'};
// ---------- 地圖與路徑 ----------
const NOWALK=['pool','parking'];
function grid(s){ const lw=s.land.w,lh=s.land.h; const blk=new Set(); for(const b of s.bld){ const d=D.BLD[b.t]; if(['field','landscape'].includes(b.t)) continue; for(let i=0;i<d.w;i++) for(let j=0;j<d.h;j++) blk.add((b.x+i)+','+(b.y+j)); } return {lw,lh,blk}; }
CS.entrance=(b)=>{ const d=D.BLD[b.t]; return [b.x+(d.w>>1),b.y+d.h]; };
// 共用景觀配置（模擬與繪圖同一份）：道路、長椅、樹、可聊天的點
const DM=new WeakMap();
CS.decor=(s,pros)=>{ const sig=s.bld.map(b=>b.id+b.x+','+b.y).join('|')+s.land.w+'x'+s.land.h+'|'+Math.round((pros==null?50:pros)/10); const c=DM.get(s); if(c&&c.sig===sig) return c; const lw=s.land.w,lh=s.land.h; const G=grid(s); const occ=new Set(G.blk); for(const b of s.bld){ if(['field','landscape'].includes(b.t)){ const d=D.BLD[b.t]; for(let i=0;i<d.w;i++) for(let j=0;j<d.h;j++) occ.add((b.x+i)+','+(b.y+j)); } }
  const road=new Set(); const gx=Math.floor(lw/2); for(let y=0;y<lh;y++) if(!occ.has(gx+','+y)) road.add(gx+','+y); for(let x=0;x<lw;x++) if(!occ.has(x+','+(lh-1))) road.add(x+','+(lh-1));
  for(const b of s.bld){ const e=CS.entrance(b); if(e[1]>lh-1) continue; for(let y=e[1];y<lh;y++){ const k=e[0]+','+y; if(occ.has(k)&&y>e[1]) break; if(!occ.has(k)) road.add(k); } }
  const pr=pros==null?50:pros; const dens=.06+pr/100*.16; const trees=[],benches=[],chat=[],free=[]; const used=new Set([...occ,...road]);
  for(let x=0;x<lw;x++) for(let y=0;y<lh;y++){ const k=x+','+y; if(used.has(k)) continue; const r=hs(x,y,77),r2=hs(x,y,78); const edge=x===0||y===0||x===lw-1;
    const nearRoad=road.has((x+1)+','+y)||road.has((x-1)+','+y)||road.has(x+','+(y-1))||road.has(x+','+(y+1));
    if(nearRoad&&r<.22&&benches.length<Math.max(2,Math.floor(lw*lh/28))&&pr>=25){ benches.push([x,y]); used.add(k); }
    else if(r<dens*(edge?1.6:.8)){ trees.push([x,y,['round','cone','blossom','round'][(r2*4|0)],(r2*9|0)]); used.add(k); }
    else free.push([x,y]); }
  const treeSet=new Set(trees.map(t=>t[0]+','+t[1])); for(const [x,y] of free){ for(const [dx,dy] of [[1,0],[0,1],[-1,0],[0,-1]]) if(treeSet.has((x+dx)+','+(y+dy))){ chat.push([x,y]); break; } }
  const out={sig,road,trees,benches,chat,free,gx}; DM.set(s,out); return out; };
function bfs(G,from,to){ const key=(x,y)=>x+','+y; const lw=G.lw,lh=G.lh; if(from[0]===to[0]&&from[1]===to[1]) return []; const q=[from],prev=new Map([[key(...from),null]]); let found=false; const ok=(x,y)=>x>=-1&&y>=-1&&x<=lw&&y<=lh+1&&!G.blk.has(key(x,y)); let qi=0; while(qi<q.length){ const c=q[qi++]; if(c[0]===to[0]&&c[1]===to[1]){ found=true; break; } for(const [dx,dy] of [[1,0],[0,1],[-1,0],[0,-1]]){ const nx=c[0]+dx,ny=c[1]+dy; const k=key(nx,ny); if(prev.has(k)||!ok(nx,ny)) continue; prev.set(k,c); q.push([nx,ny]); } }
  if(!found) return [to]; const path=[]; let c=to; while(c){ path.push(c); c=prev.get(key(...c)); } path.reverse(); path.shift(); return path; }
// ---------- 建立／同步 ----------
CS.init=(g,s,quality)=>{ if(!g.day) g.day={d:0,m:450}; const sim={sid:s.id,q:quality||'std',G:grid(s),people:[],byId:new Map(),stamp:'',claims:{},pros:50}; g._sim=sim; CS.sync(g,s,true); return sim; };
CS.capFor=(s,q)=>{ const tot=s.students.length+s.staff.length; return Math.min(CS.CAP[q]||55,Math.ceil(Math.sqrt(tot)*2.4)); };
function bldOf(s,types){ return s.bld.filter(b=>!b.prog&&types.includes(b.t)); }
const layoutOf=b=>{ const d=D.BLD[b.t]; if(SE.ART&&SE.ART.layout){ const L=SE.ART.layout(b.t,d.w,d.h); if(L.seats.length) return L; } const seats=[]; for(let x=.5;x<d.w-.3;x+=.6) for(let y=.5;y<d.h-.3;y+=.6) seats.push([x,y]); return {seats}; };
// 每個區塊的「名額」：同一個點／座位／建築不會被一堆人同時佔用
function claim(sim,bi,key,cap){ const c=sim.claims[bi]||(sim.claims={[bi]:new Map()})[bi]; if(!(c instanceof Map)){ sim.claims={[bi]:new Map()}; } const m=sim.claims[bi]; const n=m.get(key)||0; if(n>=cap) return -1; m.set(key,n+1); return n; }
CS.rank=(sim,p)=>sim.people.indexOf(p);
CS.dest=(g,sim,s,p,type,bi)=>{ const rk=Math.max(0,sim.people.indexOf(p)), pair=rk>>1, dec=CS.decor(s,sim.pros);
  const pickBld=(types)=>{ for(const ty of types){ const l=bldOf(s,[ty]); if(!l.length) continue; for(let k=0;k<l.length;k++){ const b=l[(rk*3+bi+k)%l.length]; const L=layoutOf(b); const cap=Math.max(3,Math.ceil((L.seats.length||2)*1.6)); const n=claim(sim,bi,'b'+b.id,cap); if(n>=0){ return {b,idx:n,seats:L.seats}; } } } return null; };
  const inside=(r,act)=>{ const bs=r.seats.length?r.seats[r.idx%r.seats.length]:[.6,.6]; const w=Math.floor(r.idx/Math.max(1,r.seats.length)); const seat=[bs[0]+w*.2+(hs(r.b.id,r.idx,3)-.5)*.2,bs[1]-w*.1+(hs(r.b.id,r.idx,4)-.5)*.2]; return {b:r.b,cell:CS.entrance(r.b),act,inside:true,seat}; };
  const yardSpot=(chatty)=>{ // 聊天配對：同一對共用一個點，彼此相對
    const list=chatty&&dec.chat.length?dec.chat:dec.free; if(!list.length) return {cell:[Math.floor(s.land.w/2),Math.max(0,s.land.h-2)],act:'talk'};
    if(dec.benches.length&&hs(pair,bi,41)<.45){ const bn=dec.benches[Math.floor(hs(pair,bi,42)*dec.benches.length)]; if(claim(sim,bi,'bn'+bn,2)>=0) return {cell:bn,act:'sit',bench:true,slot:rk&1}; }
    let i=Math.floor(hs(pair,bi,43)*list.length); for(let k=0;k<list.length;k++){ const c=list[(i+k)%list.length]; if(claim(sim,bi,'c'+c,rk&1?9:2)>=0||true){ const key='c'+c; const n=(sim.claims[bi].get(key)||0); if(n<=2) return {cell:c,act:'talk',slot:rk&1}; } } return {cell:list[i],act:'talk',slot:rk&1}; };
  switch(type){
    case 'class': { const r=pickBld(p.kind==='s'?['classroom','lab','library','gym']:['classroom','office','lab']); return r?inside(r,p.kind==='s'?'study':'work'):yardSpot(false); }
    case 'lab': { const r=pickBld(['lab','research','workshop']); return r?inside(r,'work'):yardSpot(false); }
    case 'lib': { const r=pickBld(['library']); return r?inside(r,'study'):yardSpot(true); }
    case 'lunch': { const r=pickBld(['canteen']); return r?inside(r,'rest'):yardSpot(true); }
    case 'work': { const r=pickBld(['office','admin','classroom']); return r?inside(r,'work'):yardSpot(false); }
    case 'club': { const u=hs(p.id,bi,9); const fl=bldOf(s,['field']); if(u<.4&&fl.length){ const b=fl[0],d=D.BLD.field; return {b,cell:[b.x+1+Math.floor(hs(p.id,bi,2)*Math.max(1,d.w-2)),b.y+1+Math.floor(hs(p.id,bi,3)*Math.max(1,d.h-2))],act:'run',field:b}; } if(u<.55){ const r=pickBld(['gym']); if(r) return inside(r,'rest'); } if(u<.8){ const r=pickBld(['library']); if(r) return inside(r,'study'); } return yardSpot(true); }
    case 'rest': { // 下課：一部分到走廊/庭園聊天，一部分去操場
      const u=hs(p.id,bi,19); const fl=bldOf(s,['field']); if(u<.25&&fl.length){ const b=fl[0],d=D.BLD.field; return {b,cell:[b.x+1+Math.floor(hs(p.id,bi,2)*Math.max(1,d.w-2)),b.y+1+Math.floor(hs(p.id,bi,3)*Math.max(1,d.h-2))],act:'run',field:b}; } return yardSpot(true); }
    case 'arrive': case 'leave': { const gx=dec.gx; return {cell:[gx+((rk%3)-1)*0,s.land.h],act:'walk',gate:true}; }
    default: return null; } };
CS.patrol=(g,s,p,sim)=>{ const l=bldOf(s,['classroom','lab','office','library','canteen','gym']); if(!l.length) return null; const b=l[Math.floor(hs(p.id,g.day.d*7+Math.floor(g.day.m/40),55)*l.length)]; const e=CS.entrance(b); return {b,cell:[e[0]+1,e[1]],act:'sweep',patrol:true}; };
function mkPerson(g,s,src,kind){ return {id:src.id,kind,src:null,x:0,y:0,path:[],act:'stay',blk:-1,inside:null,seat:null,dir:0,face:1,phase:hs(src.id,1,1)*6.28,look:null,spd:.19+hs(src.id,8,1)*.08,mood:null}; }
CS.sync=(g,s,force)=>{ const sim=g._sim; if(!sim) return; const stamp=[s.id,s.bld.length,s.students.length,s.staff.length,sim.q,g.w].join('|'); if(!force&&sim.stamp===stamp) return; sim.stamp=stamp; sim.G=grid(s); const cap=CS.capFor(s,sim.q);
  const watch=new Set(g.watch||[]); const pool=[]; for(const st of s.students) pool.push([st,'s']); for(const t of s.staff) pool.push([t,'t']);
  const score=([p,k])=>(watch.has(p.id)?-9:0)+(p.key?-3:0)+(k==='t'&&(p.role==='p'||p.role==='d'||p.role==='a')?-2:0)+hs(p.id,g.y,2);
  pool.sort((a,b)=>score(a)-score(b)); const nt=Math.max(1,Math.round(cap*.22)); const chosen=[]; let tc=0; for(const e of pool){ if(chosen.length>=cap) break; if(e[1]==='t'){ if(tc>=nt) continue; tc++; } chosen.push(e); }
  chosen.sort((a,b)=>a[0].id-b[0].id);
  const keep=new Map(); for(const [src,kind] of chosen){ let pe=sim.byId.get(src.id); if(!pe){ pe=mkPerson(g,s,src,kind); pe.fresh=true; } pe.src=src; keep.set(src.id,pe); }
  sim.people=[...keep.values()]; sim.byId=keep; sim.claims={}; sim.cb=-1; for(const p of sim.people) if(p.fresh){ CS.place(g,s,p); p.fresh=false; } };
CS.blocksFor=(g,s)=>{ const wd=g.day.d<5; return CS.schedule(s.type,SE.ART?SE.ART.eraStage(g.y):2,wd); };
const jit=(p,bi,k)=>(hs(p.id,bi,k)-.5)*.46;
function setPos(p,dst,bi){ if(dst.inside){ p.inside=dst.b; p.seat=dst.seat; p.x=dst.b.x+dst.seat[0]; p.y=dst.b.y+dst.seat[1]; } else { p.inside=null; p.seat=null; const o=dst.act==='talk'||dst.act==='sit'?(dst.slot?.28:-.28):jit(p,bi,11); p.x=dst.cell[0]+.5+(dst.act==='talk'||dst.act==='sit'?o:jit(p,bi,11)); p.y=dst.cell[1]+.5+(dst.act==='talk'||dst.act==='sit'?o*.0:jit(p,bi,12)); p.face=dst.slot?-1:1; } }
// 把人放到「現在這個時刻應該在的位置」（讀檔、新建時）
CS.place=(g,s,p)=>{ const sim=g._sim,bl=CS.blocksFor(g,s),bi=CS.blockAt(bl,g.day.m); if(sim.cb!==bi){ sim.claims={}; sim.cb=bi; } p.blk=bi; const ty=bl[bi][2]; p.path=[]; p.inside=null; p.late=false; const dst=ty==='home'?null:CS.dest(g,sim,s,p,p.kind==='t'&&ty==='lab'?'class':(p.kind==='t'&&ty==='club'?'work':ty),bi); if(!dst){ p.home=true; p.act='stay'; return; } p.home=false; p.target=dst; p.act=dst.act==='run'?'run':dst.act; p.cell=dst.cell; setPos(p,dst,bi); };
function newBlock(g,s,p,bi,bl){ const sim=g._sim; p.blk=bi; const ty=bl[bi][2]; p.run=false; let dst=ty==='home'?null:CS.dest(g,sim,s,p,p.kind==='t'&&ty==='lab'?'class':(p.kind==='t'&&ty==='club'?'work':ty),bi);
  if(p.kind==='t'&&p.src&&p.src.role==='a'&&ty==='class'){ dst=CS.patrol(g,s,p,sim)||dst; }
  const gate=[sim.G.lw>>1,s.land.h+1];
  if(!dst){ p.target=null; p.leaving=true; if(!p.home){ const from=p.inside?CS.entrance(p.inside):[clamp(Math.round(p.x-.5),-1,s.land.w),clamp(Math.round(p.y-.5),-1,s.land.h+1)]; if(p.inside){ p.x=from[0]+.5; p.y=from[1]+.5; } p.inside=null; p.seat=null; p.path=bfs(sim.G,from,gate); p.act='walk'; } else p.act='stay'; return; }
  p.leaving=false; if(p.home){ p.home=false; p.x=gate[0]+.5+jit(p,bi,3); p.y=s.land.h+1.6; // 遲到：放學後才出現、用跑的
    if(p.kind==='s'&&ty==='class'&&hs(p.id,g.day.d*3+Math.floor(g.y%9),31)<.07) p.run=true; }
  const from=p.inside?CS.entrance(p.inside):[clamp(Math.round(p.x-.5),-1,s.land.w),clamp(Math.round(p.y-.5),-1,s.land.h+1)]; if(p.inside){ p.x=from[0]+.5; p.y=from[1]+.5; } p.inside=null; p.seat=null;
  p.target=dst; p.path=bfs(sim.G,from,dst.cell); p.act='walk'; if(dst.act==='run') p.run=true; }
// 前進 dtMin 個遊戲分鐘（時鐘、移動、行為決策一致）
CS.step=(g,s,dtMin)=>{ const sim=g._sim; if(!sim||dtMin<=0) return {days:0}; let days=0; const d=g.day; d.m+=dtMin; while(d.m>=1440){ d.m-=1440; d.d=(d.d+1)%7; days++; }
  const bl=CS.blocksFor(g,s); const bi=CS.blockAt(bl,d.m); if(sim.cb!==bi){ sim.claims={}; sim.cb=bi; }
  const P=sim.people;
  for(const p of P){ if(p.blk!==bi) newBlock(g,s,p,bi,bl);
    if(p.path.length){ const sp=p.spd*(p.run?2.1:1); let rem=sp*dtMin; while(rem>0&&p.path.length){ const t=p.path[0],tx=t[0]+.5,ty=t[1]+.5; const dx=tx-p.x,dy=ty-p.y,dist=Math.hypot(dx,dy); if(dist<1e-4){ p.path.shift(); continue; } const st=Math.min(rem,dist); p.x+=dx/dist*st; p.y+=dy/dist*st; rem-=st; if(Math.abs(dx)>.01) p.face=dx>0?1:-1; p.dir=(dy<-.01&&Math.abs(dy)>=Math.abs(dx)*.5)||(dx<-.01&&Math.abs(dx)>Math.abs(dy))?1:0; if(st>=dist-1e-6) p.path.shift(); }
      if(!p.path.length) arrive(g,s,p,bi); }
    else if(p.leaving&&!p.home){ p.home=true; }
    else if(p.target&&(p.target.field||p.target.patrol)){ // 操場追逐／清潔巡視：到點後換下一個點
      p.wait=(p.wait||0)-dtMin; if(p.wait<=0){ if(p.target.field){ const b=p.target.field,dd=D.BLD.field; const nc=[b.x+1+Math.floor(hs(p.id,Math.floor(d.m/3),61)*Math.max(1,dd.w-2)),b.y+1+Math.floor(hs(p.id,Math.floor(d.m/3),62)*Math.max(1,dd.h-2))]; p.path=bfs(sim.G,[clamp(Math.round(p.x-.5),-1,s.land.w),clamp(Math.round(p.y-.5),-1,s.land.h+1)],nc); p.run=true; p.wait=2+hs(p.id,Math.floor(d.m),63)*3; p.act='walk'; } else { const nt=CS.patrol(g,s,p,sim); if(nt){ p.target=nt; p.path=bfs(sim.G,[clamp(Math.round(p.x-.5),-1,s.land.w),clamp(Math.round(p.y-.5),-1,s.land.h+1)],nt.cell); p.act='walk'; p.wait=30; } } } } }
  // 避讓：近距離輕推（只推戶外移動中的人）
  for(let i=0;i<P.length;i++){ const a=P[i]; if(a.home||a.inside) continue; for(let j=i+1;j<P.length;j++){ const b=P[j]; if(b.home||b.inside) continue; const dx=a.x-b.x,dy=a.y-b.y; if(dx>.5||dx<-.5||dy>.5||dy<-.5) continue; const dd=dx*dx+dy*dy; if(dd<.09&&dd>1e-6){ const dist=Math.sqrt(dd),push=(.3-dist)*.5; const mv=!!a.path.length, mb=!!b.path.length; if(mv||!mb){ a.x+=dx/dist*push*(mb?1:.6); a.y+=dy/dist*push*(mb?1:.6); } if(mb||!mv){ b.x-=dx/dist*push*(mv?1:.6); b.y-=dy/dist*push*(mv?1:.6); } } } }
  return {days}; };
function arrive(g,s,p,bi){ const t=p.target; p.run=false; if(!t){ if(p.leaving) p.home=true; p.act='stay'; return; } p.act=t.act; if(t.field){ p.act='run'; p.wait=1; } if(t.inside&&t.b){ p.inside=t.b; p.seat=t.seat; p.x=t.b.x+t.seat[0]; p.y=t.b.y+t.seat[1]; } else if(t.cell){ if(t.act==='talk'||t.act==='sit'){ p.x=t.cell[0]+.5+(t.slot?.28:-.28); p.y=t.cell[1]+.5; p.face=t.slot?-1:1; } else if(t.act==='sweep'){ p.x=t.cell[0]+.5; p.y=t.cell[1]+.5; p.wait=25; } } }
// 目前顯示用姿勢
CS.pose=(p,tAnim)=>{ if(p.path&&p.path.length) return p.run?'run':'walk'; if(p.act==='run') return 'exercise'; return p.act==='walk'?'stay':p.act; };
CS.label=(g,s,p)=>{ const bl=CS.blocksFor(g,s); const ty=bl[CS.blockAt(bl,g.day.m)][2]; if(p.home) return '不在校內'; if(p.path&&p.path.length){ const to=p.target&&p.target.b?D.BLD[p.target.b.t].n:'操場／庭園'; return '正前往'+(p.leaving?'校門':to); } const where=p.inside?D.BLD[p.inside.t].n:(p.act==='exercise'?'操場':'校園'); const v={study:ty==='lib'?'閱讀':'上課',work:p.kind==='t'?'工作中':'實驗／實作',talk:'與同學聊天',exercise:'運動',sweep:'打掃',sit:'坐在長椅休息',run:'運動',rest:ty==='lunch'?'用餐':'休息',stay:'停留'}[p.act]||CS.LABEL[ty]; return where+'・'+v; };
CS.clock=g=>{ const m=Math.floor(g.day.m); return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0'); };
CS.DAYN=['週一','週二','週三','週四','週五','週六','週日'];
CS.hourF=g=>g.day.m/60;
})(typeof window!=='undefined'?window:globalThis);
