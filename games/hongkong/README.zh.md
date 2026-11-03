[![中文](https://img.shields.io/badge/%E4%B8%AD%E6%96%87-c48a3a?style=for-the-badge)](./README.zh.md)
[![English](https://img.shields.io/badge/English-5c5348?style=for-the-badge)](./README.md)

# 香港漫游

改编自 [Mr.doob 的 Slop New York](https://github.com/mrdoob/slop-newyork)，香港街道数据来自 [keithligh/slop-hongkong](https://github.com/keithligh/slop-hongkong)。代码许可见本目录 [LICENSE](./LICENSE)（MIT：Mr.doob、slop-hongkong 的作者，以及 Kwan Wai-Pang 的馆内改编）。地图数据仍是 OpenStreetMap（ODbL），不是 MIT。

已挂在游戏馆「城市」分类。

## 访问

静态页，不需要构建。需要支持 WebGPU 的浏览器，并联网加载 Three.js。

https://kwanwaipang.github.io/GameAgent/games/hongkong/

请用本地 HTTP 服务或 GitHub Pages 打开，不要直接用 `file://`。

## 和源码的差别

这是 [Slop New York](https://github.com/mrdoob/slop-newyork) 的香港街道版，城市数据来自 [keithligh/slop-hongkong](https://github.com/keithligh/slop-hongkong)（MIT）。玩法仍是步行、驾车、骑行和直升机，街道、车流、行人和楼宇都在。

范围是香港岛、九龙和维多利亚港，原点在中环。中环用街道轮廓和地政总署单体；湾仔、铜锣湾、北角、尖沙咀、油麻地、旺角和西九龙按地政楼面高度挤出。钟楼、凌霄阁、会展弧顶、中环广场金顶、汇丰桁架和力宝中心的外凸体是按真实落点加的轮廓。新界和离岛不在这版街道图里。走近地标按 F 可以读说明，天星码头可以渡海，花园道可以乘缆车上凌霄阁。

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
| F | 走近地标后查看、乘天星小轮或山顶缆车 |
