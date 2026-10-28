import { icon } from './icons.js';
import { loadSettings, saveSettings, idb, uid } from './store.js';
import { listModels, streamChat, complete, keyInfo } from './openrouter.js';
import { renderMarkdown, esc } from './markdown.js';
import { toast, openMenu, closeMenu, openModal, confirmDialog, copyText } from './ui.js';
import { BUILTIN_GPTS } from './gpts.js';

// ---------------------------------------------------------------- state
const S = {
  settings: loadSettings(),
  chats: new Map(),
  customGpts: [],
  models: [],
  streams: new Map(), // chatId -> AbortController
  draft: { text: '', attachments: [], webSearch: false, reasoning: false },
  editing: null, // message id being edited
  settingsModal: null,
};
const $ = (s, el = document) => el.querySelector(s);
const app = $('#app');
const IS_MAC = /Mac|iPhone|iPad/.test(navigator.platform);
const MOD = IS_MAC ? '⌘' : 'Ctrl+';

const setSetting = (patch) => { Object.assign(S.settings, patch); saveSettings(S.settings); };
const allGpts = () => [...S.customGpts, ...BUILTIN_GPTS];
const gptById = (id) => allGpts().find((g) => g.id === id);
const sortedChats = () => [...S.chats.values()].filter((c) => !c.temporary)
  .sort((a, b) => (b.pinned - a.pinned) || (b.updatedAt - a.updatedAt));
const persist = (chat) => { if (!chat.temporary) idb.put('chats', chat).catch((e) => console.error(e)); };

// ---------------------------------------------------------------- theme
const mq = matchMedia('(prefers-color-scheme: dark)');
function applyTheme() {
  const t = S.settings.theme;
  document.documentElement.dataset.theme = t === 'system' ? (mq.matches ? 'dark' : 'light') : t;
}
mq.addEventListener('change', applyTheme);

// ---------------------------------------------------------------- routing
function route() {
  const p = location.pathname.replace(/\/+$/, '') || '/';
  const temporary = new URLSearchParams(location.search).get('temporary-chat') === 'true';
  let m;
  if ((m = p.match(/^\/c\/([\w-]+)$/))) return { name: 'chat', id: m[1], temporary };
  if ((m = p.match(/^\/g\/([\w-]+)$/))) return { name: 'home', gptId: m[1], temporary };
  if ((m = p.match(/^\/gpts\/editor(?:\/([\w-]+))?$/))) return { name: 'gpt-editor', id: m[1] };
  if (p === '/gpts') return { name: 'gpts' };
  if (p === '/library') return { name: 'library' };
  return { name: 'home', temporary };
}
function navigate(path, { replace = false } = {}) {
  if (path !== location.pathname + location.search) history[replace ? 'replaceState' : 'pushState']({}, '', path);
  render();
}
addEventListener('popstate', render);
addEventListener('hashchange', syncSettingsHash);
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[data-link]');
  if (!a || e.metaKey || e.ctrlKey || e.shiftKey) return;
  e.preventDefault();
  closeMobileSidebar();
  navigate(a.getAttribute('href'));
});

// ---------------------------------------------------------------- render
function render() {
  closeMenu();
  S.editing = null;
  const r = route();
  app.classList.toggle('collapsed', !!S.settings.sidebarCollapsed);
  renderSidebar(r);
  if (r.name === 'chat' && !S.chats.has(r.id)) { navigate('/', { replace: true }); return; }
  renderTopbar(r);
  const view = $('#view');
  if (r.name === 'chat') renderChat(view, S.chats.get(r.id));
  else if (r.name === 'gpts') renderGpts(view);
  else if (r.name === 'gpt-editor') renderGptEditor(view, r.id);
  else if (r.name === 'library') renderLibrary(view);
  else renderHome(view, r);
  const chat = r.name === 'chat' ? S.chats.get(r.id) : null;
  document.title = chat ? `${chat.title} | ChatGPT Chat: REA` : r.name === 'gpts' ? 'GPTs | ChatGPT Chat: REA' : r.name === 'library' ? 'Library | ChatGPT Chat: REA' : 'ChatGPT Chat: REA';
}

// ---------------------------------------------------------------- sidebar
function renderSidebar(r) {
  const sb = $('#sidebar');
  const activeChat = r.name === 'chat' ? r.id : null;
  const recentGpts = (S.settings.recentGpts || []).map(gptById).filter(Boolean).slice(0, 4);
  const chats = sortedChats();
  const initials = (S.settings.name || 'You').trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  sb.innerHTML = `
    <div class="sb-top">
      <button class="logo-btn" data-act="logo" aria-label="Home">${icon('logo', 'logo')}${icon('sidebar', 'expand-ico')}</button>
      <button class="icon-btn collapse-btn desktop-only" data-act="collapse" data-tip="Close sidebar" aria-label="Close sidebar">${icon('sidebar')}</button>
      <button class="icon-btn mobile-only" data-act="mobile-close" aria-label="Close sidebar">${icon('x')}</button>
    </div>
    <div class="sb-scroll">
      <a class="nav-item ${r.name === 'home' && !r.gptId ? 'active' : ''}" href="/" data-link data-tip-collapsed="New chat">${icon('newchat')}<span class="label">New chat</span><span class="kbd">${MOD}⇧O</span></a>
      <button class="nav-item" data-act="search">${icon('search')}<span class="label">Search chats</span><span class="kbd">${MOD}K</span></button>
      <a class="nav-item ${r.name === 'library' ? 'active' : ''}" href="/library" data-link>${icon('library')}<span class="label">Library</span></a>
      <a class="nav-item ${r.name === 'gpts' || r.name === 'gpt-editor' ? 'active' : ''}" href="/gpts" data-link>${icon('gpts')}<span class="label">GPTs</span></a>
      ${recentGpts.length ? `<div class="sb-section"><div class="sb-section-title">GPTs</div>
        ${recentGpts.map((g) => `<a class="nav-item ${r.gptId === g.id ? 'active' : ''}" href="/g/${g.id}" data-link><span class="gpt-avatar" style="background:${g.color}">${esc(g.emoji)}</span><span class="label">${esc(g.name)}</span></a>`).join('')}
      </div>` : ''}
      <div class="sb-section">
        <div class="sb-section-title">Chats</div>
        ${chats.length ? chats.map((c) => `
          <a class="nav-item chat-item ${c.id === activeChat ? 'active' : ''}" href="/c/${c.id}" data-link data-chat="${c.id}">
            <span class="label">${esc(c.title)}</span>${c.pinned ? `<span class="pin">${icon('pin', 'sm')}</span>` : ''}
            <span class="more" data-act="chat-menu" role="button" aria-label="Chat options">${icon('more', 'sm')}</span>
          </a>`).join('') : '<div class="sb-section-title" style="color:var(--text-3)">No chats yet</div>'}
      </div>
    </div>
    <div class="sb-foot">
      <button class="profile-btn" data-act="profile">
        <span class="avatar">${esc(initials)}</span>
        <span class="meta"><div class="name">${esc(S.settings.name || 'You')}</div><div class="sub">${S.settings.apiKey ? 'OpenRouter connected' : 'Add your OpenRouter key'}</div></span>
      </button>
    </div>`;
}

$('#sidebar').addEventListener('click', (e) => {
  const act = e.target.closest('[data-act]')?.dataset.act;
  if (!act) return;
  if (act === 'chat-menu') {
    e.preventDefault(); e.stopPropagation();
    const item = e.target.closest('[data-chat]');
    return chatMenu(item.querySelector('.more'), item.dataset.chat, item);
  }
  if (act === 'logo') {
    if (S.settings.sidebarCollapsed && innerWidth >= 768) return toggleSidebar();
    closeMobileSidebar();
    return navigate('/');
  }
  if (act === 'collapse') return toggleSidebar();
  if (act === 'mobile-close') return closeMobileSidebar();
  if (act === 'search') { closeMobileSidebar(); return openSearch(); }
  if (act === 'profile') return profileMenu(e.target.closest('[data-act]'));
});
$('#scrim').addEventListener('click', closeMobileSidebar);

function toggleSidebar() {
  if (innerWidth < 768) { app.classList.toggle('mobile-open'); return; }
  setSetting({ sidebarCollapsed: !S.settings.sidebarCollapsed });
  app.classList.toggle('collapsed', S.settings.sidebarCollapsed);
}
function closeMobileSidebar() { app.classList.remove('mobile-open'); }

function chatMenu(anchor, id, item) {
  const c = S.chats.get(id);
  item?.classList.add('menu-open');
  openMenu(anchor, [
    { icon: 'share', label: 'Share', onClick: () => shareChat(c, anchor) },
    { icon: 'pen', label: 'Rename', onClick: () => renameChat(c) },
    { icon: 'pin', label: c.pinned ? 'Unpin chat' : 'Pin chat', onClick: () => { c.pinned = !c.pinned; persist(c); render(); } },
    'sep',
    { icon: 'trash', label: 'Delete', danger: true, onClick: () => deleteChat(c) },
  ], { onClose: () => item?.classList.remove('menu-open') });
}

