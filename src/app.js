import * as THREE from 'three';
import { OrbitControls } from './OrbitControls.js';

/* ============ utils ============ */
const C = h => new THREE.Color(h);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
let _s = 987654321;
const rnd = () => (_s = (_s * 1664525 + 1013904223) >>> 0) / 4294967296;
const rr = (a, b) => a + (b - a) * rnd();
const $ = id => document.getElementById(id);

function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function tex(c) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
function noise(g, x, y, w, h, n, a, col) {
  for (let i = 0; i < n; i++) { g.globalAlpha = Math.random() * a; g.fillStyle = col;
    g.fillRect(x + Math.random() * w, y + Math.random() * h, 1 + Math.random() * 3, 1 + Math.random() * 3); }
  g.globalAlpha = 1;
}
function blob(g, x, y, r, col) {
  g.fillStyle = col; g.beginPath();
  for (let i = 0; i <= 14; i++) { const a = i / 14 * Math.PI * 2, rad = r * (.6 + Math.random() * .8);
    const px = x + Math.cos(a) * rad, py = y + Math.sin(a) * rad; i ? g.lineTo(px, py) : g.moveTo(px, py); }
  g.closePath(); g.fill();
}
const M = o => new THREE.MeshStandardMaterial(o);
function box(w, h, d, m) { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.castShadow = o.receiveShadow = true; return o; }
function put(o, x, y, z) { o.position.set(x, y, z); scene.add(o); return o; }

/* merge many transformed geometries (optionally per-part color) into one mesh */
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s1 = new THREE.Vector3(1, 1, 1);
function part(geo, x, y, z, col, rx, ry, rz) {
  _e.set(rx || 0, ry || 0, rz || 0); _q.setFromEuler(_e); _v.set(x, y, z);
  const g = geo.toNonIndexed();
  g.applyMatrix4(_m4.compose(_v, _q, _s1));
  return { g, col };
}
function mergeGeo(parts) {
  const pos = [], nor = [], uv = [], col = [];
  for (const { g: src, col: c } of parts) {
    const g = src.index ? src.toNonIndexed() : src;
    const p = g.attributes.position.array, n = g.attributes.normal.array, u = g.attributes.uv.array;
    for (let i = 0; i < p.length; i++) { pos.push(p[i]); nor.push(n[i]); }
    for (let i = 0; i < u.length; i++) uv.push(u[i]);
    if (c) { const cc = C(c); for (let i = 0; i < p.length / 3; i++) col.push(cc.r, cc.g, cc.b); }
    else if (g.attributes.color) { const sc = g.attributes.color.array; for (let i = 0; i < sc.length; i++) col.push(sc[i]); }
    else { for (let i = 0; i < p.length / 3; i++) col.push(1, 1, 1); }
    if (g !== src) src.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  out.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return out;
}
function mergeParts(parts, opts) {
  const o = Object.assign({}, opts);
  const basic = o.basic; delete o.basic;
  const params = basic ? Object.assign({ vertexColors: true }, o)
                       : Object.assign({ vertexColors: true, roughness: .85 }, o);
  const m = new THREE.Mesh(mergeGeo(parts), new (basic ? THREE.MeshBasicMaterial : THREE.MeshStandardMaterial)(params));
  m.castShadow = !basic; m.receiveShadow = !basic; scene.add(m); return m;
}
const BG = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const CY = (rt, rb, h, s) => new THREE.CylinderGeometry(rt, rb, h, s || 8);

/* ============ textures ============ */
const FBG = { concrete: '#c6c3ba', garage: '#8d9197', glass: '#3f4b53', ind: '#9aa09d', dark: '#33363a', white: '#d9d7d0' };
function facade(style, w, h) {
  const ppu = 11, W = clamp(Math.round(w * ppu), 128, 1024), H = clamp(Math.round(h * ppu), 64, 1024);
  const [c, g] = cv(W, H);
  g.fillStyle = FBG[style] || '#bbb'; g.fillRect(0, 0, W, H);
  noise(g, 0, 0, W, H, 900, .12, '#000'); noise(g, 0, 0, W, H, 500, .08, '#fff');
  const grout = (step, col) => { g.strokeStyle = col; g.lineWidth = 1;
    for (let y = 0; y < H; y += step) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    for (let x = 0; x < W; x += step) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); } };
  if (style === 'concrete' || style === 'white') {
    grout(34, 'rgba(0,0,0,.10)');
    for (let y = 16; y + 24 < H - 6; y += 40) for (let x = 14; x + 20 < W - 4; x += 34) {
      const r = rnd();
      g.fillStyle = r < .12 ? '#0b0d10' : r < .22 ? '#e9e6de' : r < .3 ? '#6f7780' : '#2a3138';
      g.fillRect(x, y, 20, 24); g.strokeStyle = 'rgba(0,0,0,.35)'; g.strokeRect(x + .5, y + .5, 20, 24);
      if (r > .9) { g.strokeStyle = '#d8d5cd'; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 20, y + 24); g.moveTo(x + 20, y); g.lineTo(x, y + 24); g.stroke(); }
    }
  } else if (style === 'garage') {
    grout(48, 'rgba(0,0,0,.12)');
    for (let y = 26; y < H - 14; y += 40) { g.fillStyle = 'rgba(8,10,12,.82)'; g.fillRect(12, y, W - 24, 15); }
    g.fillStyle = '#eceae4'; g.font = 'bold 44px sans-serif'; g.textAlign = 'left'; g.fillText('B', 16, 20 + 34);
    g.strokeStyle = '#eceae4'; g.lineWidth = 3;
    [70, 112, 154].forEach(x => { g.beginPath(); g.arc(x, 40, 14, 0, 7); g.stroke(); });
  } else if (style === 'glass') {
    for (let y = 0; y < H; y += 26) {
      for (let x = 4; x < W - 4; x += 26) { const r = rnd();
        g.fillStyle = r < .15 ? '#8fa3ad' : r < .5 ? '#4e626d' : '#33454f'; g.fillRect(x, y + 4, 22, 18); }
      g.fillStyle = '#d5d3cc'; g.fillRect(0, y, W, 4);
    }
  } else if (style === 'ind') {
    grout(30, 'rgba(0,0,0,.10)');
    for (let y = 20; y + 30 < H - 14; y += 60) for (let x = 16; x + 30 < W - 12; x += 46) {
      const r = rnd(); g.fillStyle = r < .18 ? '#0a0b0d' : r < .4 ? '#7d7364' : '#2b3238'; g.fillRect(x, y, 30, 30);
      g.strokeStyle = 'rgba(0,0,0,.4)'; g.strokeRect(x + .5, y + .5, 30, 30);
    }
    g.fillStyle = 'rgba(120,60,20,.22)'; g.fillRect(0, H - 12, W, 12);
  } else {
    for (let y = 24; y + 26 < H - 12; y += 52) for (let x = 18; x + 20 < W - 12; x += 40) {
      g.fillStyle = rnd() < .25 ? '#5a6169' : '#12151a'; g.fillRect(x, y, 20, 26); }
    g.strokeStyle = 'rgba(255,255,255,.06)';
    for (let x = 30; x < W; x += 90) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
  }
  const gr = g.createLinearGradient(0, H, 0, H * .72);
  gr.addColorStop(0, 'rgba(0,0,0,.28)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, H * .72, W, H * .28);
  return M({ map: tex(c), roughness: .92, metalness: 0 });
}
function hole(g, x, y, r) {
  blob(g, x, y, r * 1.2, 'rgba(160,160,155,.8)'); blob(g, x, y, r, '#05060a');
  for (let i = 0; i < 30; i++) { g.fillStyle = 'rgba(195,195,190,.55)';
    g.fillRect(x + rr(-r * 1.8, r * 1.8), y + rr(-r * 1.8, r * 1.8), rr(1, 4), rr(1, 3)); }
}
function roofTex(kind, w, d) {
  const S = 10, W = clamp(Math.round(w * S), 128, 1024), H = clamp(Math.round(d * S), 128, 1024);
  const [c, g] = cv(W, H);
  const base = { gray: '#8f8f8b', white: '#d6dadc', green: '#6d7f68', dark: '#3d4043', tar: '#41443f', park: '#84847f' }[kind] || '#999';
  g.fillStyle = base; g.fillRect(0, 0, W, H);
  if (kind === 'white' || kind === 'green') {
    for (let y = 0; y < H; y += 7) { g.fillStyle = 'rgba(0,0,0,.13)'; g.fillRect(0, y, W, 3);
      g.fillStyle = 'rgba(255,255,255,.10)'; g.fillRect(0, y + 4, W, 2); }
    g.strokeStyle = 'rgba(0,0,0,.25)';
    for (let x = 0; x < W; x += 96) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
    if (kind === 'white') { for (let i = 0; i < 12; i++) { const x = rr(20, W - 40), y = rr(20, H - 40);
      g.fillStyle = '#8cf0ff'; g.fillRect(x, y, 16, 9); g.strokeStyle = 'rgba(0,0,0,.5)'; g.strokeRect(x + .5, y + .5, 16, 9); } }
  } else {
    noise(g, 0, 0, W, H, 2600, .16, '#000'); noise(g, 0, 0, W, H, 1400, .10, '#fff');
    g.strokeStyle = 'rgba(255,255,255,.10)'; g.lineWidth = 6; g.strokeRect(6, 6, W - 12, H - 12);
  }
  if (kind === 'park') {
    g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 2;
    for (let y = 30; y < H - 30; y += 44) { g.beginPath(); g.moveTo(24, y); g.lineTo(W - 24, y); g.stroke();
      for (let x = 24; x < W - 30; x += 30) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + 6, y + 38); g.stroke(); } }
  }
  if (kind === 'gray' || kind === 'dark' || kind === 'tar' || kind === 'park') {
    for (let i = 0; i < 5; i++) { const x = rr(20, W - 60), y = rr(20, H - 60);
      g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(x, y, 26, 18);
      g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x + 2, y + 2, 22, 14); }
  }
  if (kind === 'white') { g.fillStyle = 'rgba(230,232,232,.9)';
    for (let y = 40; y < H - 20; y += 130) for (let x = 30; x < W - 40; x += 150) {
      g.fillRect(x, y, 26, 14); g.strokeStyle = 'rgba(0,0,0,.4)'; g.strokeRect(x + .5, y + .5, 26, 14); } }
  if (kind === 'dark') { g.fillStyle = '#20242a'; g.fillRect(W * .55, H * .18, W * .22, H * .2);
    g.fillStyle = '#7fe8ff'; for (let i = 0; i < 6; i++) g.fillRect(W * .57 + i * 10, H * .2, 7, H * .16); }
  if (kind === 'gray' && w > 40) { g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 2;
    g.beginPath(); g.arc(W * .72, H * .5, 26, 0, 7); g.stroke();
    g.beginPath(); g.moveTo(W * .72 - 18, H * .5); g.lineTo(W * .72 + 18, H * .5); g.stroke(); }
  if (kind === 'white' && w > 25) hole(g, W * .68, H * .4, 34);
  if (kind === 'park' && w > 20) hole(g, W * .22, H * .3, 26);
  if (kind === 'gray' && w > 30) hole(g, W * .3, H * .7, 22);
  return tex(c);
}
function redRoofTex() {
  const [c, g] = cv(512, 256); g.fillStyle = '#a8412c'; g.fillRect(0, 0, 512, 256);
  for (let y = 0; y < 256; y += 12) { g.fillStyle = y % 24 ? 'rgba(0,0,0,.18)' : 'rgba(255,255,255,.07)'; g.fillRect(0, y, 512, 6); }
  for (let x = 0; x < 512; x += 22) { g.fillStyle = 'rgba(0,0,0,.10)'; g.fillRect(x, 0, 2, 256); }
  noise(g, 0, 0, 512, 256, 1200, .18, '#000');
  g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(0, 122, 512, 10);
  return tex(c);
}
function gableGeo(w, d, h) {
  const p = [], uv = [], idx = [], hw = w / 2, hd = d / 2;
  const quad = (a, b, c, e) => { const n = p.length / 3; p.push(...a, ...b, ...c, ...e); uv.push(0, 0, 1, 0, 1, 1, 0, 1); idx.push(n, n + 1, n + 2, n, n + 2, n + 3); };
  quad([-hw, 0, hd], [hw, 0, hd], [hw, h, 0], [-hw, h, 0]);
  quad([hw, 0, -hd], [-hw, 0, -hd], [-hw, h, 0], [hw, h, 0]);
  let n = p.length / 3; p.push(-hw, 0, hd, -hw, 0, -hd, -hw, h, 0); uv.push(0, 0, 1, 0, .5, 1); idx.push(n, n + 1, n + 2);
  n = p.length / 3; p.push(hw, 0, -hd, hw, 0, hd, hw, h, 0); uv.push(0, 0, 1, 0, .5, 1); idx.push(n, n + 1, n + 2);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals(); return g;
}

