// 程式繪製的建築改用 2× 超取樣渲染（畫布放大、座標不變），線條與文字更清晰；顯示時以 k=1/ss 縮回。
(function(root){ 'use strict'; const SE=root.SE, ART=SE.ART; if(!ART||!root.HTMLCanvasElement) return;
const gc=HTMLCanvasElement.prototype.getContext;
HTMLCanvasElement.prototype.getContext=function(t,o){ const c=gc.call(this,t,o); if(ART._ss&&t==='2d'&&!this._ss){ const ss=ART._ss; this._ss=ss; this.width=Math.round(this.width*ss); this.height=Math.round(this.height*ss); const c2=gc.call(this,'2d',o); c2.scale(ss,ss); return c2; } return c; };
const done=new WeakSet();
const wrapHi=name=>{ const f=ART[name]; ART[name]=function(){ const q=SE.UI&&SE.UI.map&&SE.UI.map.quality; const ss=q==='eco'?1:2; if(ss===1||ART._ss) return f.apply(this,arguments); ART._ss=ss; let r; try{ r=f.apply(this,arguments); } finally{ ART._ss=0; } if(r&&r.cv&&r.cv._ss&&!done.has(r)){ done.add(r); r.k=1/r.cv._ss; } return r; }; };
wrapHi('buildingSprite'); wrapHi('treeSprite'); wrapHi('decorSprite');
})(typeof window!=='undefined'?window:globalThis);