function renameChat(c) {
  const item = document.querySelector(`[data-chat="${c.id}"]`);
  if (!item || S.settings.sidebarCollapsed || innerWidth < 768) {
    const t = prompt('Rename chat', c.title);
    if (t?.trim()) { c.title = t.trim(); persist(c); render(); }
    return;
  }
  const label = item.querySelector('.label');
  const input = document.createElement('input');
  input.className = 'rename';
  input.value = c.title;
  label.replaceWith(input);
  input.focus(); input.select();
  input.addEventListener('click', (e) => e.preventDefault());
  let done = false;
  const finish = (save) => {
    if (done) return; done = true;
    if (save && input.value.trim()) { c.title = input.value.trim(); persist(c); }
    render();
  };
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') finish(true); if (e.key === 'Escape') finish(false); });
  input.addEventListener('blur', () => finish(true));
}

async function deleteChat(c) {
  const ok = await confirmDialog({ title: 'Delete chat?', body: `This will delete <strong>${esc(c.title)}</strong>.`, confirm: 'Delete', danger: true });
  if (!ok) return;
  S.streams.get(c.id)?.abort();
  S.chats.delete(c.id);
  idb.del('chats', c.id);
  if (route().id === c.id) navigate('/', { replace: true }); else render();
}

// TODO: confirm the real coding180 URLs
const FORUM_URL = 'https://coding180.com/forum';
const REA_APPS_URL = 'https://github.com/robort-gabriel/reverse-engineer-anything-rea-coding180';

function profileMenu(anchor) {
  const t = S.settings.theme;
  openMenu(anchor, [
    { header: S.settings.apiKey ? 'OpenRouter connected' : 'No API key configured' },
    { icon: 'sparkle', label: 'Customize ChatGPT Chat: REA', onClick: () => openSettings('Personalization') },
    { icon: 'settings', label: 'Settings', onClick: () => openSettings('General') },
    { icon: 'key', label: 'API key & models', onClick: () => openSettings('Models') },
    'sep',
    { icon: t === 'dark' ? 'moon' : 'sun', label: `Theme: ${t[0].toUpperCase() + t.slice(1)}`, desc: 'Click to cycle', onClick: () => {
      setSetting({ theme: { system: 'dark', dark: 'light', light: 'system' }[t] }); applyTheme(); toast(`Theme: ${S.settings.theme}`);
    } },
    { icon: 'code', label: 'Keyboard shortcuts', onClick: shortcutsModal },
    'sep',
    { header: 'Developed by Robort Gabriel · coding180' },
    { icon: 'user', label: 'Join our REA forum', onClick: () => open(FORUM_URL, '_blank', 'noopener') },
    { icon: 'download', label: 'More reverse-engineered apps', onClick: () => open(REA_APPS_URL, '_blank', 'noopener') },
  ], { side: 'top' });
}

// ---------------------------------------------------------------- top bar
function modelLabel(id) {
  const m = S.models.find((x) => x.id === id);
  if (m) return m.name.replace(/^[^:]+:\s*/, '');
  if (id === 'openrouter/auto') return 'Auto';
  return id.split('/').pop();
}
function currentModel() {
  const r = route();
  const c = r.name === 'chat' && S.chats.get(r.id);
  return (c && c.model) || S.settings.model;
}

function renderTopbar(r) {
  const tb = $('#topbar');
  const showModel = r.name === 'home' || r.name === 'chat';
  const chat = r.name === 'chat' ? S.chats.get(r.id) : null;
  const temp = r.temporary || chat?.temporary;
  tb.innerHTML = `
    <div class="left">
      <button class="icon-btn mobile-only" data-act="mobile-menu" aria-label="Open sidebar">${icon('menu')}</button>
      ${showModel ? `<button class="model-btn" data-act="model">ChatGPT Chat: REA <span class="sub">${esc(modelLabel(currentModel()))}</span>${icon('chevron', 'sm')}</button>` : ''}
    </div>
    <div class="right">
      ${chat && !chat.temporary ? `
        <button class="pill-btn desktop-only" data-act="share">${icon('share', 'sm')}Share</button>
        <button class="icon-btn" data-act="chat-more" aria-label="Conversation options">${icon('more')}</button>` : ''}
      ${r.name === 'home' || temp ? `<button class="icon-btn" data-act="temp" data-tip="${temp ? 'Turn off temporary chat' : 'Turn on temporary chat'}" style="${temp ? 'color:var(--text);background:var(--bg-active)' : ''}">${icon('dashed')}</button>` : ''}
      ${r.name === 'home' && !temp ? `<button class="icon-btn mobile-only" data-act="new" aria-label="New chat">${icon('newchat')}</button>` : ''}
    </div>`;
}

$('#topbar').addEventListener('click', (e) => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const r = route();
  const chat = r.name === 'chat' ? S.chats.get(r.id) : null;
  switch (b.dataset.act) {
    case 'mobile-menu': app.classList.add('mobile-open'); break;
    case 'model': modelPicker(b); break;
    case 'share': shareChat(chat, b); break;
    case 'chat-more': chatMenu(b, chat.id); break;
    case 'new': navigate('/'); break;
    case 'temp': {
      const on = !(r.temporary || chat?.temporary);
      navigate(on ? '/?temporary-chat=true' : '/');
      break;
    }
  }
});

function modelPicker(anchor) {
  const wrap = document.createElement('div');
  wrap.innerHTML = `<div class="search">${icon('search', 'sm')}<input placeholder="Search ${S.models.length || ''} OpenRouter models" /></div><div class="list"></div>`;
  const input = $('input', wrap);
  const list = $('.list', wrap);
  let kb = -1;
  const draw = () => {
    const q = input.value.trim().toLowerCase();
    const cur = currentModel();
    const fav = S.settings.favorites;
    const row = (m) => {
      const badges = [m.free && 'free', m.vision && 'vision', m.reasoning && 'reasoning'].filter(Boolean);
      return `<button class="mi" data-model="${esc(m.id)}"><span style="min-width:0"><span class="mname">${esc(m.name.replace(/^[^:]+:\s*/, ''))}</span>${badges.map((b) => `<span class="badge">${b}</span>`).join('')}<span class="desc">${esc(m.id)}${m.context ? ` · ${Math.round(m.context / 1000)}k ctx` : ''}</span></span>${m.id === cur ? `<span class="check">${icon('check', 'sm')}</span>` : ''}<span class="star ${fav.includes(m.id) ? 'on' : ''}" data-star="${esc(m.id)}" title="Favorite">${icon('star', 'sm')}</span></button>`;
    };
    const known = (id) => S.models.find((m) => m.id === id) || { id, name: id === 'openrouter/auto' ? 'Auto (best model for the prompt)' : id };
    let html = '';
    if (!q) {
      html += `<div class="mh">Favorites</div>${fav.map((id) => row(known(id))).join('')}`;
      html += `<div class="sep"></div><div class="mh">All models ${S.models.length ? `(${S.models.length})` : ''}</div>`;
    }
    const pool = q ? S.models.filter((m) => (m.id + ' ' + m.name).toLowerCase().includes(q)) : [...S.models].sort((a, b) => b.created - a.created);
    html += pool.slice(0, 150).map(row).join('') || `<div class="mh">${S.models.length ? 'No models match' : 'Loading models…'}</div>`;
    if (q && !S.models.some((m) => m.id === q) && q.includes('/')) html += `<button class="mi" data-model="${esc(q)}">${icon('plus', 'sm')}<span>Use “${esc(q)}”</span></button>`;
    list.innerHTML = html;
    kb = -1;
  };
  wrap.addEventListener('click', (e) => {
    const star = e.target.closest('[data-star]');
    if (star) {
      e.stopPropagation();
      const id = star.dataset.star;
      const fav = S.settings.favorites.includes(id) ? S.settings.favorites.filter((x) => x !== id) : [...S.settings.favorites, id];
      setSetting({ favorites: fav });
      draw();
      return;
    }
    const b = e.target.closest('[data-model]');
    if (b) selectModel(b.dataset.model);
  });
  input.addEventListener('input', draw);
  input.addEventListener('keydown', (e) => {
    const items = [...list.querySelectorAll('[data-model]')];
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      kb = Math.max(0, Math.min(items.length - 1, kb + (e.key === 'ArrowDown' ? 1 : -1)));
      items.forEach((it, i) => it.classList.toggle('kb', i === kb));
      items[kb]?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      const it = items[kb >= 0 ? kb : 0];
      if (it) selectModel(it.dataset.model);
    }
  });
  draw();
  openMenu(anchor, wrap, { className: 'model-menu' });
  input.focus();
  if (!S.models.length) loadModels().then(draw);
}

