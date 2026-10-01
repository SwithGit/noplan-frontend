const fs=require('node:fs');
const path=require('node:path');
const sharp=require('C:/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const out=__dirname;
const paths=name=>fs.readFileSync(path.join(out,`nopi-trace-${name}.svg`),'utf8').match(/<path\b[^>]*\/>/g).join('\n');
// Keep the directly traced lettering, face and motion marks. Repair the
// low-resolution outer contour as smooth editable curves at source coordinates.
const keep=new Set(['101,120','78,130','67,147','158,202','307,214','225.625,217.75','174,222','319,228']);
const lines=paths('outline').split('\n').filter(p=>{
 const t=p.match(/translate\(([^)]+)\)/)?.[1];
 return t && (Number(t.split(',')[1])<80 || keep.has(t));
}).join('\n').replaceAll('#000000','#252252');
const body=`<path d="M 75 190 C 80 182 86 179 95 179 C 95 166 107 155 123 151 C 119 133 135 109 160 102 C 160 91 176 85 192 89 C 214 89 227 104 223 121 C 222 129 219 138 216 147 C 222 133 231 122 245 123 C 263 122 276 136 279 151 C 283 165 276 178 268 185 C 276 190 282 198 279 206 C 280 221 284 237 279 250 C 291 255 299 266 299 278 C 300 294 287 305 274 305 C 268 310 261 310 256 307 C 244 313 224 313 210 308 C 193 303 176 301 157 299 C 140 299 127 295 115 290 C 102 284 95 272 93 259 C 78 257 66 250 60 239 C 48 221 53 201 65 195 C 75 187 89 190 99 199" fill="#fffdfa" stroke="#252252" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M 99 199 C 104 205 107 212 104 220 M 278 250 C 268 244 258 252 253 262 C 247 274 251 289 262 295 C 270 300 283 301 290 295" fill="none" stroke="#252252" stroke-width="3.2" stroke-linecap="round"/>`;
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="360" height="360" viewBox="0 0 360 360">
<title>노피 안녕 — 원본 윤곽 추적 벡터</title>
<defs><radialGradient id="cheek"><stop stop-color="#f9b9c4" stop-opacity=".92"/><stop offset=".73" stop-color="#fac3cc" stop-opacity=".8"/><stop offset="1" stop-color="#fbd8df" stop-opacity="0"/></radialGradient><linearGradient id="jelly" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#d5c6f0" stop-opacity=".8"/><stop offset="1" stop-color="#d1c1ed" stop-opacity=".3"/></linearGradient></defs>
<ellipse cx="178" cy="294" rx="108" ry="14" transform="rotate(7 178 294)" fill="url(#jelly)"/>
${body}
<ellipse cx="127" cy="221" rx="20" ry="16" transform="rotate(9 127 221)" fill="url(#cheek)"/>
<ellipse cx="240" cy="247" rx="20" ry="17" transform="rotate(16 240 247)" fill="url(#cheek)"/>
<ellipse cx="186" cy="238" rx="7" ry="5" fill="#f7bbc6"/>
${lines}</svg>`;
fs.writeFileSync(path.join(out,'nopi-hello-vector.svg'),svg);
sharp(Buffer.from(svg)).resize(1080,1080).png().toFile(path.join(out,'nopi-hello-vector-check.png'));
