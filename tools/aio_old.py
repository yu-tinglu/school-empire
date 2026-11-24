#!/usr/bin/env python3
"""清末風小女孩 all-in-one 表 → q1_a / q1_b（正面、背面、動作 4×4），角色代號 q=oldk"""
import numpy as np
from PIL import Image
import scipy.ndimage as nd
R='/home/claude/school-empire/assets'
def boxes(im,region,it=7,minarea=2500):
    x0,y0,x1,y1=region; a=np.array(im.crop(region).convert('RGB')).astype(int); fg=(np.minimum(a[...,0],a[...,2])-a[...,1])<60
    lab,k=nd.label(nd.binary_dilation(fg,iterations=it)); out=[]
    for i,sl in enumerate(nd.find_objects(lab)):
        if (lab[sl]==i+1).sum()<minarea: continue
        out.append((x0+sl[1].start,y0+sl[0].start,x0+sl[1].stop,y0+sl[0].stop))
    return sorted(out)
def strip(im,bx,cw,path):
    H=max(b[3]-b[1] for b in bx)+16; s=Image.new('RGB',(len(bx)*cw,H),(255,0,255))
    for i,b in enumerate(bx):
        f=im.crop(b); s.paste(f,(i*cw+(cw-f.width)//2,H-8-f.height))
    s.save(path)
def grid(im,rows,path,CW=300):
    g=Image.new('RGB',(CW*4,CW*4),(255,0,255))
    for r,row in enumerate(rows):
        assert len(row)==4,(path,r,len(row))
        for c,b in enumerate(row):
            f=im.crop(b); g.paste(f,(c*CW+(CW-f.width)//2,r*CW+CW-12-f.height))
    g.save(path)
# aio1
im=Image.open(f'{R}/source/extra/qing_aio1.png').convert('RGB')
strip(im,boxes(im,(0,40,1450,350)),260,f'{R}/source/walk/q1_a.png'); strip(im,boxes(im,(0,370,1450,700)),260,f'{R}/source/walk/q1_a_back.png')
bx=boxes(im,(1500,0,2172,724)); rows=[sorted(bx[i*4:(i+1)*4]) for i in range(4)]
bx.sort(key=lambda b:(round(b[1]/120),b[0])); rows=[sorted([b for b in bx if lo<=(b[1]+b[3])/2<hi]) for lo,hi in ((0,182),(182,346),(346,527),(527,724))]
grid(im,rows,f'{R}/source/walk/q1_a_act.png')
# aio2：正面左上、背面右上、動作左下（直欄相連，要依水平投影切列）
im=Image.open(f'{R}/source/extra/qing_aio2.png').convert('RGB')
strip(im,boxes(im,(0,0,900,215)),260,f'{R}/source/walk/q1_b.png'); strip(im,boxes(im,(1100,0,2172,215)),260,f'{R}/source/walk/q1_b_back.png')
reg=(150,215,700,724); a=np.array(im.crop(reg).convert('RGB')).astype(int); fg=(np.minimum(a[...,0],a[...,2])-a[...,1])<60
pr=fg.sum(1)>2; bands=[];s=None
for y,v in enumerate(pr):
    if v and s is None:s=y
    if not v and s is not None:
        if y-s>30:bands.append((s,y))
        s=None
if s is not None and len(pr)-s>30: bands.append((s,len(pr)))
print('bands',bands)
rows=[]
for (s,e) in bands:
    rows.append(boxes(im,(reg[0],reg[1]+s,reg[2],reg[1]+e),it=4,minarea=1200))
print([len(r) for r in rows])
grid(im,rows,f'{R}/source/walk/q1_b_act.png')