/* ============ ground plan ============ */
const AVE = { x1: -100, x2: 100, z1: -12, z2: 6 };          // main E-W avenue
const RD_N = { x1: -6, x2: 18, z1: -100, z2: -12 };          // N-S north
const RD_S = { x1: -6, x2: 18, z1: 6, z2: 100 };             // N-S south
const RD_W = { x1: -92, x2: -76, z1: -100, z2: -12 };        // N-S west
function groundTex() {
  const N = 2048, S = N / 200, [c, g] = cv(N, N);
  const px = x => (x + 100) * S, pz = z => (z + 100) * S;
  g.fillStyle = '#9b9992'; g.fillRect(0, 0, N, N);
  noise(g, 0, 0, N, N, 30000, .12, '#000'); noise(g, 0, 0, N, N, 15000, .09, '#fff');
  const road = r => {
    const x = px(r.x1), y = pz(r.z1), w = (r.x2 - r.x1) * S, h = (r.z2 - r.z1) * S;
    g.fillStyle = '#55585c'; g.fillRect(x, y, w, h);
    noise(g, x, y, w, h, 2600, .18, '#000');
    for (let i = 0; i < 22; i++) blob(g, x + Math.random() * w, y + Math.random() * h, rr(6, 26), 'rgba(28,28,30,.4)');
    g.strokeStyle = 'rgba(18,18,20,.4)';
    for (let i = 0; i < 34; i++) { g.lineWidth = rr(1, 2.5); const sx = x + Math.random() * w, sy = y + Math.random() * h;
      g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + rr(-34, 34), sy + rr(-34, 34)); g.stroke(); }
    g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 3; g.strokeRect(x, y, w, h);
  };
  const walk = (x1, z1, x2, z2) => {
    g.fillStyle = '#a9a7a0'; g.fillRect(px(x1), pz(z1), (x2 - x1) * S, (z2 - z1) * S);
    noise(g, px(x1), pz(z1), (x2 - x1) * S, (z2 - z1) * S, 700, .12, '#000');
    g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 1.5;
    if (x2 - x1 > z2 - z1) for (let z = pz(z1); z < pz(z2); z += 4 * S) { g.beginPath(); g.moveTo(px(x1), z); g.lineTo(px(x2), z); g.stroke(); }
    else for (let x = px(x1); x < px(x2); x += 4 * S) { g.beginPath(); g.moveTo(x, pz(z1)); g.lineTo(x, pz(z2)); g.stroke(); }
  };
  [AVE, RD_N, RD_S, RD_W].forEach(road);
  walk(-100, -15.5, 100, -12); walk(-100, 6, 100, 9.5);
  walk(-9.5, -100, -6, -12); walk(18, -100, 21.5, 100); walk(-95.5, -100, -92, -12); walk(-76, -100, -72.5, -12);
  walk(-9.5, 6, -6, 100);
  const lane = (ax, az, bx, bz, col, dash) => {
    g.strokeStyle = col; g.lineWidth = 3; g.setLineDash(dash || []);
    g.beginPath(); g.moveTo(px(ax), pz(az)); g.lineTo(px(bx), pz(bz)); g.stroke(); g.setLineDash([]);
  };
  lane(-100, -3, 100, -3, 'rgba(238,238,232,.75)', [14, 18]);
  lane(-100, -8.5, 100, -8.5, 'rgba(238,238,232,.35)');
  lane(6, -100, 6, -15, 'rgba(238,238,232,.6)', [12, 16]);
  lane(6, 9, 6, 100, 'rgba(238,238,232,.6)', [12, 16]);
  lane(-84, -100, -84, -15, 'rgba(238,238,232,.5)', [12, 16]);
  for (let x = px(-100); x < px(-92); x += 3.2 * S) { g.strokeStyle = 'rgba(238,238,232,.5)'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(x, pz(-96)); g.lineTo(x + 2 * S, pz(-96)); g.stroke(); }
  g.save(); g.translate(px(-60), pz(-4)); g.strokeStyle = 'rgba(255,255,255,.65)'; g.lineWidth = 2.5;
  g.beginPath(); g.arc(0, 0, 3.6, 0, 7); g.stroke(); g.restore();
  g.fillStyle = 'rgba(245,245,240,.65)';
  [[-30, 5], [24, 5], [70, 5]].forEach(([x, w]) => g.fillRect(px(x), pz(-11.4), w * S, 1.3 * S));
  for (let i = 0; i < 70; i++) blob(g, Math.random() * N, Math.random() * N, rr(4, 20), 'rgba(140,140,135,.3)');
  return tex(c);
}

/* ============ renderer / scene ============ */
const app = $('app'), errBox = $('err');
function showErr(e) { errBox.style.display = 'block'; errBox.textContent += '\n' + (e && (e.stack || e.message || e)); }
addEventListener('error', ev => showErr(ev.message));
addEventListener('unhandledrejection', ev => showErr(ev.reason));

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = C('#c9cdd0');
scene.fog = new THREE.Fog(0xb9bfc4, 190, 520);
/* 建模分层：每个图层是一个 Group，可独立显隐 / 拾取 */
const gBuild = new THREE.Group(), gVeh = new THREE.Group(), gChar = new THREE.Group(), gMark = new THREE.Group();
gBuild.name = '建筑层'; gVeh.name = '车辆层'; gChar.name = '人物层'; gMark.name = '标注层';
scene.add(gBuild, gVeh, gChar, gMark);

/* sky gradient background */
function skyTex() {
  const [c, g] = cv(8, 256);
  const gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, '#8fb0d4'); gr.addColorStop(.55, '#cfd8dc'); gr.addColorStop(1, '#e8e2d6');
  g.fillStyle = gr; g.fillRect(0, 0, 8, 256);
  return tex(c);
}
const SKYT = skyTex();
scene.background = SKYT;

const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .5, 3000);
camera.position.set(0, 200, 18); camera.lookAt(0, 0, 0);
const pcam = new THREE.PerspectiveCamera(58, 1, .1, 2000);
let activeCam = camera;

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.dampingFactor = .09;
controls.minZoom = .3; controls.maxZoom = 12;
controls.maxPolarAngle = Math.PI * .495;
controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN };
controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };

const hemi = new THREE.HemisphereLight(0xbcd4ea, 0x6a655c, .95); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff2dc, 2.6);
sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -135, right: 135, top: 135, bottom: -135, near: 1, far: 600 });
sun.shadow.bias = -0.0005; sun.shadow.normalBias = .5; sun.shadow.radius = 1.6;
scene.add(sun, sun.target);
const fill = new THREE.DirectionalLight(0xdfe8f5, .35); fill.position.set(-80, 60, -60); scene.add(fill);

const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), M({ map: groundTex(), roughness: .96 }));
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
/* far earth disc so the skyline never floats */
const earth = new THREE.Mesh(new THREE.CircleGeometry(900, 48), M({ color: '#a3a49f', roughness: 1 }));
earth.rotation.x = -Math.PI / 2; earth.position.y = -.08; earth.receiveShadow = true; scene.add(earth);

