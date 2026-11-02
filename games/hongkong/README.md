[![中文](https://img.shields.io/badge/%E4%B8%AD%E6%96%87-5c5348?style=for-the-badge)](./README.zh.md)
[![English](https://img.shields.io/badge/English-c48a3a?style=for-the-badge)](./README.md)

# Hong Kong Roam

Adapted from [Mr.doob's Slop New York](https://github.com/mrdoob/slop-newyork). The code license is this folder's [LICENSE](./LICENSE) (MIT, copyright Mr.doob). Geographic data remains NYC Open Data and OpenStreetMap (ODbL).

The hub lists it under City.

## Play

Static page, no build. Needs a WebGPU browser and a network connection to load Three.js.

https://kwanwaipang.github.io/GameAgent/games/hongkong/

Open it through a local HTTP server or GitHub Pages, not `file://`.

## What changed

Lighting, traffic, pedestrians, cameras, and post-processing stay with the source. The city identity changed:

- Chinese interface, with a link back to the hub
- Streets, districts, water, and bridges use Hong Kong names
- The taxi is a red urban taxi; green cabs stay as New Territories taxis
- Speed is km/h and altitude is metres

The street grid, shoreline, and building footprints are still the original simulation, not a Lands Department survey of Hong Kong.

## Controls

| Key | Action |
|---|---|
| 1 / 2 / 3 / 4 | Walk, taxi, bicycle, helicopter |
| W A S D | Move or steer |
| Space | Jump, or climb in the helicopter |
| V | Cycle cameras |
| M | Street map |
| H | Hide the HUD |
| N | Sound |
