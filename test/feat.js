const path = require('path');
const OUTDIR = path.resolve(__dirname, '../screenshots/_out');
require('fs').mkdirSync(OUTDIR, { recursive: true });
const puppeteer = require('puppeteer-core');

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/chromium',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-gl=angle', '--use-angle=swiftshader',
           '--enable-unsafe-swiftshader', '--disable-gpu-sandbox', '--hide-scrollbars'],
    headless: 'new',
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 900, height: 1000, deviceScaleFactor: 1 });
  const logs = [];
  page.on('console', m => logs.push('[' + m.type() + '] ' + m.text()));
  page.on('pageerror', e => logs.push('[pageerror] ' + e.message));
  await page.goto('file://' + require('path').resolve(__dirname,'../dist/street3d-v2.0.html'), { waitUntil: 'load', timeout: 60000 });
  await page.waitForFunction('window.__SCENE_READY__ === true', { timeout: 45000 });
  await sleep(5000);
  const dump = async tag => {
    const e = await page.evaluate(() => {
      const x = document.getElementById('err');
      return x && x.style.display !== 'none' ? x.textContent.slice(0, 900) : null;
    });
    console.log('--- ' + tag + ' ERRBOX:', e || 'none');
    if (e) console.log('LOGS TAIL:\n' + logs.slice(-25).join('\n'));
  };
  console.log('STATS:', await page.evaluate(() => document.getElementById('stats').textContent));
  await dump('load');
  console.log('REG count:', await page.evaluate(() => window.__REG().length));
  console.log('REG sample:', await page.evaluate(() => JSON.stringify(window.__REG().slice(0, 3).map(i => [i.id, i.name, i.type, i.floors]))));
  console.log('VEH sample:', await page.evaluate(() => JSON.stringify(window.__REG().filter(i => i.id.startsWith('VEH')).slice(0, 3).map(i => [i.id, i.name, i.status, i.x, i.z]))));

  // scan for a pixel that picks a building
  const spot = await page.evaluate(() => {
    for (let y = 200; y < 800; y += 12)
      for (let x = 120; x < 800; x += 12) {
        const i = window.__pickAt(x, y);
        if (i && i.id.startsWith('BLD')) return { x, y, id: i.id, name: i.name };
      }
    return null;
  });
  console.log('PICK SPOT:', JSON.stringify(spot));
  if (spot) { await page.mouse.click(spot.x, spot.y); await sleep(600); }
  console.log('POP:', await page.evaluate(() => {
    const p = document.getElementById('pop');
    return { show: p.classList.contains('show'), nm: p.querySelector('.nm').textContent,
      id: p.querySelector('.id').textContent, rows: p.querySelectorAll('tr').length,
      selBox: !!window.__scene.children.find(c => c.isLineSegments && c.visible) };
  }));
  await page.screenshot({ path: path.join(OUTDIR,'pick.png') });
  await dump('pick');

  // long-press route markers on ground pixels
  const gspots = await page.evaluate(() => {
    const out = [];
    for (const [x, y] of [[240, 880], [400, 830], [560, 780], [700, 740]]) {
      const i = window.__pickAt(x, y);
      out.push({ x, y, hit: i ? i.id : 'ground' });
    }
    return out;
  });
  console.log('GROUND SPOTS:', JSON.stringify(gspots));
  for (const s of gspots) {
    await page.mouse.move(s.x, s.y); await page.mouse.down(); await sleep(850); await page.mouse.up(); await sleep(250);
  }
  console.log('ROUTE:', await page.evaluate(() => {
    const g = window.__scene.getObjectByName('标注层');
    return { len: document.getElementById('routelen').textContent,
      marks: g.children.filter(c => c.isGroup).length,
      line: g.children.some(c => c.isLine && c.visible),
      names: g.children.filter(c => c.isGroup).map(c => c.userData.info.id + ':' + c.userData.info.name) };
  }));
  await page.screenshot({ path: path.join(OUTDIR,'route.png') });
  await dump('route');
  // undo one
  await page.click('#undoRoute'); await sleep(400);
  console.log('AFTER UNDO:', await page.evaluate(() => document.getElementById('routelen').textContent));
  await page.click('#clrRoute'); await sleep(400);
  console.log('AFTER CLEAR:', await page.evaluate(() => ({ t: document.getElementById('routelen').textContent,
    marks: window.__scene.getObjectByName('标注层').children.filter(c => c.isGroup).length })));
  for (const s of gspots.slice(0, 3)) {
    await page.mouse.move(s.x, s.y); await page.mouse.down(); await sleep(850); await page.mouse.up(); await sleep(200);
  }

  // dummy
  await page.click('#stickBtn'); await sleep(400);
  const d0 = await page.evaluate(() => { const o = window.__scene.getObjectByName('人物层').children[0]; return o.position.toArray().map(v => +v.toFixed(1)); });
  await page.keyboard.down('w'); await sleep(1500); await page.keyboard.up('w');
  await page.keyboard.down('a'); await sleep(700); await page.keyboard.up('a');
  await sleep(300);
  console.log('DUMMY:', await page.evaluate(d0 => {
    const o = window.__scene.getObjectByName('人物层').children[0];
    return { from: d0, pos: o.position.toArray().map(v => +v.toFixed(1)), yaw: +o.rotation.y.toFixed(2),
      id: o.userData.info.id, status: o.userData.info.status,
      stick: document.getElementById('stick').classList.contains('show') };
  }, d0));
  // virtual joystick drag
  await page.mouse.move(70, 900); await page.mouse.down();
  await page.mouse.move(70, 850, { steps: 6 }); await sleep(900);
  await page.mouse.move(110, 840, { steps: 6 }); await sleep(600); await page.mouse.up();
  console.log('DUMMY after stick:', await page.evaluate(() => {
    const o = window.__scene.getObjectByName('人物层').children[0];
    return { pos: o.position.toArray().map(v => +v.toFixed(1)), status: o.userData.info.status };
  }));
  await page.click('#follow'); await sleep(2200);
  await page.screenshot({ path: path.join(OUTDIR,'follow.png') });
  await dump('dummy');
  await page.click('#follow');
  await page.click('#resetD'); await sleep(400);
  console.log('DUMMY reset:', await page.evaluate(() => window.__scene.getObjectByName('人物层').children[0].position.toArray()));

  // 2D
  await page.click('#m2d'); await sleep(1200);
  console.log('2D CAM start:', await page.evaluate(() => { const c = window.__cam;
    return { p: c.position.toArray().map(v => +v.toFixed(1)), up: c.up.toArray().map(v => +v.toFixed(2)), zoom: +c.zoom.toFixed(2), mode2d: !!document.getElementById('m2d').classList.contains('on') }; }));
  await page.screenshot({ path: path.join(OUTDIR,'2d.png') });
  await page.mouse.move(450, 500); await page.mouse.down();
  await page.mouse.move(350, 570, { steps: 10 }); await page.mouse.up(); await sleep(700);
  const m1 = await page.evaluate(() => { const c = window.__cam; return { p: [+c.position.x.toFixed(1), +c.position.z.toFixed(1)], zoom: +c.zoom.toFixed(2) }; });
  await page.mouse.wheel({ deltaY: -350 }); await sleep(700);
  const m2 = await page.evaluate(() => { const c = window.__cam; return { p: [+c.position.x.toFixed(1), +c.position.z.toFixed(1)], zoom: +c.zoom.toFixed(2), up: [+c.up.x.toFixed(2), +c.up.z.toFixed(2)] }; });
  await page.click('#rotR'); await sleep(600);
  const m3 = await page.evaluate(() => { const c = window.__cam; return { up: [+c.up.x.toFixed(2), +c.up.z.toFixed(2)] }; });
  console.log('2D drag:', JSON.stringify(m1), 'wheel:', JSON.stringify(m2), 'rot:', JSON.stringify(m3));
  const spot2 = await page.evaluate(() => {
    for (let y = 300; y < 700; y += 10)
      for (let x = 200; x < 700; x += 10) {
        const i = window.__pickAt(x, y);
        if (i && i.id.startsWith('BLD')) return { x, y, id: i.id };
      }
    return null;
  });
  if (spot2) { await page.mouse.click(spot2.x, spot2.y); await sleep(500); }
  console.log('POP2D:', JSON.stringify(spot2), await page.evaluate(() => ({
    show: document.getElementById('pop').classList.contains('show'), nm: document.querySelector('#pop .nm').textContent })));
  // long-press in 2D
  await page.mouse.move(300, 640); await page.mouse.down(); await sleep(850); await page.mouse.up(); await sleep(300);
  console.log('2D ROUTE marks now:', await page.evaluate(() => document.getElementById('routelen').textContent));
  await page.screenshot({ path: path.join(OUTDIR,'2d_pick.png') });
  await dump('2d');

  // back to 3D, drag rotate
  await page.click('#m3d'); await sleep(3000);
  const c0 = await page.evaluate(() => window.__cam.position.toArray().map(v => +v.toFixed(1)));
  await page.mouse.move(500, 400); await page.mouse.down();
  await page.mouse.move(680, 320, { steps: 14 }); await page.mouse.up(); await sleep(1500);
  const c1 = await page.evaluate(() => window.__cam.position.toArray().map(v => +v.toFixed(1)));
  console.log('3D drag rotate:', JSON.stringify(c0), '->', JSON.stringify(c1));
  await page.screenshot({ path: path.join(OUTDIR,'3d.png') });
  await dump('3d');

  // layer toggles
  await page.click('[data-layer="bld"]'); await sleep(600);
  console.log('LAYERS off buildings:', await page.evaluate(() => window.__scene.getObjectByName('建筑层').visible));
  await page.screenshot({ path: path.join(OUTDIR,'layers.png') });
  await page.click('[data-layer="bld"]'); await sleep(400);

  // street view still works
  await page.click('[data-v="street"]'); await sleep(6000);
  await page.screenshot({ path: path.join(OUTDIR,'street.png') });
  await dump('street');
  await page.click('[data-v="oblique"]'); await sleep(3500);
  await dump('oblique');

  console.log('FINAL STATS:', await page.evaluate(() => document.getElementById('stats').textContent));
  const errs = logs.filter(l => /pageerror|\[error\]/.test(l));
  console.log('ERROR LOGS:', errs.length ? errs.slice(0, 12).join('\n') : 'none');
  await browser.close();
})();
