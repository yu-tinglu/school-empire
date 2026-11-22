import numpy as np
from PIL import Image
from scipy import ndimage as ndi
def rm_bg(im,tol=34,grow=1.9):
    """從邊緣往內去除與邊緣色相近的底色（羊皮紙/白底）。"""
    im=im.convert('RGBA'); a=np.array(im).astype(int); h,w=a.shape[:2]
    edge=np.concatenate([a[0,:,:3],a[-1,:,:3],a[:,0,:3],a[:,-1,:3]]); bg=np.median(edge,axis=0)
    d=np.abs(a[:,:,:3]-bg).sum(2); cand=d<tol
    lab,n=ndi.label(cand); keep=np.zeros_like(cand)
    for k in np.unique(np.concatenate([lab[0],lab[-1],lab[:,0],lab[:,-1]])):
        if k: keep|=lab==k
    # 擴張：緊鄰已去除區域、顏色接近底色的像素也去掉（處理樹葉縫隙中被圍住的白底）
    near=d<tol*grow
    for _ in range(4 if grow else 0):
        grow=ndi.binary_dilation(keep,iterations=2)&near&~keep
        if not grow.any(): break
        keep|=grow
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
def defringe(im,erode=2):
    """去白邊：收縮不透明核心，邊緣像素的顏色改用最近的核心顏色，再柔化 alpha。"""
    a=np.array(im.convert('RGBA')); al=a[:,:,3]>200
    core=ndi.binary_erosion(al,iterations=erode)
    if core.sum()==0: return im
    idx=ndi.distance_transform_edt(~core,return_distances=False,return_indices=True)
    rgb=a[:,:,:3][idx[0],idx[1]]; out=a.copy(); out[:,:,:3]=np.where(core[:,:,None],a[:,:,:3],rgb)
    soft=ndi.gaussian_filter(ndi.binary_erosion(a[:,:,3]>90,iterations=1).astype(float),0.7)
    out[:,:,3]=np.minimum(a[:,:,3],(soft*255).astype(np.uint8)); return Image.fromarray(out)

def rm_bg_grad(im,T=7.0,blur=1.0,outline=True):
    """漸層底也能去：低梯度（平滑）且連到邊界的區域＝背景；角色的描邊會擋住擴散。"""
    im=im.convert('RGBA'); a=np.array(im); rgb=ndi.gaussian_filter(a[:,:,:3].astype(float),(blur,blur,0))
    gx=ndi.sobel(rgb,axis=1); gy=ndi.sobel(rgb,axis=0); g=np.sqrt(gx**2+gy**2).max(2)/4
    low=g<T; low=ndi.binary_opening(low,iterations=1); lab,n=ndi.label(low); h,w=low.shape
    bl=set(np.unique(np.concatenate([lab[0],lab[-1],lab[:,0],lab[:,-1]])))-{0}
    bg=np.isin(lab,list(bl))
    # 與邊界底色差距太大的平滑區（例如角色的大片衣服）不算背景
    edge=np.concatenate([a[0,:,:3],a[-1,:,:3],a[:,0,:3],a[:,-1,:3]]).astype(float); med=np.median(edge,axis=0)
    far=np.abs(a[:,:,:3].astype(float)-med).sum(2)>150; bg&=~far
    fg=~bg; fg=ndi.binary_opening(fg,iterations=1)
    al=ndi.gaussian_filter(fg.astype(float),0.7); out=a.copy(); out[:,:,3]=(np.minimum(al*1.15,1)*255).astype(np.uint8); return Image.fromarray(out)
