// Streaming chat completion against OpenRouter (OpenAI-compatible).
export async function streamChat({ settings, messages, tools, signal, onText }) {
  if (!settings.apiKey) throw new Error("NO_KEY");
  const res = await fetch(settings.baseUrl.replace(/\/$/, "") + "/chat/completions", {
    method: "POST",
    signal,
    headers: {
      Authorization: "Bearer " + settings.apiKey,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://github.com/claude-openrouter-extension",
      "X-Title": "Claude for Chrome (OpenRouter)",
    },
    body: JSON.stringify({ model: settings.model, messages, tools, stream: true }),
  });
  if (!res.ok) {
    let detail = "";
    try { detail = (await res.json()).error?.message || ""; } catch {}
    if (res.status === 401) throw new Error("Invalid OpenRouter API key. Check Settings.");
    if (res.status === 402) throw new Error("Insufficient OpenRouter credits. " + detail);
    if (res.status === 429) throw new Error("Rate limited by OpenRouter. Try again shortly.");
    throw new Error(`OpenRouter error ${res.status}: ${detail}`);
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
