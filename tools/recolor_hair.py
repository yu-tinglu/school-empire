#!/usr/bin/env python3
"""用法: recolor_hair.py <role> <sx> <基底變體> <新變體> <色相> [飽和倍率] [明度倍率]
把角色頭部的棕色頭髮換色，輸出成新變體並寫入 manifest。需在 cut_walk.py 之後執行。"""
import sys,json,colorsys,numpy as np
from PIL import Image
role,sx,base,new,hue=sys.argv[1],sys.argv[2],sys.argv[3],sys.argv[4],float(sys.argv[5])
sm=float(sys.argv[6]) if len(sys.argv)>6 else 1.0; vm=float(sys.argv[7]) if len(sys.argv)>7 else 1.0; OFF=float(sys.argv[8]) if len(sys.argv)>8 else 0.0
R='/home/claude/school-empire'; src=f'{R}/assets/chars/{role}_{sx}_{base}.png'; dst=f'{R}/assets/chars/{role}_{sx}_{new}.png'
im=np.array(Image.open(src).convert('RGBA')).astype(float)/255; H,W=im.shape[:2]; FW=136
for f in range(W//FW):
    fr=im[:,f*FW:(f+1)*FW]; a=fr[...,3]>.5; ys=np.where(a.any(1))[0]
    if len(ys)==0: continue
    top,bot=ys[0],ys[-1]; lim=top+int((bot-top)*.46)
    r,g,b=fr[...,0],fr[...,1],fr[...,2]; mx=np.maximum(np.maximum(r,g),b); mn=np.minimum(np.minimum(r,g),b); v=mx; s=np.where(mx>0,(mx-mn)/np.maximum(mx,1e-6),0)
    d=np.maximum(mx-mn,1e-6); h=np.where(mx==r,((g-b)/d)%6,np.where(mx==g,(b-r)/d+2,(r-g)/d+4))*60
    import scipy.ndimage as nd
    Y=np.arange(H)[:,None]; hb=top+(bot-top)*.17
    skin=a&(h>=8)&(h<=45)&(s>.15)&(s<.7)&(v>.68)
    holes=nd.binary_fill_holes(nd.binary_closing(skin,iterations=2))&~skin
    holes=nd.binary_dilation(holes,iterations=2)
    A=a&(Y<=lim)&(h>=5)&(h<=50)&(s>.12)&(s<.75)&(v>.05)&(v<.55)&~holes
    B=a&(Y<=lim)&(v<.42)&nd.binary_dilation(A,iterations=3)&~holes&~nd.binary_dilation(skin,iterations=1)
    m=A|B
    nh=np.full_like(h,hue); ns=np.clip(np.maximum(s,.3)*sm,0,1); nv=np.clip(v*vm+OFF,0,1)
    c=np.stack([np.vectorize(lambda H_,S_,V_:colorsys.hsv_to_rgb(H_/360,S_,V_))(nh,ns,nv)[i] for i in range(3)],-1) if False else None
    # 向量化 HSV→RGB
    hh=(nh/60)%6; i=np.floor(hh).astype(int); ff=hh-i; p=nv*(1-ns); q=nv*(1-ns*ff); t=nv*(1-ns*(1-ff))
    rr=np.choose(i%6,[nv,q,p,p,t,nv]); gg=np.choose(i%6,[t,nv,nv,q,p,p]); bb=np.choose(i%6,[p,p,t,nv,nv,q])
    for ch,val in enumerate((rr,gg,bb)): fr[...,ch]=np.where(m,val,fr[...,ch])
    im[:,f*FW:(f+1)*FW]=fr
out=Image.fromarray((im*255).astype('uint8'),'RGBA').quantize(256,method=Image.FASTOCTREE) if False else Image.fromarray((im*255).astype('uint8'),'RGBA')
out=out.quantize(colors=250,method=Image.Quantize.FASTOCTREE,dither=Image.Dither.NONE); out.save(dst,optimize=True)
mp=f'{R}/assets/manifest.json'; M=json.load(open(mp)); A=M['assets']; e=dict(A[f'char:{role}:{sx}:{base}']); e['src']=f'chars/{role}_{sx}_{new}.png'; e['origin']=f'{role} {sx}_{base} 髮色改色(色相{hue})'; A[f'char:{role}:{sx}:{new}']=e
json.dump(M,open(mp,'w'),ensure_ascii=False,indent=1); print('ok',dst)
