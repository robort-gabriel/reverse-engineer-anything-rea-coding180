# ChatGPT Chat: REA — a ChatGPT-style UI for OpenRouter

A self-hosted chat app modeled on chatgpt.com's layout and navigation, powered by the OpenRouter API. It has no build step and no npm dependencies: plain ES modules and a 40-line Node static server.

## Run

```bash
cd chatgpt-chat-rea
npm start            # http://localhost:5173  (PORT=8080 npm start to change)
```

Then open **Settings → Models & API** (or the profile button in the bottom-left), paste your key from <https://openrouter.ai/settings/keys>, and click **Test**.

## What's included

| Area | ChatGPT feature | Implementation |
|------|-----------------|----------------|
| Sidebar | New chat, Search chats, Library, GPTs, chat history, collapse to an icon rail, mobile drawer | `renderSidebar` |
| Chat history | Rename inline, pin, share/export, delete | Stored in IndexedDB, so chats survive reloads |
| Header | Model picker with live search over the full OpenRouter catalog, plus favorites (★) and free/vision/reasoning badges | `GET /api/v1/models`, cached for 6h |
| Home | Greeting, composer, suggestion chips, temporary chat toggle | `/` and `/?temporary-chat=true` |
| Composer | Auto-growing input, **+** menu (photos & files, web search, think longer), paste or drag-and-drop images, dictation, send/stop | Images go to vision models as `image_url`, PDFs as `file` parts, and text files are inlined |
| Responses | Streaming Markdown, highlighted code blocks with copy, tables, collapsible "Thought for Ns" reasoning, web citations | SSE parsing in `openrouter.js` |
| Message actions | Copy, 👍/👎, read aloud, try again (or try again with another favorite model), edit and resend user messages | |
| Usage | Model, token count and $ cost under each reply | `usage: { include: true }` |
| GPTs | Explore page with 6 featured presets, plus create/edit/delete your own (instructions, emoji, starters, recommended model) | `/gpts`, `/gpts/editor`, `/g/<id>` |
| Library | Every image and file you have shared across chats | `/library` |
| Settings | General (theme, Enter-to-send, reasoning, auto-titles), Personalization (custom instructions), Models & API (key, default model, temperature, max tokens), Data controls (export, import, delete all), Shortcuts | `#settings/<Tab>` deep links |
| Shortcuts | ⌘⇧O new chat · ⌘K search · ⌘⇧S sidebar · ⌘, settings · Esc stop · `/` focus | |

## Notes

- **Key storage:** the API key lives in your browser's `localStorage` and is sent only to `openrouter.ai`. This is fine for personal or local use. Don't deploy it publicly as a shared app; for that, add a server-side proxy that holds the key.
- **Default model:** `openrouter/auto`. Pick any model in the header picker; the choice sticks to the current chat and becomes the default for new chats.
- **Web search** uses OpenRouter's `web` plugin, which is billed per request by OpenRouter. **Think longer** sends `reasoning: { effort: "high" }`.
- **Branding:** the name, logo and copy are original. Only the layout and interaction patterns follow ChatGPT.

## Files

```
server.mjs            static server + SPA fallback
public/index.html     shell; marked, DOMPurify, highlight.js from cdnjs
public/styles.css     dark/light design tokens and every component style
public/js/app.js      routing, views, composer, streaming, settings
public/js/openrouter.js  API client (models, key info, streaming)
public/js/store.js    settings in localStorage, chats/GPTs in IndexedDB
public/js/gpts.js     built-in GPT presets
public/js/markdown.js Markdown rendering + code blocks
public/js/ui.js       menus, modals, toast
```
