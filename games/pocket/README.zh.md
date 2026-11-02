[![中文](https://img.shields.io/badge/%E4%B8%AD%E6%96%87-c48a3a?style=for-the-badge)](./README.zh.md)
[![English](https://img.shields.io/badge/English-5c5348?style=for-the-badge)](./README.md)

# 口袋冒险

游戏馆中的第一人称 3D 卡通粉丝向开局。浏览器本地可玩，可部署到 GitHub Pages。

视觉与引擎架构参考 [PauliusOS/pallet-town-3d](https://github.com/PauliusOS/pallet-town-3d)（MIT）：Three.js、程序化建模与贴图。对战和图鉴另有粉丝向 GLB，见 `public/models/`。

| | |
|---|---|
| 在线 | https://kwanwaipang.github.io/GameAgent/games/pocket/ |
| 操作 | 点击锁定鼠标 · WASD 移动 · Shift 跑 · 空格跳 · 鼠标视角 · **E** 互动 · **B** 图鉴 · **Esc** 暂停并返回游戏馆 |
| 画质 | URL `?q=low\|medium\|high\|ultra`（默认按设备选择；低档会明显加快草木建造） |

## 游玩

1. 在真新镇门口起步，顺着小路前往大木研究所
2. 桌上三个精灵球：按 E 预览，再按 E 确认御三家
3. 走出屋外，踏入高草可触发野生对战
4. 沿道路继续，穿过常青石门进入常青森林
5. 走出森林到达常青市：精灵中心回复、便利店对话、挑战常青道馆
6. 按 **B** 打开图鉴。未目击为剪影。没有上游 3D 的编号回退到 2D 立绘
7. 进度自动保存在浏览器 `localStorage`。标题屏可继续旅程或重新开始

## 开发

```bash
cd games/pocket
npm ci
npm run dev      # http://127.0.0.1:5174
npm run build    # 产出 dist/ 并同步到 index.html + assets/
npm run check
npm test
```

刷新全量 GLB 镜像：`node tools/download-pokemon-glbs.mjs`（详见 `public/models/pokemon/README.md`）。

## 版权说明

- 本页为非官方粉丝向作品，与任天堂 / Creatures / Game Freak 无关。
- 宝可梦及官方译名为权利方商标。程序化场景与合成音效为本仓原创或改编。
- 3D 引擎与美术管线大量借鉴 `pallet-town-3d`（MIT，Copyright Paulius）。GLB 与立绘权利归权利方，仅作粉丝向展示。详见 `LICENSE` 与上游仓库。

## 后续

当前可玩范围为真新镇开局，以及沿土路南下的常青森林、常青市和道馆。更远的城镇将沿同一程序化管线继续增加。
