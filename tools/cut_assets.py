#!/usr/bin/env python3
"""從使用者提供的素材總表（assets/source/*.png）裁出單張建築，寫入 assets/buildings 並更新 manifest。
錨點：假設圖中地台左右端點＝基地菱形左右頂點、地台底＝菱形底點。"""
import json,sys,os
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BLD={'classroom':(3,2),'office':(2,2),'library':(3,2),'lab':(2,2),'workshop':(3,2),'gym':(3,3),'field':(4,3),'pool':(3,2),'dorm':(3,2),'canteen':(3,2),'audit':(3,3),'clinic':(2,1),'research':(3,2),'admin':(3,3),'parking':(3,2),'landscape':(2,2)}
SC=1.3  # 圖中地台外還有樹/花，整體略放大才與地格相稱
def cut(src,box,out,btype,lv,keep='largest',extra=None):
    im=Image.open(f'{ROOT}/assets/source/{src}.png').convert('RGBA').crop(box)
    a=np.array(im); al=a[:,:,3]>40
    lab,n=ndi.label(al)
    if n>1 and keep=='largest':
        sz=ndi.sum(al,lab,range(1,n+1)); k=1+int(np.argmax(sz)); m=ndi.binary_dilation(lab==k,iterations=6)
        a[:,:,3]=np.where(m,a[:,:,3],0)
    ys,xs=np.where(a[:,:,3]>40); x0,x1,y0,y1=xs.min(),xs.max()+1,ys.min(),ys.max()+1
    im=Image.fromarray(a).crop((x0,y0,x1,y1)); im.save(f'{ROOT}/assets/buildings/{out}.png')
    w,h=BLD[btype]; bw,bh=im.size; k=(w+h)*32/bw*SC
    ox=bw/2*k-(w-h)*16; oy=bh*k-(w+h)*16-6
    return dict(src=f'buildings/{out}.png',ox=round(ox,2),oy=round(oy,2),k=round(k,4),cat='building',status='final',w=bw,h=bh,origin=f'{src} 裁切（使用者提供）')
JOBS=[
 ('02_main_building_sheet',(885,20,1190,172),'classroom_lv1','classroom',1),
 ('02_main_building_sheet',(1210,15,1520,185),'classroom_lv2','classroom',2),
 ('02_main_building_sheet',(885,220,1195,385),'classroom_lv3','classroom',3),
 ('02_main_building_sheet',(1210,215,1520,385),'admin_lv2','admin',2),
 ('02_main_building_sheet',(1210,215,1520,385),'admin_lv3','admin',3),
 ('03_main_building_single',(0,0,1536,1024),'admin_lv1','admin',1),
]
if __name__=='__main__':
    mp=f'{ROOT}/assets/manifest.json'; m=json.load(open(mp))
    for j in JOBS:
        e=cut(*j); key=f'bld:{j[3]}:{j[4]}:any:0'; m['assets'][key]=e; print(key,e['k'],e['ox'],e['oy'])
    json.dump(m,open(mp,'w'),ensure_ascii=False,indent=1)
