// Isometric low-poly city renderer (three.js) with HTML pin overlays.
import * as THREE from 'three';
import { WORLD, LAGOON, BRIDGES, PLACES, HOMES } from './data.js';

const ROADS_Z = [-38, -20, -6, 10, 24, 38];
const ROADS_X = [-30, -14, 2, 16, 38];
const PLOT = 8;

const rand = mulberry32(7);
function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const mat = (color, extra = {}) => new THREE.MeshLambertMaterial({ color, ...extra });
function box(w, h, d, color, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color));
  m.position.set(x, y + h / 2, z);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
function tree(x, z, palm = false) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, palm ? 2.2 : 1, 5), mat('#8a5a35'));
  trunk.position.y = palm ? 1.1 : 0.5; trunk.castShadow = true; g.add(trunk);
  if (palm) {
    for (let i = 0; i < 5; i++) {
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.06, 0.32), mat('#3f8a3a'));
      leaf.position.set(Math.cos(i * 1.25) * 0.55, 2.15, Math.sin(i * 1.25) * 0.55);
      leaf.rotation.y = -i * 1.25; leaf.rotation.z = -0.35; leaf.castShadow = true; g.add(leaf);
    }
  } else {
    const top = new THREE.Mesh(new THREE.IcosahedronGeometry(0.85, 0), mat(rand() > 0.5 ? '#3f8f45' : '#4fa04f'));
    top.position.y = 1.5; top.castShadow = true; g.add(top);
  }
  g.position.set(x, 0, z);
  return g;
}
function textTexture(text, { size = 64, color = 'rgba(255,255,255,0.85)', w = 1024, h = 128, font = 'Fredoka' } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.font = `700 ${size}px ${font}, sans-serif`; ctx.fillStyle = color;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.letterSpacing = '12px';
  ctx.fillText(text, w / 2, h / 2);
  const t = new THREE.CanvasTexture(c); t.anisotropy = 4;
  return t;
}
function groundText(text, x, z, width, opts) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(width, width / 8),
    new THREE.MeshBasicMaterial({ map: textTexture(text, opts), transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, 0.08, z);
  return m;
}
function billboardTexture(title, sub, bg) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 512, 256); g.addColorStop(0, bg[0]); g.addColorStop(1, bg[1]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, 512, 256);
  ctx.fillStyle = '#fff'; ctx.font = '700 46px Fredoka, sans-serif'; ctx.fillText(title, 32, 110);
  ctx.font = '500 26px "Plus Jakarta Sans", sans-serif'; ctx.globalAlpha = 0.85; ctx.fillText(sub, 32, 160);
  ctx.globalAlpha = 1; ctx.fillStyle = '#f5c542'; ctx.fillRect(32, 190, 150, 36);
  ctx.fillStyle = '#1a1a1a'; ctx.font = '700 20px "Plus Jakarta Sans", sans-serif'; ctx.fillText('Learn more', 50, 215);
  return new THREE.CanvasTexture(c);
}

