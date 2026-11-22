#!/usr/bin/env python3
"""樹木/裝飾/地磚：從素材 K（第 6 區）裁出，寫入 manifest。"""
import os,json,sys
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image,ImageEnhance
from segment import rm_bg,defringe
from scipy import ndimage as ndi
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
k=Image.open(f'{ROOT}/assets/source/21_pack_K_game_assets.png').convert('RGBA').crop((912,350,1306,645))
B={'tree_g1':(131,60,181,112),'tree_g2':(184,55,239,117),'tree_orange':(243,43,317,130),'tree_pink':(318,45,393,132),
 'hedge':(67,60,128,104),'flowers':(1,60,65,108),'bench':(2,113,78,160),'lamp':(87,104,107,174),'fountain':(74,176,153,234),'banner':(152,118,199,198),'gate':(249,128,316,192)}
def get(n,tol=26):
    im=rm_bg(k.crop(B[n]),tol=tol,grow=1.3)
    if n in ('gate','banner'):
        a=np.array(im); w=(a[:,:,:3].min(2)>200); a[:,:,3]=np.where(w,0,a[:,:,3]); im=Image.fromarray(a)
    return defringe(im)
def trim(im):
    a=np.array(im)[:,:,3]>40; ys,xs=np.where(a); return im.crop((xs.min(),ys.min(),xs.max()+1,ys.max()+1))
mp=f'{ROOT}/assets/manifest.json'; m=json.load(open(mp)); A=m['assets']
def put(key,name,im,th=None,tw=None,pad=6):
    im=trim(im); k_=(th/im.height) if th else tw/im.width; big=im.resize((im.width*3,im.height*3),Image.LANCZOS); k3=k_/3
    big.save(f'{ROOT}/assets/props/{name}.png')
    A[key]=dict(src=f'props/{name}.png',ox=round(big.width*k3/2,2),oy=round(big.height*k3-pad,2),k=round(k3,4),cat='prop',status='final',w=big.width,h=big.height,origin='21_pack_K 裁切（使用者提供）')
T={n:get(n) for n in ['tree_g1','tree_g2','tree_orange','tree_pink']}
def tint(im,col,amt):
    a=np.array(im).astype(float); a[:,:,:3]=a[:,:,:3]*(1-amt)+np.array(col)*amt*a[:,:,:3].mean()/128*0+np.array(col)*amt; return Image.fromarray(a.clip(0,255).astype(np.uint8))
for kind,sp in (('round',{'spring':['tree_g1','tree_g2','tree_g1'],'summer':['tree_g2','tree_g1','tree_g2'],'autumn':['tree_orange']*3}),('blossom',{'spring':['tree_pink']*3,'summer':['tree_g2','tree_g1','tree_g2'],'autumn':['tree_orange']*3}),('cone',{'spring':['tree_g1']*3,'summer':['tree_g2']*3,'autumn':['tree_orange']*3})):
    for season,names in sp.items():
        for v,n in enumerate(names): put(f'tree:{kind}:{season}:{v}',f'{n}',T[n],th=104 if kind!='cone' else 118)
for key,n,kw in (('decor:bench:any','bench',dict(tw=40)),('decor:lamp:any','lamp',dict(th=64)),('decor:hedge:any','hedge',dict(tw=56)),('decor:flowers:any','flowers',dict(tw=50)),('decor:fountain:any','fountain',dict(tw=66)),('decor:gate:any','gate',dict(tw=64))):
    put(key,n,get(n),**kw)
# 地磚：方形貼圖轉成等角菱形 128x64
def iso(tex,seed=0):
    t=np.array(tex.convert('RGB')).astype(float); h,w=t.shape[:2]; cx,cy=w/2,h/2; r=min(w,h)*.5*.92
    out=np.zeros((64,128,4),np.uint8); yy,xx=np.mgrid[0:64,0:128]; nx=(xx+.5-64)/64; ny=(yy+.5-32)/32
    sx=(nx+ny)/2; sy=(ny-nx)/2; px=cx+sx*r+seed*7; py=cy+sy*r
    from scipy.ndimage import map_coordinates
    for c in range(3): out[:,:,c]=map_coordinates(t[:,:,c],[py,px],order=1,mode='reflect').clip(0,255)
    ins=(np.abs(nx)+np.abs(ny))<=1.0; al=ndi.gaussian_filter(ins.astype(float),.6); out[:,:,3]=(al*255).astype(np.uint8); return Image.fromarray(out)
g1=k.crop((5,5,60,55)).convert('RGB'); g2=k.crop((185,5,236,55)).convert('RGB'); br=k.crop((68,6,118,54)).convert('RGB'); st=k.crop((128,6,178,54)).convert('RGB')
def season_tint(im,s):
    a=np.array(im).astype(float)
    mul={'spring':(1.0,1.02,1.0),'summer':(0.93,1.04,0.9),'autumn':(1.12,0.98,0.78)}[s]
    for c in range(3): a[:,:,c]*=mul[c]
    return Image.fromarray(a.clip(0,255).astype(np.uint8)).convert('RGBA')
for s in ('spring','summer','autumn'):
    for v in range(3):
        base=[g1,g2,g1][v]; im=iso(season_tint(base.convert('RGBA'),s).convert('RGB'),seed=v); im=Image.fromarray(np.dstack([np.array(im)[:,:,:3],np.array(im)[:,:,3]]))
        fn=f'ground/grass_{s}_{v}.png'; im.save(f'{ROOT}/assets/{fn}'); A[f'ground:grass:{s}:{v}']=dict(src=fn,ox=64,oy=0,k=1,cat='ground',status='final',w=128,h=64,origin='21_pack_K 地磚轉等角')
im=iso(br); im.save(f'{ROOT}/assets/ground/path_any_0.png'); A['ground:path:any:0']=dict(src='ground/path_any_0.png',ox=64,oy=0,k=1,cat='ground',status='final',w=128,h=64,origin='21_pack_K 地磚轉等角')
json.dump(m,open(mp,'w'),ensure_ascii=False,indent=1)
