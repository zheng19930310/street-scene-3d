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
  await page.click('#m2d'); await sleep(1500);
  const probe = await page.evaluate(() => {
    const sc = window.__scene, cam = window.__cam;
    const g = sc.getObjectByName('建筑层');
    const o = g.children.find(c => c.userData.info && c.userData.info.id === 'BLD-02');
    const v = o.position.clone().project(cam);
    const x = (v.x*.5+.5)*innerWidth, y = (-v.y*.5+.5)*innerHeight;
    return { screen: [Math.round(x), Math.round(y)], atPixel: window.__pickAt(Math.round(x), Math.round(y)),
      camPos: cam.position.toArray().map(n=>+n.toFixed(1)), up: cam.up.toArray().map(n=>+n.toFixed(2)),
      zoom: +cam.zoom.toFixed(2), frustum: [cam.left, cam.right, cam.top, cam.bottom].map(n=>+n.toFixed(1)),
      activeIsCam: cam === (window.__cam) };
  });
  console.log(JSON.stringify(probe, null, 1));
  await browser.close();
})();
