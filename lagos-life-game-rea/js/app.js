// Eko Life — app shell: routing, auth, the life-sim loop, and all UI surfaces.
// Everything persists in localStorage; there is no backend.
import { createCity } from './city.js';
import { createHouse } from './house.js';
import { createChat, seedChats, addNote } from './chat.js';
import { sfx, setGroove, ambience, soundPrefs, setSoundPref } from './sound.js';
import { PLACES, HOMES, HEADLINES, TIPS, WEATHER, POLICIES, NPC_NAMES, GIST, LOOKS } from './data.js';
import {
  NEEDS, SKILLS, XP_PER_LEVEL, TRAITS, CAREERS, SHIFT_MINS, TRANSPORT, CATEGORIES, FURNITURE,
  STARTER_ITEMS, PERKS, MISSIONS,
} from './life.js';

const KEY = 'eko-life:v1';
const MIN_PER_SEC = 10;            // game minutes per real second
const TERM_DAYS = 3;
const SEA_PRICE = 100;
const ITEM = new Map(FURNITURE.map((f) => [f.id, f]));
const AREAS = {
  shrine: 'Ikeja', viewing: 'Ojuelegba', amala: 'Surulere', cchub: 'Yaba', market: 'Balogun', fitness: 'Ikeja GRA', library: 'Onikan',
  salon: 'Mushin', church: 'Ikorodu Road', radio: 'Ikeja', unilag: 'Akoka', mindspace: 'Yaba', stadium: 'Surulere', snooker: 'Oshodi',
  jibowu: 'Yaba', freedom: 'Lagos Island', marina: 'Marina', court: 'Lagos Island', eko: 'Victoria Island', quilox: 'Victoria Island',
  casino: 'Victoria Island', palms: 'Lekki', ivory: 'Ikoyi', mako: 'Lekki', polanco: 'Lekki', canopy: 'Lekki', cruise: 'Victoria Island', obo: 'Lagos Lagoon',
};
// Skill XP earned by place activities (place.action → {skill: xp})
const PLACE_SKILL = {
  'shrine.dance': { dance: 30 }, 'cchub.build': { coding: 35 }, 'cchub.meetup': { charisma: 15 }, 'market.sell': { hustle: 35 },
  'fitness.workout': { fitness: 35 }, 'church.choir': { music: 25 }, 'radio.host': { charisma: 30 }, 'unilag.lecture': { coding: 15, charisma: 10 },
  'unilag.tutor': { charisma: 20 }, 'stadium.jog': { fitness: 20 }, 'stadium.fiveaside': { fitness: 25 }, 'jibowu.conductor': { hustle: 30 },
  'freedom.perform': { comedy: 35 }, 'marina.bank': { charisma: 30 }, 'court.case': { charisma: 35 }, 'quilox.party': { dance: 30 },
  'viewing.bet': { charisma: 10 }, 'salon.hair': { charisma: 5 },
};

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const naira = (n) => '₦' + Math.round(n).toLocaleString('en-NG');
const short = (n) => (n >= 1e6 ? '₦' + (n / 1e6).toFixed(n >= 1e7 ? 0 : 1) + 'M' : n >= 1e4 ? '₦' + Math.round(n / 1e3) + 'k' : naira(n));
const pick = (a, r = Math.random()) => a[Math.floor(r * a.length)];
const clamp = (n) => Math.max(0, Math.min(100, n));
const hashStr = (s) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7) >>> 0;
const mins = (m) => (m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? ' ' + Math.round(m % 60) + 'm' : ''}` : `${Math.round(m)}m`);
const today = () => new Date().toISOString().slice(0, 10);

// ── Persistence ──────────────────────────────────────
function load() { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } }
function save() { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch {} }
function freshWorld() {
  const r = Math.random;
  return {
    clock: 8 * 60,
    visits: 0,
    npcHomes: NPC_NAMES.map((n) => ({ username: n, home: pick(HOMES, r()).id, look: { skin: pick(LOOKS.skin, r()), top: pick(LOOKS.top, r()) } })),
    gov: newTerm(1, { username: 'tolu_eko', slogan: 'Light for every street 💡', policy: 'transport', announcement: 'Danfo and keke fares are half price this term!' }),
    sea: [
      { id: 's1', x: -30, z: 1, w: 2, h: 2, title: 'Mama Put Catering', emoji: '🍛', color: '#ffd166', link: '', owner: 'kemi_owambe', ends: 30 },
      { id: 's2', x: -6, z: 4, w: 1, h: 1, title: 'Lekki Phone Repairs', emoji: '📱', color: '#8ecae6', link: '', owner: 'chidi.vibes', ends: 30 },
      { id: 's3', x: 34, z: 0, w: 3, h: 2, title: 'Yaba Coding Bootcamp', emoji: '💻', color: '#b8f2c9', link: '', owner: 'ada_codes', ends: 30 },
      { id: 's4', x: 6, z: -1, w: 2, h: 1, title: 'Aso-Ebi Fabrics', emoji: '🧵', color: '#f4a3c0', link: '', owner: 'amaka_lekki', ends: 30 },
    ],
  };
}
function newTerm(n, governor) {
  const cands = [...NPC_NAMES].sort(() => Math.random() - 0.5).slice(0, 4)
    .map((u) => ({ username: u, slogan: pick(['Lagos go better!', 'No more traffic 🚦', 'Jollof for all 🍛', 'Free wifi everywhere 📶', 'Fix the roads first']), policy: pick(Object.keys(POLICIES)), votes: Math.floor(Math.random() * 40) }));
  return { term: n, ends: null, governor, candidates: cands, cabinet: [] };
}
function newSim() {
  const traits = [...TRAITS].sort(() => Math.random() - 0.5).slice(0, 2).map((t) => t.id);
  return {
    stats: { hunger: 70, energy: 80, fun: 60, social: 60, hygiene: 80, bladder: 80 },
    money: 25000, at: 'home', queue: [], current: null, walking: false, votedTerm: 0,
    items: STARTER_ITEMS.map((i) => ({ ...i })), skills: {}, career: null, sparkles: 5, perks: [], traits,
    xp: 0, missions: null, streak: { last: null, n: 0 }, ...seedChats(),
    friends: [], ledger: [{ t: 'Moved to Lagos', v: 25000 }], log: ['Moved to Lagos with ₦25,000 and big dreams'],
    earned: 0, days: 1, mode: 'danfo',
  };
}
function upgrade(s) {
  const base = newSim();
  for (const k of Object.keys(base)) if (s[k] === undefined) s[k] = base[k];
  for (const n of NEEDS) if (s.stats[n.id] === undefined) s.stats[n.id] = 80;
  if (s.perks.includes?.('car')) { s.perks = s.perks.filter((p) => p !== 'car'); s.car = true; }
  s.queue = s.queue.filter((q) => q.kind); // drop v1 queue entries
  if (s.current && !s.current.kind) s.current = null;
  if (s.msgs) { s.notes.push(...s.msgs.map((m) => ({ emoji: m.emoji, title: m.from, text: m.text, t: Date.now(), read: !!m.read }))); delete s.msgs; }
  if (!s.grant2m) { s.money += 2000000; s.ledger.push({ t: 'Welcome bonus', v: 2000000 }); s.grant2m = true; }
  s.walking = false;
  return s;
}

let db = load() || { users: {}, session: null, saves: {}, consent: null, world: freshWorld() };
db.world.visits++;
Object.values(db.saves).forEach(upgrade);
if (db.world.gov.ends == null) db.world.gov.ends = db.world.clock + TERM_DAYS * 1440;
// Built-in demo account so there is always something to log in to (login in README.md)
if (!db.users.demo) {
  db.users.demo = { name: 'Demo Player', username: 'demo', email: 'demo@eko-life.test', pass: await hash('ekolife-demo'), dob: '2000-01-01', look: { skin: LOOKS.skin[3], top: LOOKS.top[1] }, home: 'yaba', created: Date.now() };
  db.saves.demo = upgrade(newSim());
}
save();

const user = () => (db.session ? db.users[db.session] : null);
const sim = () => (db.session ? db.saves[db.session] : null);
const day = () => Math.floor(db.world.clock / 1440) + 1;
const hour = () => Math.floor((db.world.clock % 1440) / 60);
const isNight = () => hour() < 6 || hour() >= 19;
const timeParts = () => { const m = Math.floor(db.world.clock) % 1440; const h = Math.floor(m / 60); return [`${((h + 11) % 12) + 1}:${String(m % 60).padStart(2, '0')}`, h < 12 ? 'AM' : 'PM']; };
const weekday = () => ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][(day() - 1) % 7];
function daily() {
  const r = hashStr('day' + day());
  return { weather: WEATHER[r % WEATHER.length], headline: HEADLINES[(r >> 3) % HEADLINES.length], tip: TIPS[(r >> 6) % TIPS.length] };
}
const policy = () => POLICIES[db.world.gov.governor.policy] || {};
const homeOf = (u) => HOMES.find((h) => h.id === u.home) || HOMES[0];
const placeName = (id) => (id === 'home' ? 'home' : city.placeById(id)?.name || id);
const has = (perk) => sim()?.perks.includes(perk);
const skillLevel = (s, id) => Math.floor((s.skills[id] || 0) / XP_PER_LEVEL);
const level = (s) => 1 + Math.floor(s.xp / 600);
function addMoney(v, label) {
  const s = sim(); s.money += v; s.ledger.push({ t: label, v }); if (v > 0) sfx('cash'); if (s.ledger.length > 40) s.ledger.shift();
}

// ── Stages ───────────────────────────────────────────
const city = createCity($('#city'), { onPick });
city.spawnNpcs(db.world.npcHomes.slice(0, 10).map((h) => h.look));
city.setWeather(daily().weather.id);
city.setSeaPlots(db.world.sea);
const house = createHouse($('#house'), { onPickItem: openItem, onFloor: walkOnFloor });
const chat = createChat({
  db: () => db, sim, user, save, toast, addMoney, naira, esc, sfx,
  rerender: () => renderPhone(),
  isOpen: () => !$('#phone').hidden && phoneApp === 'messages',
  openPlace: (id) => { $('#phone').hidden = true; openPlace(id); },
  boost: (fx) => { const s = sim(); for (const [k, v] of Object.entries(fx)) s.stats[k] = clamp(s.stats[k] + v); updateHud(); },
});
house.setActive(false);

let view = 'map'; // map | home | buy
function setView(v) {
  view = v;
  const inside = v === 'home' || v === 'buy';
  $('#house').hidden = !inside; $('#city').hidden = inside;
  house.setActive(inside); city.setActive(!inside);
  const loggedIn = !!user();
  $('#chips').hidden = loggedIn && v !== 'map';
  $('#announce').hidden = (loggedIn && v !== 'map') || !db.world.gov.governor.announcement;
  if (loggedIn) buildHud();
}
function placeSims() {
  const u = user(), s = sim();
  if (!u) { city.setMe(null); city.setMyHome(null); house.setMe(null); return; }
  s.walking = false;
  house.setItems(s.items);
  house.setMe(s.at === 'home' ? u.look : null);
  const pos = s.at === 'home' ? homeOf(u).pos : (city.placeById(s.at)?.pos || homeOf(u).pos);
  city.setMe(u.look, pos);
  city.setMyHome(u.home);
}

// ── Toasts ───────────────────────────────────────────
function toast(msg) {
  if (/^(💸|🚧|🚫)|^You need|^Not enough|^Finish or/.test(msg)) sfx('error'); else if (msg.startsWith('⚠️')) sfx('warn');
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
  $('#toasts').appendChild(t); setTimeout(() => t.remove(), 3200);
}

// ── Sheets ───────────────────────────────────────────
let sheetRender = null;
function openSheet(render) {
  closeOverlays();
  sheetRender = render; sfx('open');
  $('#sheet-body').innerHTML = render();
  $('#sheet').hidden = false; $('#sheet-backdrop').hidden = false;
}
function refreshSheet() {
  const typing = document.activeElement?.matches('input, select, textarea') && $('#sheet').contains(document.activeElement);
  if (sheetRender && !$('#sheet').hidden && !typing) { const st = $('#sheet').scrollTop; $('#sheet-body').innerHTML = sheetRender(); $('#sheet').scrollTop = st; }
}
function closeSheet() { $('#sheet').hidden = true; $('#sheet-backdrop').hidden = true; sheetRender = null; $('#cc')?.remove(); }
function closeOverlays() { closeSheet(); $('#phone').hidden = true; }
$('#sheet-backdrop').addEventListener('click', closeSheet);
addEventListener('keydown', (e) => { if (e.key === 'Escape') closeOverlays(); });

const guestCta = `<div class="stack" style="margin-top:12px">
  <a class="btn primary big block" href="#/auth">Create your Lagosian · free</a>
  <a class="btn soft block" href="#/auth/login">I have an account · Log in</a></div>`;
const head = (icon, title, sub) => `<div class="sheet-head"><div class="sheet-icon">${icon}</div><div><h2>${esc(title)}</h2>${sub ? `<p class="sub">${esc(sub)}</p>` : ''}</div></div>`;

// ── Action helpers ───────────────────────────────────
function costOf(a) {
  const food = (a.fx?.hunger || 0) > 20;
  return (a.cost || 0) * (food && policy().foodDiscount ? policy().foodDiscount : 1);
}
function tagsFor(a, skill) {
  const fx = Object.entries(a.fx || {}).map(([k, v]) => `<span class="tag ${v < 0 ? 'neg' : ''}">${v > 0 ? '+' : '−'}${k[0].toUpperCase() + k.slice(1)}</span>`);
  const sk = Object.keys(skill || a.skill || {}).map((k) => `<span class="tag skill">+${SKILLS.find((x) => x.id === k)?.label}</span>`);
  return `<div class="tags">${[...fx, ...sk].join('')}</div>`;
}
function actCard(a, attr, extraSkill) {
  const c = costOf(a);
  const price = a.earn ? `<span class="price earn">+${naira(a.earn * (policy().wageBoost || 1))}</span>` : c ? `<span class="price">${naira(c)}</span>` : '<span class="price free">Free</span>';
  return `<button class="actcard" ${attr}><span class="top"><span class="em">${a.emoji}</span><span class="dur">⏱ ${mins(a.mins)}</span></span>${price}<span class="name">${esc(a.label)}</span>${tagsFor(a, extraSkill)}</button>`;
}
function actionOf(q) {
  if (q.kind === 'home') return ITEM.get(sim().items[q.idx]?.item)?.acts.find((a) => a.id === q.actId);
  if (q.kind === 'place') return city.placeById(q.place)?.actions.find((a) => a.id === q.actId);
  if (q.kind === 'shift') { const c = CAREERS.find((x) => x.id === sim().career?.id); return c && { id: 'shift', label: `Work a shift (${c.label})`, emoji: c.emoji, mins: SHIFT_MINS, fx: { energy: -10, fun: -5, hunger: -5 } }; }
  if (q.kind === 'gist') return { id: 'gist', label: `Gist at ${placeName(q.place)}`, emoji: '💬', mins: 30, fx: { social: 25, fun: 5 } };
  return null;
}
const destOf = (q) => (q.kind === 'home' || q.kind === 'walk' ? 'home' : q.place);

function enqueue(q) {
  const s = sim();
  s.queue.push(q); save(); updateHud(); closeOverlays();
  toast(`${q.emoji} Queued: ${q.label}`);
}

// ── Mood / feelings ──────────────────────────────────
function feelings(s) {
  const f = [];
  const st = s.stats;
  if (st.hunger < 10) f.push(['😫', 'Starving', 'Belle dey cry. Eat something now!', -30]); else if (st.hunger < 30) f.push(['😋', 'Hungry', 'Something small would do.', -10]);
  if (st.energy < 15) f.push(['🥱', 'Exhausted', 'Your Sim can barely stand.', -20]); else if (st.energy < 30) f.push(['😴', 'Tired', 'A nap would help.', -8]);
  if (st.bladder < 15) f.push(['😣', 'Pressed', 'Find a toilet. Fast.', -25]);
  if (st.hygiene < 20) f.push(['🤢', 'Smelly', 'People are noticing.', -15]);
  if (st.fun < 20) f.push(['😐', 'Bored', 'Life is too dull.', -10]);
  if (st.social < 20) f.push(['🥺', 'Lonely', 'Go and gist with somebody.', -10]);
  const value = s.items.reduce((a, i) => a + (ITEM.get(i.item)?.price || 0), 0);
  if (value >= 60000) f.push(['🏡', 'Fine House', 'Your place is looking good.', 15]); else if (value < 30000) f.push(['🏚️', 'Bare House', 'Buy some furniture.', -5]);
  if (s.money >= 1e6) f.push(['🥂', 'Soft Life', 'Money dey. Enjoyment dey.', 10]); else if (s.money < 2000) f.push(['💸', 'Broke', 'Wallet is crying.', -10]);
  if (NEEDS.every((n) => st[n.id] > 70)) f.push(['✨', 'Feeling Fresh', 'Every need is sorted.', 15]);
  return f;
}
function mood(s) {
  const score = feelings(s).reduce((a, x) => a + x[3], 0);
  if (score >= 20) return { label: 'Happy', emoji: '😄', score };
  if (score >= 0) return { label: 'Fine', emoji: '🙂', score };
  if (score >= -20) return { label: 'Uncomfortable', emoji: '😕', score };
  return { label: 'Miserable', emoji: '😫', score };
}

// ── Missions / streak ────────────────────────────────
function ensureMissions(s) {
  if (s.missions?.day === day()) return;
  const r = hashStr(db.session + day());
  const pool = [...MISSIONS]; const list = [];
  for (let i = 0; i < 3; i++) list.push(pool.splice((r >> (i * 3)) % pool.length, 1)[0].id);
  s.missions = { day: day(), list, done: [] };
}
function checkMissions(s, ev) {
  ensureMissions(s);
  for (const id of s.missions.list) {
    if (s.missions.done.includes(id)) continue;
    const m = MISSIONS.find((x) => x.id === id);
    if (m.match(ev)) {
      s.missions.done.push(id); s.sparkles += 3; toast(`🎯 Mission done: ${m.label} · +3✨`); sfx('sparkle');
      if (s.missions.done.length === 3) { s.sparkles += 5; toast('🏆 All missions done today · +5✨'); }
    }
  }
}
function touchStreak(s) {
  const t = today(); if (s.streak.last === t) return;
  const y = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  s.streak.n = s.streak.last === y ? s.streak.n + 1 : 1; s.streak.last = t; s.sparkles += 1;
}

// ── Travel + queue processing ────────────────────────
let gen = 0; // bumps on logout to abandon in-flight walks
function fareOf(s, m) {
  if (s.car) return 0;
  const half = db.world.gov.governor.policy === 'transport' && (m.id === 'danfo' || m.id === 'keke');
  return m.fare * (half ? 0.5 : 1);
}
async function travel(dest, modeId) {
  const s = sim(), u = user(), my = gen;
  const mode = TRANSPORT.find((t) => t.id === modeId) || TRANSPORT[0];
  const fare = fareOf(s, mode);
  if (fare && fare > s.money) { toast(`💸 Not enough for ${mode.label}. Trekking instead.`); return travel(dest, 'trek'); }
  if (fare) addMoney(-fare, `${mode.label} fare`);
  s.walking = true; updateHud();
  if (s.at === 'home' && (view === 'home' || view === 'buy')) { await house.toDoor(); if (my !== gen) return false; sfx('door'); }
  ambience(s.car ? 'ride' : mode.id);
  const from = s.at === 'home' ? homeOf(u).pos : city.placeById(s.at).pos;
  city.setMe(u.look, from);
  if (view !== 'map') setView('map');
  const speed = (s.car ? 22 : mode.speed) * (policy().travelSpeed || 1);
  await city.walkTo(dest === 'home' ? homeOf(u).pos : city.placeById(dest).pos, speed);
  ambience(null);
  if (my !== gen) return false;
  s.walking = false; s.at = dest; save();
  if (dest === 'home') { house.setMe(u.look, true); setView('home'); }
  return true;
}
let processing = false;
async function startNext() {
  const s = sim(); if (!s || s.current || s.walking || processing || !s.queue.length) return;
  processing = true;
  try { await runNext(s); } finally { processing = false; }
}
async function runNext(s) {
  const q = s.queue[0]; const my = gen;
  const dest = destOf(q);
  if (s.at !== dest) {
    const ok = await travel(dest, q.mode || s.mode); if (!ok || my !== gen) return;
    if (q.kind === 'travel') { s.queue.shift(); arrived(dest); return; }
  }
  if (q.kind === 'travel') { s.queue.shift(); return; }
  if (q.kind === 'home' || q.kind === 'walk') {
    if (view !== 'home' && view !== 'buy') setView('home');
    s.walking = true; updateHud();
    const ok = await house.walkTo(q.kind === 'walk' ? { x: q.x, z: q.z } : { idx: q.idx });
    if (my !== gen) return;
    s.walking = false;
    if (q.kind === 'walk') { s.queue.shift(); return; }
    if (!ok) { s.queue.shift(); toast("🚧 Can't reach that. Move some furniture."); return; }
  }
  s.queue.shift();
  const a = actionOf(q); if (!a) return;
  const c = costOf(a);
  if (c > s.money) { toast(`💸 Not enough naira for “${a.label}”`); save(); updateHud(); return; }
  if (c) addMoney(-c, a.label);
  s.current = { ...q, label: a.label, emoji: a.emoji, total: a.mins, left: a.mins };
  if (q.kind === 'gist') sfx('simlish');
  house.setBusy(true); save(); updateHud();
}
function arrived(dest) {
  if (dest !== 'home') { toast(`📍 You've reached ${placeName(dest)}`); openPlace(dest); }
}
function finish(s) {
  const q = s.current; const a = actionOf(q);
  house.setBusy(false);
  s.current = null;
  if (!a) return;
  let msg = `${a.emoji} ${a.label}`;
  if (a.earn) { const pay = a.earn * (policy().wageBoost || 1); addMoney(pay, a.label); s.earned += pay; msg += ` · +${naira(pay)}`; }
  if (a.perk === 'car') s.car = true;
  if (a.gamble) { if (Math.random() < 0.4) { addMoney(5000, 'Casino win'); msg += ' · WON ₦5,000 🎉'; } else msg += ' · lost 😩'; }
  const skill = { ...(a.skill || {}), ...(q.kind === 'place' ? PLACE_SKILL[`${q.place}.${q.actId}`] : {}) };
  if (q.kind === 'shift') {
    const c = CAREERS.find((x) => x.id === s.career.id);
    const pay = c.ranks[s.career.rank][1] * (policy().wageBoost || 1);
    addMoney(pay, `${c.ranks[s.career.rank][0]} shift`); s.earned += pay;
    s.career.perf = Math.min(100, s.career.perf + 25 * (has('hustleJuice') ? 1.25 : 1));
    s.career.shifts++; skill[c.skill] = 30;
    msg += ` · +${naira(pay)}`;
  }
  if (q.kind === 'gist') {
    const who = pick(NPC_NAMES);
    if (!s.friends.includes(who)) { s.friends.push(who); msg += ` · new friend @${who}`; }
    chat.met(s, who, placeName(q.place));
  }
  for (const [k, v] of Object.entries(skill)) {
    const before = skillLevel(s, k);
    s.skills[k] = (s.skills[k] || 0) + v * (has('fastLearner') ? 1.2 : 1);
    if (skillLevel(s, k) > before) { toast(`📈 ${SKILLS.find((x) => x.id === k).label} is now level ${skillLevel(s, k)}`); sfx('levelup'); }
  }
  const lvl = level(s); s.xp += a.mins / 2 + 10; if (level(s) > lvl) { s.sparkles += 2; toast(`⭐ Level ${level(s)}! +2✨`); }
  if (q.kind === 'shift') checkPromotion(s);
  checkMissions(s, { kind: q.kind, place: q.place, skill: Object.keys(skill).length ? skill : null, fx: a.fx });
  s.log.push(msg); if (s.log.length > 40) s.log.shift();
  toast('✅ ' + msg);
}
function promoReqs(s) {
  const c = CAREERS.find((x) => x.id === s.career.id);
  const r = s.career.rank;
  return [
    ['Performance', `${Math.round(s.career.perf)}%`, s.career.perf >= 100],
    [`Shifts as ${c.ranks[r][0]}`, `${Math.min(s.career.shifts, 2)}/2`, s.career.shifts >= 2],
    [`${SKILLS.find((x) => x.id === c.skill).label} level`, `${skillLevel(s, c.skill)}/${(r + 1) * 2}`, skillLevel(s, c.skill) >= (r + 1) * 2],
  ];
}
function checkPromotion(s) {
  const c = CAREERS.find((x) => x.id === s.career.id);
  if (s.career.rank >= c.ranks.length - 1) return;
  if (promoReqs(s).every((r) => r[2])) {
    s.career.rank++; s.career.perf = 50; s.career.shifts = 0;
    toast(`🎉 Promoted to ${c.ranks[s.career.rank][0]}!`); sfx('promo');
    addNote(s, '💼', `HR @ ${c.label}`, `Congratulations on your promotion to ${c.ranks[s.career.rank][0]}. Your new pay is ${naira(c.ranks[s.career.rank][1])} per shift.`);
  }
}

