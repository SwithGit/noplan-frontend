// Rebuild web assets from the supplied designer PNGs. No redraw or generative changes.
// Usage: NODE_PATH=<directory containing sharp> node scripts/prepareStampEventAssets.cjs <source directory>
const path = require('node:path');
const fs = require('node:fs/promises');
const sharp = require('sharp');
async function main() {
  const source = process.argv[2];
  if (!source) throw new Error('Provide the designer asset directory.');
  const target = path.resolve(__dirname, '../public/images/stamp-event');
  await fs.mkdir(target, { recursive: true });
  await sharp(path.join(source, '(2)_event_main.png')).extract({ left: 537, top: 195, width: 390, height: 424 }).webp({ quality: 92 }).toFile(path.join(target, 'hero.webp'));
  await sharp(path.join(source, '(4)_event_stamp_1.png')).extract({ left: 535, top: 206, width: 368, height: 351 }).webp({ quality: 92 }).toFile(path.join(target, 'hello.webp'));
  for (let id = 1; id <= 5; id++) {
    await sharp(path.join(source, '스탬프 아이콘', `Nopi_stamp_${id}.png`)).resize({ width: 360 }).webp({ quality: 92 }).toFile(path.join(target, `stamp-${id}.webp`));
    // Keep only the illustration; all surrounding text and controls are accessible HTML.
    await sharp(path.join(source, '참여방법 모달창', `step-${id}-modal.png`))
      .extract({ left: 31, top: 270, width: 760, height: id === 4 ? 480 : 460 })
      .webp({ quality: 90 }).toFile(path.join(target, `guide-${id}.webp`));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
