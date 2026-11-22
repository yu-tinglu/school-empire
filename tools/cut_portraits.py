#!/usr/bin/env python3
"""人物頭像：從角色素材包 A/B/C/D 裁出，key=portrait:<s|t>:<sx 1=女 0=男>:<序號>。"""
import sys,os,json
from PIL import Image
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
mp=f'{ROOT}/assets/manifest.json'; m=json.load(open(mp)); cnt={}
for k in [k for k in m['assets'] if k.startswith('portrait:')]: del m['assets'][k]
for si,(src,y0,hh,x0,cw,n,gs,role,side) in enumerate(SETS):
    im=S(src)
    for i in range(n):
        cx=x0+(i+.5)*cw; box=(int(cx-side/2),y0,int(cx+side/2),y0+side)
        p=flat(im.crop(box)).resize((256,256),Image.LANCZOS)
        sx=1 if gs[i]=='F' else 0; key=(role,sx); j=cnt.get(key,0); cnt[key]=j+1
        fn=f'portraits/{role}_{sx}_{j}.png'; p.save(f'{ROOT}/assets/{fn}')
        m['assets'][f'portrait:{role}:{sx}:{j}']=dict(src=fn,ox=0,oy=0,k=1,cat='portrait',status='final',w=256,h=256,origin=f'{src} 裁切（使用者提供）')
json.dump(m,open(mp,'w'),ensure_ascii=False,indent=1); print(cnt)
