import { getSettings, saveSettings, fetchModels, SUGGESTED_MODELS, SUGGESTED_FREE_MODELS, activeModel, listChats, saveChat, deleteChat } from "./lib/settings.js";
import { streamChatResilient } from "./lib/openrouter.js";
import { verifyFreeModels, cachedWorkingFree } from "./lib/models.js";
import { renderMarkdown } from "./lib/markdown.js";
import { getPersona, personaPrompt, avatarHTML, PERSONAS } from "./lib/personas.js";
import { TOOLS, TOOL_LABELS, SYSTEM_PROMPT } from "./lib/tools.js";

const $ = (id) => document.getElementById(id);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

let settings, chat, abort = null, running = false;
const sessionAllowed = new Set(); // hosts allowed for this panel session
const newChat = () => ({ id: crypto.randomUUID(), title: "New chat", messages: [], updated: Date.now() });

const SUGGESTIONS = [
  ["Summarize this page", "Get the key points from the page you're on"],
  ["Find the main action on this page", "Read the page and tell me what I can do here"],
  ["Extract data into a table", "Pull structured info from the current page"],
];

// ---------- init ----------
(async function init() {
  settings = await getSettings();
  chat = newChat();
  await renderModels();
  renderWelcome();
  bind();
  chrome.storage.onChanged.addListener(async (c) => {
    if (c.settings) { settings = await getSettings(); await renderModels(); renderWelcome(); }
  });
})();

let verifyRun = 0, verifyCtl = null, loadToken = 0;
// Show a spinner (and disable the picker) until the model list has finished loading/verifying.
async function renderModels() {
  const token = ++loadToken;
  setModelLoading(true);
  try { await loadModels(); } finally { if (token === loadToken) setModelLoading(false); }
}
function setModelLoading(on) {
  $("model-loading").hidden = !on;
  $("model").disabled = on;
  if (on && !$("model").options.length) $("model").append(new Option("Loading models…", ""));
}
async function loadModels() {
  const sel = $("model");
  const free = settings.modelTier === "free";
  const tierBtn = $("tier");
  tierBtn.textContent = free ? "Free" : "Paid";
  tierBtn.classList.toggle("free", free);
  const fill = (ids) => {
    sel.innerHTML = "";
    for (const id of new Set(ids)) sel.append(new Option(id, id));
    sel.value = activeModel(settings);
  };
  if (!free) return fill([settings.model, ...settings.customModels, ...SUGGESTED_MODELS]);

  // Free: only list models verified as working. Show what's already known, then verify in the background.
  const run = ++verifyRun;
  verifyCtl?.abort();
  verifyCtl = new AbortController();
  const known = await cachedWorkingFree();
  fill([settings.freeModel, ...known]);
  if (!settings.apiKey) return;
  tierBtn.title = "Checking free models…";
  const working = await verifyFreeModels(settings, {
    signal: verifyCtl.signal,
    onProgress: ({ working }) => { if (run === verifyRun) fill(working.length ? working : [settings.freeModel]); },
  });
  tierBtn.title = "Switch between free and paid models";
  if (run !== verifyRun || settings.modelTier !== "free") return;
  if (working.length) {
    // The selected free model isn't verified: move to one that is.
    if (!working.includes(settings.freeModel)) { settings = await saveSettings({ freeModel: working[0] }); }
    fill(working);
  } else fill([settings.freeModel]);
}

function renderPersona() {
  const p = getPersona(settings.personaId);
  $("persona").innerHTML = avatarHTML(settings, p, "sm") + `<span class="pname">${esc(p.name)}</span>`;
  $("persona-menu").innerHTML = "";
  for (const q of PERSONAS) {
    const b = el("button", "pitem" + (q.id === p.id ? " on" : ""), avatarHTML(settings, q) + `<span><b>${esc(q.name)}</b><small>${esc(q.description)}</small></span>`);
    b.onclick = () => { $("persona-menu").hidden = true; saveSettings({ personaId: q.id }); };
    $("persona-menu").append(b);
  }
}

function renderWelcome() {
  renderPersona();
  $("welcome-avatar").innerHTML = avatarHTML(settings, getPersona(settings.personaId), "lg");
  const empty = chat.messages.length === 0;
  $("welcome").hidden = !empty;
  $("nokey").hidden = !!settings.apiKey;
  $("welcome-sub").hidden = !settings.apiKey;
  const box = $("suggestions");
  box.innerHTML = "";
  if (settings.apiKey)
    for (const [t, d] of getPersona(settings.personaId).suggestions || SUGGESTIONS) {
      const b = el("button", "sugg", `<b>${esc(t)}</b><span>${esc(d)}</span>`);
      b.onclick = () => send(t);
      box.append(b);
    }
}