function selectModel(id) {
  closeMenu();
  setSetting({ model: id });
  const r = route();
  const chat = r.name === 'chat' && S.chats.get(r.id);
  if (chat) { chat.model = id; persist(chat); }
  renderTopbar(r);
  toast(`Model: ${modelLabel(id)}`);
}

async function loadModels(force = false) {
  try { S.models = await listModels({ force }); } catch (e) { console.warn('model list failed', e); }
  const btn = $('.model-btn .sub');
  if (btn) btn.textContent = modelLabel(currentModel());
}

// ---------------------------------------------------------------- home
const SUGGESTIONS = [
  { icon: 'image', label: 'Analyze images', text: 'Describe what is in this image and point out anything unusual.' },
  { icon: 'pen', label: 'Help me write', text: 'Help me write a friendly follow-up email to a client who has not replied in a week.' },
  { icon: 'code', label: 'Code', text: 'Write a Node.js script that watches a folder and logs any new files.' },
  { icon: 'lightbulb', label: 'Brainstorm', text: 'Brainstorm 10 creative names for a weekend coffee pop-up.' },
  { icon: 'book', label: 'Summarize text', text: 'Summarize the following text in 5 bullet points:\n\n' },
];
const GREETINGS = ['Where should we begin?', 'What’s on your mind today?', 'What can I help with?', 'Ready when you are.'];

function renderHome(view, r) {
  const gpt = r.gptId && gptById(r.gptId);
  if (r.gptId && !gpt) { navigate('/', { replace: true }); return; }
  const name = S.settings.name?.split(' ')[0];
  const greet = name ? `What’s on the agenda today, ${esc(name)}?` : GREETINGS[Math.floor(Date.now() / 3.6e6) % GREETINGS.length];
  view.innerHTML = `
    <div class="home">
      ${gpt ? `<div class="gpt-hero"><div class="gpt-avatar" style="background:${gpt.color}">${esc(gpt.emoji)}</div><h2>${esc(gpt.name)}</h2><p>${esc(gpt.description)}</p><p style="font-size:12px;margin-top:4px;color:var(--text-3)">By ${esc(gpt.author || 'you')}</p></div>`
        : r.temporary ? `<div class="temp-hero"><h1>Temporary Chat</h1><p>This chat won’t appear in your history or be saved on this device.</p></div>`
        : `<h1>${greet}</h1>`}
      <div class="composer-wrap" id="composer-slot"></div>
      <div class="chips">
        ${gpt ? (gpt.starters || []).map((s) => `<button class="chip" data-starter="${esc(s)}">${esc(s)}</button>`).join('')
          : SUGGESTIONS.map((s, i) => `<button class="chip" data-sugg="${i}">${icon(s.icon)}${s.label}</button>`).join('')}
      </div>
    </div>
    <div class="disclaimer" style="padding-bottom:10px">AI can make mistakes. Check important info.</div>`;
  mountComposer($('#composer-slot'), { gpt, home: true, temporary: r.temporary });
  view.querySelectorAll('[data-sugg]').forEach((b) => b.addEventListener('click', () => {
    const s = SUGGESTIONS[+b.dataset.sugg];
    setComposerText(s.text);
  }));
  view.querySelectorAll('[data-starter]').forEach((b) => b.addEventListener('click', () => {
    setComposerText(b.dataset.starter);
    sendFromComposer();
  }));
  if (!S.settings.apiKey) setTimeout(() => toast('Add your OpenRouter API key in Settings to start chatting'), 400);
}

// ---------------------------------------------------------------- chat view
function renderChat(view, chat) {
  view.innerHTML = `
    <div class="thread-scroll" id="scroller"><div class="thread" id="thread"></div></div>
    <button class="scroll-down hidden" id="scroll-down" aria-label="Scroll to bottom">${icon('arrowDown', 'sm')}</button>
    <div class="thread-foot"><div class="composer-wrap" id="composer-slot"></div><div class="disclaimer">AI can make mistakes. Check important info.</div></div>`;
  renderThread(chat);
  mountComposer($('#composer-slot'), { chat, gpt: chat.gptId && gptById(chat.gptId) });
  const sc = $('#scroller');
  sc.scrollTop = sc.scrollHeight;
  sc.addEventListener('scroll', () => $('#scroll-down').classList.toggle('hidden', nearBottom()));
  $('#scroll-down').addEventListener('click', () => sc.scrollTo({ top: sc.scrollHeight, behavior: 'smooth' }));
}

function nearBottom() {
  const sc = $('#scroller');
  return !sc || sc.scrollHeight - sc.scrollTop - sc.clientHeight < 80;
}
function scrollToBottom(force) {
  const sc = $('#scroller');
  if (sc && (force || nearBottom())) sc.scrollTop = sc.scrollHeight;
}

function renderThread(chat) {
  const th = $('#thread');
  if (!th) return;
  const lastAsst = [...chat.messages].reverse().find((m) => m.role === 'assistant');
  th.innerHTML = chat.messages.map((m) => (m.role === 'user' ? userTurn(chat, m) : assistantTurn(chat, m, m === lastAsst))).join('');
  if (S.editing) {
    const ta = th.querySelector('.edit-box textarea');
    if (ta) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); autoGrow(ta); }
  }
}

function attachmentsHtml(atts = []) {
  if (!atts.length) return '';
  return `<div class="attachments">${atts.map((a) => (a.kind === 'image'
    ? `<img src="${a.dataUrl}" alt="${esc(a.name)}" />`
    : `<div class="file-pill"><span class="ficon">${icon('file', 'sm')}</span><span class="fmeta"><div class="fname">${esc(a.name)}</div><div class="ftype">${esc(a.kind === 'pdf' ? 'PDF' : 'Document')}</div></span></div>`)).join('')}</div>`;
}

function userTurn(chat, m) {
  if (S.editing === m.id) {
    return `<div class="turn user" data-mid="${m.id}"><div class="edit-box"><textarea>${esc(m.content)}</textarea>
      <div class="row"><button class="btn secondary" data-act="edit-cancel">Cancel</button><button class="btn primary" data-act="edit-send">Send</button></div></div></div>`;
  }
  return `<div class="turn user" data-mid="${m.id}">
    ${attachmentsHtml(m.attachments)}
    ${m.content ? `<div class="bubble">${esc(m.content)}</div>` : ''}
    <div class="turn-actions">
      <button class="icon-btn" data-act="copy" data-tip="Copy">${icon('copy', 'sm')}</button>
      <button class="icon-btn" data-act="edit" data-tip="Edit message">${icon('edit', 'sm')}</button>
    </div></div>`;
}

function assistantBody(m, streaming) {
  let html = '';
  if (m.reasoning && S.settings.showReasoning) {
    const live = streaming && !m.content;
    html += `<details class="thinking" ${live ? 'open' : ''}><summary>${live ? '<span class="shimmer">Thinking</span>' : `Thought for ${m.thinkSecs || 1}s`}${icon('chevronRight', 'sm')}</summary><div class="body">${esc(m.reasoning)}</div></details>`;
  } else if (streaming && !m.content) {
    html += `<div class="thinking"><span class="shimmer">${m.webSearch ? 'Searching the web' : 'Thinking'}</span></div>`;
  }
  if (m.content) html += `<div class="md">${renderMarkdown(m.content)}${streaming ? '<span class="cursor-dot"></span>' : ''}</div>`;
  else if (streaming && !m.reasoning) html += '<span class="cursor-dot"></span>';
  if (m.citations?.length) {
    html += `<div class="md" style="margin-top:10px;font-size:13px"><strong>Sources</strong><ol>${m.citations.map((c) => `<li><a href="${esc(c.url)}" target="_blank" rel="noopener noreferrer">${esc(c.title || c.url)}</a></li>`).join('')}</ol></div>`;
  }
  if (m.error) {
    html += `<div class="error-box">${icon('alert')}<div><div>${esc(m.error)}</div><div class="acts">
      ${/key|401|auth/i.test(m.error) ? '<button class="btn secondary" data-act="open-api">Open API settings</button>' : ''}
      <button class="btn secondary" data-act="regen">Retry</button></div></div></div>`;
  }
  return html;
}

function assistantTurn(chat, m, isLast) {
  const streaming = S.streams.has(chat.id) && isLast;
  const usage = m.usage ? `${m.usage.total_tokens ?? ''} tokens${m.usage.cost != null ? ` · $${Number(m.usage.cost).toFixed(5)}` : ''}` : '';
  return `<div class="turn assistant ${isLast ? 'last' : ''}" data-mid="${m.id}">
    <div class="a-body">${assistantBody(m, streaming)}</div>
    ${streaming ? '' : `<div class="turn-actions">
      <button class="icon-btn" data-act="copy" data-tip="Copy">${icon('copy', 'sm')}</button>
      <button class="icon-btn ${m.feedback === 'up' ? 'on' : ''}" data-act="up" data-tip="Good response">${icon('thumbUp', 'sm')}</button>
      <button class="icon-btn ${m.feedback === 'down' ? 'on' : ''}" data-act="down" data-tip="Bad response">${icon('thumbDown', 'sm')}</button>
      <button class="icon-btn" data-act="speak" data-tip="Read aloud">${icon('speaker', 'sm')}</button>
      ${isLast ? `<button class="icon-btn" data-act="regen-menu" data-tip="Try again">${icon('refresh', 'sm')}</button>` : ''}
      <span class="meta">${esc(m.model ? modelLabel(m.model) : '')}${usage ? ` · ${usage}` : ''}</span>
    </div>`}
  </div>`;
}

