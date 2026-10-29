# Claude for Chrome — OpenRouter edition

Independent re-implementation of the "Claude in Chrome" side-panel agent (v1.0.102 analysed), using any OpenRouter model. No build step.

## Install
1. `chrome://extensions` → enable **Developer mode** → **Load unpacked** → select this folder.
2. The options page opens on install: paste your OpenRouter key (https://openrouter.ai/keys), **Save API Key**, **Test connection**.
3. Click the toolbar icon or press ⌘E / Ctrl+E to open the side panel.

## What mirrors the original
- Side panel chat (welcome screen, suggestions, streaming markdown, tool timeline, screenshots, history, `/shortcuts`, model picker, stop button)
- Options: Settings (API/model/system prompt), Permissions (ask-before-acting + allowed sites), Shortcuts, About
- Tools: computer (click/type/key/scroll/drag/zoom/screenshot), read_page, find, get_page_text, navigate, form_input, javascript_tool, read_console_messages, tabs_*, update_plan (plan approval)
- Per-site permission prompts, page glow indicator while acting, same warm Claude palette

## Differences
- Models run via OpenRouter; pick a tool-calling model. Screenshots need a vision-capable model.
- Not included: claude.ai login, scheduled tasks, workflow recording, MCP bridge, Google Workspace tools.
- Uses `chrome.debugger`, so Chrome shows a debugging banner while the agent acts.
