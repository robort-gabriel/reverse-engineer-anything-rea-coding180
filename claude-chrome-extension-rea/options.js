import { getSettings, saveSettings, fetchModels, testKey } from "./lib/settings.js";

const $ = (id) => document.getElementById(id);
let s, editing = null;

function flash(id, msg, err) {
  const n = $(id);
  n.textContent = msg; n.className = "status" + (err ? " err" : "");
  setTimeout(() => (n.textContent = ""), 3500);
}

function tab() {
  const t = (location.hash || "#settings").slice(1);
  for (const sec of document.querySelectorAll("main section")) sec.hidden = sec.id !== "tab-" + t;
  for (const a of document.querySelectorAll("nav a")) a.classList.toggle("active", a.dataset.tab === t);
}
addEventListener("hashchange", tab);

async function load() {
  s = await getSettings();
  $("apiKey").value = s.apiKey;
  $("baseUrl").value = s.baseUrl;
  $("model").value = s.model;
  $("customModels").value = s.customModels.join("\n");
  $("systemPrompt").value = s.systemPrompt;
  $("maxSteps").value = s.maxSteps;
  $("askBeforeActing").checked = s.askBeforeActing;
  renderSites(); renderShortcuts();
  fetchModels(s).then((ms) => { $("model-list").innerHTML = ms.map((m) => `<option value="${m.id}">${m.name}${m.tools ? "" : " (no tools)"}</option>`).join(""); });
}

$("toggle-key").onclick = () => {
  const i = $("apiKey");
  i.type = i.type === "password" ? "text" : "password";
  $("toggle-key").textContent = i.type === "password" ? "Show" : "Hide";
};
$("save-api").onclick = async () => {
  s = await saveSettings({ apiKey: $("apiKey").value.trim(), baseUrl: $("baseUrl").value.trim() || "https://openrouter.ai/api/v1" });
  flash("api-status", "Settings saved.");
};
$("test").onclick = async () => {
  try {
    const d = await testKey({ ...s, apiKey: $("apiKey").value.trim(), baseUrl: $("baseUrl").value.trim() });
    const left = d.limit_remaining != null ? ` · $${Number(d.limit_remaining).toFixed(2)} left` : "";
    flash("api-status", "Connected" + (d.label ? ` (${d.label})` : "") + left);
  } catch (e) { flash("api-status", e.message, true); }
};
$("save").onclick = async () => {
  s = await saveSettings({
    model: $("model").value.trim() || s.model,
    customModels: $("customModels").value.split("\n").map((x) => x.trim()).filter(Boolean),
    systemPrompt: $("systemPrompt").value,
    maxSteps: Math.max(1, parseInt($("maxSteps").value, 10) || 40),
    apiKey: $("apiKey").value.trim(),
    baseUrl: $("baseUrl").value.trim() || s.baseUrl,
  });
  flash("status", "Settings saved.");
};

// Permissions
$("askBeforeActing").onchange = async (e) => (s = await saveSettings({ askBeforeActing: e.target.checked }));
function renderSites() {
  const ul = $("sites");
  ul.innerHTML = s.allowedSites.length ? "" : '<li class="hint">No sites allowed yet.</li>';
  for (const h of s.allowedSites) {
    const li = document.createElement("li");
    li.innerHTML = `<span class="grow"></span><button class="btn danger">Remove</button>`;
    li.querySelector(".grow").textContent = h;
    li.querySelector("button").onclick = async () => { s = await saveSettings({ allowedSites: s.allowedSites.filter((x) => x !== h) }); renderSites(); };
    ul.append(li);
  }
}
$("site-add").onclick = async () => {
  let v = $("site-input").value.trim().toLowerCase();
  try { v = new URL(/^[a-z]+:/.test(v) ? v : "https://" + v).hostname; } catch { return; }
  if (!v || s.allowedSites.includes(v)) return;
  s = await saveSettings({ allowedSites: [...s.allowedSites, v] });
  $("site-input").value = ""; renderSites();
};

// Shortcuts
$("kbd").onclick = () => chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
function renderShortcuts() {
  const ul = $("sc-list");
  ul.innerHTML = s.shortcuts.length ? "" : '<li class="hint">Create your first shortcut to get started.</li>';
  for (const sc of s.shortcuts) {
    const li = document.createElement("li");
    li.innerHTML = `<div class="grow"><b></b><small></small></div><button class="btn">Edit</button><button class="btn danger">Delete</button>`;
    li.querySelector("b").textContent = "/" + sc.name;
    li.querySelector("small").textContent = sc.prompt;
    const [edit, del] = li.querySelectorAll("button");
    edit.onclick = () => { editing = sc.id; $("sc-name").value = sc.name; $("sc-prompt").value = sc.prompt; $("sc-save").textContent = "Save shortcut"; $("sc-form-title").textContent = "Edit shortcut"; $("sc-cancel").hidden = false; };
    del.onclick = async () => { s = await saveSettings({ shortcuts: s.shortcuts.filter((x) => x.id !== sc.id) }); renderShortcuts(); flash("sc-status", "Shortcut deleted"); };
    ul.append(li);
  }
}
function resetForm() { editing = null; $("sc-name").value = ""; $("sc-prompt").value = ""; $("sc-save").textContent = "Create shortcut"; $("sc-form-title").textContent = "Create shortcut"; $("sc-cancel").hidden = true; }
$("sc-cancel").onclick = resetForm;
$("sc-save").onclick = async () => {
  const name = $("sc-name").value.trim().replace(/^\//, "").replace(/\s+/g, "-");
  const prompt = $("sc-prompt").value.trim();
  if (!name) return flash("sc-status", "Name is required", true);
  if (!prompt) return flash("sc-status", "Prompt is required", true);
  const list = editing ? s.shortcuts.map((x) => (x.id === editing ? { ...x, name, prompt } : x)) : [...s.shortcuts, { id: crypto.randomUUID(), name, prompt }];
  s = await saveSettings({ shortcuts: list });
  flash("sc-status", editing ? "Shortcut updated" : "Shortcut added");
  resetForm(); renderShortcuts();
};

tab();
load();