let rafPending = new Set();
function paintStreaming(chat, m) {
  if (rafPending.has(m.id)) return;
  rafPending.add(m.id);
  requestAnimationFrame(() => {
    rafPending.delete(m.id);
    const body = document.querySelector(`[data-mid="${m.id}"] .a-body`);
    if (!body) return;
    const stick = nearBottom();
    const open = body.querySelector('details.thinking')?.open;
    body.innerHTML = assistantBody(m, S.streams.has(chat.id));
    const d = body.querySelector('details.thinking');
    if (d && open != null && m.content) d.open = open;
    if (stick) scrollToBottom(true);
  });
}

// Thread interactions (delegated)
$('#view').addEventListener('click', async (e) => {
  const cc = e.target.closest('[data-copy-code]');
  if (cc) {
    await copyText(cc.closest('.codeblock').querySelector('code').innerText);
    const span = cc.querySelector('span');
    span.textContent = 'Copied!';
    setTimeout(() => (span.textContent = 'Copy code'), 1500);
    return;
  }
  const b = e.target.closest('[data-act]');
  const turn = e.target.closest('[data-mid]');
  const r = route();
  if (!b || !turn || r.name !== 'chat') return;
  const chat = S.chats.get(r.id);
  const idx = chat.messages.findIndex((x) => x.id === turn.dataset.mid);
  const m = chat.messages[idx];
  switch (b.dataset.act) {
    case 'copy':
      await copyText(m.content);
      b.innerHTML = icon('check', 'sm');
      setTimeout(() => (b.innerHTML = icon('copy', 'sm')), 1500);
      break;
    case 'up': case 'down':
      m.feedback = m.feedback === b.dataset.act ? null : b.dataset.act;
      persist(chat); renderThread(chat);
      if (m.feedback) toast('Thanks for your feedback!');
      break;
    case 'speak': speak(m.content, b); break;
    case 'regen': regenerate(chat); break;
    case 'regen-menu': {
      const fav = S.settings.favorites.filter((id) => id !== (m.model || ''));
      openMenu(b, [
        { icon: 'refresh', label: 'Try again', desc: modelLabel(chat.model || S.settings.model), onClick: () => regenerate(chat) },
        ...(fav.length ? ['sep', { header: 'Try again with' }, ...fav.map((id) => ({ icon: 'sparkle', label: modelLabel(id), onClick: () => { chat.model = id; setSetting({ model: id }); renderTopbar(route()); regenerate(chat); } }))] : []),
      ], { side: 'top' });
      break;
    }
    case 'open-api': openSettings('Models'); break;
    case 'edit':
      if (S.streams.has(chat.id)) return toast('Wait for the response to finish');
      S.editing = m.id; renderThread(chat);
      break;
    case 'edit-cancel': S.editing = null; renderThread(chat); break;
    case 'edit-send': {
      const text = turn.querySelector('textarea').value.trim();
      if (!text) return;
      S.editing = null;
      m.content = text;
      chat.messages.splice(idx + 1);
      persist(chat);
      renderThread(chat);
      runCompletion(chat);
      break;
    }
  }
});
$('#view').addEventListener('keydown', (e) => {
  if (e.target.matches('.edit-box textarea')) {
    if (e.key === 'Enter' && !e.shiftKey && S.settings.enterToSend) { e.preventDefault(); e.target.closest('.edit-box').querySelector('[data-act="edit-send"]').click(); }
    if (e.key === 'Escape') e.target.closest('.edit-box').querySelector('[data-act="edit-cancel"]').click();
  }
});
$('#view').addEventListener('input', (e) => { if (e.target.matches('.edit-box textarea')) autoGrow(e.target); });

function speak(text, btn) {
  if (!('speechSynthesis' in window)) return toast('Read aloud is not supported in this browser');
  if (speechSynthesis.speaking) { speechSynthesis.cancel(); return; }
  const plain = text.replace(/```[\s\S]*?```/g, ' code block ').replace(/[#*_`>|-]/g, '');
  const u = new SpeechSynthesisUtterance(plain);
  btn.classList.add('on');
  u.onend = () => btn.classList.remove('on');
  speechSynthesis.speak(u);
}

// ---------------------------------------------------------------- composer
let composerCtx = null;

function mountComposer(slot, ctx) {
  composerCtx = ctx;
  const ph = ctx.gpt ? `Message ${ctx.gpt.name}` : 'Ask anything';
  slot.innerHTML = `
    <form class="composer" id="composer" autocomplete="off">
      <div class="att-row hidden" id="att-row"></div>
      <div class="row">
        <textarea id="prompt" rows="1" placeholder="${esc(ph)}" aria-label="Message"></textarea>
      </div>
      <div class="row" style="align-items:center">
        <div class="tools">
          <button type="button" class="round-btn" data-act="plus" aria-label="Add files and more" data-tip="Add files and more">${icon('plus')}</button>
          <span id="tool-chips"></span>
        </div>
        <span style="flex:1"></span>
        <button type="button" class="round-btn ${'webkitSpeechRecognition' in window || 'SpeechRecognition' in window ? '' : 'hidden'}" data-act="mic" data-tip="Dictate">${icon('mic')}</button>
        <button type="submit" class="send-btn" id="send" aria-label="Send">${icon('arrowUp')}</button>
      </div>
      <input type="file" id="file-input" multiple hidden accept="image/*,.pdf,.txt,.md,.csv,.json,.js,.mjs,.ts,.py,.html,.css,.xml,.yaml,.yml,.log,.sql,.sh" />
    </form>`;
  const ta = $('#prompt');
  ta.value = S.draft.text;
  autoGrow(ta);
  requestAnimationFrame(() => autoGrow(ta));
  drawAttachments();
  drawToolChips();
  updateSendBtn();
  if (matchMedia('(pointer:fine)').matches) ta.focus();

  const form = $('#composer');
  form.addEventListener('submit', (e) => { e.preventDefault(); onSendClick(); });
  ta.addEventListener('input', () => { S.draft.text = ta.value; autoGrow(ta); updateSendBtn(); });
  ta.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && (S.settings.enterToSend || e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      onSendClick(true);
    }
  });
  ta.addEventListener('paste', (e) => {
    const files = [...(e.clipboardData?.files || [])];
    if (files.length) { e.preventDefault(); addFiles(files); }
  });
  form.addEventListener('dragover', (e) => { e.preventDefault(); form.classList.add('drag'); });
  form.addEventListener('dragleave', () => form.classList.remove('drag'));
  form.addEventListener('drop', (e) => { e.preventDefault(); form.classList.remove('drag'); addFiles([...e.dataTransfer.files]); });
  $('#file-input').addEventListener('change', (e) => { addFiles([...e.target.files]); e.target.value = ''; });
  form.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    if (b.dataset.act === 'plus') plusMenu(b);
    if (b.dataset.act === 'mic') dictate(b);
    if (b.dataset.act === 'rm-att') { S.draft.attachments.splice(+b.dataset.i, 1); drawAttachments(); updateSendBtn(); }
    if (b.dataset.act === 'rm-tool') { S.draft[b.dataset.tool] = false; drawToolChips(); }
  });
}

function setComposerText(t) {
  const ta = $('#prompt');
  if (!ta) return;
  ta.value = S.draft.text = t;
  autoGrow(ta); updateSendBtn(); ta.focus();
  ta.setSelectionRange(t.length, t.length);
}

function autoGrow(ta) { ta.style.height = 'auto'; ta.style.height = `${ta.scrollHeight}px`; }
addEventListener('resize', () => { const ta = $('#prompt'); if (ta) autoGrow(ta); });

function isStreamingHere() {
  return composerCtx?.chat && S.streams.has(composerCtx.chat.id);
}
function updateSendBtn() {
  const b = $('#send');
  if (!b) return;
  if (isStreamingHere()) {
    b.className = 'send-btn stop'; b.innerHTML = icon('stop'); b.disabled = false; b.setAttribute('aria-label', 'Stop streaming');
  } else {
    b.className = 'send-btn'; b.innerHTML = icon('arrowUp'); b.setAttribute('aria-label', 'Send');
    b.disabled = !S.draft.text.trim() && !S.draft.attachments.length;
  }
}

function onSendClick(fromKey) {
  if (isStreamingHere()) { if (!fromKey) S.streams.get(composerCtx.chat.id).abort(); return; }
  sendFromComposer();
}