function buildPlace(p) {
  const g = new THREE.Group();
  g.add(box(PLOT, 0.25, PLOT, '#e7e3da'));
  const c = p.color;
  const darker = new THREE.Color(c).multiplyScalar(0.75).getStyle();
  switch (p.style) {
    case 'hall': {
      g.add(box(5.5, p.h, 4, c, 0, 0.25, 0));
      const roof = new THREE.Mesh(new THREE.ConeGeometry(4.2, 1.8, 4), mat(darker));
      roof.position.y = 0.25 + p.h + 0.9; roof.rotation.y = Math.PI / 4; roof.scale.set(1, 1, 0.75); roof.castShadow = true;
      g.add(roof); break;
    }
    case 'shack':
      g.add(box(4, p.h, 3.4, c, 0, 0.25, 0));
      g.add(box(4.8, 0.25, 4.2, darker, 0, 0.25 + p.h, 0));
      g.add(box(1.2, 0.8, 1.2, '#d33', 2.6, 0.25, 2.4));
      break;
    case 'office':
      g.add(box(4.5, p.h, 4.5, c, 0, 0.25, 0));
      g.add(box(4.7, 0.2, 4.7, '#f4f4f4', 0, 0.25 + p.h, 0));
      g.add(box(1.4, 0.6, 1.4, '#9aa', 1, 0.45 + p.h, -1));
      break;
    case 'tower':
      g.add(box(3.6, p.h, 3.6, c, -0.6, 0.25, -0.6));
      g.add(box(2.4, p.h * 0.6, 2.4, darker, 2, 0.25, 2));
      for (let i = 1; i < p.h; i += 1.4) g.add(box(3.7, 0.12, 3.7, '#bcd3ea', -0.6, 0.25 + i, -0.6));
      break;
    case 'church':
      g.add(box(4, p.h, 5.5, c, 0, 0.25, 0.5));
      g.add(box(1.6, p.h + 3, 1.6, c, 0, 0.25, -2.6));
      { const s = new THREE.Mesh(new THREE.ConeGeometry(1.2, 2, 4), mat('#7a5a3a')); s.position.set(0, 0.25 + p.h + 4, -2.6); s.rotation.y = Math.PI / 4; g.add(s); }
      break;
    case 'stalls': {
      const cols = ['#e74c3c', '#f1c40f', '#3498db', '#9b59b6', '#2ecc71', '#e67e22'];
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++)
        g.add(box(1.9, p.h, 1.9, cols[(i * 3 + j) % cols.length], -2.3 + i * 2.3, 0.25, -2.3 + j * 2.3));
      break;
    }
    case 'campus':
      g.add(box(6, p.h, 2.4, c, 0, 0.25, -2.2));
      g.add(box(2.4, p.h * 0.8, 3, '#d9d2c0', -2, 0.25, 1.6));
      g.add(box(3, 0.1, 3, '#5c9e4f', 1.8, 0.25, 1.8));
      break;
    case 'stadium': {
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.2, p.h, 20, 1, true), mat(c, { side: THREE.DoubleSide }));
      ring.position.y = 0.25 + p.h / 2; ring.castShadow = true; g.add(ring);
      const pitch = new THREE.Mesh(new THREE.CircleGeometry(3.2, 20), mat('#4caf50'));
      pitch.rotation.x = -Math.PI / 2; pitch.position.y = 0.3; g.add(pitch);
      break;
    }
    case 'park':
      g.add(box(7.4, 0.12, 7.4, '#78b85f', 0, 0.25, 0));
      for (let i = 0; i < 5; i++) g.add(tree(-2.8 + rand() * 5.6, -2.8 + rand() * 5.6));
      if (p.id === 'jibowu') { g.children.length = 1; g.add(box(7, 0.1, 7, '#9ea4aa', 0, 0.25, 0));
        for (let i = 0; i < 3; i++) g.add(box(1.4, 1.3, 3, '#f2c12e', -2.4 + i * 2.4, 0.35, 0)); }
      break;
    case 'forest':
      g.add(box(7.4, 0.12, 7.4, '#5f9e4c', 0, 0.25, 0));
      for (let i = 0; i < 12; i++) g.add(tree(-3 + rand() * 6, -3 + rand() * 6));
      g.add(box(7, 0.15, 0.6, '#8a5a35', 0, 2.2, 0));
      break;
    case 'club':
      g.add(box(5, p.h, 4, c, 0, 0.25, 0));
      { const neon = new THREE.Mesh(new THREE.BoxGeometry(5.1, 0.25, 4.1), new THREE.MeshBasicMaterial({ color: '#ff3ec9' }));
        neon.position.y = 0.25 + p.h - 0.4; g.add(neon); }
      break;
    case 'mall':
      g.add(box(6.6, p.h, 5, c, 0, 0.25, -0.6));
      g.add(box(6.6, 0.3, 1.2, '#fff', 0, 0.25 + p.h - 0.6, 2.4));
      if (p.id === 'polanco') for (let i = 0; i < 3; i++) g.add(box(1, 0.6, 1.8, ['#e33', '#fff', '#222'][i], -2.5 + i * 2.5, 0.25, 2.6));
      break;
    case 'jetty':
      g.children.length = 0;
      g.add(box(1.6, 0.25, 8, '#9a6b3f', 0, 0, 0));
      g.add(box(2, 0.8, 4, '#fff', 2.2, -0.2, 1));
      g.add(box(1, 0.6, 1.6, '#3a7bd5', 2.2, 0.6, 1));
      break;
    default: g.children.length = 0;
  }
  g.position.set(p.pos[0], 0, p.pos[1]);
  g.traverse((o) => { o.userData.pickId = p.id; });
  return g;
}

