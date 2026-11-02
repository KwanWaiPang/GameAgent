[![中文](https://img.shields.io/badge/%E4%B8%AD%E6%96%87-c48a3a?style=for-the-badge)](./README.zh.md)
[![English](https://img.shields.io/badge/English-5c5348?style=for-the-badge)](./README.md)

# 香港漫游

改编自 [Mr.doob 的 Slop New York](https://github.com/mrdoob/slop-newyork)。代码许可见本目录 [LICENSE](./LICENSE)（MIT，版权 Mr.doob）。地理数据仍来自纽约市开放数据与 OpenStreetMap（ODbL）。

已挂在游戏馆「城市」分类。

## 访问

静态页，不需要构建。需要支持 WebGPU 的浏览器，并联网加载 Three.js。

https://kwanwaipang.github.io/GameAgent/games/hongkong/

请用本地 HTTP 服务或 GitHub Pages 打开，不要直接用 `file://`。

## 和源码的差别

画面、光照、车流、行人、镜头和后处理沿用源码。改动集中在城市身份：

- 标题、加载、地图和操作改成中文，并链回游戏馆
- 路名、地区、水面和大桥改成香港地名
- 的士改为红色市区的士，绿色车保留为新界的士
- 速度改为公里/小时，高度改为米

街道网格、海岸线和楼宇轮廓仍是原来的模拟，不是地政总署的香港测绘图。

## 操作

| 按键 | 作用 |
|---|---|
| 1 / 2 / 3 / 4 | 步行、的士、单车、直升机 |
| W A S D | 移动或转向 |
| 空格 | 跳跃，或直升机上升 |
| V | 切换镜头 |
| M | 街道图 |
| H | 隐藏界面 |
| N | 声音 |
