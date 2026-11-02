[![中文](https://img.shields.io/badge/%E4%B8%AD%E6%96%87-5c5348?style=for-the-badge)](./README.md)
[![English](https://img.shields.io/badge/English-c48a3a?style=for-the-badge)](./README.en.md)

# Wizard Chess 3D

Gothic wizard chess inside the Game Hub. Rules stay on `chess.js`. The hall and pieces are original procedural sculpture and do not include proprietary models or textures from a reference site.

Repository: `KwanWaiPang/GameAgent`, path `games/wizard-chess-3d/`.

## Look

- Six figure types: shielded spearman, mounted knight, heavy hammer guard, cleric with wand and book, crowned sorceress, cloaked king
- Armor, pauldrons, boots, faces, shield devices, sword / hammer / staff, cloaks, crowns, and rune plinths
- A Gothic church: pointed arches, columns, stained glass, chandeliers, banners, dust, and torches
- Marble squares, carved runes, and side lighting
- Steps, arm swings, strikes, hits, shattering stone, and cinematic cameras

## Play

- `chess.js`: castling, en passant, promotion, check, checkmate, and draws
- Three AI levels, local two-player, and an AI demo; flip sides, undo, hint, four cameras, sound
- Click a figure or a square to move. Drag to orbit. Scroll to zoom.

## Deploy

Static page. No npm or Vite. Pages URL:

https://kwanwaipang.github.io/GameAgent/games/wizard-chess-3d/

These libraries load from a CDN, so play needs a network connection:

- Three.js 0.160.1
- OrbitControls
- chess.js 1.4.0

## Limits

These are procedural sculptures, not high-resolution skinned models exported from Blender. A licensed GLB / GLTF can replace `createPiece()` later and keep the rules layer.