function drawAttachments() {
  const row = $('#att-row');
  if (!row) return;
  row.classList.toggle('hidden', !S.draft.attachments.length);
  row.innerHTML = S.draft.attachments.map((a, i) => `<div class="att">${a.kind === 'image'
    ? `<img src="${a.dataUrl}" alt="${esc(a.name)}" />`
    : `<div class="file-pill"><span class="ficon">${icon('file', 'sm')}</span><span class="fmeta"><div class="fname">${esc(a.name)}</div><div class="ftype">${a.kind === 'pdf' ? 'PDF' : 'Document'}</div></span></div>`}
    <button type="button" class="x" data-act="rm-att" data-i="${i}" aria-label="Remove">${icon('x')}</button></div>`).join('');
}

function drawToolChips() {
  const el = $('#tool-chips');
  if (!el) return;
  el.innerHTML = [
    S.draft.webSearch && `<button type="button" class="tool-chip" data-act="rm-tool" data-tool="webSearch">${icon('globe', 'sm')}Search ${icon('x', 'sm')}</button>`,
    S.draft.reasoning && `<button type="button" class="tool-chip" data-act="rm-tool" data-tool="reasoning">${icon('brain', 'sm')}Think longer ${icon('x', 'sm')}</button>`,
  ].filter(Boolean).join('');
}

function plusMenu(anchor) {
  openMenu(anchor, [
    { icon: 'paperclip', label: 'Add photos & files', onClick: () => $('#file-input').click() },
    'sep',
    { icon: 'globe', label: 'Web search', desc: 'OpenRouter web plugin', check: S.draft.webSearch, onClick: () => { S.draft.webSearch = !S.draft.webSearch; drawToolChips(); $('#prompt')?.focus(); } },
    { icon: 'brain', label: 'Think longer', desc: 'High reasoning effort', check: S.draft.reasoning, onClick: () => { S.draft.reasoning = !S.draft.reasoning; drawToolChips(); $('#prompt')?.focus(); } },
  ], { side: route().name === 'chat' ? 'top' : 'bottom' });
}

const TEXT_EXT = /\.(txt|md|csv|json|m?js|ts|py|html|css|xml|ya?ml|log|sql|sh)$/i;
async function addFiles(files) {
  for (const f of files) {
    if (f.size > 20 * 1024 * 1024) { toast(`${f.name} is larger than 20 MB`); continue; }
    if (f.type.startsWith('image/')) {
      S.draft.attachments.push({ kind: 'image', name: f.name, mime: f.type, dataUrl: await downscale(f) });
    } else if (f.type === 'application/pdf' || /\.pdf$/i.test(f.name)) {
      S.draft.attachments.push({ kind: 'pdf', name: f.name, mime: 'application/pdf', dataUrl: await readAs(f, 'dataURL') });
    } else if (f.type.startsWith('text/') || TEXT_EXT.test(f.name)) {
      const text = await readAs(f, 'text');
      S.draft.attachments.push({ kind: 'text', name: f.name, mime: f.type || 'text/plain', text: text.slice(0, 200000) });
    } else {
      toast(`Unsupported file type: ${f.name}`);
    }
  }
  drawAttachments(); updateSendBtn();
}
const readAs = (f, how) => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(r.result); r.onerror = () => rej(r.error);
  how === 'text' ? r.readAsText(f) : r.readAsDataURL(f);
});
async function downscale(file, max = 2048) {
  const url = await readAs(file, 'dataURL');
  if (file.type === 'image/gif' || file.type === 'image/svg+xml') return url;
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  if (scale === 1 && file.size < 1.5e6) return url;
  const c = document.createElement('canvas');
  c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.88);
}

let recognizer = null;
function dictate(btn) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (recognizer) { recognizer.stop(); return; }
  recognizer = new SR();
  recognizer.interimResults = true;
  recognizer.continuous = true;
  const base = S.draft.text ? S.draft.text.replace(/\s*$/, ' ') : '';
  recognizer.onresult = (e) => {
    const t = [...e.results].map((r) => r[0].transcript).join('');
    setComposerText(base + t);
  };
  recognizer.onend = () => { recognizer = null; btn.classList.remove('recording'); };
  recognizer.onerror = (e) => toast(`Dictation: ${e.error}`);
  btn.classList.add('recording');
  recognizer.start();
}

// ---------------------------------------------------------------- sending
function sendFromComposer() {
  const text = S.draft.text.trim();
  const attachments = S.draft.attachments;
  if (!text && !attachments.length) return;
  const r = route();
  let chat = r.name === 'chat' ? S.chats.get(r.id) : null;
  const opts = { webSearch: S.draft.webSearch, reasoning: S.draft.reasoning };
  S.draft = { text: '', attachments: [], webSearch: S.draft.webSearch, reasoning: S.draft.reasoning };
  if (!chat) {
    const gptId = r.gptId || null;
    const model = (gptId && gptById(gptId)?.model) || S.settings.model;
    chat = { id: uid(), title: 'New chat', createdAt: Date.now(), updatedAt: Date.now(), pinned: false, gptId, model, temporary: !!r.temporary, messages: [] };
    S.chats.set(chat.id, chat);
    if (gptId) setSetting({ recentGpts: [gptId, ...(S.settings.recentGpts || []).filter((x) => x !== gptId)].slice(0, 6) });
    chat.messages.push({ id: uid(), role: 'user', content: text, attachments, createdAt: Date.now() });
    persist(chat);
    history.pushState({}, '', `/c/${chat.id}${chat.temporary ? '?temporary-chat=true' : ''}`);
    render();
  } else {
    chat.messages.push({ id: uid(), role: 'user', content: text, attachments, createdAt: Date.now() });
    persist(chat);
    renderThread(chat);
    const ta = $('#prompt'); ta.value = ''; autoGrow(ta); drawAttachments();
  }
  scrollToBottom(true);
  runCompletion(chat, opts);
}

function regenerate(chat) {
  if (S.streams.has(chat.id)) return;
  while (chat.messages.length && chat.messages.at(-1).role === 'assistant') chat.messages.pop();
  if (!chat.messages.length) return;
  persist(chat);
  renderThread(chat);
  runCompletion(chat, { webSearch: S.draft.webSearch, reasoning: S.draft.reasoning });
}

function systemPrompt(chat) {
  const parts = [];
  const gpt = chat.gptId && gptById(chat.gptId);
  if (gpt) parts.push(gpt.instructions);
  const s = S.settings;
  if (s.customInstructionsOn) {
    const about = [s.name && `Name: ${s.name}`, s.occupation && `Occupation: ${s.occupation}`, s.about && `More about the user: ${s.about}`].filter(Boolean).join('\n');
    if (about) parts.push(`About the user:\n${about}`);
    if (s.traits) parts.push(`How to respond:\n${s.traits}`);
  }
  parts.push(`Current date: ${new Date().toDateString()}. Format answers in Markdown when helpful.`);
  return parts.join('\n\n');
}

function toApiMessages(chat) {
  const out = [{ role: 'system', content: systemPrompt(chat) }];
  for (const m of chat.messages) {
    if (m.role === 'assistant') {
      if (m.content) out.push({ role: 'assistant', content: m.content });
      continue;
    }
    const atts = m.attachments || [];
    const textFiles = atts.filter((a) => a.kind === 'text').map((a) => `\n\n<file name="${a.name}">\n${a.text}\n</file>`).join('');
    const text = (m.content || '') + textFiles;
    const media = atts.filter((a) => a.kind === 'image' || a.kind === 'pdf');
    if (!media.length) { out.push({ role: 'user', content: text }); continue; }
    out.push({
      role: 'user',
      content: [
        ...(text ? [{ type: 'text', text }] : []),
        ...media.map((a) => (a.kind === 'image'
          ? { type: 'image_url', image_url: { url: a.dataUrl } }
          : { type: 'file', file: { filename: a.name, file_data: a.dataUrl } })),
      ],
    });
  }
  return out;
}

async function runCompletion(chat, { webSearch = false, reasoning = false } = {}) {
  const model = chat.model || S.settings.model;
  const m = { id: uid(), role: 'assistant', content: '', reasoning: '', model, createdAt: Date.now(), webSearch };
  chat.messages.push(m);
  const ctrl = new AbortController();
  S.streams.set(chat.id, ctrl);
  if (route().id === chat.id) { renderThread(chat); updateSendBtn(); scrollToBottom(true); }

  if (!S.settings.apiKey) {
    m.error = 'No OpenRouter API key configured. Add your key in Settings → Models & API.';
    return finish();
  }
  const t0 = Date.now();
  try {
    const res = await streamChat({
      apiKey: S.settings.apiKey,
      model,
      messages: toApiMessages({ ...chat, messages: chat.messages.slice(0, -1) }),
      temperature: S.settings.temperature,
      maxTokens: Number(S.settings.maxTokens) || 0,
      webSearch,
      reasoning,
      signal: ctrl.signal,
      onDelta: (d) => {
        if (d.reasoning) m.reasoning += d.reasoning;
        if (d.content) {
          if (!m.content && m.reasoning) m.thinkSecs = Math.max(1, Math.round((Date.now() - t0) / 1000));
          m.content += d.content;
        }
        paintStreaming(chat, m);
      },
    });
    m.model = res.model || model;
    m.usage = res.usage;
    const cites = res.annotations.filter((a) => a.type === 'url_citation').map((a) => a.url_citation);
    if (cites.length) m.citations = [...new Map(cites.map((c) => [c.url, c])).values()];
    if (res.finishReason === 'length') m.content += '\n\n*[Response truncated — max tokens reached]*';
    if (!m.content && !m.reasoning) m.error = 'The model returned an empty response. Try again or pick another model.';
  } catch (e) {
    if (e.name === 'AbortError') { if (!m.content) m.content = '*Stopped*'; }
    else m.error = e.message || String(e);
  }
  return finish();

  function finish() {
    S.streams.delete(chat.id);
    chat.updatedAt = Date.now();
    persist(chat);
    if (route().id === chat.id) { renderThread(chat); updateSendBtn(); scrollToBottom(); }
    if (chat.title === 'New chat' && !m.error) autoTitle(chat);
  }
}

