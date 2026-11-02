[![中文](https://img.shields.io/badge/%E4%B8%AD%E6%96%87-c48a3a?style=for-the-badge)](./README.zh.md)
[![English](https://img.shields.io/badge/English-5c5348?style=for-the-badge)](./README.md)

# 大富翁 · 世界之旅

- 实体棋「世界之旅」式 **环线** 大富翁：世界城市买地、收租、升级，本地人机对战。
- 棋盘：Three.js 实体桌面。木桌、加厚地格、印刷地名、塑胶棋子与骰子，可旋转缩放

## 玩法

- 掷骰顺时针环行；路过起点领取 $2000
- 空地可购买，自家地可升级（小屋 → 别墅 → 酒店）
- 机会 / 命运、税收、车站飞航、监狱、阿尔卑斯度假
- 侧栏可配置起始金钱、玩家/电脑人数（合计 2–4）

## 目录

```
index.html
css/styles.css
js/data.js      # 棋盘与卡牌
js/engine.js    # 规则引擎
js/board3d.js   # 立体桌面
js/app.js       # 界面
LICENSE         # ISC
```

## 来源

玩法骨架参考 [HumanSean/javascript-monopoly](https://github.com/HumanSean/javascript-monopoly)（ISC）。
棋盘城市名单与馆内 UI 为原创配置。
