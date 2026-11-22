import numpy as np
from PIL import Image
from scipy import ndimage as ndi
def rm_bg(im,tol=34):
    """從邊緣往內去除與邊緣色相近的底色（羊皮紙/白底）。"""
    im=im.convert('RGBA'); a=np.array(im).astype(int); h,w=a.shape[:2]
    edge=np.concatenate([a[0,:,:3],a[-1,:,:3],a[:,0,:3],a[:,-1,:3]]); bg=np.median(edge,axis=0)
    d=np.abs(a[:,:,:3]-bg).sum(2); cand=d<tol
    lab,n=ndi.label(cand); keep=np.zeros_like(cand)
    for k in np.unique(np.concatenate([lab[0],lab[-1],lab[:,0],lab[:,-1]])):
        if k: keep|=lab==k
    alpha=np.where(keep,0,255).astype(np.uint8)
    alpha=ndi.binary_opening(alpha>0,iterations=1); alpha=ndi.gaussian_filter(alpha.astype(float),0.8)
    out=np.array(im); out[:,:,3]=np.minimum(out[:,:,3],(alpha*255).astype(np.uint8)); return Image.fromarray(out)
def split(im,minarea=1500,dil=7):
    a=np.array(im)[:,:,3]>40; m=ndi.binary_dilation(a,iterations=dil); lab,n=ndi.label(m); res=[]
    for k in range(1,n+1):
        ys,xs=np.where((lab==k)&a)
        if len(xs)<minarea: continue
        res.append((xs.min(),ys.min(),xs.max()+1,ys.max()+1))
    res.sort(key=lambda b:b[0]); return [im.crop(b) for b in res]
