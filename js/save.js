(function(root){
'use strict';
const SE = root.SE, U=SE.U, L=SE.L, P=SE.P, D=SE.D;
const Save = SE.Save = {};

/* ---------- 序列化 / 驗證 / 遷移 ---------- */
Save.strip = (k,v)=> (k[0]==='_'? undefined : v);
Save.meta = function(g){
  const s=g.schools[0]||{};
  return {ver:SE.VERSION,y:g.y,w:g.w,name:g.group?g.group.name:'',schools:g.schools.length,school:s.name||'(無)',stu:g.schools.reduce((a,x)=>a+x.students.length,0),
    cash:Math.round(g.schools.reduce((a,x)=>a+L.cash(x),0)+L.cash(g.hq)),savedAt:Date.now(),status:g.status,region:g.regionRule.n};
};
Save.serialize = function(g){
  for(const s of g.schools){ for(const x of s.students) P.relClean(g,x); for(const x of s.staff) P.relClean(g,x); } // 先清除指向已不存在者的關係，使存檔與記憶體一致
  const state=JSON.stringify(g,Save.strip);
  return JSON.stringify({meta:Save.meta(g),sum:U.hash(state),state:state});
};
// 遷移表：版本 n → n+1
Save.MIG = {
  1:g=>{ g.contracts=g.contracts||[]; g.hall=g.hall||[]; return g; },
  2:g=>{ g.cohort=g.cohort||{n:0,dn:0}; g.legacyBank=g.legacyBank||{}; g.past=g.past||[]; for(const s of g.schools){ s.hist=s.hist||{principals:[],yb:[],grads:[]}; s.flags=s.flags||{}; s.affil=s.affil||[]; s.coop=s.coop||{}; s.transit=s.transit||[]; } return g; },
};
Save.migrate = function(g){
  let v=g.v||1;
  while(v<SE.VERSION){ const f=Save.MIG[v]; if(f) g=f(g); v++; }
  g.v=SE.VERSION; return g;
};
Save.sanitize = function(g){ // 修補 NaN / 缺欄位，回傳修復數量
  let n=0;
  const walk=(o,d)=>{ if(d>6||!o||typeof o!=='object') return; for(const k of Object.keys(o)){ const v=o[k]; if(typeof v==='number'&&!isFinite(v)){ o[k]=0; n++; } else if(v&&typeof v==='object') walk(v,d+1); } };
  for(const s of g.schools){ walk(s.rep,0); walk(s.cfg,0); walk(s.m,0); walk(s.fac,0); for(const b of s.bld) walk(b,0); for(const a of s.assets) walk(a,0); walk(s.led.bal,0); for(const x of s.students) walk(x,0); for(const x of s.staff) walk(x,0); }
  walk(g.hq.led.bal,0); walk(g.world,0);
  for(const s of g.schools){ for(const x of s.students) if(!Array.isArray(x.fr)) { x.fr=[]; n++; } for(const x of s.staff) if(!Array.isArray(x.rl)) { x.rl=[]; n++; } }
  return n;
};
Save.hydrate = function(g){
  Save.migrate(g); const fixed=Save.sanitize(g); P.rebuild(g);
  for(const s of g.schools){ for(const x of s.students) P.relClean(g,x); for(const x of s.staff) P.relClean(g,x); }
  g._fixed=fixed; return g;
};
Save.deserialize = function(text){
  let o; try{ o=JSON.parse(text); }catch(e){ throw new Error('存檔格式錯誤（不是有效的 JSON）'); }
  if(!o||typeof o.state!=='string'||!o.meta) throw new Error('存檔結構不完整');
  if(U.hash(o.state)!==o.sum) throw new Error('存檔校驗碼不符（檔案可能損毀或被修改）');
  let g; try{ g=JSON.parse(o.state); }catch(e){ throw new Error('存檔內容損毀'); }
  if(!g.schools||!g.hq||!g.world||!g.rng) throw new Error('存檔缺少必要資料');
  if((g.v||1)>SE.VERSION) throw new Error('此存檔來自較新的版本，無法載入');
  return Save.hydrate(g);
};
// 完整性檢查（測試與讀檔後使用）
Save.check = function(g){
  const issues=[]; const ents=[g.hq,...g.schools];
  for(const e of ents){
    const b=e.led.bal; let s=0; for(const k of Object.keys(b)){ if(!(k in L.TYPE)) issues.push(`${e.name}:未知科目${k}`); if(!isFinite(b[k])) issues.push(`${e.name}:科目${k}為NaN`); s+=b[k]; }
    if(Math.abs(s)>5) issues.push(`${e.name}:試算不平衡 ${s.toFixed(2)}`);
    const sm=L.summary(b); if(Math.abs(sm.assets-sm.liab-sm.equity)>5) issues.push(`${e.name}:資產負債表不平衡`);
    if(!e.isHQ){ const c=e.assets.reduce((a,x)=>a+x.c,0), ad=e.assets.reduce((a,x)=>a+x.ad,0); if(Math.abs(c-(b.fa||0))>5) issues.push(`${e.name}:資產登記冊原值與總帳不符 ${c} vs ${b.fa}`); if(Math.abs(ad+(b.accDep||0))>5) issues.push(`${e.name}:累計折舊與總帳不符`);
      const ln=e.loans.filter(l=>!l.ic).reduce((a,x)=>a+x.bal,0); if(Math.abs(ln+(b.loans||0))>5) issues.push(`${e.name}:銀行借款明細與總帳不符 ${ln} vs ${-(b.loans||0)}`); }
    else { const c=e.assets.reduce((a,x)=>a+x.c,0); if(c!==0) issues.push('總部不應有固定資產'); }
    const icl=e.loans.filter(l=>l.ic).reduce((a,x)=>a+x.bal,0); if(Math.abs(icl+(b.icAp||0))>5) issues.push(`${e.name}:集團內借款明細不符`);
  }
  const cons=L.consolidate(g,ents.filter(e=>!e.closed));
  if(!cons.chk.icMatch) issues.push('集團內應收應付未抵銷平衡');
  if(!cons.chk.invMatch) issues.push(`對子公司投資與子公司資本不一致 ${cons.chk.inv} vs ${cons.chk.subPaid}`);
  if(Math.abs(cons.bs.aT-cons.bs.lT-cons.bs.eT)>10) issues.push(`合併資產負債表不平衡 ${(cons.bs.aT-cons.bs.lT-cons.bs.eT).toFixed(1)}`);
  const ids=new Set(); let dup=0; for(const s of g.schools){ for(const x of s.students){ if(ids.has(x.id)) dup++; ids.add(x.id); } for(const x of s.staff){ if(ids.has(x.id)) dup++; ids.add(x.id); } }
  for(const a of g.alumni){ if(ids.has(a.id)) dup++; ids.add(a.id); }
  if(dup) issues.push(`人物 id 重複 ${dup}`);
  return issues;
};

/* ---------- 儲存後端 ---------- */
const mem={};
const hasIDB = typeof indexedDB!=='undefined';
function idb(){ return new Promise((res,rej)=>{ const r=indexedDB.open('school-empire',1); r.onupgradeneeded=()=>r.result.createObjectStore('saves'); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); }); }
async function rawPut(k,v){
  if(hasIDB){ try{ const db=await idb(); await new Promise((res,rej)=>{ const t=db.transaction('saves','readwrite'); t.objectStore('saves').put(v,k); t.oncomplete=res; t.onerror=()=>rej(t.error); }); return; }catch(e){} }
  try{ if(typeof localStorage!=='undefined'){ localStorage.setItem('se_'+k,v); return; } }catch(e){}
  mem[k]=v;
}
async function rawGet(k){
  if(hasIDB){ try{ const db=await idb(); const v=await new Promise((res,rej)=>{ const t=db.transaction('saves').objectStore('saves').get(k); t.onsuccess=()=>res(t.result); t.onerror=()=>rej(t.error); }); if(v!==undefined) return v; }catch(e){} }
  try{ if(typeof localStorage!=='undefined'){ const v=localStorage.getItem('se_'+k); if(v!==null) return v; } }catch(e){}
  return mem[k];
}
async function rawDel(k){
  if(hasIDB){ try{ const db=await idb(); await new Promise((res,rej)=>{ const t=db.transaction('saves','readwrite'); t.objectStore('saves').delete(k); t.oncomplete=res; t.onerror=()=>rej(t.error); }); }catch(e){} }
  try{ if(typeof localStorage!=='undefined') localStorage.removeItem('se_'+k); }catch(e){}
  delete mem[k];
}
Save.SLOTS=['auto0','auto1','auto2','m1','m2','m3','m4','m5','m6'];
Save.put = async function(slot,g,label){ const text=Save.serialize(g); await rawPut(slot,text); return text.length; };
Save.get = async function(slot){ const t=await rawGet(slot); if(!t) return null; return Save.deserialize(t); };
Save.del = rawDel;
Save.list = async function(){
  const out=[]; for(const sl of Save.SLOTS){ const t=await rawGet(sl); if(!t){ out.push({slot:sl,empty:true}); continue; } try{ const o=JSON.parse(t); out.push({slot:sl,meta:o.meta,bytes:t.length}); }catch(e){ out.push({slot:sl,bad:true}); } }
  return out;
};
Save.autoSave = async function(g){ g.flags.autoN=((g.flags.autoN||0)+1)%3; const slot='auto'+g.flags.autoN; await Save.put(slot,g); return slot; };
})(typeof window!=='undefined'?window:globalThis);
