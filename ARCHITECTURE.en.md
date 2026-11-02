[![中文](https://img.shields.io/badge/%E4%B8%AD%E6%96%87-5c5348?style=for-the-badge)](./ARCHITECTURE.md)
[![English](https://img.shields.io/badge/English-c48a3a?style=for-the-badge)](./ARCHITECTURE.en.md)

# Architecture

How the Game Hub is organized and deployed, and how the two 3D shooters coexist.

The Street Duty engine contract is [`games/street-duty/ARCHITECTURE.md`](./games/street-duty/ARCHITECTURE.md).

---

## 1. Goals

| Goal |
|---|
| One static site, many playable entries |
| A shared hub look and navigation |
| Games stay independent and deep-linkable |
| Prefer zero-build; heavy games build explicitly |
| Deployable to GitHub Pages |

---

## 2. Layout

```
                    ┌─────────────────────┐
                    │   index.html (Hub)  │
                    └──────────┬──────────┘
                               │
        ┌──────────┬───────────┴──────┬────────────┬──────────┐
        ▼          ▼                  ▼            ▼          ▼
   games/go/…  games/fps/   games/street-duty/  games/pocket/  games/redcap/
   static boards  static FPS    Vite FPS         static 3D      platformer
```

| Layer | Responsibility |
|---|---|
| **Hub** (`index.html`, `css/`, `js/hub-lobby.js`) | Brand, Three.js ring gallery, card-list fallback |
| **Game shell** | Each game's own `index.html` / CSS / JS, with an optional link back to the hub |
| **Shared assets** (`assets/`) | The few files used by more than one game |
| **CI / Pages** (`.github/workflows/`) | Build Street Duty and Pocket, pack `_site`, deploy |

The hub draws a Three.js gallery only. It does not boot any game runtime. Choosing a plinth or a list card navigates away. Without WebGL, the card list remains.

---

## 3. Categories

### 3.1 Static

`go` · `xiangqi` · `3D_xiangqi` · `gomoku` · `junqi` · `monopoly` · `chess3d` · `wizard-chess-3d` · `wizard-chess-sanctum` · `fps` · `pocket` · `redcap`

Open and play. No `npm`. Any static file server is enough.

### 3.2 Built

`street-duty` and `pocket` use Vite. Street Duty's flow:

```
src/  +  index.source.html   →  vite build  →  dist/
                                         ↓
                              sync-pages-build.mjs
                                         ↓
                         index.html  +  assets/*.js   (committed)
```

| File | Purpose |
|---|---|
| `index.source.html` | Vite dev / build entry |
| `index.html` + `assets/` | What Pages actually serves |
| `src/` | Source |
| `tools/` | Local capture, profile, and record tools |

Production must load the hashed `assets/*.js`. Do not ship the Vite source HTML as the live entry.

---

## 4. The two FPS boundaries

| | Tactical Assault `games/fps/` | Street Duty `games/street-duty/` |
|---|---|---|
| Role | Light red-vs-blue street fight | Full procedural street FPS |
| Stack | Three r160, one page | Three r180, Vite, many subsystems |
| Teams | Red (player + about 4) vs blue (about 5) | Player `team 0` + 2 allies vs hostile waves |
| Start | Pick assault or battle royale | Click to enter; assault wave + allies |
| Keys | Q/E lean, Z crouch, H call for help | Q/E lean, Z crouch, Ctrl/C prone |
| Deploy | Static | Built artifacts |

They do not import each other and must not replace each other. Edit one without touching the other.

---

## 5. Street Duty runtime

```
main.js
  ├─ boot UI / quality / optional prewarm
  ├─ Engine (registry + events + input + time + rng)
  │    ├─ render · materials · sky · world
  │    ├─ physics · player · weapons · fx
  │    ├─ ai · ui · audio
  │    └─ playstart (allies, assault wave, director)
  └─ window.__ENGINE__ / __READY__
```

| Concept | Notes |
|---|---|
| **Registry** | `ctx.peek('ai')` at runtime. No static imports across subsystem directories. |
| **Events** | `weapon:fire`, `actor:death`, `damage:dealt`, and the rest in the engine contract |
| **Quality** | `?q=low\|medium\|high\|ultra`. Weak devices default low. |
| **Capture / lockstep** | `?capture=1&lockstep=1` is for tools, not normal play. |

---

## 6. Deploy flow

```
push main
   → Actions: npm ci && npm run build (Street Duty and Pocket)
   → copy hub + games into _site/
   → strip Street Duty src/, tools/, node_modules/, …
   → GitHub Pages
```

If Pages still serves the `main` root as-is, the committed `games/street-duty/index.html` and `assets/` are what players get, so the build output must land on `main`.

---

## 7. Conventions

1. **New game:** self-contained under `games/<slug>/`, then add a hub card.
2. **Street Duty:** edit `src/` → `npm run build` → commit the synced `index.html` and `assets/`.
3. Do not mix or overwrite `fps` and `street-duty`.
4. When vendors change, update [THIRD_PARTY_NOTICES.en.md](./THIRD_PARTY_NOTICES.en.md) and the [Chinese notices](./THIRD_PARTY_NOTICES.md).
5. Hub docs live at the repo root, one file per language. The Street Duty engine contract stays under `games/street-duty/`.

---

## 8. Links

- Hub README: [README.en.md](./README.en.md)
- Street Duty: [games/street-duty/README.md](./games/street-duty/README.md)
- Engine contract: [games/street-duty/ARCHITECTURE.md](./games/street-duty/ARCHITECTURE.md)
- Tactical Assault: [games/fps/README.en.md](./games/fps/README.en.md)
- Pocket Adventure: [games/pocket/README.en.md](./games/pocket/README.en.md)
- Red Cap Quest: [games/redcap/README.en.md](./games/redcap/README.en.md)
- Upstream: [mshumer/Claude-of-Duty](https://github.com/mshumer/Claude-of-Duty)
