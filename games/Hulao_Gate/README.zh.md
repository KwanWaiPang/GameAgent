[![中文](https://img.shields.io/badge/%E4%B8%AD%E6%96%87-c48a3a?style=for-the-badge)](./README.zh.md)
[![English](https://img.shields.io/badge/English-5c5348?style=for-the-badge)](./README.md)

# 虎牢关

版权所有 (C) 2026 Kwan Wai-Pang。本目录原创代码适用仓库根目录 MIT 许可（[`LICENSE`](../../LICENSE)）。

原创 Three.js 第三人称动作游戏，取材《三国演义》的虎牢关传说。不是商业无双游戏的复制品，也未使用其商标、美术、模型、音乐或素材。已挂在游戏馆「动作」分类。

## 访问

本目录是静态页，不需要 npm 或 Vite。推送到 `KwanWaiPang/GameAgent` 的 `main` 后，Pages 地址是：

https://kwanwaipang.github.io/GameAgent/games/Hulao_Gate/

Three.js 0.160.1 从 jsDelivr 加载，首次打开需要联网。请用 GitHub Pages 或本地 HTTP 服务，不要用 `file://`。

## 操作

| 操作 | 电脑 | 手机或平板 |
|---|---|---|
| 移动 | WASD / 方向键 | 左下摇杆 |
| 调整镜头 | 按住鼠标左键拖动 | 右侧区域滑动 |
| 连斩 | J / 单击鼠标左键 | 斩 |
| 重击 | K / 单击鼠标右键 | 重 |
| 无双技 | Q（消耗 50 无双槽） | 无双 |
| 闪避 | 空格 | 闪 |
| 奔跑 | Shift | — |
| 暂停 | Esc | 右上角暂停 |
| 镜头距离 | 滚轮 | 固定 |

## 内容

- 可操作关羽：步行、奔跑、闪避无敌、三段轻击、重击、范围无双
- 三阶段虎牢关：普通士卒、精锐士卒、吕布
- 敌军会追踪、间隔出击，攻击有前摇，受击会硬直、击退，倒地后离场
- 写实向程序化战场：甲片武将、青龙偃月刀、方天画戟、夯土关城、瓦顶、松林、营帐与战旗。光照是暮色直射光、天空环境反射和尘霾，不再用圆球拼出的卡通人体
- 第三人称跟随、命中反馈、血量、无双槽、击破数、小地图
- 触屏和低线程设备会限制同时在场的敌人数，并关闭动态阴影

## 文件

```
index.html
style.css
game.js
warrior-model.js
battlefield-detail.js
procedural-maps.js
```

## 本地检查

```bash
python -m http.server 8000
node --check game.js
node --check warrior-model.js
node --check battlefield-detail.js
node --check procedural-maps.js
node --check combat-effects.js
node --check camera-physics.js
node --test camera-physics.test.mjs
```

`?q=low` 强制低画质。调试时可查看 `window.__HULAO_READY__` 和 `window.__HULAO_STATE__()`。

## 限制

这是轻量 WebGL 原型。人物和场景是程序化的，不是扫描人体或动作捕捉。音效是 Web Audio 合成。Three.js（MIT）经 CDN 引入；没有第三方游戏的模型或贴图。


## 写实动作游戏升级路线

当前独立开发分支完成第一轮性能与镜头基础升级：战斗火花使用单个 `InstancedMesh` 批量渲染（高画质最多 192 个、低画质最多 72 个），刀光对象和对应几何体循环复用，重开游戏清空特效而无需重复 GPU 资源分配；镜头会避开战场边界及营帐简化碰撞体。原有键位与游戏流程不变。

下一步建议引入**具有明确再分发授权**的三国题材 GLB/glTF 角色、独立动画剪辑，以及按角色类型配置的骨骼动画状态机。现有程序化模型继续作为资源加载失败时的后备方案，避免破坏静态站点的可玩性。

> 本阶段未引入第三方角色资产；尚需真实浏览器 FPS、GPU draw calls 和多设备操作测试。


## 第二阶段：骨骼角色与动作系统

新增 `character-assets.js` 和 `assets/characters/manifest.json`，按 `hero / boss / soldier / elite` 分别加载经授权的 GLB 人物，并通过 AnimationMixer 将待机、步行、奔跑、轻击、重击、无双、闪避、受击、死亡状态映射到骨骼动画。异步加载失败或模型缺少 Idle、Walk、Attack 动画时，自动使用现有程序化人物。GLB 克隆共享网格与材质，移除敌人只释放单个骨骼实例。

战斗新增短暂命中停顿（hit-stop）与攻击向前压进，以增强打击重量感。相关单元测试已加入 GitHub Actions 的 test job；可单独运行：

```bash
node --experimental-default-type=module --test games/Hulao_Gate/character-assets.test.mjs games/Hulao_Gate/camera-physics.test.mjs
```

**注意**：本次只交付角色模型接入与动画运行框架，当前清单为空，尚未提供写实关羽、吕布、士兵 GLB。素材目录的 `README.md` 说明资产命名、动画、模型朝向和版权要求；在素材齐备前，不应将游戏称为已完成写实人物升级。
