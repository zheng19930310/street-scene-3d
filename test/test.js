const OUTDIR = require('path').resolve(__dirname, '../screenshots/_out');
require('fs').mkdirSync(OUTDIR, { recursive: true });
const puppeteer = require('puppeteer-core');
const path = require('path');

(async () => {
  const shots = process.argv.slice(2);
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/chromium',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader',
           '--enable-unsafe-swiftshader', '--disable-gpu-sandbox', '--hide-scrollbars'],
    headless: 'new',
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });
  const logs = [];
  page.on('console', m => logs.push('[' + m.type() + '] ' + m.text()));
  page.on('pageerror', e => logs.push('[pageerror] ' + e.message));
  await page.goto('file://' + require('path').resolve(__dirname,'../dist/street3d-v2.0.html'), { waitUntil: 'load', timeout: 60000 });
  try {
    await page.waitForFunction('window.__SCENE_READY__ === true', { timeout: 45000 });
  } catch (e) { logs.push('[timeout] scene not ready'); }
  await new Promise(r => setTimeout(r, 6000));
  const err = await page.evaluate(() => {
    const e = document.getElementById('err');
    return e && e.style.display !== 'none' ? e.textContent : null;
  });
  const stats = await page.evaluate(() => document.getElementById('stats')?.textContent);
  console.log('STATS:', stats);
  console.log('ERRBOX:', err ? err.slice(0, 1500) : 'none');
  for (const s of shots || []) {
    const [name, view, wait] = s.split(',');
    if (view && view !== 'none') { await page.click(`[data-v="${view}"]`); }
    await new Promise(r => setTimeout(r, +wait || 4000));
    await page.screenshot({ path: path.join(OUTDIR, name + '.png') });
    console.log('shot', name);
  }
  console.log('LOGS:\n' + logs.slice(-30).join('\n'));
  await browser.close();
})();
