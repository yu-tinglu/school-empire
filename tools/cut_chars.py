#!/usr/bin/env python3
"""行走小人：素材 K 第 2 區（學生/教師 6 方向）→ char:<student|teacher>:<sx>:<variant>。
素材只有 6 張走姿，每種 2–3 個變體以換髮色/衣色產生；站立/坐姿用同一張（坐姿裁掉下半身）。"""
import os,json,sys
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
from segment import rm_bg,defringe,split
from scipy import ndimage as ndi
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FW,FH=34,54; FRN=['idle','w1','w2','bidle','bw1','bw2','sit','study','talk','talk2','ex1','ex2','work','rest','r1','r2','br1','br2','sweep','happy','sad','sitchat']
K=Image.open(f'{ROOT}/assets/source/21_pack_K_game_assets.png').convert('RGBA').crop((560,95,980,300))
rows={'student':K.crop((75,0,420,95)),'teacher':K.crop((75,100,420,205))}
SP={}
for r,im in rows.items():
    s=defringe(rm_bg(im,tol=26,grow=1.2)); parts=split(s,minarea=500,dil=1); parts=[p for p in parts if p.height>40]; SP[r]=parts; print(r,len(parts),[p.size for p in parts])
def fit(p,th=54*3):
    p=p.resize((int(p.width*th/p.height),th),Image.LANCZOS); return p
def hueshift(im,hs,sat=1.0,val=1.0):
    import colorsys
    a=np.array(im.convert('RGBA')).astype(float); rgb=a[:,:,:3]/255
    mx=rgb.max(2); mn=rgb.min(2); d=mx-mn+1e-6
    # 只改「有彩度」的像素（頭髮棕色、藍色衣領）；白衣與膚色保持
    h=np.where(mx==rgb[:,:,0],((rgb[:,:,1]-rgb[:,:,2])/d)%6,np.where(mx==rgb[:,:,1],(rgb[:,:,2]-rgb[:,:,0])/d+2,(rgb[:,:,0]-rgb[:,:,1])/d+4))/6
    return im
def recolor(im,mode):
    a=np.array(im.convert('RGBA')).astype(float); r,g,b=a[:,:,0],a[:,:,1],a[:,:,2]
    hair=(r>g*1.0)&(g>b*1.0)&(r<170)&(r-b>25)&(r+g+b<330)  # 深棕髮
    blue=(b>r+30)&(b>g)
    if mode=='blond': a[hair,0]*=1.55; a[hair,1]*=1.5; a[hair,2]*=.95
    elif mode=='black': a[hair,:3]*=.45
    elif mode=='red': a[hair,0]*=1.5; a[hair,1]*=.75; a[hair,2]*=.6
    elif mode=='greyhair': a[hair,:3]=np.clip(a[hair,:3].mean(1,keepdims=True)*1.5+40,0,230)
    elif mode=='green': a[blue,0],a[blue,1],a[blue,2]=a[blue,2]*.4,a[blue,1]*1.0+a[blue,2]*.35,a[blue,0]*.6
    elif mode=='red2': a[blue,0],a[blue,1],a[blue,2]=a[blue,2]*1.0,a[blue,1]*.5,a[blue,0]*.5
    return Image.fromarray(a.clip(0,255).astype(np.uint8))
PICK={('student',0):([3,0],4),('student',1):([1,2],4),('teacher',0):([3,5],4),('teacher',1):([0,1],2)}
VAR=[None,'blond','black','red']; VAR2=[None,'green','red2','greyhair']
mp=f'{ROOT}/assets/manifest.json'; m=json.load(open(mp)); A=m['assets']
os.makedirs(f'{ROOT}/assets/chars',exist_ok=True)
for (role,sx),((i_walk,i_idle),i_back) in PICK.items():
    P=SP[role]
    for v in range(3):
        mode=VAR[v] if role=='student' else VAR2[v+ (1 if role=='teacher' else 0)] if False else (VAR[v] if v<3 else None)
        if role=='teacher' and v==2: mode='greyhair'
        sh=Image.new('RGBA',(FW*3*len(FRN),FH*3),(0,0,0,0))
        base={'walk1':recolor(fit(P[i_walk]),mode),'idle':recolor(fit(P[i_idle]),mode),'back':recolor(fit(P[i_back]),mode)}
        for fi,n in enumerate(FRN):
            if n in('w1',):s=base['walk1']
            elif n in('w2','r1','r2','ex1','ex2','sweep'): s=base['idle'] if n in('w2','ex2') else base['walk1']
            elif n in('bidle','bw1','bw2','br1','br2'): s=base['back']
            else: s=base['idle']
            if n in ('sit','study','work','rest','sitchat','talk','talk2'):
                s=s.crop((0,0,s.width,int(s.height*.72))); oy=int(FH*3*.28)
            else: oy=0
            s=s.copy()
            if n in('w1','r1','br1','bw1'): pass
            x=fi*FW*3+(FW*3-s.width)//2; y=FH*3-s.height-(0 if oy==0 else 0)
            sh.alpha_composite(s,(x,y))
        fn=f'chars/{role}_{sx}_{v}.png'; sh.save(f'{ROOT}/assets/{fn}')
        A[f'char:{role}:{sx}:{v}']=dict(src=fn,ox=0,oy=0,k=1,cat='char',status='final',w=sh.width,h=sh.height,fw=FW*3,fh=FH*3,ax=FW*3/2,ay=FH*3-6,origin='21_pack_K 行走圖（使用者提供，僅6張走姿；變體為換色）')
json.dump(m,open(mp,'w'),ensure_ascii=False,indent=1)
