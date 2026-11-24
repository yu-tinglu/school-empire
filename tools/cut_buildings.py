import json,sys,numpy as np
from PIL import Image
from scipy import ndimage as ndi
SRC='assets/source/bld/sheet_lv1_era3.png'
ORDER=[('classroom',3,2),('office',2,2),('library',3,2),('lab',2,2),('workshop',3,2),('gym',3,3),('field',4,3),('pool',3,2),('dorm',3,2),('canteen',3,2),('audit',3,3),('clinic',2,1),('research',3,2),('admin',3,3),('parking',3,2),('landscape',2,2)]
im=Image.open(SRC).convert('RGB');a=np.array(im).astype(float);H,W=a.shape[:2]
# 洋紅鍵：以「洋紅度」算 alpha，並去溢色
m=np.minimum(a[...,0],a[...,2])-a[...,1]   # 洋紅度
alpha=np.clip(1-(m-40)/120,0,1)
fg=alpha>.5
fg=ndi.binary_opening(fg,iterations=1)
lab,n=ndi.label(ndi.binary_dilation(fg,iterations=3))
cw,ch=W/4,H/4
man=json.load(open('assets/manifest.json'))
for i,(t,w,h) in enumerate(ORDER):
    r,c=divmod(i,4); cx,cy=(c+.5)*cw,(r+.5)*ch
    # 選與格心最近、面積夠大的連通塊
    best=None
    for j,s in enumerate(ndi.find_objects(lab),1):
        mk=(lab[s]==j)
        if mk.sum()<4000: continue
        yy,xx=np.nonzero(mk); mx=xx.mean()+s[1].start; my=yy.mean()+s[0].start
        d=abs(mx-cx)+abs(my-cy)
        if best is None or d<best[0]: best=(d,j)
    j=best[1]
    # 同格內其他塊（樹角落）一併保留：落在格內且面積>800
    keep=(lab==j)
    for k,s in enumerate(ndi.find_objects(lab),1):
        if k==j: continue
        mk=(lab[s]==k)
        if mk.sum()<800: continue
        yy,xx=np.nonzero(mk); mx=xx.mean()+s[1].start; my=yy.mean()+s[0].start
        if abs(mx-cx)<cw*.5 and abs(my-cy)<ch*.5 and np.hypot(mx-cx,my-cy)<np.hypot(mx-((c+.5)*cw),0)+ch: keep|=(lab==k)
    keep=ndi.binary_fill_holes(keep)
    al=np.where(ndi.binary_dilation(keep,iterations=2),alpha,0)
    rgb=a.copy()
    # 去洋紅溢色
    sp=np.clip((m)/255,0,1)[...,None]
    g=rgb[...,1:2]; rgb[...,0]=np.minimum(rgb[...,0],np.maximum(g[...,0],rgb[...,0]-m*.8)); rgb[...,2]=np.minimum(rgb[...,2],np.maximum(g[...,0],rgb[...,2]-m*.8))
    ys,xs=np.nonzero(al>.3); y0,y1,x0,x1=ys.min(),ys.max()+1,xs.min(),xs.max()+1
    out=np.dstack([rgb,al*255]).astype(np.uint8)[y0:y1,x0:x1]
    o=Image.fromarray(out,'RGBA')
    bw=x1-x0; s=(w+h)*32*1.08/bw   # 地台略放大
    nw,nh=round(bw*s),round((y1-y0)*s)
    o=o.resize((max(nw,1),max(nh,1)),Image.LANCZOS)
    # 錨點：佔地菱形上頂點。菱形底頂點＝圖底；寬度置中於 (w+h)*32
    ox=h*32+( o.width-(w+h)*32)/2; oy=o.height-(w+h)*16-4
    o.save(f'assets/bld/{t}_1.png',optimize=True)
    man['assets'][f'bld:{t}:1:any:0']={'src':f'bld/{t}_1.png','ox':round(ox,1),'oy':round(oy,1),'k':1,'cat':'building','status':'final','w':o.width,'h':o.height,'origin':'使用者提供 ChatGPT 建築總覽圖（2005–2035，Lv1，套用所有年代）'}
    print(t,o.size,round(ox),round(oy))
json.dump(man,open('assets/manifest.json','w'),ensure_ascii=False,indent=1)
