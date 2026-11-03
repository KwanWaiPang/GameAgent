[![中文](https://img.shields.io/badge/%E4%B8%AD%E6%96%87-5c5348?style=for-the-badge)](./README.zh.md)
[![English](https://img.shields.io/badge/English-c48a3a?style=for-the-badge)](./README.md)

# Hong Kong Roam

Adapted from [Mr.doob's Slop New York](https://github.com/mrdoob/slop-newyork), with the Hong Kong street city from [keithligh/slop-hongkong](https://github.com/keithligh/slop-hongkong). The code license is this folder's [LICENSE](./LICENSE): MIT for Mr.doob, the slop-hongkong authors, and Kwan Wai-Pang's hub adaptation. OpenStreetMap data stays under the ODbL and is not MIT.

The hub lists it under City.

## Play

Static page, no build. Needs a WebGPU browser and a network connection to load Three.js.

https://kwanwaipang.github.io/GameAgent/games/hongkong/

Open it through a local HTTP server or GitHub Pages, not `file://`.

## What changed

This is the street-level Hong Kong port of [Slop New York](https://github.com/mrdoob/slop-newyork), using the city data from [keithligh/slop-hongkong](https://github.com/keithligh/slop-hongkong) (MIT). Walking, driving, cycling, and flying stay, along with traffic, pedestrians, and buildings.

The playable coast is Hong Kong Island, Kowloon, and Victoria Harbour, with the origin at Central. Central keeps its sheet meshes. Wan Chai, Causeway Bay, North Point, Tsim Sha Tsui, Yau Ma Tei, Mong Kok, and West Kowloon extrude Lands Department footprints. The clock tower, Peak Tower terrace, convention-centre wing, Central Plaza crown, HSBC truss, and Lippo pods sit on those real anchors. The New Territories and outlying islands are not in this street map. Press F beside a landmark to read it, cross the harbour from a Star Ferry pier, or ride the Peak Tram from Garden Road.

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
| F | Read a landmark, board the Star Ferry, or ride the Peak Tram |