// ── Tick ─────────────────────────────────────────────
const PARTY = ['quilox', 'eko', 'cruise', 'palms', 'mako', 'ivory', 'casino'], LIVE = ['shrine', 'freedom', 'church'];
let lastTick = performance.now();
const warned = {};
function tick() {
  const now = performance.now();
  const dtMin = ((now - lastTick) / 1000) * MIN_PER_SEC; lastTick = now;
  const w = db.world, prevDay = day(), wasNight = isNight();
  w.clock += dtMin;
  if (Math.random() < 0.3) pick(w.gov.candidates).votes += 1 + Math.floor(Math.random() * 3);
  if (w.clock >= w.gov.ends) endTerm();
  const s = sim();
  if (s) {
    const weatherFx = daily().weather.fx;
    for (const n of NEEDS) {
      let mult = 1; for (const p of PERKS) if (s.perks.includes(p.id) && p.decay?.[n.id]) mult *= p.decay[n.id];
      s.stats[n.id] = clamp(s.stats[n.id] - (n.decay / 60) * dtMin * mult + ((weatherFx[n.id] || 0) / 60) * dtMin);
    }
    if (s.current) {
      const a = actionOf(s.current);
      if (!a) s.current = null;
      else {
        const step = Math.min(dtMin, s.current.left);
        const comfort = s.current.kind === 'home' ? homeOf(user()).comfort : 1;
        for (const [k, v] of Object.entries(a.fx || {})) {
          let gain = (v / a.mins) * step;
          if (gain > 0) {
            if (k === 'fun') gain *= policy().funBoost || 1;
            if (k === 'energy' && a.id === 'sleep' && has('powerNapper')) gain *= 1.3;
            gain *= comfort;
          }
          const dec = NEEDS.find((n) => n.id === k)?.decay || 0;
          s.stats[k] = clamp(s.stats[k] + gain + (dec / 60) * step * 0.6);
        }
        s.current.left -= step;
        if (s.current.left <= 0) finish(s);
      }
    } else startNext();
    const low = [];
    for (const n of NEEDS) {
      if (s.stats[n.id] < 15 && !warned[n.id]) { warned[n.id] = true; low.push(`${n.emoji} ${n.label}`); }
      if (s.stats[n.id] > 30) warned[n.id] = false;
    }
    if (low.length) toast(`⚠️ Very low: ${low.join(', ')}`);
  }
  if (day() !== prevDay) newDay();
  if (wasNight !== isNight()) applyNight();
  setGroove(!s ? (isNight() ? 'night' : 'day') : PARTY.includes(s.at) ? 'party' : LIVE.includes(s.at) ? 'highlife' : isNight() ? 'night' : 'day');
  if (s) { chat.tick(); updateHud(); }
}
function applyNight() {
  const n = isNight();
  house.setNight(n); $('#house').classList.toggle('night', n); $('#city').classList.toggle('night', n);
}
function newDay() {
  const d = daily();
  city.setWeather(d.weather.id);
  db.world.sea = db.world.sea.map((p) => ({ ...p, ends: p.ends - 1 })).filter((p) => p.ends > 0);
  city.setSeaPlots(db.world.sea);
  for (const [name, s] of Object.entries(db.saves)) {
    const h = HOMES.find((x) => x.id === db.users[name]?.home);
    if (h?.rent) { s.money -= h.rent; s.ledger.push({ t: `Rent · ${h.name}`, v: -h.rent }); }
    s.days++;
    if (s.career && s.career.shifts === 0) s.career.perf = Math.max(0, s.career.perf - 10);
  }
  toast(`🌅 ${weekday()} · ${d.weather.emoji} ${d.weather.label} — ${d.headline}`);
  save();
}
function endTerm() {
  const g = db.world.gov;
  const ranked = [...g.candidates].sort((a, b) => b.votes - a.votes);
  const win = ranked[0];
  const next = newTerm(g.term + 1, { username: win.username, slogan: win.slogan, policy: win.policy, announcement: `${POLICIES[win.policy].label} starts today!` });
  next.ends = db.world.clock + TERM_DAYS * 1440;
  next.cabinet = ranked.slice(1, 3).map((c, i) => ({ username: c.username, role: ['🚧 Commissioner for Works', '🍲 Commissioner for Food'][i] }));
  db.world.gov = next;
  toast(`🏛️ @${win.username} is the new Governor!`);
  renderChrome(); save();
}
setInterval(tick, 250);
setInterval(save, 3000);
addEventListener('beforeunload', save);

