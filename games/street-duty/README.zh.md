[![中文](https://img.shields.io/badge/%E4%B8%AD%E6%96%87-c48a3a?style=for-the-badge)](./README.zh.md)
[![English](https://img.shields.io/badge/English-5c5348?style=for-the-badge)](./README.md)

# 街战突击

游戏馆中的完整程序化第一人称街战。不是外链或 iframe，而是参照 [mshumer/Claude-of-Duty](https://github.com/mshumer/Claude-of-Duty)（MIT）在本仓库本地落地的可玩实现。

与 [`games/fps/`](../fps/)（战术突击）并存，互不替换。

| | |
|---|---|
| 在线 | https://kwanwaipang.github.io/GameAgent/games/street-duty/ |
| 画质 | `?q=low\|medium\|high\|ultra`。弱设备默认 `low`，一般桌面默认 `medium`。高和超清要手动指定 |
| 预热 | `?prewarm=0` 跳过，`?prewarm=1` 强制。只有 `ultra` 默认预热（着色器编译大约 20 秒） |

馆级架构见 [ARCHITECTURE.zh.md](../../ARCHITECTURE.zh.md)。

## 玩法

- 加载完成后点击进入街区，锁定鼠标。
- 开局 2 名队友在街头；敌人在街尾（大约 40–58 米），驻军更远。
- 队友之间没有友伤（子弹和手雷都不互伤）；敌人仍会打中队友。
- 玩家阵亡后 10 秒复活，回到出生点。界面有倒计时。
- 双方挨打时会找掩体，小队交替压制和包抄。低画质人更少，但判断更集中。
- 存活敌人过少时，导演会一个一个补兵，避免同一帧刷出一整波。

## 操作

| 键 | 作用 |
|---|---|
| WASD | 移动 |
| 鼠标 | 瞄准 |
| 左键 | 射击 |
| 右键 | 开镜 |
| R | 换弹 |
| Shift | 冲刺 |
| Z | 按住下蹲 |
| Ctrl / C | 趴下 |
| Q / E | 按住探头 |
| 空格 | 跳跃 |
| G | 手雷 |
| Esc | 暂停 / 释放鼠标 |

## 本地开发

```bash
cd games/street-duty
npm install
npm run dev
```

开发用 `index.source.html`。根目录的 `index.html` 是 Pages 产物入口，不是热更新入口。

## 构建与部署

```bash
npm run build
```

会覆盖 `index.html` 和 `assets/index.source-*.js`。这两样必须提交到 `main`，尤其是 Pages 直接从分支根目录提供文件时。Actions 发布前也会再构建一次。

发布前可以自检：

```bash
grep -q './assets/' index.html
ls assets/*.js
```

## 画质

| 场景 | 建议 |
|---|---|
| 笔记本集显 | `?q=low` 或 `medium` |
| 看流畅度 | `?q=low&prewarm=0` |
| 截图或演示录制 | `?capture=1&lockstep=1`（给工具用，不是日常游玩） |

画质按设备探测。弱设备不再默认 `ultra`，以免黑屏卡住。

## 相关文档

| 文档 | 说明 |
|---|---|
| [README.md](./README.md) | 英文说明 |
| [ARCHITECTURE.zh.md](./ARCHITECTURE.zh.md) | 引擎合同中文 |
| [../../ARCHITECTURE.zh.md](../../ARCHITECTURE.zh.md) | 游戏馆架构 |
| [LICENSE](./LICENSE) | MIT |

子系统：`render` · `materials` · `sky` · `world` · `physics` · `player` · `weapons` · `fx` · `ai` · `ui` · `audio`。
