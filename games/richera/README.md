[![中文](https://img.shields.io/badge/%E4%B8%AD%E6%96%87-5c5348?style=for-the-badge)](./README.zh.md)
[![English](https://img.shields.io/badge/English-c48a3a?style=for-the-badge)](./README.md)

# Gold City Chronicle

A 3D street-market board. The loop follows classic Chinese richman play: one die, buying land, raising buildings, tools, a bank, and visiting gods.

Place names, people, cards, and the board are original. This is not a commercial richman product's map, cast, or script.

## Play

- One die. Passing the city gate pays a salary, and deposits earn interest
- Buy empty lots and build a hut, a house, then a tower. Owning a whole district raises its rent
- Roadblocks, mines, time bombs, a chosen die, reversals, and a few other tools
- The shrine can send wealth, poverty, fortune, or bad luck
- By default the market closes after 12 days and the richest estate wins

## Files

```
index.html
css/styles.css
js/data.js
js/engine.js
js/engine.test.js
js/board3d.js     # Three.js table
js/app.js
```

Three.js r180 loads from jsDelivr at runtime.
