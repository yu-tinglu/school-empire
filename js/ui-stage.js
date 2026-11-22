/* 全螢幕校園舞台：地圖鋪滿畫面，HUD 疊在上面（版面參考使用者提供的概念圖；不含任何現成角色/圖像素材） */
(function(root){ const UI=root.SE.UI, $=s=>document.querySelector(s), esc=UI.esc||(t=>String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])));
const L=SE.L, CAL=SE.CAL;
const NAVS=[['office','校長辦公室'],['more','校務管理'],['finance','財務中心'],['admit','招生入學'],['academics','教務課程'],['staff','教職員'],['students','學生名冊'],['rel','人物關係'],['build','校園建設'],['campus','校園總覽']];
const DOCK=[['build','建設'],['students','學生'],['staff','教師'],['academics','課表'],['events','事件'],['group','教育集團']];
UI.stageOn=true;
const IC={office:'rep',more:'event',finance:'fund',admit:'exam',academics:'course',staff:'teacher',students:'student',rel:'club',build:'build',campus:'upgrade',events:'mail',group:'achieve',coin:'fund',people:'student',star:'rep',shield:'exam'};
const si=(k,w)=>`<img class="sgi" src="assets/icons/${IC[k]||'help'}.png" width="${w}" height="${w}" alt="">`;
const baseRender=UI.render;
UI.stageMode=()=>UI.stageOn&&UI.screen==='campus'&&UI.g&&UI.cur();
function stat(g,s){ const cash=L.cash(s), risk=L.risk(g,s); const rk=['低','中','高','極高'][Math.min(3,risk)]||risk;
  const w=g.w; const se=w>=4&&w<=13?'🌸':w>=14&&w<=35?'☀️':w>=36&&w<=48?'🍂':'❄️';
  const c=(ic,v,l,bad)=>`<div class="sg-st ${bad?'bad':''}">${si(ic,20)}<div><b>${v}</b><i>${l}</i></div></div>`;
  return `<div class="sg-top"><div class="sg-name">${esc(s.name)}</div><div class="sg-date">${se} ${CAL.label(g.y,g.w)}</div><div class="sg-stats">${c('coin',UI.$m(cash),'現金',cash<0)}${c('people',s.students.length+'/'+s.cap.seats,'學生')}${c('staff',s.staff.length,'教職員')}${c('star',s.rep.ov.toFixed(0),'聲望')}${c('shield',s.insW>0?'積欠'+s.insW+'週':rk,'財務風險',risk>=2||s.insW>0)}</div></div>`; }
UI.render=function(){ if(!UI.stageMode()){ document.body.classList.remove('stage-on'); return baseRender(); }
  const g=UI.g,s=UI.cur(),pc=UI.pending(); document.body.classList.add('stage-on');
  const nav=NAVS.map(([k,n])=>`<a class="${UI.screen===k?'on':''}" data-act="${k==='more'?'more':'go'}" data-k="${k}">${si(k,22)}<span>${n}</span></a>`).join('');
  const dock=DOCK.map(([k,n])=>`<a data-act="go" data-k="${k}">${si(k,30)}<span>${n}</span>${k==='events'&&pc?`<em class="bd">${pc}</em>`:''}</a>`).join('');
  const app=$('#app');
  app.innerHTML=`<div class="stage">${UI.mapHTML('view',{tall:1})}
  <nav class="sg-nav ${UI.navHide?'hide':''}" id="sgnav"><div class="sg-brand">${UI.ic('crest',26)}<b>School Empire</b></div>${nav}</nav>
  <button class="sg-tog" data-act="sgNav" aria-label="導覽">${si('gear',24)}</button>
  ${stat(g,s)}
  <div class="sg-side"><button data-act="sgFloor">樓層</button><button data-act="xray">透視</button><button data-act="sgHide" aria-label="隱藏介面">👁</button><button data-act="sgZoom" aria-label="介面大小">Aa</button></div>
  <nav class="sg-dock">${dock}</nav>
  <button class="sg-map" data-act="zrst">校園地圖</button>
  <button class="sg-show" data-act="sgHide" aria-label="顯示介面">👁</button>
  <div class="sg-rot">橫向握持畫面更完整 ↻</div></div>`;
  const af=UI.after&&UI.after.campus; if(af) af(g,s); };
UI.act.sgZoom=()=>{ const v=SE.hz.cycle(); UI.toast('介面大小 '+Math.round(v*100)+'%'); };
UI.act.sgNav=()=>{ UI.navHide=!UI.navHide; const n=$('#sgnav'); if(n) n.classList.toggle('hide',UI.navHide); };
UI.act.sgHide=()=>{ document.body.classList.toggle('sg-clean'); };
UI.act.sgFloor=()=>{ const M=UI.map, id=M.sel; if(id) UI.act.bview({id}); else UI.toast('先點選一棟建築，再看樓層'); };
})(window);
