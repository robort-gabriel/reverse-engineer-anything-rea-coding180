export const DEFAULTS = {
  apiKey: "",
  baseUrl: "https://openrouter.ai/api/v1",
  model: "anthropic/claude-sonnet-4.5",
  customModels: [],
  systemPrompt: "",
  askBeforeActing: true,
  allowedSites: [],
  maxSteps: 40,
  shortcuts: [
    { id: "s1", name: "summarize", prompt: "Summarize the current page in a few bullet points." },
    { id: "s2", name: "explain", prompt: "Explain the key ideas on this page in simple terms." },
  ],
};

export async function getSettings() {
  const { settings } = await chrome.storage.local.get("settings");
  return { ...DEFAULTS, ...(settings || {}) };
}
export async function saveSettings(patch) {
  const cur = await getSettings();
  const next = { ...cur, ...patch };
  await chrome.storage.local.set({ settings: next });
  return next;
}

export const SUGGESTED_MODELS = [
  "anthropic/claude-sonnet-4.5",
  "anthropic/claude-opus-4.1",
  "anthropic/claude-haiku-4.5",
  "openai/gpt-5",
  "google/gemini-2.5-pro",
  "deepseek/deepseek-chat-v3.1",
];

let modelCache = null;
export async function fetchModels(settings) {
  if (modelCache) return modelCache;
  try {
    const r = await fetch(settings.baseUrl.replace(/\/$/, "") + "/models");
    const j = await r.json();
    modelCache = (j.data || []).map((m) => ({ id: m.id, name: m.name || m.id, tools: (m.supported_parameters || []).includes("tools") }));
  } catch {
    modelCache = SUGGESTED_MODELS.map((id) => ({ id, name: id, tools: true }));
  }
  return modelCache;
}

export async function testKey(settings) {
  const r = await fetch(settings.baseUrl.replace(/\/$/, "") + "/auth/key", {
    headers: { Authorization: "Bearer " + settings.apiKey },
  });
  if (!r.ok) throw new Error(r.status === 401 ? "Invalid API key" : "HTTP " + r.status);
  const j = await r.json();
  return j.data || {};
}

export async function listChats() {
  const { chats } = await chrome.storage.local.get("chats");
  return (chats || []).sort((a, b) => b.updated - a.updated);
}
export async function saveChat(chat) {
  const chats = await listChats();
  const i = chats.findIndex((c) => c.id === chat.id);
  const slim = {
    ...chat,
    updated: Date.now(),
    messages: chat.messages.map((m) =>
      Array.isArray(m.content) ? { ...m, content: m.content.map((p) => (p.type === "image_url" ? { type: "text", text: "[screenshot]" } : p)) } : m
    ),
  };
  if (i >= 0) chats[i] = slim; else chats.push(slim);
  await chrome.storage.local.set({ chats: chats.slice(0, 100) });
}
export async function deleteChat(id) {
  const chats = (await listChats()).filter((c) => c.id !== id);
  await chrome.storage.local.set({ chats });
}
