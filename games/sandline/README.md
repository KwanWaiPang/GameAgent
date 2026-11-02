# Sandline

A single-player tactical shooter in the game hall. Rules, bots, weapon numbers, and the desert and snow arenas are adapted from [sandline-threejs-fps](https://github.com/xilinnihao-afk/sandline-threejs-fps) (MIT). Soldiers, view models, the interface, and sound are procedural and original to this hall.

Counter-Strike maps, characters, and gun models are not included. Demolition, hostage rescue, and bounty rounds are played on the original desert and snow arenas instead of Dust2, Assault, or Bloodstrike.

This game does not replace [`games/fps/`](../fps/) or [`games/street-duty/`](../street-duty/).

## Modes

Deathmatch, knife, pistol, arms race, defense, demolition, hostage rescue, and bounty. Team size runs from 3v3 to 10v10. You always play blue.

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
