# 沙线行动

游戏馆里的单机战术射击。客户端、界面、程序化枪械和沙漠 / 雪地场景来自 [sandline-threejs-fps](https://github.com/xilinnihao-afk/sandline-threejs-fps)（MIT）。

公开源码不含 Counter-Strike 的地图、角色、经典手臂和音频。没有这些文件时，仍用原版程序化枪械和程序化士兵进入沙漠旧城、雪地竞技场。经典沙漠 2、仓库突击和 Bloodstrike 会提示地图准备失败。把授权资源按上游 `ASSETS.md` 放进 `public/assets/` 后，这些地图和模型会按原版加载。

与 [`games/fps/`](../fps/) 和 [`games/street-duty/`](../street-duty/) 分开，不替换它们。

## 模式

沙漠旧城和雪地竞技场：自由交火、刀战、手枪战、军备竞赛、据点守卫。人数 3v3 到 10v10。你始终是蓝方。经典沙漠 2 为爆破，仓库突击为人质，Bloodstrike 为赏金回合；这三张图需要上游地图包。

## 操作

| 键 | 作用 |
|---|---|
| WASD | 移动 |
| Shift / 空格 / C | 冲刺 / 跳跃 / 切换下蹲 |
| 左键 | 射击 |
| 右键 | 开镜；匕首时为刺击 |
| R / G / E | 换弹 / 手雷 / 拾取、安放、拆除、人质 |
| 1–8 / 滚轮 | 换枪 |
| B | 补给商店（出生区或波间） |
| Esc | 暂停 |

手机横屏使用左侧摇杆和右侧按钮。

地址栏可以加 `?map=snow&mode=deathmatch&play=1` 直接开局。

## 开发

```bash
cd games/sandline
npm ci
npm test
npm run dev
```

开发入口是 `index.source.html`（端口 5191）。`npm run build` 会把页面同步到 `index.html` 和 `assets/`，供 GitHub Pages 使用。
