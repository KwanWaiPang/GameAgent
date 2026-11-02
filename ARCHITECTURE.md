[![中文](https://img.shields.io/badge/%E4%B8%AD%E6%96%87-c48a3a?style=for-the-badge)](./ARCHITECTURE.md)
[![English](https://img.shields.io/badge/English-5c5348?style=for-the-badge)](./ARCHITECTURE.en.md)

# 项目架构

本文说明「游戏馆」如何组织、部署，以及两款 3D 射击如何并存。

街战引擎合同见 [`games/street-duty/ARCHITECTURE.zh.md`](./games/street-duty/ARCHITECTURE.zh.md)。

---

## 1. 目标

| 目标 |
|---|
| 一个静态站点，多个可玩入口 |
| 大厅统一视觉与导航 |
| 游戏彼此独立，可单独打开 |
| 尽量零构建；重型游戏显式构建 |
| 可部署到 GitHub Pages |

---

## 2. 高层结构

```
                    ┌─────────────────────┐
                    │   index.html (大厅) │
                    └──────────┬──────────┘
                               │
        ┌──────────┬───────────┴──────┬────────────┬──────────┐
        ▼          ▼                  ▼            ▼          ▼
   games/go/…  games/fps/   games/street-duty/  games/pocket/  games/redcap/
   静态棋类       静态 FPS      Vite 构建 FPS      静态 3D 冒险   静态平台跳跃
```

| 层 | 职责 |
|---|---|
| **大厅**（`index.html`、`css/`、`js/hub-lobby.js`） | 品牌、Three.js 圆形展厅、卡片列表备用 |
| **游戏壳** | 各游戏自有 `index.html` / CSS / JS；可选「← 游戏馆」返回 |
| **共用资源**（`assets/`） | 少数跨游戏静态资源 |
| **CI / Pages**（`.github/workflows/`） | 构建街战与口袋冒险、打包 `_site`、部署 |

大厅只用 Three.js 搭导航展厅，不加载各游戏运行时。点开展台或列表卡片即整页跳转。没有 WebGL 时退回卡片列表。

---

## 3. 游戏分类

### 3.1 纯静态

`go` · `xiangqi` · `3D_xiangqi` · `gomoku` · `junqi` · `monopoly` · `chess3d` · `wizard-chess-3d` · `wizard-chess-sanctum` · `fps` · `pocket` · `redcap`

- 打开即玩，无需 `npm`。
- 可用任意静态服务器托管。

### 3.2 需要构建

目前只有 `street-duty` 与 `pocket` 走 Vite。街战的数据流：

```
src/  +  index.source.html   →  vite build  →  dist/
                                         ↓
                              sync-pages-build.mjs
                                         ↓
                         index.html  +  assets/*.js   （提交进仓库）
```

| 文件 | 用途 |
|---|---|
| `index.source.html` | Vite 开发 / 构建入口 |
| `index.html` + `assets/` | Pages 实际服务的产物 |
| `src/` | 源码 |
| `tools/` | 截图、性能、录制等本地工具 |

线上必须加载带哈希的 `assets/*.js`，不要把开发入口当成线上入口。

---

## 4. 两款 FPS 的边界

| | 战术突击 `games/fps/` | 街战突击 `games/street-duty/` |
|---|---|---|
| 定位 | 轻量红蓝街战 | 全程序化街战 |
| 技术 | Three r160，单页脚本 | Three r180，Vite 多子系统 |
| 阵营 | 红（玩家 + 约 4 队友）对蓝（约 5） | 玩家 `team 0` + 2 名盟友，对少量敌方波次 |
| 开局 | 选模式（据点 / 大逃杀） | 点击进入；突击波 + 队友 |
| 键位 | Q/E 探头，Z 下蹲，H 求助 | Q/E 探头，Z 下蹲；趴下 Ctrl/C |
| 部署 | 纯静态 | 需要构建产物 |

二者目录互不引用、互不替换。改一款时不要动另一款。

---

## 5. 街战运行时骨架

```
main.js
  ├─ 启动界面 / 画质 / 可选预热
  ├─ Engine（注册表 + 事件 + 输入 + 时间 + 随机）
  │    ├─ render · materials · sky · world
  │    ├─ physics · player · weapons · fx
  │    ├─ ai · ui · audio
  │    └─ playstart（队友、突击波、导演）
  └─ window.__ENGINE__ / __READY__
```

| 概念 | 说明 |
|---|---|
| **注册表** | 运行时用 `ctx.peek('ai')` 取子系统；禁止跨目录静态 import |
| **事件** | `weapon:fire`、`actor:death`、`damage:dealt` 等，见街战引擎合同 |
| **画质** | `?q=low\|medium\|high\|ultra`；弱设备默认偏低 |
| **截图 / 锁定步进** | `?capture=1&lockstep=1` 给工具用；正常游玩不走这条路径 |

---

## 6. 部署数据流

```
push main
   → Actions: npm ci && npm run build（街战与口袋冒险）
   → 把大厅和游戏复制进 _site/
   → 去掉街战的 src/、tools/、node_modules/ 等
   → GitHub Pages
```

若 Pages 仍从 `main` 根目录直接提供文件，仓库里的 `games/street-duty/index.html` 和 `assets/` 会被原样服务，所以构建产物必须在 `main` 上。

---

## 7. 开发约定

1. **新游戏**：在 `games/<slug>/` 自包含实现，并在根 `index.html` 加展台数据（卡片）。
2. **改街战**：改 `src/` → `npm run build` → 提交同步后的 `index.html` 和 `assets/`。
3. **不要**把 `games/fps/` 与 `games/street-duty/` 混改或互相覆盖。
4. 第三方来源与许可变更时，同步 [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md) 与 [英文版](./THIRD_PARTY_NOTICES.en.md)。
5. 馆级说明放根目录，中英各一份；街战引擎合同放在 `games/street-duty/`。

---

## 8. 相关链接

- 大厅说明：[README.md](./README.md)
- 街战中文说明：[games/street-duty/README.zh.md](./games/street-duty/README.zh.md)
- 街战引擎合同：[games/street-duty/ARCHITECTURE.zh.md](./games/street-duty/ARCHITECTURE.zh.md)
- 战术突击：[games/fps/README.md](./games/fps/README.md)
- 口袋冒险：[games/pocket/README.md](./games/pocket/README.md)
- 红帽奇遇：[games/redcap/README.md](./games/redcap/README.md)
- 上游街战项目：[mshumer/Claude-of-Duty](https://github.com/mshumer/Claude-of-Duty)
