[![中文](https://img.shields.io/badge/%E4%B8%AD%E6%96%87-c48a3a?style=for-the-badge)](./README.zh.md)
[![English](https://img.shields.io/badge/English-5c5348?style=for-the-badge)](./README.md)

# 金城纪

三维街市沙盘。玩法致敬经典富翁类棋：单骰绕城、买地盖楼、道具陷阱、钱庄利息和神仙。

地名、人物、牌面和画面都是原创的，不是任何商业「富翁」产品的地图、角色或文案。

## 玩法

- 一枚骰子，沿当前方向走。路过金城门领 $2000，存款另结一成利息
- 无主地可买。自家地可盖成茅屋、洋房、大厦。集齐同一区四块地，该区租金再高一半
- 路障、地雷、定时炸弹、遥控骰子、转向、停留、护身符、均富、拆迁、查税
- 土地庙会请来财神、穷神、福神或衰神
- 默认第 12 天收市，比资产。也可以下到只剩一人

## 目录

```
index.html
css/styles.css
js/data.js        # 棋盘、道具、牌
js/engine.js      # 规则
js/engine.test.js
js/board3d.js     # Three.js 沙盘
js/app.js         # 界面
```

运行时从 jsDelivr 加载 Three.js r180。
