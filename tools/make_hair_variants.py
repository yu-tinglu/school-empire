#!/usr/bin/env python3
"""cut_walk.py 之後執行：替學生／老師／幼童／大學生各產生數種合理髮色的變體（recolor_hair.py）。"""
import glob,os,subprocess,re
R='/home/claude/school-empire'
C={'blond':(46,1.5,1.2,.45),'chestnut':(20,1.5,1.35,.18),'lightbrown':(32,1.2,1.1,.32),'ginger':(14,1.9,1.3,.3),'gray':(30,.15,.7,.5),'burgundy':(345,1.6,1.2,.12)}
KID={'lightbrown':(32,1.3,1.3,.12),'ginger':(14,1.9,1.5,.25),'chestnut':(20,1.5,1.35,.18)}
# (角色,性別): (可改色的基底變體→頭髮取樣高度比例, 顏色清單, 色表)；略過帽子、光頭、白髮老人
PLAN={('student',0):({0:.46,2:.46,3:.46},['blond','chestnut','lightbrown','ginger'],C),
 ('student',1):({0:(.5,.78),1:(.5,.8),2:(.5,.7),3:(.5,.7)},['blond','chestnut','lightbrown','ginger'],C),
 ('teacher',0):({0:.46,2:.46},['chestnut','lightbrown','gray','blond'],C),
 ('teacher',1):({0:.5,1:.5,2:.72,3:.5},['chestnut','lightbrown','gray','blond'],C),
 ('kid',0):({0:.62},['lightbrown','ginger','chestnut'],KID),('kid',1):({0:.7},['lightbrown','ginger','chestnut'],KID),
 ('uni',0):({0:.46},['blond','chestnut','ginger','burgundy'],C),('uni',1):({0:.62},['blond','chestnut','ginger','burgundy'],C)}
for (role,sx),(bases,names,tab) in PLAN.items():
    n=len(glob.glob(f'{R}/assets/chars/{role}_{sx}_*.png')); bl=list(bases.items())
    for i,nm in enumerate(names):
        h,s,v,o=tab[nm]; b,lim=bl[i%len(bl)]; new=n+i; lim=lim if isinstance(lim,tuple) else (lim,0)
        subprocess.run(['python3',f'{R}/tools/recolor_hair.py',role,str(sx),str(b),str(new),str(h),str(s),str(v),str(o),str(lim[0]),str(lim[1])],check=True)