/* crosswalks + yellow box */
function mark(w, d, x, z, t, rot) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.rotation.z = rot || 0; m.position.set(x, .07, z); m.renderOrder = 2; scene.add(m);
}
function stripes(n, alongX) {
  const [c, g] = cv(256, 256); g.clearRect(0, 0, 256, 256); g.fillStyle = '#f2f1ea';
  for (let i = 0; i < n; i++) { const p = i * 256 / n + 8;
    alongX ? g.fillRect(0, p, 256, 256 / n - 16) : g.fillRect(p, 0, 256 / n - 16, 256); }
  return tex(c);
}
function boxTex() {
  const [c, g] = cv(256, 256); g.clearRect(0, 0, 256, 256);
  g.strokeStyle = '#e8c33a'; g.lineWidth = 8; g.strokeRect(8, 8, 240, 240);
  g.lineWidth = 4; for (let i = -256; i < 256; i += 40) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 256, 256); g.stroke(); }
  return tex(c);
}
const SX = stripes(9, true), SZ = stripes(9, false);
mark(18, 18, 6, -3, SX); mark(18, 18, -46, -3, SX); mark(18, 18, 60, -3, SX);
mark(24, 18, 6, 22, SZ); mark(24, 18, 6, -46, SZ); mark(18, 18, -84, -40, SX);
mark(21, 18, 6, -3, boxTex());

/* ============ object registry (建模分层 + ID/Name) ============ */
const REG = [];
let _bid = 0, _cid = 0;
function register(o, info) { o.userData.info = info; o.userData.pick = true; REG.push(o); return o; }
function deregister(o) { const i = REG.indexOf(o); if (i >= 0) REG.splice(i, 1); }
/* 注册并归入图层 Group（图层可整体显隐） */
function reg(o, info, grp) { register(o, info); if (grp) { grp.add(o); o.userData.layer = grp.name; } return o; }
/* invisible proxy for irregular shapes (hangars etc.) — pickable, writes no pixels */
const PICK0 = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, transparent: true, opacity: 0 });
function pickBox(x, z, w, h, d, name, type, floors) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), PICK0);
  m.position.set(x, h / 2, z);
  m.userData = { x, z, w, d, h, solid: true, proxy: true };
  return reg(m, { id: 'BLD-' + String(++_bid).padStart(2, '0'), name, type,
    floors: floors || 1, h, w, d, x, z, roof: 'arch', facade: 'metal' }, gBuild);
}

/* ============ buildings ============ */
const PP = { parapet: [], ac: [], rub: [], dorm: [], tree: [], pole: [], far: [] };
function building(o) {
  const { x, z, w, d, h } = o;
  const fW = facade(o.facade, w, h), fD = facade(o.facade, d, h);
  const roof = o.roof && o.roof !== 'none' ? M({ map: roofTex(o.roof, w, d), roughness: .88 }) : fW;
  const m = box(w, h, d, [fD, fD, roof, roof, fW, fW]);
  m.position.set(x, h / 2, z);
  m.userData = { x, z, w, d, h, solid: true };
  const id = 'BLD-' + String(++_bid).padStart(2, '0');
  reg(m, { id, name: o.name || '建筑 ' + _bid, type: o.type || '建筑',
    floors: o.floors || Math.max(1, Math.round(h / 3.2)), h, w, d, x, z, roof: o.roof || 'flat', facade: o.facade }, gBuild);
  if (o.parapet !== false && ['gray', 'dark', 'tar', 'park'].includes(o.roof)) {
    const t = .55, hh = 1.1;
    [[w, t, x, z - d / 2 + t / 2], [w, t, x, z + d / 2 - t / 2], [t, d, x - w / 2 + t / 2, z], [t, d, x + w / 2 - t / 2, z]]
      .forEach(([a, b, sx, sz]) => PP.parapet.push(part(BG(a, hh, b), sx, h + hh / 2, sz, '#a8a6a0')));
  }
  return m;
}
function acUnits(cx, cz, w, d, y, n, tilt) {
  for (let i = 0; i < n; i++) {
    const hh = rr(.7, 1.7);
    PP.ac.push(part(BG(rr(1.4, 3.4), hh, rr(1.4, 3)),
      cx + rr(-w / 2 + 1.6, w / 2 - 1.6), y + hh / 2, cz + rr(-d / 2 + 1.6, d / 2 - 1.6),
      rnd() < .3 ? '#6a6f74' : '#b9b7b0', 0, tilt ? rr(-.5, .5) : 0));
  }
}
function rubble(b, n) {
  const { x, z, w, d, h } = b.userData;
  for (let i = 0; i < n; i++)
    PP.rub.push(part(BG(rr(.4, 1.4), rr(.3, 1), rr(.4, 1.4)),
      x + rr(-w / 2, w / 2), h + rr(-.3, .4), z + rr(-d / 2, d / 2),
      rnd() < .5 ? '#6e6c68' : '#494744', rr(0, .5), rr(0, 3), rr(0, .5)));
}
function gableRoof(x, z, y, w, d, h) {
  const m = new THREE.Mesh(gableGeo(w, d, h), M({ map: redRoofTex(), roughness: .92, side: THREE.DoubleSide }));
  m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; scene.add(m);
  for (let i = 0; i < 4; i++)
    PP.dorm.push(part(BG(2.2, 1.8, 2.4), x + rr(-w / 4, w / 4), y + h * .55, z + (i < 2 ? -d / 4 : d / 4), '#d9d7d0'));
}

/* upper-left */
building({ x: -63, z: -94, w: 14, d: 12, h: 4.6, facade: 'white', roof: 'gray', name: '北部附属用房', type: '配套建筑' });
const garage = building({ x: -54, z: -64, w: 28, d: 24, h: 12, facade: 'garage', roof: 'park', name: 'B区停车楼', type: '停车库', floors: 4 });
acUnits(-54, -64, 24, 20, 12, 4, false); rubble(garage, 8);
building({ x: -21, z: -68, w: 18, d: 20, h: 10.5, facade: 'ind', roof: 'gray', name: '旧厂房 3 号', type: '工业建筑', floors: 3 });
building({ x: -40, z: -30, w: 14, d: 10, h: 4, facade: 'concrete', roof: 'gray', name: '临街平房', type: '商业', floors: 1 });
/* upper-right */
const bA = building({ x: 43, z: -72, w: 18, d: 36, h: 15, facade: 'white', roof: 'white', name: '住宅楼 A', type: '住宅', floors: 5 });
acUnits(43, -72, 14, 32, 15, 5, false);
building({ x: 74, z: -70, w: 24, d: 44, h: 17, facade: 'concrete', roof: 'white', name: '住宅楼 B', type: '住宅', floors: 6 });
building({ x: 31, z: -33, w: 24, d: 18, h: 9, facade: 'concrete', roof: 'none', parapet: false, name: '红顶公寓', type: '住宅', floors: 3 });
gableRoof(31, -33, 9, 25, 19, 5.2);
{ const [c, g] = cv(256, 256); g.fillStyle = '#3f7a4d'; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = '#c8613a'; g.lineWidth = 24; g.strokeRect(12, 12, 232, 232);
  g.strokeStyle = 'rgba(255,255,255,.7)'; g.lineWidth = 3; g.strokeRect(50, 50, 156, 156); g.strokeRect(104, 104, 48, 48);
  noise(g, 0, 0, 256, 256, 800, .12, '#000');
  const court = new THREE.Mesh(new THREE.PlaneGeometry(19, 16), new THREE.MeshBasicMaterial({ map: tex(c) }));
  court.rotation.x = -Math.PI / 2; court.position.set(62, .09, -33); scene.add(court); }
/* south of avenue, west */
building({ x: -75, z: 25, w: 46, d: 14, h: 5.5, facade: 'ind', roof: 'green', name: '西仓储长廊', type: '仓储', floors: 2 });
building({ x: -78, z: 48, w: 28, d: 12, h: 4.4, facade: 'concrete', roof: 'green', name: '西附属用房', type: '配套建筑', floors: 1 });
const bigW = building({ x: -32, z: 36, w: 30, d: 40, h: 8.5, facade: 'white', roof: 'white', name: '白顶厂房（受损）', type: '工业建筑', floors: 3 });
acUnits(-32, 36, 26, 36, 8.5, 4, false);
/* south of avenue, centre-east */
const tower = building({ x: 32, z: 32, w: 19, d: 22, h: 14, facade: 'dark', roof: 'dark', name: '受损塔楼', type: '办公', floors: 5 });
acUnits(32, 32, 16, 19, 14, 10, true); rubble(tower, 16);
building({ x: 81, z: 20, w: 38, d: 24, h: 13, facade: 'glass', roof: 'tar', name: '玻璃幕墙办公楼', type: '办公', floors: 4 });
acUnits(81, 20, 34, 20, 13, 5, false);
building({ x: 62, z: 40, w: 20, d: 12, h: 5, facade: 'concrete', roof: 'none', parapet: false, name: '红顶平房', type: '商业', floors: 1 });
gableRoof(62, 40, 5, 21, 13, 3);
const plaza = building({ x: 64, z: 72, w: 72, d: 56, h: 11, facade: 'dark', roof: 'dark', name: '南部商业综合体', type: '商业', floors: 4 });
acUnits(64, 72, 66, 50, 11, 22, true); rubble(plaza, 10);
{ const [c, g] = cv(256, 256); g.fillStyle = '#2b2f34'; g.fillRect(0, 0, 256, 256);
  g.fillStyle = '#7fe4ff'; for (let i = 0; i < 4; i++) g.fillRect(38 + i * 48, 60, 32, 64);
  const solar = new THREE.Mesh(new THREE.PlaneGeometry(10, 6), M({ map: tex(c), roughness: .25, metalness: .5 }));
  solar.rotation.set(-Math.PI / 2 + .3, 0, .2); solar.position.set(40, 12.4, 60); solar.castShadow = true; scene.add(solar); }
