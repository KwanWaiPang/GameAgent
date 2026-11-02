[![中文](https://img.shields.io/badge/%E4%B8%AD%E6%96%87-c48a3a?style=for-the-badge)](./README.zh.md)
[![English](https://img.shields.io/badge/English-5c5348?style=for-the-badge)](./README.md)

# 巫师棋 2 · The Sanctum

独立制作的哥特风格 3D 国际象棋。单个 `index.html`，无需 Node.js、npm 或打包。在游戏馆里的地址是 `games/wizard-chess-sanctum/`。

## 棋盘

8×8 象牙色与石板色棋格现在位于金色底座之上，不再被底座挡住。深色勾缝让每一格在斜视和俯视时都清楚。64 格的点选逻辑没有改。

## 功能

- 程序化 3D 教堂、有灯光的石棋盘，双方各六类雕塑棋子
- 轨道旋转、缩放、俯视、镜头预设、换边
- 人机与本地双人
- chess.js：王车易位、吃过路兵、升变、将军、将死、和棋
- 发光落点符文、走动、电影化吃子、石块碎裂
- 三档 AI、悔棋、棋谱、被吃棋子、自适应界面
- 没有下载的模型、图片或音频文件

## 本地运行

因为使用 ES 模块，需要用 HTTP 打开：

```bash
python -m http.server 8000
```

然后打开 http://localhost:8000/ 。挂在游戏馆时，从仓库根目录启动服务器，打开 `/games/wizard-chess-sanctum/`。

Three.js 与 chess.js 从 jsDelivr 加载，第一次打开需要联网。

## 部署到 GitHub Pages

若单独发布这个目录：

1. 在 GitHub 上创建一个公开仓库。
2. 把 `index.html` 和说明放到 `main`。
3. Settings → Pages，Source 选 **Deploy from a branch**，分支 `main`，目录 `/(root)`。
4. 发布完成后访问 `https://你的用户名.github.io/仓库名/`。

已经放进游戏馆时，不要再单独 `git init`。随 `GameAgent` 仓库一起提交即可。线上路径：

https://kwanwaipang.github.io/GameAgent/games/wizard-chess-sanctum/

更细的单独部署命令仍写在 [部署说明.md](./部署说明.md)。

## 操作

单击选择或走棋；拖动旋转；滚轮缩放；右键拖动平移。H 隐藏界面；U 悔棋。

## 权利说明

这是独立的程序化实现，只在类型和整体气质上参考哥特 3D 巫师棋，不是从参考站提取专有模型、动画或源码。Three.js（MIT）和 chess.js（BSD-2-Clause）经 CDN 加载，许可以其上游仓库为准。
