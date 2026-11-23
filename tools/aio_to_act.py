#!/usr/bin/env python3
"""把「一張圖包含走路/背面/動作(一整列16格)」的男行政總表，轉成 4x4 動作表 assets/source/walk/a0_a_act.png"""
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
import os
R=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
im=Image.open(f'{R}/assets/source/extra/admin_m_aio.png').convert('RGB'); a=np.array(im).astype(int)
m=(np.minimum(a[:,:,0],a[:,:,2])-a[:,:,1])>100; fg=~m
H=a.shape[0]; y0=int(H*.70)
sub=fg[y0:]; lab,n=ndi.label(ndi.binary_dilation(sub,iterations=5))
fo=ndi.find_objects(lab); objs=[(fo[i-1],i) for i in range(1,n+1)]
big=[(s,i) for s,i in objs if (lab==i).sum()>1500]
big.sort(key=lambda t:t[0][1].start)
print('frames',len(big))
assert len(big)==16
CW,CH=384,256; out=Image.new('RGB',(CW*4,CH*4),(255,0,255))
for k,(s,i) in enumerate(big):
    ys,xs=s; box=(xs.start,y0+ys.start,xs.stop,y0+ys.stop); f=im.crop(box)
    fa=np.array(f); fa[lab[s]!=i]=(255,0,255); f=Image.fromarray(fa)
    r,c=divmod(k,4); ox=c*CW+(CW-f.width)//2; oy=r*CH+(CH-6-f.height)  # 腳底對齊同一水平
    out.paste(f,(ox,oy))
out.save(f'{R}/assets/source/walk/a0_a_act.png'); print('ok')
