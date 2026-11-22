(function(root){
'use strict';
const SE = root.SE = root.SE || {};
SE.VERSION = 3;

/* ---------- 可重現亂數 (mulberry32)，狀態存在 g.rng.s ---------- */
const R = SE.R = {};
R.f = function(g){
  let a = g.rng.s = (g.rng.s + 0x6D2B79F5) >>> 0; let t = a;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
R.i = (g,a,b)=> a + Math.floor(R.f(g)*(b-a+1));
R.pick = (g,arr)=> arr[Math.floor(R.f(g)*arr.length)];
R.chance = (g,p)=> R.f(g) < p;
R.n = (g,m=0,sd=1)=>{ const u=1-R.f(g), v=R.f(g); return m + sd*Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v); };
R.wpick = (g,arr,wf)=>{
  let tot=0; const ws=arr.map(x=>{const w=Math.max(0, wf?wf(x):x.w); tot+=w; return w;});
  if(tot<=0) return arr[Math.floor(R.f(g)*arr.length)];
  let r=R.f(g)*tot; for(let i=0;i<arr.length;i++){ r-=ws[i]; if(r<=0) return arr[i]; }
  return arr[arr.length-1];
};
R.shuffle = (g,a)=>{ for(let i=a.length-1;i>0;i--){ const j=Math.floor(R.f(g)*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; };
R.poisson = (g,l)=>{ if(l<=0) return 0; if(l>30) return Math.max(0,Math.round(R.n(g,l,Math.sqrt(l)))); const L=Math.exp(-l); let k=0,p=1; do{k++; p*=R.f(g);}while(p>L); return k-1; };

/* ---------- 工具 ---------- */
const U = SE.U = {};
U.clamp = (x,a,b)=> x<a?a:(x>b?b:x);
U.lerp = (a,b,t)=> a+(b-a)*t;
U.sum = (arr,f)=>{ let s=0; for(const x of arr) s+= f?f(x):x; return s; };
U.avg = (arr,f)=> arr.length? U.sum(arr,f)/arr.length : 0;
U.clone = o=> JSON.parse(JSON.stringify(o));
U.r0 = Math.round;
U.interp = (pts, x, geo)=>{ // pts: [[x,y],...] 已排序
  if(x<=pts[0][0]) return pts[0][1];
  for(let i=1;i<pts.length;i++){
    if(x<=pts[i][0]){ const t=(x-pts[i-1][0])/(pts[i][0]-pts[i-1][0]);
      return geo? pts[i-1][1]*Math.pow(pts[i][1]/pts[i-1][1], t) : U.lerp(pts[i-1][1], pts[i][1], t); }
  }
  return pts[pts.length-1][1];
};
U.hash = s=>{ let h=2166136261>>>0; for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619)>>>0; } return h.toString(16); };
U.money = n=>{
  if(!isFinite(n)) return '—';
  const neg=n<0, a=Math.abs(n); let s;
  if(a>=1e8) s=(a/1e8).toFixed(2)+'億'; else if(a>=1e4) s=(a/1e4).toFixed(a>=1e6?0:1)+'萬'; else s=String(Math.round(a));
  return (neg?'-':'')+s;
};
U.num = n=> isFinite(n)? Math.round(n).toLocaleString('en-US') : '—';
U.pct = (n,d=0)=> (n*100).toFixed(d)+'%';
U.f1 = n=> isFinite(n)? (Math.round(n*10)/10).toFixed(1):'—';
U.idStr = (p,n)=> p+n;

/* ---------- 日曆 ---------- */
// 一年 52 週。學期1: 36~52 週；寒假 1~3 週；學期2: 4~26 週；暑假 27~35 週
const CAL = SE.CAL = {};
CAL.monthOf = w=> Math.min(12, Math.floor((w-1)*12/52)+1);
CAL.isNewMonth = w=> w===1 || CAL.monthOf(w)!==CAL.monthOf(w-1);
CAL.inSession = w=> (w>=36) || (w>=4 && w<=26);
CAL.sem = w=> w>=36?1:(w>=4&&w<=26?2:0);
CAL.W_GRAD=26; CAL.W_ADMIT=30; CAL.W_SEM1=36; CAL.W_SEM2=4;
CAL.phase = w=>{
  if(w>=27&&w<=35) return '暑假';
  if(w<=3) return '寒假';
  if(w>=10&&w<=29) return '招生季';
  return '學期中';
};
CAL.tags = w=>{
  const t=[];
  if(w>=10&&w<=29) t.push('招生季');
  if(w>=19&&w<=21) t.push('期末考');
  if(w>=24&&w<=26) t.push('畢業季');
  if(w>=48&&w<=51) t.push('期末考');
  if(w===14||w===44) t.push('期中考');
  if(w===8) t.push('校慶');
  if(w>=27&&w<=35) t.push('暑假');
  if(w<=3) t.push('寒假');
  return t;
};
CAL.label = (y,w)=> `${y}年 第${w}週（${CAL.monthOf(w)}月）`;
CAL.abs = (y,w)=> y*52+w;
})(typeof window!=='undefined'?window:globalThis);
