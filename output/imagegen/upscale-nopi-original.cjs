const fs=require('node:fs');
const path=require('node:path');
const sharp=require('C:/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const out=__dirname;
(async()=>{
 const source=path.join(out,'nopi-hello-trace-source.png');
 // Work on source pixels. No tracing, generated details or shape replacement.
 const restored=await sharp(source).sharpen({sigma:0.8,m1:0.25,m2:2.0,x1:2,y2:8,y3:8}).png().toBuffer();
 const upscaled=await sharp(restored).resize(1440,1440,{kernel:'lanczos3'})
  .sharpen({sigma:0.65,m1:0,m2:0.65,x1:3,y2:3,y3:3})
  .withMetadata({density:300}).png().toBuffer();
 fs.writeFileSync(path.join(out,'nopi-hello-upscaled-4x.png'),upscaled);
 const before=await sharp(source).resize(720,720,{kernel:'lanczos3'}).flatten({background:'#faf8ff'}).png().toBuffer();
 const after=await sharp(upscaled).resize(720,720,{kernel:'lanczos3'}).flatten({background:'#faf8ff'}).png().toBuffer();
 const labels=Buffer.from('<svg width="1440" height="56"><rect width="1440" height="56" fill="#fff"/><g font-family="Arial" font-size="23" fill="#28204f"><text x="26" y="36">BEFORE</text><text x="746" y="36">4x UPSCALE + LIGHT SHARPENING</text></g></svg>');
 await sharp({create:{width:1440,height:776,channels:4,background:'#fff'}})
  .composite([{input:labels,left:0,top:0},{input:before,left:0,top:56},{input:after,left:720,top:56}])
  .png().toFile(path.join(out,'nopi-upscale-comparison.png'));
 const result=await sharp(upscaled).metadata();
 console.log(JSON.stringify({width:result.width,height:result.height,alpha:result.hasAlpha,density:result.density}));
})().catch(e=>{console.error(e);process.exitCode=1;});
