[![中文](https://img.shields.io/badge/%E4%B8%AD%E6%96%87-5c5348?style=for-the-badge)](./THIRD_PARTY_NOTICES.zh.md)
[![English](https://img.shields.io/badge/English-c48a3a?style=for-the-badge)](./THIRD_PARTY_NOTICES.md)

# Third-party notices

The Game Hub aggregates several open-source games under a shared shell. Use the buttons above for the Chinese text.

---

## Chinese Chess (`games/xiangqi/`)

- Source: [Chinese Chess in HTML5](https://github.com/KwanWaiPang/Chess/tree/master/Chinese_Chess) (original author: 一叶孤舟 / itlwei)
- License: MIT (`games/xiangqi/LICENSE`)

## Wizard Chess 2 (`games/wizard-chess-sanctum/`)

- Source: standalone procedural hall and pieces in this folder
- Rules: [chess.js](https://github.com/jhlywa/chess.js) 1.4.0 (BSD-2-Clause), loaded at runtime from jsDelivr
- Renderer: [Three.js](https://github.com/mrdoob/three.js) r180 (MIT), loaded at runtime from jsDelivr

## Chinese Chess 3D (`games/3D_xiangqi/`)

- Source: original rules and tabletop scene in this folder
- Renderer: [Three.js](https://github.com/mrdoob/three.js) r160 (MIT), loaded at runtime from cdnjs
- Note: Xiangqi (the river board): palace, horse-leg, cannon screen, checkmate. This is not Western chess.

## Wizard Chess (`games/wizard-chess-3d/`)

- Source: original procedural hall and pieces in this repository
- Rules: [chess.js](https://github.com/jhlywa/chess.js) 1.4.0 (BSD-2-Clause), loaded at runtime from jsDelivr
- Renderer: [Three.js](https://github.com/mrdoob/three.js) r160 (MIT), including `OrbitControls`, loaded at runtime from jsDelivr
- Note: the Gothic hall is original and does not include proprietary models or textures from any reference site. The page is static and needs a network connection while playing.

## Chess 3D (`games/chess3d/`)

- Source: [FrenchYann/Chess3D](https://github.com/FrenchYann/Chess3D)
- AI: [Garbochess-JS](https://github.com/glinscott/Garbochess-JS)
- License: GNU GPL v3 (`games/chess3d/LICENSE.md`)
- Note: modifications and redistribution must follow the GPL.

## Go (`games/go/`)

- Match engine and graded AI: original to this repository
- In-browser KataGo level:
  - Engine ported from [Web KaTrain](https://github.com/Sir-Teo/web-katrain) (MIT). The network forward pass and search come from [KataGo](https://github.com/lightvector/KataGo) (MIT).
  - Model `g170-b6c96-s175395328-d26788732`, a small public test network from the KataGo repository
- Drills, levels 1–3: original to the hub, expanded, including multi-move lines
- Weekly problems, levels 4–9:
  - Authors: An Younggil (8 dan) and David Ormerod, Go Game Guru
  - Source: [gogameguru/go-problems](https://github.com/gogameguru/go-problems)
  - License: [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/)
  - Note: correct lines marked Correct were adapted into Chinese goals and interactive practice. This is an adaptation, not the full original text. Non-commercial use only.
- Classical problems (from level 10) and endgame, public domain:
  - Gokyo Shumyo (Hayashi Genbi, 1812). Solution transcripts: [u-go.net classical problems](https://www.u-go.net/classic/) (Ulrich Goertz; source from Flygo, redistributed with permission)
  - Xuanxuan Qijing (Yan Defu and Yan Tianzhang, c. 1349). SGF arranged by Jean-Pierre Vesinet and published via u-go.net
  - Xuanlan. Transcript Flygo → u-go.net
  - Guan Zi Pu. Transcript Flygo → u-go.net
- Not included: 101weiqi, goproblems.com, and modern collections by Cho Chikun and Lee Changho. Those problems cannot be redistributed.
- Note: public-domain shapes from tsumego.tasuki.org (Hatsuyōron and others) were tried as look-only problems without marked solutions. They were removed from the graded set because they could not be checked automatically. The reader `games/go/tools/tsumego-read.mjs` remains, but `problems.js` no longer imports it.
- Full-board classical games are in the public domain, collected by Andries Brouwer (CWI), who states that he claims no rights and that the games are in the public domain: <https://homepages.cwi.nl/~aeb/go/games/>
  - The ten games of Danghu (Fan Xiping vs Shi Xiangxia, 1739), Shi Xiangxia vs Cheng Lanru, Xu Xingyou vs Cheng Lanru, Lanke, and Tang–Song games
  - Shusaku's ear-reddening game (1846) and castle games; vs Ota Yuzo, vs Ebizawa Kenzo, vs Murase Shuho
  - Honinbo Dosaku castle games, Honinbo Shuwa castle games, Honinbo Jowa's famous game (1835, vs Akaboshi Intetsu)

## World Tour (`games/monopoly/`)

- Gameplay skeleton: [HumanSean/javascript-monopoly](https://github.com/HumanSean/javascript-monopoly) (ISC)
- License: ISC (`games/monopoly/LICENSE`)
- Note: a physical “world tour” loop. Cities and UI are hub-authored, not an official Monopoly product map.
- Renderer: [Three.js](https://github.com/mrdoob/three.js) r180 (MIT), including `OrbitControls`, `RoundedBoxGeometry` and `RoomEnvironment`, loaded at runtime from jsDelivr

## Gold City Chronicle (`games/richera/`)

- Source: original to this repository
- License: MIT (repository root [`LICENSE`](./LICENSE))
- Note: a 3D street-market richman. The loop nods to classic Chinese richman boards (one die, land, buildings, tools, a bank, visiting gods). Names, people, cards, and the board are original, not a copy of a commercial map, cast, or script
- Renderer: [Three.js](https://github.com/mrdoob/three.js) r180 (MIT), including `OrbitControls`, loaded at runtime from jsDelivr
- Dice, pawns, and sounds: [Kenney Board Game Pack](https://kenney.nl/assets/boardgame-pack) (CC0), see `games/richera/assets/kenney/license.txt`

## Tactical Assault (`games/fps/`)

- Renderer: [Three.js](https://github.com/mrdoob/three.js) r160 (MIT)
- Pointer lock: Three.js examples `PointerLockControls` (MIT)
- Gunshot samples: based on Wikimedia Commons “9 mm gunshot-mike-koenig-123.wav” (CC BY-SA 4.0). Reload clips adapted from [Mixkit](https://mixkit.co/free-sound-effects/)
- Gameplay, scene, AK viewmodel, and characters: original to this repository

## Sandline (`games/sandline/`)

- Source: [xilinnihao-afk/sandline-threejs-fps](https://github.com/xilinnihao-afk/sandline-threejs-fps) 0.39
- License: MIT (`games/sandline/LICENSE`)
- Renderer: [Three.js](https://github.com/mrdoob/three.js) 0.180.0 (MIT)
- Note: this hall port keeps the rules, bots, weapon numbers, and the procedural desert and snow arenas. Soldiers, view models, interface, and audio are procedural and original to the hall. Counter-Strike / Valve maps, characters, gun models, and audio are not included. Upstream copyright stays in `games/sandline/LICENSE`.

## Street Duty (`games/street-duty/`)

- Source: [mshumer/Claude-of-Duty](https://github.com/mshumer/Claude-of-Duty)
- License: MIT (`games/street-duty/LICENSE`)
- Renderer: [Three.js](https://github.com/mrdoob/three.js) r180 (MIT)
- Note: a full local port (Vite + `src/`), not an embed or iframe. Chinese titles, the pause menu, the link back to the hub, allies, and the assault director are hub adaptations. Upstream copyright is retained.

## Pocket Adventure (`games/pocket/`)

- Source: [PauliusOS/pallet-town-3d](https://github.com/PauliusOS/pallet-town-3d)
- License: MIT (`games/pocket/LICENSE`)
- Renderer: [Three.js](https://github.com/mrdoob/three.js) r185 (MIT)
- Note: a first-person cartoon fan work. Chinese UI, the hub entry, and Pages packaging are adaptations. Pokémon is a trademark of its rights holders; this page is unofficial.

## Red Cap Quest (`games/redcap/`)

- Source: original to this repository
- License: MIT (root [`LICENSE`](./LICENSE))
- Note: a browser platformer. The character, stages, pixels, and sound are procedural and original. Gameplay nods to Super Mario. It is not a Nintendo product and does not copy Nintendo sprites, music, or stages.

---

This repository is an aggregate. The hub and original static pages are MIT. A game folder with its own license keeps that license. `games/chess3d/` is **GPL-3.0** and is not relicensed by the root MIT text.
