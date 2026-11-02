# 沙线行动

游戏馆里的单机战术射击。规则、机器人、武器数值和沙漠 / 雪地场景改写自 [sandline-threejs-fps](https://github.com/xilinnihao-afk/sandline-threejs-fps)（MIT）。人物、第一人称枪械、界面和音效是游戏馆里的程序化实现。

不包含 Counter-Strike 的地图、角色或枪模。经典沙漠 2、仓库人质图和 Bloodstrike 原图因此不在这一版里。爆破、人质和赏金回合改在沙漠旧城与雪地竞技场上进行。

与 [`games/fps/`](../fps/) 和 [`games/street-duty/`](../street-duty/) 分开，不替换它们。

## 模式

自由交火、刀战、手枪战、军备竞赛、据点守卫、爆破、解救人质、赏金回合。人数可从 3v3 到 10v10。你始终是蓝方。

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