function buildHome(h) {
  const g = new THREE.Group();
  g.add(box(PLOT, 0.25, PLOT, '#e9e5dc'));
  const hues = { mushin: '#c9a27a', yaba: '#e2c48f', surulere: '#d6b38c', ikoyi: '#f2f2f2', bananaIsland: '#ffffff' };
  const n = h.id === 'bananaIsland' || h.id === 'ikoyi' ? 2 : 4;
  for (let i = 0; i < n; i++) {
    const x = n === 2 ? (i ? 1.8 : -1.8) : (i % 2 ? 1.8 : -1.8);
    const z = n === 2 ? 0 : (i < 2 ? -1.8 : 1.8);
    const big = n === 2;
    g.add(box(big ? 3 : 2.6, big ? 2.6 : 1.6, big ? 5 : 2.6, hues[h.id], x, 0.25, z));
    const roof = new THREE.Mesh(new THREE.ConeGeometry(big ? 2.6 : 2, 1, 4), mat(big ? '#5a6b7c' : '#a4523a'));
    roof.position.set(x, 0.25 + (big ? 2.6 : 1.6) + 0.5, z); roof.rotation.y = Math.PI / 4; roof.castShadow = true;
    g.add(roof);
  }
  if (big(h)) g.add(box(2, 0.1, 1.4, '#58b7e8', 0, 0.26, 3));
  g.position.set(h.pos[0], 0, h.pos[1]);
  g.traverse((o) => { o.userData.pickId = 'home:' + h.id; });
  return g;
}
const big = (h) => h.id === 'bananaIsland' || h.id === 'ikoyi';

export function makeSim(look) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 1.3, 10), mat(look.top || '#1d2433'));
  body.position.y = 0.9; body.castShadow = true;
  const legs = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.36, 0.4, 10), mat('#2b2b33'));
  legs.position.y = 0.2;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 10), mat(look.skin || '#7a4a2c'));
  head.position.y = 1.9; head.castShadow = true;
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.44, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2.2), mat('#15110e'));
  hair.position.y = 1.95;
  g.add(legs, body, head, hair);
  return g;
}

// Route along the bridge when crossing the lagoon.
function route(from, to) {
  const north = (z) => z < LAGOON.z0;
  if (north(from.z) === north(to.z)) return [to];
  const bx = BRIDGES.reduce((a, b) => (Math.abs(b - (from.x + to.x) / 2) < Math.abs(a - (from.x + to.x) / 2) ? b : a));
  const zIn = north(from.z) ? LAGOON.z0 - 2 : LAGOON.z1 + 2;
  const zOut = north(from.z) ? LAGOON.z1 + 2 : LAGOON.z0 - 2;
  return [new THREE.Vector3(bx, 0, zIn), new THREE.Vector3(bx, 0, zOut), to];
}

