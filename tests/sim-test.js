// 校園行為測試（Node）：作息、分散、回家、確定性
require('./load.js')(); const SE=global.SE,{E,CS,D}=SE; let fail=0; const ok=(c,m)=>{ console.log((c?'✔ ':'✘ ')+m); if(!c) fail++; };
const g=E.newGame({seed:5,type:'hs'}); const s=E.cur(g);
for(const t of ['classroom','classroom','canteen','field','landscape','library']){ const p=SE.S.placeFree(s,D.BLD[t].w,D.BLD[t].h); if(p) SE.S.addBldFree(g,s,t,p); }
CS.init(g,s,'std'); const sim=g._sim; g.day={d:1,m:300}; for(const p of sim.people) CS.place(g,s,p);
const at=h=>{ let n=0; while(g.day.m<h*60&&n++<3000) CS.step(g,s,4); const c={in:0,home:0,out:0}; const cells=new Map(); for(const p of sim.people){ if(p.home) c.home++; else if(p.inside) c.in++; else { c.out++; const k=Math.round(p.x)+','+Math.round(p.y); cells.set(k,(cells.get(k)||0)+1); } } c.maxCell=Math.max(0,...cells.values()); return c; };
ok(at(6).home===sim.people.length,'凌晨全員不在校');
const c10=at(10); ok(c10.in>=sim.people.length*.7,`上課時多數在建築內（${c10.in}/${sim.people.length}）`);
const c12=at(12.5); ok(c12.maxCell<=4,`午休戶外同一格不超過 4 人（最大 ${c12.maxCell}）`);
at(15.2); const co=(()=>{ const cells=new Set(); let n=0; for(const p of sim.people) if(!p.home&&!p.inside){ n++; cells.add(Math.round(p.x*2)+','+Math.round(p.y*2)); } return {n,u:cells.size}; })(); ok(co.n===0||co.u>=Math.min(co.n,3),`下課時人物分散（${co.u} 個不同位置／${co.n} 人）`);
const c19=at(19.5); ok(c19.home===sim.people.length,'晚上全員離校');
// 確定性：同一時刻放置兩次位置一致
const pl=()=>{ sim.claims={}; sim.cb=-1; for(const p of sim.people) CS.place(g,s,p); }; g.day.m=600; pl(); const a=sim.people.map(p=>p.x.toFixed(2)+','+p.y.toFixed(2)).join(); pl(); ok(a===sim.people.map(p=>p.x.toFixed(2)+','+p.y.toFixed(2)).join(),'讀檔後位置可由時間確定性還原');
for(const p of sim.people) if(!p.home&&!p.inside){ const b=s.bld.find(b=>!['field','landscape'].includes(b.t)&&p.x>b.x&&p.x<b.x+D.BLD[b.t].w&&p.y>b.y&&p.y<b.y+D.BLD[b.t].h); if(b){ ok(false,'人物不應站在建築上'); break; } }
console.log(fail?'失敗 '+fail:'全部通過'); process.exit(fail?1:0);