/* hangars */
building({ x: -66, z: 64, w: 34, d: 14, h: 6, facade: 'dark', roof: 'dark', name: '南库房', type: '仓储', floors: 1 });
function hangar(cx, cz, len, wid, hgt, i) {
  put(box(wid, hgt * .45, len, M({ color: '#8e8c86', roughness: .9 })), cx, hgt * .225, cz);
  const R = (wid * wid / 4 + hgt * hgt) / (2 * hgt), half = Math.asin(clamp(wid / 2 / R, 0, 1));
  const segs = 14, pos = [], uv = [], idx = [];
  for (let i2 = 0; i2 <= segs; i2++) {
    const a = -half + i2 / segs * half * 2, x = Math.sin(a) * R, y = Math.cos(a) * R - (R - hgt);
    for (const z of [-len / 2, len / 2]) { pos.push(x, y, z); uv.push(i2 / segs * 5, z < 0 ? 0 : 1); }
  }
  for (let i2 = 0; i2 < segs; i2++) { const a = i2 * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const g2 = new THREE.BufferGeometry();
  g2.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g2.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g2.setIndex(idx); g2.computeVertexNormals();
  const [c, gx] = cv(64, 256); gx.fillStyle = '#cfd2d4'; gx.fillRect(0, 0, 64, 256);
  for (let y = 0; y < 256; y += 6) { gx.fillStyle = 'rgba(0,0,0,.20)'; gx.fillRect(0, y, 64, 3);
    gx.fillStyle = 'rgba(255,255,255,.16)'; gx.fillRect(0, y + 3, 64, 2); }
  noise(gx, 0, 0, 64, 256, 900, .18, '#000');
  const roof = new THREE.Mesh(g2, M({ map: tex(c), side: THREE.DoubleSide, roughness: .7, metalness: .15 }));
  roof.position.set(cx, hgt * .45, cz); roof.castShadow = roof.receiveShadow = true; scene.add(roof);
  pickBox(cx, cz, wid, hgt, len, '拱顶机库 ' + i, '机库/大跨结构', 1);
}
for (let i = 0; i < 4; i++) hangar(-84 + i * 9.6, 84, 28, 8.4, 6.5, i + 1);

/* ============ street furniture ============ */
const _up = new THREE.Vector3(0, 1, 0);
function tree(x, z, s) {
  const seg = (p, dir, len, r, d) => {
    const geo = new THREE.CylinderGeometry(r * .62, r, len, 4, 1);
    geo.translate(0, len / 2, 0);
    geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(_up, dir.clone().normalize()));
    geo.translate(p.x, p.y, p.z);
    PP.tree.push({ g: geo, col: '#4a3a2c' });
    if (d <= 0) return;
    for (let i = 0; i < 2 + (rnd() < .4 ? 1 : 0); i++) {
      const nd = dir.clone().applyAxisAngle(new THREE.Vector3(1, 0, 0), rr(-.8, .8)).applyAxisAngle(new THREE.Vector3(0, 0, 1), rr(-.9, .9)).normalize();
      seg(p.clone().addScaledVector(dir, len), nd, len * rr(.5, .72), r * .68, d - 1);
    }
  };
  seg(new THREE.Vector3(x, 0, z), new THREE.Vector3(rr(-.12, .12), 1, rr(-.12, .12)), 3.2 * s, .26 * s, 2);
}
[[-24, -18], [-14, -18], [-34, -18], [-60, -18], [30, -18], [46, -18], [70, -18], [-70, -18], [-95, -30], [-98, -50],
 [-72, -30], [-70, -46], [-95, 20], [-98, 40], [-52, 60], [-46, 72], [22, 60], [24, 80], [30, 30], [-9, 70],
 [40, 34], [52, 20], [95, 34], [-40, -22]].forEach(([x, z]) => tree(x, z, rr(.7, 1.25)));

function pole(x, z, h) {
  PP.pole.push(part(CY(.12, .16, h, 6), x, h / 2, z, '#3b3b3e'));
  PP.pole.push(part(BG(2.4, .12, .12), x + 1.1, h - .5, z, '#3b3b3e'));
  return new THREE.Vector3(x + 2.1, h - .5, z);
}
const WIRE = [];
function wire(a, b) {
  const n = 10;
  for (let i = 0; i < n; i++) {
    const p1 = a.clone().lerp(b, i / n), p2 = a.clone().lerp(b, (i + 1) / n);
    p1.y -= Math.sin(i / n * Math.PI) * a.distanceTo(b) * .05;
    p2.y -= Math.sin((i + 1) / n * Math.PI) * a.distanceTo(b) * .05;
    const dir = p2.clone().sub(p1), len = dir.length();
    const geo = BG(len, .05, .05);
    const mid = p1.clone().add(p2).multiplyScalar(.5);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir.normalize());
    geo.applyMatrix4(new THREE.Matrix4().compose(mid, q, new THREE.Vector3(1, 1, 1)));
    WIRE.push({ g: geo, col: '#14161a' });
  }
}
const rowA = [], rowB = [];
for (let x = -96; x <= 96; x += 22) { rowA.push(pole(x, -18.5, 7.4)); rowB.push(pole(x, 9.5, 6.8)); }
for (let i = 0; i < rowA.length - 1; i++) { wire(rowA[i], rowA[i + 1]); wire(rowB[i], rowB[i + 1]); }
const rowC = [];
for (let z = 14; z <= 96; z += 20) rowC.push(pole(20.5, z, 7));
for (let i = 0; i < rowC.length - 1; i++) wire(rowC[i], rowC[i + 1]);
[[19, -14], [-9, 8.5]].forEach(([x, z]) => {
  PP.pole.push(part(BG(.75, 2, .55), x, 6, z, '#15171a'));
  const r = new THREE.Mesh(new THREE.CircleGeometry(.17, 10), new THREE.MeshBasicMaterial({ color: 0xff3b30 }));
  r.position.set(x, 6.5, z + .29); scene.add(r);
  const gr = new THREE.Mesh(new THREE.CircleGeometry(.17, 10), new THREE.MeshBasicMaterial({ color: 0x35d07a }));
  gr.position.set(x, 5.6, z + .29); scene.add(gr);
});
{ const g = new THREE.Group();
  const roof = box(6.5, .25, 2.4, M({ color: '#787c80' })); roof.position.y = 2.9; g.add(roof);
  const back = box(6.5, 2.4, .12, M({ color: '#9fb3bd', roughness: .3, metalness: .3 })); back.position.set(0, 1.4, -1.1); g.add(back);
  [-3, 3].forEach(x => { const p = box(.14, 2.8, .14, M({ color: '#3b3b3e' })); p.position.set(x, 1.4, 1); g.add(p); });
  g.position.set(30, 0, 8); g.children.forEach(c => { c.castShadow = c.receiveShadow = true; }); scene.add(g); }

/* ============ vehicles ============ */
const wheelG = new THREE.CylinderGeometry(.34, .34, .26, 10); wheelG.rotateZ(Math.PI / 2);
const wheelM = M({ color: '#141518', roughness: .9 });
const CAR_GEO = new Map();
function carGeo(color, taxi) {
  const key = color + (taxi ? 'T' : '');
  if (CAR_GEO.has(key)) return CAR_GEO.get(key);
  const p = [];
  p.push(part(BG(1.85, .62, 4.1), 0, .68, 0, color));
  p.push(part(BG(1.62, .52, 2), 0, 1.22, -.15, color));
  p.push(part(BG(1.5, .44, .1), 0, 1.24, .84, '#10151b', -.32));
  p.push(part(BG(1.5, .44, .1), 0, 1.24, -1.16, '#10151b', .3));
  for (const [x, z] of [[-.86, 1.35], [.86, 1.35], [-.86, -1.35], [.86, -1.35]])
    p.push(part(wheelG, x, .34, z, '#141518'));
  for (const x of [-.55, .55]) {
    p.push(part(BG(.42, .18, .1), x, .78, 2.06, '#fff6d0'));
    p.push(part(BG(.42, .18, .1), x, .78, -2.06, '#7a1414'));
  }
  if (taxi) for (let i = 0; i < 4; i++)
    p.push(part(BG(.72, .07, .38), (i % 2 ? .37 : -.37), 1.52, (i < 2 ? -.34 : .04), i % 2 === (i < 2 ? 0 : 1) ? '#f4f4ee' : '#141414'));
  const g = mergeGeo(p);
  CAR_GEO.set(key, g); return g;
}
const carMat = M({ vertexColors: true, roughness: .5, metalness: .35 });
const CNAMES = ['出租车', '私家车', '货车', '事故车', '停放车辆', '私家车', '出租车', '工程车'];
function makeCar(color, taxi) {
  const m = new THREE.Mesh(carGeo(color, taxi), carMat);
  m.castShadow = m.receiveShadow = true;
  m.userData = { w: 1.85, d: 4.1, h: 1.5 };
  reg(m, { id: 'VEH-' + String(++_cid).padStart(2, '0'), name: (taxi ? '出租车 ' : '车辆 ') + _cid,
    type: taxi ? '出租车' : '机动车', color, h: 1.5, w: 1.85, d: 4.1, x: 0, z: 0, status: '行驶中' }, gVeh);
  return m;
}
const TRUCK_GEO = (() => {
  const p = [];
  p.push(part(BG(2.1, 1.5, 2.4), 0, 1.3, 1.7, '#b9c3c9'));
  p.push(part(BG(2.1, 1.3, 4.6), 0, 1.15, -1.5, '#6d6f72'));
  for (const [x, z] of [[-1, 1.7], [1, 1.7], [-1, -1], [1, -1], [-1, -3.3], [1, -3.3]])
    p.push(part(wheelG, x * 1.02, .45, z, '#141518'));
  return mergeGeo(p);
})();
function makeTruck() {
  const m = new THREE.Mesh(TRUCK_GEO, carMat);
  m.castShadow = m.receiveShadow = true;
  m.userData = { w: 2.1, d: 6.4, h: 2.1 };
  reg(m, { id: 'VEH-' + String(++_cid).padStart(2, '0'), name: '轻型货车 ' + _cid, type: '货车',
    color: '#b9c3c9', h: 2.1, w: 2.1, d: 6.4, x: 0, z: 0, status: '行驶中' }, gVeh);
  return m;
}
/* parked / wrecked vehicles — individual meshes so each one is pickable */
function staticCar(color, taxi, x, y, z, ry, wrecked) {
  const m = new THREE.Mesh(carGeo(color, taxi), carMat);
  m.castShadow = m.receiveShadow = true;
  m.position.set(x, y, z); m.rotation.y = ry;
  m.userData = { w: 1.85, d: 4.1, h: 1.5 };
  reg(m, { id: 'VEH-' + String(++_cid).padStart(2, '0'),
    name: (wrecked ? '事故车 ' : '停放车辆 ') + _cid, type: wrecked ? '事故车' : '机动车',
    color, h: 1.5, w: 1.85, d: 4.1, x, z, status: wrecked ? '事故停放' : (y > 5 ? '楼顶停放' : '路边停放') }, gVeh);
  return m;
}
/* traffic loops (U-turn at each end, off-frame) */
function loop(pts) {
  const v = pts.map(([x, z]) => new THREE.Vector3(x, 0, z));
  const c = new THREE.CatmullRomCurve3(v, true, 'catmullrom', 0);
  return { c, len: c.getLength() };
}
const LV_E = loop([[-96, -8.6], [96, -8.6]]);
const LV_W = loop([[96, -3], [-96, -3]]);
const LV_S = loop([[12, -96], [12, 96]]);
const LV_N = loop([[-2, 96], [-2, -96]]);
const LV_W2 = loop([[-84, -96], [-84, -16]]);
const cars = [];
function add(r, u, sp, obj) { cars.push({ obj, r, u, sp }); }
add(LV_E, .10, 9.5, makeCar('#f5b400', true));
add(LV_E, .62, 9.5, makeCar('#e0762a', false));
add(LV_W, .25, 10.5, makeCar('#f5b400', true));
add(LV_W, .70, 10, makeCar('#2c3238', false));
add(LV_W, .92, 8.5, makeTruck());
add(LV_S, .30, 8, makeCar('#f5b400', true));
add(LV_S, .78, 8, makeCar('#e8a0a8', false));
add(LV_N, .45, 7.5, makeCar('#d8d5cd', false));
add(LV_W2, .4, 9, makeCar('#8f949a', false));
/* wrecks on the crossing + parked cars + rooftop cars */
staticCar('#f5b400', true, 11, 0, -5, 2.1, true);
staticCar('#3a3f45', false, 8.5, 0, .5, -.5, true);
[[-46, -86, '#e0762a'], [-38, -92, '#b9424a'], [-58, -95, '#d8d5cd'], [-70, -88, '#8f949a'],
 [-95, -22, '#c9cdd2'], [30, -20, '#7d848b'], [-14, 62, '#3b4046'], [26, 66, '#d8d5cd'],
 [-30, 66, '#4b5158'], [-40, 20, '#c9cdd2']].forEach(([x, z, col], i) =>
  staticCar(col, false, x, 0, z, i % 2 ? 0 : Math.PI / 2));
