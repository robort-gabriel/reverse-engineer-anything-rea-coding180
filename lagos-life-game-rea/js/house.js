// Isometric cut-away house interior: rooms, half-walls, tappable furniture,
// and a Sim that walks tile-by-tile around walls (BFS).
import * as THREE from 'three';
import { GRID, FURNITURE } from './life.js';
import { makeSim } from './city.js';

const T = 2; // world units per tile
const W = GRID.w * T, D = GRID.d * T;
const ITEMS = new Map(FURNITURE.map((f) => [f.id, f]));

// Wall segments on tile edges: [axis, line, from, to, height]
// 'z' = wall along x at z=line (blocks moving between rows line-1 and line)
const WALLS = [
  ['z', 0, 0, 12, 3.2], ['x', 0, 0, 10, 3.2],              // back walls (full)
  ['z', 10, 0, 12, 0.5], ['x', 12, 0, 10, 0.5],            // front cut-away
  ['x', 6, 0, 3, 1.5],                                      // living | bedroom
  ['z', 4, 6, 9, 1.5], ['z', 4, 10, 12, 1.5],               // bedroom | kitchen (door 9..10)
  ['z', 7, 3, 5, 1.5], ['z', 7, 6, 8, 1.5],                 // bathroom top (door 5..6)
  ['x', 3, 7, 10, 1.5], ['x', 8, 7, 10, 1.5],               // bathroom sides
];
const DOOR = { x: 0, z: 8 }; // front door tile (left wall)

const mat = (c, o = {}) => new THREE.MeshLambertMaterial({ color: c, ...o });
function box(w, h, d, c, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c));
  m.position.set(x, y + h / 2, z); m.castShadow = true; m.receiveShadow = true; return m;
}
const tileCenter = (x, z) => new THREE.Vector3((x + 0.5) * T - W / 2, 0, (z + 0.5) * T - D / 2);

