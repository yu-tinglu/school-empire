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
def valleys(alpha,nominal,rad=35):
    occ=(alpha>40).sum(0); out=[]
    for x in nominal:
        lo,hi=max(1,int(x-rad)),min(len(occ)-1,int(x+rad)); seg=occ[lo:hi]; m=seg.min(); cand=[lo+i for i,v in enumerate(seg) if v<=m+1]
        out.append(min(cand,key=lambda c:abs(c-x)))
    return out
def feather(im,w=12):
    a=np.array(im); al=a[:,:,3].astype(float); H,W=al.shape
    if (al[:,0]>40).any():
        r=np.clip(np.arange(W)/w,0,1); al=al*np.where(np.arange(W)<w,r,1)[None,:]
    if (al[:,-1]>40).any():
        r=np.clip((W-1-np.arange(W))/w,0,1); al=al*np.where(np.arange(W)>W-1-w,r,1)[None,:]
    a[:,:,3]=al.astype(np.uint8); return Image.fromarray(a)
def prep(sub,up=1):
    sub=feather(sub)
    if up>1: sub=sub.resize((sub.width*up,sub.height*up),Image.LANCZOS)
    return sub
# 1) 九棟單體設施（素材 01 第三列）：先整列去背，再沿建築之間的空隙切開
s01=rm_bg(S('01_building_upgrade_stages').crop((0,590,1672,760)),tol=30)
nom=[205,415,630,815,995,1150,1340,1515]; vx=[0]+valleys(np.array(s01)[:,:,3],nom)+[s01.width]
names=['classroom','lab','gym','canteen','office','clinic','audit','research','landscape']
for i,n in enumerate(names):
    if n=='classroom': continue
    im=prep(s01.crop((vx[i],0,vx[i+1],s01.height)),2)
    for lv in (1,2,3): job(im,f'{n}_lv{lv}',n,lv,m)
# 2) K 包的升級系列（圖書館/體育館/宿舍）
k=S('21_pack_K_game_assets')
def series(box,t,picks):
    strip=rm_bg(k.crop(box),tol=40 if t=='dorm' else 30,grow=1.15); al=np.array(strip)[:,:,3]
    vx=[0]+valleys(al,[118,232,334],rad=16)+[strip.width]
    for lv,idx in enumerate(picks,1):
        im=prep(strip.crop((vx[idx],0,vx[idx+1],strip.height)),3); job(im,f'{t}_lv{lv}',t,lv,m)
series((8,465,468,537),'library',[0,1,2])
series((8,550,468,628),'gym',[0,1,3])
series((8,611,468,666),'dorm',[0,2,3])
json.dump(m,open(mp,'w'),ensure_ascii=False,indent=1)
