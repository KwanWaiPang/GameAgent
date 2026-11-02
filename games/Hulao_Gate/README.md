# 乱世无双 · 虎牢关 / Hulao Gate

原创 Three.js 第三人称 3D 动作游戏，灵感来自《三国演义》中的虎牢关传说。**非商业《真·三国无双》游戏的复制品，也未使用其商标、美术、模型、音乐或素材。**

## 在线部署 / 直接访问

本目录完全静态，不需要 npm、Vite、服务端或编译。推送到 `KwanWaiPang/GameAgent` 的 `main` 后，仓库现有 `.github/workflows/pages.yml` 会把 `games/Hulao_Gate/` 发布到 GitHub Pages，入口是：

`https://kwanwaipang.github.io/GameAgent/games/Hulao_Gate/`

也可打开 `.../games/Hulao_Gate/index.html`。HTML 使用 jsDelivr 上的 Three.js 0.160.1 ES 模块，因此**首次加载需要联网**；建议通过 GitHub Pages 或本地 HTTP 服务访问（`python -m http.server 8000`），而非 `file://`。

## 操作

| 操作 | PC | 手机/平板 |
|---|---|---|
| 移动 | WASD / 方向键 | 左下摇杆 |
| 调整镜头 | 鼠标左键按住拖动 | 右侧区域滑动 |
| 连斩 | J / 鼠标左键点击 | 斩 |
| 重击 | K / 鼠标右键点击 | 重 |
| 无双技 | Q（消耗 50 无双槽） | 无双 |
| 闪避 | Space | 闪 |
| 奔跑 | Shift | — |
| 暂停 | Esc | 右上角暂停 |
| 镜头距离 | 鼠标滚轮 | 固定 |

## 游戏内容

- 可操作武将关羽：步行、奔跑、闪避无敌时间、三段轻连击、重击、范围无双
- 三阶段虎牢关战役；普通士卒、精锐士卒、吕布 Boss
- 敌军简单追踪、间隔出击、攻击前摇、受击硬直与击退、倒地退场
- 写实风格原创武将：层叠甲片、铆钉、皮革、织物纹理、可见面部特征、立体披风与青龙偃月刀／方天画戟；程序化城墙砌石、木纹、营帐、战旗、碎石、车辙、植被与远山
- 第三人称跟随镜头、鼠标拖动环视、命中反馈、血量/无双/击破/小地图、重开与暂停
- 自适应轻量模式：触屏与低线程数设备限制敌人同时在场数量、关闭动态阴影

## 项目结构

```
index.html   游戏 UI 与 Three.js Import Map
style.css    HUD、菜单与触屏操作
game.js     场景生成、AI、战斗、相机与主循环
warrior-model.js      独立原创武将精细建模
battlefield-detail.js 原创程序化纹理与战场细节
```

## 调试

在本目录运行：

```bash
python -m http.server 8000
# 浏览器访问 http://localhost:8000/
node --check game.js
node --check warrior-model.js
node --check battlefield-detail.js
```

查询参数 `?q=low` 可强制降低画质。浏览器调试时可查看 `window.__HULAO_READY__` 和 `window.__HULAO_STATE__()`。

## 已知限制与后续提升

本版本是轻量 WebGL 玩法原型，已采用**原创程序化分层武将、写实调色、PBR 金属与布料材质及密集战场细节**，但不等于影视级写实人体：仍缺少精细扫描脸部、独立 3D 美术角色的骨骼动画和动作捕捉、PBR 扫描环境素材；音效使用简单的 Web Audio 合成音。若要进一步逼近写实的无双游戏，建议后续接入拥有再分发许可的 glTF/GLB 人物与动作资源、可打断的动作状态机、动作驱动命中判定、物理碰撞、地形导航、LOD/Instancing 和粒子后处理，注意移动端预算。

第三方依赖：Three.js 0.160.1（MIT），通过 jsDelivr CDN 引入。其他模型、几何与贴图均在运行时生成，未包含第三方游戏版权资产。

## 第二版画质与性能

- 默认桌面使用电影感低机位、较窄 FOV、动态阴影、层次化的装甲与纹理；移动端自动使用轻量草地与岩石实例。
- 本版本不接入第三方商业三国游戏模型或原作素材。原创角色基于东汉军阵美术意象，主要通过 Three.js 几何体与程序化贴图生成。
- 这是一轮明显提升原创程序化美术观感的迭代，**仍非商业游戏精度**。如需接近现代《真·三国无双》的真人写实程度，应另行提供具备使用与再分发权的高精度 GLB 人物、PBR 贴图与动作包。
- URL `?q=low` 强制低画质，用于手机或性能较低电脑。