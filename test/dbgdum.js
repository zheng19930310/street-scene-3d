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
  await sleep(3500);
  const t = await page.evaluate(() => {
    const o = window.__scene.getObjectByName('人物层').children[0];
    const out = {};
    out.start = o.position.toArray().map(v => +v.toFixed(2));
    out.forward2s = window.__dummyStep(120, { w: true });
    out.clearKeys = window.__dummyStep(1, { w: false, s: false, a: false, d: false });
    out.right1s = window.__dummyStep(60, { d: true });
    out.back1s = window.__dummyStep(60, { d: false, w: false });
    out.run = window.__dummyStep(120, { s: true, shift: true });
    return out;
  });
  console.log(JSON.stringify(t));
  // collision test: step into the glass office (BLD-11 x81 z20 w38 d24) from x40
  const c = await page.evaluate(() => {
    const o = window.__scene.getObjectByName('人物层').children[0];
    o.position.set(50, 0, 36);
    let last = null;
    for (let i = 0; i < 200; i++) last = window.__dummyStep(1, { d: true });
    return { stopped_at: last, building_face: 81 - 38 / 2 };
  });
  console.log('COLLISION', JSON.stringify(c));
  await browser.close();
})();
