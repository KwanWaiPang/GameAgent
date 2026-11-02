# Wizard Chess — Sanctum of Kings

Independent, procedural Three.js interpretation of a cinematic gothic-cathedral wizard chess demo.

## Run

Open `index.html` through a local HTTP server (ES modules need HTTP, not file://):

```bash
python -m http.server 8000
```

Visit `http://localhost:8000`.

## Publish on GitHub Pages

1. Create a public GitHub repository.
2. Upload `index.html` at the repository root (README is optional).
3. Repository **Settings → Pages → Build and deployment → Deploy from a branch**.
4. Select `main` and `/ (root)`, then Save.
5. Your URL should become `https://YOURNAME.github.io/REPOSITORY/` after GitHub Pages deploys.

No build process, Node installation, or backend needed. Internet access is required for two CDN dependencies (`three` and `chess.js`). No remote assets, models, textures, sound files, AI APIs, or account setup are used. The computer opponent runs locally.

## Features

- A procedurally modeled Gothic great hall, chess altar, lit braziers and stained-glass windows.
- Distinct procedural ivory and obsidian king, queen, bishop, knight, rook, pawn models.
- Complete legal chess via `chess.js`: castling, en passant, promotion, check, checkmate, stalemate and draws.
- Player versus local AI, pass-and-play, auto-demo.
- Move/capture effects, stone shatter debris, cinematic tracking camera, chess log, hint and undo.
- Orbit and zoom camera, four camera presets, audio synthesis, mobile-friendly HUD.

This is an original reimplementation, **not an identical extraction** of the reference site's 3D models, textures, animation rigs or source code.

## Attribution

Uses the [Three.js](https://threejs.org/) and [chess.js](https://github.com/jhlywa/chess.js) runtime libraries via CDN. Their respective licenses are maintained by the upstream projects. No code or artwork from the referenced commercial demo is included.