function bind() {
  $("btn-new").onclick = () => { if (running) return; chat = newChat(); $("messages").innerHTML = ""; $("title").textContent = "New chat"; renderWelcome(); $("input").focus(); };
  $("btn-settings").onclick = () => chrome.runtime.openOptionsPage();
  $("btn-help").onclick = () => chrome.tabs.create({ url: chrome.runtime.getURL("options.html#help") });
  $("btn-addkey").onclick = () => chrome.runtime.openOptionsPage();
  $("btn-history").onclick = openHistory;
  $("persona").onclick = (e) => { e.stopPropagation(); $("persona-menu").hidden = !$("persona-menu").hidden; };
  document.addEventListener("click", (e) => { if (!$("persona-menu").contains(e.target)) $("persona-menu").hidden = true; });
  $("hist-close").onclick = () => ($("history").hidden = true);
  $("model").onchange = (e) => saveSettings(settings.modelTier === "free" ? { freeModel: e.target.value } : { model: e.target.value });
  $("tier").onclick = () => saveSettings({ modelTier: settings.modelTier === "free" ? "paid" : "free" });
  $("send").onclick = () => (running ? abort?.abort() : send($("input").value));
  const input = $("input");
  input.addEventListener("input", () => { input.style.height = "auto"; input.style.height = Math.min(160, input.scrollHeight) + "px"; slashMenu(); });
  input.addEventListener("keydown", (e) => {
    if (!$("slash").hidden && (e.key === "ArrowDown" || e.key === "ArrowUp")) { e.preventDefault(); moveSlash(e.key === "ArrowDown" ? 1 : -1); return; }
    if (!$("slash").hidden && (e.key === "Enter" || e.key === "Tab")) { e.preventDefault(); ($("slash").querySelector(".sel") || $("slash").firstElementChild)?.click(); return; }
    if (e.key === "Escape") $("slash").hidden = true;
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); if (!running) send(input.value); }
  });
}

// ---------- slash shortcuts ----------
function slashMenu() {
  const v = $("input").value;
  const menu = $("slash");
  if (!v.startsWith("/") || v.includes(" ")) { menu.hidden = true; return; }
  const q = v.slice(1).toLowerCase();
  const list = settings.shortcuts.filter((s) => s.name.toLowerCase().includes(q));
  menu.innerHTML = "";
  if (!list.length) { menu.append(el("div", "empty", q ? `No shortcuts found for “/${esc(q)}”` : "No shortcuts available")); menu.hidden = false; return; }
  list.forEach((s, i) => {
    const b = el("button", i === 0 ? "sel" : "", `<b>/${esc(s.name)}</b><small>${esc(s.prompt)}</small>`);
    b.onclick = () => { $("input").value = s.prompt; menu.hidden = true; $("input").focus(); };
    menu.append(b);
  });
  menu.hidden = false;
}
function moveSlash(d) {
  const items = [...$("slash").querySelectorAll("button")];
  let i = items.findIndex((b) => b.classList.contains("sel"));
  items[i]?.classList.remove("sel");
  i = (i + d + items.length) % items.length;
  items[i].classList.add("sel");
  items[i].scrollIntoView({ block: "nearest" });
}

// ---------- history ----------
async function openHistory() {
  const list = $("hist-list");
  list.innerHTML = "";
  const chats = await listChats();
  if (!chats.length) list.append(el("div", "empty", "No chats yet"));
  for (const c of chats) {
    const row = el("div", "hist-item", `<div class="t"><div>${esc(c.title)}</div><small>${new Date(c.updated).toLocaleString()}</small></div>`);
    const del = el("button", "icon-btn", '<svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>');
    del.title = "Delete";
    del.onclick = async (e) => { e.stopPropagation(); await deleteChat(c.id); openHistory(); };
    row.append(del);
    row.onclick = () => { if (running) return; chat = c; $("history").hidden = true; redraw(); };
    list.append(row);
  }
  $("history").hidden = false;
}
function redraw() {
  $("messages").innerHTML = "";
  $("title").textContent = chat.title;
  const results = {};
  for (const m of chat.messages) if (m.role === "tool") results[m.tool_call_id] = m;
  for (const m of chat.messages) {
    if (m.role === "user" && typeof m.content === "string" && !m.hidden) addUser(m.display ?? m.content);
    else if (m.role === "assistant") {
      if (m.content) addAssistant(m.content);
      for (const tc of m.tool_calls || []) {
        let args = {}; try { args = JSON.parse(tc.function.arguments || "{}"); } catch {}
        const r = results[tc.id];
        const row = toolRow(tc.function.name, args);
        finishTool(row, !r || !/^Error:/.test(r.content), r?.content);
      }
    }
  }
  renderWelcome();
  scroll();
}

