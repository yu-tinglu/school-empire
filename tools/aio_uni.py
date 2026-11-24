#!/usr/bin/env python3
"""大學生 all-in-one 表 → u<sx>_a.png（正面走路列）＋ u<sx>_a_act.png（跑／坐讀／聊天／其他 4×4）；背面直接用 uni_*_back.png"""
import numpy as np,shutil
from PIL import Image
import scipy.ndimage as nd
R='/home/claude/school-empire/assets'
BANDS={'m':[(14,208),(236,434),(463,644),(660,854),(867,1069),(1086,1301)],'f':[(17,211),(241,430),(465,648),(669,856),(873,1082),(1095,1299)]}
def comps(im,y0,y1,n):
    a=np.array(im.convert('RGB')).astype(int)[y0:y1]; fg=(np.minimum(a[...,0],a[...,2])-a[...,1])<60
    lab,k=nd.label(nd.binary_dilation(fg,iterations=9)); out=[]
    for i,sl in enumerate(nd.find_objects(lab)):
        if (lab[sl]==i+1).sum()<2500: continue
        out.append(sl)
    out.sort(key=lambda s:s[1].start)
    return out
for sx,key in ((0,'m'),(1,'f')):
    im=Image.open(f'{R}/source/extra/uni_{key}_aio.png').convert('RGB'); B=BANDS[key]
    cs0=comps(im,B[0][0],B[0][1],6); assert len(cs0)==6,(key,len(cs0)); H0=B[0][1]-B[0][0]+16; strip=Image.new('RGB',(6*260,H0),(255,0,255))
    for i,s in enumerate(cs0):
        f=im.crop((s[1].start,B[0][0]+s[0].start,s[1].stop,B[0][0]+s[0].stop)); strip.paste(f,(i*260+(260-f.width)//2,H0-8-f.height))
    strip.save(f'{R}/source/walk/u{sx}_a.png')
    shutil.copy(f'{R}/source/extra/uni_{key}_back.png',f'{R}/source/walk/u{sx}_a_back.png')
    CW=300; grid=Image.new('RGB',(CW*4,CW*4),(255,0,255)); rows=[]
    for r in range(2,6):
        y0,y1=B[r]; cs=comps(im,y0,y1,4); assert len(cs)==4,(key,r,len(cs)); rows.append([(im.crop((s[1].start,y0+s[0].start,s[1].stop,y0+s[0].stop)),) for s in cs])
    # 第 4 列（跳躍欄）：跑步 2、4 + 戴耳機 + 看手機
    row4=[rows[0][1],rows[0][3],rows[3][2],rows[3][3]]; rows=[rows[0],rows[1],rows[2],row4]
    for r,row in enumerate(rows):
        for c,(f,) in enumerate(row):
            grid.paste(f,(c*CW+(CW-f.width)//2,r*CW+CW-12-f.height))
    grid.save(f'{R}/source/walk/u{sx}_a_act.png'); print(key,'ok')
