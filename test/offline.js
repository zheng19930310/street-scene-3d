const puppeteer = require('puppeteer-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium',
    args: ['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-gpu-sandbox','--hide-scrollbars','--request-intercept-offline'], headless:'new' });
  const page = await browser.newPage();
  const reqs = [];
  page.on('request', r => { const u = r.url(); if (!u.startsWith('file://')) reqs.push(u); });
  page.on('pageerror', e => console.log('[pageerror]', e.message));
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto('file://' + require('path').resolve(__dirname,'../dist/street3d-v2.0.html'), { waitUntil: 'load', timeout: 60000 });
  await page.waitForFunction('window.__SCENE_READY__ === true', { timeout: 45000 });
  await sleep(4000);
  console.log('EXTERNAL REQUESTS:', reqs.length ? reqs.join(', ') : 'none (fully offline)');
  console.log('POP rows test:', JSON.stringify(await page.evaluate(() => {
    const s = window.__pickAt(144, 200); return s ? s.id : null; })));
  await browser.close();
})();