// ---------- rendering helpers ----------
const scroll = () => { const c = $("chat"); c.scrollTop = c.scrollHeight; };
function addUser(text) { const m = el("div", "msg user"); const b = el("div", "bubble"); b.textContent = text; m.append(b); $("messages").append(m); scroll(); }
function addAssistant(text) { const m = el("div", "msg assistant"); m.insertAdjacentHTML("beforeend", avatarHTML(settings, getPersona(settings.personaId), "sm")); const d = el("div", "md"); d.innerHTML = renderMarkdown(text); m.append(d); $("messages").append(m); scroll(); return d; }
function addNotice(text) { const m = el("div", "msg notice"); m.textContent = text; $("messages").append(m); scroll(); }
function addError(text) { const m = el("div", "msg error"); const b = el("div", "bubble"); b.textContent = text; m.append(b); $("messages").append(m); scroll(); }
function toolRow(name, args) {
  const label = (TOOL_LABELS[name] || (() => name))(args);
  const r = el("div", "tool");
  r.innerHTML = `<span class="dot"></span><details><summary>${esc(label)}</summary><pre>${esc(JSON.stringify(args, null, 1))}</pre></details>`;
  $("messages").append(r); scroll();
  return r;
}
function finishTool(row, ok, out) {
  row.classList.add(ok ? "done" : "fail");
  if (out) { const pre = row.querySelector("details"); const p = el("pre"); p.textContent = String(out).slice(0, 2000); pre.append(p); }
}

// ---------- permissions ----------
function ask(title, bodyHtml, buttons) {
  return new Promise((resolve) => {
    const card = el("div", "card", `<h4>${title}</h4>${bodyHtml}<div class="actions"></div>`);
    for (const [label, value, cls] of buttons) {
      const b = el("button", "btn " + (cls || ""), esc(label));
      b.onclick = () => { card.remove(); resolve(value); };
      card.querySelector(".actions").append(b);
    }
    $("messages").append(card); scroll();
    abort?.signal.addEventListener("abort", () => { card.remove(); resolve("deny"); });
  });
}

async function activeTab() {
  const [t] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  return t;
}
const hostOf = (u) => { try { return new URL(u).hostname; } catch { return ""; } };
const NEEDS_TAB = new Set(["computer", "read_page", "find", "get_page_text", "navigate", "form_input", "javascript_tool", "read_console_messages"]);
const READ_ONLY = new Set(["read_page", "find", "get_page_text", "read_console_messages"]);

async function authorize(name, input, tab) {
  if (!settings.askBeforeActing || !NEEDS_TAB.has(name)) return true;
  const host = name === "navigate" && !/^(back|forward)$/.test(input.url) ? hostOf(/^[a-z]+:/i.test(input.url) ? input.url : "https://" + input.url) : hostOf(tab.url);
  if (!host || sessionAllowed.has(host) || sessionAllowed.has("*") || settings.allowedSites.includes(host)) return true;
  const verb = READ_ONLY.has(name) ? "read" : "act on";
  const choice = await ask("Asking to use " + esc(host), `<p>Web Buddy wants to ${verb} <b>${esc(host)}</b>.</p>`, [
    ["Allow once", "once", "primary"], ["Always allow this site", "always"], ["Deny", "deny", "danger"],
  ]);
  if (choice === "deny") return false;
  if (choice === "always") { settings = await saveSettings({ allowedSites: [...settings.allowedSites, host] }); }
  else sessionAllowed.add(host);
  return true;
}

// ---------- agent loop ----------
const call = (msg) => new Promise((res) => chrome.runtime.sendMessage(msg, (r) => res(r || { ok: false, error: chrome.runtime.lastError?.message || "No response" })));

function prepareMessages() {
  // Keep only the 2 most recent screenshots to bound payload size.
  const out = chat.messages.map((m) => ({ ...m }));
  let kept = 0;
  for (let i = out.length - 1; i >= 0; i--) {
    if (Array.isArray(out[i].content) && out[i].content.some((p) => p.type === "image_url")) {
      if (kept++ >= 2) out[i].content = out[i].content.map((p) => (p.type === "image_url" ? { type: "text", text: "[older screenshot omitted]" } : p));
    }
  }
  const sys = [SYSTEM_PROMPT, personaPrompt(settings), settings.systemPrompt].filter(Boolean).join("\n\n");
  return [{ role: "system", content: sys }, ...out.map(({ display, hidden, ...m }) => m)];
}

