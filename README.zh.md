[![中文](https://img.shields.io/badge/%E4%B8%AD%E6%96%87-c48a3a?style=for-the-badge)](./README.zh.md)
[![English](https://img.shields.io/badge/English-5c5348?style=for-the-badge)](./README.md)

# 游戏馆

中文网页游戏集合：棋类、巫师棋、大富翁、三款 3D 射击、口袋冒险与红帽奇遇。统一大厅入口，纯前端运行，可部署到 GitHub Pages。

**在线地址：** https://kwanwaipang.github.io/GameAgent/

更完整的架构说明见 [ARCHITECTURE.zh.md](./ARCHITECTURE.zh.md)。

---

## 馆内游戏

| 路径 | 名称 | 类型 |
|---|---|---|
| [`games/go/`](./games/go/) | 围棋 | 棋类 |
| [`games/xiangqi/`](./games/xiangqi/) | 中国象棋 | 棋类 |
| [`games/3D_xiangqi/`](./games/3D_xiangqi/) | 中国象棋 · 3D | 3D 棋类（楚河汉界） |
| [`games/gomoku/`](./games/gomoku/) | 五子棋 | 棋类 |
| [`games/junqi/`](./games/junqi/) | 军棋 | 棋类 |
| [`games/chess3d/`](./games/chess3d/) | 国际象棋 · 3D | 3D 棋类 |
| [`games/wizard-chess-3d/`](./games/wizard-chess-3d/) | 巫师棋 · 3D | 3D 棋类（哥特圣殿） |
| [`games/wizard-chess-sanctum/`](./games/wizard-chess-sanctum/) | 巫师棋 2 | 3D 棋类（圣殿） |
| [`games/monopoly/`](./games/monopoly/) | 大富翁 · 世界之旅 | 桌游 |
| [`games/richera/`](./games/richera/) | 金城纪 | 桌游（3D 街市沙盘） |
| [`games/fps/`](./games/fps/) | 战术突击 · 3D | 3D FPS（红蓝对抗） |
| [`games/street-duty/`](./games/street-duty/) | 街战突击 | 3D FPS（全程序化街战） |
| [`games/sandline/`](./games/sandline/) | 沙线行动 | 3D FPS（战术回合） |
| [`games/pocket/`](./games/pocket/) | 口袋冒险 | 第一人称 3D 卡通粉丝向开局 |
| [`games/redcap/`](./games/redcap/) | 红帽奇遇 | 网页平台跳跃（马里奥式致敬） |

- **巫师棋**（`wizard-chess-3d`）：哥特圣殿中的程序化石甲棋子；`chess.js` 规则，人机 / 本地双人 / 自动演示。运行时从 CDN 加载 Three.js 与 chess.js。
- **巫师棋 2**（`wizard-chess-sanctum`）：另一座圣殿式巫师棋，同样使用国际象棋规则。
- **中国象棋 · 3D**（`3D_xiangqi`）：楚河汉界立体沙盘，可接管红方或观看 AI 对弈。
- **战术突击**（`fps`）：红蓝各约 5 人、据点 / 大逃杀、可拾取武器。
- **街战突击**（`street-duty`）：Claude-of-Duty 本地完整落地；玩家 + 2 队友 + 动态敌方波次。三款射击互不替换。
- **沙线行动**（`sandline`）：改写自 sandline-threejs-fps 的单机战术射击。沙漠旧城与雪地竞技场，八种模式。人物和枪是程序化的，不含 Counter-Strike 地图或模型。
- **口袋冒险**（`pocket`）：第一人称 3D 卡通真新镇开局；选御三家、高草遇敌。
- **金城纪**（`richera`）：三维街市沙盘。单骰买地盖楼、道具和神仙。原创地名，致敬富翁类棋，不是商业作品复刻。
- **红帽奇遇**（`redcap`）：八关原创程序像素。玩法向超级马里奥致敬，不是任天堂产品，未使用官方素材或关卡。

---

## 仓库结构

```
index.html                 # 大厅入口
ARCHITECTURE.md            # Architecture (English)
ARCHITECTURE.zh.md         # 项目架构（中文）
THIRD_PARTY_NOTICES.md     # Third-party notices (English)
THIRD_PARTY_NOTICES.zh.md  # 第三方许可（中文）
css/                       # 大厅与共用样式
assets/                    # 共用静态资源
games/<name>/              # 各游戏独立目录
.github/workflows/pages.yml
```

约定：

1. 大厅是 Three.js 圆形展厅，并保留卡片列表；每个游戏自包含入口 `games/<name>/index.html`。
2. 多数游戏是纯静态页面，无需构建。
3. **街战突击 / 沙线行动 / 口袋冒险例外**：Vite 构建产物提交为 `index.html` + `assets/`（Pages 从仓库根目录部署）。

---

## 本地预览

### 静态馆（棋类 / 巫师棋 / 大富翁 / 战术突击 / 红帽奇遇）

```bash
python -m http.server 8080
# 打开 http://localhost:8080
```

### 街战突击 / 沙线行动 / 口袋冒险开发

```bash
cd games/street-duty && npm ci && npm run dev   # :5173
cd games/sandline && npm ci && npm run dev      # :5191
cd games/pocket && npm ci && npm run dev        # :5174
```

生产构建（同步到 Pages 用的 `index.html` + `assets/`）：

```bash
cd games/street-duty && npm run build
cd games/sandline && npm run build
cd games/pocket && npm run build
```

详情：[街战突击](./games/street-duty/README.zh.md) · [沙线行动](./games/sandline/README.zh.md) · [口袋冒险](./games/pocket/README.zh.md)

---

## 部署

工作流 [`.github/workflows/pages.yml`](./.github/workflows/pages.yml) 在推送 `main` 时：

1. `npm ci && npm run build`（`games/street-duty`、`games/sandline` 与 `games/pocket`）
2. 打包静态站（去掉各游戏的 `src/` / `tools/` 等开发文件）
3. 发布到 GitHub Pages

推荐：Settings → Pages → Source 选 **GitHub Actions**。

若仍用从 `main` 根目录部署的旧方式，务必把 Vite 构建产物提交进仓库，否则线上会缺 `assets/`。

---

## 文档索引

| 文档 | 内容 |
|---|---|
| [ARCHITECTURE.zh.md](./ARCHITECTURE.zh.md) | 馆级架构、数据流、射击游戏边界 |
| [THIRD_PARTY_NOTICES.zh.md](./THIRD_PARTY_NOTICES.zh.md) | 第三方来源与许可 |
| [games/street-duty/ARCHITECTURE.zh.md](./games/street-duty/ARCHITECTURE.zh.md) | 街战引擎合同 |
| [games/street-duty/README.zh.md](./games/street-duty/README.zh.md) | 街战说明 |
| [games/fps/README.zh.md](./games/fps/README.zh.md) | 战术突击说明 |
| [games/sandline/README.zh.md](./games/sandline/README.zh.md) | 沙线行动说明 |
| [games/pocket/README.zh.md](./games/pocket/README.zh.md) | 口袋冒险说明 |
| [games/richera/README.zh.md](./games/richera/README.zh.md) | 金城纪说明 |
| [games/redcap/README.zh.md](./games/redcap/README.zh.md) | 红帽奇遇说明 |
| [games/wizard-chess-3d/README.zh.md](./games/wizard-chess-3d/README.zh.md) | 巫师棋说明 |

每份说明页顶都有「中文 / English」按钮，点一下即切换到另一语言的同名文档。

---

## 版权与许可

版权所有 (C) 2026 Kwan Wai-Pang。

大厅和原创游戏的版权归 Kwan Wai-Pang。开源是他给出的使用许可，不是把版权让出去。根目录 [LICENSE](./LICENSE) 的 MIT 许可允许他人使用、复制、修改和再分发这些代码，但必须保留版权声明和 MIT 文本。

这份许可覆盖大厅（`index.html`、`css/`、`js/hub-lobby.js`），以及围棋、五子棋、军棋、战术突击、红帽奇遇、巫师棋、巫师棋 2、中国象棋 · 3D、金城纪、虎牢关。虎牢关在仓库里，大厅卡片尚未挂出。

别人写的游戏，版权仍归原作者。根目录的 MIT 文本不能改掉他们的许可证：

| 游戏 | 仍有效的版权 | 许可证 |
|---|---|---|
| 中国象棋 | liwei | MIT |
| 大富翁 · 世界之旅 | Human Sean；馆内改编为 Kwan Wai-Pang | ISC |
| 街战突击 | mshumer；馆内改编为 Kwan Wai-Pang | MIT |
| 口袋冒险 | Paulius；馆内改编为 Kwan Wai-Pang | MIT |
| 沙线行动 | sandline-threejs-fps 的作者；馆内改编为 Kwan Wai-Pang | MIT |
| 国际象棋 · 3D | Chess3D 的作者 | GPL-3.0 |

Three.js、chess.js，以及金城纪使用的 Kenney CC0 素材，各自保留原许可。完整名单见 [THIRD_PARTY_NOTICES.zh.md](./THIRD_PARTY_NOTICES.zh.md)。
