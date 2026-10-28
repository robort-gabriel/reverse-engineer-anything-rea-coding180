// OpenRouter client: OpenAI-compatible chat completions with SSE streaming.
// Docs: https://openrouter.ai/docs/api-reference/overview

const BASE = 'https://openrouter.ai/api/v1';
const MODELS_CACHE = 'oc.models';
const MODELS_TTL = 6 * 60 * 60 * 1000;

function headers(apiKey) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
    'HTTP-Referer': location.origin,
    'X-Title': 'ChatGPT Chat: REA',
  };
}

async function errorFrom(res) {
  let msg = `${res.status} ${res.statusText}`;
  try {
    const j = await res.json();
    msg = j?.error?.message || msg;
    const raw = j?.error?.metadata?.raw;
    if (raw && typeof raw === 'string' && raw.length < 300) msg += ` — ${raw}`;
  } catch { /* not JSON */ }
  if (res.status === 401) msg = `Invalid or missing OpenRouter API key (401: ${msg})`;
  if (res.status === 402) msg = `Insufficient OpenRouter credits (402: ${msg})`;
  const e = new Error(msg);
  e.status = res.status;
  return e;
}

/** Public model catalog (no key needed). Cached in localStorage. */
export async function listModels({ force = false } = {}) {
  if (!force) {
    try {
      const c = JSON.parse(localStorage.getItem(MODELS_CACHE) || 'null');
      if (c && Date.now() - c.at < MODELS_TTL) return c.models;
    } catch { /* ignore */ }
  }
  const res = await fetch(`${BASE}/models`);
  if (!res.ok) throw await errorFrom(res);
  const { data } = await res.json();
  const models = data.map((m) => ({
    id: m.id,
    name: m.name || m.id,
    context: m.context_length,
    vision: (m.architecture?.input_modalities || []).includes('image'),
    files: (m.architecture?.input_modalities || []).includes('file'),
    reasoning: (m.supported_parameters || []).includes('reasoning'),
    free: m.pricing && Number(m.pricing.prompt) === 0 && Number(m.pricing.completion) === 0,
    promptPrice: Number(m.pricing?.prompt || 0),
    completionPrice: Number(m.pricing?.completion || 0),
    created: m.created || 0,
  }));
  try { localStorage.setItem(MODELS_CACHE, JSON.stringify({ at: Date.now(), models })); } catch { /* quota */ }
  return models;
}

/** Validates a key and returns its usage/limit info. */
export async function keyInfo(apiKey) {
  const res = await fetch(`${BASE}/key`, { headers: headers(apiKey) });
  if (!res.ok) throw await errorFrom(res);
  return (await res.json()).data;
}

/**
 * Streams a chat completion.
 * onDelta({ content?, reasoning? }) is called per chunk; resolves with { usage, model, finishReason }.
 */
export async function streamChat({ apiKey, model, messages, temperature, maxTokens, webSearch, reasoning, signal, onDelta }) {
  const body = { model, messages, stream: true, usage: { include: true } };
  if (temperature != null) body.temperature = temperature;
  if (maxTokens) body.max_tokens = maxTokens;
  if (webSearch) body.plugins = [{ id: 'web' }];
  if (reasoning) body.reasoning = { effort: 'high' };

  const res = await fetch(`${BASE}/chat/completions`, { method: 'POST', headers: headers(apiKey), body: JSON.stringify(body), signal });
  if (!res.ok) throw await errorFrom(res);

  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = '';
  const out = { usage: null, model: null, finishReason: null, annotations: [] };

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let nl;
    while ((nl = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line.startsWith('data:')) continue; // SSE comments like ": OPENROUTER PROCESSING"
      const data = line.slice(5).trim();
      if (data === '[DONE]') return out;
      let j;
      try { j = JSON.parse(data); } catch { continue; }
      if (j.error) throw new Error(j.error.message || 'Stream error');
      out.model = j.model || out.model;
      if (j.usage) out.usage = j.usage;
      const ch = j.choices?.[0];
      if (!ch) continue;
      if (ch.finish_reason) out.finishReason = ch.finish_reason;
      const d = ch.delta || {};
      if (d.annotations) out.annotations.push(...d.annotations);
      if (d.content || d.reasoning) onDelta({ content: d.content || '', reasoning: d.reasoning || '' });
    }
  }
  return out;
}

/** One-shot, non-streaming completion (used for chat titles). */
export async function complete({ apiKey, model, messages, maxTokens = 24 }) {
  const res = await fetch(`${BASE}/chat/completions`, {
    method: 'POST',
    headers: headers(apiKey),
    body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature: 0.3 }),
  });
  if (!res.ok) throw await errorFrom(res);
  const j = await res.json();
  return j.choices?.[0]?.message?.content || '';
}
