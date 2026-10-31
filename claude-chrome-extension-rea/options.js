import { verifyFreeModels, cachedWorkingFree } from "./lib/models.js";
import { PERSONAS, avatarHTML } from "./lib/personas.js";
import { getSettings, saveSettings, fetchModels, testKey, SUGGESTED_MODELS, SUGGESTED_FREE_MODELS } from "./lib/settings.js";

const $ = (id) => document.getElementById(id);
let s, editing = null, avatarFor = null, verified = [], verifyRun = 0, verifyCtl = null, allModels = [], tier = "paid", picks = { paid: "", free: "" };

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
  tier = s.modelTier;
  picks = { paid: s.model, free: s.freeModel };
  renderTier();
  $("customModels").value = s.customModels.join("\n");
  $("systemPrompt").value = s.systemPrompt;
  $("maxSteps").value = s.maxSteps;
  $("askBeforeActing").checked = s.askBeforeActing;
  renderPersonas(); renderSites(); renderShortcuts();
  fetchModels(s).then((ms) => { allModels = ms; renderModelList(); runVerify(false); });
}

function renderPersonas() {
  const box = $("personas");
  box.innerHTML = "";
  for (const p of PERSONAS) {
    const card = document.createElement("div");
    card.className = "persona" + (p.id === s.personaId ? " on" : "");
    card.tabIndex = 0;
    card.innerHTML = `<div class="top"><button type="button" class="pa" title="Upload avatar">${avatarHTML(s, p)}</button><b></b></div><small></small>`;
    card.querySelector("b").textContent = p.name;
    card.querySelector("small").textContent = p.description;
    card.querySelector(".pa").onclick = (e) => { e.stopPropagation(); avatarFor = p.id; $("avatar-file").click(); };
    if (s.personaAvatars?.[p.id]) {
      const rm = document.createElement("button");
      rm.type = "button"; rm.className = "rm"; rm.textContent = "Remove avatar";
      rm.onclick = async (e) => {
        e.stopPropagation();
        const { [p.id]: _, ...rest } = s.personaAvatars;
        s = await saveSettings({ personaAvatars: rest }); renderPersonas();
      };
      card.append(rm);
    }
    const select = async () => { s = await saveSettings({ personaId: p.id }); renderPersonas(); flash("status", p.name + " selected."); };
    card.onclick = select;
    card.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(); } };
    box.append(card);
  }
  $("sys-panel").hidden = s.personaId !== "custom";
}

// Avatar upload: centre-crop to a 96px square so storage stays small.
$("avatar-file").onchange = async (e) => {
  const file = e.target.files[0];
  e.target.value = "";
  if (!file || !avatarFor) return;
  try {
    const bmp = await createImageBitmap(file);
    const side = Math.min(bmp.width, bmp.height);
    const c = document.createElement("canvas");
    c.width = c.height = 96;
    c.getContext("2d").drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, 96, 96);
    s = await saveSettings({ personaAvatars: { ...s.personaAvatars, [avatarFor]: c.toDataURL("image/png") } });
    renderPersonas();
  } catch { flash("status", "Could not read that image.", true); }
};

function renderTier() {
  for (const b of document.querySelectorAll("#tier button")) b.classList.toggle("on", b.dataset.tier === tier);
  $("model").value = picks[tier];
  $("model-label").textContent = tier === "free" ? "Free model" : "Paid model";
  $("model").placeholder = tier === "free" ? SUGGESTED_FREE_MODELS[0] : SUGGESTED_MODELS[0];
  $("tier-hint").textContent = tier === "free"
    ? "Free models cost nothing but are often rate limited. Only models that pass a live check are listed, and Web Buddy switches to another working one automatically if the current one fails."
    : "Paid models use your OpenRouter credits and are the most reliable for browser actions.";
  renderModelList();
}
function renderModelList() {
  const names = new Map(allModels.map((m) => [m.id, m.name]));
  const opts = tier === "free"
    ? verified.map((id) => `<option value="${id}">${names.get(id) || id}</option>`)
    : allModels.filter((m) => !m.free && m.tools).map((m) => `<option value="${m.id}">${m.name}</option>`);
  $("model-list").innerHTML = opts.join("");
}

// Free models are only listed once they've been verified as working.
async function runVerify(force) {
  $("verify-row").hidden = tier !== "free";
  if (tier !== "free") return;
  const run = ++verifyRun;
  verifyCtl?.abort();
  verifyCtl = new AbortController();
  if (!s.apiKey) {
    verified = [];
    renderModelList();
    $("verify-status").textContent = "Save your API key to check which free models are working.";
    return;
  }
  verified = await cachedWorkingFree();
  renderModelList();
  $("recheck").disabled = true;
  $("verify-status").textContent = "Checking which free models are working…";
  const working = await verifyFreeModels(s, {
    force, signal: verifyCtl.signal,
    onProgress: ({ checked, working }) => {
      if (run !== verifyRun) return;
      verified = working; renderModelList();
      $("verify-status").textContent = `Checking free models… ${working.length} working so far (${checked} tested)`;
    },
  });
  if (run !== verifyRun) return;
  $("recheck").disabled = false;
  verified = working;
  renderModelList();
  $("verify-status").textContent = working.length
    ? `${working.length} free model${working.length === 1 ? "" : "s"} verified working. Web Buddy switches between them automatically if one fails.`
    : "No free model responded right now (they may be rate limited). Try Re-check in a minute.";
  if (working.length && !working.includes(picks.free)) {
    picks.free = working[0];
    $("model").value = picks.free;
    s = await saveSettings({ freeModel: picks.free });
  }
}
$("recheck").onclick = () => runVerify(true);
for (const b of document.querySelectorAll("#tier button")) b.onclick = async () => {
  picks[tier] = $("model").value.trim() || picks[tier];
  tier = b.dataset.tier;
  renderTier();
  runVerify(false);
  s = await saveSettings({ modelTier: tier, model: picks.paid, freeModel: picks.free });
  flash("status", (tier === "free" ? "Free" : "Paid") + " models selected.");
};

$("toggle-key").onclick = () => {
  const i = $("apiKey");
  i.type = i.type === "password" ? "text" : "password";
  $("toggle-key").textContent = i.type === "password" ? "Show" : "Hide";
};
$("save-api").onclick = async () => {
  s = await saveSettings({ apiKey: $("apiKey").value.trim(), baseUrl: $("baseUrl").value.trim() || "https://openrouter.ai/api/v1" });
  flash("api-status", "Settings saved.");
  runVerify(false);
};
$("test").onclick = async () => {
  try {
    const d = await testKey({ ...s, apiKey: $("apiKey").value.trim(), baseUrl: $("baseUrl").value.trim() });
    const left = d.limit_remaining != null ? ` · $${Number(d.limit_remaining).toFixed(2)} left` : "";
    flash("api-status", "Connected" + (d.label ? ` (${d.label})` : "") + left);
  } catch (e) { flash("api-status", e.message, true); }
};
$("save").onclick = async () => {
  picks[tier] = $("model").value.trim() || picks[tier];
  s = await saveSettings({
    modelTier: tier,
    model: picks.paid,
    freeModel: picks.free,
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
