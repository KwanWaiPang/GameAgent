[![中文](https://img.shields.io/badge/%E4%B8%AD%E6%96%87-5c5348?style=for-the-badge)](./README.md)
[![English](https://img.shields.io/badge/English-c48a3a?style=for-the-badge)](./README.en.md)

# Red Cap Quest

A browser platformer in the hub Adventure section: [`games/redcap/`](./).

The feel follows the NES Super Mario Bros.: a one-way camera, a black world/lives screen, a two-line HUD, variable run and jump, bumping bricks, stomp combos, and flagpole height plus time bonus. The pixels and the eight stages are an original tribute. This is not a Nintendo product and it does not copy official sprites or the original levels.

License: MIT, see [`LICENSE`](../../LICENSE) at the repository root.

The hero is “Azhuan”. Worlds: green hills, a brick cave, a cloud run, a stone castle, a frost field, a water course, a night forest, and a lava keep.

## Controls

| Key / touch | Action |
|---|---|
| ← → / A D · two circles, lower left | Move |
| Z / Space / K / ↑ · large circle, lower right | Jump |
| X / J / Shift · small circle beside it | Sprint; breathe fire with the fire cap |
| P / Esc · upper right | Pause |

## Run

Static ES modules, no build:

```bash
python -m http.server 8080
# open http://localhost:8080/games/redcap/
```
