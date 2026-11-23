#!/usr/bin/env python3
"""使用者用 ChatGPT 生成的走路圖（洋紅背景、每列 6 格完整走路循環）→ char:<role>:<sx>:<v>
來源：assets/source/walk/<s|t><sx>_<a..d>.png（只有正面，背面格暫以正面代替）"""
import os,json,glob
import numpy as np
from PIL import Image,ImageDraw,ImageFilter
from scipy import ndimage as ndi
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FW,FH,Q=34,54,4
FRN=['idle','w1','w2','bidle','bw1','bw2','sit','study','talk','talk2','ex1','ex2','work','rest','r1','r2','br1','br2','sweep','happy','sad','sitchat','wk0','wk1','wk2','wk3','wk4','wk5','bwk0','bwk1','bwk2','bwk3','bwk4','bwk5','rn0','rn1','rn2','rn3']
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
    raw=Image.open(path).convert('RGB'); a=np.array(raw).astype(int); mm=(np.minimum(a[:,:,0],a[:,:,2])-a[:,:,1])>100
    rows=np.where(mm.mean(1)>.5)[0]; raw=raw.crop((0,int(rows.min()),raw.width,int(rows.max())+1))
    im=key(raw); W,H=im.size; cw=W/6; fr=[]
    for i in range(6):
        c=im.crop((int(i*cw),0,int((i+1)*cw),H)); fr.append(c)
    return fr
