# Chrome Web Store listing: Web Buddy by coding180

## Name
Web Buddy by coding180

## Summary (max 132 chars)
Browse smarter with an AI agent in your side panel. Use free or paid models via OpenRouter, with personas and auto-failover.

## Category
Productivity

## Detailed description
Web Buddy puts an AI browsing agent in your Chrome side panel. It can read the page you're on, answer questions about it, and click, type, scroll and navigate for you, using any model available on OpenRouter.

What you get
• Free or paid models: switch with one click. Free models are live-checked before they're listed, and Web Buddy automatically moves to another working model if one is rate limited or fails mid-task.
• Personas: SEO expert, research analyst, lead researcher, content writer, QA tester, or write your own. Add an avatar to each.
• Page actions: read page text, find elements, fill forms, click and type, take screenshots.
• You stay in control: Web Buddy asks before acting on a new site, and you can allow sites permanently.
• Shortcuts: save reusable prompts and run them with /name.
• Private by design: your OpenRouter API key and chats are stored only in your browser.

How it works
Bring your own OpenRouter API key (free to create at openrouter.ai/keys). Your messages and the page content you ask about are sent to OpenRouter and the model you chose. Nothing goes to coding180 servers.

Web Buddy is an independent project by Robort Gabriel · coding180. Not affiliated with or endorsed by Anthropic or OpenRouter. Source code and more reverse-engineered apps: https://coding180.com/forum/reverse-engineer/clone-claude-chrome-extension-rea. Need a custom version? Contact the developer: https://coding180.com/contact

## Single purpose
An AI assistant in the browser side panel that reads and acts on web pages at the user's request.

## Permission justifications (paste into the dashboard)
- sidePanel: the whole UI lives in Chrome's side panel.
- storage: saves the user's API key, settings, personas, chats and model health results locally.
- tabs: reads the title and URL of the active tab and lets the agent open, switch and list tabs the user asks about.
- scripting: reads page text and builds the page's accessibility tree so the model can understand the page.
- debugger: performs user-requested clicks, typing, scrolling and screenshots on the page. Chrome shows its standard "debugging this browser" banner while this runs.
- Host permissions (<all_urls>): the agent can work on whichever site the user is on. Web Buddy asks before acting on each new site unless the user allows it.

## Remote code
No remotely hosted code. All extension code is in the package. The javascript_tool runs short scripts that the user's chosen model writes, in the page the user is on, at the user's request.

## Data usage disclosures
- Collects: website content and the user's prompts (sent to OpenRouter and the chosen model to answer), authentication information (user's API key, stored locally only).
- Not sold, not used for unrelated purposes, not used for creditworthiness or lending.

## Assets you still need to make
- Screenshots: at least 1, up to 5, 1280x800 (or 640x400): side panel chat, persona picker, free/paid switch, settings.
- Small promo tile: 440x280.
- Privacy policy URL: host store/privacy-policy.md as a page (e.g. on coding180.com).
