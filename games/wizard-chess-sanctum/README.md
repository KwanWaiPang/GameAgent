[![中文](https://img.shields.io/badge/%E4%B8%AD%E6%96%87-5c5348?style=for-the-badge)](./README.zh.md)
[![English](https://img.shields.io/badge/English-c48a3a?style=for-the-badge)](./README.md)

# Wizard Chess — The Sanctum

A standalone, independently created Three.js Gothic fantasy chess game. Designed for GitHub Pages without a build system.

## Update: visible chessboard

The 8×8 alternating ivory/slate stone squares now sit **above** the golden base (previously occluded by it). Dark mortar gaps and stronger tile contrast make every square visible from both angled and top-down cameras, while the interactive 64-square picking remains unchanged.

## Features

- Procedural 3D cathedral, illuminated stone chessboard and six sculpted piece classes for each army
- 3D orbit, zoom, top-down view, camera presets and side switch
- Human versus computer and local two-player games
- Chess.js move validation: castling, en passant, promotion, check, checkmate, and draws
- Glowing destination runes, animated walks, cinematic captures, stone-shatter fragments
- Three AI difficulty levels, undo, move history, captured pieces, responsive UI
- No downloaded models, images or audio files

## Run locally

Because ES modules are used, serve the directory over HTTP:

```bash
python -m http.server 8000
```

Then open http://localhost:8000/.

The application loads **Three.js** and **chess.js** from the jsDelivr CDN, so the browser needs internet access on first load.

## Deploy to GitHub Pages

1. Create a public repository, for example `wizard-chess`.
2. Upload `index.html` and `README.md` to its `main` branch.
3. In GitHub repository **Settings > Pages**, set **Deploy from a branch**, **main**, folder **/(root)**.
4. Access `https://YOUR_USERNAME.github.io/wizard-chess/` when GitHub Pages completes the deployment.

Or push with Git:

```bash
git init
git add index.html README.md
git commit -m "Initial Wizard Chess game"
git branch -M main
git remote add origin git@github.com:YOUR_USERNAME/wizard-chess.git
git push -u origin main
```

## Controls

Click to select / move; drag to orbit; scroll to zoom; right-drag to pan. H hides UI; U undoes.

## Legal and attribution notes

This project is an independent, procedural implementation inspired by the **genre and high-level presentation** of Gothic 3D wizard chess, not an extraction of the original site's proprietary models, animation files, or source. Three.js (MIT) and chess.js (BSD-2-Clause) are loaded via CDN; see their upstream repositories for licenses.