[[-60, -70, '#c9cdd2'], [-50, -60, '#b9424a'], [-58, -56, '#d8d5cd'], [-46, -66, '#8f949a']].forEach(([x, z, col], i) =>
  staticCar(col, false, x, 12.6, z, i === 1 ? Math.PI / 2 : 0));
/* excavator */
{ const p = [];
  p.push(part(BG(2.4, 1.1, 3.4), 9, 1.1, -56, '#c8871f', 0, .5));
  p.push(part(BG(1.6, 1.3, 1.6), 8.7, 2.2, -55.4, '#8f6a20', 0, .5));
  p.push(part(BG(.6, .5, 4.6), 10.2, 2.6, -57.6, '#d99b2b', -.7, .5));
  p.push(part(BG(.5, .4, 3), 11.4, 2.2, -59.6, '#d99b2b', .9, .5));
  p.push(part(BG(1.3, .9, .9), 11.9, .9, -60.7, '#3a3d40', 0, .5));
  mergeParts(p, { roughness: .75 }); }
/* construction crane */
{ const p = [];
  for (let y = 0; y < 26; y += 2) p.push(part(BG(.5, 2, .5), 34, y + 1, 56, '#c9a227'));
  p.push(part(BG(22, .6, .6), 40, 26.5, 56, '#c9a227'));
  p.push(part(BG(4, .6, .6), 29, 26.5, 56, '#c9a227'));
  p.push(part(BG(2.4, 1.6, 2.4), 28, 27.6, 56, '#8a8d90'));
  p.push(part(BG(.12, 10, .12), 48, 21, 56, '#22252a'));
  p.push(part(BG(1.4, 1.4, 1.4), 48, 15.4, 56, '#4a4d52'));
  mergeParts(p, { roughness: .7, metalness: .3 }); }

