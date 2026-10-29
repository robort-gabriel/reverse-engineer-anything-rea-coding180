// Service worker: opens the side panel and executes browser tools (via chrome.debugger / scripting).
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});

chrome.runtime.onInstalled.addListener((d) => {
  if (d.reason === "install") chrome.runtime.openOptionsPage();
});

chrome.commands.onCommand.addListener(async (cmd) => {
  if (cmd !== "toggle-side-panel") return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) chrome.sidePanel.open({ tabId: tab.id }).catch(() => {});
});

const attached = new Set();
const consoleLogs = new Map(); // tabId -> [{level,text}]

async function attach(tabId) {
  if (attached.has(tabId)) return;
  await chrome.debugger.attach({ tabId }, "1.3");
  attached.add(tabId);
  await cdp(tabId, "Runtime.enable").catch(() => {});
  await cdp(tabId, "Page.enable").catch(() => {});
}
const cdp = (tabId, method, params = {}) => chrome.debugger.sendCommand({ tabId }, method, params);
chrome.debugger.onDetach.addListener((src) => attached.delete(src.tabId));
chrome.debugger.onEvent.addListener((src, method, p) => {
  if (method === "Runtime.consoleAPICalled") {
    const arr = consoleLogs.get(src.tabId) || [];
    arr.push({ level: p.type, text: p.args.map((a) => a.value ?? a.description ?? "").join(" ") });
    consoleLogs.set(src.tabId, arr.slice(-200));
  }
});
chrome.tabs.onRemoved.addListener((id) => { attached.delete(id); consoleLogs.delete(id); });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function ensureContent(tabId) {
  await chrome.scripting.executeScript({ target: { tabId }, files: ["content/accessibility-tree.js"] }).catch(() => {});
}
async function evalPage(tabId, fn, args = []) {
  await ensureContent(tabId);
  const [r] = await chrome.scripting.executeScript({ target: { tabId }, func: fn, args, world: "ISOLATED" });
  return r?.result;
}

async function viewport(tabId) {
  const m = await cdp(tabId, "Page.getLayoutMetrics");
  const v = m.cssVisualViewport || m.visualViewport;
  return { width: Math.round(v.clientWidth), height: Math.round(v.clientHeight) };
}

async function screenshot(tabId, region) {
  await attach(tabId);
  const vp = await viewport(tabId);
  const params = { format: "jpeg", quality: 70 };
  if (region) {
    const [x0, y0, x1, y1] = region;
    params.clip = { x: x0, y: y0, width: x1 - x0, height: y1 - y0, scale: Math.min(2, vp.width / Math.max(1, x1 - x0)) };
  } else params.clip = { x: 0, y: 0, width: vp.width, height: vp.height, scale: 1 };
  const { data } = await cdp(tabId, "Page.captureScreenshot", params);
  return { image: "data:image/jpeg;base64," + data, text: `Screenshot captured (${vp.width}x${vp.height})` };
}

const MODS = { alt: 1, ctrl: 2, control: 2, meta: 4, cmd: 4, command: 4, shift: 8 };
const KEYS = {
  enter: ["Enter", 13, "\r"], return: ["Enter", 13, "\r"], tab: ["Tab", 9], escape: ["Escape", 27], esc: ["Escape", 27],
  backspace: ["Backspace", 8], delete: ["Delete", 46], space: [" ", 32, " "], arrowup: ["ArrowUp", 38], up: ["ArrowUp", 38],
  arrowdown: ["ArrowDown", 40], down: ["ArrowDown", 40], arrowleft: ["ArrowLeft", 37], left: ["ArrowLeft", 37],
  arrowright: ["ArrowRight", 39], right: ["ArrowRight", 39], home: ["Home", 36], end: ["End", 35], pageup: ["PageUp", 33], pagedown: ["PageDown", 34],
};
async function pressKey(tabId, combo) {
  const parts = combo.split("+");
  let modifiers = 0;
  let key = parts.pop();
  for (const p of parts) modifiers |= MODS[p.toLowerCase()] || 0;
  const k = KEYS[key.toLowerCase()];
  const info = k
    ? { key: k[0], windowsVirtualKeyCode: k[1], code: k[0], text: modifiers & 6 ? undefined : k[2] }
    : { key: key, windowsVirtualKeyCode: key.toUpperCase().charCodeAt(0), code: /^[a-z]$/i.test(key) ? "Key" + key.toUpperCase() : key, text: modifiers & 6 ? undefined : key };
  await cdp(tabId, "Input.dispatchKeyEvent", { type: info.text ? "keyDown" : "rawKeyDown", modifiers, ...info });
  await cdp(tabId, "Input.dispatchKeyEvent", { type: "keyUp", modifiers, key: info.key, code: info.code, windowsVirtualKeyCode: info.windowsVirtualKeyCode });
}

