const fs = require('node:fs');
const path = require('node:path');
const sharp = require('C:/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const out = __dirname;
const originals = 'E:/카카오톡 받은 파일/HNCSOFT_서류/프로젝트 관리/2026/노플랜/노피/nopi_32';
const clean = 'C:/Users/user/.codex/generated_images/01a0b34b-3f5a-7fc0-8b64-8c61352d5808/exec-5e9def3e-1ef1-458f-bfc6-35fd21bcb74c.png';
const uri = buffer => `data:image/png;base64,${buffer.toString('base64')}`;
(async () => {
  // Replace only the old mascot/logo regions with the cleaned background.
  // All other pixels remain from the approved previous layout.
  const regions = [
    {left:48, top:3, width:184, height:58},
    {left:8, top:896, width:153, height:139},
    {left:834, top:350, width:148, height:170},
    {left:691, top:344, width:50, height:49},
    {left:1236, top:933, width:137, height:115},
  ];
  const overlays = [];
  for (const r of regions) overlays.push({input:await sharp(clean).extract(r).png().toBuffer(),left:r.left,top:r.top});
  const background = await sharp(path.join(out,'noplan-expo-inside-v2.png')).composite(overlays).png().toBuffer();
  const placements = [
    {name:'Original combined logo', file:path.join(out,'noplan-logo-transparent.png'),x:58,y:9,w:164,h:48},
    {name:'Original nopi_29 departure', file:path.join(originals,'nopi_29.png'),x:25,y:901,w:124,h:139},
    {name:'Original nopi_30 arrival', file:path.join(originals,'nopi_30.png'),x:861,y:368,w:110,h:129},
    {name:'Original nopi_24 events', file:path.join(originals,'nopi_24.png'),x:1249,y:936,w:108,h:106},
    {name:'Original moving marker', file:path.resolve(out,'../../src/assets/map/nopi-stop.png'),x:699,y:351,w:30,h:32},
  ];
  const elements = [`<image width="1491" height="1055" href="${uri(background)}"/>`];
  for (const p of placements) {
    // Only remove transparent exterior padding. No generation or repainting.
    const png = await sharp(p.file).trim({threshold:0}).png().toBuffer();
    elements.push(`<image aria-label="${p.name}" x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" preserveAspectRatio="xMidYMid meet" href="${uri(png)}"/>`);
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1491" height="1055" viewBox="0 0 1491 1055">${elements.join('\n')}</svg>`;
  fs.writeFileSync(path.join(out,'noplan-expo-inside-original-assets.svg'),svg);
  await sharp(Buffer.from(svg)).png().toFile(path.join(out,'noplan-expo-inside-original-assets.png'));
  console.log('Saved PNG and SVG with original mascot PNG layers.');
})().catch(e=>{console.error(e);process.exitCode=1;});
