[![中文](https://img.shields.io/badge/%E4%B8%AD%E6%96%87-5c5348?style=for-the-badge)](./README.zh.md)
[![English](https://img.shields.io/badge/English-c48a3a?style=for-the-badge)](./README.md)

# Hulao Gate

Copyright (C) 2026 Kwan Wai-Pang. Original code in this folder is under the MIT License at the repository root ([`LICENSE`](../../LICENSE)).

An original Three.js third-person action game, suggested by the Hulao Gate episode in *Romance of the Three Kingdoms*. It is not a copy of a commercial Dynasty Warriors game, and it does not use that series' trademarks, art, models, music, or assets. It is not a card on the hub lobby yet.

## Play

The folder is static. No npm or Vite. After it is on `main` of `KwanWaiPang/GameAgent`, Pages serves:

https://kwanwaipang.github.io/GameAgent/games/Hulao_Gate/

Three.js 0.160.1 loads from jsDelivr, so the first visit needs a network. Use GitHub Pages or a local HTTP server, not `file://`.

## Controls

| Action | Desktop | Phone or tablet |
|---|---|---|
| Move | WASD / arrows | Stick, lower left |
| Camera | Hold the left mouse button and drag | Drag the right side |
| Combo | J / left click | Slash |
| Heavy | K / right click | Heavy |
| Musou | Q (costs 50 musou) | Musou |
| Dodge | Space | Dodge |
| Run | Shift | — |
| Pause | Esc | Pause, upper right |
| Camera distance | Wheel | Fixed |

## What is in it

- Playable Guan Yu: walk, run, invulnerable dodge, a three-hit light combo, a heavy attack, and an area musou
- Three Hulao stages: soldiers, elite soldiers, and Lu Bu
- Enemies chase, attack on a timer, wind up, stagger, knock back, and leave when they fall
- Original procedural warriors and battlefield: armor, the crescent blade, the halberd, walls, tents, and banners
- A follow camera, hit feedback, health, musou, break count, and a minimap
- Touch devices and machines with few CPU threads cap how many enemies are active and turn dynamic shadows off

## Files

```
index.html
style.css
game.js
warrior-model.js
battlefield-detail.js
```

## Check locally

```bash
python -m http.server 8000
node --check game.js
node --check warrior-model.js
node --check battlefield-detail.js
```

`?q=low` forces the low quality preset. In the console, `window.__HULAO_READY__` and `window.__HULAO_STATE__()` are available.

## Limits

This is a light WebGL prototype. Characters and scenery are procedural, not scanned bodies or motion capture. Sound is synthesized with the Web Audio API. Three.js (MIT) comes from a CDN. No third-party game models or textures are included.