/* ============ 假人 / dummy avatar ============ */
const dummy = new THREE.Group();
const SKIN = '#d8b48a', SUIT = '#2b6cb0', PANT = '#2d323a', SHOE = '#191b1f';
const _skel = [];
function limb(w, h, d, x, y, z, col, px, py) {
  const p = new THREE.Group(); p.position.set(x, y, z);
  const m = new THREE.Mesh(BG(w, h, d), M({ color: col, roughness: .9 }));
  m.position.set(0, -h / 2 + (py || 0), 0);
  m.castShadow = m.receiveShadow = true; p.add(m);
  dummy.add(p);
  if (px) _skel.push({ p, ph: px, base: p.rotation.x });
  return p;
}
{ const HIP = .92;
  limb(.44, .3, .4, 0, 2.05, 0, SKIN);            // head  1.75–2.05
  limb(.74, .85, .4, 0, 1.75, 0, SUIT);           // torso 0.90–1.75
  limb(.2, .62, .22, -.46, 1.7, 0, SUIT, 1);      // arm L
  limb(.2, .62, .22, .46, 1.7, 0, SUIT, -1);      // arm R
  limb(.26, .78, .26, -.17, HIP, 0, PANT, .9);    // leg L
  limb(.26, .78, .26, .17, HIP, 0, PANT, -.9);   // leg R
  limb(.3, .16, .44, -.17, .16, .06, SHOE); limb(.3, .16, .44, .17, .16, .06, SHOE);
  { const hair = new THREE.Mesh(BG(.48, .16, .44), M({ color: '#2c2725', roughness: .95 }));
    hair.position.set(0, 2.06, -.02); dummy.add(hair);
    const ring = new THREE.Mesh(new THREE.RingGeometry(.5, .74, 22),
      new THREE.MeshBasicMaterial({ color: 0xffb020, side: THREE.DoubleSide, transparent: true, opacity: .85, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = .07; ring.renderOrder = 4; dummy.add(ring); }
  dummy.traverse(o => { if (o.isMesh && o.material.isMeshStandardMaterial) { o.castShadow = true; o.receiveShadow = true; } });
}
dummy.position.set(4, 0, 24);
reg(dummy, { id: 'PER-01', name: '行人假人', type: '可控角色', h: 2.05, w: .9, d: .5,
  x: dummy.position.x, z: dummy.position.z, status: '可行走 · 摇杆/WASD 控制' }, gChar);

const DUM = { yaw: 0, speed: 1.55, run: 4.2, walk: 0, keys: {}, on: false, follow: false };
const _cr = new THREE.Vector3(), _cf = new THREE.Vector3();
function collides(x, z, r) {
  for (const o of REG) {
    if (!o.userData.solid) continue;
    if (!o.parent || !o.parent.visible) continue;
    const u = o.userData;
    if (Math.abs(x - u.x) < u.w / 2 + r && Math.abs(z - u.z) < u.d / 2 + r) return true;
  }
  return false;
}
function moveDummy(dx, dz) {
  const p = dummy.position, r = .45;
  let nx = clamp(p.x + dx, -97, 97), nz = clamp(p.z + dz, -97, 97);
  if (collides(nx, p.z, r)) nx = p.x;
  if (collides(p.x, nz, r)) nz = p.z;
  p.x = nx; p.z = nz;
  DUM.x = p.x; DUM.z = p.z;
}
function updateDummy(dt) {
  let ix = 0, iz = 0;
  const k = DUM.keys;
  if (k.w || k.arrowup) iz -= 1; if (k.s || k.arrowdown) iz += 1;
  if (k.a || k.arrowleft) ix -= 1; if (k.d || k.arrowright) ix += 1;
  if (stick.active) { ix += stick.v.x; iz += stick.v.y; }
  const mag = Math.min(1, Math.hypot(ix, iz));
  if (mag > .05) {
    /* screen-relative: map (right, down) into world XZ using the active camera basis */
    _cr.setFromMatrixColumn(activeCam.matrixWorld, 0); _cf.setFromMatrixColumn(activeCam.matrixWorld, 2).multiplyScalar(-1);
    _cr.y = 0; _cf.y = 0;
    if (_cr.lengthSq() < 1e-6) _cr.set(1, 0, 0);
    _cr.normalize(); _cf.normalize();
    const dx = _cr.x * ix - _cf.x * iz, dz = _cr.z * ix - _cf.z * iz;
    const yaw = Math.atan2(dx, dz);
    let d = yaw - DUM.yaw;
    while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
    DUM.yaw += clamp(d, -12 * dt, 12 * dt);
    const sp = (k.shift ? DUM.run : DUM.speed) * mag;
    moveDummy(Math.sin(DUM.yaw) * sp * dt, Math.cos(DUM.yaw) * sp * dt);
    DUM.walk += dt * sp * 2.3;
  } else DUM.walk += dt * .9;
  dummy.rotation.y = DUM.yaw;
  const sway = mag > .05 ? 1 : .06;
  for (const s of _skel) s.p.rotation.x = s.base + Math.sin(DUM.walk * 2.2) * .6 * sway * Math.sign(s.ph);
  const info = dummy.userData.info;
  info.x = +dummy.position.x.toFixed(1); info.z = +dummy.position.z.toFixed(1);
  info.status = (DUM.keys.shift ? '奔跑中' : (mag > .05 ? '行走中' : '站立')) + ' (' + info.x + ', ' + info.z + ')';
}

/* ============ 路线标记：长按地图 起点 → 途经 → 终点 ============ */
const route = [];
const _rline = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineDashedMaterial({
  color: 0x22c76f, linewidth: 2, dashSize: 2.6, gapSize: 1.4 }));
_rline.layers.enableAll(); _rline.visible = false; _rline.renderOrder = 6;
_rline.frustumCulled = false; gMark.add(_rline);
const RCOL = ['#1fd07a', '#ffb020', '#ff5252'];
function rlabel(t) { return t === 0 ? '起点' : (t === 2 ? '终点' : '途经'); }
const _lbl = new Map();
function lblTex(n, role) {
  const key = n + '-' + role;
  if (_lbl.has(key)) return _lbl.get(key);
  const [c, ctx] = cv(160, 160); ctx.clearRect(0, 0, 160, 160);
  ctx.beginPath(); ctx.arc(80, 74, 46, 0, Math.PI * 2); ctx.fillStyle = RCOL[role]; ctx.fill();
  ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(8,12,18,.7)'; ctx.stroke();
  ctx.fillStyle = '#0d1218'; ctx.font = 'bold 52px -apple-system,"PingFang SC",sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(n), 80, 76);
  const t = tex(c); _lbl.set(key, t); return t;
}
function addRoutePoint(x, z, y) {
  const n = route.length + 1;
  const g = new THREE.Group();
  const mk = () => new THREE.MeshBasicMaterial({ color: C(RCOL[0]) });
  const ring = new THREE.Mesh(new THREE.RingGeometry(.95, 1.5, 22),
    new THREE.MeshBasicMaterial({ color: C(RCOL[0]), side: THREE.DoubleSide, transparent: true, opacity: .95, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = .11; ring.renderOrder = 5;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(.08, .08, 1.5, 6), new THREE.MeshBasicMaterial({ color: 0x22282e }));
  pole.position.y = 1.2;
  const cone = new THREE.Mesh(new THREE.ConeGeometry(.62, 2.1, 16), mk());
  cone.position.y = 2.3; cone.castShadow = true;
  const ball = new THREE.Mesh(new THREE.SphereGeometry(.3, 10, 8), mk());
  ball.position.y = 3.5;
  const sm = new THREE.Sprite(new THREE.SpriteMaterial({ map: lblTex(n, 0), transparent: true, depthTest: false }));
  sm.scale.set(2, 2, 1); sm.center.set(.5, .5); sm.renderOrder = 9; sm.position.set(0, 4.9, 0);
  g.add(ring, pole, cone, ball, sm);
  g.position.set(x, y || 0, z);
  route.push({ g, sm, n, x, z, y: y || 0, role: 0, parts: [ring, cone, ball] });
  register(g, { id: 'RTE-' + String(n).padStart(2, '0'), name: '起点标记', type: '路线标记',
    h: 3.5, w: 3, d: 3, x, z, status: '第 1 个点' });
  g.userData.layer = gMark.name;
  gMark.add(g);
  refreshRoute();
}
function refreshRoute() {
  const N = route.length;
  route.forEach((r, i) => {
    const role = i === 0 ? 0 : (i === N - 1 ? 2 : 1);
    if (role !== r.role || !r.built) {
      r.role = role; r.built = true;
      const col = C(RCOL[role]);
      for (const m of r.parts) { m.material.color.copy(col); m.material.needsUpdate = true; }
      r.sm.material.map = lblTex(r.n, role); r.sm.material.needsUpdate = true;
      r.g.userData.info.name = rlabel(role) + '标记';
      r.g.userData.info.status = '第 ' + r.n + ' 个点';
    }
  });
  const pts = route.map(r => new THREE.Vector3(r.x, r.y + .13, r.z));
  _rline.geometry.setFromPoints(pts);
  _rline.computeLineDistances();
  _rline.visible = pts.length >= 2;
  if (pts.length >= 2) {
    let d = 0;
    for (let i = 1; i < pts.length; i++) d += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].z - pts[i - 1].z);
    $('routelen').textContent = d.toFixed(0) + ' m · ' + pts.length + ' 点';
  } else $('routelen').textContent = (route.length ? '待第 2 点' : '0 m');
}
function undoRoute() {
  const r = route.pop();
  if (!r) return;
  gMark.remove(r.g);
  deregister(r.g);
  if (sel === r.g) hidePop();
  refreshRoute();
}
function clearRoute() { while (route.length) undoRoute(); }

/* ============ 2D / 3D 切换 ============ */
let mode2d = false;
const D3_UP = new THREE.Vector3(0, 1, 0);
const M2 = { psi: 0, zoom: 1, tx: 0, tz: 0, H: 205 };
function m2set() {
  const c = Math.cos(M2.psi), s = Math.sin(M2.psi);
  camera.up.set(-s, 0, -c);
  camera.position.set(M2.tx, M2.H, M2.tz);
  controls.target.set(M2.tx, 0, M2.tz);
  camera.zoom = M2.zoom;
  camera.lookAt(controls.target);
  fitZoom();
}
function setMode(two) {
  mode2d = !!two;
  $('m2d').classList.toggle('on', mode2d);
  $('m3d').classList.toggle('on', !mode2d);
  document.querySelectorAll('.v3').forEach(b => b.style.display = mode2d ? 'none' : '');
  document.querySelectorAll('.v2').forEach(b => b.style.display = mode2d ? '' : 'none');
  if (driving || orbit) { driving = orbit = false; }
  document.querySelectorAll('[data-v]').forEach(b => b.classList.toggle('on', !mode2d && b.dataset.v === 'oblique'));
  controls.enabled = !mode2d;                    /* 2D 用自带的平移/旋转/缩放控制器 */
  activeCam = camera;
  if (mode2d) {
    M2.zoom = clamp(camera.zoom, .6, 6);
    M2.tx = controls.target.x; M2.tz = controls.target.z;
    m2set();
    $('hint').style.opacity = 1;
    $('hint').textContent = '2D 平面：拖拽平移 · 双指捏合缩放 · 双指旋转 · 点选看 ID';
  } else {
    camera.up.copy(D3_UP);
    camera.zoom = 1;
    flyTo(VIEWS.oblique);
    $('hint').textContent = '点选建筑/车辆查看信息 · 长按地图添加 起点→途经→终点 · 双指缩放旋转';
  }
}
$('m2d').onclick = () => setMode(true);
$('m3d').onclick = () => setMode(false);
$('rotL').onclick = () => { M2.psi -= Math.PI / 12; };
$('rotR').onclick = () => { M2.psi += Math.PI / 12; };
document.querySelectorAll('[data-layer]').forEach(b => b.onclick = () => {
  const g = ({ bld: gBuild, veh: gVeh, per: gChar, rte: gMark })[b.dataset.layer];
  g.visible = !g.visible; b.classList.toggle('on', g.visible);
});

/* ---- 2D 控制器：单指拖拽平移、双指捏合缩放 + 旋转、滚轮缩放 ---- */
const _ptrs = new Map();
let _m2prev = null;
function m2multi() {
  const v = [..._ptrs.values()];
  if (v.length < 2) return v.length ? { d: 0, ang: 0, mid: v[0] } : null;
  return { d: Math.hypot(v[0].x - v[1].x, v[0].y - v[1].y), ang: Math.atan2(v[1].y - v[0].y, v[1].x - v[0].x),
    mid: { x: (v[0].x + v[1].x) / 2, y: (v[0].y + v[1].y) / 2 } };
}
function m2down(ev) { _ptrs.set(ev.pointerId, { x: ev.clientX, y: ev.clientY }); _m2prev = m2multi(); }
function m2up(ev) { _ptrs.delete(ev.pointerId); _m2prev = m2multi(); }
function m2move(ev) {
  if (!_ptrs.has(ev.pointerId)) return;
  _ptrs.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
  const cur = m2multi();
  if (!cur) return;
  const prev = _m2prev; _m2prev = cur;
  if (!prev) return;
  const wpp = 2 * m2half() / (M2.zoom * innerHeight);
  if (_ptrs.size === 1) {
    const dx = cur.mid.x - prev.mid.x, dy = cur.mid.y - prev.mid.y;
    const c = Math.cos(M2.psi), s = Math.sin(M2.psi);
    M2.tx = clamp(M2.tx + (-dx * c - dy * s) * wpp, -150, 150);
    M2.tz = clamp(M2.tz + (dx * s - dy * c) * wpp, -150, 150);
  } else if (_ptrs.size >= 2 && prev.d > 0) {
    M2.zoom = clamp(M2.zoom * (cur.d / prev.d), .3, 12);
    M2.psi += cur.ang - prev.ang;
  }
}
renderer.domElement.addEventListener('wheel', ev => {
  if (!mode2d) return;
  ev.preventDefault();
  M2.zoom = clamp(M2.zoom * Math.exp(-ev.deltaY * .0012), .3, 12);
}, { passive: false });

/* ============ 拾取 / 点选弹框 ============ */
const _ndc = new THREE.Vector2(), _ray = new THREE.Raycaster(), _bp = new THREE.Vector3();
const onScreen = o => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
function pickAt(cx, cy) {
  const r = renderer.domElement.getBoundingClientRect();
  _ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
  _ray.setFromCamera(_ndc, activeCam);
  const hits = _ray.intersectObjects(REG, true).filter(h => onScreen(h.object));
  for (const h of hits) {
    let o = h.object;
    while (o && !o.userData.info) o = o.parent;
    if (!o || !o.userData.pick) continue;
    /* hangar volume is an invisible proxy: if something real is hit just behind it, prefer the real surface */
    if (o.userData.proxy && hits.length > 1 && h !== hits[0] && h.distance < hits[0].distance - .8) continue;
    return o;
  }
  return null;
}
function selExtent(o) {
  const inf = o.userData.info;
  o.getWorldPosition(_bp);
  if (o === dummy) return { cx: _bp.x, cz: _bp.z, w: 1.2, h: 2.05, d: .95, y0: 0, ry: 0 };
  if (o.parent === gMark) return { cx: _bp.x, cz: _bp.z, w: 3.1, h: 3.8, d: 3.1, y0: o.position.y, ry: 0 };
  const hh = inf.h || 3;
  const y0 = Math.max(0, _bp.y - (o.userData.w !== undefined ? hh / 2 : 0));
  return { cx: _bp.x, cz: _bp.z, w: inf.w || 6, h: hh, d: inf.d || 6, y0, ry: o.rotation.y };
}
let sel = null;
const selBox = new THREE.LineSegments(new THREE.EdgesGeometry(BG(1, 1, 1)),
  new THREE.LineBasicMaterial({ color: 0xffb020, transparent: true, opacity: .95, depthTest: false }));
selBox.visible = false; selBox.renderOrder = 20; selBox.layers.enableAll(); scene.add(selBox);
const KMAP = { ID: '编号', id: '编号', layer: '图层', name: '名称', type: '类型', floors: '层数', h: '高度', w: '面宽',
  d: '进深', x: '坐标 X', z: '坐标 Z', status: '状态', color: '颜色', roof: '屋顶', facade: '立面' };
let popCells = {};
function fillPop(o) {
  const inf = o.userData.info, tb = $('pop').querySelector('table');
  tb.innerHTML = ''; popCells = {};
  const rows = [['ID', inf.id], ['layer', o.userData.layer || '场景层 / scene'], ['type', inf.type],
    ['floors', inf.floors], ['h', inf.h], ['w', inf.w], ['d', inf.d], ['x', inf.x], ['z', inf.z], ['status', inf.status]];
  for (const [k, raw] of rows) {
    if (raw === undefined || raw === '') continue;
    const tr = document.createElement('tr');
    const v = (k === 'h' || k === 'w' || k === 'd') ? (+raw).toFixed(1) + ' m' :
      (k === 'x' || k === 'z') ? (+raw).toFixed(1) : String(raw);
    tr.innerHTML = '<td></td><td></td>';
    tr.children[0].textContent = KMAP[k] || k; tr.children[1].textContent = v;
    if (k === 'x' || k === 'z' || k === 'status') popCells[k] = tr.children[1];
    tb.appendChild(tr);
  }
  $('pop').querySelector('.nm').textContent = inf.name;
  $('pop').querySelector('.id').textContent = inf.id;
  $('pop').classList.add('show');
}
function showPop(o) { sel = o; selBox.visible = true; syncSel(); fillPop(o); }
function hidePop() { sel = null; selBox.visible = false; $('pop').classList.remove('show'); }
function syncSel() {
  if (!sel || !onScreen(sel)) { hidePop(); return; }
  const e = selExtent(sel);
  selBox.position.set(e.cx, e.y0 + e.h / 2, e.cz);
  selBox.scale.set(e.w, e.h, e.d);
  selBox.rotation.y = e.ry || 0;
  const inf = sel.userData.info;
  if (inf.x !== undefined && sel.parent !== gMark) {
    inf.x = +e.cx.toFixed(1); inf.z = +e.cz.toFixed(1);
    if (popCells.x) popCells.x.textContent = inf.x.toFixed(1);
    if (popCells.z) popCells.z.textContent = inf.z.toFixed(1);
    if (popCells.status) popCells.status.textContent = String(inf.status);
  }
}

/* ============ pointer: 单击=选中 · 长按=路线标记 · 双击=缩放 ============ */
const gp = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const stick = { active: false, v: { x: 0, y: 0 } };
function ndcFrom(ev) {
  const r = renderer.domElement.getBoundingClientRect();
  return new THREE.Vector2(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
}
function groundHit(ev) {
  _ray.setFromCamera(ndcFrom(ev), activeCam);
  /* 命中实体（建筑/车）时把点放在其表面，否则落在地面 */
  for (const h of _ray.intersectObjects(REG, true)) {
    if (!onScreen(h.object)) continue;
    if (h.object.userData.solid) return { x: h.point.x, z: h.point.z, h: Math.max(0, h.point.y) };
    break;
  }
  const out = new THREE.Vector3();
  if (!_ray.ray.intersectPlane(gp, out)) return null;
  if (Math.hypot(out.x, out.z) > 97) return null;
  return { x: out.x, z: out.z, h: 0 };
}
let ptr = null, hangTimer = 0, hangOn = false, tapK = 0;
function endHang() { clearTimeout(hangTimer); hangTimer = 0; if (hangOn) { hangOn = false; if (controls.enabled !== !mode2d) controls.enabled = !mode2d; } }
window.addEventListener('pointerdown', ev => {
  const onCanvas = ev.target === renderer.domElement;
  if (onCanvas) { _ptrs.set(ev.pointerId, { x: ev.clientX, y: ev.clientY }); if (mode2d) m2down(ev); }
  if (!onCanvas || ev.button !== 0 || _ptrs.size > 1) { ptr = null; endHang(); return; }
  ptr = { x: ev.clientX, y: ev.clientY, t0: performance.now() };
  clearTimeout(hangTimer);
  hangTimer = setTimeout(() => {
    if (!ptr || stick.active) return;
    const q = groundHit({ clientX: ptr.x, clientY: ptr.y });
    if (!q) return;
    hangOn = true;                              /* 长按：加标记 */
    controls.enabled = false;
    if (navigator.vibrate) { try { navigator.vibrate(12); } catch (e) { } }
    addRoutePoint(+q.x.toFixed(1), +q.z.toFixed(1), +(q.h || 0).toFixed(1));
  }, 520);
}, true);
window.addEventListener('pointermove', ev => {
  if (mode2d) m2move(ev);
  if (ptr && Math.hypot(ev.clientX - ptr.x, ev.clientY - ptr.y) > 11) endHang();
});
window.addEventListener('pointerup', ev => {
  const had = _ptrs.size;
  if (mode2d) m2up(ev);
  _ptrs.delete(ev.pointerId);
  const p = ptr; ptr = null;
  clearTimeout(hangTimer);
  if (hangOn) { hangOn = false; controls.enabled = !mode2d; tapK = 0; return; }
  if (!p || had > 1 || ev.target !== renderer.domElement) return;
  const held = performance.now() - p.t0, moved = Math.hypot(ev.clientX - p.x, ev.clientY - p.y);
  if (held > 480 || moved > 11) return;
  const o = pickAt(ev.clientX, ev.clientY);
  if (o) { showPop(o); tapK = 0; return; }
  hidePop();
  const now = performance.now();
  if (!mode2d && now - tapK < 340 && Math.hypot(ev.clientX - p.x, ev.clientY - p.y) < 34) {
    camera.zoom = clamp(camera.zoom * 1.7, .3, 12); tapK = 0;
  } else tapK = now;
});
window.addEventListener('pointercancel', ev => { if (mode2d) m2up(ev); _ptrs.delete(ev.pointerId); ptr = null; clearTimeout(hangTimer); });
$('pop').querySelector('.x').onclick = hidePop;
$('clrRoute').onclick = clearRoute;
$('undoRoute').onclick = undoRoute;
addEventListener('keydown', e => {
  if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
  const k = e.key.toLowerCase();
  DUM.keys[k] = true;
  if (k === 'escape') hidePop();
  if ('wasd arrowup arrowdown arrowleft arrowright'.includes(k)) e.preventDefault();
});
addEventListener('keyup', e => { DUM.keys[e.key.toLowerCase()] = false; });
addEventListener('blur', () => { for (const k in DUM.keys) DUM.keys[k] = false; stick.active = false; });

/* ---- virtual joystick ---- */
const st = $('stick'), th = $('thumb');
{ const R = () => st.getBoundingClientRect().width / 2 - 14;
  const set = (dx, dy) => { const r = R(), m = Math.hypot(dx, dy) || 1, k = Math.min(1, m / r);
    const vx = dx / m * k, vy = dy / m * k;
    stick.v.x = vx; stick.v.y = vy;
    th.style.transform = 'translate(' + (vx * r) + 'px,' + (vy * r) + 'px)'; };
  st.addEventListener('pointerdown', ev => { try { st.setPointerCapture(ev.pointerId); } catch (e) { }
    stick.active = true;
    const b = st.getBoundingClientRect(); set(ev.clientX - b.left - b.width / 2, ev.clientY - b.top - b.height / 2);
    ev.preventDefault(); ev.stopPropagation(); });
  st.addEventListener('pointermove', ev => { if (!stick.active) return;
    const b = st.getBoundingClientRect(); set(ev.clientX - b.left - b.width / 2, ev.clientY - b.top - b.height / 2);
    ev.stopPropagation(); });
  const stop = ev => { stick.active = false; stick.v.x = stick.v.y = 0; th.style.transform = ''; ev.stopPropagation(); };
  st.addEventListener('pointerup', stop); st.addEventListener('pointercancel', stop);
}
$('stickBtn').onclick = () => {
  DUM.on = !DUM.on;
  st.classList.toggle('show', DUM.on); $('du').classList.toggle('show', DUM.on);
  $('stickBtn').classList.toggle('on', DUM.on);
  if (DUM.on) { setMode(false); $('hint').style.opacity = 1; $('hint').textContent = '摇杆 / WASD 移动假人 · 单指拖拽旋转视角'; }
  else if (!$('hint').textContent.includes('假人')) $('hint').style.opacity = 0;
};
$('follow').onclick = () => { DUM.follow = !DUM.follow; $('follow').classList.toggle('on', DUM.follow); };
$('resetD').onclick = () => { dummy.position.set(4, 0, 24); DUM.yaw = 0; };

/* ============ distant skyline ============ */
function farCity() {
  const cols = ['#c3c8cd', '#cdd2d4', '#b7bdc4', '#d3d6d2', '#aeb4bb'];
  for (let ring = 0; ring < 2; ring++) {
    const R = 235 + ring * 120, n = 44 + ring * 26;
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2 + rr(-.03, .03);
      const r = R + rr(-25, 25);
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      const w = rr(12, 30), d = rr(12, 30), h = rr(10, 42) * (1 + ring * .5);
      PP.far.push(part(BG(w, h, d), x, h / 2, z, cols[(i + ring) % cols.length], 0, rr(0, 1.5)));
    }
  }
  mergeParts(PP.far, { basic: true, fog: true });
}
farCity();

/* ============ flush merged batches ============ */
mergeParts(PP.parapet, { roughness: .9 });
mergeParts(PP.ac, { roughness: .85 });
mergeParts(PP.rub, { roughness: 1 });
mergeParts(PP.dorm, { roughness: .9 });
mergeParts(PP.tree, { roughness: 1 });
mergeParts(PP.pole, { roughness: .85 });
mergeParts(WIRE, { roughness: .9 });

/* ============ sun / sky ============ */
function setSun(t) {
  const hour = 7 + t * 11;
  const el = clamp(Math.sin((hour - 6) / 12 * Math.PI), .04, 1) * 1.15;
  const az = ((hour - 6) / 12) * Math.PI + .3;
  sun.position.set(Math.cos(az) * Math.cos(el), Math.sin(el), -Math.sin(az) * Math.cos(el)).multiplyScalar(300);
  const warm = clamp(1 - el, 0, 1);
  sun.color.copy(C('#fff4de')).lerp(C('#ff9a4a'), warm * .8);
  sun.intensity = 1.1 + el * 2.1;
  hemi.intensity = .5 + el * .55;
  hemi.color.copy(C('#8fa8c4')).lerp(C('#ffc79a'), warm * .6);
  const top = C('#9dbcd6').lerp(C('#4a5a78'), warm * .55), bot = C('#e6ded0').lerp(C('#e8a06a'), warm * .7);
  const mid = bot.clone().lerp(top, .5);
  const g = SKYT.image.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, '#' + top.getHexString()); gr.addColorStop(.55, '#' + mid.getHexString()); gr.addColorStop(1, '#' + bot.getHexString());
  g.fillStyle = gr; g.fillRect(0, 0, 8, 256); SKYT.needsUpdate = true;
  const fc = bot.clone().lerp(top, .35);
  if (scene.fog) scene.fog.color.copy(fc);
  $('sunv').textContent = hour.toFixed(1) + 'h';
}
setSun(.42);

/* ============ views ============ */
const VIEWS = {
  top: { p: [0, 200, 18], t: [0, 0, 0] },
  oblique: { p: [95, 120, 140], t: [0, 6, 0] },
};
let fly = null, orbit = false, driving = false;
function flyTo(v) { fly = { p0: activeCam.position.clone(), t0: controls.target.clone(),
  p1: new THREE.Vector3(...v.p), t1: new THREE.Vector3(...v.t), k: 0 }; }
document.querySelectorAll('[data-v]').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('[data-v]').forEach(x => x.classList.remove('on'));
  b.classList.add('on');
  if (mode2d) setMode(false);
  const k = b.dataset.v;
  orbit = k === 'orbit'; driving = k === 'street';
  controls.enabled = !driving;
  if (driving) {
    pcam.position.copy(driveCurve.getPointAt(du));
    pcam.up.set(0, 1, 0);
    pcam.lookAt(driveCurve.getPointAt((du + .02) % 1));
    activeCam = pcam;
  } else {
    if (activeCam !== camera) { camera.position.copy(pcam.position); controls.target.set(0, 6, 0); activeCam = camera; }
    if (VIEWS[k]) flyTo(VIEWS[k]);
  }
}));
const driveCurve = new THREE.CatmullRomCurve3([
  [-87, -90], [-87, -30], [-87, -10], [-60, -8.6], [0, -8.6], [60, -8.6], [92, -8.6],
  [99, -6], [92, -3], [30, -3], [-30, -3], [-78, -3], [-81, -20], [-81, -55], [-81, -90], [-84, -96]
].map(([x, z]) => new THREE.Vector3(x, 3.0, z)), true, 'catmullrom', .25);
let du = .28;

