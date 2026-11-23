#!/usr/bin/env python3
"""App 圖示：使用者提供的校舍圖（洋紅底）去背 + 水彩風天空背景 + 遊戲名稱 → assets/appicon/*.png"""
import os,sys,numpy as np
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from PIL import Image,ImageDraw,ImageFont,ImageFilter
from scipy import ndimage as ndi
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S=1024
def keyout(im):
    a=np.array(im.convert('RGB')).astype(float); r,g,b=a[:,:,0],a[:,:,1],a[:,:,2]
    m=np.minimum(r,b)-g; al=np.clip(1-(m-45)/80,0,1); al[m>125]=0
    out=a.copy(); edge=(al<1)
    for ch in (0,2): out[:,:,ch]=np.where(edge,np.minimum(out[:,:,ch],g+22),out[:,:,ch])
    A=(al*255).astype(np.uint8); solid=A>128; lab,n=ndi.label(solid); sz=ndi.sum(solid,lab,range(1,n+1))
    keep=ndi.binary_dilation(np.isin(lab,[i+1 for i,s in enumerate(sz) if s>2000]),iterations=3)
    A=np.where(keep,A,0).astype(np.uint8); A=np.array(Image.fromarray(A).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(.7)))
    return Image.fromarray(np.dstack([out.clip(0,255).astype(np.uint8),A]),'RGBA')
b=keyout(Image.open(f'{ROOT}/assets/source/icon/building.png')); b=b.crop(b.getchannel('A').point(lambda v:255 if v>40 else 0).getbbox())
# 背景：晨光天空→奶油，遠山，柔和光暈
bg=Image.new('RGB',(S,S)); px=np.zeros((S,S,3),float)
top=np.array([150,200,235.]); mid=np.array([226,238,240.]); bot=np.array([250,238,205.])
for y in range(S):
    t=y/S; c=top+(mid-top)*min(1,t/.55) if t<.55 else mid+(bot-mid)*((t-.55)/.45); px[y,:,:]=c
bg=Image.fromarray(px.astype(np.uint8)); d=ImageDraw.Draw(bg,'RGBA')
# 光暈
glow=Image.new('RGBA',(S,S),(0,0,0,0)); ImageDraw.Draw(glow).ellipse([S*.22,S*.12,S*.78,S*.68],fill=(255,248,220,150)); bg=Image.alpha_composite(bg.convert('RGBA'),glow.filter(ImageFilter.GaussianBlur(70)))
# 雲
cm=Image.new('L',(S,S),0); cd=ImageDraw.Draw(cm)
for (x,y,w,h) in [(90,140,300,80),(620,100,320,90),(760,290,240,64),(20,300,230,60)]:
    for k in range(5): cd.ellipse([x+k*w*.16,y-h*.25*(1 if k%2 else .5),x+w*.5+k*w*.16,y+h],fill=170)
cm=cm.filter(ImageFilter.GaussianBlur(9)); bg=Image.composite(Image.new('RGBA',(S,S),(255,255,255,255)),bg,cm)
# 遠山 + 自然草地
rng=np.random.default_rng(7)
hl=Image.new('RGBA',(S,S),(0,0,0,0)); hd=ImageDraw.Draw(hl)
hd.ellipse([-300,500,640,1100],fill=(168,205,172,255)); hd.ellipse([360,540,1400,1150],fill=(150,198,160,255))
bg=Image.alpha_composite(bg,hl.filter(ImageFilter.GaussianBlur(3)))
H0=670
yy=np.linspace(0,1,S-H0)[:,None,None]; top_c=np.array([176,208,128.]); bot_c=np.array([104,158,92.])
g=(top_c+(bot_c-top_c)*yy)*np.ones((1,S,1))
n=rng.normal(0,1,(S-H0,S)); n=np.array(Image.fromarray(((n-n.min())/(n.max()-n.min())*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(14))).astype(float)/255
g+= (n[:,:,None]-.5)*46
n2=rng.normal(0,1,(S-H0,S)); n2=np.array(Image.fromarray(((n2-n2.min())/(n2.max()-n2.min())*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(2.2))).astype(float)/255
g+= (n2[:,:,None]-.5)*18
gl=Image.fromarray(g.clip(0,255).astype(np.uint8)).convert('RGBA')
mask=Image.new('L',(S,S-H0),0); md=ImageDraw.Draw(mask); md.ellipse([-500,0,S+500,900],fill=255); mask=mask.filter(ImageFilter.GaussianBlur(3))
gfull=Image.new('RGBA',(S,S),(0,0,0,0)); gfull.paste(gl,(0,H0),mask); bg=Image.alpha_composite(bg,gfull)
fl=Image.new('RGBA',(S,S),(0,0,0,0)); fd=ImageDraw.Draw(fl)
for _ in range(28):
    x=int(rng.uniform(0,S)); y=int(rng.uniform(760,1010)); c=[(255,244,214),(255,214,226),(255,236,150)][int(rng.integers(0,3))]; r=int(rng.integers(5,8)); fd.ellipse([x-r,y-r,x+r,y+r],fill=c+(190,))
bg=Image.alpha_composite(bg,fl.filter(ImageFilter.GaussianBlur(.8)))
# 校舍：寬約 86%，置中偏上
bw=int(S*.93); bh=int(b.height*bw/b.width); bs=b.resize((bw,bh),Image.LANCZOS)
x=(S-bw)//2; y=int(S*.36-bh/2)
sh=Image.new('RGBA',(S,S),(0,0,0,0)); ImageDraw.Draw(sh).ellipse([x+bw*.08,y+bh*.80,x+bw*.95,y+bh*1.0],fill=(50,70,40,90)); bg=Image.alpha_composite(bg,sh.filter(ImageFilter.GaussianBlur(14)))
bg.alpha_composite(bs,(x,y))
# 名稱：細描邊、帶透明，融進草地
F=lambda sz:ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc',sz,index=2)
t1='學校模擬器'; f1=F(158); w=ImageDraw.Draw(bg).textlength(t1,font=f1); pos=((S-w)/2,738)
sh2=Image.new('RGBA',(S,S),(0,0,0,0)); ImageDraw.Draw(sh2).text((pos[0],pos[1]+8),t1,font=f1,fill=(30,70,40,120),stroke_width=8,stroke_fill=(30,70,40,120)); bg=Image.alpha_composite(bg,sh2.filter(ImageFilter.GaussianBlur(7)))
tl=Image.new('RGBA',(S,S),(0,0,0,0)); ImageDraw.Draw(tl).text(pos,t1,font=f1,fill=(255,247,228,238),stroke_width=6,stroke_fill=(52,98,62,215)); bg=Image.alpha_composite(bg,tl)
final=bg.convert('RGB'); os.makedirs(f'{ROOT}/assets/appicon',exist_ok=True)
final.save(f'{ROOT}/assets/appicon/icon-1024.png',optimize=True)
for n,sz in (('apple-touch-icon',180),('icon-192',192),('icon-512',512)): final.resize((sz,sz),Image.LANCZOS).save(f'{ROOT}/assets/appicon/{n}.png',optimize=True)
# maskable：內縮 80% 安全區，邊緣補背景色
m=Image.new('RGB',(512,512),(226,238,240)); m.paste(final.resize((410,410),Image.LANCZOS),(51,51)); m.save(f'{ROOT}/assets/appicon/icon-maskable-512.png',optimize=True)
print('ok')
