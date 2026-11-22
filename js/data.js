(function(root){
'use strict';
const SE = root.SE = root.SE || {};
const D = SE.D = {};

/* ---------- 年代錨點：[年, 貨幣指數M, 科技, 人口, 出生率‰, 家庭收入, 失業%, 傳統值, 國際值, 福利率, 壽命, 退休齡] ---------- */
D.ERA = [
 [1900,0.012,5,0.35,30,0.35,5,0.90,0.10,0.00,48,60],
 [1920,0.016,12,0.40,28,0.40,6,0.85,0.12,0.00,55,60],
 [1940,0.022,20,0.50,26,0.45,8,0.80,0.15,0.02,62,60],
 [1960,0.050,32,0.65,24,0.60,4,0.70,0.20,0.08,70,62],
 [1980,0.300,48,0.85,18,0.80,3,0.55,0.35,0.14,74,62],
 [2000,0.720,65,1.00,12,0.92,4,0.40,0.55,0.18,77,63],
 [2020,1.000,85,1.05,8,1.00,4,0.30,0.70,0.22,81,65],
 [2040,1.700,115,0.95,7,1.20,5,0.25,0.75,0.24,84,67],
];
D.ERA_KEYS = ['M','tech','pop','birth','income','unemp','trad','intl','welfare','life','retire'];
D.PART = { // 各學制入學率（占該年齡層）
 kg:[[1900,.01],[1940,.05],[1960,.15],[1980,.45],[2000,.70],[2020,.85],[2040,.90]],
 ps:[[1900,.35],[1920,.5],[1940,.75],[1960,.92],[1980,.98],[2020,.99]],
 jh:[[1900,.03],[1940,.20],[1960,.50],[1980,.90],[2000,.96],[2020,.98]],
 hs:[[1900,.02],[1940,.10],[1960,.25],[1980,.40],[2000,.50],[2020,.55],[2040,.55]],
 vh:[[1900,.005],[1940,.04],[1960,.12],[1980,.25],[2000,.35],[2020,.35],[2040,.33]],
 jc:[[1900,.002],[1940,.01],[1960,.04],[1980,.08],[2000,.10],[2020,.06],[2040,.05]],
 un:[[1900,.004],[1940,.02],[1960,.08],[1980,.25],[2000,.50],[2020,.55],[2040,.58]],
 gs:[[1900,.0005],[1940,.003],[1960,.01],[1980,.05],[2000,.12],[2020,.18],[2040,.22]],
};
D.HIST = [ // 歷史/世界事件（對架空地區視為世界性事件）
 {id:'war1',a:1914,b:1918,name:'世界大戰（第一階段）',birth:.85,econ:-.5,demand:.85,safety:-8,cost:1.15,intl:-.4,txt:'戰火席捲各國，徵召與物資短缺衝擊校園。'},
 {id:'flu',a:1918,b:1919,name:'大流行病',birth:.9,econ:-.3,demand:.9,safety:-6,cost:1.05,intl:-.2,txt:'疫病流行，學校被迫停課。'},
 {id:'depr',a:1929,b:1934,name:'經濟大蕭條',birth:.88,econ:-.9,demand:.88,safety:-2,cost:.95,intl:-.3,txt:'失業暴增，家長付不起學費。'},
 {id:'war2',a:1939,b:1945,name:'世界大戰（第二階段）',birth:.8,econ:-.7,demand:.8,safety:-10,cost:1.25,intl:-.6,txt:'戰爭波及校園，師生離散。'},
 {id:'boom',a:1946,b:1964,name:'戰後嬰兒潮',birth:1.25,econ:.5,demand:1.1,safety:0,cost:1,intl:.1,txt:'戰後嬰兒潮，學齡人口激增。'},
 {id:'oil',a:1973,b:1975,name:'石油危機',birth:1,econ:-.6,demand:.95,safety:0,cost:1.1,intl:0,txt:'能源價格飆升，經濟衰退。'},
 {id:'it',a:1995,b:2001,name:'資訊科技浪潮',birth:1,econ:.4,demand:1,safety:0,cost:1,intl:.2,txt:'網路與個人電腦席捲教育現場。'},
 {id:'asia',a:1997,b:1998,name:'區域金融風暴',birth:1,econ:-.6,demand:.95,safety:0,cost:1,intl:-.1,txt:'金融風暴使家庭收入縮水。'},
 {id:'gfc',a:2008,b:2010,name:'全球金融海嘯',birth:.97,econ:-.7,demand:.94,safety:0,cost:1,intl:-.1,txt:'金融海嘯造成裁員與學費壓力。'},
 {id:'pand',a:2020,b:2022,name:'全球疫情',birth:.94,econ:-.4,demand:.92,safety:-4,cost:1.05,intl:-.4,txt:'疫情導致停課與遠距教學。'},
 {id:'ai',a:2023,b:2030,name:'人工智慧浪潮',birth:1,econ:.2,demand:1,safety:0,cost:1,intl:.1,txt:'AI 工具重塑教學與評量。'},
];
D.FUT = [ // 未來架空事件（機率每年3%）
 {id:'climate',name:'極端氣候災害',birth:1,econ:-.4,demand:.95,safety:-6,cost:1.1,intl:-.1,txt:'極端氣候導致校舍受損與停課。',dur:2},
 {id:'recess',name:'長期經濟衰退',birth:.97,econ:-.8,demand:.9,safety:0,cost:1,intl:-.2,txt:'長期衰退使家庭縮減教育支出。',dur:4},
 {id:'techboom',name:'科技大躍進',birth:1,econ:.6,demand:1.05,safety:0,cost:1,intl:.2,txt:'突破性科技帶來新產業與新需求。',dur:5},
 {id:'baby',name:'生育補助成效',birth:1.2,econ:.1,demand:1,safety:0,cost:1,intl:0,txt:'新的人口政策使出生率回升。',dur:6},
 {id:'migrate',name:'大規模人口遷徙',birth:1,econ:0,demand:1.08,safety:-2,cost:1,intl:.1,txt:'移民潮讓學齡人口結構改變。',dur:4},
];

/* ---------- 學制 ---------- */
D.TYPE_ORDER = ['kg','ps','jh','hs','vh','jc','un','gs'];
D.TYPES = {
 kg:{n:'幼兒園',e:3,y:3,cls:25,spt:14,tu:38000,sub:22000,sal:.8,next:['ps'],sf:'幼兒園',supply:3500},
 ps:{n:'國小',e:6,y:6,cls:30,spt:16,tu:25000,sub:35000,sal:.9,next:['jh'],sf:'國小',supply:4000},
 jh:{n:'國中',e:12,y:3,cls:32,spt:15,tu:30000,sub:40000,sal:.95,next:['hs','vh','jc'],sf:'國中',supply:4500},
 hs:{n:'普通高中',e:15,y:3,cls:35,spt:16,tu:35000,sub:40000,sal:1,next:['un'],sf:'高中',supply:5000},
 vh:{n:'技術型高中',e:15,y:3,cls:35,spt:14,tu:30000,sub:45000,sal:1,next:['un','jc'],sf:'高工',supply:6500},
 jc:{n:'專科學校',e:15,y:5,cls:40,spt:17,tu:45000,sub:30000,sal:1.1,next:['un'],sf:'專科學校',supply:6500},
 un:{n:'大學',e:18,y:4,cls:45,spt:18,tu:60000,sub:40000,sal:1.45,next:['gs'],sf:'大學',supply:8000},
 gs:{n:'研究所',e:22,y:2,cls:15,spt:10,tu:80000,sub:42000,sal:1.65,next:[],sf:'研究院',supply:12000},
};
D.DIMS = ['teach','outcome','stuSat','trust','staffSat','fin','safety','social','research','intl'];
D.DIM_N = {teach:'教學品質',outcome:'升學/就業成果',stuSat:'學生滿意度',trust:'家長信任',staffSat:'教師滿意度',fin:'財務穩健度',safety:'校園安全',social:'社會聲望',research:'研究能力',intl:'國際化程度'};
// 權重 [teach,outcome,stuSat,trust,staffSat,fin,safety,social,research,intl]
D.WEIGHTS = {
 kg:[.15,.02,.18,.25,.08,.07,.20,.03,0,.02], ps:[.20,.10,.15,.20,.08,.07,.12,.05,0,.03],
 jh:[.20,.22,.10,.15,.07,.06,.10,.06,0,.04], hs:[.20,.28,.07,.10,.07,.06,.06,.08,.02,.06],
 vh:[.20,.22,.08,.10,.07,.07,.08,.10,.04,.04], jc:[.19,.20,.08,.08,.07,.07,.06,.12,.07,.06],
 un:[.15,.15,.06,.04,.07,.07,.04,.14,.20,.08], gs:[.12,.10,.03,.02,.06,.06,.02,.15,.32,.12],
};
// 各學制所需設施（權重）
D.NEEDS = {
 kg:{field:.3,canteen:.3,clinic:.2,library:.2}, ps:{library:.25,field:.25,gym:.2,canteen:.2,clinic:.1},
 jh:{library:.2,lab:.2,gym:.2,field:.15,canteen:.15,clinic:.1}, hs:{library:.25,lab:.25,gym:.15,field:.1,canteen:.15,clinic:.1},
 vh:{workshop:.3,lab:.2,library:.15,gym:.1,canteen:.15,clinic:.1}, jc:{workshop:.25,lab:.2,library:.2,gym:.1,canteen:.15,dorm:.1},
 un:{library:.2,lab:.2,research:.15,gym:.1,canteen:.15,dorm:.2}, gs:{library:.3,lab:.25,research:.35,dorm:.1},
};

/* ---------- 建築 ---------- */
D.BLD = {
 classroom:{n:'教室樓',w:3,h:2,c:18e6,life:50,tech:0,wk:14,col:'#b5654a',d:'每棟提供 8 間教室（隨等級增加）',rooms:8},
 office:{n:'辦公室',w:2,h:2,c:6e6,life:50,tech:0,wk:8,col:'#8a6d4b',d:'容納 20 名教職員',staff:20},
 library:{n:'圖書館',w:3,h:2,c:12e6,life:60,tech:0,wk:12,col:'#6a4f7a',d:'提供學習資源，服務約 400 人',serve:400},
 lab:{n:'實驗室',w:2,h:2,c:10e6,life:40,tech:12,wk:12,col:'#3f7f8c',d:'理化實驗，服務約 250 人',serve:250},
 workshop:{n:'實習工廠',w:3,h:2,c:14e6,life:40,tech:12,wk:12,col:'#6b6b6b',d:'技職實習，服務約 200 人',serve:200},
 gym:{n:'體育館',w:3,h:3,c:25e6,life:50,tech:0,wk:20,col:'#c07a2c',d:'體育與健康，服務約 500 人',serve:500},
 field:{n:'操場',w:4,h:3,c:8e6,life:30,tech:0,wk:8,col:'#5c9a4c',d:'戶外活動，服務約 600 人',serve:600},
 pool:{n:'游泳池',w:3,h:2,c:14e6,life:35,tech:20,wk:14,col:'#4aa3c9',d:'提升體育與滿意度',serve:800},
 dorm:{n:'宿舍',w:3,h:2,c:15e6,life:50,tech:0,wk:14,col:'#a8655f',d:'120 床，可收宿費並擴大招生區域',beds:120},
 canteen:{n:'餐廳',w:3,h:2,c:9e6,life:40,tech:0,wk:10,col:'#d49a3a',d:'供餐、提升滿意度並有營收',serve:400},
 audit:{n:'禮堂',w:3,h:3,c:20e6,life:60,tech:0,wk:18,col:'#7a3f55',d:'典禮活動、校慶與出租收入',serve:800},
 clinic:{n:'醫護室',w:2,h:1,c:3e6,life:40,tech:5,wk:6,col:'#d96a6a',d:'健康與安全，降低疫病風險',serve:600},
 research:{n:'研究中心',w:3,h:2,c:30e6,life:40,tech:30,wk:18,col:'#2f5d8a',d:'研究經費與產學合作',serve:150},
 admin:{n:'行政大樓',w:3,h:3,c:24e6,life:60,tech:0,wk:18,col:'#4f6b57',d:'降低行政成本，容納 40 名人員',staff:40},
 parking:{n:'停車場',w:3,h:2,c:5e6,life:30,tech:30,wk:6,col:'#8a8a8a',d:'提升教職員便利並有出租收入'},
 landscape:{n:'校園景觀',w:2,h:2,c:2e6,life:30,tech:0,wk:4,col:'#79b45f',d:'提升滿意度與校園聲望'},
};
D.LVMULT = [0,1,1.6,2.2]; D.LVCOST = [0,1,.55,.8];

/* ---------- 地區規則（架空，避免誤套現實法規） ---------- */
D.REGIONS = {
 beiling:{n:'北陵共和國',d:'中央集權、升學壓力大。公立體系強、學費受管制，補助依人頭發放。',pop:160000,priv:.28,cap:1.0,subM:'cap',subX:1.25,strict:.85,classMax:1.15,exam:.9,trad:.8,intl:.3,voc:.35,wage:1.0,cost:1.0,land:1.2,donate:.8,tax:0,sev:3,free:['ps','jh'],comp:1.0,sib:1.1},
 nanyang:{n:'南洋自由邦',d:'市場導向、學費自由。補助少但可吸引國際學生，需繳營利稅。',pop:140000,priv:.45,cap:null,subM:'voucher',subX:.6,strict:.4,classMax:1.4,exam:.55,trad:.4,intl:.9,voc:.3,wage:1.1,cost:1.1,land:1.5,donate:.6,tax:.1,sev:1,free:[],comp:1.3,sib:1.0},
 dongyuan:{n:'東原聯邦',d:'地方分權、技職傳統強。補助依辦學績效，人口逐年老化。',pop:130000,priv:.33,cap:1.25,subM:'perf',subX:1.1,strict:.7,classMax:1.2,exam:.6,trad:.65,intl:.4,voc:.7,wage:.95,cost:.9,land:.8,donate:1.0,tax:0,sev:2,free:['ps'],comp:.9,sib:.95},
};
D.regionRandom = function(g, R){ // 「新星紀元」：隨機生成參數的架空世界
  const f=(a,b)=>a+R.f(g)*(b-a);
  const models=['cap','voucher','perf'];
  return {n:'新星紀元',d:'隨機生成的架空世界，每次開局規則皆不同。',pop:Math.round(f(110000,170000)),priv:f(.2,.5),cap:R.chance(g,.5)?f(.9,1.4):null,subM:R.pick(g,models),subX:f(.6,1.4),strict:f(.3,.9),classMax:f(1.1,1.4),exam:f(.4,.95),trad:f(.3,.85),intl:f(.2,.9),voc:f(.25,.75),wage:f(.9,1.15),cost:f(.85,1.15),land:f(.7,1.5),donate:f(.5,1.1),tax:R.chance(g,.4)?.08:0,sev:R.i(g,1,4),free:R.chance(g,.5)?['ps']:[],comp:f(.8,1.4),sib:f(.9,1.1)};
};

/* ---------- 教育理念 ---------- */
D.PHIL = {
 exam:{n:'升學導向',d:'強調考試成績，升學成果佳但學生壓力大。',out:10,sat:-6,trust:3,soc:0,intl:0,res:0,tol:1.05,cost:1.0,stress:.8,pool:1.1,fit:{exam:1.0,trad:.4}},
 free:{n:'自由教育',d:'重視自主與創造力，學生滿意度高但升學表現較弱。',out:-6,sat:10,trust:0,soc:2,intl:2,res:1,tol:1.0,cost:1.0,stress:.2,pool:.95,fit:{trad:-.6,intl:.3}},
 elite:{n:'菁英教育',d:'高門檻高學費，聲望成長快但招生規模受限。',out:8,sat:0,trust:2,soc:6,intl:2,res:3,tol:1.3,cost:1.15,stress:.6,pool:.6,fit:{exam:.5,trad:.2}},
 tech:{n:'技職教育',d:'強調實作與就業，產學合作收入高，學術成果較弱。',out:-4,sat:2,trust:1,soc:1,intl:0,res:1,tol:.95,cost:1.05,stress:.3,pool:.9,fit:{voc:1.0}},
 art:{n:'藝術教育',d:'培養藝術與表演人才，競賽與社會聲望突出。',out:-5,sat:7,trust:0,soc:5,intl:3,res:0,tol:1.05,cost:1.05,stress:.25,pool:.8,fit:{trad:-.4,intl:.2}},
 intl:{n:'國際教育',d:'雙語與交換計畫，國際化高且學費容忍度高，但成本較高。',out:0,sat:3,trust:-1,soc:3,intl:14,res:2,tol:1.2,cost:1.12,stress:.4,pool:.75,fit:{intl:1.0,trad:-.5}},
};

/* ---------- 開局困境 / 難度 ---------- */
D.TROUBLES = [{id:'fin',n:'財務危機'},{id:'enr',n:'招生不足'},{id:'old',n:'校舍破舊'},{id:'tch',n:'師資不足'},{id:'rep',n:'聲望低落'},{id:'mgt',n:'管理混亂'},{id:'lost',n:'學生流失'},{id:'qual',n:'教育品質不佳'}];
D.DIFF = {
 easy:{n:'輕鬆',rev:1.15,cost:.92,comp:.8,evt:.7,cash:1.8,press:.7},
 normal:{n:'普通',rev:1,cost:1,comp:1,evt:1,cash:1,press:1},
 hard:{n:'困難',rev:.96,cost:1.05,comp:1.25,evt:1.25,cash:.7,press:1.25},
 hell:{n:'地獄',rev:.92,cost:1.12,comp:1.5,evt:1.5,cash:.4,press:1.5},
};
D.START_YEARS = [1900,1920,1940,1960,1980,2000,2020];

/* ---------- 社團 / 職業 / 名字 ---------- */
D.CLUBS = [
 {id:0,n:'學術研究社',f:0},{id:1,n:'美術音樂社',f:1},{id:2,n:'體育校隊',f:2},{id:3,n:'科技實作社',f:3},
 {id:4,n:'志工服務社',f:0},{id:5,n:'戲劇社',f:1},{id:6,n:'辯論社',f:0},{id:7,n:'園藝社',f:3},
];
D.FIELDS = ['學科','藝術','體育','技術'];
D.JOBS = ['教師','工程師','醫師','企業主','公務員','藝術家','運動員','研究員','技師','農工','商人','服務業','家管','待業','軍警','律師'];
D.JOBSAL = [.7,1.2,1.8,2.2,.9,.8,1.1,1.3,.8,.5,1.1,.6,0,.1,.9,1.7];
D.SUR = ['陳','林','黃','張','李','王','吳','劉','蔡','楊','許','鄭','謝','洪','郭','邱','曾','廖','賴','徐','周','葉','蘇','莊','呂','江','何','蕭','羅','高','潘','簡','朱','鍾','彭','游','詹','胡','施','沈','余','盧','梁','趙','顏','柯','翁','魏','孫','戴','范','方','宋','鄧','杜','傅','侯','曹','薛','丁'];
D.GM = ['志明','建宏','俊傑','家豪','宗翰','冠宇','承恩','柏翰','彥廷','哲維','信宏','文彥','國棟','明哲','正義','子謙','宇軒','浩然','品睿','紹華','立偉','中岳','天佑','啟文','鴻志','秉謙','維倫','世豪','奕辰','昱翔'];
D.GF = ['淑芬','雅婷','怡君','宜蓁','佳穎','靜宜','欣怡','詩涵','佩珊','惠敏','雨彤','思妤','安妮','曉晴','美玲','玉蘭','心怡','芷若','婉如','馨儀','語婕','筱涵','依婷','采薇','佩玲','佳琪','慧敏','盈秀','妙音','蕙芳'];
D.SCH_PRE = ['明德','崇文','志道','立達','致遠','博雅','啟明','育英','弘毅','匯文','培正','新民','東華','慈暉','景星','海天','青雲','格致','敦品','嘉禾','懷德','成功','復興','信義','和平','仁愛','中正','文華','樹人','啟智','聖心','廣達','鼎新','望龍','育秀'];
D.SPECS = ['雙語課程','藝術班','資優班','科學實驗班','運動專班','資訊班','實習合作班','國際班'];
D.DT = ['教務','學務','總務','輔導'];
D.STYLES = ['嚴謹紀律','自由開明','創新進取','節儉務實','公關擅長'];
})(typeof window!=='undefined'?window:globalThis);
