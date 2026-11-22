#!/usr/bin/env python3
"""洋紅底去背：python3 tools/keyed.py <輸入.png> <建築類型> <等級> [名稱]  → assets/buildings + manifest"""
import sys,os,json
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
def key_magenta(im):
    a=np.array(im.convert('RGBA')).astype(float); r,g,b=a[:,:,0],a[:,:,1],a[:,:,2]
    dist=np.sqrt((r-255)**2+g**2+(b-255)**2); md=np.minimum(r,b)-g  # 洋紅度
    alpha=np.clip((dist-60)/90,0,1); alpha=np.where(md>90,np.minimum(alpha,np.clip((200-md)/110,0,1)),alpha)
    # 去溢色：邊緣像素的紅/藍超出綠的部分壓回
    spill=(md>15)&(alpha>0); lim=np.maximum(g,0)+ 12
    a[:,:,0]=np.where(spill,np.minimum(r,lim+ (r-g)*.15),r); a[:,:,2]=np.where(spill,np.minimum(b,lim+(b-g)*.15),b)
    # 只保留與主體相連的區域
    m=alpha>.3; lab,n=ndi.label(m)
    if n>1:
        sz=ndi.sum(m,lab,range(1,n+1)); keep=lab==(1+int(np.argmax(sz))); alpha=np.where(ndi.binary_dilation(keep,iterations=3),alpha,0)
    a[:,:,3]=alpha*255; return Image.fromarray(a.clip(0,255).astype(np.uint8))
if __name__=='__main__':
    src,bt,lv=sys.argv[1],sys.argv[2],int(sys.argv[3]); out=sys.argv[4] if len(sys.argv)>4 else f'{bt}_lv{lv}'
    im=key_magenta(Image.open(src)); ys,xs=np.where(np.array(im)[:,:,3]>20); im=im.crop((xs.min(),ys.min(),xs.max()+1,ys.max()+1))
    from cut_assets import BLD
    w,h=BLD[bt]; bw,bh=im.size
    # 地台寬度≈菱形寬；此素材地台就是整張底盤，直接以圖寬對應 (w+h)*32 再略放大
    SC=float(os.environ.get('SC','1.0')); k=(w+h)*32/bw*SC
    im.save(f'{ROOT}/assets/buildings/{out}.png')
    mp=f'{ROOT}/assets/manifest.json'; m=json.load(open(mp))
    m['assets'][f'bld:{bt}:{lv}:any:0']=dict(src=f'buildings/{out}.png',ox=round(bw/2*k-(w-h)*16,2),oy=round(bh*k-(w+h)*16-float(os.environ.get('OY','4')),2),k=round(k,4),cat='building',status='final',w=bw,h=bh,origin='ChatGPT 生成（使用者提供）')
    json.dump(m,open(mp,'w'),ensure_ascii=False,indent=1); print(bw,bh,k)
