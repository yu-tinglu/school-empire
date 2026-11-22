#!/usr/bin/env python3
"""第二批：設施建築（來自使用者的素材總表）。python3 tools/cut_assets2.py"""
import sys,os,json
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from segment import rm_bg
from cut_assets import *
from PIL import Image
S=lambda n:Image.open(f'{ROOT}/assets/source/{n}.png').convert('RGBA')
def save_tmp(im,name):
    p=f'/tmp/_cut_{name}.png'; im.save(p); return p
def job(img,out,btype,lv,m,sc=None):
    # 直接用已去背的 img（RGBA）；套用 cut() 的錨點計算
    tmp=f'{ROOT}/assets/source/_tmp_{out}.png'; img.save(tmp)
    e=cut(f'_tmp_{out}',(0,0,img.width,img.height),out,btype,lv); os.remove(tmp)
    m['assets'][f'bld:{btype}:{lv}:any:0']=e
mp=f'{ROOT}/assets/manifest.json'; m=json.load(open(mp))
# 1) 九棟單體設施（素材 01 第三列）
s01=S('01_building_upgrade_stages').crop((0,590,1672,760))
X=[0,205,415,630,815,995,1150,1340,1515,1672]
names=[('classroom',None),('lab','lab'),('gym','gym'),('canteen','canteen'),('office','office'),('clinic','clinic'),('audit','audit'),('research','research'),('landscape','landscape')]
for i,(n,t) in enumerate(names):
    if t is None: continue
    im=rm_bg(s01.crop((X[i],0,X[i+1],170)),tol=30)
    for lv in (1,2,3): job(im,f'{t}_lv{lv}',t,lv,m)
# 2) K 包的升級系列（圖書館/體育館/宿舍），依箭頭切開
k=S('21_pack_K_game_assets')
WIN=[(0,116),(120,230),(234,336),(332,460)]
def series(box,t,picks):
    strip=k.crop(box)
    for lv,idx in enumerate(picks,1):
        x0,x1=WIN[idx]; im=rm_bg(strip.crop((x0,0,x1,strip.height)),tol=40 if t=='dorm' else 30,grow=1.15)
        im=im.resize((im.width*3,im.height*3),Image.LANCZOS); job(im,f'{t}_lv{lv}',t,lv,m)
series((8,465,468,537),'library',[0,1,2])
series((8,550,468,628),'gym',[0,1,3])
series((8,611,468,666),'dorm',[0,2,3])
json.dump(m,open(mp,'w'),ensure_ascii=False,indent=1)
