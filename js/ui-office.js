// 校長辦公室：桌上文件都是真實入口，窗外是即時校園。
(function(root){
'use strict';
const SE=root.SE, {L,S,D,G}=SE, UI=SE.UI, SC=UI.screens, esc=UI.esc;
SC.office=(g,s)=>{ const cash=L.cash(s); const pend=(g.pendingEvents||[]).length; const cands=(s.cands||[]).length; const grown=s.bld.length>=10?2:s.bld.length>=6?1:0; const adv=UI.advice(g,s).slice(0,2);
  const docs=[['finance','財務報表','📊'.length?'現金 '+UI.$m(cash):'','finance'],['admit','招生簡章',`在校 ${s.students.length}／${s.cap.seats} 座`,'admit'],['staff','應徵履歷',cands?`${cands} 份待看`:'暫無新履歷','staff'],['events','公文信件',pend?`${pend} 件待辦`:'桌面整潔','events'],['history','校史相簿','翻閱歷年成就','history'],['group','集團地圖',`${g.schools.length} 所學校`,'group']];
  return `<div class="office lv${grown}"><div class="ofwin"><div class="arch"></div>${UI.mapHTML('window')}</div>
  <div class="ofdesk"><details class="sec" ${(SE.rot&&SE.rot.on)?'':'open'}><summary><b>秘書留言</b></summary>${adv.map(a=>`<p>${esc(a[1])}<br><small>${esc(a[2])}</small></p>`).join('')||'<p>目前一切平穩，校長。</p>'}</details>
  <div class="docs">${docs.map(([k,n,sub,go],i)=>`<a class="doc d${i%3}" data-act="go" data-k="${go}"><b>${n}</b><small>${esc(sub)}</small></a>`).join('')}</div>
  <div class="lamp"></div></div></div>`; };
UI.after.office=()=>UI.after.campus();
})(typeof window!=='undefined'?window:globalThis);
