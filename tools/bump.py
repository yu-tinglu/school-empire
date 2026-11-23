#!/usr/bin/env python3
"""用法：python3 tools/bump.py 1.01  → 同步 js/version.js、version.json，並為 index.html 的 js/css 加 ?v=（避免快取舊檔）"""
import re,sys,json
v=sys.argv[1]; assert re.fullmatch(r'\d+\.\d\d',v),'版本格式需為 x.xx'
p='js/version.js'; s=open(p,encoding='utf8').read(); open(p,'w',encoding='utf8').write(re.sub(r"APPVER='[^']*'","APPVER='%s'"%v,s))
json.dump({'version':v},open('version.json','w'))
p='index.html'; s=open(p,encoding='utf8').read()
s=re.sub(r'((?:js|css)/[\w.\-]+\.(?:js|css))(\?v=[\d.]+)?"',lambda m:m.group(1)+'?v='+v+'"',s)
open(p,'w',encoding='utf8').write(s); print('ok',v)
