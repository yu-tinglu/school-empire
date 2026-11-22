// 模擬 Worker：在背景執行緒推進時間，主執行緒只收進度與結果
importScripts('core.js','data.js','world.js','ledger.js','people.js','school.js','edu.js','rivals.js','events.js','group.js','engine.js','ai.js','save.js');
const {E,Save}=self.SE;
self.onmessage=(ev)=>{ const m=ev.data; try{
  const g=Save.deserialize(m.state); let n=0,stop=null; const startPend=g.events.pending.length;
  while(n<m.weeks&&g.status!=='broke'){ E.tick(g); n++;
    if(m.opt.stop!==false&&E.hasUrgent(g)){ stop='urgent'; break; }
    if(m.opt.stopAny&&g.events.pending.length>startPend){ stop='event'; break; }
    if(n%2===0) self.postMessage({id:m.id,progress:n,total:m.weeks}); }
  self.postMessage({id:m.id,done:true,state:Save.serialize(g),r:{weeks:n,stop:stop||(g.status==='broke'?'broke':null)}});
 }catch(e){ self.postMessage({id:m.id,error:String(e&&e.stack||e)}); } };
