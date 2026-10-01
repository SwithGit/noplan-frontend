const fs=require('node:fs');
const path=require('node:path');
const sharp=require('C:/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const dir=__dirname;
const assets=path.resolve(dir,'../../../output/imagegen');
(async()=>{
 const qr=JSON.parse(fs.readFileSync(path.join(dir,'event-qr.json'),'utf8'));
 const size=qr.modules.length+8;
 const modules=qr.modules.flatMap((row,y)=>row.flatMap((v,x)=>v?[`<rect x="${x+4}" y="${y+4}" width="1" height="1"/>`]:[])).join('');
 let cover=fs.readFileSync(path.join(assets,'noplan-expo-cover-v7-city.svg'),'utf8');
 cover=cover.replace(/<a href="https:\/\/noplan\.live">[\s\S]*?<\/a>/,
 `<a href="https://noplan.live/event"><svg x="62" y="988" width="122" height="122" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges"><rect width="${size}" height="${size}" fill="white"/><g fill="#251b43">${modules}</g></svg></a>`)
 .replace('내 취향의 코스 만나기','노피 찾기 이벤트 참여')
 .replace('QR을 스캔하고 노플랜에서 시작해요.','QR을 스캔하고 스탬프를 모아보세요.')
 .replace('>noplan.live</text>','>noplan.live/event</text>');
 fs.writeFileSync(path.join(dir,'cover-event.svg'),cover);
 await sharp(Buffer.from(cover)).resize(1200,2546).png().toFile(path.join(dir,'cover-event.png'));
 // Keep the approved inside artwork. Remove only the generated fold-guide
 // columns; actual fold guides are supplied separately and are not printed.
 const inside=path.join(assets,'noplan-expo-inside-original-assets.png');
 const overlays=[];
 for(const x of [496,993]) {
  const input=await sharp(inside).extract({left:x-4,top:0,width:1,height:1055}).resize(3,1055,{kernel:'nearest'}).png().toBuffer();
  overlays.push({input,left:x-1,top:0});
 }
 await sharp(inside).composite(overlays).png().toFile(path.join(dir,'inside-clean.png'));
 console.log('Event QR cover and original inside artwork prepared.');
})().catch(e=>{console.error(e);process.exitCode=1;});
