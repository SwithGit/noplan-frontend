const fs = require('node:fs');
const path = require('node:path');
const sharp = require('C:/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const out=__dirname;
const data = b => `data:image/png;base64,${b.toString('base64')}`;
(async()=>{
 const logo=await sharp(path.join(out,'noplan-logo-transparent.png')).trim({threshold:0}).png().toBuffer();
 const logoMascot=await sharp(path.resolve(out,'../../public/images/nopi-brand.png')).trim({threshold:0}).png().toBuffer();
 const hero=await sharp(path.join(out,'nopi-hello-generated-v1.png'))
  .trim({threshold:0}).png().toBuffer();
 const qr=JSON.parse(fs.readFileSync(path.join(out,'noplan-cover-qr.json'),'utf8'));
 const qrCells=qr.modules.flatMap((row,y)=>row.flatMap((on,x)=>on?[`<rect x="${x+4}" y="${y+4}" width="1" height="1"/>`]:[])).join('');
 const qrSize=qr.modules.length+8;
 const city=`<g aria-label="연보라색 서울 도시 실루엣">
  <path d="M-10 671 C22 650 31 658 54 637 C76 610 96 613 117 638 C134 656 149 640 173 649 C206 659 214 650 239 663 L239 703 H-10Z" fill="#a084e5" opacity=".16"/>
  <g fill="#9674dd" opacity=".22">
   <path d="M0 681V620H18V600H42V647H53V624H73V646H91V612H106V644H130V623H147V646H167V607H187V647H201V629H219V651H238V619H258V646H279V632H300V682Z"/>
   <path d="M321 680V641H343V614H360V635H373V623H391V646H409V610H427V635H441V597H458V638H477V619H493V643H510V607H531V635H549V616H567V647H584V625H610V686Z"/>
  </g>
  <g fill="#9170d5" opacity=".42">
   <path d="M85 643L88 574H94L97 643Z"/>
   <rect x="90" y="505" width="2" height="39" rx="1"/>
   <rect x="88" y="539" width="6" height="14" rx="2"/>
   <path d="M78 555L82 551H100L104 555V568L99 573H83L78 568Z"/>
   <rect x="81" y="546" width="20" height="3" rx="1.5"/>
   <path d="M511 651L519 553Q523 533 527 526Q531 534 534 552L542 651Z"/>
  </g>
  <g fill="#9472d9" opacity=".30">
   <path d="M-4 687V656H19V638H44V687Z M52 687V655H73V648H98V687Z M104 687V665H123V633H148V687Z M447 687V652H468V636H488V687Z M550 687V646H576V633H593V652H610V687Z"/>
   <path d="M0 683H600V690H0Z"/>
   <path d="M0 703H600V709H0Z"/>
   <path d="M12 707H21V733H12Z M79 707H88V738H79Z M146 707H155V743H146Z M447 707H456V739H447Z M514 707H523V735H514Z M581 707H590V729H581Z"/>
  </g>
  <g stroke="#8e6acf" fill="none" opacity=".42">
   <path d="M-30 703Q15 651 61 703M61 703Q106 651 152 703M445 703Q490 651 536 703M536 703Q581 651 626 703" stroke-width="3"/>
   <path d="M7 678V701M26 680V701M44 689V701M83 684V701M102 678V701M122 682V701M139 691V701M464 686V701M484 679V701M504 681V701M523 690V701M555 686V701M575 679V701M595 683V701" stroke-width="1.2"/>
  </g>
  <g fill="#fff" opacity=".8">
   <path d="M85 557H88V566H85Z M90 557H93V566H90Z M95 557H98V566H95Z"/>
   <path d="M525 549H527V640H525Z"/>
   <path d="M25 648H29V654H25Z M34 648H38V654H34Z M25 660H29V666H25Z M34 660H38V666H34Z M558 656H562V662H558Z M567 656H571V662H567Z M558 670H562V676H558Z M567 670H571V676H567Z"/>
  </g>
  <g stroke="#a084da" opacity=".25" fill="none" stroke-linecap="round"><path d="M17 725H66M486 724H564M23 735H83M523 737H600" stroke-width="1.5"/></g>
 </g>`;
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="1273" viewBox="0 0 600 1273">
 <defs>
  <clipPath id="wordmarkOnly"><rect x="112" y="44" width="140" height="54"/></clipPath>
  <linearGradient id="paper" x1="0" y1="0" x2="0.2" y2="1"><stop stop-color="#fff"/><stop offset=".38" stop-color="#fff"/><stop offset=".72" stop-color="#f7f3ff"/><stop offset="1" stop-color="#eee7ff"/></linearGradient>
  <linearGradient id="jelly" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#d9ccff" stop-opacity=".1"/><stop offset=".5" stop-color="#c9b8ff" stop-opacity=".6"/><stop offset="1" stop-color="#b29aef" stop-opacity=".14"/></linearGradient>
 </defs>
 <rect width="600" height="1273" fill="url(#paper)"/>
 <g font-family="Noto Sans KR, Malgun Gothic, sans-serif">
 <image href="${data(logo)}" x="52" y="44" width="188" height="54" preserveAspectRatio="xMinYMid meet" clip-path="url(#wordmarkOnly)"/>
 <image href="${data(logoMascot)}" x="52" y="47" width="56" height="48" preserveAspectRatio="xMidYMid meet"/>
 <text x="55" y="171" fill="#8061ca" font-size="14" font-weight="500" letter-spacing="1.3">일상에서 여행까지</text>
 <g fill="#21194e" font-size="43" font-weight="700" letter-spacing="-2">
  <text x="52" y="231">고민은 잠시,</text><text x="52" y="287">발길은 가볍게.</text>
 </g>
 <text x="55" y="332" fill="#82758f" font-size="15" letter-spacing="-.4">취향에 맞는 코스부터 문화·행사까지</text>
 ${city}
 <path d="M-70 818 C77 685 177 808 285 797 S462 734 673 767" fill="none" stroke="url(#jelly)" stroke-width="57" stroke-linecap="round"/>
 <path d="M-70 818 C77 685 177 808 285 797 S462 734 673 767" fill="none" stroke="#b9a2f0" stroke-width="1.5" opacity=".8"/>
 <ellipse cx="299" cy="740" rx="194" ry="26" fill="#c1aff1" opacity=".1"/>
 <image href="${data(hero)}" x="90" y="395" width="420" height="354" preserveAspectRatio="xMidYMid meet"/>
 <g transform="translate(479 405)" fill="none" stroke="#ad91e7" stroke-width="1.6" stroke-linecap="round"><path d="M0 12V-2M-7 5H7"/><path d="M23 33V24M18.5 28.5H27.5"/></g>
 <g transform="translate(79 505)" fill="none" stroke="#b09bdd" stroke-width="1.5"><path d="M0 0l-6-8M-8 11l-10-2"/></g>
 <circle cx="93" cy="756" r="5" fill="#9370db" stroke="#fff" stroke-width="3"/>
 <circle cx="453" cy="766" r="5" fill="#9370db" stroke="#fff" stroke-width="3"/>
 <text x="300" y="856" text-anchor="middle" font-size="20" fill="#5b4585" font-weight="600" letter-spacing="-.7">오늘, 어디로 떠나볼까요?</text>
 <g fill="#fff" fill-opacity=".75" stroke="#e4daf8" stroke-width="1"><rect x="115" y="883" width="130" height="37" rx="18.5"/><rect x="255" y="883" width="80" height="37" rx="18.5"/><rect x="345" y="883" width="140" height="37" rx="18.5"/></g>
 <g fill="#8c76b4" font-size="13" text-anchor="middle"><text x="180" y="907">맛집 · 카페</text><text x="295" y="907">산책</text><text x="415" y="907">문화 · 행사</text></g>
 <rect x="44" y="965" width="512" height="169" rx="25" fill="#fff" fill-opacity=".88" stroke="#e7def8"/>
 <a href="https://noplan.live"><svg x="62" y="988" width="122" height="122" viewBox="0 0 ${qrSize} ${qrSize}" shape-rendering="crispEdges"><rect width="${qrSize}" height="${qrSize}" fill="white"/><g fill="#251b43">${qrCells}</g></svg></a>
 <text x="204" y="1028" fill="#332351" font-size="18" font-weight="700" letter-spacing="-.5">내 취향의 코스 만나기</text>
 <text x="204" y="1058" fill="#8a7b9d" font-size="13">QR을 스캔하고 노플랜에서 시작해요.</text>
 <text x="204" y="1091" fill="#8761d3" font-size="13" letter-spacing="1">noplan.live</text>
 <text x="545" y="1181" text-anchor="end" fill="#9a86b6" font-size="12">펼치면, 여행이 시작돼요</text>
 <text x="481" y="1218" text-anchor="end" fill="#7250c5" font-size="21" font-weight="700" letter-spacing="-.6">코스 찾아보기</text>
 <path d="M501 1210H547M537 1200l10 10-10 10" fill="none" stroke="#7954cb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
 </g></svg>`;
 fs.writeFileSync(path.join(out,'noplan-expo-cover-v7-city.svg'),svg);
 await sharp(Buffer.from(svg)).resize(1169,2480).withMetadata({density:300}).png().toFile(path.join(out,'noplan-expo-cover-v7-city.png'));
 await sharp(Buffer.from(svg)).png().toFile(path.join(out,'noplan-expo-cover-v7-city-preview.png'));
 console.log('Saved cover PNG (1169×2480, 300 dpi), preview and SVG. QR: '+qr.url);
})().catch(e=>{console.error(e);process.exitCode=1;});