// ── Guest chrome ─────────────────────────────────────
function renderChrome() {
  const u = user();
  const online = 10 + Object.keys(db.users).length;
  $('#topbar').hidden = !!u; $('#dock').hidden = !!u; $('#hud').hidden = !u;
  $('#topbar').innerHTML = `
    <a class="brand" href="#/"><span class="crown">👑</span><span>Eko Life</span></a>
    <span class="stat-live">${online} Sims online</span><span class="stat-visits">👀 ${db.world.visits.toLocaleString()} visits</span>
    <span class="spacer"></span>
    <a class="btn primary" href="#/auth">Sign up</a><a class="btn soft" href="#/auth/login">Log in</a>`;
  const g = db.world.gov;
  const homes = db.world.npcHomes.length + Object.keys(db.users).length;
  $('#chips').innerHTML = `<button class="chip" data-chip="gov">🏛️ Gov @${esc(g.governor.username)}</button>
    <button class="chip" data-chip="sea">🌊 Sea Plots</button>
    <button class="chip" data-chip="homes">🏘️ ${homes} homes</button>`;
  $('#announce').textContent = `🏛️ Gov @${g.governor.username}: ${g.governor.announcement || ''}`;
  $('#chips').classList.toggle('in', !!u); $('#announce').classList.toggle('in', !!u);
  $('#dock').className = 'dock glass dock-guest';
  $('#dock').innerHTML = `
    <div class="played"><span class="avatars">${['#7a4a2c', '#c68a62', '#4e2d1a', '#9a6440'].map((c) => `<span style="background:${c}"></span>`).join('')}</span><b>${online} Lagosians</b> online now · free</div>
    <div class="dock-row"><a class="btn primary big" href="#/auth">Sign up free</a><a class="btn soft big" href="#/auth/login">Log in</a></div>
    <div class="socials"><span>✔︎ Local-first</span><span>No ads</span><span>Saves on this device</span></div>`;
}

