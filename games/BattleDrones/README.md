[![中文](https://img.shields.io/badge/%E4%B8%AD%E6%96%87-5c5348?style=for-the-badge)](./README.zh.md)
[![English](https://img.shields.io/badge/English-c48a3a?style=for-the-badge)](./README.md)

# Battle Drones

Single-player real-time strategy in the Game Hub. Two armies of flying and ground drones mine scrap, build a base, and fight for the map.

The simulation, AI commanders, maps, art, sound, operations, and survival mode come from [simonw/battledrones](https://github.com/simonw/battledrones) (Apache-2.0), upstream revision `ca4f13b36013e1980289046e731a295d2bf02a3e`. This copy removes multiplayer: online duels, the four-player lobby, the audio link, and the relay. The splash screen links back to the hub.

It sits in the hub's shooter row, in its own folder beside the three first-person shooters.

## Modes

- **Skirmish:** mine scrap, build a swarm, destroy the enemy HQ and its Goliaths. The other commander is AI.
- **Last Stand:** hold the base against endless themed waves.
- **Operations:** short missions, up to three stars each.

`vehicles.html` and `models.html` are reference pages. `record-viewer.html` reads battle records. Showcase records stay in `battles/showcase/`.

## Development

Use Node.js 24, the same major version as the Pages workflow.

```bash
cd games/BattleDrones
npm ci
npm run dev
```

Vite serves `index.html` on port 5173. `npm run build` type-checks and writes `dist/`. GitHub Actions publishes `dist/` together with `LICENSE` and `NOTICE`. The repository does not commit `dist/`.

## License

Apache-2.0. See [LICENSE](./LICENSE) and [NOTICE](./NOTICE). The MIT text at the repository root does not relicense this folder.
