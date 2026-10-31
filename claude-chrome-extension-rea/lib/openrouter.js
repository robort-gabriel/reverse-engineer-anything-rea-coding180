// Streaming chat completion against OpenRouter (OpenAI-compatible).
import { activeModel, saveSettings } from "./settings.js";
import { markOk, markFailed, isCoolingDown, pickFallback } from "./models.js";

export async function streamChat({ settings, messages, tools, signal, onText, model = activeModel(settings) }) {
  if (!settings.apiKey) throw new Error("NO_KEY");
  // Give up if the provider sends no response at all for 45s, so a stalled free endpoint can fail over.
  const ctl = new AbortController();
  signal?.addEventListener("abort", () => ctl.abort());
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; ctl.abort(); }, 45000);
  let res;
  try {
  res = await fetch(settings.baseUrl.replace(/\/$/, "") + "/chat/completions", {
    method: "POST",
    signal: ctl.signal,
    headers: {
      Authorization: "Bearer " + settings.apiKey,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://github.com/claude-openrouter-extension",
      "X-Title": "Web Buddy by coding180",
    },
    body: JSON.stringify({ model, messages, tools, stream: true }),
  });
  } catch (e) {
    if (timedOut) throw new Error("timed out waiting for " + model);
    throw e;
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    let detail = "";
    try { detail = (await res.json()).error?.message || ""; } catch {}
    const msg = res.status === 401 ? "Invalid OpenRouter API key. Check Settings."
      : res.status === 402 ? "Insufficient OpenRouter credits. " + detail
      : res.status === 429 ? "Rate limited by OpenRouter."
      : `OpenRouter error ${res.status}: ${detail}`;
    throw Object.assign(new Error(msg), { status: res.status });
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "", text = "";
  const calls = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop();
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      let j;
      try { j = JSON.parse(data); } catch { continue; }
      if (j.error) throw new Error(j.error.message || "Stream error");
      const d = j.choices?.[0]?.delta;
      if (!d) continue;
      if (d.content) { text += d.content; onText(text); }
      for (const tc of d.tool_calls || []) {
        const c = (calls[tc.index ?? 0] ||= { id: "", type: "function", function: { name: "", arguments: "" } });
        if (tc.id) c.id = tc.id;
        if (tc.function?.name) c.function.name += tc.function.name;
        if (tc.function?.arguments) c.function.arguments += tc.function.arguments;
      }
    }
  }
  return { content: text, tool_calls: calls.filter(Boolean).map((c, i) => ({ ...c, id: c.id || "call_" + Date.now() + i })) };
}

const sleep = (ms, signal) => new Promise((resolve) => {
  const t = setTimeout(resolve, ms);
  signal?.addEventListener("abort", () => { clearTimeout(t); resolve(); });
});
const shortReason = (e) => (e.status === 429 ? "rate limited" : e.status ? "error " + e.status : e.message.slice(0, 80));

// streamChat with automatic failover. If a model is rate limited, down, rejects the request or
// returns nothing, continue the same request with another model and report it through onSwitch.
//  - Free tier: fall over to other models verified as working (see models.js).
//  - Paid tier: retry the same model with backoff, then try the models the user listed under
//    "Extra models in the picker". It never silently moves a paid chat onto other paid models.
export async function streamChatResilient({ settings, messages, tools, signal, onText, onSwitch }) {
  const free = settings.modelTier === "free";
  const tried = new Set();
  let model = activeModel(settings);
  let sameModelRetries = 0;

  if (free && (await isCoolingDown(model))) {
    tried.add(model);
    const next = await pickFallback(settings, tried);
    if (next) { onSwitch?.({ from: model, to: next, reason: "recently failing" }); model = next; }
  }

  for (;;) {
    try {
      const r = await streamChat({ settings, messages, tools, signal, onText, model });
      if (!r.content && !r.tool_calls.length) throw new Error("empty response");
      if (free) {
        await markOk(model);
        if (model !== settings.freeModel) await saveSettings({ freeModel: model });
      }
      return { ...r, model };
    } catch (e) {
      if (signal?.aborted || e.name === "AbortError" || e.status === 401) throw e;
      const transient = !e.status || e.status === 429 || e.status === 408 || e.status >= 500;
      if (!free && !transient && e.status !== 404) throw e;
      const reason = shortReason(e);
      tried.add(model);
      if (free) await markFailed(model, reason, e.status === 429);

      let next = null;
      if (free) next = await pickFallback(settings, tried);
      else {
        next = settings.customModels.find((id) => !tried.has(id)) || null;
        if (!next && transient && sameModelRetries < 2) {
          tried.delete(model);
          await sleep(1500 * 2 ** sameModelRetries++, signal);
          onSwitch?.({ from: model, to: model, reason: reason + ", retrying" });
          continue;
        }
      }
      if (!next) {
        throw new Error(free
          ? `No working free model is available right now (last: ${model}, ${reason}). Wait a minute or switch to Paid.`
          : e.message);
      }
      onSwitch?.({ from: model, to: next, reason });
      model = next;
    }
  }
}