// ── Player HUD ───────────────────────────────────────
let buyCat = 'Comfort';
function buildHud() {
  const u = user(), s = sim(); if (!u) return;
  const hud = $('#hud');
  hud.className = view === 'buy' ? 'buying' : '';
  for (const k in lastHTML) delete lastHTML[k];
  if (view === 'buy') {
    const list = FURNITURE.filter((f) => f.cat === buyCat);
    const disc = has('connected') ? 0.9 : 1;
    hud.innerHTML = `
      <div class="buy-top"><span class="pillbtn">🛋️ Buy mode</span><span class="pillbtn" id="h-money"></span>
        <span style="display:flex;gap:8px"><button class="roundbtn" data-act="rotate" aria-label="Rotate">⟳</button><button class="roundbtn" data-view="home" aria-label="Close">✕</button></span></div>
      <section class="catalogue">
        <h3>Catalogue</h3>
        <div class="tabsrow" style="margin:0 0 10px">${CATEGORIES.map((c) => `<button data-cat="${c}" class="${c === buyCat ? 'on' : ''}">${c}</button>`).join('')}</div>
        <div class="catgrid">${list.map((f) => `
          <button class="item ${f.price * disc > s.money ? 'cant' : ''}" data-buy="${f.id}">
            <span class="thumb"><span class="meta"><span>${f.w}×${f.d}</span><span>${'★'.repeat(f.stars)}</span></span><i style="background:${f.color}"></i></span>
            <b>${esc(f.name)}</b><span class="p">${short(f.price * disc)}</span>
            <span class="sub" style="font-size:11px">${f.acts.length ? f.acts.flatMap((a) => Object.keys(a.fx).filter((k) => a.fx[k] > 0)).filter((v, i, arr) => arr.indexOf(v) === i).map((k) => '+' + k[0].toUpperCase() + k.slice(1)).join(' ') : '+Decor'}</span>
          </button>`).join('')}</div>
      </section>`;
    updateHud();
    return;
  }
  hud.innerHTML = `
    <button class="pillbtn hud-clock" data-open="cc"><span id="h-sun"></span><span id="h-time"></span><small id="h-ampm"></small><span id="h-mood"></span></button>
    <button class="pillbtn hud-chev" data-open="cc" aria-label="Control centre">⌄</button>
    <button class="pillbtn hud-money" data-app="bank"><span id="h-money"></span><span class="plus">+</span></button>
    ${view === 'home' ? `<div class="hud-badges"><button data-panel="goals" title="Today's missions"><span>🎁</span><b id="h-miss"></b></button><button data-panel="goals" title="Streak"><span>🔥</span><b id="h-streak"></b></button><button data-panel="goals" title="Sparkles"><span>💎</span><b id="h-spark"></b></button></div>` : ''}
    <div class="hud-out" id="h-out"></div>
    <div class="hud-right">${view === 'home' ? '<button class="roundbtn" data-act="rotate" aria-label="Rotate">⟳</button>' : ''}<button class="roundbtn" data-open="more" aria-label="More">⋯</button></div>
    <div class="hud-left"><button class="avatar-btn" data-panel="needs" style="background:${u.look.top};color:#fff">${esc(u.name[0] || '?')}</button><button class="pillbtn need-pill" data-panel="needs" id="h-need"></button></div>
    <div class="hud-doing" id="h-doing"><div id="doing"></div><div class="queue" id="queue"></div></div>
    <nav class="hud-nav">
      <button data-view="home" class="${view === 'home' ? 'on' : ''}">🏠 <span class="lbl">Home</span></button>
      <button data-view="buy">🛋️ <span class="lbl">Buy</span></button>
      <button data-view="map" class="${view === 'map' ? 'on' : ''}">🗺️ <span class="lbl">Map</span></button>
    </nav>
    <button class="hud-phone" data-open="phone" aria-label="Phone">📱<span class="badge" id="h-badge"></span></button>`;
  updateHud();
}
const lastHTML = {};
function setHTML(sel, html) { const el = $(sel); if (!el) return; if (lastHTML[sel] !== html) { lastHTML[sel] = html; el.innerHTML = html; } }
const setText = (sel, t) => { const el = $(sel); if (el && el.textContent !== String(t)) el.textContent = t; };
function updateHud() {
  const s = sim(); if (!s) return;
  setText('#h-money', view === 'buy' ? naira(s.money) : short(s.money));
  if (view === 'buy') return;
  const [t, ap] = timeParts();
  setText('#h-sun', isNight() ? '🌙' : '☀️'); setText('#h-time', t); setText('#h-ampm', ap); setText('#h-mood', mood(s).emoji);
  ensureMissions(s);
  setText('#h-miss', `${s.missions.done.length}/3`); setText('#h-streak', s.streak.n); setText('#h-spark', s.sparkles);
  const low = NEEDS.reduce((a, n) => (s.stats[n.id] < s.stats[a.id] ? n : a), NEEDS[0]);
  const v = Math.round(s.stats[low.id]);
  setHTML('#h-need', `<span class="ico">${low.emoji}</span><span style="color:${v < 25 ? 'var(--danger)' : 'var(--ink)'}">${v}%</span>`);
  const unread = chat.unreadCount(s);
  const b = $('#h-badge'); if (b) { b.textContent = unread; b.hidden = !unread; }
  const out = view === 'map' && s.at !== 'home' && !s.walking
    ? `<button class="pillbtn" data-place="${s.at}">📍 ${esc(placeName(s.at))} · Activities</button><button class="pillbtn go" data-gohome>🏠 Head home</button>`
    : view === 'home' && s.at !== 'home' && !s.walking
      ? `<button class="pillbtn" data-view="map">📍 You're at ${esc(placeName(s.at))}</button><button class="pillbtn go" data-gohome>🏠 Head home</button>` : '';
  setHTML('#h-out', out);
  if (s.current) {
    setHTML('#doing', `<div class="doing"><span class="em">${s.current.emoji}</span><div class="prog">${esc(s.current.label)} <small class="sub" id="left"></small><div class="bar"><i id="pct"></i></div></div><button class="btn ghost" data-cancel aria-label="Stop">✕</button></div>`);
    setText('#left', `· ${mins(Math.ceil(s.current.left))} left`);
    $('#pct').style.width = 100 * (1 - s.current.left / s.current.total) + '%';
  } else if (s.walking) {
    const q = s.queue[0];
    const mode = TRANSPORT.find((x) => x.id === (q?.mode || s.mode));
    const inside = q && (q.kind === 'home' || q.kind === 'walk') && s.at === 'home';
    setHTML('#doing', `<div class="doing"><span class="em">${inside ? '🚶🏾' : s.car ? '🚘' : mode?.emoji || '🚶'}</span><div class="prog">${inside ? 'Walking over…' : `On the way to ${esc(placeName(q ? destOf(q) : 'home'))}`}</div></div>`);
  } else setHTML('#doing', '');
  setHTML('#queue', s.queue.map((q, i) => `<span class="q-item">${q.emoji} ${esc(q.label)}${i === 0 && s.walking ? '' : `<button data-unqueue="${i}" aria-label="Remove">✕</button>`}</span>`).join(''));
  refreshThrottled();
}
let lastRefresh = 0;
function refreshThrottled() { const n = Date.now(); if (n - lastRefresh > 1500) { lastRefresh = n; if (sheetRender?.live) refreshSheet(); if ($('#cc')) renderCC(); } }

// ── Control centre ───────────────────────────────────
function openCC() {
  closeOverlays();
  const el = document.createElement('div'); el.className = 'cc'; el.id = 'cc'; document.body.appendChild(el);
  $('#sheet-backdrop').hidden = false; renderCC();
}
function renderCC() {
  const s = sim(), el = $('#cc'); if (!s || !el) return;
  const [t, ap] = timeParts(); const m = mood(s);
  ensureMissions(s);
  const next = MISSIONS.find((x) => s.missions.list.includes(x.id) && !s.missions.done.includes(x.id));
  const unread = chat.unreadCount(s);
  const dark = document.documentElement.dataset.theme === 'dark' || (!document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches);
  el.innerHTML = `
    <div class="cc-time"><div><b>${t}<small>${ap}</small></b><p class="sub">${weekday()} · Day ${day()} · Lagos · ${daily().weather.emoji} ${daily().weather.label}</p></div><span class="sunmoon">${isNight() ? '🌙' : '☀️'}</span></div>
    <button class="cc-row" data-app="messages"><span class="ico">✉️</span><span class="t"><b>${unread ? `${unread} unread chat${unread > 1 ? 's' : ''}` : 'Messages'}</b><small>Chats, groups and requests</small></span><span class="chev">›</span></button>
    <button class="cc-row" data-panel="goals"><span class="ico">🎁</span><span class="t"><b>${next ? esc(next.label) : 'All missions done 🎉'}</b><small>Your next goal</small></span><span class="chev">›</span></button>
    <button class="cc-row" data-panel="goals"><span class="ico">🔥</span><span class="t"><b>Level ${level(s)} · ${s.streak.n}-day streak</b><small>Streak & level</small></span><span class="chev">›</span></button>
    <button class="cc-row" data-panel="needs"><span class="ico">${m.emoji}</span><span class="t"><b>${m.label}</b><small>See what your Sim needs</small></span><span class="chev">›</span></button>
    <button class="cc-row" data-app="bank"><span class="ico">👛</span><span class="t"><b>${naira(s.money)}</b><small>Your wallet</small></span><span class="chev">›</span></button>
    <div class="cc-row"><span class="ico">👥</span><span class="t"><b><span style="color:var(--green)">●</span> ${10 + Object.keys(db.users).length} Sims online</b><small>${db.world.visits.toLocaleString()} visits on this device</small></span></div>
    <button class="cc-row" data-theme-toggle><span class="ico">🌗</span><span class="t"><b>Dark mode</b><small>${dark ? 'Dark screens' : 'Light screens'}</small></span><span class="switch ${dark ? 'on' : ''}"></span></button>
    <button class="cc-row" data-sound-toggle="sfx"><span class="ico">🔊</span><span class="t"><b>Sound effects</b><small>Taps, cash, level-ups, traffic</small></span><span class="switch ${soundPrefs().sfx ? 'on' : ''}"></span></button>
    <button class="cc-row" data-sound-toggle="music"><span class="ico">🎵</span><span class="t"><b>Music</b><small>Afro-pop by day, chill at night, party grooves at venues</small></span><span class="switch ${soundPrefs().music ? 'on' : ''}"></span></button>
    <button class="cc-row" data-open="phone"><span class="ico">📱</span><span class="t"><b>Your phone</b></span><span class="sub">${t}</span></button>`;
}

