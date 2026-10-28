# Eko Life

A playable, local-first alternative to lagoslife.app: a Sims-style life game on a 3D isometric map of Lagos.

## Run

```bash
python3 -m http.server 4400 --directory lagos-life-game-rea
```

Then open http://localhost:4400 (or use the `eko-life` entry in `.claude/launch.json`).

## Demo login

There's a built-in account, so you can play straight away:

- Username: `demo`
- Password: `ekolife-demo`

Every account, including new ones, gets a one-time ₦2,000,000 welcome bonus the first time the game loads it.

Or create your own on the sign-up page. Accounts only exist in the browser you made them in.

Light mode is the default. Turn on dark mode in the control centre (the ⌄ button at the top).

## What was observed on lagoslife.app → what this rebuilds

| Original (observed) | Here |
|---|---|
| Next.js + WebGL isometric city: lagoon, bridges, island/mainland, billboards, emoji pins | `js/city.js` (three.js 0.160, orthographic iso camera, drag/zoom/pinch, HTML pin overlay) |
| Glass header: crown logo, "active today", visit counter, Sign up / Log in | `renderChrome()` in `js/app.js` |
| Chips: Governor, Sea Plots, Homes + green governor-announcement pill | Chips + bottom sheets: `openGov`, `openSeaPlots`, `openHomes` |
| Bottom-sheet "Go to <place>" with sign-up CTA for guests | `onPick()` (guest CTA, or an action list when you're logged in) |
| Auth page: Create account / Log in tabs, name, @username, password, email, DOB, 18+ consent | `renderAuth()` (adds skin/outfit/home pickers) |
| Cookie banner (Essential only / Accept), privacy page | `#cookie`, `#/privacy` |
| Public APIs `/api/daily`, `/api/gov`, `/api/sea`, `/api/homes` | All simulated client-side in `localStorage` (`eko-life:v1`) |

## Logged-in game (modelled on the original's signed-in screens)

| Original (observed while signed in) | Here |
|---|---|
| Starts inside your Sim's 3D house: cut-away walls, wall lights, furniture | `js/house.js`: tile grid, rooms, BFS walking around walls, day/night lighting |
| Tap furniture → cards showing time, price and need tags | `openItem()`, with furniture data in `js/life.js` |
| Bottom tabs Home / Buy mode / Map, phone button, avatar + lowest-need pill | `buildHud()` |
| Clock + mood pill, chevron control centre (messages, next goal, level/streak, mood, wallet, dark mode) | `renderCC()` |
| Sim panel: Profile / Needs (6 incl. Bladder) + Feelings + Traits / Goals + perks with ✨ / Skills / People / Career ladder | `openPanel()` |
| Buy mode catalogue by category with footprint, stars, price, need tags | Buy view in `buildHud()`, `buyItem()` / `sellItem()` |
| Place sheet: area, activity chips, who's here now, Trek/Keke/Danfo/Okada/ride-hail + Go | `openPlace()`, `travel()` |
| Phone with app grid: Jobs (career ladders), Messages, news, Bank… | `renderPhone()` |
| Messages: Chats/Groups tabs, "Message someone: @username", All/Unread/Read, message requests, search, avatar rows with red unread badges | `js/chat.js` `renderList()` |
| Chat thread: privacy line, streak card, Invite/Visit/Send money, blue/grey bubbles with ✓✓, yellow event pills, invite cards, quick replies, emoji + mic composer, 12-item ⋯ menu (Bae, family, request money, buy food, hire, voice notes, profile, clear, delete, report, block) | `renderThread()`, `renderSheet()` |
| State House: Governor / Senator / President tabs, cabinet, election | `openGov()` |

The rules and numbers are my own design, because the originals aren't visible from the client. Examples: 1 real second = 10 game minutes, a promotion needs 100% performance, 2 shifts at your rank and skill level ≥ rank×2, and missions pay 3✨ each.

## Files

- `index.html`: shell and importmap
- `styles.css`: design tokens (light and dark)
- `js/data.js`: city places, homes, policies and copy
- `js/life.js`: needs, skills, careers, furniture, perks, missions and transport
- `js/house.js`: 3D house interior
- `js/city.js`: 3D city renderer
- `js/chat.js`: Messages app (DMs, requests, groups, notifications)
- `js/sound.js`: sound effects, music grooves, travel sounds and Simlish, all generated in the browser with no audio files
- `js/app.js`: routing, auth, game loop and sheets

## Dev notes

- Chat partners are invented townsfolk who reply in Pidgin after a typing indicator, plus any other accounts created in the same browser. Messages between two local accounts are delivered to each other.
- Sound works like the original's: effects for taps, panels, cash, buying, level-ups, promotions, errors and messages; an Afro-pop groove by day; a chill pad at night; Amapiano at party spots; Highlife at the Shrine, Freedom Park and church; engine, road and footstep sounds while travelling; and Simlish when gisting. The notes, patterns and code are my own; nothing was copied from lagoslife.app, and the licensed ZUKO! song isn't included. Browsers only start audio after your first tap. Switch Sound effects and Music on or off in the control centre.
- Everything is stored in your browser. To reset, clear site data for localhost:4400 or use **Me → Delete this Sim**.
- Passwords are hashed with SHA-256 before they're stored. This is only a demo and is **not** real authentication. A multiplayer version would need a backend.
- The brand, place art and billboard ads are original or invented. No assets were copied from lagoslife.app.
