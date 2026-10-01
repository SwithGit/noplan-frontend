const fs=require('node:fs');
const path=require('node:path');
const sharp=require('C:/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const out=__dirname;
const root='E:/카카오톡 받은 파일/HNCSOFT_서류/프로젝트 관리/2026/노플랜/노피/nopi_32';
const original='C:/Users/user/AppData/Local/Temp/codex-clipboard-670c5fa0-99a9-4e7a-9747-e74bd45fbcbd.png';
const clean='C:/Users/user/.codex/generated_images/01a0b34b-3f5a-7fc0-8b64-8c61352d5808/exec-e983be5e-39ee-42a0-843a-e5845bcb4d8e.png';
const uri=b=>`data:image/png;base64,${b.toString('base64')}`;
(async()=>{
 const regions=[
  {left:154,top:395,width:43,height:51},
  {left:107,top:534,width:43,height:49},
  {left:377,top:418,width:53,height:61},
  {left:630,top:359,width:66,height:35},
  {left:1134,top:363,width:40,height:51},
 ];
 const patches=[];
 for(const r of regions){
  const mask=Buffer.from(`<svg width="${r.width}" height="${r.height}"><defs><filter id="f"><feGaussianBlur stdDeviation=".65"/></filter></defs><rect x=".6" y=".6" width="${r.width-1.2}" height="${r.height-1.2}" fill="white" filter="url(#f)"/></svg>`);
  const input=await sharp(clean).resize(1536,1024).extract(r).ensureAlpha().composite([{input:mask,blend:'dest-in'}]).png().toBuffer();
  patches.push({input,left:r.left,top:r.top});
 }
 // Remove the previous purple mascot's remaining motion marks using adjacent
 // empty stall pavement; the original character's own ㅋㅋ is added below.
 const pavement=await sharp(clean).extract({left:430,top:425,width:8,height:24}).resize(16,24).png().toBuffer();
 patches.push({input:pavement,left:413,top:425});
 const base=await sharp(original).composite(patches).png().toBuffer();
 const placements=[
  {id:'01',cropY:80,x:154,y:399,w:37,h:38,clip:'yellow'},
  {id:'07',cropY:82,x:112,y:540,w:36,h:37,clip:'red'},
  {id:'09',cropY:82,x:373,y:425,w:47,h:41,clip:'purple'},
  {id:'10',cropY:69,x:638,y:355,w:43,h:42,clip:'pink'},
  {id:'17',cropY:63,x:1127,y:369,w:40,h:42,clip:'cyan'},
 ];
 const images=[];
 for(const p of placements){
  // Remove only the upper text strip. The side ㅋㅋ on nopi_09 stays.
  const cropped=await sharp(path.join(root,`nopi_${p.id}.png`))
   .extract({left:0,top:p.cropY,width:360,height:360-p.cropY}).png().toBuffer();
  const png=await sharp(cropped).trim({threshold:0}).png().toBuffer();
  fs.writeFileSync(path.join(out,`nopi-hidden-${p.id}.png`),png);
  images.push(`<image aria-label="Original nopi_${p.id}" href="${uri(png)}" x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" preserveAspectRatio="xMidYMid meet" clip-path="url(#${p.clip})"/>`);
 }
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1536" height="1024" viewBox="0 0 1536 1024">
 <defs>
  <clipPath id="yellow"><path d="M169 393H201V450H154Z"/></clipPath>
  <clipPath id="red"><path d="M128 532H156V588H110Z"/></clipPath>
  <clipPath id="purple"><rect x="366" y="415" width="68" height="69"/></clipPath>
  <clipPath id="pink"><rect x="624" y="352" width="80" height="39"/></clipPath>
  <clipPath id="cyan"><path d="M1139 363H1179V417H1145Z"/></clipPath>
 </defs>
 <image href="${uri(base)}" width="1536" height="1024"/>
 ${images.join('\n')}
 </svg>`;
 fs.writeFileSync(path.join(out,'noplan-festival-hidden-nopi.svg'),svg);
 await sharp(Buffer.from(svg)).png().toFile(path.join(out,'noplan-festival-hidden-nopi.png'));
 // Enlarged inspection tiles, excluded from the deliverable image.
 const qa=[];
 const boxes=[{left:135,top:384},{left:91,top:522},{left:352,top:410},{left:618,top:347},{left:1112,top:350}];
 for(let i=0;i<boxes.length;i++){
  const input=await sharp(path.join(out,'noplan-festival-hidden-nopi.png')).extract({...boxes[i],width:80,height:80}).resize(320,320).png().toBuffer();
  qa.push({input,left:i*320,top:0});
 }
 await sharp({create:{width:1600,height:320,channels:3,background:'#fff'}}).composite(qa).png().toFile(path.join(out,'noplan-festival-placement-check.png'));
 console.log('Five original PNG characters placed with foreground occlusion; only side ㅋㅋ retained.');
})().catch(e=>{console.error(e);process.exitCode=1;});