// ── Sim panel ────────────────────────────────────────
let panelTab = 'needs';
function openPanel(tab = panelTab) {
  panelTab = tab;
  const render = () => {
    const u = user(), s = sim(); if (!u) return '';
    const m = mood(s); const f = feelings(s);
    const worst = [...f].sort((a, b) => a[3] - b[3])[0];
    const tabs = [['profile', '✏️ Profile'], ['needs', 'Needs'], ['goals', 'Goals'], ['skills', 'Skills'], ['people', 'People'], ['career', 'Career']];
    let body = '';
    if (panelTab === 'needs') {
      body = NEEDS.map((n) => { const v = Math.round(s.stats[n.id]); return `<div class="needrow"><span class="ico">${n.emoji}</span><div><div class="top"><span>${n.label}</span><span class="v ${v < 25 ? 'low' : ''}">${v}</span></div><div class="bar"><i style="width:${v}%;background:${n.color}"></i></div></div></div>`; }).join('') +
        `<div class="section-label">Feelings</div>` + (f.length ? f.map(([e, t, d, v]) => `<div class="feel"><span class="em">${e}</span><span class="t"><b>${t}</b><small>${d}</small></span><span class="v ${v > 0 ? 'pos' : 'neg'}">${v > 0 ? '+' : ''}${v}</span></div>`).join('') : '<p class="sub">Nothing special. Just living.</p>') +
        `<p class="sub">Traits: ${s.traits.map((id) => { const t = TRAITS.find((x) => x.id === id); return `${t.emoji} ${t.label}`; }).join(' · ')}</p>`;
    } else if (panelTab === 'goals') {
      ensureMissions(s);
      body = `<div class="card2"><b>🎯 Today's Hustle</b> <span class="sub">· ${s.missions.done.length}/3 missions · Level ${level(s)} · 🔥 ${s.streak.n}-day streak</span>
        ${s.missions.list.map((id) => { const mm = MISSIONS.find((x) => x.id === id); const d = s.missions.done.includes(id); return `<div class="req"><span class="ok ${d ? 'y' : ''}">${d ? '✓' : ''}</span><span class="grow">${mm.emoji} ${mm.label}</span><b>+3✨</b></div>`; }).join('')}</div>
        <div class="section-label">Perks · you have ✨ ${s.sparkles}</div>
        <div class="perkgrid">${PERKS.map((p) => { const own = s.perks.includes(p.id); return `<button class="perk ${own ? 'owned' : ''}" data-perk="${p.id}" ${own ? 'disabled' : ''}><span>${p.emoji}</span> <span class="cost">${own ? 'Owned' : p.cost + '✨'}</span><b>${p.label}</b><span class="sub">${p.note}</span></button>`; }).join('')}</div>`;
    } else if (panelTab === 'skills') {
      body = SKILLS.map((k) => { const xp = s.skills[k.id] || 0; const lv = Math.floor(xp / XP_PER_LEVEL); return `<div class="needrow"><span class="ico">${k.emoji}</span><div><div class="top"><span>${k.label}</span><span>Level ${lv}</span></div><div class="bar"><i style="width:${xp % XP_PER_LEVEL}%;background:#7a5be0"></i></div></div></div>`; }).join('') +
        `<p class="sub">Practise skills with furniture at home (desk, guitar, mirror, dumbbells) or at places around town. Skills unlock promotions.</p>`;
    } else if (panelTab === 'people') {
      const ppl = [...new Set([...s.friends, ...Object.keys(s.chats).filter((u) => s.chats[u].accepted)])];
      body = ppl.length ? ppl.map((n) => `<button class="list-row people-row" data-dm="${esc(n)}">${chat.avatar(n, 40)}<span class="grow">@${esc(n)}<br><small class="sub">${s.chats[n]?.rel === 'bae' ? '💘 Bae' : s.chats[n]?.rel ? '👪 ' + esc(s.chats[n].rel) : s.friends.includes(n) ? 'Friend' : 'Chat'}${s.chats[n] ? ` · closeness ${s.chats[n].close}` : ''}</small></span><span class="pill">💬 Chat</span></button>`).join('')
        : `<div class="card2" style="text-align:center"><div style="font-size:30px">🤝</div><b>No friends yet</b><p class="sub">Visit places around town and gist with people.</p></div>`;
    } else if (panelTab === 'career') {
      if (!s.career) body = `<div class="card2" style="text-align:center"><div style="font-size:30px">💼</div><b>No job yet</b><p class="sub">Open the Jobs app on your phone to start a career.</p><button class="btn primary" data-app="jobs">Open Jobs</button></div>`;
      else {
        const c = CAREERS.find((x) => x.id === s.career.id); const r = s.career.rank;
        body = `<div class="card2 green"><b style="font-size:13px">${c.emoji} ${c.label} · Rank ${r + 1} of ${c.ranks.length}</b><h2 style="margin:4px 0">${c.ranks[r][0]}</h2><span class="sub">${naira(c.ranks[r][1])} per shift · 1-hour shifts, any time · at ${esc(placeName(c.place))}</span></div>
          <div class="ladder">${c.ranks.map((_, i) => `<span class="${i <= r ? 'on' : ''}"></span>`).join('')}</div>
          <div class="sub" style="display:flex;justify-content:space-between"><span>${c.ranks[0][0]}</span><span>${c.ranks.at(-1)[0]}</span></div>
          ${r < c.ranks.length - 1 ? `<div class="section-label">Next: ${c.ranks[r + 1][0]} · ${naira(c.ranks[r + 1][1])}/shift</div>${promoReqs(s).map(([l, v, ok]) => `<div class="req"><span class="ok ${ok ? 'y' : ''}">${ok ? '✓' : ''}</span><span class="grow">${l}</span><b>${v}</b></div>`).join('')}<p class="sub">A new rank needs every box ticked.</p>` : '<p><b>👑 You reached the top.</b></p>'}
          <button class="btn primary block" data-work>Go to work</button>`;
      }
    } else if (panelTab === 'profile') {
      body = `<div class="list-row"><span class="grow">@${esc(u.username)}<br><small class="sub">your username</small></span></div>
        <div class="list-row"><span class="grow">${esc(u.name)}<br><small class="sub">Display name</small></span></div>
        <div class="list-row"><span class="grow">${esc(u.email.replace(/^(.).*(@.*)$/, '$1•••••$2'))}<br><small class="sub">Email · can't be changed</small></span></div>
        <div class="list-row"><span class="grow">${homeOf(u).emoji} ${homeOf(u).name}<br><small class="sub">Neighbourhood · rent ${homeOf(u).rent ? naira(homeOf(u).rent) + '/day' : 'free'}</small></span><button class="btn soft" data-app="houses">Move</button></div>
        <div class="section-label">Edit your look</div>
        <div class="field"><label>Skin</label><div class="swatches">${LOOKS.skin.map((c) => `<button data-look="skin|${c}" class="${c === u.look.skin ? 'on' : ''}" style="background:${c}"></button>`).join('')}</div></div>
        <div class="field"><label>Outfit</label><div class="swatches">${LOOKS.top.map((c) => `<button data-look="top|${c}" class="${c === u.look.top ? 'on' : ''}" style="background:${c}"></button>`).join('')}</div></div>
        <div class="list-row"><span class="grow">Days lived</span><b>${s.days}</b></div>
        <div class="list-row"><span class="grow">Naira earned</span><b>${naira(s.earned)}</b></div>
        <div class="stack" style="margin-top:12px"><button class="btn soft block" data-logout>Log out</button><button class="btn danger block" data-reset>Delete this Sim</button></div>`;
    }
    return `<div class="sheet-head"><div class="sheet-icon" style="background:${u.look.top};color:#fff;font-weight:800">${esc(u.name[0] || '?')}</div><div><h2>${esc(u.username)}</h2><p class="sub">${m.label}${worst && worst[3] < 0 ? ' · ' + worst[1] : ''}</p></div></div>
      <div class="tabsrow">${tabs.map(([id, l]) => `<button data-tab="${id}" class="${id === panelTab ? 'on' : ''}">${l}</button>`).join('')}</div>${body}`;
  };
  render.live = true;
  openSheet(render);
}

// ── Objects at home ──────────────────────────────────
function openItem(idx) {
  const s = sim(); if (!s) return;
  const it = s.items[idx]; const f = ITEM.get(it?.item); if (!f) return;
  if (view === 'buy') return openSheet(() => head('🛋️', f.name, 'Buy mode') + `<button class="btn soft block" data-sell="${idx}">Sell for ${naira(f.price * 0.5)}</button>`);
  openSheet(() => head(`<i style="width:26px;height:26px;border-radius:7px;background:${f.color};display:block"></i>`, f.name, f.blurb || `${'★'.repeat(f.stars)} · ${f.cat}`) +
    (f.acts.length ? `<div class="acts">${f.acts.map((a) => actCard(a, `data-qhome="${idx}|${a.id}"`)).join('')}</div>` : `<p class="sub">Decor. Makes your house look finer (+mood).</p>`) +
    (s.at !== 'home' ? `<p class="sub">You're out at ${esc(placeName(s.at))}. Your Sim will head home first.</p>` : '') +
    `<button class="btn soft block" style="margin-top:12px" data-sell="${idx}">Sell for ${naira(f.price * 0.5)}</button>`);
}
function walkOnFloor(t) {
  const s = sim(); if (!s || view !== 'home' || s.at !== 'home' || s.current || s.walking) return;
  s.queue.unshift({ kind: 'walk', x: t.x, z: t.z, label: 'Walk', emoji: '🚶🏾' });
}

