// 載入引擎（Node）
const path=require('path'); const fs=require('fs');
global.SE=global.SE||{};
const files=['core','data','world','ledger','people','school','edu','rivals','events','group','engine','ai','save','campus-sim'];
module.exports=function(){ for(const f of files){ const p=path.join(__dirname,'..','js',f+'.js'); if(fs.existsSync(p)) require(p); } return global.SE; };