/* ============ UI ============ */
$('sun').addEventListener('input', e => setSun(e.target.value / 100));
function shadowQ(size) {
  renderer.shadowMap.enabled = size > 0; sun.castShadow = size > 0;
  if (size > 0) { sun.shadow.mapSize.set(size, size); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } }
  ['q1024', 'q2048', 'qoff'].forEach((id, i) => $(id).classList.toggle('on', [1024, 2048, 0][i] === size));
  scene.traverse(o => { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.needsUpdate = true); });
}
$('q1024').onclick = () => shadowQ(1024);
$('q2048').onclick = () => shadowQ(2048);
$('qoff').onclick = () => shadowQ(0);
$('fog').onclick = e => {
  const on = !!scene.fog;
  scene.fog = on ? null : new THREE.Fog(0xb9bfc4, 260, 700);
  e.currentTarget.classList.toggle('on', !on); setSun($('sun').value / 100);
};
$('dl').onclick = () => { renderer.render(scene, activeCam);
  renderer.domElement.toBlob(b => { const a = document.createElement('a');
    a.href = URL.createObjectURL(b); a.download = 'street3d_' + Date.now() + '.png'; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000); }); };
$('close').onclick = () => { $('panel').classList.add('hide'); $('gear').style.display = 'block'; };
$('gear').onclick = () => { $('panel').classList.remove('hide'); $('gear').style.display = 'none'; };
setTimeout(() => { const h = $('hint'); if (h) h.style.opacity = 0; }, 8000);