// ── Places ───────────────────────────────────────────
function onPick(id) {
  if (id.startsWith('sea:')) return openSeaPlot(id.slice(4));
  if (id.startsWith('home:')) return openHome(id.slice(5));
  const p = city.placeById(id); if (!p) return;
  if (p.soon) return openSheet(() => head('👑', p.name, 'Coming soon') + `<p>${esc(p.blurb)}</p>`);
  if (!user()) return openSheet(() => head(p.emoji, 'Go to ' + p.name) + `<p class="sub">Create your Lagosian to hang out at ${esc(p.name)}, meet other Sims and gist.</p>` + guestCta);
  openPlace(id);
}
function hereNow(id) {
  const r = hashStr(id + Math.floor(db.world.clock / 60));
  return db.world.npcHomes.filter((_, i) => ((r >> i) & 3) === 0).slice(0, 4);
}
function openPlace(id) {
  const p = city.placeById(id);
  const render = () => {
    const s = sim(); const here = s.at === id;
    const career = s.career && CAREERS.find((c) => c.id === s.career.id);
    const people = hereNow(id);
    const top = head(p.emoji, p.name, AREAS[id]) + `<p style="margin:4px 0 10px">${esc(p.blurb)}</p>`;
    const crowd = `<div class="section-label">Here now</div><div class="herenow">${people.length ? people.map((n) => `<span><i style="background:${n.look.top}"></i>${esc(n.username)}</span>`).join('') : '<span>Nobody right now</span>'}</div>`;
    if (here) {
      return top + `<div class="acts">${p.actions.map((a) => actCard(a, `data-qplace="${id}|${a.id}"`, PLACE_SKILL[`${id}.${a.id}`])).join('')}
        ${actCard({ label: 'Gist with people here', emoji: '💬', mins: 30, fx: { social: 25, fun: 5 } }, `data-qgist="${id}"`)}
        ${career?.place === id ? actCard({ label: `Work a shift · ${career.ranks[s.career.rank][0]}`, emoji: career.emoji, mins: SHIFT_MINS, earn: career.ranks[s.career.rank][1], fx: { energy: -10 } }, 'data-work', { [career.skill]: 30 }) : ''}
        </div>` + crowd + `<button class="btn soft block" style="margin-top:14px" data-gohome>🏠 Head home</button>`;
    }
    return top + `<div class="chiplist">${p.actions.map((a) => `<span>${a.emoji} ${esc(a.label)}</span>`).join('')}<span>💬 Gist</span>${career?.place === id ? `<span>${career.emoji} Your job</span>` : ''}</div>` + crowd +
      transportPicker(s) + `<button class="btn primary big block" data-go="${id}">Go · ${fareLabel(s)}</button>`;
  };
  render.live = true;
  openSheet(render);
}
function fareLabel(s) { const m = TRANSPORT.find((t) => t.id === s.mode) || TRANSPORT[0]; const f = fareOf(s, m); return s.car ? '🚘 Your car' : f ? naira(f) : 'Free'; }
function transportPicker(s) {
  if (s.car) return '<p class="sub">🚘 You drive your own car. No fares.</p>';
  return `<div class="transport">${TRANSPORT.map((m) => `<button data-mode="${m.id}" class="${m.id === s.mode ? 'on' : ''}"><span>${m.emoji}</span>${m.label}<small>${fareOf(s, m) ? naira(fareOf(s, m)) : 'Free'}</small></button>`).join('')}</div>`;
}
function openHeadHome() {
  const render = () => { const s = sim(); return head('🏠', 'Head home', homeOf(user()).name) + transportPicker(s) + `<button class="btn primary big block" data-go="home">Go · ${fareLabel(s)}</button>`; };
  openSheet(render);
}
function openHome(homeId) {
  const h = HOMES.find((x) => x.id === homeId);
  const residents = db.world.npcHomes.filter((n) => n.home === homeId);
  const u = user();
  const mine = u && u.home === homeId;
  openSheet(() => head(h.emoji, h.name + (mine ? ' · Your home' : ''), `Rent ${h.rent ? naira(h.rent) + '/day' : 'free'} · comfort ×${h.comfort}`) +
    (mine ? (sim().at === 'home' ? `<button class="btn primary block" data-view="home">Go inside</button>` : `<button class="btn primary block" data-gohome>Head home</button>`) : '') +
    (u && !mine ? `<button class="btn soft block" data-move="${h.id}" style="margin-top:6px">Move here${h.rent ? ` · ${naira(h.rent)}/day` : ''}</button>` : '') +
    `<p class="sub" style="margin-top:14px">${residents.length} neighbours</p>` +
    residents.map((r) => `<div class="list-row"><span class="me-dot" style="background:${r.look.top}">${r.username[0].toUpperCase()}</span><span class="grow">@${esc(r.username)}</span></div>`).join('') +
    (u ? '' : guestCta));
}
function openSeaPlot(id) {
  const sp = db.world.sea.find((x) => x.id === id); if (!sp) return;
  openSheet(() => head(sp.emoji, sp.title, `Sea plot · ${sp.w}×${sp.h} · by @${sp.owner}`) +
    `<p>${sp.link ? `<a href="${esc(sp.link)}" target="_blank" rel="noopener noreferrer">${esc(sp.link)}</a>` : 'No link.'}</p><p class="sub">Floating for ${sp.ends} more days.</p>`);
}
function openSeaPlots() {
  openSheet(() => head('🌊', 'Sea Plots', 'Advertise on Lagos water') +
    `<p>${db.world.sea.length} brands are already floating on the water. Rent a patch from ${naira(SEA_PRICE)} a plot. Your picture and link float on the map for 30 days, where every player looks.</p>` +
    (user() ? `<form class="stack" id="sea-form">
        <input class="input" name="title" placeholder="Brand name" maxlength="40" required />
        <input class="input" name="link" placeholder="https://your-link (optional)" type="url" />
        <div class="row3">
          <input class="input" name="emoji" placeholder="Emoji" maxlength="4" value="📣" />
          <select class="input" name="w">${[1, 2, 3, 4].map((n) => `<option value="${n}">${n} wide</option>`).join('')}</select>
          <select class="input" name="h">${[1, 2, 3].map((n) => `<option value="${n}">${n} tall</option>`).join('')}</select>
        </div>
        <button class="btn primary big">Rent plot</button>
      </form>` : `<a class="btn primary big block" href="#/auth">Sign up to rent a plot</a>`) +
    `<p class="sub" style="margin-top:14px">On the water now</p>` +
    db.world.sea.map((s) => `<div class="list-row"><span>${s.emoji}</span><span class="grow">${esc(s.title)}</span><span class="pill">${s.ends}d</span></div>`).join(''));
}
let govTab = 'governor';
function openGov() {
  const render = () => {
    const g = db.world.gov; const u = user(), s = sim();
    const total = g.candidates.reduce((a, c) => a + c.votes, 0) || 1;
    const left = Math.max(0, g.ends - db.world.clock);
    const tabs = `<div class="tabs" style="grid-template-columns:repeat(3,1fr)">${[['governor', '🏛️ Governor'], ['senator', '⚖️ Senator'], ['president', '🇳🇬 President']].map(([id, l]) => `<button data-govtab="${id}" class="${govTab === id ? 'on' : ''}">${l}</button>`).join('')}</div>`;
    if (govTab !== 'governor') return head('🏛️', 'Lagos State House', 'Governor, policies and the election') + tabs + `<div class="card2" style="text-align:center"><div style="font-size:30px">🗳️</div><b>No ${govTab} election yet</b><p class="sub">This office opens once Lagos has had a few governors.</p></div>`;
    return head('🏛️', 'Lagos State House', 'Governor, policies and the election') + tabs +
      `<div class="card2 green"><small class="sub">GOVERNOR OF LAGOS · TERM ${g.term}</small><h2 style="margin:6px 0 2px">👑 @${esc(g.governor.username)}</h2><span class="sub">“${esc(g.governor.slogan)}”</span>
        <div class="card2" style="margin:10px 0 6px;background:rgba(255,255,255,.18);color:#fff">${POLICIES[g.governor.policy]?.label} · ${POLICIES[g.governor.policy]?.note}</div>
        ${g.governor.announcement ? `<div class="card2" style="margin:0;background:#fff;color:#1b2330">📢 ${esc(g.governor.announcement)}</div>` : ''}</div>` +
      (g.cabinet?.length ? `<div class="card2"><b>The cabinet 📁</b>${g.cabinet.map((c) => `<div class="list-row"><span class="grow">@${esc(c.username)}<br><small class="sub">${c.role}</small></span></div>`).join('')}</div>` : '') +
      `<div class="section-label">Next election · closes in ${Math.ceil(left / 1440)} day(s)</div>` +
      (u ? '' : `<p>Sign up to vote in the next election, or run yourself.</p>` + guestCta) +
      (u ? g.candidates.map((c, i) => `
        <div class="list-row"><span class="grow"><b>@${esc(c.username)}</b> <small class="sub">· ${POLICIES[c.policy]?.label}</small><br><small class="sub">“${esc(c.slogan)}”</small>
          <div class="votebar"><i style="width:${(c.votes / total) * 100}%"></i></div></span>
          <span style="text-align:right"><small class="sub">${c.votes.toLocaleString()} · ${Math.round((c.votes / total) * 100)}%</small><br>
          <button class="btn ${s.votedTerm === g.term ? 'soft' : 'primary'}" data-vote="${i}" ${s.votedTerm === g.term ? 'disabled' : ''}>Vote</button></span></div>`).join('') +
        (g.candidates.some((c) => c.username === u.username) ? '' : `
        <form class="stack" id="run-form" style="margin-top:12px">
          <p class="sub" style="margin:0">Run for governor · ${naira(20000)} campaign fee</p>
          <input class="input" name="slogan" placeholder="Your slogan" maxlength="60" required />
          <select class="input" name="policy">${Object.entries(POLICIES).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('')}</select>
          <button class="btn primary">Join the race</button>
        </form>`) : '');
  };
  render.live = true;
  openSheet(render);
}
function openHomes() {
  const all = [...db.world.npcHomes, ...Object.values(db.users).map((u) => ({ username: u.username, home: u.home, look: u.look }))];
  openSheet(() => head('🏘️', `${all.length} homes`, 'Where Lagosians live') +
    HOMES.map((h) => `<button class="action" data-home="${h.id}" style="margin-bottom:6px"><span class="em">${h.emoji}</span>
      <span class="t"><b>${h.name}</b><small>${all.filter((a) => a.home === h.id).length} residents · rent ${h.rent ? naira(h.rent) + '/day' : 'free'}</small></span></button>`).join(''));
}
function openMore() {
  openSheet(() => head('⋯', 'More') + `<div class="stack">
    <button class="action" data-panel="profile"><span class="em">🙂</span><span class="t"><b>Your Sim</b><small>Profile, needs, goals, skills, career</small></span></button>
    <button class="action" data-chip="gov"><span class="em">🏛️</span><span class="t"><b>State House</b><small>Governor and elections</small></span></button>
    <button class="action" data-chip="sea"><span class="em">🌊</span><span class="t"><b>Sea Plots</b><small>Advertise on the lagoon</small></span></button>
    <button class="action" data-app="help"><span class="em">💡</span><span class="t"><b>Help & guide</b><small>How to play</small></span></button>
    <a class="action" href="#/privacy"><span class="em">🔒</span><span class="t"><b>Privacy</b><small>What's stored and where</small></span></a>
    <button class="action" data-logout><span class="em">👋</span><span class="t"><b>Log out</b></span></button></div>`);
}

