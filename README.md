[![中文](https://img.shields.io/badge/%E4%B8%AD%E6%96%87-5c5348?style=for-the-badge)](./README.zh.md)
[![English](https://img.shields.io/badge/English-c48a3a?style=for-the-badge)](./README.md)

# Game Hub

A web game collection — board games, wizard chess, a Monopoly-style journey, three 3D shooters, a fan-style adventure, and a Mario-like platformer — served from one static hub for GitHub Pages.

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
| [`games/redcap/`](./games/redcap/) | Red Cap Quest | Mario-like platformer |

- **Wizard Chess** (`wizard-chess-3d`): procedural stone pieces in a Gothic hall. `chess.js` rules, human vs AI, local two-player, and auto-demo. Three.js and chess.js load from a CDN.
- **Wizard Chess 2** (`wizard-chess-sanctum`): a second sanctum with the same chess rules.
- **Chinese Chess 3D** (`3D_xiangqi`): a Xiangqi tabletop (the river board). Take Red, or watch the AIs. This is not Western chess.
- **Tactical Assault** (`fps`): about five per side, assault or mini battle royale, weapon pickups.
- **Street Duty** (`street-duty`): local port of Claude-of-Duty; the player, two allies, and hostile waves. The three shooters do not replace each other.
- **Sandline** (`sandline`): a single-player tactical shooter adapted from sandline-threejs-fps. Desert and snow arenas, eight modes. Soldiers and guns are procedural. No Counter-Strike maps or models.
- **Pocket Adventure** (`pocket`): first-person cartoon opening in Pallet Town; choose a starter and meet wild creatures in the grass.
- **Gold City Chronicle** (`richera`): a 3D street market. One die, land, buildings, tools, and visiting gods. Original names; a nod to classic richman boards, not a commercial copy.
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
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Hub layout, deploy flow, the two FPS boundaries |
| [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md) | Sources and licenses |
| [games/street-duty/ARCHITECTURE.md](./games/street-duty/ARCHITECTURE.md) | Street Duty engine contract |
| [games/fps/README.md](./games/fps/README.md) | Tactical Assault |
| [games/pocket/README.md](./games/pocket/README.md) | Pocket Adventure |
| [games/redcap/README.md](./games/redcap/README.md) | Red Cap Quest |
| [games/wizard-chess-3d/README.md](./games/wizard-chess-3d/README.md) | Wizard Chess |

Every guide has **中文 / English** buttons at the top. The highlighted button is the page you are reading.

---

## Copyright

Copyright (C) 2026 Kwan Wai-Pang.

Kwan Wai-Pang owns the copyright in the original hub and in the original games that do not carry another author's license. Open source here means Kwan Wai-Pang grants the MIT License in [LICENSE](./LICENSE): others may use, copy, modify, and share that code if they keep the copyright and license notice. The copyright itself stays with Kwan Wai-Pang.

That grant covers the hub pages, styles, lobby script, and original games such as Go, Gomoku, Junqi, Tactical Assault, and Red Cap Quest.

Code written by other people stays theirs. Xiangqi, Monopoly, Street Duty, Sandline, Pocket Adventure, and Chess 3D keep the license their authors chose. See [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md).

[FAST_LIO](https://github.com/hku-mars/FAST_LIO/blob/main/LICENSE) is GNU GPL version 2 and is not used for this repository. A GPL-2.0-only grant cannot be combined with `games/chess3d` (GPL-3.0), and copying that file would name the wrong copyright holder.

## License

Hub and original static pages: MIT, see [LICENSE](./LICENSE).  
Per-game licenses stay in each folder (**chess3d is GPL-3.0**). Summary: [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md).
