[![中文](https://img.shields.io/badge/%E4%B8%AD%E6%96%87-c48a3a?style=for-the-badge)](./README.zh.md)
[![English](https://img.shields.io/badge/English-5c5348?style=for-the-badge)](./README.md)

# 无人机战争（Battle Drones）

游戏馆里的单机即时战略。双方用飞行和地面无人机采集废料、建设基地、争夺地图。

模拟、AI 指挥官、地图、美术、音效、战役和生存模式来自 [simonw/battledrones](https://github.com/simonw/battledrones)（Apache-2.0），上游修订 `ca4f13b36013e1980289046e731a295d2bf02a3e`。这一份去掉了联机：在线对战、四人房间、声波链路和中继服务器。开场画面可以返回大厅。

它挂在大厅射击一栏，单独成目录，和三款第一人称射击并列。

## 模式

- **遭遇战：** 采集废料、组建机群，摧毁敌方总部和巨像。对手是 AI。
- **生存：** 守住基地，挡住一波接一波的主题进攻。
- **战役：** 短任务，每关最多三星。

`vehicles.html` 和 `models.html` 是单位与模型参考页。`record-viewer.html` 用来阅读战斗记录。展示对局在 `battles/showcase/`。

## 开发

使用 Node.js 24，与 Pages 工作流的主版本一致。

```bash
cd games/BattleDrones
npm ci
npm run dev
```

Vite 在 5173 端口提供 `index.html`。`npm run build` 会做类型检查并写出 `dist/`。GitHub Actions 发布 `dist/`，并附上 `LICENSE` 与 `NOTICE`。仓库不提交 `dist/`。

## 许可

Apache-2.0。见 [LICENSE](./LICENSE) 与 [NOTICE](./NOTICE)。仓库根目录的 MIT 文本不能把这个目录改成 MIT。