async function mouse(tabId, type, x, y, extra = {}) {
  await cdp(tabId, "Input.dispatchMouseEvent", { type, x, y, button: "none", ...extra });
}
async function click(tabId, x, y, button = "left", count = 1) {
  await mouse(tabId, "mouseMoved", x, y);
  for (let i = 1; i <= count; i++) {
    await mouse(tabId, "mousePressed", x, y, { button, clickCount: i, buttons: button === "left" ? 1 : 2 });
    await mouse(tabId, "mouseReleased", x, y, { button, clickCount: i });
  }
}

async function resolvePoint(tabId, input) {
  if (input.ref) {
    const r = await evalPage(tabId, (id) => window.__orRefPoint(id), [input.ref]);
    if (!r || r.error) throw new Error(r?.error || "Could not resolve ref");
    return [r.x, r.y];
  }
  if (!input.coordinate) throw new Error("coordinate or ref required");
  return input.coordinate;
}

async function computer(tabId, a) {
  await attach(tabId);
  switch (a.action) {
    case "screenshot": return screenshot(tabId);
    case "zoom": return screenshot(tabId, a.region);
    case "left_click": case "right_click": case "double_click": case "triple_click": {
      const [x, y] = await resolvePoint(tabId, a);
      await click(tabId, x, y, a.action === "right_click" ? "right" : "left", a.action === "double_click" ? 2 : a.action === "triple_click" ? 3 : 1);
      await sleep(300);
      return { text: `${a.action} at (${x}, ${y})` };
    }
    case "hover": {
      const [x, y] = await resolvePoint(tabId, a);
      await mouse(tabId, "mouseMoved", x, y);
      return { text: `Hovered at (${x}, ${y})` };
    }
    case "type":
      await cdp(tabId, "Input.insertText", { text: a.text || "" });
      return { text: `Typed ${(a.text || "").length} characters` };
    case "key": {
      const seq = (a.text || "").split(/\s+/).filter(Boolean);
      for (let i = 0; i < (a.repeat || 1); i++) for (const k of seq) await pressKey(tabId, k);
      await sleep(150);
      return { text: `Pressed ${a.text}` };
    }
    case "wait":
      await sleep(Math.min(10, a.duration || 1) * 1000);
      return { text: `Waited ${a.duration || 1}s` };
    case "scroll": {
      const [x, y] = a.coordinate || [200, 200];
      const n = (a.scroll_amount || 3) * 100;
      const d = a.scroll_direction || "down";
      await cdp(tabId, "Input.dispatchMouseEvent", { type: "mouseWheel", x, y, deltaX: d === "left" ? -n : d === "right" ? n : 0, deltaY: d === "up" ? -n : d === "down" ? n : 0 });
      await sleep(300);
      return { text: `Scrolled ${d}` };
    }
    case "scroll_to": {
      await evalPage(tabId, (id) => window.__orRefPoint(id), [a.ref]);
      return { text: `Scrolled ${a.ref} into view` };
    }
    case "left_click_drag": {
      const [sx, sy] = a.start_coordinate, [ex, ey] = a.coordinate;
      await mouse(tabId, "mouseMoved", sx, sy);
      await mouse(tabId, "mousePressed", sx, sy, { button: "left", clickCount: 1, buttons: 1 });
      await mouse(tabId, "mouseMoved", ex, ey, { button: "left", buttons: 1 });
      await mouse(tabId, "mouseReleased", ex, ey, { button: "left", clickCount: 1 });
      return { text: `Dragged to (${ex}, ${ey})` };
    }
    default: throw new Error("Unknown computer action: " + a.action);
  }
}

async function waitLoaded(tabId) {
  for (let i = 0; i < 40; i++) {
    const t = await chrome.tabs.get(tabId);
    if (t.status === "complete") return;
    await sleep(250);
  }
}

