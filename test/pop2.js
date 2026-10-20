const path = require('path');
const OUTDIR = path.resolve(__dirname, '../screenshots/_out');
require('fs').mkdirSync(OUTDIR, { recursive: true });
const puppeteer = require('puppeteer-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/chromium',
    args: ['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-gpu-sandbox','--hide-scrollbars'], headless:'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1100, height: 900, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.log('[pageerror]', e.message));
  await page.goto('file://' + require('path').resolve(__dirname,'../dist/street3d-v2.0.html'), { waitUntil:'load' });
  await page.waitForFunction('window.__SCENE_READY__ === true', { timeout: 45000 });
  await sleep(4000);
  // add a route point, then click it
  await page.mouse.move(500, 700); await page.mouse.down(); await sleep(800); await page.mouse.up(); await sleep(300);
  const mp = await page.evaluate(() => {
    for (let y = 300; y < 800; y += 8) for (let x = 200; x < 900; x += 8) {
      const i = window.__pickAt(x, y); if (i && i.id.startsWith('RTE')) return { x, y, id: i.id };
    } return null; });
  if (mp) { await page.mouse.click(mp.x, mp.y); await sleep(400); }
  console.log('MARKER POP:', JSON.stringify(mp), await page.evaluate(() => ({
    show: document.getElementById('pop').classList.contains('show'),
    nm: document.querySelector('#pop .nm').textContent, id: document.querySelector('#pop .id').textContent,
    rows: [...document.querySelectorAll('#pop tr')].map(t => t.children[0].textContent + '=' + t.children[1].textContent) })));
  // click dummy
  const dp = await page.evaluate(() => {
    for (let y = 300; y < 850; y += 6) for (let x = 100; x < 1000; x += 6) {
      const i = window.__pickAt(x, y); if (i && i.id === 'PER-01') return { x, y }; } return null; });
  if (dp) { await page.mouse.click(dp.x, dp.y); await sleep(400); }
  console.log('DUMMY POP:', JSON.stringify(dp), await page.evaluate(() => ({
    nm: document.querySelector('#pop .nm').textContent, id: document.querySelector('#pop .id').textContent,
    rows: [...document.querySelectorAll('#pop tr')].map(t => t.children[0].textContent + '=' + t.children[1].textContent) })));
  // live coords update while selected: drive dummy forward via sim
  const live = await page.evaluate(() => {
    const before = [...document.querySelectorAll('#pop tr')].map(t => t.textContent).join('|');
    window.__dummyStep(150, { w: true }); return { before }; });
  await sleep(400);
  console.log('AFTER MOVE:', await page.evaluate(() => [...document.querySelectorAll('#pop tr')].map(t => t.children[0].textContent + '=' + t.children[1].textContent)));
  // click a moving car
  const cp = await page.evaluate(() => {
    for (let y = 300; y < 850; y += 6) for (let x = 60; x < 1040; x += 6) {
      const i = window.__pickAt(x, y); if (i && i.id.startsWith('VEH')) return { x, y, id: i.id, status: i.status }; } return null; });
  if (cp) { await page.mouse.click(cp.x, cp.y); await sleep(400); }
  const car1 = await page.evaluate(() => [...document.querySelectorAll('#pop tr')].map(t => t.children[0].textContent + '=' + t.children[1].textContent));
  await sleep(2500);
  const car2 = await page.evaluate(() => [...document.querySelectorAll('#pop tr')].map(t => t.children[0].textContent + '=' + t.children[1].textContent));
  console.log('CAR POP:', JSON.stringify(cp)); console.log(' t0:', car1.join(' ')); console.log(' t1:', car2.join(' '));
  await page.screenshot({ path: path.join(OUTDIR,'carpop.png') });
  await browser.close();
})();
