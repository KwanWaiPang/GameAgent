[![中文](https://img.shields.io/badge/%E4%B8%AD%E6%96%87-5c5348?style=for-the-badge)](./README.zh.md)
[![English](https://img.shields.io/badge/English-c48a3a?style=for-the-badge)](./README.md)

# Sandline

A single-player tactical shooter in the game hall. The client, interface, procedural guns, and desert and snow arenas come from [sandline-threejs-fps](https://github.com/xilinnihao-afk/sandline-threejs-fps) (MIT).

The public source does not include Counter-Strike maps, characters, classic arms, or audio. Without those files the original procedural guns and a procedural soldier still play the desert and snow. Dust2, Assault, and Bloodstrike report that the map failed to prepare. Place licensed files in `public/assets/` as described in the upstream `ASSETS.md` and those maps and models load as in the original.

This game does not replace [`games/fps/`](../fps/) or [`games/street-duty/`](../street-duty/).

## Modes

Desert and snow: deathmatch, knife, pistol, arms race, and defense. Team size runs from 3v3 to 10v10. You always play blue. Dust2 is demolition, Assault is hostage rescue, and Bloodstrike is bounty; those three maps need the upstream map pack.

## Controls

| Key | Action |
|---|---|
| WASD | Move |
| Shift / Space / C | Sprint / jump / toggle crouch |
| Left mouse | Fire |
| Right mouse | Aim, or stab with the knife |
| R / G / E | Reload / grenade / pickup, plant, defuse, hostages |
| 1–8 / wheel | Switch weapons |
| B | Buy menu, at spawn or between defense waves |
| Esc | Pause |

Landscape phones use the left stick and the buttons on the right.

`?map=snow&mode=deathmatch&play=1` starts a match directly.

## Development

```bash
cd games/sandline
npm ci
npm test
npm run dev
```

Dev entry is `index.source.html` on port 5191. `npm run build` writes `index.html` and `assets/` for GitHub Pages.