async function runTool(name, input, tabId) {
  switch (name) {
    case "computer": return computer(tabId, input);
    case "read_page": {
      const r = await evalPage(tabId, (f, d, m, id) => window.__orGenerateTree(f, d, m, id), [input.filter || "all", input.depth ?? null, input.max_chars || 50000, input.ref_id || null]);
      if (r.error) throw new Error(r.error);
      return { text: `Viewport: ${r.viewport.width}x${r.viewport.height}\n${r.pageContent}` };
    }
    case "find": {
      const r = await evalPage(tabId, () => window.__orGenerateTree("all", 20, 200000, null));
      const q = (input.query || "").toLowerCase();
      const lines = r.pageContent.split("\n").filter((l) => l.toLowerCase().includes(q)).slice(0, 20);
      return { text: lines.length ? lines.map((l) => l.trim()).join("\n") : `No elements matching "${input.query}"` };
    }
    case "get_page_text": {
      const t = await evalPage(tabId, () => {
        const root = document.querySelector("article") || document.querySelector("main") || document.body;
        return `Title: ${document.title}\nURL: ${location.href}\n\n${(root.innerText || "").trim()}`;
      });
      return { text: (t || "").slice(0, input.max_chars || 50000) };
    }
    case "navigate": {
      const u = input.url;
      if (u === "back") await chrome.tabs.goBack(tabId);
      else if (u === "forward") await chrome.tabs.goForward(tabId);
      else await chrome.tabs.update(tabId, { url: /^[a-z]+:/i.test(u) ? u : "https://" + u });
      await sleep(400);
      await waitLoaded(tabId);
      const t = await chrome.tabs.get(tabId);
      return { text: `Navigated to ${t.url} ("${t.title}")` };
    }
    case "form_input": {
      const r = await evalPage(tabId, (id, v) => window.__orSetValue(id, v), [input.ref, input.value]);
      if (r.error) throw new Error(r.error);
      return { text: r.ok };
    }
    case "javascript_tool": {
      await attach(tabId);
      const r = await cdp(tabId, "Runtime.evaluate", { expression: input.text, awaitPromise: true, returnByValue: true, replMode: true });
      if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
      const v = r.result.value;
      return { text: v === undefined ? "undefined" : typeof v === "string" ? v : JSON.stringify(v, null, 1) };
    }
    case "read_console_messages": {
      await attach(tabId);
      let logs = consoleLogs.get(tabId) || [];
      if (input.onlyErrors) logs = logs.filter((l) => l.level === "error");
      if (input.pattern) logs = logs.filter((l) => l.text.includes(input.pattern));
      return { text: logs.slice(-(input.limit || 50)).map((l) => `[${l.level}] ${l.text}`).join("\n") || "No console messages" };
    }
    case "resize_window": {
      const t = await chrome.tabs.get(tabId);
      await chrome.windows.update(t.windowId, { width: input.width, height: input.height });
      return { text: `Resized to ${input.width}x${input.height}` };
    }
    case "tabs_context": {
      const tabs = await chrome.tabs.query({ currentWindow: true });
      return { text: tabs.map((t) => `${t.id}${t.active ? " (active)" : ""}: "${t.title}" ${t.url}`).join("\n") };
    }
    case "tabs_create": {
      const t = await chrome.tabs.create({ url: input.url || "about:blank", active: false });
      return { text: `Created tab ${t.id}`, newTabId: t.id };
    }
    case "tabs_close": {
      await chrome.tabs.remove(input.tab_id);
      return { text: `Closed tab ${input.tab_id}` };
    }
    default: throw new Error("Unknown tool: " + name);
  }
}

chrome.runtime.onMessage.addListener((msg, _s, send) => {
  if (msg?.type === "tool") {
    runTool(msg.name, msg.input || {}, msg.tabId)
      .then((r) => send({ ok: true, ...r }))
      .catch((e) => send({ ok: false, error: String(e.message || e) }));
    return true;
  }
  if (msg?.type === "release") {
    (async () => {
      for (const id of [...attached]) await chrome.debugger.detach({ tabId: id }).catch(() => {});
      attached.clear();
      send({ ok: true });
    })();
    return true;
  }
  if (msg?.type === "indicator") {
    chrome.tabs.sendMessage(msg.tabId, { type: "agent-indicator", on: msg.on }).catch(() => {});
  }
});
