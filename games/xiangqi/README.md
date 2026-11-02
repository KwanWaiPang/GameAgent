[![中文](https://img.shields.io/badge/%E4%B8%AD%E6%96%87-5c5348?style=for-the-badge)](./README.zh.md)
[![English](https://img.shields.io/badge/English-c48a3a?style=for-the-badge)](./README.md)

# Chinese Chess

A browser Xiangqi, adapted from the open-source “Chinese Chess in HTML5” and fitted with the hub shell.

## Features

- Human vs computer (beginner / normal / deeper search)
- Endgame challenges
- Undo, restart, and piece skins
- Move and selection sounds

## Layout

```
index.html
css/          # original styles plus the hub shell
js/           # rules, AI, openings, endgames
img/          # board and piece skins
audio/
LICENSE       # MIT
```

## Run

```bash
python -m http.server 8080
```

Open <http://localhost:8080/games/xiangqi/>.

## Source

Based on [KwanWaiPang/Chess · Chinese_Chess](https://github.com/KwanWaiPang/Chess/tree/master/Chinese_Chess) (original author 一叶孤舟 / itlwei, MIT). See `THIRD_PARTY_NOTICES.md` at the repository root.