/* ============ loop ============ */
function m2half() {
  const a = innerWidth / innerHeight;
  return clamp(112 / Math.min(1, a), 10, 420);
}
function fitZoom() {
  const a = innerWidth / innerHeight;
  let s;
  if (mode2d) {
    /* 2D：保证 216m 见方的完整街区入画（竖屏时按短边适配） */
    s = m2half();
  } else {
    const dist = camera.position.distanceTo(controls.target);
    s = clamp(dist * .55, 10, 240);
  }
  camera.left = -s * a; camera.right = s * a; camera.top = s; camera.bottom = -s;
  camera.updateProjectionMatrix();
}
const _p = new THREE.Vector3(), _tan = new THREE.Vector3(), _t = new THREE.Vector3();
const _fp = new THREE.Vector3(), _fd = new THREE.Vector3();
let last = performance.now(), acc = 0, frames = 0;
function tick(now) {
  const dt = clamp((now - last) / 1000, 0, .05); last = now;
  for (const c of cars) {
    c.u = (c.u + dt * c.sp / c.r.len) % 1;
    c.r.c.getPointAt(c.u, _p); c.r.c.getTangentAt(c.u, _tan);
    c.obj.position.set(_p.x, 0, _p.z);
    c.obj.rotation.y = Math.atan2(_tan.x, _tan.z);
    c.obj.userData.info.x = +_p.x.toFixed(1); c.obj.userData.info.z = +_p.z.toFixed(1);
  }
  updateDummy(dt);
  if (mode2d) m2set();
  if (fly && !mode2d) {
    fly.k = Math.min(1, fly.k + dt / 1.2);
    const k = fly.k, e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    camera.position.lerpVectors(fly.p0, fly.p1, e);
    controls.target.lerpVectors(fly.t0, fly.t1, e);
    if (k >= 1) fly = null;
  }
  if (DUM.follow && !mode2d && !driving) {
    const dp = dummy.position, yaw = DUM.yaw;
    _fd.set(Math.sin(yaw), 0, Math.cos(yaw));
    controls.target.lerp(_t.copy(dp).add(_fd.clone().multiplyScalar(5)).setY(1.6), .1);
    _fp.copy(dp).addScaledVector(_fd, -11).setY(7.5);
    camera.position.lerp(_fp, .08);
    fly = null; orbit = false;
  }
  if (orbit && !fly && !DUM.follow) {
    const a = now * .00011;
    camera.position.set(Math.cos(a) * 185, 125, Math.sin(a) * 185);
    controls.target.set(0, 4, 0);
  }
  if (driving) {
    du = (du + dt * .013) % 1;
    driveCurve.getPointAt(du, _p); driveCurve.getPointAt((du + .012) % 1, _t);
    pcam.position.lerp(_p, .08);
    _t.y = 3.2; pcam.lookAt(_t);
    pcam.fov = 62; pcam.aspect = innerWidth / innerHeight; pcam.updateProjectionMatrix();
    renderer.render(scene, pcam);
  } else { if (!mode2d) controls.update(); if (!mode2d) fitZoom(); renderer.render(scene, camera); }
  syncSel();
  frames++; acc += dt;
  if (acc > .6) {
    $('stats').textContent = (frames / acc).toFixed(0) + ' FPS · ' +
      renderer.info.render.triangles.toLocaleString() + ' tris · ' + renderer.info.render.calls + ' calls';
    frames = 0; acc = 0;
  }
  requestAnimationFrame(tick);
}
addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); fitZoom();
  pcam.aspect = innerWidth / innerHeight; pcam.updateProjectionMatrix(); });
fitZoom();
requestAnimationFrame(t => { last = t; tick(t); });
setTimeout(() => { const b = $('boot'); if (b) { b.style.opacity = 0; setTimeout(() => b.remove(), 600); } }, 300);
window.__SCENE_READY__ = true;
window.__scene = scene; window.__cam = camera; window.__pcam = pcam;
window.__REG = () => REG.map(o => o.userData.info);
window.__pickAt = (x, y) => { const o = pickAt(x, y); return o ? o.userData.info : null; };
window.__dummyStep = (n, k) => { Object.assign(DUM.keys, { w: 0, s: 0, a: 0, d: 0, shift: 0 }, k || {}); for (let i = 0; i < n; i++) updateDummy(1 / 60); return dummy.position.toArray().map(v => +v.toFixed(2)); };
window.__stickV = () => ({ active: stick.active, v: { ...stick.v } });
