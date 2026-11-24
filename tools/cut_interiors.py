# 剖面圖（透視用）：assets/source/bld/cut_<type>.png → assets/bld/cut_<type>.png，manifest key cut:<type>:any
import json,os,numpy as np
from PIL import Image
from scipy import ndimage as ndi
FP={'classroom':(3,2),'lab':(2,2),'library':(3,2),'dorm':(3,2),'canteen':(3,2),'clinic':(2,1),'workshop':(3,2),'research':(3,2)}
man=json.load(open('assets/manifest.json'))
for t,(w,h) in FP.items():
    p=f'assets/source/bld/cut_{t}.png'
    if not os.path.exists(p): continue
    a=np.array(Image.open(p).convert('RGB')).astype(float)
    m=np.minimum(a[...,0],a[...,2])-a[...,1]
    alpha=np.clip(1-(m-40)/120,0,1)
    fg=ndi.binary_opening(alpha>.5,iterations=1)
    lab,n=ndi.label(ndi.binary_dilation(fg,iterations=3))
    sz=ndi.sum(fg,lab,range(1,n+1)); keep=lab==(1+int(np.argmax(sz)))
    keep=ndi.binary_fill_holes(keep)
    al=np.where(ndi.binary_dilation(keep,iterations=2),alpha,0)
    rgb=a.copy()
    for ch in (0,2): rgb[...,ch]=np.minimum(rgb[...,ch],np.maximum(a[...,1],rgb[...,ch]-m*.8))
    ys,xs=np.nonzero(al>.3); y0,y1,x0,x1=ys.min(),ys.max()+1,xs.min(),xs.max()+1
    o=Image.fromarray(np.dstack([rgb,al*255]).astype(np.uint8)[y0:y1,x0:x1],'RGBA')
    s=(w+h)*32/(x1-x0)
    o=o.resize((round((x1-x0)*s),round((y1-y0)*s)),Image.LANCZOS)
    ox=h*32+(o.width-(w+h)*32)/2; oy=o.height-(w+h)*16-2
    o.save(f'assets/bld/cut_{t}.png',optimize=True)
    man['assets'][f'cut:{t}:any']={'src':f'bld/cut_{t}.png','ox':round(ox,1),'oy':round(oy,1),'k':1,'cat':'building','status':'final','w':o.width,'h':o.height,'origin':'使用者提供 ChatGPT 剖面圖（透視用，現代版，套用所有年代）'}
    print(t,o.size)
json.dump(man,open('assets/manifest.json','w'),ensure_ascii=False,indent=1)