async function send(text) {
  text = (text || "").trim();
  if (!text || running) return;
  if (!settings.apiKey) { chrome.runtime.openOptionsPage(); return; }
  $("input").value = ""; $("input").style.height = "auto"; $("slash").hidden = true;
  $("welcome").hidden = true;
  const tab = await activeTab();
  const ctx = tab ? `\n\n[Active tab ${tab.id}: "${tab.title}" — ${tab.url}]` : "";
  chat.messages.push({ role: "user", content: text + ctx, display: text });
  if (chat.title === "New chat") { chat.title = text.slice(0, 48); $("title").textContent = chat.title; }
  addUser(text);
  setRunning(true);
  abort = new AbortController();
  let indicatorTab = null;
  try {
    for (let step = 0; step < settings.maxSteps; step++) {
      let live = null, liveEl = null;
      const reply = await streamChatResilient({
        settings, messages: prepareMessages(), tools: TOOLS, signal: abort.signal,
        onSwitch: ({ from, to, reason }) => {
          liveEl?.closest(".msg")?.remove(); liveEl = null; // drop text from the failed attempt
          addNotice(from === to ? `↻ ${from}: ${reason}…` : `↻ ${from} ${reason}. Continuing with ${to}.`);
        },
        onText: (t) => { if (!liveEl) liveEl = addAssistant(""); live = t; liveEl.innerHTML = renderMarkdown(t); scroll(); },
      });
      const am = { role: "assistant", content: reply.content || null };
      if (reply.tool_calls.length) am.tool_calls = reply.tool_calls;
      chat.messages.push(am);
      if (!reply.tool_calls.length) break;

      const images = [];
      for (const tc of reply.tool_calls) {
        let input = {};
        try { input = JSON.parse(tc.function.arguments || "{}"); } catch {}
        const name = tc.function.name;
        const row = toolRow(name, input);
        let content, ok = true;
        try {
          const cur = await activeTab();
          const tabId = input.tabId || cur?.id;
          if (name === "update_plan") {
            const dom = (input.domains || []).map((d) => `<li>${esc(d)}</li>`).join("");
            const steps = (input.approach || []).map((d) => `<li>${esc(d)}</li>`).join("");
            const c = await ask("Web Buddy's plan", `<p>Sites to use:</p><ul>${dom}</ul><p>Approach:</p><ul>${steps}</ul>`, [["Approve plan", "ok", "primary"], ["Reject", "deny", "danger"]]);
            if (c === "ok") { (input.domains || []).forEach((d) => sessionAllowed.add(d)); content = "Plan approved. Proceed."; }
            else { content = "Error: The user rejected the plan."; ok = false; }
          } else if (NEEDS_TAB.has(name) && !(await authorize(name, input, cur || {}))) {
            content = "Error: The user denied permission to use this site."; ok = false;
          } else {
            if (NEEDS_TAB.has(name) && tabId && indicatorTab !== tabId) { indicatorTab = tabId; chrome.runtime.sendMessage({ type: "indicator", tabId, on: true }); }
            const r = await call({ type: "tool", name, input, tabId });
            if (!r.ok) { content = "Error: " + r.error; ok = false; }
            else {
              content = r.text || "Done";
              if (r.image) images.push({ type: "image_url", image_url: { url: r.image } });
              if (r.image) { const im = el("img", "shot"); im.src = r.image; $("messages").append(im); scroll(); }
            }
          }
        } catch (e) { content = "Error: " + e.message; ok = false; }
        chat.messages.push({ role: "tool", tool_call_id: tc.id, content });
        finishTool(row, ok, name === "computer" && ok ? null : content);
        if (abort.signal.aborted) throw new DOMException("aborted", "AbortError");
      }
      if (images.length) chat.messages.push({ role: "user", hidden: true, content: [{ type: "text", text: "Screenshot result(s) from the tool call above:" }, ...images] });
    }
  } catch (e) {
    if (e.name === "AbortError") addError("Stopped.");
    else if (e.message === "NO_KEY") chrome.runtime.openOptionsPage();
    else addError(e.message);
  } finally {
    if (indicatorTab) chrome.runtime.sendMessage({ type: "indicator", tabId: indicatorTab, on: false });
    chrome.runtime.sendMessage({ type: "release" });
    setRunning(false);
    await saveChat(chat);
  }
}

function setRunning(v) {
  running = v;
  $("send").classList.toggle("stop", v);
  $("send").title = v ? "Stop" : "Send";
}
