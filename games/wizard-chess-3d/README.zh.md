[![中文](https://img.shields.io/badge/%E4%B8%AD%E6%96%87-c48a3a?style=for-the-badge)](./README.zh.md)
[![English](https://img.shields.io/badge/English-5c5348?style=for-the-badge)](./README.md)

# 巫师棋 · 3D

这是游戏馆里的哥特圣殿巫师棋。规则层仍是 `chess.js`，场景和棋子是原创程序化雕塑，不包含参考站的专有模型或贴图。

仓库：`KwanWaiPang/GameAgent`，路径 `games/wizard-chess-3d/`。

## 画面

- 六种人物棋子：持盾长枪兵、骑马骑士、重甲战锤守卫、持魔杖与魔法书的教士、戴冠女术士、披风持剑国王
- 装备：盔甲、肩甲、长靴、面部、盾牌纹章、剑 / 锤 / 法杖、披风、皇冠、底座符文
- 哥特教堂：尖拱、石柱、彩窗、吊灯、横幅、尘埃、火炬
- 大理石棋格、符文刻纹、阵营灯光
- 移动、摆臂、挥击、受击、碎裂和电影化镜头

## 玩法

- `chess.js`：王车易位、吃过路兵、升变、将军、将死、和棋
- 三档 AI、本地双人、AI 自动演示；换边、悔棋、提示、四种镜头、音效
- 点击人物或棋格走棋，拖动旋转，滚轮缩放

## 部署

纯静态页，无需 npm 或 Vite。Pages 地址：

https://kwanwaipang.github.io/GameAgent/games/wizard-chess-3d/

运行时从 CDN 加载，因此游玩需要联网：

- Three.js 0.160.1
- OrbitControls
- chess.js 1.4.0

## 限制

这是程序雕塑，不是从 Blender 导出的高精度骨骼模型。获得有授权的 GLB / GLTF 后，可以替换 `createPiece()` 并保留规则层。
