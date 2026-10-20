const path = require('path');
const OUTDIR = path.resolve(__dirname, '../screenshots/_out');
require('fs').mkdirSync(OUTDIR, { recursive: true });
const puppeteer = require('puppeteer-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium',
    args: ['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-gpu-sandbox','--hide-scrollbars'], headless:'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 412, height: 860, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  page.on('pageerror', e => console.log('[pageerror]', e.message));
  await page.goto('file://' + require('path').resolve(__dirname,'../dist/street3d-v2.0.html'), { waitUntil:'load' });
  await page.waitForFunction('window.__SCENE_READY__ === true', { timeout: 45000 });
  await sleep(4500);
  await page.click('#stickBtn'); await sleep(600);
  await page.screenshot({ path: path.join(OUTDIR,'mob_stick.png') });
  await page.click('#m2d'); await sleep(1500);
  await page.screenshot({ path: path.join(OUTDIR,'mob_2d.png') });
  const overlap = await page.evaluate(() => {
    const r = id => { const e = document.getElementById(id); const b = e.getBoundingClientRect(); return { id, x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height), vis: getComputedStyle(e).display !== 'none' }; };
    return ['m2d','stickBtn','rotR','panel'].map(r);
  });
  console.log(JSON.stringify(overlap));
  await browser.close();
})();
