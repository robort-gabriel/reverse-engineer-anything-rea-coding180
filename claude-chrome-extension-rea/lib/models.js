// Free-model health: probe models before listing them, remember results, and pick fallbacks.
import { fetchModels, SUGGESTED_FREE_MODELS } from "./settings.js";

const TTL = { ok: 30 * 60e3, down: 15 * 60e3, limited: 2 * 60e3 };
const PROBE_TOOL = { type: "function", function: { name: "ping", description: "Health check", parameters: { type: "object", properties: {} } } };

async function readHealth() {
  const { modelHealth } = await chrome.storage.local.get("modelHealth");
  return modelHealth || {};
}
// Concurrent probes would overwrite each other's read-modify-write, so serialise writes.
let writeChain = Promise.resolve();
function updateHealth(id, entry) {
  writeChain = writeChain.then(async () => {
    const h = await readHealth();
    h[id] = entry;
    await chrome.storage.local.set({ modelHealth: h });
  }).catch(() => {});
  return writeChain;
}
const fresh = (e) => e && Date.now() < e.until;

export const markOk = (id) => updateHealth(id, { status: "ok", until: Date.now() + TTL.ok });
export const markFailed = (id, reason, limited) =>
  updateHealth(id, { status: limited ? "limited" : "down", reason, until: Date.now() + TTL[limited ? "limited" : "down"] });

export async function isCoolingDown(id) {
  const e = (await readHealth())[id];
  return fresh(e) && e.status !== "ok";
}

// One tiny non-streaming request that includes a tool definition, since many free endpoints
// accept plain chat but reject tools.
export async function probeModel(settings, id, signal) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 20000);
  signal?.addEventListener("abort", () => ctl.abort());
  try {
    const res = await fetch(settings.baseUrl.replace(/\/$/, "") + "/chat/completions", {
      method: "POST",
      signal: ctl.signal,
      headers: { Authorization: "Bearer " + settings.apiKey, "Content-Type": "application/json", "X-Title": "Web Buddy by coding180" },
      body: JSON.stringify({ model: id, messages: [{ role: "user", content: "Reply with the word OK." }], tools: [PROBE_TOOL], max_tokens: 16 }),
    });
    if (res.status === 429) return { ok: false, limited: true, reason: "rate limited" };
    const j = await res.json().catch(() => ({}));
    if (!res.ok || j.error) return { ok: false, reason: j.error?.message || "HTTP " + res.status };
    if (!j.choices?.[0]?.message) return { ok: false, reason: "empty response" };
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: signal?.aborted ? "cancelled" : e.name === "AbortError" ? "timeout" : e.message };
  } finally {
    clearTimeout(timer);
  }
}

async function freeCandidates(settings) {
  const ms = await fetchModels(settings);
  const ids = ms.filter((m) => m.free && m.tools).map((m) => m.id);
  return ids.length ? ids : SUGGESTED_FREE_MODELS;
}

// Returns the free model IDs that are verified working. Probes unknown or stale ones (3 at a time)
// and stops once `target` work, so a check doesn't burn the free daily request quota.
// opts: { target = 8, maxProbes = 30, force = false, exclude = Set, signal, onProgress({checked, working}) }
export async function verifyFreeModels(settings, opts = {}) {
  const { target = 8, maxProbes = 30, force = false, exclude = new Set(), signal, onProgress } = opts;
  const health = await readHealth();
  const candidates = (await freeCandidates(settings)).filter((id) => !exclude.has(id));
  const working = candidates.filter((id) => !force && fresh(health[id]) && health[id].status === "ok");
  const queue = candidates.filter((id) => force || !fresh(health[id]));
  let checked = 0, probes = 0;
  onProgress?.({ checked, working: [...working] });
  const worker = async () => {
    while (queue.length && working.length < target && probes < maxProbes && !signal?.aborted) {
      const id = queue.shift();
      probes++;
      const r = await probeModel(settings, id, signal);
      if (signal?.aborted) return;
      checked++;
      if (r.ok) { working.push(id); await markOk(id); } else await markFailed(id, r.reason, r.limited);
      onProgress?.({ checked, working: [...working] });
    }
  };
  await Promise.all([worker(), worker(), worker()]);
  return working;
}

// Verified-working free models from the cache only (no network).
export async function cachedWorkingFree() {
  const h = await readHealth();
  return Object.keys(h).filter((id) => fresh(h[id]) && h[id].status === "ok");
}

// Next free model to try, excluding `tried`: cached working one first, otherwise probe for one.
export async function pickFallback(settings, tried) {
  const cached = (await cachedWorkingFree()).filter((id) => !tried.has(id));
  if (cached.length) return cached[0];
  const found = await verifyFreeModels(settings, { target: 1, exclude: tried });
  return found.find((id) => !tried.has(id)) || null;
}
