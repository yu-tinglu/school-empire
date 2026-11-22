#!/usr/bin/env python3
"""人物頭像：從角色素材包 A/B/C/D 裁出，key=portrait:<s|t>:<sx 1=女 0=男>:<序號>。"""
import sys,os,json
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from segment import rm_bg,defringe,rm_bg_grad
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S=lambda n:Image.open(f'{ROOT}/assets/source/{n}.png').convert('RGBA')
CREAM=(246,238,220,255)
def flat(im):
    bg=Image.new('RGBA',im.size,CREAM); bg.alpha_composite(im); return bg.convert('RGB')
G='MFMFMFMFMFMF'
SETS=[ # (來源, 行y0, 行高, 起x, 格寬, 格數, 性別字串, 角色 s/t, 輸出邊長)
 ('05_npc_pack_D',80,142,70,119.2,12,'MFMMFMFMFFFM','t',142),
 ('05_npc_pack_D',310,160,70,119.2,12,'MFMFMFMFMFMF','s',150),
 ('16_student_pack_A',55,175,0,128,12,'MFMFMMFFMFMF','s',175),
 ('15_student_pack_B',55,175,0,128,12,'MFMFFMFMFMFM','s',175),
 ('17_student_pack_C',55,175,0,128,12,'FMFMFMFMFMFM','s',175),
]
def isolate(cell):
    """只留下格子正中央的那一個人，鄰居的碎片與文字標籤全部去掉，放在奶油色底上。"""
    cell=rm_bg_grad(cell.convert('RGBA'),T=16,blur=1.8); a=np.array(cell); m=a[:,:,3]>40; H,W=m.shape
    er=ndi.binary_erosion(m,iterations=4); lab,n=ndi.label(er); best=None;bs=-1
    for i in range(1,n+1):
        ys,xs=np.where((lab==i)&m)
        if len(xs)<150: continue
        cx=xs.mean(); score=len(xs)-abs(cx-W/2)*60
        if score>bs: bs=score;best=i
    if best is not None:
        cy_,cx_=np.where(lab==best); colm=np.zeros_like(m); colm[:,max(0,cx_.min()-8):cx_.max()+9]=True
        core=ndi.binary_dilation(lab==best,iterations=6)&m&colm; body=ndi.binary_fill_holes(ndi.binary_closing(core,iterations=3)); a[:,:,3]=np.where(body,np.maximum(a[:,:,3],np.where(m,0,255)),0)
        a[:,:,3]=np.where(body,np.where(m,a[:,:,3],255),0)
    im=defringe(Image.fromarray(a)); ys,xs=np.where(np.array(im)[:,:,3]>40)
    top=max(0,ys.min()-6); cx=int((xs.min()+xs.max())/2); side=int((ys.max()-top)*1.05)+10
    sq=Image.new('RGBA',(side,side),(0,0,0,0)); sq.alpha_composite(im.crop((0,top,im.width,im.height)),(side//2-cx,0)) if side//2-cx>=0 else sq.alpha_composite(im.crop((cx-side//2,top,im.width,im.height)),(0,0))
    yy,xx=np.mgrid[0:side,0:side]; r=np.sqrt(((xx-side/2)/(side*.40))**2+((yy-side*.47)/(side*.58))**2); vg=np.clip((1.0-r)/.14,0,1)
    arr=np.array(sq); arr[:,:,3]=(arr[:,:,3]*vg).astype(np.uint8); sq=Image.fromarray(arr)
    yy,xx=np.mgrid[0:side,0:side]; r=np.sqrt(((xx-side/2)/(side*.40))**2+((yy-side*.47)/(side*.58))**2); vg=np.clip((1.0-r)/.14,0,1)
    arr=np.array(sq); arr[:,:,3]=(arr[:,:,3]*vg).astype(np.uint8); sq=Image.fromarray(arr)
    bg=Image.new('RGBA',sq.size,CREAM); bg.alpha_composite(sq); return bg.convert('RGB').resize((256,256),Image.LANCZOS)
mp=f'{ROOT}/assets/manifest.json'; m=json.load(open(mp)); cnt={}
for k in [k for k in m['assets'] if k.startswith('portrait:')]: del m['assets'][k]
for si,(src,y0,hh,x0,cw,n,gs,role,side) in enumerate(SETS):
    im=S(src)
    for i in range(n):
        cx=x0+(i+.5)*cw; hw=cw*.43; box=(int(cx-hw),y0,int(cx+hw),y0+side)
        p=isolate(im.crop(box))
        sx=1 if gs[i]=='F' else 0; key=(role,sx); j=cnt.get(key,0); cnt[key]=j+1
        fn=f'portraits/{role}_{sx}_{j}.png'; p.save(f'{ROOT}/assets/{fn}')
        m['assets'][f'portrait:{role}:{sx}:{j}']=dict(src=fn,ox=0,oy=0,k=1,cat='portrait',status='final',w=256,h=256,origin=f'{src} 裁切（使用者提供）')
json.dump(m,open(mp,'w'),ensure_ascii=False,indent=1); print(cnt)
