#!/usr/bin/env python3
"""功能圖示：素材 K 第 10 區（15 個圖示＋最後一列系統鈕）→ assets/icons。"""
import os,json,sys
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
from segment import rm_bg,defringe
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
k=Image.open(f'{ROOT}/assets/source/21_pack_K_game_assets.png').convert('RGBA').crop((1030,715,1360,935))
CX=[37,102,165,228,292]; RY=[(0,36),(55,93),(108,146)]
N=[['course','exam','upgrade','build','research'],['fund','rep','student','teacher','club'],['event','match','trophy','rank','achieve']]
mp=f'{ROOT}/assets/manifest.json'; m=json.load(open(mp)); A=m['assets']
from scipy import ndimage as ndi
def largest(im):
    a=np.array(im); m=a[:,:,3]>40; lab,n=ndi.label(ndi.binary_dilation(m,iterations=1))
    if n>1:
        sz=ndi.sum(m,lab,range(1,n+1)); k_=1+int(np.argmax(sz)); a[:,:,3]=np.where((lab==k_)&m,a[:,:,3],0)
    return Image.fromarray(a)
def save(n,im):
    im=largest(im); a=np.array(im)[:,:,3]>40; ys,xs=np.where(a); im=im.crop((xs.min(),ys.min(),xs.max()+1,ys.max()+1))
    s=96/max(im.size); im=im.resize((max(1,int(im.width*s)),max(1,int(im.height*s))),Image.LANCZOS); cv=Image.new('RGBA',(96,96),(0,0,0,0)); cv.alpha_composite(im,((96-im.width)//2,(96-im.height)//2)); cv.save(f'{ROOT}/assets/icons/{n}.png')
    A[f'icon:{n}']=dict(src=f'icons/{n}.png',ox=0,oy=0,k=1,cat='icon',status='final',w=96,h=96,origin='21_pack_K 第10區（使用者提供）')
for r,(y0,y1) in enumerate(RY):
    for c,x in enumerate(CX):
        cell=k.crop((x-27,y0,x+27,y1)); save(N[r][c],defringe(rm_bg(cell,tol=26,grow=1.3)))
BX=[24,73,122,171,220,268]; BN=['plus','close','alert','help','gear','mail']
for x,n in zip(BX,BN): save(n,defringe(rm_bg(k.crop((x-26,168,x+26,214)),tol=26,grow=1.3)))
json.dump(m,open(mp,'w'),ensure_ascii=False,indent=1)