async function autoTitle(chat) {
  const first = chat.messages.find((x) => x.role === 'user');
  const fallback = (first?.content || first?.attachments?.[0]?.name || 'New chat').replace(/\s+/g, ' ').slice(0, 48);
  chat.title = fallback;
  if (S.settings.autoTitle && S.settings.apiKey) {
    try {
      const t = await complete({
        apiKey: S.settings.apiKey,
        model: chat.model || S.settings.model,
        messages: [
          { role: 'system', content: 'Write a short title (3-6 words) for this conversation. Reply with the title only, no quotes or punctuation at the end.' },
          { role: 'user', content: `${(first?.content || '').slice(0, 1500)}\n\nAssistant: ${(chat.messages.find((x) => x.role === 'assistant')?.content || '').slice(0, 500)}` },
        ],
      });
      const clean = t.replace(/<think>[\s\S]*?<\/think>/g, '').trim().split('\n')[0].replace(/^["'#*\s]+|["'.*\s]+$/g, '');
      if (clean && clean.length < 80) chat.title = clean;
    } catch { /* keep fallback */ }
  }
  persist(chat);
  renderSidebar(route());
  if (route().id === chat.id) document.title = `${chat.title} | ChatGPT Chat: REA`;
}

// ---------------------------------------------------------------- share / export
function chatToMarkdown(c) {
  return `# ${c.title}\n\n` + c.messages.map((m) => `**${m.role === 'user' ? 'You' : `Assistant${m.model ? ` (${m.model})` : ''}`}:**\n\n${m.content}${(m.attachments || []).map((a) => `\n\n_[attachment: ${a.name}]_`).join('')}`).join('\n\n---\n\n');
}
function download(name, text, type = 'text/markdown') {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
function shareChat(c, anchor) {
  openMenu(anchor, [
    { icon: 'copy', label: 'Copy as Markdown', onClick: async () => { await copyText(chatToMarkdown(c)); toast('Conversation copied'); } },
    { icon: 'download', label: 'Download .md', onClick: () => download(`${c.title.replace(/[^\w\- ]+/g, '').trim() || 'chat'}.md`, chatToMarkdown(c)) },
    { icon: 'download', label: 'Download .json', onClick: () => download(`${c.id}.json`, JSON.stringify(c, null, 2), 'application/json') },
  ], { align: 'end' });
}

// ---------------------------------------------------------------- search
function openSearch() {
  const { el, close } = openModal(`
    <div class="modal-head"><input placeholder="Search chats..." aria-label="Search chats" /><button class="icon-btn" data-close aria-label="Close">${icon('x')}</button></div>
    <div class="modal-body"></div>`, { className: 'search-modal' });
  const input = $('input', el);
  const body = $('.modal-body', el);
  let kb = 0;
  const go = (href) => { close(); navigate(href); };
  const bucket = (t) => {
    const d = (Date.now() - t) / 864e5;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (t >= today.getTime()) return 'Today';
    if (t >= today.getTime() - 864e5) return 'Yesterday';
    if (d < 7) return 'Previous 7 days';
    if (d < 30) return 'Previous 30 days';
    return 'Older';
  };
  const hl = (s, q) => esc(s).replace(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'), '<mark>$1</mark>');
  const draw = () => {
    const q = input.value.trim().toLowerCase();
    let html = '';
    if (!q) {
      html += `<button class="sr-item" data-href="/">${icon('newchat')}<div><div class="t">New chat</div></div></button>`;
      let last = '';
      for (const c of sortedChats().slice(0, 30)) {
        const b = bucket(c.updatedAt);
        if (b !== last) { html += `<div class="sr-group">${b}</div>`; last = b; }
        html += `<button class="sr-item" data-href="/c/${c.id}">${icon('newchat')}<div><div class="t">${esc(c.title)}</div></div></button>`;
      }
    } else {
      for (const c of sortedChats()) {
        const inTitle = c.title.toLowerCase().includes(q);
        const hit = c.messages.find((m) => m.content?.toLowerCase().includes(q));
        if (!inTitle && !hit) continue;
        let snip = '';
        if (hit) {
          const i = hit.content.toLowerCase().indexOf(q);
          snip = (i > 40 ? '…' : '') + hit.content.slice(Math.max(0, i - 40), i + 120).replace(/\s+/g, ' ');
        }
        html += `<button class="sr-item" data-href="/c/${c.id}">${icon('newchat')}<div><div class="t">${hl(c.title, q)}</div>${snip ? `<div class="s">${hl(snip, q)}</div>` : ''}</div></button>`;
      }
      if (!html) html = '<div class="sr-group" style="text-align:center;padding:32px">No results</div>';
    }
    body.innerHTML = html;
    kb = 0;
    body.querySelector('.sr-item')?.classList.add('kb');
  };
  body.addEventListener('click', (e) => { const b = e.target.closest('[data-href]'); if (b) go(b.dataset.href); });
  input.addEventListener('input', draw);
  input.addEventListener('keydown', (e) => {
    const items = [...body.querySelectorAll('.sr-item')];
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      kb = Math.max(0, Math.min(items.length - 1, kb + (e.key === 'ArrowDown' ? 1 : -1)));
      items.forEach((it, i) => it.classList.toggle('kb', i === kb));
      items[kb]?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter' && items[kb]) go(items[kb].dataset.href);
  });
  draw();
  input.focus();
}

// ---------------------------------------------------------------- GPTs
function gptCard(g) {
  return `<a class="gpt-card" href="/g/${g.id}" data-link>
    <span class="gpt-avatar" style="background:${g.color}">${esc(g.emoji)}</span>
    <span style="min-width:0"><div class="t">${esc(g.name)}</div><div class="d">${esc(g.description)}</div><div class="by">By ${esc(g.author || 'you')}</div></span>
    ${g.custom ? `<span class="icon-btn card-more" data-gpt-menu="${g.id}">${icon('more', 'sm')}</span>` : ''}
  </a>`;
}

function renderGpts(view) {
  view.innerHTML = `<div class="page"><div class="page-inner">
    <h1>GPTs</h1>
    <p class="lead">Discover and create custom versions of the assistant that combine instructions, a model, and conversation starters.</p>
    <div class="toolbar"><a class="btn primary" href="/gpts/editor" data-link>${icon('plus', 'sm')}Create</a></div>
    <div class="searchbar">${icon('search', 'sm')}<input id="gpt-q" placeholder="Search GPTs" /></div>
    <div id="gpt-lists"></div>
  </div></div>`;
  const draw = () => {
    const q = $('#gpt-q').value.trim().toLowerCase();
    const f = (g) => !q || (g.name + ' ' + g.description).toLowerCase().includes(q);
    const mine = S.customGpts.filter(f);
    const feat = BUILTIN_GPTS.filter(f);
    $('#gpt-lists').innerHTML = `
      <h2>My GPTs</h2><p class="sub">Assistants you created on this device.</p>
      ${mine.length ? `<div class="gpt-grid">${mine.map(gptCard).join('')}</div>` : `<div class="empty">No custom GPTs yet. <a href="/gpts/editor" data-link>Create one</a>.</div>`}
      <h2>Featured</h2><p class="sub">Curated starting points.</p>
      <div class="gpt-grid">${feat.map(gptCard).join('')}</div>`;
  };
  $('#gpt-q').addEventListener('input', draw);
  view.querySelector('.page').addEventListener('click', (e) => {
    const m = e.target.closest('[data-gpt-menu]');
    if (!m) return;
    e.preventDefault(); e.stopPropagation();
    const g = gptById(m.dataset.gptMenu);
    openMenu(m, [
      { icon: 'pen', label: 'Edit GPT', onClick: () => navigate(`/gpts/editor/${g.id}`) },
      { icon: 'trash', label: 'Delete GPT', danger: true, onClick: async () => {
        if (!(await confirmDialog({ title: 'Delete GPT?', body: `Delete <strong>${esc(g.name)}</strong>? Existing chats are kept.`, confirm: 'Delete', danger: true }))) return;
        S.customGpts = S.customGpts.filter((x) => x.id !== g.id);
        await idb.del('gpts', g.id);
        render();
      } },
    ], { align: 'end' });
  });
  draw();
}

const COLORS = ['#10a37f', '#ab68ff', '#ff6b6b', '#3b82f6', '#f59e0b', '#ec4899', '#14b8a6', '#64748b'];
function renderGptEditor(view, id) {
  const g = id ? S.customGpts.find((x) => x.id === id) : null;
  if (id && !g) { navigate('/gpts', { replace: true }); return; }
  const v = g || { name: '', description: '', instructions: '', emoji: '✨', color: COLORS[0], starters: ['', '', ''], model: '' };
  view.innerHTML = `<div class="page"><div class="page-inner gpt-editor">
    <a href="/gpts" data-link class="btn secondary" style="margin-bottom:12px">← Back</a>
    <h2 style="margin-top:8px">${g ? 'Edit GPT' : 'Create a GPT'}</h2>
    <form id="gpt-form">
      <div class="emoji-row">
        <input class="field" name="emoji" maxlength="4" value="${esc(v.emoji)}" aria-label="Emoji" />
        <div style="display:flex;gap:6px">${COLORS.map((c) => `<button type="button" data-color="${c}" style="width:24px;height:24px;border-radius:50%;background:${c};outline:${c === v.color ? '2px solid var(--text)' : 'none'};outline-offset:2px"></button>`).join('')}</div>
      </div>
      <label>Name</label><input class="field" name="name" required placeholder="Name your GPT" value="${esc(v.name)}" />
      <label>Description</label><input class="field" name="description" placeholder="Add a short description about what this GPT does" value="${esc(v.description)}" />
      <label>Instructions</label><textarea class="field" name="instructions" rows="8" required placeholder="What does this GPT do? How does it behave? What should it avoid doing?">${esc(v.instructions)}</textarea>
      <label>Conversation starters</label>
      ${[0, 1, 2, 3].map((i) => `<input class="field" name="starter" style="margin-bottom:6px" value="${esc(v.starters?.[i] || '')}" placeholder="Starter ${i + 1}" />`).join('')}
      <label>Recommended model <span style="color:var(--text-3);font-weight:400">(optional, OpenRouter model id)</span></label>
      <input class="field" name="model" placeholder="e.g. openrouter/auto" value="${esc(v.model || '')}" list="model-ids" />
      <datalist id="model-ids">${S.models.slice(0, 400).map((m) => `<option value="${esc(m.id)}">`).join('')}</datalist>
      <div style="display:flex;gap:8px;margin-top:20px"><button class="btn primary" type="submit">${g ? 'Save' : 'Create'}</button><a class="btn secondary" href="/gpts" data-link>Cancel</a></div>
    </form></div></div>`;
  let color = v.color;
  const form = $('#gpt-form');
  form.addEventListener('click', (e) => {
    const c = e.target.closest('[data-color]');
    if (!c) return;
    color = c.dataset.color;
    form.querySelectorAll('[data-color]').forEach((b) => (b.style.outline = b === c ? '2px solid var(--text)' : 'none'));
  });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const rec = {
      id: g?.id || `custom-${uid()}`,
      custom: true,
      author: S.settings.name || 'you',
      name: fd.get('name').trim(),
      description: fd.get('description').trim(),
      instructions: fd.get('instructions').trim(),
      emoji: fd.get('emoji').trim() || '✨',
      color,
      starters: fd.getAll('starter').map((s) => s.trim()).filter(Boolean),
      model: fd.get('model').trim(),
    };
    await idb.put('gpts', rec);
    S.customGpts = [rec, ...S.customGpts.filter((x) => x.id !== rec.id)];
    toast(g ? 'GPT updated' : 'GPT created');
    navigate(`/g/${rec.id}`);
  });
}

// ---------------------------------------------------------------- library
function renderLibrary(view, tab = 'images') {
  const items = [];
  for (const c of sortedChats()) for (const m of c.messages) for (const a of m.attachments || []) items.push({ ...a, chat: c, at: m.createdAt });
  items.sort((a, b) => b.at - a.at);
  const images = items.filter((a) => a.kind === 'image');
  const files = items.filter((a) => a.kind !== 'image');
  const list = tab === 'images' ? images : files;
  view.innerHTML = `<div class="page"><div class="page-inner">
    <h1>Library</h1>
    <p class="lead">Images and files you’ve shared in your chats.</p>
    <div class="toolbar"><div class="seg"><button data-tab="images" class="${tab === 'images' ? 'on' : ''}">Images (${images.length})</button><button data-tab="files" class="${tab === 'files' ? 'on' : ''}">Files (${files.length})</button></div></div>
    ${list.length ? `<div class="lib-grid">${list.map((a) => (a.kind === 'image'
      ? `<a class="lib-tile" href="/c/${a.chat.id}" data-link><img src="${a.dataUrl}" alt="${esc(a.name)}" loading="lazy" /><span class="cap">${esc(a.chat.title)}</span></a>`
      : `<a class="lib-tile file" href="/c/${a.chat.id}" data-link><span class="file-pill" style="border:0;padding:0"><span class="ficon">${icon('file', 'sm')}</span></span><span class="fn">${esc(a.name)}</span><span style="font-size:12px;color:var(--text-3)">${esc(a.chat.title)}</span></a>`)).join('')}</div>`
      : `<div class="empty">${tab === 'images' ? 'No images yet. Attach a photo in any chat and it will show up here.' : 'No files yet. Attach PDFs or text files in a chat.'}</div>`}
  </div></div>`;
  view.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => renderLibrary(view, b.dataset.tab)));
}

