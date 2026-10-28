// Messages app: DMs, requests, groups, notifications. Modelled on the original's phone chat.
import { HOMES, LOOKS } from './data.js';

const $ = (s, r = document) => r.querySelector(s);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const hashStr = (s) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7) >>> 0;
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY = 86400000;
const hm = (t) => { const d = new Date(t); return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`; };
const dayKey = (t) => new Date(t).toDateString();
const todayKey = () => dayKey(Date.now());
const yesterdayKey = () => dayKey(Date.now() - DAY);
function ago(t) {
  const s = (Date.now() - t) / 1000;
  if (s < 60) return 'now';
  if (s < 3600) return Math.floor(s / 60) + 'm';
  if (s < 86400) return Math.floor(s / 3600) + 'h';
  const d = new Date(t); return `${d.getDate()} ${MON[d.getMonth()]}`;
}
function dayLabel(t) {
  const k = dayKey(t);
  if (k === todayKey()) return 'Today';
  if (k === yesterdayKey()) return 'Yesterday';
  const d = new Date(t); return `${WK[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`;
}

// Line icons (24×24, stroke = currentColor)
const svg = (p, w = 22) => `<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const I = {
  back: svg('<path d="m15 18-6-6 6-6"/>', 26),
  bell: svg('<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>'),
  dots: svg('<circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/>'),
  smile: svg('<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><path d="M9 9h.01M15 9h.01"/>', 24),
  mic: svg('<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><path d="M12 19v3"/>'),
  send: svg('<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>', 20),
  ticks: svg('<path d="M18 6 7 17l-5-5"/><path d="m22 10-7.5 7.5L13 16"/>', 14),
  heart: svg('<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>', 18),
  users: svg('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>', 18),
  wallet: svg('<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>', 18),
  food: svg('<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>', 18),
  job: svg('<rect width="20" height="14" x="2" y="7" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>', 18),
  company: svg('<rect width="16" height="20" x="4" y="2" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01"/>', 18),
  micS: svg('<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><path d="M12 19v3"/>', 18),
  user: svg('<circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/>', 18),
  clear: svg('<path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/>', 18),
  trash: svg('<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>', 18),
  flag: svg('<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22v-7"/>', 18),
  ban: svg('<circle cx="12" cy="12" r="10"/><path d="m4.9 4.9 14.2 14.2"/>', 18),
  pin: svg('<path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/>', 18),
  leave: svg('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>', 18),
};

const QUICK = ['How far? 👋🏾', 'I dey o 😄', 'Wetin dey happen?', 'Where you dey?'];
const EMOJI = ['😂', '😄', '😍', '🙏🏾', '👋🏾', '🔥', '😭', '😅', '👍🏾', '💯', '🎉', '😒', '❤️', '🙌🏾', '😎', '🤣'];
const R = {
  greet: ['I dey o 😄', 'How far! 👋🏾', 'Hiii', 'I dey jare, you nko?', 'Good morning o ☀️'],
  ask: ['Nothing much, just dey house', 'Na work I dey o', 'I no sure, make I check', 'Wetin you think?', 'Lol why you dey ask? 😂'],
  money: ['Abeg send small na 😭', 'Money no dey this week o', 'Na who get money for this Lagos? 😂'],
  thanks: ['You welcome 🙏🏾', 'Anytime!', 'No wahala'],
  any: ['Lol 😂', 'Ehen?', 'True talk', 'Hehe', 'Ok o', 'I hear you', 'No wahala 👍🏾', 'You too much 😅', 'Where you dey now?', 'Make we link up for Freedom Park', 'Abeg wait, I dey come', 'Sharp 🔥'],
  open: ['Hiii 👋🏾', 'How far?', 'You dey online?', 'Wetin you dey do?', 'You see wetin governor talk? 😂', 'Traffic for Third Mainland today ehn 😩', 'Make we go Quilox this weekend?', 'I just finish shift, I tire 😴'],
};
function replyFor(text = '') {
  const t = text.toLowerCase();
  if (/\b(hi+|hello|hey|how far|good (morning|afternoon|evening)|sup|watsup)\b/.test(t)) return pick(R.greet);
  if (/money|naira|₦|borrow|cash/.test(t)) return pick(R.money);
  if (/thank|tnx|thanks/.test(t)) return pick(R.thanks);
  if (t.includes('?')) return pick(R.ask);
  return pick(R.any);
}
const JOBS = ['Software Intern', 'Bank Teller', 'Resident DJ', 'Market Trader', 'Chef', 'Fitness Coach', 'Session Musician', 'Danfo Conductor'];
const HAIR = ['#1b1410', '#3b2416', '#c0562b', '#e2c27a', '#2b2b2b'];
const GROUP_BG = ['#7b5be0,#e05b9b', '#2f7de1,#5bc0e0', '#3b8352,#a3d65b', '#e0853b,#e0c23b'];

let mid = 0;
const uid = () => Date.now().toString(36) + (mid++).toString(36);
const newChat = (accepted) => ({ msgs: [], accepted, close: 0, streak: { n: 0, last: null, me: null, them: null }, rel: null, voice: true, blocked: false, pinned: false });

// Starter conversations for a new Sim (all invented players)
export function seedChats() {
  const now = Date.now();
  const m = (from, text, ago, extra = {}) => ({ id: uid(), from, text, t: now - ago, read: true, seen: true, ...extra });
  const H = 3600000;
  const chats = {
    tolu_eko: { ...newChat(true), close: 22, msgs: [
      m('me', 'You go dey Freedom Park on Saturday?', 26 * H),
      m('tolu_eko', 'Are you coming to Freedom Park on Saturday? Spoken word night 🎤', 1 * H, { read: false }),
    ] },
    kemi_owambe: { ...newChat(true), close: 41, msgs: [
      m('me', 'You said hello 👋', 12 * DAY, { kind: 'event' }),
      m('me', 'You threw shade 😒', 12 * DAY - 9 * 60000, { kind: 'event' }),
      m('me', 'Hi hi', 12 * DAY - 21 * 60000),
      m('kemi_owambe', '', 2 * DAY, { kind: 'invite', title: "Kemi_owambe's Owambe 🎉", place: 'eko' }),
      m('kemi_owambe', 'hello', 2 * DAY - 60000),
      m('kemi_owambe', 'watsup', 2 * DAY - 60000),
      m('me', 'Good', 22 * H),
      m('me', 'Ha u having party', 22 * H),
      m('kemi_owambe', 'yea', 18 * H),
    ] },
    amaka_lekki: { ...newChat(true), close: 15, msgs: [m('me', 'You don chop?', 30 * H), m('amaka_lekki', 'Yea', 28 * H, { read: false })] },
    ada_codes: { ...newChat(true), close: 30, msgs: [m('me', 'Abeg help me check my code', 31 * H), m('ada_codes', 'i cant sorry', 29 * H, { read: false }), m('ada_codes', 'i dey work', 29 * H, { read: false })] },
    'chidi.vibes': { ...newChat(true), close: 12, msgs: [m('chidi.vibes', 'Add me to the group', 27 * H), m('me', "Ok I'll add u up", 26 * H)] },
    seun4real: { ...newChat(true), close: 8, msgs: [m('seun4real', 'I just open new barbing salon for Surulere', 4 * DAY), m('me', "What's the name", 4 * DAY)] },
    'zainab.ng': { ...newChat(true), close: 6, msgs: [m('me', 'Make we link up', 4 * DAY), m('zainab.ng', 'Ok', 4 * DAY)] },
    femi_danfo: { ...newChat(false), msgs: [m('femi_danfo', 'Hiii 👋🏾 you dey Yaba?', 3 * H, { read: false })] },
    dayo_yaba: { ...newChat(false), msgs: [m('dayo_yaba', 'How far, you get aso-ebi for Saturday?', 20 * H, { read: false })] },
  };
  const groups = [{ id: 'g' + uid(), name: 'Yaba Hustlers', emoji: '💼', bg: 0, members: ['ikenna_dev', 'ada_codes', 'tunde.ikoyi'], pinned: false, msgs: [
    m('ada_codes', 'Who dey CcHub today?', 9 * DAY + 2 * H), m('me', 'Me o', 9 * DAY + H), m('ikenna_dev', 'Good morning guys', 9 * DAY),
  ] }];
  const notes = [
    { emoji: '👵🏾', title: 'Mama', text: "My pikin, have you eaten today? Don't forget to call your mother o.", t: now - 2 * H, read: false },
    { emoji: '🔑', title: 'Landlord', text: 'The gate will be locked by 11pm. NEPA bill is due Friday.', t: now - 5 * H, read: false },
  ];
  return { chats, groups, notes };
}
export function addNote(s, emoji, title, text) {
  s.notes.push({ emoji, title, text, t: Date.now(), read: false });
  if (s.notes.length > 40) s.notes.shift();
}

export function createChat(ctx) {
  const st = { tab: 'chats', filter: 'all', view: 'list', peer: null, gid: null, q: '', to: '', sheet: null, emoji: false, draft: {} };
  const typing = {};
  let nextPing = Date.now() + 45000;
  const db = () => ctx.db();
  const me = () => ctx.user()?.username;
  const esc = ctx.esc;

  // ── People directory: other accounts on this device + the town's players ──
  function people() {
    const locals = Object.values(db().users).filter((u) => u.username !== me()).map((u) => ({ username: u.username, look: u.look, home: u.home, npc: false }));
    return [...locals, ...db().world.npcHomes.map((h) => ({ ...h, npc: true }))];
  }
  const person = (name) => people().find((p) => p.username === name);
  const homeName = (name) => HOMES.find((h) => h.id === person(name)?.home)?.name || 'Lagos';

  function avatar(name, size = 56) {
    const h = hashStr(name);
    const look = person(name)?.look || { skin: LOOKS.skin[h % LOOKS.skin.length], top: LOOKS.top[(h >> 2) % LOOKS.top.length] };
    const style = (h >> 5) % 4, hc = HAIR[(h >> 3) % HAIR.length];
    const back = style === 1 ? `<path d="M19 27c0-10 6-16 13-16s13 6 13 16v19H19z" fill="${hc}"/>` : style === 3 ? `<circle cx="32" cy="23" r="15" fill="${hc}"/>` : '';
    const front = style === 3 ? `<g fill="${hc}"><circle cx="24" cy="17" r="6"/><circle cx="32" cy="14" r="6.5"/><circle cx="40" cy="17" r="6"/></g>`
      : `<path d="M21 25c0-8 5-12 11-12s11 4 11 12c-3-4-7-5-11-5s-8 1-11 5z" fill="${hc}"/>${style === 2 ? `<circle cx="32" cy="11" r="5" fill="${hc}"/>` : ''}`;
    const stripe = h & 1 ? '<path d="M28 44h8v20h-8z" fill="rgba(255,255,255,.28)"/>' : '';
    return `<span class="c-av" style="width:${size}px;height:${size}px"><svg viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true">
      <rect width="64" height="64" fill="var(--c-avbg)"/>${back}<path d="M12 66c0-14 9-22 20-22s20 8 20 22z" fill="${look.top}"/>${stripe}
      <rect x="28" y="34" width="8" height="11" rx="3" fill="${look.skin}"/><ellipse cx="32" cy="26" rx="10" ry="11.5" fill="${look.skin}"/>
      <circle cx="28" cy="27" r="1.1" fill="#1d2433"/><circle cx="36" cy="27" r="1.1" fill="#1d2433"/>
      <path d="M29 31.5q3 2 6 0" stroke="#1d2433" stroke-width="1.2" fill="none" stroke-linecap="round"/>${front}</svg></span>`;
  }
  const groupAv = (g, size = 52) => `<span class="c-av c-gav" style="width:${size}px;height:${size}px;background:linear-gradient(135deg,${GROUP_BG[g.bg % GROUP_BG.length]})">${g.emoji}</span>`;

  // ── State helpers ──
  function chatOf(s, peer) { return (s.chats[peer] ||= newChat(true)); }
  function push(s, peer, msg) {
    const c = chatOf(s, peer); const m = { id: uid(), t: Date.now(), ...msg };
    c.msgs.push(m); if (c.msgs.length > 200) c.msgs.shift();
    return m;
  }
  function touchStreak(c, who) {
    const d = todayKey(); c.streak[who] = d;
    if (c.streak.me === d && c.streak.them === d && c.streak.last !== d) {
      c.streak.n = c.streak.last === yesterdayKey() ? c.streak.n + 1 : 1; c.streak.last = d;
      if (c.streak.n > 1) ctx.toast(`🔥 ${c.streak.n}-day streak!`);
    }
  }
  const liveStreak = (c) => (c.streak.last === todayKey() || c.streak.last === yesterdayKey() ? c.streak.n : 0);
  const unreadIn = (msgs) => msgs.filter((m) => m.from !== 'me' && m.read === false).length;
  const isOpenOn = (peer) => ctx.isOpen() && st.view === 'thread' && st.peer === peer;
  const lastOf = (c) => c.msgs[c.msgs.length - 1];
  function preview(m, group) {
    if (!m) return '';
    const who = m.from === 'me' ? 'You: ' : group ? `@${m.from}: ` : '';
    if (m.kind === 'event') return m.text;
    if (m.kind === 'invite') return `${m.from === 'me' ? 'You: ' : ''}🎉 ${m.title}`;
    if (m.kind === 'voice') return `${who}🎙️ Voice note`;
    return who + m.text;
  }

  // Deliver to another account on this device so two local players can actually chat
  function mirror(peer, msg) {
    const other = db().saves[peer]; if (!other) return false;
    other.chats ||= {};
    const c = other.chats[me()] ||= newChat(false);
    if (c.blocked) return true;
    const copy = { ...msg, from: me(), read: false, seen: false };
    if (msg.kind === 'event') copy.text = msg.alt || msg.text;
    delete copy.alt;
    c.msgs.push({ id: uid(), t: Date.now(), ...copy }); touchStreak(c, 'them');
    return true;
  }

  function send(peer, msg, reply) {
    const s = ctx.sim(); const c = chatOf(s, peer);
    if (c.blocked) return ctx.toast(`You blocked @${peer}`);
    c.accepted = true;
    const { alt, ...stored } = msg;
    push(s, peer, { from: 'me', seen: false, ...stored });
    ctx.sfx('send');
    touchStreak(c, 'me');
    if (!mirror(peer, msg)) respond(peer, msg.text || msg.title || '', reply);
    ctx.save(); refresh({ bottom: true });
  }
  // NPC replies: a typing bubble, then a line (reply.text) and an optional side effect (reply.after)
  function respond(peer, text, reply = {}) {
    const sess = me();
    setTimeout(() => {
      if (me() !== sess) return;
      const c = ctx.sim().chats[peer]; if (!c) return;
      c.msgs.forEach((m) => { if (m.from === 'me') m.seen = true; });
      typing[peer] = true; refresh();
      setTimeout(() => {
        delete typing[peer];
        if (me() !== sess) return;
        const s = ctx.sim(); const c2 = s.chats[peer]; if (!c2) return refresh();
        const line = reply.text || replyFor(text);
        push(s, peer, { from: peer, text: line, read: isOpenOn(peer) });
        c2.close = Math.min(100, c2.close + (reply.close ?? 2)); touchStreak(c2, 'them');
        reply.after?.(s, c2);
        ctx.save(); refresh(); ctx.sfx(isOpenOn(peer) ? 'message' : 'notice');
        if (!isOpenOn(peer)) ctx.toast(`💬 @${peer}: ${line}`);
      }, 1100 + Math.random() * 2000);
    }, 700 + Math.random() * 1300);
  }
  function event(s, peer, text) { push(s, peer, { from: 'me', kind: 'event', text }); }

  function groupSend(g, msg) {
    const s = ctx.sim();
    g.msgs.push({ id: uid(), t: Date.now(), from: 'me', ...msg }); ctx.sfx('send');
    for (const u of g.members) {
      const og = db().saves[u]?.groups?.find((x) => x.id === g.id);
      og?.msgs.push({ id: uid(), t: Date.now(), ...msg, from: me(), read: false });
    }
    const npcs = g.members.filter((u) => person(u)?.npc);
    if (npcs.length && Math.random() < 0.8) {
      const who = pick(npcs), sess = me();
      setTimeout(() => {
        if (me() !== sess) return;
        const gg = ctx.sim().groups.find((x) => x.id === g.id); if (!gg) return;
        const line = replyFor(msg.text);
        gg.msgs.push({ id: uid(), t: Date.now(), from: who, text: line, read: ctx.isOpen() && st.view === 'group' && st.gid === g.id });
        ctx.save(); refresh();
      }, 1800 + Math.random() * 3000);
    }
    ctx.save(); refresh({ bottom: true });
  }

  // ── Counts for the HUD and app icon ──
  function unreadCount(s = ctx.sim()) {
    if (!s?.chats) return 0;
    return Object.values(s.chats).filter((c) => !c.blocked && unreadIn(c.msgs)).length + (s.groups || []).filter((g) => unreadIn(g.msgs)).length;
  }

  // ── Rendering ──
  const badge = (n, cls = '') => (n ? `<span class="c-badge ${cls}">${n > 9 ? '9+' : n}</span>` : '');
  const top = (title, back, right = '') => `<div class="c-top"><button class="c-back" ${back} aria-label="Back">${I.back}</button><h2>${title}</h2>${right}</div>`;

  function render(status) {
    const s = ctx.sim();
    let inner;
    if (st.view === 'thread' && st.peer) inner = renderThread(s);
    else if (st.view === 'group' && s.groups.find((g) => g.id === st.gid)) inner = renderGroup(s);
    else if (st.view === 'requests') inner = renderRequests(s);
    else if (st.view === 'notes') inner = renderNotes(s);
    else { st.view = 'list'; inner = renderList(s); }
    return `<div class="screen cs">${status}${inner}${st.sheet ? renderSheet(s) : ''}</div>`;
  }

  function renderList(s) {
    const notes = s.notes.filter((n) => !n.read).length;
    const accepted = Object.entries(s.chats).filter(([, c]) => c.accepted && c.msgs.length);
    const chatsUnread = accepted.filter(([, c]) => unreadIn(c.msgs)).length;
    const groupsUnread = s.groups.filter((g) => unreadIn(g.msgs)).length;
    const head = `<div class="c-head">${top('Messages', 'data-app=""', `<button class="c-round" data-c="notes" aria-label="Notifications">${I.bell}${badge(notes)}</button>`)}
      <div class="c-seg" role="tablist"><button role="tab" class="${st.tab === 'chats' ? 'on' : ''}" data-c="tab:chats">Chats ${badge(chatsUnread)}</button><button role="tab" class="${st.tab === 'groups' ? 'on' : ''}" data-c="tab:groups">Groups ${badge(groupsUnread)}</button></div></div>`;
    const filters = (extra = '') => `<div class="c-filters">${['all', 'unread', 'read'].map((f) => `<button class="${st.filter === f ? 'on' : ''}" data-c="filter:${f}">${f[0].toUpperCase() + f.slice(1)}${f === 'unread' ? badge(st.tab === 'chats' ? chatsUnread : groupsUnread) : ''}</button>`).join('')}<span class="grow"></span>${extra}</div>`;
    const pass = (n) => st.filter === 'all' || (st.filter === 'unread' ? n > 0 : n === 0);
    let body;
    if (st.tab === 'groups') {
      const list = s.groups.filter((g) => pass(unreadIn(g.msgs))).sort((a, b) => (b.pinned - a.pinned) || ((lastOf(b)?.t || 0) - (lastOf(a)?.t || 0)));
      body = filters(`<button class="c-new" data-c="newgroup">+ New group</button>`) +
        (list.length ? list.map((g) => { const l = lastOf(g), n = unreadIn(g.msgs); return `<button class="c-row ${n ? 'unread' : ''}" data-c="group:${g.id}">${groupAv(g)}<span class="c-mid"><b>${esc(g.name)}${g.pinned ? ' 📌' : ''}</b><span>${esc(preview(l, true))}</span></span><span class="c-end"><time>${l ? ago(l.t) : ''}</time>${badge(n)}</span></button>`; }).join('')
          + '<p class="c-hint">Open a group\'s ⋯ menu to pin it to the top 📌, clear its chat or leave</p>'
          : `<div class="c-empty"><span>👥</span><b>No groups yet</b><small>Start one with your people</small></div>`);
    } else if (st.to.trim()) {
      const q = st.to.trim().replace(/^@/, '').toLowerCase();
      const found = people().filter((p) => p.username.toLowerCase().includes(q)).slice(0, 12);
      body = toField() + (found.length ? `<div class="c-label">People</div>` + found.map((p) => `<button class="c-row" data-c="open:${esc(p.username)}">${avatar(p.username, 48)}<span class="c-mid"><b>@${esc(p.username)}</b><span class="c-soft">🏠 ${esc(homeName(p.username))}${p.npc ? '' : ' · on this device'}</span></span><span class="c-pill">Chat</span></button>`).join('')
        : `<div class="c-empty"><span>🔎</span><b>No one called @${esc(q)}</b><small>Check the spelling and try again</small></div>`);
    } else {
      const reqs = Object.values(s.chats).filter((c) => !c.accepted && c.msgs.length && !c.blocked);
      const reqNew = reqs.filter((c) => unreadIn(c.msgs)).length;
      const q = st.q.trim().toLowerCase();
      const list = accepted.filter(([u, c]) => pass(unreadIn(c.msgs)) && (!q || u.toLowerCase().includes(q) || preview(lastOf(c)).toLowerCase().includes(q)))
        .sort(([, a], [, b]) => (b.pinned - a.pinned) || (lastOf(b).t - lastOf(a).t));
      body = toField() + filters(`<button class="c-dots" data-c="listmenu" aria-label="More">${I.dots}</button>`) +
        (reqs.length ? `<button class="c-req" data-c="requests"><span class="c-req-ico">📨</span><span class="c-mid"><b>Message requests</b><span class="c-soft">${reqs.length} ${reqs.length > 1 ? 'people' : 'person'} you haven't chatted with${reqNew ? ` · ${reqNew} new` : ''}</span></span><span class="c-link">See</span></button>` : '') +
        `<input class="c-search" id="c-search" placeholder="Search your chats" value="${esc(st.q)}" autocomplete="off" />` +
        (list.length ? list.map(([u, c]) => chatRow(u, c)).join('') : `<div class="c-empty"><span>💬</span><b>${q ? 'No chats match' : st.filter === 'unread' ? "You're all caught up" : 'No chats yet'}</b><small>Message someone with their @username</small></div>`);
    }
    return `${head}<div class="c-body" id="c-body">${body}</div>`;
  }
  const toField = () => `<label class="c-to"><span>✏️</span><input id="c-to" placeholder="Message someone: @username" value="${esc(st.to)}" autocomplete="off" autocapitalize="off" spellcheck="false" /></label>`;
  function chatRow(u, c) {
    const l = lastOf(c), n = unreadIn(c.msgs);
    return `<button class="c-row ${n ? 'unread' : ''}" data-c="open:${esc(u)}">${avatar(u)}<span class="c-mid"><b>@${esc(u)}${c.pinned ? ' 📌' : ''}</b><span>${esc(preview(l))}</span></span><span class="c-end"><time>${ago(l.t)}</time>${badge(n)}</span></button>`;
  }

  function renderRequests(s) {
    const reqs = Object.entries(s.chats).filter(([, c]) => !c.accepted && c.msgs.length && !c.blocked).sort(([, a], [, b]) => lastOf(b).t - lastOf(a).t);
    return `<div class="c-head">${top('Requests', 'data-c="list"')}</div><div class="c-body" id="c-body"><p class="c-hint left">People you haven't chatted with. They won't know you've read it until you reply.</p>
      ${reqs.length ? reqs.map(([u, c]) => chatRow(u, c)).join('') : '<div class="c-empty"><span>📭</span><b>No requests</b></div>'}</div>`;
  }
  function renderNotes(s) {
    const list = [...s.notes].reverse();
    const html = list.length ? list.map((n) => `<div class="c-note ${n.read ? '' : 'unread'}"><span class="c-note-ico">${n.emoji}</span><span class="c-mid"><b>${esc(n.title)}</b><span>${esc(n.text)}</span></span><time>${ago(n.t)}</time></div>`).join('') : '<div class="c-empty"><span>🔔</span><b>No notifications</b></div>';
    s.notes.forEach((n) => { n.read = true; }); ctx.save();
    return `<div class="c-head">${top('Notifications', 'data-c="list"')}</div><div class="c-body" id="c-body">${html}</div>`;
  }

  function bubbles(msgs, group) {
    let html = '', lastDay = null;
    const textish = (m) => m && (!m.kind || m.kind === 'text' || m.kind === 'voice');
    msgs.forEach((m, i) => {
      const dk = dayKey(m.t);
      if (dk !== lastDay) { html += `<div class="c-day">${dayLabel(m.t)}</div>`; lastDay = dk; }
      if (m.kind === 'event') { html += `<div class="c-event"><span>${esc(m.text)} · ${hm(m.t)}</span></div>`; return; }
      if (m.kind === 'invite') {
        const mine = m.from === 'me';
        html += `<div class="c-invite"><div class="c-inv-card"><span class="c-inv-ico">${mine ? '🏠' : '🥳'}</span><span class="c-mid"><small>${mine ? 'YOU INVITED THEM' : "YOU'RE INVITED"}</small><b>${esc(m.title)}</b><time>${hm(m.t)}</time></span>${mine ? '<span class="c-soft">Sent</span>' : `<button class="c-view" data-c="view:${esc(m.place || '')}">View</button>`}</div></div>`;
        return;
      }
      const prev = msgs[i - 1], next = msgs[i + 1], mine = m.from === 'me';
      const first = !textish(prev) || prev.from !== m.from || dayKey(prev.t) !== dk;
      const last = !textish(next) || next.from !== m.from || dayKey(next.t) !== dk;
      const who = group && !mine && first ? `<small class="c-who" style="color:${['#2f7de1', '#c6324e', '#3b8352', '#7b5be0', '#d48a2c'][hashStr(m.from) % 5]}">@${esc(m.from)}</small>` : '';
      const body = m.kind === 'voice' ? `<span class="c-voice">▶<i></i><i></i><i></i><i></i><i></i><i></i><i></i> 0:${String(m.secs || 4).padStart(2, '0')}</span>` : esc(m.text);
      const meta = `<span class="c-meta">${hm(m.t)}${mine && !group ? `<span class="c-tick ${m.seen ? 'seen' : ''}">${I.ticks}</span>` : ''}</span>`;
      html += `<div class="c-line ${mine ? 'me' : ''} ${first ? 'first' : ''}">${who}<div class="c-bub ${last ? 'tail' : ''}">${body}${meta}</div></div>`;
    });
    return html;
  }
  function composer(name, draft, showQuick) {
    return `<div class="c-compose">
      ${showQuick ? `<div class="c-quick">${QUICK.map((q) => `<button data-c="quick:${esc(q)}">${esc(q)}</button>`).join('')}</div>` : ''}
      ${st.emoji ? `<div class="c-emoji">${EMOJI.map((e) => `<button data-c="emo:${e}">${e}</button>`).join('')}</div>` : ''}
      <form id="c-form" class="c-form"><div class="c-field"><button type="button" class="c-emobtn" data-c="emoji" aria-label="Emoji">${I.smile}</button>
      <textarea id="c-input" rows="1" maxlength="500" placeholder="Message ${esc(name)}…">${esc(draft)}</textarea></div>
      <button class="c-send ${draft.trim() ? 'has' : ''}" aria-label="Send"><span class="i-mic">${I.mic}</span><span class="i-send">${I.send}</span></button></form></div>`;
  }

  function renderThread(s) {
    const u = st.peer; const c = chatOf(s, u);
    // Opening marks their messages read (and, for a player on this device, shows them ✓✓)
    c.msgs.forEach((m) => { if (m.from !== 'me') m.read = true; });
    db().saves[u]?.chats?.[me()]?.msgs.forEach((m) => { if (m.from === 'me') m.seen = true; });
    const n = liveStreak(c), doneToday = c.streak.last === todayKey();
    const streak = `<div class="c-streak"><span class="c-fire">🔥 ${n}</span><span class="c-mid"><b>${n ? `${n}-day streak` : 'Start a streak'}</b><span class="c-soft">${n ? (doneToday ? "You're both in for today ✅" : 'Keep it going: both of you do something today') : 'Both of you do something together on the same day, every day'}</span></span><button class="c-what" data-c="sheet:what">What counts?</button></div>`;
    const head = `<div class="c-head c-thead">${top(`<span data-c="sheet:profile">@${esc(u)}</span>`, 'data-c="back"', `<button class="c-round" data-c="sheet:menu" aria-label="More">${I.dots}</button>`)}
      <div class="c-collapse"><p class="c-private">🔒Private · only you and @${esc(u)} can see this</p>${streak}</div>
      <div class="c-chips"><button class="g" data-c="do:invite">🏠Invite</button><button class="b" data-c="do:visit">🚪Visit</button><button class="y" data-c="sheet:money">💸Send money</button></div></div>`;
    const request = !c.accepted ? `<div class="c-reqbar"><b>@${esc(u)} wants to chat with you</b><span class="c-soft">Reply or accept to move this into your chats.</span><div><button class="c-btn blue" data-c="accept">Accept</button><button class="c-btn" data-c="do:delete">Delete</button></div></div>` : '';
    const t = typing[u] ? '<div class="c-line first"><div class="c-bub tail c-typing"><i></i><i></i><i></i></div></div>' : '';
    const foot = c.blocked
      ? `<div class="c-compose"><div class="c-blocked">You blocked @${esc(u)} · <button data-c="do:block">Unblock</button></div></div>`
      : composer('@' + u, st.draft[u] || '', !c.msgs.some((m) => m.from === 'me' && (!m.kind || m.kind === 'text')));
    ctx.save();
    return `${head}<div class="c-body c-msgs" id="c-body">${request}${bubbles(c.msgs)}${t}</div>${foot}`;
  }

  function renderGroup(s) {
    const g = s.groups.find((x) => x.id === st.gid);
    g.msgs.forEach((m) => { if (m.from !== 'me') m.read = true; });
    ctx.save();
    const head = `<div class="c-head c-thead">${top(`${g.emoji} ${esc(g.name)}`, 'data-c="back"', `<button class="c-round" data-c="sheet:gmenu" aria-label="More">${I.dots}</button>`)}
      <p class="c-private">👥 You, ${g.members.map((m) => '@' + esc(m)).join(', ')}</p></div>`;
    return `${head}<div class="c-body c-msgs" id="c-body">${bubbles(g.msgs, true)}</div>${composer(g.name, st.draft['g:' + g.id] || '', false)}`;
  }

  // ── Bottom sheets inside the phone ──
  const item = (act, ico, title, sub, cls = '') => `<button class="c-item ${cls}" data-c="${act}"><span class="c-ico">${ico}</span><span class="c-mid"><b>${title}</b><span>${sub}</span></span></button>`;
  function renderSheet(s) {
    const u = st.peer, c = u && s.chats[u];
    const at = u ? '@' + esc(u) : '';
    let body = '';
    switch (st.sheet) {
      case 'menu':
        body = `<div class="c-sh-h"><span class="c-round">${I.dots}</span><b>${at}</b></div>` +
          item('do:bae', I.heart, c.rel === 'bae' ? `@${esc(u)} is your Bae 💘` : 'Ask to be my Bae', "Once you're close (40+). They have to say yes") +
          item('sheet:family', I.users, c.rel && c.rel !== 'bae' ? `Family · ${c.rel}` : 'Add as family', 'Sibling, cousin, aunty, in-law… they have to agree') +
          item('sheet:request', I.wallet, 'Request money', `Ask ${at} to send you some`) +
          item('sheet:food', I.food, 'Buy them food', 'Order a meal to their door') +
          item('sheet:hire', I.job, 'Hire them for a job', 'Decorating, cooking, DJ, driving… the fee is held safe') +
          item('sheet:companies', I.company, 'Their companies', `What ${at} owns`) +
          item('do:voice', I.micS, c.voice ? `Stop voice notes from ${at}` : `Allow voice notes from ${at}`, c.voice ? "They won't be able to send you voice notes" : 'Let them send you voice notes') +
          item('do:pin', I.pin, c.pinned ? 'Unpin chat' : 'Pin chat', 'Keep it at the top of your chats') +
          item('sheet:profile', I.user, 'View profile', 'Their CV and HD Avatar') +
          item('do:clear', I.clear, 'Clear chat', 'Empties it on your phone. They keep theirs') +
          item('do:delete', I.trash, 'Delete chat', "Off your list and empty. It's back if they write again") +
          item('sheet:report', I.flag, `Report ${at}`, "Scams, threats, selling, anything that's not right", 'red') +
          item('do:block', I.ban, c.blocked ? `Unblock ${at}` : `Block ${at}`, c.blocked ? 'They can message you again' : "They can't message you, interact with you or visit", 'red');
        break;
      case 'gmenu': {
        const g = s.groups.find((x) => x.id === st.gid);
        body = `<div class="c-sh-h">${groupAv(g, 36)}<b>${esc(g.name)}</b></div>` +
          item('g:pin', I.pin, g.pinned ? 'Unpin group' : 'Pin group', 'Keep it at the top of your groups') +
          item('g:clear', I.clear, 'Clear chat', 'Empties it on your phone. Others keep theirs') +
          item('g:leave', I.leave, 'Leave group', "You won't get its messages any more", 'red');
        break;
      }
      case 'what':
        body = `<div class="c-sh-h"><span class="c-round">🔥</span><b>What counts for a streak?</b></div>
          <p class="c-sh-p">Messages, voice notes, invites, visits, food and money all count. You and @${esc(u)} each need to do at least one on the same day. Miss a day and the streak starts again.</p>
          <div class="c-sh-p"><b>Now:</b> ${liveStreak(c)} day${liveStreak(c) === 1 ? '' : 's'} · You ${c.streak.me === todayKey() ? '✅' : '⏳'} · @${esc(u)} ${c.streak.them === todayKey() ? '✅' : '⏳'}</div>`;
        break;
      case 'profile': {
        const h = hashStr(u);
        body = `<div class="c-prof">${avatar(u, 96)}<b>@${esc(u)}</b><span class="c-soft">🏠 Lives in ${esc(homeName(u))} · 💼 ${person(u)?.npc ? JOBS[h % JOBS.length] : 'Player on this device'}</span>
          ${c?.rel ? `<span class="c-pill">${c.rel === 'bae' ? '💘 Your Bae' : '👪 ' + esc(c.rel)}</span>` : ''}</div>
          <div class="c-sh-p"><div class="c-close"><span>Closeness</span><b>${c?.close || 0}/100</b></div><div class="c-bar"><i style="width:${c?.close || 0}%"></i></div></div>
          <div class="c-sh-p">🔥 Streak: <b>${c ? liveStreak(c) : 0} days</b><br>⭐ Level ${1 + (h % 14)} · ${['Calm', 'Hustler', 'Party starter', 'Bookworm', 'Foodie'][h % 5]}</div>
          <div class="c-sh-row"><button class="c-btn blue" data-c="close">Message</button><button class="c-btn" data-c="do:visit">🚪 Visit</button></div>`;
        break;
      }
      case 'money': case 'request':
        body = `<div class="c-sh-h"><span class="c-round">💸</span><b>${st.sheet === 'money' ? `Send money to ${at}` : `Request money from ${at}`}</b></div>
          ${st.sheet === 'money' ? `<p class="c-sh-p c-soft">Your wallet: ${ctx.naira(s.money)}</p>` : ''}
          <form class="c-sh-form" id="c-money-form"><div class="c-amts">${[500, 1000, 2000, 5000].map((a) => `<label><input type="radio" name="amt" value="${a}" ${a === 1000 ? 'checked' : ''}/><span>${ctx.naira(a)}</span></label>`).join('')}</div>
          <input class="c-search" name="custom" type="number" min="100" max="1000000" step="100" placeholder="Or type an amount" />
          <button class="c-btn green block">${st.sheet === 'money' ? 'Send' : 'Request'}</button></form>`;
        break;
      case 'food':
        body = `<div class="c-sh-h"><span class="c-round">🍛</span><b>Buy ${at} food</b></div>` +
          [['jollof', '🍛', 'Party jollof & chicken', 2500], ['amala', '🍲', 'Amala & ewedu', 1800], ['suya', '🍢', 'Suya wrap', 1500], ['shawarma', '🌯', 'Double-sausage shawarma', 3000]]
            .map(([id, e, l, p]) => item(`buy:${id}|${p}|${l}`, e, l, `${ctx.naira(p)} · delivered to their door`)).join('');
        break;
      case 'hire':
        body = `<div class="c-sh-h"><span class="c-round">💼</span><b>Hire ${at}</b></div>` +
          [['cook', '🍳', 'Cooking', 3000, 'They cook for you · Hunger +40'], ['dj', '🎧', 'DJ for your house', 6000, 'Party at home · Fun +40'], ['decor', '🎨', 'Decorating', 4000, 'Your place looks finer · Fun +15'], ['drive', '🚗', 'Driving', 2500, 'They drive you around · Energy +15']]
            .map(([id, e, l, p, sub]) => item(`hire:${id}|${p}|${l}`, e, `${l} · ${ctx.naira(p)}`, sub)).join('') + '<p class="c-hint">The fee is held safe until the job is done.</p>';
        break;
      case 'family':
        body = `<div class="c-sh-h"><span class="c-round">👪</span><b>Add ${at} as family</b></div><div class="c-amts wrap">` +
          ['Sibling', 'Cousin', 'Aunty', 'Uncle', 'In-law', 'Bestie'].map((r) => `<button class="c-chipbtn" data-c="fam:${r}">${r}</button>`).join('') + '</div><p class="c-hint">They have to agree.</p>';
        break;
      case 'companies':
        body = `<div class="c-sh-h"><span class="c-round">🏢</span><b>${at}'s companies</b></div><div class="c-empty"><span>🏗️</span><b>${at} doesn't own a company yet</b><small>Companies show here once they start one</small></div>`;
        break;
      case 'report':
        body = `<div class="c-sh-h"><span class="c-round">🚩</span><b>Report ${at}</b></div>` +
          ['Scam or fraud', 'Threats or bullying', 'Selling or spam', 'Fake account', 'Something else'].map((r) => item(`report:${r}`, '•', r, '')).join('');
        break;
      case 'listmenu':
        body = `<div class="c-sh-h"><span class="c-round">${I.dots}</span><b>Chats</b></div>` + item('do:readall', '✓', 'Mark all as read', 'Clear every unread badge');
        break;
      case 'newgroup': {
        const ppl = people().slice(0, 16);
        body = `<div class="c-sh-h"><span class="c-round">👥</span><b>New group</b></div>
          <form class="c-sh-form" id="c-group-form"><input class="c-search" name="name" placeholder="Group name" maxlength="30" required />
          <div class="c-amts wrap">${['💼', '🎉', '⚽', '🍛', '🎶', '📚'].map((e, i) => `<label><input type="radio" name="emoji" value="${e}" ${i ? '' : 'checked'}/><span>${e}</span></label>`).join('')}</div>
          <div class="c-label">Add people</div><div class="c-pick">${ppl.map((p) => `<label><input type="checkbox" name="m" value="${esc(p.username)}"/>${avatar(p.username, 32)}<span>@${esc(p.username)}</span></label>`).join('')}</div>
          <button class="c-btn green block">Create group</button></form>`;
        break;
      }
    }
    return `<div class="c-sheet-wrap" data-c="close"><div class="c-sheet"><div class="c-grip"></div>${body}</div></div>`;
  }

  // ── Re-render, keeping focus, caret and scroll ──
  function refresh(opt = {}) {
    if (!ctx.isOpen()) return;
    const ae = document.activeElement, fid = ae && $('#phone').contains(ae) ? ae.id : null;
    const sel = fid && ae.selectionStart;
    const body = $('#c-body'), stp = body?.scrollTop;
    const atBottom = body && body.scrollHeight - body.scrollTop - body.clientHeight < 80;
    ctx.rerender();
    const nb = $('#c-body');
    if (nb) {
      if (opt.bottom || ((st.view === 'thread' || st.view === 'group') && atBottom && !opt.top)) nb.scrollTop = nb.scrollHeight;
      else if (!opt.top && stp != null) nb.scrollTop = stp;
    }
    if (fid) { const el = document.getElementById(fid); if (el) { el.focus(); try { el.setSelectionRange(sel, sel); } catch {} } }
    collapse();
  }
  function collapse() {
    const b = $('#c-body'), h = $('.c-thead');
    if (b && h) h.classList.toggle('collapsed', b.scrollTop > 24);
  }
  function go(view, extra = {}) { Object.assign(st, { view, sheet: null, emoji: false }, extra); refresh(view === 'thread' || view === 'group' ? { bottom: true } : { top: true }); }

  // ── Actions ──
  function act(a, arg) {
    const s = ctx.sim(); const u = st.peer; const c = u && s.chats[u];
    const fx = (f) => ctx.boost(f);
    switch (a) {
      case 'invite':
        send(u, { kind: 'invite', title: `Come chill at my place 🏠`, alt: `Come chill at @${me()}'s place 🏠` }, { text: pick(['I go come 🙌🏾', 'On my way!', 'Save me food o 😂']), close: 5, after: (s2) => { event(s2, u, `@${u} came over 🏠`); fx({ social: 20, fun: 10 }); } });
        break;
      case 'visit':
        st.sheet = null;
        if (s.money < 200) return ctx.toast('You need ₦200 for transport');
        ctx.addMoney(-200, `Transport to @${u}`);
        send(u, { kind: 'event', text: `You visited @${u} 🚪`, alt: `@${me()} visited you 🚪` }, { text: pick(['Thanks for coming! 🙌🏾', 'You don come? Enter 😄', 'Welcome welcome']), close: 5, after: () => fx({ social: 25, fun: 8 }) });
        break;
      case 'bae':
        if (c.rel === 'bae') return;
        if (c.close < 40) { st.sheet = null; refresh(); return ctx.toast(`💘 You need to be close first (40+). You're at ${c.close}.`); }
        st.sheet = null;
        send(u, { text: 'Will you be my Bae? 💘' }, Math.random() < 0.75
          ? { text: 'Yes o! 🥰', close: 10, after: (s2, c2) => { c2.rel = 'bae'; event(s2, u, `💘 You and @${u} are now Bae`); } }
          : { text: 'Let us take am slow 😅' });
        break;
      case 'voice': c.voice = !c.voice; st.sheet = null; ctx.toast(c.voice ? `🎙️ @${u} can send you voice notes` : `🔇 Voice notes from @${u} are off`); ctx.save(); refresh(); break;
      case 'pin': c.pinned = !c.pinned; st.sheet = null; ctx.save(); refresh(); break;
      case 'clear': if (!confirm(`Clear your chat with @${u}?`)) return; c.msgs = []; st.sheet = null; ctx.save(); refresh(); break;
      case 'delete': delete s.chats[u]; ctx.save(); go('list'); ctx.toast(`Deleted your chat with @${u}`); break;
      case 'block': c.blocked = !c.blocked; st.sheet = null; ctx.save(); refresh(); ctx.toast(c.blocked ? `🚫 Blocked @${u}` : `Unblocked @${u}`); break;
      case 'readall':
        Object.values(s.chats).forEach((x) => x.msgs.forEach((m) => { if (m.from !== 'me') m.read = true; }));
        s.groups.forEach((g) => g.msgs.forEach((m) => { if (m.from !== 'me') m.read = true; }));
        st.sheet = null; ctx.save(); refresh(); break;
    }
  }

  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-c]'); if (!b || !b.closest('#phone')) return;
    const [k, ...rest] = b.dataset.c.split(':'); const v = rest.join(':');
    if (k === 'close') { if (b.classList.contains('c-sheet-wrap') && e.target !== b) return; st.sheet = null; return refresh(); }
    const s = ctx.sim(); if (!s) return;
    if (k === 'tab') { st.tab = v; st.filter = 'all'; return refresh({ top: true }); }
    if (k === 'filter') { st.filter = v; return refresh({ top: true }); }
    if (k === 'list') return go('list');
    if (k === 'back') return go(st.view === 'thread' && s.chats[st.peer] && !s.chats[st.peer].accepted ? 'requests' : 'list');
    if (k === 'notes') return go('notes');
    if (k === 'requests') return go('requests');
    if (k === 'open') { st.to = ''; return go('thread', { peer: v }); }
    if (k === 'group') return go('group', { gid: v });
    if (k === 'sheet') { st.sheet = v; return refresh(); }
    if (k === 'listmenu' || k === 'newgroup') { st.sheet = k; return refresh(); }
    if (k === 'emoji') { st.emoji = !st.emoji; return refresh(); }
    if (k === 'emo') { const key = st.view === 'group' ? 'g:' + st.gid : st.peer; st.draft[key] = (st.draft[key] || '') + v; return refresh(); }
    if (k === 'quick') return send(st.peer, { text: v });
    if (k === 'view') { if (v) ctx.openPlace(v); return; }
    if (k === 'accept') { s.chats[st.peer].accepted = true; ctx.save(); return refresh(); }
    if (k === 'do') return act(v);
    if (k === 'fam') {
      const u = st.peer, c = s.chats[u]; st.sheet = null;
      return send(u, { text: `Make we be family? You go be my ${v.toLowerCase()} 👪` }, c.close >= 20
        ? { text: 'Of course! Family for life ❤️', close: 6, after: (s2, c2) => { c2.rel = v; event(s2, u, `👪 @${u} is now your ${v.toLowerCase()}`); } }
        : { text: 'We never close reach that level 😅' });
    }
    if (k === 'buy' || k === 'hire') {
      const [id, price, label] = v.split('|'); const u = st.peer;
      if (s.money < +price) return ctx.toast('💸 Not enough naira');
      ctx.addMoney(-price, `${k === 'buy' ? label + ' for' : 'Hired'} @${u}`); st.sheet = null;
      if (k === 'buy') return send(u, { kind: 'event', text: `You bought @${u} ${label.toLowerCase()} 🍛`, alt: `@${me()} bought you ${label.toLowerCase()} 🍛` }, { text: pick(['Ah thank you o 🙏🏾', 'You be correct person 😍', 'Food don land! ❤️']), close: 8 });
      const boost = { cook: { hunger: 40 }, dj: { fun: 40 }, decor: { fun: 15 }, drive: { energy: 15 } }[id];
      return send(u, { kind: 'event', text: `You hired @${u}: ${label.toLowerCase()} 💼`, alt: `@${me()} hired you: ${label.toLowerCase()} 💼` }, { text: pick(['I don finish am ✅', 'Job done boss 💪🏾', 'Done! Pay don enter, thanks']), close: 4, after: () => ctx.boost(boost) });
    }
    if (k === 'report') { st.sheet = null; refresh(); return ctx.toast(`🚩 Report sent (${v}). Thanks for keeping Eko Life safe.`); }
    if (k === 'g') {
      const g = s.groups.find((x) => x.id === st.gid); st.sheet = null;
      if (v === 'pin') { g.pinned = !g.pinned; ctx.save(); return refresh(); }
      if (v === 'clear') { if (!confirm('Clear this group chat?')) return; g.msgs = []; ctx.save(); return refresh(); }
      if (v === 'leave') { if (!confirm(`Leave ${g.name}?`)) return; s.groups = s.groups.filter((x) => x !== g); ctx.save(); st.tab = 'groups'; return go('list'); }
    }
  });

  document.addEventListener('input', (e) => {
    const t = e.target; if (!t.closest?.('#phone')) return;
    if (t.id === 'c-to') { st.to = t.value; refresh({ top: true }); }
    else if (t.id === 'c-search') { st.q = t.value; refresh({ top: true }); }
    else if (t.id === 'c-input') {
      st.draft[st.view === 'group' ? 'g:' + st.gid : st.peer] = t.value;
      t.style.height = 'auto'; t.style.height = Math.min(120, t.scrollHeight) + 'px';
      $('.c-send')?.classList.toggle('has', !!t.value.trim());
    }
  });
  document.addEventListener('keydown', (e) => {
    const t = e.target;
    if (t.id === 'c-input' && e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); t.form.requestSubmit(); }
    if (t.id === 'c-to' && e.key === 'Enter') {
      const q = st.to.trim().replace(/^@/, '').toLowerCase(); if (!q) return;
      const p = people().find((x) => x.username.toLowerCase() === q) || people().find((x) => x.username.toLowerCase().includes(q));
      if (!p) return ctx.toast(`No one called @${q}`);
      st.to = ''; go('thread', { peer: p.username });
    }
  });
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && ctx.isOpen() && (st.sheet || st.emoji)) { e.stopImmediatePropagation(); st.sheet = null; st.emoji = false; refresh(); }
  }, true);
  document.addEventListener('scroll', (e) => { if (e.target.id === 'c-body') collapse(); }, true);

  document.addEventListener('submit', (e) => {
    const f = e.target; if (!f.closest('#phone') || !f.id.startsWith('c-')) return;
    e.preventDefault(); e.stopImmediatePropagation();
    const s = ctx.sim(); const data = new FormData(f);
    if (f.id === 'c-form') {
      const group = st.view === 'group' ? s.groups.find((g) => g.id === st.gid) : null;
      const key = group ? 'g:' + group.id : st.peer;
      const text = (st.draft[key] || '').trim();
      st.draft[key] = ''; st.emoji = false;
      const msg = text ? { text } : { kind: 'voice', secs: 2 + Math.floor(Math.random() * 12) };
      if (!text && !group && !s.chats[st.peer]?.voice && person(st.peer)?.npc === false) return ctx.toast('They need to allow voice notes from you');
      return group ? groupSend(group, msg) : send(st.peer, msg, text ? undefined : { text: pick(['😂😂 your voice!', 'I don hear you', 'Lol ok o']) });
    }
    if (f.id === 'c-money-form') {
      const amt = Math.round(+data.get('custom') || +data.get('amt')); const u = st.peer;
      if (!(amt >= 100)) return ctx.toast('Minimum is ₦100');
      if (st.sheet === 'request') {
        st.sheet = null;
        return send(u, { text: `Abeg, fit send me ${ctx.naira(amt)}? 🙏🏾` }, Math.random() < 0.5 && amt <= 5000
          ? { text: 'Sent! 💸', after: (s2) => { push(s2, u, { from: u, kind: 'event', text: `@${u} sent you ${ctx.naira(amt)} 💸`, read: true }); ctx.addMoney(amt, `From @${u}`); } }
          : { text: pick(R.money) });
      }
      if (s.money < amt) return ctx.toast('💸 Not enough naira');
      ctx.addMoney(-amt, `Sent to @${u}`); st.sheet = null;
      const other = db().saves[u]; if (other) { other.money += amt; other.ledger.push({ t: `From @${me()}`, v: amt }); }
      return send(u, { kind: 'event', text: `You sent ${ctx.naira(amt)} 💸`, alt: `@${me()} sent you ${ctx.naira(amt)} 💸` }, { text: pick(['Thank you o 🙏🏾', 'God bless you ❤️', 'Ah! You too much 😍']), close: 6 });
    }
    if (f.id === 'c-group-form') {
      const members = data.getAll('m'); if (!members.length) return ctx.toast('Add at least one person');
      const g = { id: 'g' + uid(), name: data.get('name').trim(), emoji: data.get('emoji'), bg: Math.floor(Math.random() * GROUP_BG.length), members, pinned: false, msgs: [] };
      g.msgs.push({ id: uid(), t: Date.now(), from: 'me', kind: 'event', text: `You created ${g.name}` });
      s.groups.push(g);
      for (const u of members) {
        const other = db().saves[u]; if (!other) continue;
        (other.groups ||= []).push({ ...g, members: [me(), ...members.filter((x) => x !== u)], msgs: [{ id: uid(), t: Date.now(), from: me(), kind: 'event', text: `@${me()} added you to ${g.name}`, read: false }] });
      }
      ctx.save(); st.tab = 'groups'; return go('group', { gid: g.id });
    }
  }, true);

  // Townsfolk sometimes message first: a line, or an invite to a party
  function tick() {
    const s = ctx.sim(); if (!s?.chats || Date.now() < nextPing) return;
    nextPing = Date.now() + (70 + Math.random() * 110) * 1000;
    const known = Object.keys(s.chats).filter((u) => person(u)?.npc && !s.chats[u].blocked);
    const u = Math.random() < 0.75 && known.length ? pick(known) : pick(db().world.npcHomes).username;
    const fresh = !s.chats[u]; if (fresh) s.chats[u] = newChat(false);
    if (s.chats[u].blocked) return;
    const open = isOpenOn(u);
    if (Math.random() < 0.25) {
      const party = pick([['Owambe 🎉', 'eko'], ['birthday party 🎂', 'quilox'], ['boat cruise ⛵', 'cruise'], ['Afrobeat night 🎷', 'shrine']]);
      push(s, u, { from: u, kind: 'invite', title: `${u}'s ${party[0]}`, place: party[1], read: open });
      if (!open) ctx.toast(`🎉 @${u} invited you to their ${party[0]}`);
    } else {
      const line = pick(R.open);
      push(s, u, { from: u, text: line, read: open });
      if (!open) ctx.toast(`💬 @${u}: ${line}`);
    }
    touchStreak(s.chats[u], 'them');
    ctx.save(); refresh(); ctx.sfx('notice');
  }

  // Met someone around town: add a chat with a hello event
  function met(s, u, where) {
    const c = s.chats[u] ||= newChat(true); c.accepted = true;
    push(s, u, { from: 'me', kind: 'event', text: `You said hello 👋 at ${where}` });
    push(s, u, { from: u, text: pick(['Nice meeting you 😄', 'Save my number o', 'Hiii, na me be this 👋🏾']), read: false });
    c.close = Math.min(100, c.close + 4); touchStreak(c, 'me'); touchStreak(c, 'them');
  }

  return {
    render, unreadCount, tick, met, avatar,
    open(peer) { Object.assign(st, { view: 'thread', peer, sheet: null, emoji: false, to: '' }); },
    reset() { Object.assign(st, { view: 'list', tab: 'chats', filter: 'all', peer: null, gid: null, q: '', to: '', sheet: null, emoji: false }); },
    afterOpen() { const b = $('#c-body'); if (b && (st.view === 'thread' || st.view === 'group')) b.scrollTop = b.scrollHeight; collapse(); },
  };
}
