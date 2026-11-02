[![中文](https://img.shields.io/badge/%E4%B8%AD%E6%96%87-c48a3a?style=for-the-badge)](./README.md)
[![English](https://img.shields.io/badge/English-5c5348?style=for-the-badge)](./README.en.md)

# 红帽奇遇

浏览器平台跳跃，挂在游戏馆「冒险」分区。

玩法尽量贴近 FC《超级马里奥兄弟》：单向镜头、黑底关卡命数屏、双行状态栏、变速跑跳、顶砖弹出、踩怪连击、旗杆高度分与时间折分。像素图与关卡布局都是原创致敬，不是任天堂产品，也没有拷贝官方精灵或原版关卡。

许可：MIT，见仓库根目录 [`LICENSE`](../../LICENSE)。

主角叫「阿砖」。世界：青丘草原、砖穴地底、云上跑道、石火城堡、霜镜雪原、碧波水道、夜林鬼径、熔心要塞。

## 操作

| 键 / 触控 | 作用 |
|---|---|
| ← → / A D · 左下两圆 | 移动 |
| Z / 空格 / K / ↑ · 右下大圆 | 跳跃 |
| X / J / Shift · 右下旁圆 | 冲刺；喷火帽时喷火 |
| P / Esc · 右上 | 暂停 |

## 运行

纯静态 ES 模块，无需构建：

```bash
python -m http.server 8080
# 打开 http://localhost:8080/games/redcap/
```
