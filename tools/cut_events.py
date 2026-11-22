#!/usr/bin/env python3
"""事件插圖：從素材 Z（49/50/52 區）裁出，key=event:<名稱>，並建立事件模板→插圖對應表（assets/event_map.json）。"""
import os,json
from PIL import Image
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
z=Image.open(f'{ROOT}/assets/source/25_pack_Z.png').convert('RGB')
C={ # 名稱:(x0,y0,x1,y1)
 'grad':(14,110,174,209),'sports':(180,110,341,209),'festival':(348,110,500,209),'trip':(14,236,174,315),'confess':(184,236,341,315),'culture':(348,236,500,315),
 'morning':(525,110,625,190),'class':(632,110,730,190),'lunch':(738,110,838,190),'nap':(844,110,942,190),
 'club':(525,226,625,312),'dusk':(632,226,730,312),'exam':(738,226,838,312),'study':(844,226,942,312),
 'crisis':(1294,110,1474,198),'bully':(1482,110,1664,198),'mystery':(1294,226,1474,312),'sick':(1482,226,1664,312)}
mp=f'{ROOT}/assets/manifest.json'; m=json.load(open(mp))
for k,b in C.items():
    im=z.crop(b); im.save(f'{ROOT}/assets/events/{k}.png')
    m['assets'][f'event:{k}']=dict(src=f'events/{k}.png',ox=0,oy=0,k=1,cat='event',status='final',w=im.width,h=im.height,origin='25_pack_Z 裁切（使用者提供）')
EM={'anniv':'festival','alumVisit':'festival','alumAssoc':'festival','fundDrive':'festival','donOffer':'festival','award':'grad','talent':'club','clubReq':'club','industry':'trip','grant':'trip','sister':'trip','exchStu':'trip','compInv':'sports','curReform':'class','bully':'bully','bullyEsc':'bully','misconduct':'bully','protest':'bully','colConf':'bully','union':'bully','strike':'bully','parentComp':'bully','flu':'sick','pandemic':'sick','stress':'sick','hardship':'dusk','disaster':'crisis','bldDamage':'crisis','utility':'crisis','food':'lunch','cheat':'exam','teacherShort':'class','vacancy':'class','quit':'dusk','raise':'morning','promo':'morning','pta':'class','media':'culture','rumor':'mystery','tech':'study','obsolete':'study','audit':'study','loanOffer':'study','budgetWarn':'study','policyNote':'morning','worldNote':'culture','conscript':'crisis','info':'morning','landSale':'morning','rivalAd':'culture','distMerge':'culture','shortage':'class','teacherTrain':'class'}
m['event_map']=EM
json.dump(m,open(mp,'w'),ensure_ascii=False,indent=1)