// ---------------------------------------------------------------- settings
const TABS = [
  { id: 'General', icon: 'settings' },
  { id: 'Personalization', icon: 'sparkle' },
  { id: 'Models', icon: 'key', label: 'Models & API' },
  { id: 'Data', icon: 'database', label: 'Data controls' },
  { id: 'Shortcuts', icon: 'code', label: 'Shortcuts' },
];

function openSettings(tab = 'General') {
  closeMobileSidebar();
  if (location.hash !== `#settings/${tab}`) history.replaceState({}, '', `${location.pathname}${location.search}#settings/${tab}`);
  if (S.settingsModal) { drawSettingsTab(tab); return; }
  const m = openModal(`
    <div class="modal-head"><h2>Settings</h2><button class="icon-btn" data-close aria-label="Close">${icon('x')}</button></div>
    <div class="wrap"><nav class="tabs">${TABS.map((t) => `<button class="tab" data-tab="${t.id}">${icon(t.icon, 'sm')}${t.label || t.id}</button>`).join('')}</nav><div class="panel"></div></div>`,
  {
    className: 'settings',
    onClose: () => {
      S.settingsModal = null;
      if (location.hash) history.replaceState({}, '', location.pathname + location.search);
      render();
    },
  });
  S.settingsModal = m;
  m.el.querySelector('.tabs').addEventListener('click', (e) => {
    const t = e.target.closest('[data-tab]');
    if (t) openSettings(t.dataset.tab);
  });
  drawSettingsTab(tab);
}

