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
- 程序化城楼、营帐、烽火、战旗、山体、土地、兵甲与青龙偃月刀
- 第三人称跟随镜头、鼠标拖动环视、命中反馈、血量/无双/击破/小地图、重开与暂停
- 自适应轻量模式：触屏与低线程数设备限制敌人同时在场数量、关闭动态阴影

## 项目结构

```
index.html   游戏 UI 与 Three.js Import Map
style.css    HUD、菜单与触屏操作
 game.js     场景生成、角色、AI、战斗、相机与主循环
```

## 调试

在本目录运行：

```bash
python -m http.server 8000
# 浏览器访问 http://localhost:8000/
node --check game.js
```

查询参数 `?q=low` 可强制降低画质。浏览器调试时可查看 `window.__HULAO_READY__` 和 `window.__HULAO_STATE__()`。

## 已知限制与后续提升

本版本是轻量 WebGL 玩法原型，使用**原创程序化低多边形角色**，没有商业 3A 的骨骼动作捕捉、真实角色脸部或 PBR 扫描素材；音效使用简单的 Web Audio 合成音。若要进一步逼近写实的无双游戏，建议后续接入拥有再分发许可的 glTF/GLB 人物与动作资源、可打断的动作状态机、动作驱动命中判定、物理碰撞、地形导航、LOD/Instancing 和粒子后处理，注意移动端预算。

第三方依赖：Three.js 0.160.1（MIT），通过 jsDelivr CDN 引入。其他模型、几何与贴图均在运行时生成，未包含第三方游戏版权资产。