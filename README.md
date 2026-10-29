# REA apps (coding180)

A workspace of apps produced by reverse engineering other apps with the **REA (reverse-engineer-anything)** tool. Each app is an independent clean-room re-implementation, named `<app>-rea`.

| Folder | Re-implements | Stack | Run |
|---|---|---|---|
| `chatgpt-chat-rea/` | chatgpt.com UI on top of OpenRouter | Plain ES modules, no build | `npm start` → http://localhost:5173 |
| `claude-chrome-extension-rea/` | "Claude in Chrome" side-panel agent on OpenRouter | MV3 extension, no build | Load unpacked in `chrome://extensions` |
| `lagos-life-game-rea/` | lagoslife.app, a Sims-style 3D isometric Lagos game | Static HTML/JS, no build | `python3 -m http.server 4400 --directory lagos-life-game-rea` |

The sub-apps have no tests, linter or build step. Verify changes by running or loading them.

## Notes

- The AI apps call OpenRouter (`https://openrouter.ai/api/v1/chat/completions`) with a user-supplied API key stored in browser storage.
- Chrome extension: after edits, reload the extension (and the page, for content scripts).
- `lagos-life-game-rea` demo login: `demo` / `ekolife-demo`.

## Join the community

Having trouble installing an app, have questions, or want more reverse-engineered apps? Join us in the coding180 community: **https://coding180.com/forum/reverse-engineer**

Inside you can learn how to reverse engineer applications yourself, interact with other people, and download more REA apps.

Developed by Robort Gabriel · coding180
