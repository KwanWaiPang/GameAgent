[![中文](https://img.shields.io/badge/%E4%B8%AD%E6%96%87-5c5348?style=for-the-badge)](./README.md)
[![English](https://img.shields.io/badge/English-c48a3a?style=for-the-badge)](./README.en.md)

# Chess 3D

WebGL chess adapted from Chess3D, with the hub shell and a Chinese menu.

## Features

- A 3D board and procedural Staunton-like pieces (Chinese labels on top: king, queen, rook, bishop, knight, pawn)
- A “new game” sidebar for White/Black and AI levels 1–10. The UI is plain DOM, without jQuery
- Undo, load and save PGN
- Promotion choice
- Move sounds

## Layout

```
index.html
css/shell.css
js/            # Three.js scene, GUI, Garbochess AI
3D/json/       # board frame (pieces are procedural)
texture/
LICENSE.md     # GPL-3.0
```

## Run

```bash
python -m http.server 8080
```

Open <http://localhost:8080/games/chess3d/>.

The browser needs **WebGL**. If it does not, the page says so and offers a way back to the hub.

## Source

Based on [FrenchYann/Chess3D](https://github.com/FrenchYann/Chess3D) (GPL-3.0). The AI is Garbochess-JS. See `THIRD_PARTY_NOTICES.en.md` at the repository root.
