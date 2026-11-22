#!/usr/bin/env python3
"""室內場景：從素材 19（九種教室）裁出，寫入 assets/interiors 並更新 manifest（key: room:<type>:<variant>）。"""
import sys,os,json
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
from segment import rm_bg,defringe
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src=Image.open(f'{ROOT}/assets/source/19_classroom_variants.png').convert('RGB')
CELLS=[(10,10,515,320),(515,10,1005,320),(1000,10,1536,320),(10,315,515,590),(515,315,1005,590),(1000,315,1536,590),(10,565,515,865),(515,565,1005,865),(1000,565,1536,865)]
NAMES=['classroom','classroom2','lab','art','music','computer','library','kitchen','club']
MAP={'classroom':['classroom','classroom2'],'lab':['lab'],'library':['library'],'canteen':['kitchen'],'dorm':['club'],'clinic':['club'],'office':['club'],'admin':['club'],'research':['lab'],'workshop':['art'],'audit':['music']}
mp=f'{ROOT}/assets/manifest.json'; m=json.load(open(mp))
for n,c in zip(NAMES,CELLS):
    im=src.crop(c).convert('RGBA'); W,H=im.size
    from PIL import ImageDraw,ImageFilter
    ix,iy,cx,cy=.025*W,.03*H,.11*W,.17*H
    pts=[(ix+cx,iy),(W-ix-cx,iy),(W-ix,iy+cy),(W-ix,H-iy-cy),(W-ix-cx,H-iy),(ix+cx,H-iy),(ix,H-iy-cy),(ix,iy+cy)]
    mk=Image.new('L',(W*2,H*2),0); ImageDraw.Draw(mk).polygon([(x*2,y*2) for x,y in pts],fill=255); mk=mk.resize((W,H),Image.LANCZOS).filter(ImageFilter.GaussianBlur(.8))
    im.putalpha(mk); bb=mk.point(lambda v:255 if v>40 else 0).getbbox(); im=im.crop(bb); im.save(f'{ROOT}/assets/interiors/{n}.png'); print(n,im.size)
    m['assets'][f'room:{n}']=dict(src=f'interiors/{n}.png',ox=0,oy=0,k=1,cat='interior',status='final',w=im.width,h=im.height,origin='19_classroom_variants 裁切（使用者提供）')
for t,vs in MAP.items():
    for i,v in enumerate(vs): m['assets'][f'room:{t}:{i}']=dict(m['assets'][f'room:{v}'])
json.dump(m,open(mp,'w'),ensure_ascii=False,indent=1)
