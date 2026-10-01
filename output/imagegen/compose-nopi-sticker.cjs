const fs=require('node:fs');
const path=require('node:path');
const sharp=require('C:/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const out=__dirname;
(async()=>{
 const mascot=fs.readFileSync(path.join(out,'nopi-hidden-01.png')).toString('base64');
 const qr=JSON.parse(fs.readFileSync(path.resolve(out,'../../tmp/pdfs/noplan-a4/event-qr.json'),'utf8'));
 const cells=qr.modules.flatMap((r,y)=>r.flatMap((v,x)=>v?[`<rect x="${x+4}" y="${y+4}" width="1" height="1"/>`]:[])).join('');
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="100mm" height="140mm" viewBox="0 0 600 840">
 <defs>
 <linearGradient id="bg" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#faf7ff"/><stop offset="1" stop-color="#e9ddff"/></linearGradient>
 <linearGradient id="jelly" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#e1d4fc"/><stop offset=".5" stop-color="#d3bff7"/><stop offset="1" stop-color="#e8ddff"/></linearGradient>
 <clipPath id="card"><rect x="6" y="6" width="588" height="828" rx="42"/></clipPath>
 </defs>
 <rect x="6" y="6" width="588" height="828" rx="42" fill="url(#bg)" stroke="#baa0e7" stroke-width="2"/>
 <g clip-path="url(#card)">
 <path d="M-40 369C74 297 134 454 260 408S480 373 641 425" fill="none" stroke="#e4d8fa" stroke-width="57"/>
 <path d="M-30 416C94 352 194 447 318 421S501 401 628 433" fill="none" stroke="#c5a8ee" stroke-width="1.5"/>
 </g>
 <g font-family="Noto Sans KR, Malgun Gothic, sans-serif">
 <text x="46" y="57" font-family="Arial,sans-serif" font-size="24" font-weight="800" letter-spacing="-1" fill="#7954c9">noplan</text>
 <rect x="430" y="32" width="122" height="31" rx="15.5" fill="#fff" fill-opacity=".8"/>
 <text x="491" y="53" font-size="11" letter-spacing="1" text-anchor="middle" fill="#8d71af">FIND NOPI</text>
 <text x="300" y="124" text-anchor="middle" font-size="35" font-weight="800" letter-spacing="-1.6" fill="#2b2051">노피를 찾았다!</text>
 <text x="300" y="154" text-anchor="middle" font-size="15" fill="#8b729e">반가워요, 여기서 스탬프 하나!</text>
 <ellipse cx="300" cy="418" rx="173" ry="22" fill="url(#jelly)"/>
 <image href="data:image/png;base64,${mascot}" x="147" y="190" width="306" height="244" preserveAspectRatio="xMidYMid meet"/>
 <g fill="none" stroke="#ab89d5" stroke-width="2" stroke-linecap="round"><path d="M121 240v16m-8-8h16M471 335v11m-5.5-5.5h11"/></g>
 <circle cx="461" cy="224" r="3" fill="#c1a1e7"/>
 <g transform="translate(100 361) rotate(-10)">
 <circle r="31" fill="#7954c9" stroke="#fff" stroke-width="4"/>
 <text y="8" text-anchor="middle" font-family="Arial,sans-serif" font-size="24" font-weight="700" fill="#fff">01</text>
 </g>
 <rect x="50" y="465" width="500" height="263" rx="29" fill="#fff" stroke="#dfd1f2"/>
 <svg x="68" y="498" width="198" height="198" viewBox="0 0 ${qr.modules.length+8} ${qr.modules.length+8}" shape-rendering="crispEdges">
 <rect width="100%" height="100%" fill="#fff"/><g fill="#251b40">${cells}</g></svg>
 <rect x="296" y="507" width="75" height="25" rx="12.5" fill="#f1eafa"/>
 <text x="333.5" y="524" text-anchor="middle" font-family="Arial,sans-serif" font-size="10" font-weight="700" letter-spacing="1.4" fill="#946bbf">SCAN ME</text>
 <text x="296" y="567" font-size="23" font-weight="800" letter-spacing="-.9" fill="#392554">QR 찍고</text>
 <text x="296" y="600" font-size="23" font-weight="800" letter-spacing="-.9" fill="#7950bc">스탬프 받기</text>
 <text x="296" y="636" font-size="13" fill="#9884a8">카메라로 QR을 비춰주세요.</text>
 <path d="M334 666H295m11-9-11 9 11 9" stroke="#ab89d5" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
 <text x="300" y="765" text-anchor="middle" font-size="14" fill="#7e6598">노피 5마리를 만나 스탬프를 모아보세요.</text>
 <g transform="translate(254 790)">
 <circle cx="0" r="5" fill="#8960c9"/>
 <g fill="none" stroke="#bba1d8" stroke-width="1.4"><circle cx="23" r="4"/><circle cx="46" r="4"/><circle cx="69" r="4"/><circle cx="92" r="4"/></g>
 </g>
 </g></svg>`;
 fs.writeFileSync(path.join(out,'nopi-sticker-01-concept.svg'),svg);
 await sharp(Buffer.from(svg),{density:300}).withMetadata({density:300}).png().toFile(path.join(out,'nopi-sticker-01-concept.png'));
 await sharp(Buffer.from(svg)).resize(600,840).png().toFile(path.join(out,'nopi-sticker-01-preview.png'));
 console.log('One sticker concept: 100 × 140 mm, event QR, original mascot preserved.');
})().catch(e=>{console.error(e);process.exitCode=1;});
