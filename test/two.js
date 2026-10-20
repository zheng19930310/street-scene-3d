const path = require('path');
const OUTDIR = path.resolve(__dirname, '../screenshots/_out');
require('fs').mkdirSync(OUTDIR, { recursive: true });
const puppeteer = require('puppeteer-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium',
    args: ['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-gpu-sandbox','--hide-scrollbars'], headless:'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 900, height: 1000, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.log('[pageerror]', e.message));
  await page.goto('file://' + require('path').resolve(__dirname,'../dist/street3d-v2.0.html'), { waitUntil:'load' });
  await page.waitForFunction('window.__SCENE_READY__ === true', { timeout: 45000 });
  await sleep(4000);
  await page.click('#m2d'); await sleep(1200);
  await page.screenshot({ path: path.join(OUTDIR,'2d_overview.png') });
  const sp = await page.evaluate(() => {
    for (const [x, y] of [[620, 200], [300, 760], [120, 400], [820, 500]]) {
      const i = window.__pickAt(x, y);
      if (i && i.id.startsWith('BLD')) return { x, y, id: i.id, name: i.name };
    }
    return null;
  });
  if (sp) { await page.mouse.click(sp.x, sp.y); await sleep(500); }
  console.log('2D PICK:', JSON.stringify(sp), await page.evaluate(() => ({
    show: document.getElementById('pop').classList.contains('show'),
    nm: document.querySelector('#pop .nm').textContent, id: document.querySelector('#pop .id').textContent })));
  await page.screenshot({ path: path.join(OUTDIR,'2d_pick2.png') });
  // 3D oblique with dummy + route for a hero shot
  await page.click('#m3d'); await sleep(2600);
  await page.click('#stickBtn'); await sleep(200);
  await page.evaluate(() => window.__dummyStep(240, { w: true }));
  await sleep(800);
  await page.screenshot({ path: path.join(OUTDIR,'3d_dummy.png') });
  await browser.close();
})();
