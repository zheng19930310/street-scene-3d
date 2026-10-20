const path = require('path');
const OUTDIR = path.resolve(__dirname, '../screenshots/_out');
require('fs').mkdirSync(OUTDIR, { recursive: true });
const puppeteer = require('puppeteer-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium',
    args: ['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-gpu-sandbox','--hide-scrollbars'], headless:'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 414, height: 860, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  page.on('pageerror', e => console.log('[pageerror]', e.message));
  await page.goto('file://' + require('path').resolve(__dirname,'../dist/street3d-v2.0.html'), { waitUntil:'load' });
  await page.waitForFunction('window.__SCENE_READY__ === true', { timeout: 45000 });
  await sleep(3500);
  await page.click('#m2d'); await sleep(900);
  const before = await page.evaluate(() => { const c = window.__cam; return { zoom:+c.zoom.toFixed(2), up:[+c.up.x.toFixed(2),+c.up.z.toFixed(2)] }; });
  // synthetic 2-finger pinch + rotate in 2D
  await page.evaluate(async () => {
    const cv = document.querySelector('canvas');
    const mk = (type, id, x, y) => cv.dispatchEvent(new PointerEvent(type, { pointerId: id, clientX: x, clientY: y,
      bubbles: true, cancelable: true, isPrimary: id === 1, pointerType: 'touch', button: 0 }));
    const wait = ms => new Promise(r => setTimeout(r, ms));
    mk('pointerdown', 1, 150, 400); mk('pointerdown', 2, 260, 400);
    for (let i = 0; i < 10; i++) { mk('pointermove', 1, 150 - i * 6, 400 + i * 4); mk('pointermove', 2, 260 + i * 6, 400 - i * 4); await wait(30); }
    for (let i = 0; i < 8; i++) { mk('pointermove', 1, 90 - i * 5, 440 + i * 12); mk('pointermove', 2, 320 + i * 5, 360 - i * 12); await wait(30); }
    mk('pointerup', 1, 50, 490); mk('pointerup', 2, 360, 265);
  });
  await sleep(700);
  const after = await page.evaluate(() => { const c = window.__cam; return { zoom:+c.zoom.toFixed(2), up:[+c.up.x.toFixed(2),+c.up.z.toFixed(2)] }; });
  console.log('2D pinch+rotate:', JSON.stringify(before), '->', JSON.stringify(after));
  // long press (touch) in 2D adds a marker
  await page.evaluate(async () => {
    const cv = document.querySelector('canvas');
    const mk = t => cv.dispatchEvent(new PointerEvent(t, { pointerId: 7, clientX: 200, clientY: 300, bubbles:true, cancelable:true, pointerType:'touch', button:0 }));
    mk('pointerdown'); await new Promise(r => setTimeout(r, 900)); mk('pointerup');
  });
  await sleep(500);
  console.log('touch longpress route:', await page.evaluate(() => document.getElementById('routelen').textContent));
  await page.screenshot({ path: path.join(OUTDIR,'mobile2d.png') });
  // back to 3D on mobile: joystick drag (keep pointer down while sim-stepping)
  await page.click('#m3d'); await sleep(2000);
  await page.click('#stickBtn'); await sleep(400);
  await page.evaluate(async () => {
    const st = document.getElementById('stick');
    const mk = (t, x, y) => st.dispatchEvent(new PointerEvent(t, { pointerId: 9, clientX: x, clientY: y, bubbles:true, cancelable:true, pointerType:'touch', button:0 }));
    const b = st.getBoundingClientRect(), cx = b.left + b.width/2, cy = b.top + b.height/2;
    mk('pointerdown', cx, cy);
    for (let i = 0; i < 6; i++) { mk('pointermove', cx, cy - 40); await new Promise(r => setTimeout(r, 40)); }
    window.__stickUp = () => mk('pointerup', cx, cy - 40);
  });
  const moved = await page.evaluate(() => {
    const o = window.__scene.getObjectByName('人物层').children[0];
    const p0 = o.position.toArray().map(v => +v.toFixed(2));
    const p1 = window.__dummyStep(180, {});           // stick still held
    const v = window.__stickV ? window.__stickV() : null;
    window.__stickUp();
    return { from: p0, to: p1, stick: v };
  });
  console.log('stick drive:', JSON.stringify(moved));
  await page.screenshot({ path: path.join(OUTDIR,'mobile3d.png') });
  await browser.close();
})();
