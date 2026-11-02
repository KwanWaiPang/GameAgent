[![中文](https://img.shields.io/badge/%E4%B8%AD%E6%96%87-c48a3a?style=for-the-badge)](./ARCHITECTURE.zh.md)
[![English](https://img.shields.io/badge/English-5c5348?style=for-the-badge)](./ARCHITECTURE.md)

# 街战突击 · 引擎合同

这是街战突击的协调合同：子系统归属、禁止跨目录改文件、事件表、表面类型。馆级结构和两款 FPS 的边界见仓库根目录 [ARCHITECTURE.md](../../ARCHITECTURE.md)。玩法与键位见 [README.zh.md](./README.zh.md)。

事件名和字段以英文合同 [ARCHITECTURE.md](./ARCHITECTURE.md) 为准。改合同时应两份一起改。

目标是浏览器里的第一人称射击，观感和手感靠近现代使命召唤。WebGL2 + Three.js r180，没有外部美术资源：贴图、网格、动画和音频都在加载时程序化生成。

## 硬规则

1. **只改自己的目录。** 不要改目录以外的文件。
2. **不要静态 import 另一个子系统。** 运行时取：`const fx = ctx.get('fx')`。
3. **不要新增 npm 依赖。** 只有 `three`。不要 CDN，不要外部图片、HDRI、模型或音频。游戏必须能完全离线运行。
4. **玩法和画面里不要用 `Math.random()`。** 用 `ctx.rng` 或自己保存的 `ctx.rng.fork()`。截图可复现靠这个。
5. **不要在每帧分配对象。** 向量、矩阵和数组在 `init()` 里预分配再复用。`update()` 里 `new THREE.Vector3()` 是错误。
6. **创建的东西要释放。** 几何、材质、贴图和渲染目标在 `dispose()` 里释放。
7. 改完后 `npm run build` 必须通过，并且 `node tools/capture.mjs` 必须能出一帧。启动坏了，别人就无法继续。

## 子系统接口

```js
export class MySystem {
  static id = 'mysystem';
  static deps = ['render'];

  async init(ctx) {}
  fixedUpdate(h, ctx) {}   // 可选，120 Hz，确定性玩法
  update(dt, ctx) {}        // 可选，每帧一次
  lateUpdate(dt, ctx) {}    // 可选，全部 update 之后
  resize(w, h, ctx) {}
  dispose() {}
}
```

`ctx` 提供：`scene`、`camera`、`viewScene`、`viewCamera`、`canvas`、`config`、`events`、`input`、`time`、`rng`、`get(id)`、`peek(id)`、`has(id)`。

- `scene` / `camera` 是世界。`viewScene` / `viewCamera` 是第一人称武器，单独绘制，避免穿墙。
- `time` 为 `{ elapsed, raw, dt, fixed, alpha, scale, frame }`。用 `alpha` 在物理步之间插值。
- `config.q` 是当前画质。遵守 `q.taa`、`q.gtao`、`q.ssr`、`q.volumetrics`、`q.shadowMapSize`、`q.particleBudget`、`q.decalBudget`。不要超出预算。

## 归属

| id | 目录 | 负责 |
|---|---|---|
| `render` | `src/render/` | WebGLRenderer、HDR、后处理、CSM 阴影、最终合成 |
| `materials` | `src/materials/` | 程序化 PBR 贴图、共享材质库、三平面 / 细节映射 |
| `sky` | `src/sky/` | 物理天空、日月、时刻、IBL、体积雾和光柱 |
| `world` | `src/world/` | 关卡几何、模块化建筑、道具、静态碰撞 |
| `physics` | `src/physics/` | 粗检测、射线、角色碰撞、刚体、布娃娃、穿透 |
| `player` | `src/player/` | 移动状态机、镜头手感、冲刺 / 滑铲 / 翻越 / 探头、生命 |
| `weapons` | `src/weapons/` | 武器网格、视模型、开镜、后坐、晃动、换弹、弹道 |
| `fx` | `src/fx/` | GPU 粒子、枪口焰、曳光、命中、贴花、烟、抛壳 |
| `ai` | `src/ai/` | 敌人、导航、感知、掩体、战斗行为 |
| `ui` | `src/ui/` | HUD、准星、命中标记、受伤指示、弹药、击杀信息、菜单 |
| `audio` | `src/audio/` | 合成枪声与拟音、空间化、混响、遮挡、混音 |

共用、由主程持有、不要改：`src/core/`、`src/main.js`、`src/dev/`、`tools/`、`vite.config.js`。

## 跨子系统事件

用 `ctx.events` 发送和监听。载荷是普通对象。正式名单：

| 事件 | 载荷 | 发送者 |
|---|---|---|
| `weapon:fire` | `{ weapon, origin, dir, seed }` | weapons |
| `weapon:reload` | `{ weapon, phase: 'start'\|'magout'\|'magin'\|'end' }` | weapons |
| `weapon:shell` | `{ position, velocity }` | weapons |
| `bullet:impact` | `{ point, normal, surface, incident, damage }` | physics |
| `bullet:tracer` | `{ from, to, speed }` | weapons |
| `damage:dealt` | `{ target, amount, headshot, killed, point }` | ai / physics |
| `damage:taken` | `{ amount, from, health }` | player |
| `actor:death` | `{ actor, point, impulse }` | ai |
| `player:land` | `{ velocity, surface }` | player |
| `player:footstep` | `{ position, surface, running }` | player |
| `player:state` | `{ stance, sprinting, sliding, ads }` | player |
| `explosion` | `{ position, radius, damage }` | 任意 |
| `resize` | `{ width, height }` | engine |

`damage:dealt` 表示伤害打到了 `target`。目标是本地玩家时（`'player'`、玩家系统，或 `isPlayer === true`），画命中标记前要滤掉。伤害由目标自己的监听者结算，发送者不要再结算一次。

需要表里没有的事件时，同一次提交里补上一行。英文合同也要补。

## 表面类型

命中特效、贴花、音效和脚步共用这些标签。物理给每个碰撞体标一个：`concrete`、`metal`、`wood`、`dirt`、`sand`、`glass`、`water`、`foliage`、`fabric`、`flesh`、`rubber`、`plaster`。

## 渲染接入

```js
const r = ctx.get('render');
r.renderer            // 不要在帧外改它的状态
r.registerPass(pass)
r.addLight(light)
r.requestEnvMap()
r.screenSize
r.depthTexture
r.velocityTexture
```

画进 `viewScene` 的东西在世界之后合成，并清掉深度。

每帧由 `render._collect` 遵守：

```js
mesh.userData.owNoPrepass = true  // 不进深度 / 法线 / 速度预通道
mesh.userData.owNoShadow  = true  // 不投入 CSM
```

`owNoShadow` 是唯一的阴影开关。级联阴影用 `scene.overrideMaterial` 绘制，不看 `mesh.castShadow`。`src/ai` 的屏外 LOD 依赖这一点。

### 点光源数量是着色器排列键

`r.addLight()` 会按距离剔除，淡出到 0 时把 `light.visible` 设为 false。Three 把**可见**点光源的数量写进每个材质的程序缓存键。一盏灯跨过半径，就会让场景里每个受光材质重新编译。登记了距离剔除点光源的代码必须让可见数量保持不变。两种做法像素结果相同：

- 把 `intensity` 降到 0，并保持 `visible` 为 true（`src/fx/lights.js`）
- 放强度为 0 的占位灯，每个 `lateUpdate` 把数量补到固定槽位（`src/world` 的 17 盏实用灯，见 `_stabiliseLightCount`。剔除发生在 `lateUpdate` 之后，所以它自己复刻了渲染器的淡出判断）

颜色乘强度恰好为 0 时，只往辐照累加器加一个 `0.0`，多出来的槽位不会改像素。

### 预热

`src/core/prewarm.js` 在第一帧之前运行，对实现了 `prewarmMaterials(ctx)` 的子系统调用它（`render`、`world`、`ai`）。合同是：**编译该子系统可能用到的每一种材质，不要生成玩法对象，不要画玩法帧，不要碰时钟或随机数。** 只调用 `renderer.compileAsync(scene, camera)` 只会暖到前向受光变体，暖不到 CSM 深度通道、MRT 预通道和后处理链。两个陷阱：

- 编译时必须绑定渲染目标。`outputColorSpace` 和 `toneMapping` 是缓存键的一部分，并且从**当前绑定的目标**读取。绑着画布编译会暖错变体。
- `fx` 被排除，在第 2 帧自己预热。它的键取决于可见光源数量，而这个数量要到第一帧渲染时才稳定。

## 画面标准

每个视觉子系统都要对照真实使命召唤画面来审。不能让步的是：

- 没有平坦、无贴图的表面。每种材质都要有反照率变化、法线、粗糙度变化，以及 0.5 米处看得见的细节层。
- 光照不能均匀。要有接触阴影、反弹、环境光遮蔽，以及清楚的主光 / 补光 / 轮廓光。
- 数值要像物理世界。反照率在 0.02–0.9，金属度是 0 或 1，光照强度用真实单位，曝光驱动而不是随便乘一个系数。
- 不要完全笔直、干净、重复。边缘磨损、缝里的污渍、轻微扭曲、实例的旋转和缩放要有变化。
- 每个动作都要有重量。后坐、镜头震动、屏幕冲击、音频瞬态，以及每次命中的视觉效果。
