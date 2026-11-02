[![中文](https://img.shields.io/badge/%E4%B8%AD%E6%96%87-5c5348?style=for-the-badge)](./README.zh.md)
[![English](https://img.shields.io/badge/English-c48a3a?style=for-the-badge)](./README.md)

# Pocket Adventure

A first-person cartoon fan opening inside the Game Hub. It plays in the browser and can be deployed to GitHub Pages.

Look and engine structure follow [PauliusOS/pallet-town-3d](https://github.com/PauliusOS/pallet-town-3d) (MIT): Three.js and procedural models and textures. Battles and the dex also use fan-made GLBs; see `public/models/`.

| | |
|---|---|
| Live | https://kwanwaipang.github.io/GameAgent/games/pocket/ |
| Controls | Click to lock the mouse · WASD move · Shift run · Space jump · mouse look · **E** interact · **B** dex · **Esc** pause and return to the hub |
| Quality | `?q=low\|medium\|high\|ultra` (chosen from the device by default; low builds grass and trees much faster) |

## Play

1. Start at the edge of Pallet Town and follow the path to the lab
2. Three balls on the desk: E to preview, E again to confirm a starter
3. Outside, tall grass can start a wild battle
4. Continue along the road, through the gate, into the forest
5. Leave the forest for the next town: a center, a shop conversation, and a gym
6. Press **B** for the dex. Unseen entries are silhouettes. Numbers without an upstream 3D model fall back to a 2D portrait
7. Progress is stored in `localStorage`. The title screen can continue or start over

## Develop

```bash
cd games/pocket
npm ci
npm run dev      # http://127.0.0.1:5174
npm run build    # writes dist/ and syncs index.html + assets/
npm run check
npm test
```

Refresh the GLB mirror with `node tools/download-pokemon-glbs.mjs` (see `public/models/pokemon/README.md`).

## Copyright

- This page is an unofficial fan work and is not associated with Nintendo, Creatures, or Game Freak.
- Pokémon and the official names are trademarks of their owners. Procedural scenes and synthesized audio are original or adapted in this repository.
- The 3D engine and art pipeline draw heavily on `pallet-town-3d` (MIT, Copyright Paulius). GLB and portrait rights stay with their owners and are shown only as a fan work. See `LICENSE` and the upstream repository.

## Later

The playable slice is the Pallet opening plus the forest, town, and gym down the dirt road. Further towns will keep the same procedural pipeline.