function floorTexture(kind) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  if (kind === 'wood') {
    for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#8a5a34' : '#7c5130'; g.fillRect(0, i * 32, 256, 32); g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(((i * 97) % 256), i * 32, 2, 32); }
  } else {
    const a = kind === 'bath' ? ['#dfe3e6', '#d3d8dc'] : ['#d9cdb8', '#cdbfa7'];
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { g.fillStyle = a[(i + j) % 2]; g.fillRect(i * 64, j * 64, 64, 64); }
    g.strokeStyle = 'rgba(0,0,0,.08)'; for (let i = 0; i <= 4; i++) { g.strokeRect(i * 64, 0, 0, 256); g.strokeRect(0, i * 64, 256, 0); }
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
function floorPatch(x0, z0, x1, z1, kind, y = 0.02) {
  const t = floorTexture(kind); t.repeat.set((x1 - x0) / 2, (z1 - z0) / 2);
  const m = new THREE.Mesh(new THREE.PlaneGeometry((x1 - x0) * T, (z1 - z0) * T), new THREE.MeshLambertMaterial({ map: t }));
  m.rotation.x = -Math.PI / 2; m.position.set(((x0 + x1) / 2) * T - W / 2, y, ((z0 + z1) / 2) * T - D / 2);
  m.receiveShadow = true; return m;
}

// Procedural furniture mesh per shape; origin at footprint centre.
function furnitureMesh(f, color) {
  const g = new THREE.Group();
  const c = color || f.color;
  const fw = f.w * T, fd = f.d * T;
  switch (f.shape) {
    case 'bed': g.add(box(fw * 0.9, 0.45, fd * 0.85, c), box(fw * 0.9, 0.12, fd * 0.85, '#f4f1ea', 0, 0.45, 0), box(0.6, 0.18, fd * 0.6, '#ffffff', -fw * 0.32, 0.57, 0)); break;
    case 'cooler': g.add(box(1.2, 0.8, 0.8, c), box(1.25, 0.2, 0.85, '#f2f2f2', 0, 0.8, 0)); break;
    case 'stove': g.add(box(1.1, 0.8, 1.0, '#a4774a'), box(0.6, 0.3, 0.6, c, 0, 0.8, 0), box(0.4, 0.25, 0.4, '#222', 0, 1.1, 0)); break;
    case 'fridge': g.add(box(1.2, 2.6, 1.1, c), box(0.04, 1.2, 0.05, '#888', 0.3, 1.2, 0.57)); break;
    case 'toilet': g.add(box(0.7, 0.55, 0.9, c), box(0.8, 0.7, 0.3, c, 0, 0.4, -0.45)); break;
    case 'bucket': { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.32, 0.7, 14), mat(c)); b.position.y = 0.35; b.castShadow = true; g.add(b, box(0.6, 0.12, 0.6, '#d33', 0.6, 0, 0.4)); break; }
    case 'shower': g.add(box(1.6, 0.1, 1.6, '#b9c3cc'), box(0.08, 2.6, 0.08, '#aaa', -0.7, 0, -0.7), box(0.5, 0.08, 0.5, '#ccc', -0.45, 2.5, -0.45)); break;
    case 'chair': g.add(box(0.8, 0.5, 0.8, c), box(0.8, 0.9, 0.12, c, 0, 0.5, -0.35)); break;
    case 'armchair': g.add(box(1.3, 0.55, 1.2, c), box(1.3, 0.9, 0.3, c, 0, 0.55, -0.45), box(0.25, 0.4, 1.2, c, -0.55, 0.55, 0), box(0.25, 0.4, 1.2, c, 0.55, 0.55, 0)); break;
    case 'sofa': g.add(box(fw * 0.9, 0.55, 1.2, c), box(fw * 0.9, 0.9, 0.3, c, 0, 0.55, -0.45), box(0.25, 0.4, 1.2, c, -fw * 0.42, 0.55, 0), box(0.25, 0.4, 1.2, c, fw * 0.42, 0.55, 0)); break;
    case 'table': { const top = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 0.12, 24), mat(c)); top.position.y = 1; top.castShadow = true;
      g.add(top, box(0.2, 1, 0.2, '#7a5634'), box(0.7, 0.5, 0.7, '#7a4a2c', 1.5, 0, 0), box(0.7, 0.5, 0.7, '#7a4a2c', -1.5, 0, 0)); break; }
    case 'fan': { g.add(box(0.5, 0.08, 0.5, '#ddd'), box(0.08, 1.6, 0.08, '#ccc', 0, 0, 0)); const h = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.15, 16), mat(c)); h.rotation.x = Math.PI / 2; h.position.y = 1.7; g.add(h); break; }
    case 'tv': g.add(box(fw * 0.8, 0.6, 0.8, '#6b4a2b'), box(fw * 0.7, 1.2, 0.1, c, 0, 0.6, -0.2)); break;
    case 'radio': g.add(box(0.9, 0.7, 0.8, '#d8c5a4'), box(0.7, 0.4, 0.4, c, 0, 0.7, 0)); break;
    case 'desk': g.add(box(1.6, 0.9, 1.0, c), box(0.8, 0.05, 0.55, '#333', 0, 0.9, 0), box(0.8, 0.5, 0.05, '#2a2f38', 0, 0.92, -0.25)); break;
    case 'guitar': { const b = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 8), mat(c)); b.scale.set(1, 1.3, 0.4); b.position.y = 0.5; g.add(b, box(0.1, 1.0, 0.06, '#3a2410', 0, 0.8, 0)); break; }
    case 'weights': g.add(box(1.4, 0.1, 0.8, '#555'), box(1.0, 0.12, 0.12, '#999', 0, 0.3, 0), box(0.2, 0.4, 0.4, c, -0.5, 0.15, 0), box(0.2, 0.4, 0.4, c, 0.5, 0.15, 0)); break;
    case 'mirror': g.add(box(0.8, 1.9, 0.12, c), box(0.65, 1.7, 0.02, '#cfe6f5', 0, 0.1, 0.07)); break;
    case 'plant': { const p = box(0.6, 0.5, 0.6, '#b46b3a'); g.add(p); for (let i = 0; i < 5; i++) g.add(box(0.12, 1.2 + i * 0.1, 0.12, c, Math.cos(i) * 0.15, 0.5, Math.sin(i) * 0.15)); break; }
    case 'painting': g.add(box(1.4, 1.0, 0.08, '#3a2410', 0, 1.4, 0), box(1.2, 0.8, 0.02, c, 0, 1.5, 0.05)); break;
    case 'rug': g.add(box(fw * 0.85, 0.04, fd * 0.85, c)); break;
    default: g.add(box(1, 1, 1, c));
  }
  return g;
}

