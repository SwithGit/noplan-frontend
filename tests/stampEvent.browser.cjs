// Isolated browser smoke test. Requires local Vite on :5181 with VITE_APP_API_URL=http://127.0.0.1:3189.
// No production database or external APIs are contacted.
const path = require('node:path'), fs = require('node:fs/promises'), assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const backend = path.resolve(process.env.NOPLAN_BACKEND_ROOT || 'D:/Backend/NoPlan');
const back = createRequire(path.join(backend, 'package.json'));
const express = back('express'), cors = back('cors');
const { chromium } = require('playwright');
const { QRCodeWriter, BarcodeFormat } = require('@zxing/library');
const { createEventRouter } = back('./routes/stampEvent/router');
const { createEventRepository } = back('./routes/stampEvent/repository');
const { stampEventMemoryDatabase } = back('./tests/helpers/stampEventMemoryDatabase.cjs');
const { attachAuth, setSessionCookie } = back('./middleware/auth');
const output = path.resolve('tmp/stamp-event-qa');

async function main() {
  const app = express();
  app.use(cors({ origin: 'http://127.0.0.1:5181', credentials: true }));
  app.use(express.json()); app.use(attachAuth);
  app.get('/api/auth/session', (req, res) => res.json(req.auth ? { success: true, user: { id: req.auth.userId, nickname: '테스터' } } : { success: false }));
  app.post('/api/auth/login', (req, res) => { const user = { id: 'smoke-user', nickname: '테스터' }; setSessionCookie(res, user); res.json({ success: true, user }); });
  app.use('/api/stamp-event', createEventRouter(createEventRepository(stampEventMemoryDatabase())));
  app.use((_req, res) => res.json({ success: true, events: [], sources: [], trips: [], favorites: [], items: [], places: [] }));
  const server = app.listen(3189, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  await fs.mkdir(output, { recursive: true });
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      return ['127.0.0.1', 'localhost'].includes(url.hostname) || ['data:', 'blob:'].includes(url.protocol) ? route.continue() : route.abort();
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const screenshot = async name => { await page.screenshot({ path: path.join(output, `${name}.png`), fullPage: true }); };
    const ready = async text => { await page.getByText(text, { exact: true }).waitFor(); await page.locator('[role="status"]').filter({ hasText: '확인하고' }).waitFor({ state: 'hidden' }); };
    await page.goto('http://127.0.0.1:5181/event');
    await screenshot('01-intro');
    await page.getByRole('button', { name: /스탬프 시작하기/ }).click();
    await page.getByRole('button', { name: '비회원으로 시작하기' }).click();
    await ready('0 / 5'); await screenshot('02-empty');
    await page.goto('http://127.0.0.1:5181/event/1');
    await ready('1 / 5'); await screenshot('03-one-stamp');
    await page.reload(); await ready('1 / 5');
    await page.goto('http://127.0.0.1:5181/event/1');
    await ready('1 / 5'); await page.getByText(/이미 만난 노피/).waitFor();
    await page.getByRole('button', { name: /참여 방법 보기/ }).click();
    for (let i = 1; i <= 5; i++) {
      await page.getByText(`STEP 0${i}`, { exact: true }).waitFor();
      await screenshot(`guide-${i}`);
      await page.getByRole('button', { name: i === 5 ? '확인' : '다음 →', exact: true }).click();
    }
    // Exercise permission-denied fallback and the actual ZXing video decoding path.
    await page.evaluate(() => { navigator.mediaDevices.getUserMedia = async () => { throw new DOMException('denied', 'NotAllowedError'); }; });
    await page.getByRole('button', { name: /다음 노피 QR 찍기/ }).click();
    await page.getByText(/카메라를 열지 못했어요/).waitFor();
    await page.getByRole('button', { name: '스탬프 카드로 돌아가기' }).click();
    const matrix = new QRCodeWriter().encode('https://www.noplan.live/event/2', BarcodeFormat.QR_CODE, 360, 360, new Map());
    const pixels = Array.from({ length: 360 }, (_, y) => Array.from({ length: 360 }, (_, x) => matrix.get(x, y)));
    await page.evaluate(pixels => {
      navigator.mediaDevices.getUserMedia = async () => {
        const canvas = document.createElement('canvas'); canvas.width = canvas.height = 360;
        const ctx = canvas.getContext('2d');
        const paint = () => { for (let y = 0; y < 360; y++) for (let x = 0; x < 360; x++) { ctx.fillStyle = pixels[y][x] ? '#000' : '#fff'; ctx.fillRect(x, y, 1, 1); } };
        paint(); const stream = canvas.captureStream(10);
        window.__qrTestStream = stream;
        const timer = setInterval(() => { if (stream.getVideoTracks()[0].readyState === 'ended') clearInterval(timer); else paint(); }, 100);
        return stream;
      };
    }, pixels);
    await page.getByRole('button', { name: /다음 노피 QR 찍기/ }).click();
    await ready('2 / 5');
    assert.equal(await page.evaluate(() => window.__qrTestStream.getVideoTracks()[0].readyState), 'ended');
    await page.getByRole('button', { name: '로그인하고 이어가기 →' }).click();
    await page.locator('input[autocomplete="username"]').fill('smoke-user');
    await page.locator('input[autocomplete="current-password"]').fill('smoke-password');
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/event/stamps'); await ready('2 / 5');
    for (const id of [4, 2, 5, 3]) { await page.goto(`http://127.0.0.1:5181/event/${id}`); await page.waitForURL('**/event/stamps'); }
    await ready('5 / 5'); await screenshot('04-complete');
    await page.getByRole('button', { name: '수령 완료', exact: true }).click();
    await page.getByText('경품 수령을 완료했어요!').waitFor(); await screenshot('06-redeemed');
    assert.equal(await page.getByRole('button', { name: '수령 완료', exact: true }).count(), 0);
    await page.reload();
    await page.getByText('경품 수령을 완료했어요!').waitFor();
    for (const width of [320, 390, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      assert.equal(overflow, false, `Horizontal overflow at ${width}px`);
    }
    await page.goto('http://127.0.0.1:5181/event/6');
    await page.getByText('노피 QR을 다시 확인해 주세요').waitFor();
    const failure = await browser.newContext({ viewport: { width: 320, height: 740 } });
    await failure.route('**/*', route => ['127.0.0.1', 'localhost'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort());
    const failPage = await failure.newPage();
    await failPage.route('**/api/stamp-event/stamps/3', route => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: '테스트 통신 실패' }) }));
    await failPage.goto('http://127.0.0.1:5181/event/3');
    await failPage.getByText('테스트 통신 실패').waitFor();
    assert.ok(failPage.url().endsWith('/event/3'));
    await failPage.unroute('**/api/stamp-event/stamps/3');
    await failPage.getByRole('button', { name: '다시 시도하기' }).click();
    await failPage.getByText('1 / 5', { exact: true }).waitFor();
    assert.equal(await failPage.locator('.ne-stamp.collected strong').innerText(), '노피 3');
    assert.equal(await failPage.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    for (const id of [1, 2, 4, 5]) { await failPage.goto(`http://127.0.0.1:5181/event/${id}`); await failPage.waitForURL('**/event/stamps'); }
    await failPage.getByRole('button', { name: '수령 완료', exact: true }).click();
    await failPage.getByText('경품 수령을 완료했어요!').waitFor();
    await failPage.reload(); await failPage.getByText('경품 수령을 완료했어요!').waitFor();
    await failure.close();
    assert.deepEqual(errors, []);
    console.log('PASS: guest start, QR collection/repeat/reload, five guide steps, camera denial/video QR decode/stream cleanup, login return/merge, completion, one-button redemption/reload, responsive overflow, invalid QR, failed scan retry/guest isolation.');
  } finally { await browser.close(); server.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
