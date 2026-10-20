const path = require('path');
const OUTDIR = path.resolve(__dirname, '../screenshots/_out');
require('fs').mkdirSync(OUTDIR, { recursive: true });
const puppeteer = require('puppeteer-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium',
    args: ['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-gpu-sandbox','--hide-scrollbars'], headless:'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 800, height: 600, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.log('[pageerror]', e.message));
  await page.goto('file://' + require('path').resolve(__dirname,'../dist/street3d-v2.0.html'), { waitUntil:'load' });
  await page.waitForFunction('window.__SCENE_READY__ === true', { timeout: 45000 });
  await sleep(4000);
  await page.evaluate(() => {
    const o = window.__scene.getObjectByName('人物层').children[0];
    o.position.set(4, 0, 14);
    window.__dummyStep(60, { w: true });
    window.__dummyStep(1, { d: false, w: false });
    const cam = window.__cam;
    cam.position.set(14, 9, 26); cam.up.set(0, 1, 0);
    cam.lookAt(4, 1, 14);
    cam.zoom = 4.2; cam.updateProjectionMatrix();
  });
  await sleep(1500);
  await page.screenshot({ path: path.join(OUTDIR,'dummy.png') });
  console.log('dummy pos', await page.evaluate(() => window.__scene.getObjectByName('人物层').children[0].position.toArray()));
  await browser.close();
})();