def build(path,hs=1.0):
    fr=frames(path); boxes=[f.getchannel('A').point(lambda v:255 if v>40 else 0).getbbox() for f in fr]
    top=min(b[1] for b in boxes); bot=max(b[3] for b in boxes)
    cxs=[(b[0]+b[2])/2 for b in boxes]; cx=float(np.median(cxs)); wmax=max(b[2]-b[0] for b in boxes)
    hh=bot-top; tgt=(FH*Q-8)*.94*hs; sc=tgt/hh; ww=int(max(wmax*sc+16,FW*Q)); 
    outw=FW*Q
    P=[]
    for f,b in zip(fr,boxes):
        w=f.crop((int(cx-ww/sc/2),top,int(cx+ww/sc/2),bot))
        w=w.resize((int(w.width*sc),int(w.height*sc)),Image.LANCZOS)
        if w.width>outw: w=w.crop(((w.width-outw)//2,0,(w.width-outw)//2+outw,w.height))
        P.append(w)
    return P
def build_act(path,Hw,nc=4):
    raw=Image.open(path).convert('RGB'); im=key(raw); W,H=im.size; cw,ch=W/nc,H/4
    cells=[[im.crop((int(c*cw),int(r*ch),int((c+1)*cw),int((r+1)*ch))) for c in range(nc)] for r in range(4)]
    if nc>4: cells=[[row[i] for i in ([0,1,3,4] if r==0 else [0,1,2,3])] for r,row in enumerate(cells)]
    bb=lambda f:f.getchannel('A').point(lambda v:255 if v>40 else 0).getbbox()
    ha=bb(cells[2][0]); ha=ha[3]-ha[1]; sa=Hw/ha; out=[]
    for r in range(4):
        bs=[bb(f) for f in cells[r]]; ground=max(b[3] for b in bs); cx=float(np.median([(b[0]+b[2])/2 for b in bs])); row=[]
        for f,b in zip(cells[r],bs):
            Wn=FW*Q/sa*1.15; w=f.crop((int(cx-Wn/2),b[1],int(cx+Wn/2),b[3])); w=w.resize((int(w.width*sa),int(w.height*sa)),Image.LANCZOS)
            if w.width>FW*Q: w=w.crop(((w.width-FW*Q)//2,0,(w.width-FW*Q)//2+FW*Q,w.height))
            lift=int((ground-b[3])*sa); lift=max(0,min(lift,FH*Q-int(1.6*Q)-w.height)); row.append((w,lift))
        out.append(row)
    return out
def sheet(P,B,ACT=None):
    idle=P[1]; sh=Image.new('RGBA',(FW*Q*len(FRN),FH*Q),(0,0,0,0))
    pick={'idle':idle,'w1':P[0],'w2':P[3],'r1':P[0],'r2':P[3],'ex1':P[0],'ex2':P[3],'sweep':P[0]}
    for i in range(6): pick[f'wk{i}']=P[i]; pick[f'bwk{i}']=B[i]
    lifts={}
    if ACT:
        run,sit,talk,jump=ACT
        for i in range(4): pick[f'rn{i}']=run[i][0]; lifts[f'rn{i}']=run[i][1]
        pick['talk']=talk[1][0]; pick['talk2']=talk[2][0]; pick['happy']=jump[2][0]; lifts['happy']=jump[2][1]
        pick['ex1']=jump[0][0]; pick['ex2']=jump[1][0]; lifts['ex2']=jump[1][1]
        pick['r1']=run[0][0]; pick['r2']=run[2][0]; lifts['r1']=run[0][1]; lifts['r2']=run[2][1]
        for n,i in (('sit',0),('sitchat',1),('study',1),('work',2),('rest',0)): pick[n]=sit[i][0]
    else:
        for i in range(4): pick[f'rn{i}']=P[[0,1,3,4][i]]
    pick.update({'bidle':B[1],'bw1':B[0],'bw2':B[3],'br1':B[0],'br2':B[3]})
    for fi,n in enumerate(FRN):
        s=pick.get(n)
        if s is None:
            s=idle
        if n in('sit','study','work','rest','sitchat'): s=s.crop((0,0,s.width,int(s.height*(.66 if ACT else .72))))
        elif n in('talk','talk2') and not ACT: s=s.crop((0,0,s.width,int(s.height*.72)))
        cx=fi*FW*Q+FW*Q//2
        shd=Image.new('RGBA',sh.size,(0,0,0,0)); ImageDraw.Draw(shd).ellipse([cx-11*Q,FH*Q-4*Q,cx+11*Q,FH*Q-.5*Q],fill=(60,45,30,90)); sh.alpha_composite(shd.filter(ImageFilter.GaussianBlur(Q)))
        x=cx-s.width//2; y=FH*Q-s.height-int(1.6*Q)-lifts.get(n,0)
        sh.alpha_composite(s,(x,y))
    return sh
NODESK={'t1_c'}
NC={'p1_a':6}   # 動作表欄數（預設 4）
TMP=[]
def NV(role,n): return 1 if role in('kid','principal','admin') else (min(n,6) if role=='teacher' else 4)
if __name__=='__main__':
    mp=f'{ROOT}/assets/manifest.json'; m=json.load(open(mp)); A=m['assets']
    os.makedirs(f'{ROOT}/assets/chars',exist_ok=True)
    for k in [k for k in A if k.startswith('char:')]: del A[k]
    for f in glob.glob(f'{ROOT}/assets/chars/*.png'): os.remove(f)
    groups={}
    # 只有動作表、沒有正面走路表的角色：用動作表第一列當走路
    for ap in glob.glob(f'{ROOT}/assets/source/walk/*_act.png'):
        wp=ap[:-8]+'.png'
        if not os.path.exists(wp) and os.path.exists(ap[:-8]+'_back.png'):
            im=Image.open(ap); im.crop((0,0,im.width,im.height//4)).save(wp); TMP.append(wp)
    for p in sorted(glob.glob(f'{ROOT}/assets/source/walk/*.png')):
        n=os.path.basename(p)[:-4]
        if n.endswith('_back') or n.endswith('_act'): continue
        role={'s':'student','t':'teacher','k':'kid','p':'principal','a':'admin'}[n[0]]; sx=int(n[1]); groups.setdefault((role,sx),[]).append(p)
    for (role,sx),L in groups.items():
        shs=[]
        for p in L:
            hs=.8 if role=='kid' else 1.0; Pf=build(p,hs); B=build(p[:-4]+'_back.png',hs); ap=p[:-4]+'_act.png'
            ACT=build_act(ap,Pf[1].height,NC.get(os.path.basename(p)[:-4],4)) if os.path.exists(ap) else None
            if ACT and os.path.basename(p)[:-4] in NODESK: ACT[2]=[(Pf[1],0)]*4   # 該張第三列是坐在桌前，不能當站立說話
            shs.append(sheet(Pf,B,ACT))
        for v in range(NV(role,len(L))):
            sh=shs[v%len(shs)]; fn=f'chars/{role}_{sx}_{v}.png'; sh.quantize(256,method=Image.Quantize.FASTOCTREE,dither=Image.Dither.NONE).save(f'{ROOT}/assets/{fn}',optimize=True)
            A[f'char:{role}:{sx}:{v}']=dict(src=fn,ox=0,oy=0,k=1,cat='char',status='final',w=sh.width,h=sh.height,fw=FW*Q,fh=FH*Q,ax=FW*Q/2,ay=FH*Q-int(1.6*Q),origin='使用者提供的 ChatGPT 走路圖（6 格走路循環；正面+背面）')
        print(role,sx,len(L),'sources')
    for wp in TMP: os.remove(wp)
    json.dump(m,open(mp,'w'),ensure_ascii=False,indent=1)
