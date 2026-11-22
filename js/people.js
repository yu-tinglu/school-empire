(function(root){
'use strict';
const SE = root.SE, R=SE.R, U=SE.U, D=SE.D, W=SE.W, L=SE.L;
const P = SE.P = {};

/* ---------- 註冊表（不存檔，載入後重建） ---------- */
P.reg = function(g){ return g._reg || (g._reg=new Map()); };
P.rebuild = function(g){
  const m=g._reg=new Map();
  for(const s of g.schools){ for(const p of s.students) m.set(p.id,p); for(const p of s.staff) m.set(p.id,p); }
  for(const a of g.alumni) m.set(a.id,a);
  return m;
};
P.find = (g,id)=> P.reg(g).get(id);
P.add = (g,p)=>{ P.reg(g).set(p.id,p); return p; };
P.del = (g,p)=>{ P.reg(g).delete(p.id); };

/* ---------- 名字 ---------- */
P.name = (g,sx)=> R.pick(g,D.SUR)+R.pick(g,sx?D.GF:D.GM);

/* ---------- 關係（每人最多 8 筆，雙向同步） ---------- */
P.REL = {f:'友誼',r:'競爭',t:'信任',c:'合作',x:'衝突',m:'師生',k:'同事',y:'家人',a:'校友'};
P.relGet = (p,id)=>{ if(!p.rl) return null; for(const r of p.rl) if(r[0]===id) return r; return null; };
function relSet(p,id,type,v){
  if(!p.rl) p.rl=[];
  let r=P.relGet(p,id);
  if(r){ r[2]=U.clamp(r[2]+v,-100,100); if(v!==0 && type) r[1]=type; return r; }
  if(p.rl.length>=8){ let wi=0,wv=1e9; p.rl.forEach((x,i)=>{ const a=Math.abs(x[2]); if(a<wv){wv=a;wi=i;} }); if(Math.abs(v)<=wv) return null; p.rl.splice(wi,1); }
  r=[id,type,U.clamp(v,-100,100)]; p.rl.push(r); return r;
}
P.relBump = function(a,b,type,v){ relSet(a,b.id,type,v); relSet(b,a.id,type,v); };
P.relClean = function(g,p){ if(!p.rl) return; p.rl=p.rl.filter(r=>P.find(g,r[0])); };

/* ---------- 學生 ---------- */
P.newStudent = function(g, s, o){
  o=o||{}; const T=D.TYPES[s.type], sx=R.chance(g,.5)?1:0;
  const fiMean = 50+16*Math.log(Math.max(.3,s.cfg.tuition/Math.max(1,W.tuitionNorm(g,s.type))))+ (o.fiShift||0)+(g.world.income-1)*20;
  const fi=U.clamp(Math.round(R.n(g,fiMean,20)),3,100);
  const fe=U.clamp(Math.round(R.n(g,fi*.5+25,18)),3,100);
  let ab = o.ab!==undefined? o.ab : R.n(g,47+0.12*((s.rep?s.rep.ov:40)-50)+(o.abShift||0)+(fe-50)*.08,16);
  ab=U.clamp(Math.round(ab),5,99);
  const p=[0,1,2,3,4].map(()=>U.clamp(Math.round(R.n(g,50,18)),3,98));
  const age = T.e + (o.gr? o.gr-1:0);
  const st={id:g.nextId++,nm:o.nm||P.name(g,sx),sx,by:g.y-age,gr:o.gr||1,fid:o.fid||g.nextId++,fi,fe,p,ab,
    ar:U.clamp(Math.round(R.n(g,48,20)),3,99),sp:U.clamp(Math.round(R.n(g,48,20)),3,99),tc:U.clamp(Math.round(R.n(g,48,20)),3,99),
    sc:U.clamp(Math.round(ab*.8+10+R.n(g,0,5)),5,98),mo:U.clamp(Math.round(R.n(g,55,15)),10,95),mood:U.clamp(Math.round(R.n(g,60,12)),20,95),
    hl:U.clamp(Math.round(R.n(g,78,12)),20,100),sat:U.clamp(Math.round(R.n(g,58,12)),20,95),so:U.clamp(Math.round(R.n(g,50,18)),5,98),
    cb:-1,fr:[],rl:[],gl:R.i(g,0,5),st:0,lv:0,en:g.y,key:0,lg:null,sch:0,par:o.par||0,from:o.from||''};
  st.it=[st.ab,st.ar,st.sp,st.tc].indexOf(Math.max(st.ab,st.ar,st.sp,st.tc));
  return st;
};
P.logOf = function(p,g,txt){ if(!p.lg) p.lg=[]; p.lg.push([g.y,g.w,txt]); if(p.lg.length>30) p.lg.shift(); };
P.markKey = function(g,s){
  let keys=s.students.filter(x=>x.key);
  const cand=s.students.filter(x=>!x.key&&(x.ab>=82||Math.max(x.ar,x.sp,x.tc)>=88||(x.p[3]<28&&x.p[4]>68)||(x.p[2]>82&&x.p[1]>70)));
  cand.sort((a,b)=>(b.ab+Math.max(b.ar,b.sp,b.tc))-(a.ab+Math.max(a.ar,a.sp,a.tc)));
  for(const c of cand){ if(keys.length>=40) break; c.key=1; c.lg=c.lg||[]; P.logOf(c,g,`入學${s.name}（${D.TYPES[s.type].n}）`); keys.push(c); }
  // 超額移除
  if(keys.length>40){ keys.sort((a,b)=>b.ab-a.ab); for(const x of keys.slice(40)){ x.key=0; } }
};

/* ---------- 教職員 ---------- */
P.baseSalary = (g,s,role)=> W.salary(g,s.type,role);
P.newStaff = function(g, s, role, o){
  o=o||{}; const sx=R.chance(g,.5)?1:0;
  const lvl=(o.lvl!==undefined? o.lvl : 52+0.18*((s.rep?s.rep.staffSat:50)-50));
  const ex=o.ex!==undefined? o.ex : U.clamp(Math.round(R.n(g,8,6)),0,32);
  const mk=(m,sd)=>U.clamp(Math.round(R.n(g,m,sd)),8,98);
  const st={id:g.nextId++,nm:P.name(g,sx),sx,role,fld:o.fld!==undefined?o.fld:R.i(g,0,3),dt:o.dt||'',
    prof:mk(lvl+ex*.4,14),teach:mk(lvl+ex*.3,15),mgmt:mk(role==='a'||role==='d'||role==='p'?lvl+4:lvl-8,15),
    p:[0,1,2,3,4].map(()=>mk(50,18)),resp:mk(60,16),amb:mk(50,20),sat:o.sat||U.clamp(Math.round(R.n(g,62,10)),25,90),
    ex,by:g.y-(24+ex+R.i(g,0,3)),hy:g.y,perf:0,tn:0,tr:0,st:0,rl:[],lg:[],ill:0,req:0,sty:R.i(g,0,4),sal:0,know:1};
  st.sal=Math.round(P.baseSalary(g,s,role)*(1+Math.min(ex,25)*0.012)*Math.pow(((st.teach+st.prof)/2)/55,.8)*(o.salMult||1));
  return st;
};
P.staffAge = (g,p)=> g.y-p.by;
P.marketSalary = (g,s,p)=> Math.round(P.baseSalary(g,s,p.role)*(1+Math.min(p.ex,25)*0.012)*Math.pow(((p.teach+p.prof)/2)/55,.8)*(1+0.06*Math.max(0,(s.rivalAvgQ||50)-50)/25));

// 招募：開出職缺，產生候選人
P.postJob = function(g, s, role, fld, n){
  n=n||4; const cost=Math.round(W.M(g)*30000*(role==='t'?1:1.3));
  if(L.cash(s)<cost) return {ok:false,msg:'現金不足以刊登職缺'};
  L.exp(s,'eAdmin',cost);
  const wr = s.avgSalRatio||1;
  const lvl = 50+0.2*((s.rep?s.rep.ov:40)-50)+10*(wr-1)*2;
  for(let i=0;i<n;i++){
    const c=P.newStaff(g,s,role,{fld:fld,lvl:lvl+R.n(g,0,5),salMult:R.n(g,1.02,0.08)});
    c.know=0; c.exp=g.abs+14; c.cand=1; c.ask=Math.round(c.sal*U.clamp(R.n(g,1.05,.09),.85,1.3));
    s.cands.push(c);
  }
  // 校友候選人
  if(role==='t'){ const al=g.alumni.filter(a=>a.sid===s.id&&a.tch&&a.al&&!a.dead).slice(0,1); for(const a of al){ const c=P.newStaff(g,s,'t',{lvl:lvl+8,ex:2}); c.nm=a.nm; c.alumId=a.id; c.know=0; c.cand=1; c.exp=g.abs+14; c.ask=Math.round(c.sal*.9); c.amb=30; s.cands.push(c); a.tch=0; } }
  return {ok:true,msg:`已刊登職缺，收到 ${n} 份履歷。`};
};
P.interview = function(g,s,cid){
  const c=s.cands.find(x=>x.id===cid); if(!c) return {ok:false};
  const cost=Math.round(W.M(g)*8000); if(L.cash(s)<cost) return {ok:false,msg:'現金不足'};
  L.exp(s,'eAdmin',cost); c.know=1; return {ok:true,msg:'面試完成，已掌握真實能力與個性。'};
};
// 履歷顯示（未面試者含雜訊）
P.resume = function(g,c){ const f=v=>c.know? v : U.clamp(Math.round(v+((c.id*7919)%25)-12),5,99); return {teach:f(c.teach),prof:f(c.prof),mgmt:f(c.mgmt)}; };
P.offer = function(g,s,cid,salary){
  const c=s.cands.find(x=>x.id===cid); if(!c) return {ok:false,res:'gone'};
  const r=salary/c.ask;
  if(r>=1.0||(r>=.9&&R.chance(g,.4+ (s.rep?s.rep.staffSat:50)/200+ (r-.9)*3))){ P.hire(g,s,c,salary); return {ok:true,res:'accept'}; }
  if(r>=.8){ const cnt=Math.round(c.ask*.96); return {ok:true,res:'counter',counter:cnt}; }
  return {ok:true,res:'reject'};
};
P.hire = function(g,s,c,salary){
  s.cands.splice(s.cands.indexOf(c),1);
  c.cand=0; c.sal=Math.round(salary); c.hy=g.y; c.sat=Math.min(90,c.sat+8); delete c.ask; delete c.exp; c.know=1;
  s.staff.push(c); P.add(g,c); P.logOf(c,g,`受聘於${s.name}`);
  if(c.alumId){ const a=P.find(g,c.alumId); if(a){ a.al=0; P.logOf(a,g,'返校任教'); } }
  return c;
};
P.setSalary = function(g,s,id,pct){ const p=s.staff.find(x=>x.id===id); if(!p) return; p.sal=Math.round(p.sal*(1+pct)); p.sat=U.clamp(p.sat+pct*140,0,100); p.req=0; };
P.promote = function(g,s,id,to){ // to: 'd' 主任 / 'p' 校長 / 't' 教師
  const p=s.staff.find(x=>x.id===id); if(!p) return {ok:false};
  if(to==='p'){ if(s.principalId){ const o=s.staff.find(x=>x.id===s.principalId); if(o){ o.role=(o.role==='p'?'t':o.role); } } s.principalId=p.id; }
  p.role=to; if(to==='d') p.dt=p.dt||D.DT[R.i(g,0,3)];
  const raise=to==='p'?.35:.15; p.sal=Math.round(p.sal*(1+raise)); p.sat=Math.min(100,p.sat+10); p.req=0;
  P.logOf(p,g,`晉升為${to==='p'?'校長':'主任'}`); return {ok:true};
};
P.appoint = function(g,s,id,dt){ const p=s.staff.find(x=>x.id===id); if(!p) return; p.role='d'; p.dt=dt; };
P.appraise = function(g,s,p){
  const stu=U.avg(s.students,x=>x.sc)||50;
  const v=U.clamp(Math.round(p.teach*.4+p.prof*.15+p.resp*.2+p.mgmt*.05+ (stu-50)*.25+ (p.sat-50)*.1+20),0,100);
  p.perf=v; return v;
};
P.train = function(g,s,id,kind){
  const p=s.staff.find(x=>x.id===id); if(!p||p.tr>0) return {ok:false,msg:'無法培訓'};
  const cost=Math.round(W.M(g)*45000); if(L.cash(s)<cost) return {ok:false,msg:'現金不足'};
  L.exp(s,'eTrain',cost); p.tr=4;
  const cur=p[kind]; const gain=Math.round((4+R.f(g)*5)*(1-cur/115)*(0.6+p.resp/125));
  p[kind]=Math.min(99,cur+gain); p.sat=Math.min(100,p.sat+3);
  return {ok:true,msg:`${p.nm} ${kind==='teach'?'教學':kind==='prof'?'專業':'管理'}能力 +${gain}（培訓 4 週，期間不授課）`};
};
P.dismiss = function(g,s,id,why){
  const i=s.staff.findIndex(x=>x.id===id); if(i<0) return {ok:false};
  const p=s.staff[i]; const sev=Math.round(p.sal*Math.min(12,1+p.ex/3)*g.regionRule.sev/3);
  L.exp(s,'eOther',sev);
  s.staff.splice(i,1); if(s.principalId===p.id) s.principalId=0; P.del(g,p);
  for(const o of s.staff) if(o.sat>0 && P.relGet(o,p.id)) o.sat=Math.max(0,o.sat-(why==='misconduct'?0:2));
  s.rep.staffSat=Math.max(0,s.rep.staffSat-(why==='misconduct'?0:1.2));
  return {ok:true,msg:`已解聘 ${p.nm}，資遣費 ${U.money(sev)}`};
};
P.leave = function(g,s,p,why){ // 離職/退休/死亡：移出
  const i=s.staff.indexOf(p); if(i<0) return; s.staff.splice(i,1); if(s.principalId===p.id){ s.principalId=0; s.hist.principals.push({n:p.nm,y0:p.pStart||s.founded,y1:g.y}); }
  P.del(g,p); if(why==='retire'&&p.ex>10){ s.rep.social=Math.min(100,s.rep.social+.1); }
};
P.transferStaff = function(g,from,to,id){
  const i=from.staff.findIndex(x=>x.id===id); if(i<0||from===to) return {ok:false};
  const p=from.staff[i]; from.staff.splice(i,1); if(from.principalId===p.id){ from.principalId=0; } if(p.role==='p') p.role='t';
  p.sat=Math.max(0,p.sat-(p.amb>60?2:6)); p.rl=[]; to.staff.push(p); P.logOf(p,g,`調任${to.name}`); return {ok:true,msg:`${p.nm} 已調任 ${to.name}`};
};
P.mediate = function(g,s,aId,bId,mode){
  const a=s.staff.find(x=>x.id===aId), b=s.staff.find(x=>x.id===bId); if(!a||!b) return {ok:false};
  const pr=s.staff.find(x=>x.id===s.principalId); const mg=pr?pr.mgmt:40;
  if(mode==='mediate'){ const ok=R.chance(g,.35+mg/160); const cost=Math.round(W.M(g)*20000); L.exp(s,'eAdmin',cost);
    if(ok){ P.relBump(a,b,'c',60); a.sat+=3; b.sat+=3; return {ok:true,msg:'調解成功，兩人冰釋前嫌。'}; }
    P.relBump(a,b,'x',-10); return {ok:true,msg:'調解失敗，雙方仍有心結。'}; }
  if(mode==='separate'){ const other=g.schools.find(x=>x!==s&&!x.closed&&x.type===s.type); if(other){ P.transferStaff(g,s,other,bId); return {ok:true,msg:`${b.nm} 已調至${other.name}`}; } b.sat-=6; return {ok:true,msg:'無處可調，只好調整課表，雙方減少接觸。'}; }
  return {ok:false};
};

/* ---------- 校友 ---------- */
P.toAlumni = function(g, s, st, how){
  const a={id:st.id,nm:st.nm,sx:st.sx,by:st.by,sid:s.id,sn:s.name,gy:g.y,lv:s.type,ab:st.ab,
    wl:U.clamp(Math.round(st.fi*.5+st.ab*.2+R.n(g,10,8)),1,100),jb:-1,cr:U.clamp(Math.round(st.sc*.6+st.ab*.2+R.n(g,5,8)),1,100),
    mar:0,kids:[],dn:U.clamp(Math.round(st.sat*.4+st.fi*.3+R.n(g,0,10)),0,100),dd:0,nt:0,fame:0,lg:null,rf:0,tch:0,al:0,co:null,dead:0,
    fid:st.fid,fe:st.fe,p:st.p,key:st.key,how:how||'畢業'};
  if(st.key||st.ab>=85||st.sc>=90){ a.lg=st.lg||[]; }
  P.reg(g).set(a.id,a);
  return a;
};
P.alumLog = function(a,g,txt){ if(!a.lg) a.lg=[]; a.lg.push([g.y,g.w,txt]); if(a.lg.length>30) a.lg.shift(); };
P.ALUM_CAP = 2400;
P.compactAlumni = function(g){
  if(g.alumni.length<=P.ALUM_CAP) return 0;
  g.alumni.sort((x,y)=> (x.nt?1:0)-(y.nt?1:0) || x.gy-y.gy);
  const drop=g.alumni.length-Math.floor(P.ALUM_CAP*.8); let n=0; const keep=[];
  for(const a of g.alumni){
    if(n<drop && !a.nt && !a.lg){
      for(const by of a.kids){ const b=g.legacyBank[by]||(g.legacyBank[by]={n:0,ab:0,wl:0}); b.n++; b.ab+=a.ab; b.wl+=a.wl; }
      g.cohort.n++; g.cohort.dn+=a.dn; P.del(g,a); n++;
    } else keep.push(a);
  }
  g.alumni=keep; return n;
};
// 年度：校友人生（升學/就業/結婚/生子/捐款/創業/返校/死亡）
P.alumniYear = function(g){
  const out=[]; const w=g.world; const keep=[];
  for(const a of g.alumni){
    const age=g.y-a.by;
    // 死亡
    const haz = age<5?.004: Math.max(0.0003,(age/ (w.life+8))**9*.5)*(1+0.1*(g.world.cyc<-1?1:0));
    if(age>=18 && R.chance(g,haz)){
      a.dead=1; a.dy=g.y;
      if(a.nt){ g.hall.push({id:a.id,nm:a.nm,sn:a.sn,sid:a.sid,gy:a.gy,fame:a.fame,job:a.jb>=0?D.JOBS[a.jb]:'',dy:g.y,lg:(a.lg||[]).slice(-8)}); if(g.hall.length>400){ g.hall.sort((x,y)=>y.fame-x.fame); g.hall.length=300; } }
      P.del(g,a); continue;
    }
    // 職涯
    if(age>=18){
      const eduAge = D.TYPES[a.lv]?D.TYPES[a.lv].e+D.TYPES[a.lv].y:18;
      if(a.jb<0 && age>=Math.max(eduAge,18)){
        // 選職業
        const hi=a.lv==='un'||a.lv==='gs';
        const cand=[]; for(let j=0;j<D.JOBS.length;j++){ let wt=1;
          if(j===2||j===15) wt= hi&&a.ab>70?2:.05; if(j===7) wt= a.lv==='gs'?4:(hi&&a.ab>65?.8:.05);
          if(j===1) wt=(hi||a.lv==='vh'||a.lv==='jc')?1.5*(w.tech/60):.2; if(j===8) wt=(a.lv==='vh'||a.lv==='jc')?3:.4;
          if(j===3) wt=.4+ a.wl/60; if(j===5) wt=.5; if(j===12) wt=a.sx? .35:.05; if(j===13) wt=.3+w.unemp/10; if(j===0) wt=hi?1:.3;
          cand.push({j,w:wt}); }
        a.jb=R.wpick(g,cand).j;
      }
      if(a.jb>=0 && age<64){
        const dm=(g.world.cyc*0.6)+R.n(g,0,2.5);
        a.cr=U.clamp(Math.round(a.cr+ (a.ab-50)*.02+ dm*.5 + (age<35?1.2:0)),1,100);
        a.wl=U.clamp(Math.round(a.wl+ (a.cr-50)*.05+dm*.4),1,100);
        // 創業
        if(!a.co && age>=28&&age<=50 && a.cr>62 && R.chance(g,.012*(a.lv==='un'||a.lv==='vh'?1.6:1)*(a.ab/60))){
          a.co={nm:a.nm+'事業',sz:R.i(g,1,3),y:g.y}; a.jb=3; a.nt=1; a.fame+=10; P.alumLog(a,g,`創辦「${a.co.nm}」`); out.push({t:'startup',a});
        }
        if(a.co&&R.chance(g,.08)){ a.co.sz=U.clamp(a.co.sz+ (R.chance(g,.6)?1:-1),0,5); if(a.co.sz<=0){ a.co=null; a.jb=13; P.alumLog(a,g,'事業失敗'); } }
        // 成名
        if(!a.nt && a.cr>88 && R.chance(g,.25)){ a.nt=1; a.fame=30+Math.round(a.cr/4); a.lg=a.lg||[]; P.alumLog(a,g,`成為${D.JOBS[a.jb]}界知名人物`); out.push({t:'notable',a}); }
        else if(a.nt && R.chance(g,.2)) a.fame=Math.min(100,a.fame+2);
        // 返校任教
        if(age>=26&&age<=55 && !a.al && R.chance(g,.004*(a.cr/60)) && (a.lv==='un'||a.lv==='gs'||a.lv==='jc'||a.lv==='hs')) { a.tch=1; a.al=1; }
      }
      // 結婚生子
      if(!a.mar && age>=24&&age<=40 && R.chance(g,.14*(1-w.trad*.15))) { a.mar=1; if(a.nt) P.alumLog(a,g,'結婚'); }
      if(a.mar && a.sx && age>=24&&age<=40 && a.kids.length<4){
        const fert=Math.max(0.2,w.birth/ 14)*.16*(a.kids.length===0?1.3:.8);
        if(R.chance(g,fert)){ a.kids.push(g.y); if(a.nt) P.alumLog(a,g,'迎接新生命'); }
      }
      // 男性：由配偶(匿名)—以母方計；若男性已婚亦以一半機率生子
      if(a.mar && !a.sx && age>=26&&age<=45 && a.kids.length<4 && R.chance(g,Math.max(0.2,w.birth/14)*.08)) a.kids.push(g.y);
      // 捐款
      if(a.jb>=0 && age>=25 && a.dn>20 && a.wl>35){
        const p=(a.dn/100)*(a.wl/100)*.12*g.regionRule.donate*(a.nt?2.5:1);
        if(R.chance(g,p)){ const amt=Math.round(W.M(g)*(20000+a.wl*1500)*(a.nt?6:1)*(a.co?1.8:1)); out.push({t:'donate',a,amt}); a.dd+=amt; }
      }
      if(a.rf<20 && a.dn>55 && age>=28 && R.chance(g,.05)) a.rf++;
    }
    keep.push(a);
  }
  g.alumni=keep; const cut=P.compactAlumni(g);
  for(const k of Object.keys(g.legacyBank)) if(+k<g.y-60) delete g.legacyBank[k];
  return out;
};
// 校友子女：回流申請者（某學制入學年齡）
P.legacyApplicants = function(g,s){
  const T=D.TYPES[s.type], by=g.y-T.e, res=[];
  for(const a of g.alumni){
    if(a.sid!==s.id && !(g.group.legacyGroup)) continue;
    if(a.dead) continue;
    for(let i=0;i<a.kids.length;i++) if(a.kids[i]===by){ res.push({par:a.id,ab:a.ab*.5+25+R.n(g,0,13),fi:a.wl,fid:a.fid}); }
  }
  const b=g.legacyBank[by]; if(b&&b.n>0){ const n=Math.round(b.n*.4); for(let i=0;i<n;i++) res.push({par:0,ab:b.ab/b.n*.5+25+R.n(g,0,13),fi:b.wl/b.n,fid:0}); }
  return res;
};

/* ---------- NPC 自主行為引擎（分層模擬）---------- */
P.compat = (a,b)=>{ const pa=a.p,pb=b.p; return 100-(Math.abs(pa[3]-pb[3])*.25+Math.abs(pa[4]-pb[4])*.2+Math.abs(pa[2]-pb[2])*.15+Math.abs(pa[0]-pb[0])*.1); };
P.npcWeek = function(g, s){
  const stats={inter:0,incidents:0}; const incidents=[];
  const keyS=s.students.filter(x=>x.key&&x.st===0);
  const staff=s.staff.filter(x=>x.st===0);
  const grp=s.students; // 同校
  // 關鍵學生行動
  for(const a of keyS){
    if(!R.chance(g,.45)) continue; stats.inter++;
    const act=R.f(g);
    const mates=grp.filter(x=>x!==a&&x.gr===a.gr&&x.st===0);
    if(!mates.length) continue;
    const b=R.pick(g,mates); const cp=P.compat(a,b);
    if(act<.5){ // 社交
      if(cp>62 && R.chance(g,.6)){ P.relBump(a,b,'f',8); if(a.fr.length<3&&!a.fr.includes(b.id)) a.fr.push(b.id); if(b.fr.length<3&&!b.fr.includes(a.id)) b.fr.push(a.id); a.so=Math.min(100,a.so+.5); }
      else if(cp<42 && (a.p[3]<40||b.p[3]<40)){ P.relBump(a,b,'x',-9); const r=P.relGet(a,b.id);
        if(r&&r[2]<-45 && a.p[3]<35 && R.chance(g,.18)){ incidents.push({t:'bully',a,b}); stats.incidents++; r[2]+=15; } }
      else if(Math.abs(a.ab-b.ab)<8 && a.p[1]>55 && b.p[1]>55){ P.relBump(a,b,'r',6); a.mo=Math.min(100,a.mo+.4); }
    } else if(act<.8 && staff.length){ // 師生
      const t=R.pick(g,staff.filter(x=>x.role==='t'||x.role==='d'));
      if(t){ const good=t.teach/100*(a.mood<50?1.2:1); if(R.chance(g,good*.5)){ P.relBump(t,a,'m',7); a.mo=Math.min(100,a.mo+1.2); a.mood=Math.min(100,a.mood+.8);
          const r=P.relGet(a,t.id); if(r&&r[2]>50&&!a._m){ a._m=1; P.logOf(a,g,`受${t.nm}老師悉心指導`); } }
        else if(a.p[3]<35&&t.p[3]<45&&R.chance(g,.15)){ P.relBump(t,a,'x',-8); } }
    } else { // 能力成長 / 事蹟
      if(Math.max(a.ar,a.sp,a.tc)>=88&&R.chance(g,.03)) P.logOf(a,g,`在${D.FIELDS[a.it]}方面展露才華`);
    }
  }
  // 教職員互動
  for(const t of staff){
    if(!R.chance(g,.22)) continue; stats.inter++;
    const o=R.pick(g,staff); if(o===t) continue; const cp=P.compat(t,o);
    if(cp>60&&R.chance(g,.55)){ P.relBump(t,o,'k',5); const rr=P.relGet(t,o.id); if(rr&&rr[2]>40&&R.chance(g,.1)) { P.relBump(t,o,'c',3); } }
    else if(cp<42 && t.amb>55 && o.amb>55 && R.chance(g,.25)){ P.relBump(t,o,'x',-10); t.sat-=.4; o.sat-=.4;
      const r=P.relGet(t,o.id); if(r&&r[2]<-50&&!s._cf){ s._cf=1; incidents.push({t:'conflict',a:t,b:o}); } }
  }
  return incidents;
};
// 月度：一般學生批次（輕量模擬）
P.studentMonth = function(g, s){
  const n=s.students.length; if(!n) return;
  const byGr={}; for(const x of s.students){ (byGr[x.gr]||(byGr[x.gr]=[])).push(x); }
  const q=s.quality, ph=D.PHIL[s.cfg.phil];
  const lib=s.fac?s.fac.score:50;
  for(const x of s.students){
    if(x.st===1){ x.lv--; if(x.lv<=0) x.st=0; continue; }
    // 社交：不足三位朋友時嘗試結交
    x.fr=x.fr.filter(id=>{ const o=P.find(g,id); return o&&o.st!==undefined&&x.gr-o.gr<=1&&o.gr-x.gr<=1; });
    if(x.fr.length<3 && R.chance(g,.35)){ const pool=byGr[x.gr]; if(pool&&pool.length>1){ const o=pool[(R.f(g)*pool.length)|0]; if(o!==x&&o.fr.length<3&&!x.fr.includes(o.id)&&P.compat(x,o)>58){ x.fr.push(o.id); o.fr.push(x.id); } } }
    // 社團
    if(x.cb<0 && s.cfg.clubs.length && R.chance(g,.2)){ const c=s.cfg.clubs.filter(c=>D.CLUBS[c].f===x.it); x.cb=c.length?c[(R.f(g)*c.length)|0]:s.cfg.clubs[(R.f(g)*s.cfg.clubs.length)|0]; x.so=Math.min(100,x.so+3); }
    // 心情/滿意度
    const tgtMood = 50+ (q-50)*.25 + x.fr.length*5 + (x.cb>=0?5:0) - ph.stress*14 + (s.fac?(s.fac.sat-50)*.3:0) - Math.max(0,(s.ratio||1)-1.1)*30 + (s.trustAdj||0)*0.2 - (x.p[4]-50)*.12;
    x.mood=U.clamp(Math.round(x.mood+(tgtMood-x.mood)*.2),5,100);
    const hardship = (x.fi<30 && s.cfg.tuition>W.tuitionNorm(g,s.type)*.9 && !x.sch)? -6:0;
    x.sat=U.clamp(Math.round(x.sat+((x.mood*.5+q*.3+ph.sat+ (s.fac?s.fac.sat*.1:0) + hardship+ 10)-x.sat)*.2),5,100);
    x.hl=U.clamp(Math.round(x.hl+(R.n(g,0,2)+ (s.fac?(s.fac.health-50)*.04:0))),10,100);
    if(R.chance(g,.003*(100-x.hl)/30)) { x.st=1; x.lv=R.i(g,8,30); if(x.key) P.logOf(x,g,'因健康問題休學'); }
  }
};
})(typeof window!=='undefined'?window:globalThis);