export function createCity(host, { onPick }) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.appendChild(renderer.domElement);
  const pins = document.createElement('div'); pins.className = 'pins'; host.appendChild(pins);

  const scene = new THREE.Scene();
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, -500, 500);
  const target = new THREE.Vector3(0, 0, 0);
  const OFFSET = new THREE.Vector3(60, 70, 60);
  let zoom = innerWidth < 700 ? 0.8 : 1.0;

  scene.add(new THREE.HemisphereLight('#ffffff', '#9fbf8a', 1.1));
  const sun = new THREE.DirectionalLight('#fff6e0', 1.3);
  sun.position.set(40, 80, 20); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -70, right: 70, top: 70, bottom: -70, near: 1, far: 250 });
  scene.add(sun);

  // Ground, lagoon, roads
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.w + 60, WORLD.d + 60), mat('#a9cd90'));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const water = new THREE.Mesh(new THREE.BoxGeometry(WORLD.w + 60, 0.1, LAGOON.z1 - LAGOON.z0),
    mat('#5b9fd6', { emissive: '#1d4a7a', emissiveIntensity: 0.15 }));
  water.position.set(0, 0.03, (LAGOON.z0 + LAGOON.z1) / 2); scene.add(water);
  scene.add(groundText('LAGOS LAGOON', 26, (LAGOON.z0 + LAGOON.z1) / 2, 34));
  scene.add(groundText('ISLAND', -40, LAGOON.z1 + 2.2, 14, { color: 'rgba(255,255,255,0.7)' }));
  scene.add(groundText('MAINLAND', -40, LAGOON.z0 - 2, 16, { color: 'rgba(255,255,255,0.7)' }));
  const roadMat = mat('#a3a8ae');
  for (const z of ROADS_Z) {
    if (z > LAGOON.z0 - 1 && z < LAGOON.z1 + 1) continue;
    const r = new THREE.Mesh(new THREE.BoxGeometry(WORLD.w + 20, 0.08, 1.6), roadMat); r.position.set(0, 0.04, z); r.receiveShadow = true; scene.add(r);
  }
  for (const x of ROADS_X) for (const [z0, z1] of [[-WORLD.d / 2, LAGOON.z0], [LAGOON.z1, WORLD.d / 2]]) {
    const r = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, z1 - z0), roadMat); r.position.set(x, 0.05, (z0 + z1) / 2); r.receiveShadow = true; scene.add(r);
  }
  for (const x of BRIDGES) {
    const b = box(2.4, 0.3, LAGOON.z1 - LAGOON.z0 + 2, '#c4c7cb', x, 0.1, (LAGOON.z0 + LAGOON.z1) / 2); scene.add(b);
    for (const s of [-1.3, 1.3]) scene.add(box(0.15, 0.5, LAGOON.z1 - LAGOON.z0 + 2, '#8e9399', x + s, 0.4, (LAGOON.z0 + LAGOON.z1) / 2));
  }

  // Places + homes
  const pickables = [];
  const placeIndex = new Map();
  for (const p of PLACES) { const g = buildPlace(p); scene.add(g); pickables.push(g); placeIndex.set(p.id, p); }
  for (const h of HOMES) { const g = buildHome(h); scene.add(g); pickables.push(g); }

  // Scatter trees away from plots, roads and water
  const occupied = [...PLACES.map((p) => p.pos), ...HOMES.map((h) => h.pos)];
  for (let i = 0; i < 220; i++) {
    const x = (rand() - 0.5) * WORLD.w, z = (rand() - 0.5) * WORLD.d;
    if (z > LAGOON.z0 - 1.5 && z < LAGOON.z1 + 1.5) continue;
    if (ROADS_Z.some((r) => Math.abs(r - z) < 1.5) || ROADS_X.some((r) => Math.abs(r - x) < 1.5)) continue;
    if (occupied.some(([px, pz]) => Math.abs(px - x) < 5 && Math.abs(pz - z) < 5)) continue;
    scene.add(tree(x, z, rand() > 0.55));
  }

  // Billboards (invented promo art)
  const boards = [
    [-34, -8, 'Jollof Wars', 'Finals this Saturday', ['#3a1c71', '#d76d77']],
    [-4, -8, 'Eko Data Plan', '10GB for ₦1,000', ['#0f2027', '#2c5364']],
    [20, 8.6, 'Rent a Sea Plot', 'Float your brand on the lagoon', ['#11998e', '#38ef7d']],
    [-28, 26, 'Danfo Express', 'Mile 2 → CMS in 20 min*', ['#f7971e', '#ffd200']],
  ];
  for (const [x, z, t, s, bg] of boards) {
    const g = new THREE.Group();
    const face = new THREE.Mesh(new THREE.PlaneGeometry(6, 3), new THREE.MeshBasicMaterial({ map: billboardTexture(t, s, bg), side: THREE.DoubleSide }));
    face.position.y = 3.6; g.add(face, box(6.2, 3.2, 0.15, '#222', 0, 2.0, -0.1), box(0.25, 2.2, 0.25, '#333', 0, 0, -0.1));
    g.position.set(x, 0, z); g.rotation.y = Math.PI / 4; scene.add(g);
  }

  // Rain
  const rainGeo = new THREE.BufferGeometry();
  const rainPos = new Float32Array(1500 * 3);
  for (let i = 0; i < 1500; i++) { rainPos[i * 3] = (rand() - 0.5) * 120; rainPos[i * 3 + 1] = rand() * 40; rainPos[i * 3 + 2] = (rand() - 0.5) * 100; }
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  const rain = new THREE.Points(rainGeo, new THREE.PointsMaterial({ color: '#dbe9f7', size: 0.18, transparent: true, opacity: 0.7 }));
  rain.visible = false; scene.add(rain);

  // Sea plots
  const seaGroup = new THREE.Group(); scene.add(seaGroup);

  // Pins
  const pinEls = [];
  function addPin(id, emoji, name, pos, cls = '') {
    const el = document.createElement('button');
    el.className = 'pin ' + cls; el.dataset.id = id;
    el.innerHTML = `<span class="pin-bubble">${emoji}</span><span class="pin-name">${name}</span>`;
    el.addEventListener('click', (e) => { e.stopPropagation(); onPick(id); });
    pins.appendChild(el);
    const rec = { el, pos: new THREE.Vector3(pos[0], pos[2] ?? 6, pos[1]) };
    pinEls.push(rec); return rec;
  }
  for (const p of PLACES) addPin(p.id, p.emoji, p.name, [p.pos[0], p.pos[1], p.soon ? 1.5 : Math.max(p.h + 2.6, 4)], p.soon ? 'soon named' : '');
  const homePins = HOMES.map((h) => addPin('home:' + h.id, h.emoji, h.name, [h.pos[0], h.pos[1], 4.6], 'home'));

  // Sims
  let me = null; let walk = null;
  const npcs = [];
  function spawnNpc(look) {
    const s = makeSim(look); s.scale.setScalar(0.8);
    const start = PLACES[Math.floor(rand() * (PLACES.length - 1))];
    s.position.set(start.pos[0] + 4.5, 0, start.pos[1] + 4.5);
    scene.add(s); npcs.push({ s, path: [], speed: 5 + rand() * 3 });
  }
  function npcNext(n) {
    const p = PLACES[Math.floor(rand() * (PLACES.length - 1))];
    n.path = route(n.s.position, new THREE.Vector3(p.pos[0] + 4.5, 0, p.pos[1] + 4.5));
  }

  // Camera/control
  function resize() {
    const w = host.clientWidth, h = host.clientHeight;
    renderer.setSize(w, h);
    const half = 34 / zoom; const aspect = w / h;
    Object.assign(cam, { left: -half * aspect, right: half * aspect, top: half, bottom: -half });
    cam.updateProjectionMatrix();
  }
  addEventListener('resize', resize); resize();

  const pointers = new Map(); let dragDist = 0; let pinch0 = 0; let zoom0 = zoom;
  const right = new THREE.Vector3(1, 0, -1).normalize();
  const fwd = new THREE.Vector3(-1, 0, -1).normalize();
  const el = renderer.domElement;
  el.addEventListener('pointerdown', (e) => {
    el.setPointerCapture(e.pointerId); pointers.set(e.pointerId, { x: e.clientX, y: e.clientY }); dragDist = 0;
    if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); zoom0 = zoom; }
  });
  el.addEventListener('pointermove', (e) => {
    const prev = pointers.get(e.pointerId); if (!prev) return;
    const dx = e.clientX - prev.x, dy = e.clientY - prev.y;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      zoom = clampZoom(zoom0 * Math.hypot(a.x - b.x, a.y - b.y) / pinch0); resize(); return;
    }
    dragDist += Math.abs(dx) + Math.abs(dy);
    const unit = (cam.right - cam.left) / host.clientWidth;
    target.addScaledVector(right, -dx * unit).addScaledVector(fwd, dy * unit / 0.64);
    clampTarget(); follow = false;
  });
  const end = (e) => {
    const wasTap = pointers.size === 1 && dragDist < 6;
    pointers.delete(e.pointerId);
    if (wasTap && e.type === 'pointerup') pick(e);
  };
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  el.addEventListener('wheel', (e) => { e.preventDefault(); zoom = clampZoom(zoom * (e.deltaY > 0 ? 0.9 : 1.1)); resize(); }, { passive: false });
  const clampZoom = (z) => Math.min(3.2, Math.max(0.55, z));
  const clampTarget = () => { target.x = Math.max(-55, Math.min(55, target.x)); target.z = Math.max(-45, Math.min(45, target.z)); };

  const ray = new THREE.Raycaster();
  function pick(e) {
    const r = el.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), cam);
    const hit = ray.intersectObjects(pickables, true).find((h) => h.object.userData.pickId);
    if (hit) onPick(hit.object.userData.pickId);
  }

  let follow = false;
  const tmp = new THREE.Vector3();
  let last = performance.now();
  let active = true;
  function frame(now) {
    if (!active) { last = now; requestAnimationFrame(frame); return; }
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (walk && me) {
      const tgt = walk.path[0];
      const d = tmp.copy(tgt).sub(me.position); d.y = 0;
      const step = walk.speed * dt;
      if (d.length() <= step) { me.position.copy(tgt); walk.path.shift(); if (!walk.path.length) { const r = walk.resolve; walk = null; r(); } }
      else { d.normalize(); me.position.addScaledVector(d, step); me.rotation.y = Math.atan2(d.x, d.z); me.position.y = Math.abs(Math.sin(now / 90)) * 0.15; }
    }
    if (follow && me) target.lerp(me.position, 0.06);
    for (const n of npcs) {
      if (!n.path.length) { if (rand() < 0.01) npcNext(n); continue; }
      const d = tmp.copy(n.path[0]).sub(n.s.position); d.y = 0;
      const step = n.speed * dt;
      if (d.length() <= step) { n.s.position.copy(n.path[0]); n.path.shift(); }
      else { d.normalize(); n.s.position.addScaledVector(d, step); n.s.rotation.y = Math.atan2(d.x, d.z); }
    }
    if (rain.visible) {
      const a = rainGeo.attributes.position;
      for (let i = 0; i < a.count; i++) { let y = a.getY(i) - 40 * dt; if (y < 0) y += 40; a.setY(i, y); }
      a.needsUpdate = true;
    }
    seaGroup.children.forEach((m, i) => { m.position.y = 0.15 + Math.sin(now / 600 + i) * 0.08; });
    cam.position.copy(target).add(OFFSET); cam.lookAt(target);
    renderer.render(scene, cam);
    // Project pins
    const w = host.clientWidth, h = host.clientHeight;
    const showNames = zoom > 1.6;
    for (const p of pinEls) {
      tmp.copy(p.pos).project(cam);
      const x = (tmp.x * 0.5 + 0.5) * w, y = (-tmp.y * 0.5 + 0.5) * h;
      const off = x < -60 || x > w + 60 || y < -60 || y > h + 60;
      p.el.style.display = off ? 'none' : '';
      if (!off) p.el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
      p.el.classList.toggle('show-name', showNames);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  return {
    setActive(v) { active = v; pins.style.display = v ? '' : 'none'; if (v) resize(); },
    placeById: (id) => placeIndex.get(id),
    setWeather(w) { rain.visible = w === 'rainy'; },
    setMe(look, at) {
      if (me) scene.remove(me);
      walk = null;
      if (!look) { me = null; return; }
      me = makeSim(look); me.position.set(at[0] + 4.5, 0, at[1] + 4.5); scene.add(me);
      target.set(me.position.x, 0, me.position.z); follow = true;
    },
    walkTo(pos, speed = 8) {
      if (!me) return Promise.resolve();
      follow = true;
      return new Promise((resolve) => { walk = { path: route(me.position, new THREE.Vector3(pos[0] + 4.5, 0, pos[1] + 4.5)), speed, resolve }; });
    },
    focus(pos) { target.set(pos[0], 0, pos[1]); follow = false; },
    spawnNpcs(looks) { looks.forEach(spawnNpc); },
    setMyHome(homeId) { homePins.forEach((p) => p.el.classList.toggle('mine', p.el.dataset.id === 'home:' + homeId)); },
    setSeaPlots(plots) {
      seaGroup.clear();
      pinEls.filter((p) => p.el.dataset.id.startsWith('sea:')).forEach((p) => { p.el.remove(); pinEls.splice(pinEls.indexOf(p), 1); });
      for (const sp of plots) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(sp.w * 1.2, 0.25, sp.h * 1.2), mat(sp.color || '#fff'));
        m.position.set(sp.x, 0.15, sp.z); seaGroup.add(m);
        addPin('sea:' + sp.id, sp.emoji || '📣', sp.title, [sp.x, sp.z, 1.4], 'sea');
      }
    },
  };
}