// ── Phone ────────────────────────────────────────────
const APPS = [
  ['jobs', 'Jobs', '💼', '#3fae6a'], ['messages', 'Messages', '💬', '#3a7bd5'], ['gist', 'Lagos Gist', '📰', '#e0533d'], ['bank', 'Bank', '🏦', '#1f6f5c'],
  ['contacts', 'Contacts', '📞', '#5ab0e8'], ['houses', 'Houses', '🔑', '#d48a2c'], ['gov', 'State House', '🏛️', '#3b8352'], ['help', 'Help', '💡', '#f0b429'],
];
let phoneApp = null;
function openPhone(app = null, keepChat = false) {
  closeSheet();
  if (!keepChat) chat.reset();
  sfx('open');
  phoneApp = app; $('#phone').hidden = false; renderPhone();
}
function renderPhone() {
  const s = sim(); if (!s) return;
  const [t, ap] = timeParts();
  const status = `<div class="statusbar"><span>${t}${ap}</span><span>●●● 4G ▮</span></div>`;
  let screen;
  if (!phoneApp) {
    const unread = chat.unreadCount(s);
    screen = `<div class="screen home">${status}<div class="lock"><b>${t}</b><small>${weekday()} · Day ${day()} · Lagos</small></div>
      <div class="apps">${APPS.map(([id, l, e, c]) => `<button class="app" data-app="${id}"><i style="background:${c}">${e}</i>${l}${id === 'messages' && unread ? `<span class="badge">${unread}</span>` : ''}</button>`).join('')}</div></div>`;
  } else {
    const back = `<button data-app="" aria-label="Back">‹</button>`;
    let title = APPS.find((a) => a[0] === phoneApp)?.[1], body = '';
    if (phoneApp === 'jobs') {
      const c = s.career && CAREERS.find((x) => x.id === s.career.id);
      body = (c ? `<div class="jobcard yourjob"><small class="sub" style="color:var(--green);font-weight:800">YOUR JOB</small><b style="display:block;font-size:17px">${c.ranks[s.career.rank][0]}</b><span class="sub">${c.label} · ${naira(c.ranks[s.career.rank][1])} per shift · at ${esc(placeName(c.place))}</span>
          <div class="stack" style="margin-top:8px"><button class="btn primary block" data-work>Go to work</button></div></div>` : '') +
        CAREERS.map((x) => `<div class="jobcard"><div class="h"><span class="em">${x.emoji}</span><span><b>${x.label}</b><small class="sub">Starts as ${x.ranks[0][0]}</small></span><span class="pay">${naira(x.ranks[0][1])}<small>per shift</small></span></div>
          <p>${x.blurb}</p><small class="sub">🕘 1-hour shifts, any time · ${x.days} days a week · skill: ${SKILLS.find((k) => k.id === x.skill).label}</small>
          <div style="margin-top:8px">${s.career?.id === x.id ? '<button class="btn danger block" data-quitjob>Quit job</button>' : `<button class="btn soft block" data-takejob="${x.id}">${s.career ? 'Switch to this job' : 'Take this job'}</button>`}</div></div>`).join('');
    } else if (phoneApp === 'gist') {
      const d = daily();
      body = `<div class="jobcard"><b>${esc(d.headline)}</b><p>${d.weather.emoji} ${d.weather.label} in Lagos today.</p></div>
        <div class="jobcard"><b>🏛️ Gov @${esc(db.world.gov.governor.username)}</b><p>${POLICIES[db.world.gov.governor.policy]?.label}: ${POLICIES[db.world.gov.governor.policy]?.note}</p></div>
        <div class="jobcard"><b>💡 Tip</b><p>${esc(d.tip)}</p></div>
        <div class="jobcard"><b>💬 Overheard</b><p>${GIST.slice(0, 3).map(esc).join('<br>')}</p></div>`;
    } else if (phoneApp === 'bank') {
      body = `<div class="jobcard yourjob"><small class="sub">Wallet balance</small><b style="display:block;font-size:26px">${naira(s.money)}</b><small class="sub">Top-ups aren't available. Earn naira from jobs, gigs and freelance work.</small></div>
        <div class="section-label">Recent</div>${[...s.ledger].reverse().slice(0, 20).map((l) => `<div class="list-row"><span class="grow">${esc(l.t)}</span><b style="color:${l.v < 0 ? 'var(--danger)' : 'var(--green)'}">${l.v < 0 ? '−' : '+'}${naira(Math.abs(l.v))}</b></div>`).join('')}`;
    } else if (phoneApp === 'contacts') {
      body = s.friends.length ? s.friends.map((n) => `<div class="list-row"><span class="me-dot" style="background:#888">${n[0].toUpperCase()}</span><span class="grow">@${esc(n)}</span></div>`).join('') : '<p class="sub">No contacts yet. Gist with people around town.</p>';
    } else if (phoneApp === 'houses') {
      body = HOMES.map((h) => `<div class="jobcard"><div class="h"><span class="em">${h.emoji}</span><span><b>${h.name}</b><small class="sub">Comfort ×${h.comfort}</small></span><span class="pay">${h.rent ? naira(h.rent) : 'Free'}<small>per day</small></span></div>
        <div style="margin-top:8px">${user().home === h.id ? '<span class="pill">You live here</span>' : `<button class="btn soft block" data-move="${h.id}">Move here</button>`}</div></div>`).join('');
    } else if (phoneApp === 'help') {
      body = `<div class="jobcard"><b>🏠 Home</b><p>Tap furniture to see what it does. Actions queue up and your Sim does them in order. Tap the floor to walk.</p></div>
        <div class="jobcard"><b>🗺️ Map</b><p>Tap a place, pick a ride and Go. Once you arrive, tap activities to queue them.</p></div>
        <div class="jobcard"><b>💼 Jobs</b><p>Take a job, then work 1-hour shifts. Performance, shifts and skill level get you promoted.</p></div>
        <div class="jobcard"><b>✨ Sparkles</b><p>Finish daily missions and keep your streak to earn ✨. Spend them on perks.</p></div>
        <div class="jobcard"><b>🛋️ Buy mode</b><p>Furniture adds new actions and makes your house look finer, which helps your mood.</p></div>`;
    }
    screen = phoneApp === 'messages' ? chat.render(status)
      : `<div class="screen">${status}<div class="appbar">${back}<span>${esc(title)}</span></div><div class="appbody">${body}</div></div>`;
  }
  $('#phone').innerHTML = `<button class="pillbtn phone-close" data-phone-close>✕ Close</button><div class="phone ${phoneApp === 'messages' ? 'big' : ''}">${screen}</div>`;
  if (phoneApp === 'messages') chat.afterOpen();
}
$('#phone').addEventListener('click', (e) => { if (e.target.id === 'phone') $('#phone').hidden = true; });

// ── Global click delegation ──────────────────────────
document.addEventListener('click', (e) => {
  const t = e.target.closest('button, a'); if (!t) return;
  sfx('tap');
  if (t.closest('#auth-view')) return;
  const d = t.dataset; const s = sim();
  if (t.matches('a[href^="#/"]')) return closeOverlays();
  if (d.chip === 'gov' || t.id === 'announce') return openGov();
  if (d.chip === 'sea') return openSeaPlots();
  if (d.chip === 'homes') return openHomes();
  if (d.home) return openHome(d.home);
  if ('phoneClose' in d) { $('#phone').hidden = true; sfx('close'); return; }
  if (!s) return;
  if (d.view) { closeOverlays(); return setView(d.view); }
  if (d.open === 'cc') return $('#cc') ? closeSheet() : openCC();
  if (d.open === 'phone') return openPhone();
  if (d.open === 'more') return openMore();
  if (d.app !== undefined) {
    if (d.app === 'gov') return openGov();
    if (!$('#phone').hidden && t.closest('#phone')) { if (d.app === 'messages') chat.reset(); phoneApp = d.app || null; return renderPhone(); }
    return openPhone(d.app);
  }
  if (d.dm) { chat.open(d.dm); return openPhone('messages', true); }
  if (d.panel) { $('#phone').hidden = true; return openPanel(d.panel); }
  if (d.tab) { panelTab = d.tab; return refreshSheet(); }
  if (d.govtab) { govTab = d.govtab; return refreshSheet(); }
  if (d.act === 'rotate') return house.rotate();
  if (d.cat) { buyCat = d.cat; return buildHud(); }
  if (d.buy) return buyItem(d.buy);
  if (d.sell) return sellItem(+d.sell);
  if (d.qhome) { const [idx, actId] = d.qhome.split('|'); const a = ITEM.get(s.items[idx].item).acts.find((x) => x.id === actId); return enqueue({ kind: 'home', idx: +idx, actId, label: a.label, emoji: a.emoji }); }
  if (d.qplace) { const [place, actId] = d.qplace.split('|'); const a = city.placeById(place).actions.find((x) => x.id === actId); return enqueue({ kind: 'place', place, actId, label: a.label, emoji: a.emoji }); }
  if (d.qgist) return enqueue({ kind: 'gist', place: d.qgist, label: `Gist at ${placeName(d.qgist)}`, emoji: '💬' });
  if ('work' in d) {
    if (!s.career) return openPhone('jobs');
    const c = CAREERS.find((x) => x.id === s.career.id);
    return enqueue({ kind: 'shift', place: c.place, label: `Work shift · ${c.label}`, emoji: c.emoji });
  }
  if (d.mode) { s.mode = d.mode; save(); return refreshSheet(); }
  if (d.go) {
    const dest = d.go; closeOverlays();
    if (s.current) { s.current = null; house.setBusy(false); }
    s.queue = s.queue.filter((q) => q.kind !== 'travel');
    s.queue.unshift({ kind: 'travel', place: dest, mode: s.mode, label: `Go to ${placeName(dest)}`, emoji: '🧭' });
    save(); return updateHud();
  }
  if ('gohome' in d) return openHeadHome();
  if (d.place) return openPlace(d.place);
  if (d.unqueue) { s.queue.splice(+d.unqueue, 1); save(); return updateHud(); }
  if ('cancel' in d) { s.current = null; house.setBusy(false); save(); updateHud(); return toast('Stopped'); }
  if (d.perk) {
    const p = PERKS.find((x) => x.id === d.perk);
    if (s.sparkles < p.cost) return toast(`You need ${p.cost}✨`);
    s.sparkles -= p.cost; s.perks.push(p.id); save(); toast(`${p.emoji} ${p.label} unlocked`); sfx('sparkle'); return refreshSheet();
  }
  if (d.takejob) {
    const c = CAREERS.find((x) => x.id === d.takejob);
    s.career = { id: c.id, rank: 0, perf: 50, shifts: 0 };
    addNote(s, c.emoji, `HR @ ${c.label}`, `Welcome aboard as ${c.ranks[0][0]}! Shifts are 1 hour at ${placeName(c.place)}. Show up and your performance goes up.`);
    save(); toast(`💼 You're now a ${c.ranks[0][0]}`); return renderPhone();
  }
  if ('quitjob' in d) { s.career = null; save(); toast('You quit your job'); return renderPhone(); }
  if (d.look) { const [k, v] = d.look.split('|'); user().look[k] = v; save(); placeSims(); buildHud(); return refreshSheet(); }
  if (d.move) {
    user().home = d.move; save(); city.setMyHome(d.move); toast(`🏠 You moved to ${homeOf(user()).name}`);
    if (s.at === 'home') city.setMe(user().look, homeOf(user()).pos);
    return closeOverlays();
  }
  if (d.vote) {
    const g = db.world.gov; g.candidates[+d.vote].votes++; s.votedTerm = g.term; save();
    toast('🗳️ Vote cast for @' + g.candidates[+d.vote].username); return refreshSheet();
  }
  if (d.soundToggle) { setSoundPref(d.soundToggle, !soundPrefs()[d.soundToggle]); return renderCC(); }
  if ('themeToggle' in d) {
    const cur = document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const next = cur === 'dark' ? 'light' : 'dark'; document.documentElement.dataset.theme = next;
    try { localStorage.setItem('eko-life:theme', next); } catch {} return renderCC();
  }
  if ('logout' in d) { gen++; ambience(null); db.session = null; save(); closeOverlays(); location.hash = '#/'; route(); toast('👋 Logged out'); return; }
  if ('reset' in d) {
    if (!confirm('Delete your Sim and account on this device?')) return;
    gen++; const n = db.session; delete db.users[n]; delete db.saves[n]; db.session = null; save(); closeOverlays(); route();
  }
});

