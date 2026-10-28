// Persistence: settings in localStorage, chats + custom GPTs in IndexedDB (attachments can be large).

const SETTINGS_KEY = 'oc.settings';

export const DEFAULT_SETTINGS = {
  apiKey: '',
  model: 'openrouter/auto',
  favorites: ['openrouter/auto'],
  temperature: 0.7,
  maxTokens: 0, // 0 = provider default
  theme: 'system',
  enterToSend: true,
  showReasoning: true,
  autoTitle: true,
  name: '',
  occupation: '',
  traits: '',
  about: '',
  customInstructionsOn: true,
  sidebarCollapsed: false,
};

export function loadSettings() {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(s) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch { /* private mode */ }
}

// ---- IndexedDB ----
let dbp;
function db() {
  dbp ??= new Promise((resolve, reject) => {
    const req = indexedDB.open('openchat', 1);
    req.onupgradeneeded = () => {
      const d = req.result;
      d.createObjectStore('chats', { keyPath: 'id' });
      d.createObjectStore('gpts', { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbp;
}

async function tx(store, mode, fn) {
  const d = await db();
  return new Promise((resolve, reject) => {
    const t = d.transaction(store, mode);
    const r = fn(t.objectStore(store));
    t.oncomplete = () => resolve(r?.result);
    t.onerror = () => reject(t.error);
  });
}

export const idb = {
  all: (store) => tx(store, 'readonly', (s) => s.getAll()),
  put: (store, v) => tx(store, 'readwrite', (s) => s.put(v)),
  del: (store, id) => tx(store, 'readwrite', (s) => s.delete(id)),
  clear: (store) => tx(store, 'readwrite', (s) => s.clear()),
};

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
