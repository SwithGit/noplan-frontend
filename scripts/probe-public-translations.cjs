const {createRequire}=require('node:module'),fs=require('node:fs');
const req=createRequire('D:/Backend/NoPlan/package.json');req('dotenv').config({path:'D:/Backend/NoPlan/.env',quiet:true});
const {createPublicTranslator}=req('./routes/i18n/publicTranslations');
const translator=createPublicTranslator({cacheFile:null});
const strings=['2026 답십리 영화제','답십리영화미디어아트센터','연남동 맞춤 코스','바다주막에서 가볍게 마무리','연남동','친구와 함께 둘러보는 전시'];
(async()=>{const results={};for(const locale of ['en','zh-CN','ja']){const result=await translator.translate(strings,locale);results[locale]=result;console.log(JSON.stringify({locale,status:result.status,count:result.items.length,sample:result.items[0]?.text}));}fs.writeFileSync('output/i18n/public-probe.json',JSON.stringify(results,null,2));})();