export function createHouse(host, { onPickItem, onFloor }) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, -200, 200);
  const target = new THREE.Vector3(0, 0, 1);
  let angle = 0; // multiples of 90° around the house
  let zoom = 1;

  const hemi = new THREE.HemisphereLight('#ffffff', '#8aa070', 1.0); scene.add(hemi);
  const sun = new THREE.DirectionalLight('#fff4dc', 1.2);
  sun.position.set(-20, 40, 25); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.04;
  Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20 }); scene.add(sun);
  const lamp = new THREE.PointLight('#ffcf8a', 0, 60, 1.4); lamp.position.set(0, 6, 0); scene.add(lamp);

  // Lawn + plinth + floors
  const lawn = new THREE.Mesh(new THREE.CircleGeometry(28, 48), mat('#7fa85f')); lawn.rotation.x = -Math.PI / 2; lawn.position.y = -0.3; lawn.receiveShadow = true; scene.add(lawn);
  scene.add(box(W + 4, 0.3, D + 4, '#8d7f70', 0, -0.3, 0));
  scene.add(floorPatch(0, 0, 12, 10, 'tile'));
  scene.add(floorPatch(6, 0, 12, 4, 'wood', 0.04));
  scene.add(floorPatch(3, 7, 8, 10, 'bath', 0.04));

  const wallMat = mat('#efe3c8');
  const lights = [];
  for (const [axis, line, a, b, h] of WALLS) {
    const len = (b - a) * T;
    const geo = axis === 'z' ? new THREE.BoxGeometry(len, h, 0.25) : new THREE.BoxGeometry(0.25, h, len);
    const m = new THREE.Mesh(geo, wallMat); m.castShadow = true; m.receiveShadow = true;
    const mid = ((a + b) / 2) * T;
    if (axis === 'z') m.position.set(mid - W / 2, h / 2, line * T - D / 2); else m.position.set(line * T - W / 2, h / 2, mid - D / 2);
    scene.add(m);
    const capGeo = axis === 'z' ? new THREE.BoxGeometry(len + 0.25, 0.12, 0.35) : new THREE.BoxGeometry(0.35, 0.12, len + 0.25);
    const cap = new THREE.Mesh(capGeo, mat('#3a3330')); cap.position.copy(m.position); cap.position.y = h; scene.add(cap);
    if (h > 3) for (let i = a + 1; i < b; i += 2) {
      const l = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), new THREE.MeshBasicMaterial({ color: '#fff3c4' }));
      if (axis === 'z') l.position.set(i * T - W / 2, h - 0.35, line * T - D / 2 + 0.2); else l.position.set(line * T - W / 2 + 0.2, h - 0.35, i * T - D / 2);
      scene.add(l); lights.push(l);
    }
  }
  // Window + door
  scene.add(box(0.1, 1.2, 3, '#9cc9e8', W / 2 - 0.02 - 24, 1.3, -2));
  scene.add(box(0.3, 2.4, 1.6, '#6b3f22', -W / 2, 0, DOOR.z * T - D / 2 + T / 2));

  // Blocked edges for pathfinding
  const blocked = new Set();
  const edge = (x1, z1, x2, z2) => [x1, z1, x2, z2].join(',');
  for (const [axis, line, a, b] of WALLS) for (let i = a; i < b; i++) {
    if (axis === 'z') { blocked.add(edge(i, line - 1, i, line)); blocked.add(edge(i, line, i, line - 1)); }
    else { blocked.add(edge(line - 1, i, line, i)); blocked.add(edge(line, i, line - 1, i)); }
  }

  const itemGroup = new THREE.Group(); scene.add(itemGroup);
  let occupied = new Set();
  let placed = [];

  function bfs(from, goals) {
    const key = (x, z) => x + ',' + z;
    const goalSet = new Set(goals.map((g) => key(g.x, g.z)));
    const prev = new Map([[key(from.x, from.z), null]]);
    const q = [from];
    while (q.length) {
      const c = q.shift();
      if (goalSet.has(key(c.x, c.z))) {
        const path = []; let k = key(c.x, c.z);
        while (k) { const [x, z] = k.split(',').map(Number); path.unshift({ x, z }); k = prev.get(k); }
        return path;
      }
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const n = { x: c.x + dx, z: c.z + dz };
        if (n.x < 0 || n.z < 0 || n.x >= GRID.w || n.z >= GRID.d) continue;
        if (blocked.has(edge(c.x, c.z, n.x, n.z))) continue;
        if (occupied.has(key(n.x, n.z)) && !goalSet.has(key(n.x, n.z))) continue;
        const k = key(n.x, n.z); if (prev.has(k)) continue;
        prev.set(k, key(c.x, c.z)); q.push(n);
      }
    }
    return null;
  }
  function neighbours(it) {
    const f = ITEMS.get(it.item); const out = [];
    for (let x = it.x - 1; x <= it.x + f.w; x++) for (let z = it.z - 1; z <= it.z + f.d; z++) {
      const inside = x >= it.x && x < it.x + f.w && z >= it.z && z < it.z + f.d;
      const corner = (x < it.x || x >= it.x + f.w) && (z < it.z || z >= it.z + f.d);
      if (inside || corner || x < 0 || z < 0 || x >= GRID.w || z >= GRID.d || occupied.has(x + ',' + z)) continue;
      out.push({ x, z });
    }
    return out;
  }

  // Sim
  let me = null, simTile = { x: 3, z: 4 }, walk = null;

  // Camera + input
  function resize() {
    const w = host.clientWidth || innerWidth, h = host.clientHeight || innerHeight;
    renderer.setSize(w, h);
    const half = (w < 600 ? 19 : 15) / zoom, aspect = w / h;
    Object.assign(cam, { left: -half * aspect, right: half * aspect, top: half, bottom: -half }); cam.updateProjectionMatrix();
  }
  addEventListener('resize', resize); resize();
  const el = renderer.domElement;
  const pointers = new Map(); let dragDist = 0, pinch0 = 0, zoom0 = 1;
  el.addEventListener('pointerdown', (e) => { el.setPointerCapture(e.pointerId); pointers.set(e.pointerId, { x: e.clientX, y: e.clientY }); dragDist = 0;
    if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y); zoom0 = zoom; } });
  el.addEventListener('pointermove', (e) => {
    const p = pointers.get(e.pointerId); if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y; pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) { const [a, b] = [...pointers.values()]; zoom = Math.min(2.5, Math.max(0.6, zoom0 * Math.hypot(a.x - b.x, a.y - b.y) / pinch0)); resize(); return; }
    dragDist += Math.abs(dx) + Math.abs(dy);
    const unit = (cam.right - cam.left) / host.clientWidth;
    const right = new THREE.Vector3(1, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), angle).normalize();
    const fwd = new THREE.Vector3(-1, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), angle).normalize();
    target.addScaledVector(right, -dx * unit).addScaledVector(fwd, dy * unit / 0.64);
    target.x = Math.max(-18, Math.min(18, target.x)); target.z = Math.max(-16, Math.min(16, target.z));
  });
  const up = (e) => { const tap = pointers.size === 1 && dragDist < 6; pointers.delete(e.pointerId); if (tap && e.type === 'pointerup') pick(e); };
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  el.addEventListener('wheel', (e) => { e.preventDefault(); zoom = Math.min(2.5, Math.max(0.6, zoom * (e.deltaY > 0 ? 0.9 : 1.1))); resize(); }, { passive: false });

  const ray = new THREE.Raycaster();
  const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  function pick(e) {
    const r = el.getBoundingClientRect();
    ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), cam);
    const hit = ray.intersectObjects(itemGroup.children, true)[0];
    if (hit) { let o = hit.object; while (o && o.userData.idx == null) o = o.parent; if (o) return onPickItem(o.userData.idx); }
    const p = new THREE.Vector3();
    if (ray.ray.intersectPlane(floorPlane, p)) {
      const x = Math.floor((p.x + W / 2) / T), z = Math.floor((p.z + D / 2) / T);
      if (x >= 0 && z >= 0 && x < GRID.w && z < GRID.d) onFloor?.({ x, z });
    }
  }

  let active = true, last = performance.now();
  const tmp = new THREE.Vector3();
  const OFF = new THREE.Vector3(30, 36, 30);
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!active) return;
    if (walk && me) {
      const tgt = walk.points[0];
      const d = tmp.copy(tgt).sub(me.position); d.y = 0;
      const step = 6 * dt;
      if (d.length() <= step) { me.position.copy(tgt); walk.points.shift(); simTile = walk.tiles.shift() || simTile; if (!walk.points.length) { const r = walk.resolve; walk = null; me.position.y = 0; r(); } }
      else { d.normalize(); me.position.addScaledVector(d, step); me.rotation.y = Math.atan2(d.x, d.z); me.position.y = Math.abs(Math.sin(now / 90)) * 0.12; }
    }
    if (me?.userData.busy) me.position.y = Math.abs(Math.sin(now / 250)) * 0.06;
    cam.position.copy(target).add(OFF.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), angle)); cam.lookAt(target);
    renderer.render(scene, cam);
  }
  requestAnimationFrame(frame);

  return {
    setActive(v) { active = v; if (v) { resize(); } },
    rotate() { angle += Math.PI / 2; },
    setNight(night) {
      hemi.intensity = night ? 0.35 : 1.0; sun.intensity = night ? 0.15 : 1.2; lamp.intensity = night ? 2.2 : 0;
      lights.forEach((l) => l.material.color.set(night ? '#ffe7a3' : '#fff8e0'));
    },
    setItems(items) {
      itemGroup.clear(); occupied = new Set(); placed = items;
      items.forEach((it, idx) => {
        const f = ITEMS.get(it.item); if (!f) return;
        const m = furnitureMesh(f, it.color);
        const cx = (it.x + f.w / 2) * T - W / 2, cz = (it.z + f.d / 2) * T - D / 2;
        m.position.set(cx, 0.03, cz);
        m.traverse((o) => { o.castShadow = true; });
        m.userData.idx = idx; itemGroup.add(m);
        if (f.shape !== 'rug' && f.shape !== 'painting') for (let x = it.x; x < it.x + f.w; x++) for (let z = it.z; z < it.z + f.d; z++) occupied.add(x + ',' + z);
      });
    },
    freeSpot(f) {
      for (let z = 0; z < GRID.d; z++) for (let x = 0; x < GRID.w; x++) {
        let ok = x + f.w <= GRID.w && z + f.d <= GRID.d;
        for (let i = x; ok && i < x + f.w; i++) for (let j = z; ok && j < z + f.d; j++) {
          if (occupied.has(i + ',' + j) || (i === simTile.x && j === simTile.z)) ok = false;
          if (i > x && blocked.has(edge(i - 1, j, i, j))) ok = false;
          if (j > z && blocked.has(edge(i, j - 1, i, j))) ok = false;
        }
        if (ok && !(x === DOOR.x && z === DOOR.z)) return { x, z };
      }
      return null;
    },
    setMe(look, atDoor = false) {
      if (me) scene.remove(me);
      walk = null;
      if (!look) { me = null; return; }
      me = makeSim(look); if (atDoor) simTile = { ...DOOR };
      me.position.copy(tileCenter(simTile.x, simTile.z)); scene.add(me);
    },
    setBusy(b) { if (me) me.userData.busy = b; },
    // Walk to an item (or a tile). Resolves false when unreachable.
    walkTo(dest) {
      if (!me) return Promise.resolve(false);
      const goals = dest.idx != null ? neighbours(placed[dest.idx]) : [dest];
      const path = bfs(simTile, goals);
      if (!path) return Promise.resolve(false);
      path.shift();
      if (!path.length) {
        if (dest.idx != null) faceItem(dest.idx);
        return Promise.resolve(true);
      }
      return new Promise((res) => {
        walk = { tiles: [...path], points: path.map((t) => tileCenter(t.x, t.z)), resolve: () => { if (dest.idx != null) faceItem(dest.idx); res(true); } };
      });
    },
    toDoor() { return this.walkTo({ ...DOOR }); },
  };
  function faceItem(idx) {
    const it = placed[idx]; const f = ITEMS.get(it.item);
    const c = new THREE.Vector3((it.x + f.w / 2) * T - W / 2, 0, (it.z + f.d / 2) * T - D / 2);
    me.rotation.y = Math.atan2(c.x - me.position.x, c.z - me.position.z);
  }
}