function buyItem(id) {
  const s = sim(); const f = ITEM.get(id); const price = f.price * (has('connected') ? 0.9 : 1);
  if (price > s.money) return toast('💸 Not enough naira');
  const spot = house.freeSpot(f);
  if (!spot) return toast('🚧 No space for that. Sell something first.');
  addMoney(-price, `Bought ${f.name}`); sfx('buy');
  s.items.push({ item: id, x: spot.x, z: spot.z, r: 0 });
  house.setItems(s.items); save(); buildHud();
  checkMissions(s, { kind: 'buy' });
  toast(`🛋️ ${f.name} placed in your house`);
}
function sellItem(idx) {
  const s = sim(); const f = ITEM.get(s.items[idx].item);
  if (s.queue.some((q) => q.kind === 'home') || s.current?.kind === 'home') return toast('Finish or cancel your home actions first');
  addMoney(f.price * 0.5, `Sold ${f.name}`);
  s.items.splice(idx, 1); house.setItems(s.items); save(); closeSheet(); updateHud();
  if (view === 'buy') buildHud();
  toast(`Sold ${f.name} for ${naira(f.price * 0.5)}`);
}

// Form submits inside sheets and the phone
document.addEventListener('submit', (e) => {
  const f = e.target; if (!f.closest('#sheet, #phone')) return;
  e.preventDefault();
  const data = new FormData(f); const s = sim();
  if (f.id === 'sea-form') {
    const w = +data.get('w'), h = +data.get('h'), price = SEA_PRICE * w * h;
    if (s.money < price) return toast('Not enough naira for that plot');
    addMoney(-price, 'Sea plot');
    db.world.sea.push({ id: 'p' + Date.now(), x: -40 + Math.random() * 80, z: -2.5 + Math.random() * 8, w, h, title: data.get('title'), link: data.get('link'), emoji: data.get('emoji') || '📣', color: pick(['#ffd166', '#8ecae6', '#b8f2c9', '#f4a3c0', '#ffffff']), owner: user().username, ends: 30 });
    save(); city.setSeaPlots(db.world.sea); toast(`🌊 Plot rented for ${naira(price)}`); openSeaPlots();
  } else if (f.id === 'run-form') {
    if (s.money < 20000) return toast('You need ₦20,000 to run');
    addMoney(-20000, 'Campaign fee');
    db.world.gov.candidates.push({ username: user().username, slogan: data.get('slogan'), policy: data.get('policy'), votes: 0 });
    save(); toast('🏛️ You are on the ballot!'); refreshSheet();
  }
});

// ── Auth ─────────────────────────────────────────────
async function hash(pw) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('eko-life:' + pw));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function renderAuth(mode) {
  const look = { skin: LOOKS.skin[4], top: LOOKS.top[1] };
  let home = 'yaba';
  const yNow = new Date().getFullYear();
  $('#auth-view').innerHTML = `
    <a class="back" href="#/">← Back to the city</a>
    <div class="auth-head"><div class="crown">👑</div><h1>Eko Life <span class="badge18">18+</span></h1><p>Live your Lagos story.</p></div>
    <div class="card">
      <div class="tabs"><button data-mode="signup" class="${mode === 'signup' ? 'on' : ''}">Create account</button><button data-mode="login" class="${mode === 'login' ? 'on' : ''}">Log in</button></div>
      ${mode === 'signup' ? `
      <form id="signup" novalidate>
        <div class="field"><label>Your name</label><input class="input" name="name" placeholder="e.g. Tolu Adebayo" maxlength="40" /></div>
        <div class="field"><label>Username</label><div class="input-wrap"><span class="prefix">@</span><input class="input with-prefix" name="username" placeholder="tolu_eko" maxlength="20" autocomplete="username" /></div><div class="hint">This is your Sim's name in Eko Life.</div></div>
        <div class="field"><label>Password</label><div class="input-wrap"><input class="input" type="password" name="password" autocomplete="new-password" /><button type="button" class="eye" data-eye>👁️</button></div><div class="hint">Tip: 8+ characters and not 123456 😅 makes it harder to guess</div></div>
        <div class="field"><label>Email</label><input class="input" type="email" name="email" placeholder="you@email.com" autocomplete="email" /><div class="hint">Stored only on this device, so you can log in with it.</div></div>
        <div class="field"><label>Date of birth</label><div class="row3">
          <select class="input" name="d"><option value="">Day</option>${Array.from({ length: 31 }, (_, i) => `<option>${i + 1}</option>`).join('')}</select>
          <select class="input" name="m"><option value="">Month</option>${months.map((m, i) => `<option value="${i}">${m}</option>`).join('')}</select>
          <select class="input" name="y"><option value="">Year</option>${Array.from({ length: 90 }, (_, i) => `<option>${yNow - 10 - i}</option>`).join('')}</select>
        </div></div>
        <div class="field"><label>Skin</label><div class="swatches" data-sw="skin">${LOOKS.skin.map((c) => `<button type="button" data-c="${c}" class="${c === look.skin ? 'on' : ''}" style="background:${c}"></button>`).join('')}</div></div>
        <div class="field"><label>Outfit</label><div class="swatches" data-sw="top">${LOOKS.top.map((c) => `<button type="button" data-c="${c}" class="${c === look.top ? 'on' : ''}" style="background:${c}"></button>`).join('')}</div></div>
        <div class="field"><label>Where you go stay?</label><div class="homes-pick">${HOMES.map((h) => `<button type="button" data-h="${h.id}" class="${h.id === home ? 'on' : ''}">${h.emoji} ${h.name}<small>${h.rent ? naira(h.rent) + '/day' : 'Free'}</small></button>`).join('')}</div></div>
        <label class="check"><input type="checkbox" name="agree" /> I'm 18+ and I agree to the Terms, Community Guidelines and <a href="#/privacy">Privacy Policy</a>.</label>
        <div class="err" id="err"></div>
        <button class="btn primary big block">Sign up · it's free</button>
        <p class="foot">Your Sim will live in the same Lagos as everyone else on this device.</p>
      </form>` : `
      <form id="login" novalidate>
        <div class="field"><label>Username or email</label><input class="input" name="id" autocomplete="username" /></div>
        <div class="field"><label>Password</label><div class="input-wrap"><input class="input" type="password" name="password" autocomplete="current-password" /><button type="button" class="eye" data-eye>👁️</button></div></div>
        <div class="err" id="err"></div>
        <button class="btn primary big block">Log in</button>
        <p class="foot">New here? <a href="#/auth">Create your Lagosian</a></p>
      </form>`}
    </div>`;
  const v = $('#auth-view');
  v.onclick = (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.mode) location.hash = b.dataset.mode === 'login' ? '#/auth/login' : '#/auth';
    if ('eye' in b.dataset) { const i = b.previousElementSibling; i.type = i.type === 'password' ? 'text' : 'password'; }
    if (b.dataset.c) { const sw = b.parentElement.dataset.sw; look[sw] = b.dataset.c; [...b.parentElement.children].forEach((x) => x.classList.toggle('on', x === b)); }
    if (b.dataset.h) { home = b.dataset.h; [...b.parentElement.children].forEach((x) => x.classList.toggle('on', x === b)); }
  };
  v.onsubmit = async (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    const err = (m) => { $('#err').textContent = m; };
    if (e.target.id === 'signup') {
      const username = f.username.trim().toLowerCase();
      if (!f.name.trim()) return err('Tell us your name');
      if (!/^[a-z0-9_.]{3,20}$/.test(username)) return err('Username: 3–20 letters, numbers, _ or .');
      if (db.users[username] || NPC_NAMES.includes(username)) return err('That username is taken');
      if (f.password.length < 6) return err('Password needs at least 6 characters');
      if (!/^\S+@\S+\.\S+$/.test(f.email)) return err('Enter a valid email');
      if (Object.values(db.users).some((u) => u.email === f.email.toLowerCase())) return err('That email already has an account');
      if (!f.d || f.m === '' || !f.y) return err('Pick your date of birth');
      const dob = new Date(+f.y, +f.m, +f.d);
      if ((Date.now() - dob) / (365.25 * 864e5) < 18) return err('Eko Life is for 18+ only');
      if (!f.agree) return err('Please confirm you are 18+ and agree');
      db.users[username] = { name: f.name.trim(), username, email: f.email.toLowerCase(), pass: await hash(f.password), dob: dob.toISOString().slice(0, 10), look: { ...look }, home, created: Date.now() };
      db.saves[username] = upgrade(newSim());
      db.session = username; save();
      location.hash = '#/'; toast(`🎉 Welcome to Lagos, @${username}!`);
    } else {
      const id = f.id.trim().toLowerCase();
      const u = db.users[id] || Object.values(db.users).find((x) => x.email === id);
      if (!u || u.pass !== await hash(f.password)) return err('Wrong username or password');
      db.session = u.username; save();
      location.hash = '#/'; toast(`👋 Welcome back, @${u.username}`);
    }
  };
}
function renderPrivacy() {
  $('#privacy-view').innerHTML = `<a class="back" href="#/">← Back to the city</a>
    <div class="card" style="margin-top:20px"><h1>Privacy</h1>
    <p>Eko Life is local-first. Your account, password hash, Sim and the shared city state are stored in your browser's localStorage on this device only.</p>
    <ul><li>No analytics, no ad trackers, no third-party cookies.</li><li>Nothing you type is sent to a server. Fonts and the 3D engine load from public CDNs.</li>
    <li>Delete your Sim from Your Sim → Profile, or clear site data to remove everything.</li></ul></div>`;
}

// ── Router ───────────────────────────────────────────
function route() {
  const h = location.hash;
  const auth = h.startsWith('#/auth'), priv = h === '#/privacy';
  if (auth && user()) { location.hash = '#/'; return; }
  $('#city-view').hidden = auth || priv;
  $('#auth-view').hidden = !auth;
  $('#privacy-view').hidden = !priv;
  closeOverlays();
  if (auth) renderAuth(h === '#/auth/login' ? 'login' : 'signup');
  if (priv) renderPrivacy();
  if (!auth && !priv) {
    renderChrome(); placeSims(); applyNight();
    const s = sim();
    if (s) { touchStreak(s); ensureMissions(s); save(); setView(s.at === 'home' ? 'home' : 'map'); }
    else setView('map');
    dispatchEvent(new Event('resize'));
  }
}
addEventListener('hashchange', route);
route();

if (!db.consent) $('#cookie').hidden = false;
$('#cookie').addEventListener('click', (e) => {
  const c = e.target.closest('[data-consent]')?.dataset.consent; if (!c) return;
  db.consent = c; save(); $('#cookie').hidden = true;
});