function syncSettingsHash() {
  const m = location.hash.match(/^#settings(?:\/(\w+))?/);
  if (m) openSettings(TABS.some((t) => t.id === m[1]) ? m[1] : 'General');
  else if (S.settingsModal) S.settingsModal.close();
}

function toggleRow(key, label, hint) {
  return `<div class="set-row"><div><div>${label}</div>${hint ? `<div class="hint">${hint}</div>` : ''}</div><button class="switch ${S.settings[key] ? 'on' : ''}" data-toggle="${key}" role="switch" aria-checked="${!!S.settings[key]}" aria-label="${esc(label)}"></button></div>`;
}

function drawSettingsTab(tab) {
  const el = S.settingsModal.el;
  el.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === tab));
  const panel = $('.panel', el);
  const s = S.settings;
  const label = TABS.find((t) => t.id === tab).label || tab;
  let html = `<h3>${label}</h3>`;
  if (tab === 'General') {
    html += `
      <div class="set-row"><div>Theme</div><select class="field" data-set="theme"><option value="system">System</option><option value="dark">Dark</option><option value="light">Light</option></select></div>
      ${toggleRow('enterToSend', 'Enter to send', 'When off, use Shift+Enter for new lines and Ctrl/⌘+Enter to send.')}
      ${toggleRow('showReasoning', 'Show reasoning', 'Display the model’s thinking for reasoning models.')}
      ${toggleRow('autoTitle', 'Auto-generate chat titles', 'Uses one short extra request after the first reply.')}
      <div class="set-row"><div>Archive & cleanup</div><button class="btn secondary" data-act="goto-data">Manage</button></div>`;
  } else if (tab === 'Personalization') {
    html += `
      ${toggleRow('customInstructionsOn', 'Custom instructions', 'Shared with the model in every new message.')}
      <div class="set-row col"><label>What should the assistant call you?</label><input class="field" data-set="name" value="${esc(s.name)}" placeholder="Nickname" /></div>
      <div class="set-row col"><label>What do you do?</label><input class="field" data-set="occupation" value="${esc(s.occupation)}" placeholder="e.g. AI engineer" /></div>
      <div class="set-row col"><label>What traits should the assistant have?</label><textarea class="field" data-set="traits" placeholder="Be concise, opinionated, use code examples…">${esc(s.traits)}</textarea></div>
      <div class="set-row col"><label>Anything else it should know about you?</label><textarea class="field" data-set="about" placeholder="Interests, values, preferences…">${esc(s.about)}</textarea></div>`;
  } else if (tab === 'Models') {
    html += `
      <div class="set-row col">
        <label>OpenRouter API key</label>
        <div class="input-group"><input class="field" type="password" data-set="apiKey" value="${esc(s.apiKey)}" placeholder="sk-or-v1-…" autocomplete="off" spellcheck="false" /><button class="btn secondary" data-act="reveal">Show</button><button class="btn primary" data-act="test">Test</button></div>
        <div class="hint">Stored only in this browser’s localStorage and sent only to openrouter.ai. Get a key at <a href="https://openrouter.ai/settings/keys" target="_blank" rel="noopener">openrouter.ai/settings/keys</a>.</div>
        <div id="key-status"></div>
      </div>
      <div class="set-row col"><label>Default model</label><input class="field" data-set="model" value="${esc(s.model)}" list="set-models" spellcheck="false" />
        <datalist id="set-models">${S.models.map((m) => `<option value="${esc(m.id)}">${esc(m.name)}</option>`).join('')}</datalist>
        <div class="hint">Any OpenRouter model id. <code>openrouter/auto</code> picks a model per prompt. Star models in the model picker to add favorites.</div></div>
      <div class="set-row"><div><div>Temperature</div><div class="hint">Higher = more creative.</div></div><div class="range-row"><input type="range" min="0" max="2" step="0.1" data-set="temperature" value="${s.temperature}" /><output>${s.temperature}</output></div></div>
      <div class="set-row"><div><div>Max output tokens</div><div class="hint">0 uses the provider default.</div></div><input class="field" type="number" min="0" step="256" style="width:120px" data-set="maxTokens" value="${s.maxTokens}" /></div>
      <div class="set-row"><div><div>Model catalog</div><div class="hint">${S.models.length} models cached.</div></div><button class="btn secondary" data-act="refresh-models">Refresh</button></div>`;
  } else if (tab === 'Data') {
    const n = sortedChats().length;
    html += `
      <div class="set-row"><div><div>Export data</div><div class="hint">${n} chats and ${S.customGpts.length} GPTs as JSON.</div></div><button class="btn secondary" data-act="export">Export</button></div>
      <div class="set-row"><div><div>Import data</div><div class="hint">Merge a previous export into this browser.</div></div><button class="btn secondary" data-act="import">Import</button><input type="file" id="import-file" accept="application/json" hidden /></div>
      <div class="set-row"><div><div>Delete all chats</div><div class="hint">Permanently removes every chat stored in this browser.</div></div><button class="btn danger" data-act="delete-all">Delete all</button></div>`;
  } else if (tab === 'Shortcuts') {
    html += [['New chat', `${MOD}⇧O`], ['Search chats', `${MOD}K`], ['Toggle sidebar', `${MOD}⇧S`], ['Settings', `${MOD},`], ['Stop generating', 'Esc'], ['New line', '⇧Enter'], ['Focus composer', '/']]
      .map(([a, k]) => `<div class="set-row"><div>${a}</div><code>${k}</code></div>`).join('');
  }
  panel.innerHTML = html;
  const sel = panel.querySelector('select[data-set="theme"]');
  if (sel) sel.value = s.theme;

  panel.oninput = panel.onchange = (e) => {
    const k = e.target.dataset.set;
    if (!k) return;
    let v = e.target.value;
    if (k === 'temperature') { v = Number(v); e.target.nextElementSibling.textContent = v; }
    if (k === 'maxTokens') v = Math.max(0, parseInt(v, 10) || 0);
    if (k === 'apiKey') v = v.trim();
    setSetting({ [k]: v });
    if (k === 'theme') applyTheme();
  };
  panel.onclick = async (e) => {
    const t = e.target.closest('[data-toggle]');
    if (t) { const k = t.dataset.toggle; setSetting({ [k]: !s[k] }); t.classList.toggle('on', S.settings[k]); t.setAttribute('aria-checked', S.settings[k]); return; }
    const b = e.target.closest('[data-act]');
    if (!b) return;
    switch (b.dataset.act) {
      case 'goto-data': openSettings('Data'); break;
      case 'reveal': { const i = panel.querySelector('[data-set="apiKey"]'); i.type = i.type === 'password' ? 'text' : 'password'; b.textContent = i.type === 'password' ? 'Show' : 'Hide'; break; }
      case 'test': {
        const st = $('#key-status');
        if (!S.settings.apiKey) { st.innerHTML = '<span class="status-bad">Enter a key first.</span>'; break; }
        st.innerHTML = '<span class="hint">Checking…</span>';
        try {
          const info = await keyInfo(S.settings.apiKey);
          const used = info.usage != null ? `$${Number(info.usage).toFixed(4)} used` : '';
          const lim = info.limit != null ? ` of $${info.limit} limit` : ' (no limit)';
          st.innerHTML = `<span class="status-ok">✓ Key valid${info.label ? ` — ${esc(info.label)}` : ''}. ${used}${lim}${info.is_free_tier ? ' · free tier' : ''}</span>`;
        } catch (err) {
          st.innerHTML = `<span class="status-bad">✗ ${esc(err.message)}</span>`;
        }
        break;
      }
      case 'refresh-models': b.disabled = true; await loadModels(true); drawSettingsTab('Models'); toast(`${S.models.length} models loaded`); break;
      case 'export': {
        const data = { version: 1, exportedAt: new Date().toISOString(), chats: sortedChats(), gpts: S.customGpts };
        download(`openchat-export-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(data), 'application/json');
        break;
      }
      case 'import': {
        const inp = $('#import-file');
        inp.onchange = async () => {
          try {
            const data = JSON.parse(await inp.files[0].text());
            for (const c of data.chats || []) { S.chats.set(c.id, c); await idb.put('chats', c); }
            for (const g of data.gpts || []) { await idb.put('gpts', g); S.customGpts = [g, ...S.customGpts.filter((x) => x.id !== g.id)]; }
            toast(`Imported ${(data.chats || []).length} chats`);
            drawSettingsTab('Data');
          } catch (err) { toast(`Import failed: ${err.message}`); }
        };
        inp.click();
        break;
      }
      case 'delete-all': {
        if (!(await confirmDialog({ title: 'Clear your chat history?', body: 'This permanently deletes all chats in this browser. This cannot be undone.', confirm: 'Confirm deletion', danger: true }))) return;
        S.streams.forEach((c) => c.abort());
        S.chats.clear();
        await idb.clear('chats');
        toast('All chats deleted');
        if (route().name === 'chat') history.replaceState({}, '', `/${location.hash}`);
        drawSettingsTab('Data');
        break;
      }
    }
  };
}

function shortcutsModal() { openSettings('Shortcuts'); }

// ---------------------------------------------------------------- keyboard
document.addEventListener('keydown', (e) => {
  const mod = e.metaKey || e.ctrlKey;
  const k = e.key.toLowerCase();
  if (mod && e.shiftKey && k === 'o') { e.preventDefault(); navigate('/'); return; }
  if (mod && !e.shiftKey && k === 'k') { e.preventDefault(); if (!document.querySelector('.search-modal')) openSearch(); return; }
  if (mod && e.shiftKey && k === 's') { e.preventDefault(); toggleSidebar(); return; }
  if (mod && k === ',') { e.preventDefault(); openSettings('General'); return; }
  if (e.key === 'Escape' && isStreamingHere() && !document.querySelector('.modal-backdrop, .menu')) { S.streams.get(composerCtx.chat.id).abort(); return; }
  if (e.key === '/' && !mod && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && !document.querySelector('.modal-backdrop')) {
    const ta = $('#prompt'); if (ta) { e.preventDefault(); ta.focus(); }
  }
});

// ---------------------------------------------------------------- boot
(async function boot() {
  applyTheme();
  try {
    const [chats, gpts] = await Promise.all([idb.all('chats'), idb.all('gpts')]);
    chats.forEach((c) => S.chats.set(c.id, c));
    S.customGpts = gpts.sort((a, b) => a.name.localeCompare(b.name));
  } catch (e) {
    console.error('IndexedDB unavailable', e);
    toast('Storage unavailable — chats will not be saved');
  }
  render();
  syncSettingsHash();
  loadModels();
})();
