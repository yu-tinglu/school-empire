# 產生「佔位」素材：把程式暫代繪圖烘成 PNG，放進 assets/，並寫 manifest.json。
# 這些圖不是手繪美術；請用正式插畫覆蓋同名檔並把 manifest 的 status 改為 final。
import base64, json, os, sys
from playwright.sync_api import sync_playwright
ROOT=os.path.join(os.path.dirname(__file__),'..'); AS=os.path.join(ROOT,'assets')
JS=r"""
(()=>{ const ART=SE.ART, out=[]; const put=(key,cat,path,cv,ox,oy,extra)=>out.push(Object.assign({key,cat,path,ox,oy,w:cv.width,h:cv.height,data:cv.toDataURL('image/png')},extra||{}));
 const seasons=['spring','summer','autumn','winter'];
 // 地面磚（128x64，菱形，四季×3 變體）＋步道磚
 const hs=ART.hs; const tile=(season,v,path)=>{ const cv=document.createElement('canvas'); cv.width=128; cv.height=64; const c=cv.getContext('2d'); c.beginPath(); c.moveTo(64,0); c.lineTo(128,32); c.lineTo(64,64); c.lineTo(0,32); c.closePath(); c.clip();
   const base=path?'#e3d3ad':{spring:'#a9d884',summer:'#8cc96a',autumn:'#cdbd68',winter:'#ecf2f0'}[season]; c.fillStyle=base; c.fillRect(0,0,128,64);
   for(let i=0;i<14;i++){ const x=hs(i,v,11)*128,y=hs(i,v,12)*64,r=14+hs(i,v,13)*20; const g=c.createRadialGradient(x,y,1,x,y,r); g.addColorStop(0,hs(i,v,14)>.5?'rgba(255,255,210,.18)':'rgba(40,100,60,.14)'); g.addColorStop(1,'rgba(0,0,0,0)'); c.fillStyle=g; c.fillRect(x-r,y-r,r*2,r*2); }
   if(path){ for(let i=0;i<14;i++){ c.fillStyle=`rgba(120,95,60,${.12+hs(i,2,3)*.2})`; c.beginPath(); c.ellipse(hs(i,3,v)*128,hs(i,4,v)*64,2+hs(i,5,v)*3,1.2+hs(i,6,v)*1.4,0,0,7); c.fill(); } }
   else { for(let i=0;i<46;i++){ const x=hs(i,v,21)*128,y=hs(i,v,22)*64; c.strokeStyle=season==='winter'?'rgba(180,200,210,.5)':(hs(i,v,23)>.5?'rgba(60,120,50,.5)':'rgba(130,170,70,.5)'); c.lineWidth=1.3; c.beginPath(); c.moveTo(x,y); c.lineTo(x-2,y-5); c.moveTo(x,y); c.lineTo(x+1,y-6); c.moveTo(x,y); c.lineTo(x+3,y-4); c.stroke(); } }
   return cv; };
 for(const s of seasons) for(let v=0;v<3;v++) put(`ground:grass:${s}:${v}`,'ground',`ground/grass_${s}_${v}.png`,tile(s,v,false),64,0);
 put('ground:path:any:0','ground','ground/path_0.png',tile('summer',0,true),64,0);
 // 建築：教學樓 lv1-3 / 破舊 / 荒廢
 const mk=(lv,dur)=>({id:1,t:'classroom',lv,dur,prog:0}); const d=SE.D.BLD.classroom;
 for(const lv of [1,2,3]){ const r=ART.buildingSprite(mk(lv,90),d,{stage:2,season:'summer'}); put(`bld:classroom:${lv}:any:0`,'building',`buildings/classroom_lv${lv}_c0.png`,r.cv,r.ox,r.oy); }
 for(const [cd,dur] of [[1,40],[2,15]]){ const r=ART.buildingSprite(mk(1,dur),d,{stage:2,season:'summer'}); put(`bld:classroom:1:any:${cd}`,'building',`buildings/classroom_lv1_c${cd}.png`,r.cv,r.ox,r.oy); }
 // 樹：三種×四季×三變體
 for(const k of ['round','cone','blossom']) for(const s of seasons) for(let v=0;v<3;v++){ const r=ART.treeSprite(k,s,v,false); put(`tree:${k}:${s}:${v}`,'tree',`trees/${k}_${s}_${v}.png`,r.cv,r.ox,r.oy); }
 // 裝飾：花圃、長椅、路燈、樹籬、噴泉、校門、雜草
 for(const n of ['flowers','bench','lamp','hedge','fountain','gate','weeds']){ const r=ART.decorSprite(n,'summer'); put(`decor:${n}:any`,'decor',`decor/${n}.png`,r.cv,r.ox,r.oy,r.wcell===2?{wcell:2}:{}); }
 // 人物：學生/教師 × 男女 × 兩個外觀（22 影格橫向精靈圖，每格 34x54）
 const mkL=(role,sx,v)=>ART.lookOf({id:100+v*37+sx*11+(role==='student'?0:5),sx,by:SE.UI.g.y-(role==='student'?13:38),gr:6,ex:8,role:role==='student'?undefined:'t'},role==='student'?'s':'t',null,2);
 for(const role of ['student','teacher']) for(const sx of [0,1]) for(let v=0;v<2;v++){ const L=mkL(role,sx,v); const sh=ART.chibiSheet(L); put(`char:${role}:${sx}:${v}`,'char',`chars/${role}_${sx}_${v}.png`,sh.cv,0,0,{fw:sh.fw,fh:sh.fh,ax:sh.ax,ay:sh.ay,frames:ART.CHIBI.FR}); }
 return out; })()
"""
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox']); pg=b.new_page(viewport={'width':900,'height':500})
    pg.goto('http://localhost:8765/index.html'); pg.wait_for_timeout(500)
    pg.click('[data-act=newGame]'); pg.click('[data-act=suType][data-v=hs]'); pg.click('[data-act=suGo]'); pg.wait_for_timeout(500)
    # 確保匯出的是程式暫代繪圖（不吃現有 manifest）
    pg.evaluate("SE.ASSETS.man=null")
    res=pg.evaluate(JS); b.close()
man={'spec_version':1,'note':'status: final=正式美術；placeholder=程式烘出的佔位圖（非手繪）。未列入此檔者＝待生成。','assets':{}}
for r in res:
    fp=os.path.join(AS,r['path']); os.makedirs(os.path.dirname(fp),exist_ok=True)
    open(fp,'wb').write(base64.b64decode(r['data'].split(',')[1]))
    e={'src':r['path'],'ox':r['ox'],'oy':r['oy'],'k':1,'cat':r['cat'],'status':'placeholder','w':r['w'],'h':r['h']}
    for k in ('wcell','fw','fh','ax','ay','frames'):
        if k in r: e[k]=r[k]
    man['assets'][r['key']]=e
json.dump(man,open(os.path.join(AS,'manifest.json'),'w'),ensure_ascii=False,indent=1)
print(len(res),'assets')
