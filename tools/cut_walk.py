#!/usr/bin/env python3
"""使用者用 ChatGPT 生成的走路圖（洋紅背景、每列 6 格完整走路循環）→ char:<role>:<sx>:<v>
來源：assets/source/walk/<s|t><sx>_<a..d>.png（只有正面，背面格暫以正面代替）"""
import os,json,glob
import numpy as np
from PIL import Image,ImageDraw,ImageFilter
from scipy import ndimage as ndi
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FW,FH,Q=34,54,4
FRN=['idle','w1','w2','bidle','bw1','bw2','sit','study','talk','talk2','ex1','ex2','work','rest','r1','r2','br1','br2','sweep','happy','sad','sitchat','wk0','wk1','wk2','wk3','wk4','wk5']
def key(im):
    a=np.array(im.convert('RGB')).astype(float); r,g,b=a[:,:,0],a[:,:,1],a[:,:,2]
    # 洋紅度：r、b 高、g 低
    m=np.minimum(r,b)-g
    alpha=np.clip(1-(m-40)/90,0,1)           # m<=40 完全保留；m>=130 完全透明
    alpha[(m>130)]=0
    # 去洋紅溢色：半透明邊緣把 r、b 往 g 拉
    sp=np.clip(m,0,None)*(alpha<1)
    r2=np.where(alpha<1,np.minimum(r,g+np.maximum(0,(1-alpha))*0+ (r-g)*.0+ (255-sp*0)) ,r)
    out=np.dstack([r,g,b]); 
    edge=(alpha<1)&(alpha>0)
    mid=np.minimum(r,b)
    for ch in (0,2): out[:,:,ch]=np.where(edge,np.minimum(out[:,:,ch],g+25),out[:,:,ch])
    # 只留最大連通塊集合，丟掉散點；alpha 縮 1px 去紅邊
    A=(alpha*255).astype(np.uint8)
    solid=A>128; lab,n=ndi.label(solid); sizes=ndi.sum(solid,lab,range(1,n+1)); keep=np.isin(lab,[i+1 for i,s in enumerate(sizes) if s>400])
    keep=ndi.binary_dilation(keep,iterations=3)
    A=np.where(keep,A,0).astype(np.uint8)
    A=np.array(Image.fromarray(A).filter(ImageFilter.MinFilter(3))) ; A=np.array(Image.fromarray(A).filter(ImageFilter.GaussianBlur(.6)))
    return Image.fromarray(np.dstack([out.clip(0,255).astype(np.uint8),A]),'RGBA')
def frames(path):
    im=key(Image.open(path)); W,H=im.size; cw=W/6; fr=[]
    for i in range(6):
        c=im.crop((int(i*cw),0,int((i+1)*cw),H)); fr.append(c)
    return fr
def build(path):
    fr=frames(path); boxes=[f.getchannel('A').point(lambda v:255 if v>40 else 0).getbbox() for f in fr]
    top=min(b[1] for b in boxes); bot=max(b[3] for b in boxes)
    cxs=[(b[0]+b[2])/2 for b in boxes]; cx=float(np.median(cxs)); wmax=max(b[2]-b[0] for b in boxes)
    hh=bot-top; tgt=(FH*Q-8)*.94; sc=tgt/hh; ww=int(max(wmax*sc+16,FW*Q)); 
    outw=FW*Q
    P=[]
    for f,b in zip(fr,boxes):
        w=f.crop((int(cx-ww/sc/2),top,int(cx+ww/sc/2),bot))
        w=w.resize((int(w.width*sc),int(w.height*sc)),Image.LANCZOS)
        if w.width>outw: w=w.crop(((w.width-outw)//2,0,(w.width-outw)//2+outw,w.height))
        P.append(w)
    return P
def sheet(P):
    idle=P[1]; sh=Image.new('RGBA',(FW*Q*len(FRN),FH*Q),(0,0,0,0))
    pick={'idle':idle,'w1':P[0],'w2':P[3],'r1':P[0],'r2':P[3],'ex1':P[0],'ex2':P[3],'sweep':P[0]}
    for i in range(6): pick[f'wk{i}']=P[i]
    for fi,n in enumerate(FRN):
        s=pick.get(n)
        if s is None:
            b={'bidle':'idle','bw1':'w1','bw2':'w2','br1':'r1','br2':'r2'}.get(n)
            s=pick[b] if b else idle
        if n in('sit','study','work','rest','sitchat','talk','talk2'): s=s.crop((0,0,s.width,int(s.height*.72)))
        cx=fi*FW*Q+FW*Q//2
        shd=Image.new('RGBA',sh.size,(0,0,0,0)); ImageDraw.Draw(shd).ellipse([cx-11*Q,FH*Q-4*Q,cx+11*Q,FH*Q-.5*Q],fill=(60,45,30,90)); sh.alpha_composite(shd.filter(ImageFilter.GaussianBlur(Q)))
        x=cx-s.width//2; y=FH*Q-s.height-int(1.6*Q)
        sh.alpha_composite(s,(x,y))
    return sh
if __name__=='__main__':
    mp=f'{ROOT}/assets/manifest.json'; m=json.load(open(mp)); A=m['assets']
    os.makedirs(f'{ROOT}/assets/chars',exist_ok=True)
    for k in [k for k in A if k.startswith('char:')]: del A[k]
    for f in glob.glob(f'{ROOT}/assets/chars/*.png'): os.remove(f)
    groups={}
    for p in sorted(glob.glob(f'{ROOT}/assets/source/walk/*.png')):
        n=os.path.basename(p)[:-4]; role={'s':'student','t':'teacher'}[n[0]]; sx=int(n[1]); groups.setdefault((role,sx),[]).append(p)
    for (role,sx),L in groups.items():
        shs=[sheet(build(p)) for p in L]
        for v in range(4):
            sh=shs[v%len(shs)]; fn=f'chars/{role}_{sx}_{v}.png'; sh.save(f'{ROOT}/assets/{fn}',optimize=True)
            A[f'char:{role}:{sx}:{v}']=dict(src=fn,ox=0,oy=0,k=1,cat='char',status='final',w=sh.width,h=sh.height,fw=FW*Q,fh=FH*Q,ax=FW*Q/2,ay=FH*Q-int(1.6*Q),origin='使用者提供的 ChatGPT 走路圖（6 格走路循環；僅正面）')
        print(role,sx,len(L),'sources')
    json.dump(m,open(mp,'w'),ensure_ascii=False,indent=1)
