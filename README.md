[![中文](https://img.shields.io/badge/%E4%B8%AD%E6%96%87-5c5348?style=for-the-badge)](./README.zh.md)
[![English](https://img.shields.io/badge/English-c48a3a?style=for-the-badge)](./README.md)

# Game Hub

A web game collection — board games, wizard chess, a Monopoly-style journey, Hulao Gate, a Hong Kong city roam, three 3D shooters, a fan-style adventure, and a Mario-like platformer — served from one static hub for GitHub Pages.

**Live:** https://kwanwaipang.github.io/GameAgent/

Architecture: [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## Games

| Path | Name | Type |
|---|---|---|
| [`games/go/`](./games/go/) | Go | Board |
| [`games/xiangqi/`](./games/xiangqi/) | Chinese Chess | Board |
| [`games/3D_xiangqi/`](./games/3D_xiangqi/) | Chinese Chess 3D | 3D xiangqi |
| [`games/gomoku/`](./games/gomoku/) | Gomoku | Board |
| [`games/junqi/`](./games/junqi/) | Junqi (dark chess) | Board |
| [`games/chess3d/`](./games/chess3d/) | Chess 3D | 3D board |
| [`games/wizard-chess-3d/`](./games/wizard-chess-3d/) | Wizard Chess 3D | Gothic hall |
| [`games/wizard-chess-sanctum/`](./games/wizard-chess-sanctum/) | Wizard Chess 2 | Sanctum |
| [`games/monopoly/`](./games/monopoly/) | World Tour | Board game |
| [`games/richera/`](./games/richera/) | Gold City Chronicle | 3D street-market richman |
| [`games/fps/`](./games/fps/) | Tactical Assault | 3D FPS, red vs blue |
| [`games/street-duty/`](./games/street-duty/) | Street Duty | Full procedural FPS |
| [`games/sandline/`](./games/sandline/) | Sandline | Tactical round-based FPS |
| [`games/pocket/`](./games/pocket/) | Pocket Adventure | First-person cartoon fan game |
| [`games/Hulao_Gate/`](./games/Hulao_Gate/) | Hulao Gate | Third-person action |
| [`games/hongkong/`](./games/hongkong/) | Hong Kong Roam | City exploration |
| [`games/redcap/`](./games/redcap/) | Red Cap Quest | Mario-like platformer |

- **Wizard Chess** (`wizard-chess-3d`): procedural stone pieces in a Gothic hall. `chess.js` rules, human vs AI, local two-player, and auto-demo. Three.js and chess.js load from a CDN.
- **Wizard Chess 2** (`wizard-chess-sanctum`): a second sanctum with the same chess rules.
- **Chinese Chess 3D** (`3D_xiangqi`): a Xiangqi tabletop (the river board). Take Red, or watch the AIs. This is not Western chess.
- **Tactical Assault** (`fps`): about five per side, assault or mini battle royale, weapon pickups.
- **Street Duty** (`street-duty`): local port of Claude-of-Duty; the player, two allies, and hostile waves. The three shooters do not replace each other.
- **Sandline** (`sandline`): a single-player tactical shooter adapted from sandline-threejs-fps. Desert and snow arenas, eight modes. Soldiers and guns are procedural. No Counter-Strike maps or models.
- **Pocket Adventure** (`pocket`): first-person cartoon opening in Pallet Town; choose a starter and meet wild creatures in the grass.
- **Gold City Chronicle** (`richera`): a 3D street market. One die, land, buildings, tools, and visiting gods. Original names; a nod to classic richman boards, not a commercial copy.
- **Hulao Gate** (`Hulao_Gate`): a third-person battlefield. Guan Yu against the western army and Lu Bu. Procedural lamellar armor, the pass, and dusk light. Not a commercial musou copy.
- **Hong Kong Roam** (`hongkong`): adapted from [Slop New York](https://github.com/mrdoob/slop-newyork). Walk, drive a red taxi, cycle, or fly. Lighting, traffic, and rendering stay with the original simulation; place names, signs, the map, and the taxi are Hong Kong.
- **Red Cap Quest** (`redcap`): eight original procedural stages. A Mario-like tribute, not a Nintendo product, and it does not use official assets or levels.

---

## Layout

```
index.html                 # Hub
ARCHITECTURE.md            # Architecture (English)
ARCHITECTURE.zh.md         # 项目架构（中文）
THIRD_PARTY_NOTICES.md     # Third-party notices (English)
THIRD_PARTY_NOTICES.zh.md  # 第三方许可（中文）
css/                       # Hub and shared styles
assets/                    # Shared static assets
games/<name>/              # One folder per game
.github/workflows/pages.yml
```

Conventions:

1. The hub is a Three.js ring gallery plus a card list. Each game owns `games/<name>/index.html`.
2. Most games are static pages and need no build.
3. **Street Duty, Sandline, and Pocket Adventure** commit their Vite output as `index.html` + `assets/`. Pages deploys from the repository root.

---

## Local preview

### Static hub

```bash
python -m http.server 8080
# open http://localhost:8080
```

### Street Duty / Sandline / Pocket Adventure

```bash
cd games/street-duty && npm ci && npm run dev   # :5173
cd games/sandline && npm ci && npm run dev      # :5191
cd games/pocket && npm ci && npm run dev        # :5174
```

Production build (writes the Pages `index.html` + `assets/`):

```bash
cd games/street-duty && npm run build
cd games/sandline && npm run build
cd games/pocket && npm run build
```

Details: [Street Duty](./games/street-duty/README.md) · [Sandline](./games/sandline/README.md) · [Pocket Adventure](./games/pocket/README.md)

---

## Deploy

[`.github/workflows/pages.yml`](./.github/workflows/pages.yml) on push to `main`:

1. `npm ci && npm run build` for `games/street-duty`, `games/sandline`, and `games/pocket`
2. Pack the static site (drop each game's `src/` / `tools/` and similar dev files)
3. Publish to GitHub Pages

Prefer Settings → Pages → Source: **GitHub Actions**.

If Pages still serves the `main` root directly, the Vite build output must be committed or the live site will miss `assets/`.

---

## Docs

| Doc | Contents |
|---|---|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Hub layout, deploy flow, the three shooters |
| [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md) | Sources and licenses |
| [games/street-duty/ARCHITECTURE.md](./games/street-duty/ARCHITECTURE.md) | Street Duty engine contract |
| [games/fps/README.md](./games/fps/README.md) | Tactical Assault |
| [games/sandline/README.md](./games/sandline/README.md) | Sandline |
| [games/pocket/README.md](./games/pocket/README.md) | Pocket Adventure |
| [games/richera/README.md](./games/richera/README.md) | Gold City Chronicle |
| [games/redcap/README.md](./games/redcap/README.md) | Red Cap Quest |
| [games/Hulao_Gate/README.md](./games/Hulao_Gate/README.md) | Hulao Gate |
| [games/hongkong/README.md](./games/hongkong/README.md) | Hong Kong Roam |
| [games/wizard-chess-3d/README.md](./games/wizard-chess-3d/README.md) | Wizard Chess |

Every guide has **中文 / English** buttons at the top. The highlighted button is the page you are reading.

---

## Copyright and license

Copyright (C) 2026 Kwan Wai-Pang.

Kwan Wai-Pang owns the copyright in the hub and in the original games. Open source means he grants the MIT License in [LICENSE](./LICENSE): others may use, copy, modify, and share that code if they keep this copyright notice and the MIT text. The copyright stays with him.

That grant covers the hub (`index.html`, `css/`, `js/hub-lobby.js`) and these games: Go, Gomoku, Junqi, Tactical Assault, Red Cap Quest, Wizard Chess, Wizard Chess 2, Chinese Chess 3D, Gold City Chronicle, and Hulao Gate. Hulao Gate is listed in the hub Action section.

Games written by other people stay under their copyright. The root MIT text does not replace their licenses:

| Game | Copyright that stays | License |
|---|---|---|
| Chinese Chess | liwei | MIT |
| World Tour | Human Sean; hub adaptation by Kwan Wai-Pang | ISC |
| Street Duty | mshumer; hub adaptation by Kwan Wai-Pang | MIT |
| Pocket Adventure | Paulius; hub adaptation by Kwan Wai-Pang | MIT |
| Sandline | authors of sandline-threejs-fps; hub adaptation by Kwan Wai-Pang | MIT |
| Chess 3D | the Chess3D authors | GPL-3.0 |
| Hong Kong Roam | Mr.doob; adapted here as Hong Kong | MIT |

Libraries such as Three.js and chess.js, and the CC0 Kenney board-game assets, keep their own terms. The full list is [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md).
