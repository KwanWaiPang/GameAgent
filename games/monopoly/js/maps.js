/**
 * 三张可选地图。格子类型、地价和色组位置一致，只换城市与桌面画法。
 * 起点在右下角，顺时针。不含港澳台分列。
 */

const SLOTS = [
  { type: "go", value: 2000, subtitle: "路过+$2000" },
  { type: "property", value: 600, group: "brown" },
  { type: "fate", value: 0 },
  { type: "property", value: 800, group: "brown" },
  { type: "tax", value: 1000 },
  { type: "station", value: 2000 },
  { type: "property", value: 1000, group: "sky" },
  { type: "chance", value: 0 },
  { type: "property", value: 1200, group: "sky" },
  { type: "property", value: 1400, group: "sky" },
  { type: "jail", value: 0, subtitle: "路过无事" },
  { type: "property", value: 1600, group: "pink" },
  { type: "utility", value: 1500 },
  { type: "property", value: 1800, group: "pink" },
  { type: "property", value: 2000, group: "pink" },
  { type: "station", value: 2000 },
  { type: "property", value: 2200, group: "orange" },
  { type: "fate", value: 0 },
  { type: "property", value: 2400, group: "orange" },
  { type: "property", value: 2600, group: "orange" },
  { type: "park", value: 0, subtitle: "休息一回" },
  { type: "property", value: 2800, group: "red" },
  { type: "chance", value: 0 },
  { type: "property", value: 3000, group: "red" },
  { type: "property", value: 3200, group: "red" },
  { type: "station", value: 2000 },
  { type: "property", value: 3400, group: "yellow" },
  { type: "property", value: 3600, group: "yellow" },
  { type: "utility", value: 1500 },
  { type: "property", value: 3800, group: "yellow" },
  { type: "gotojail", value: 0, subtitle: "停走数日" },
  { type: "property", value: 4000, group: "green" },
  { type: "property", value: 4200, group: "green" },
  { type: "fate", value: 0 },
  { type: "property", value: 4400, group: "green" },
  { type: "station", value: 2000 },
  { type: "property", value: 4600, group: "navy" },
  { type: "chance", value: 0 },
  { type: "property", value: 4800, group: "navy" },
  { type: "tax", value: 1500 },
];

function build(names, motifs) {
  return SLOTS.map((slot, i) => ({
    ...slot,
    name: names[i],
    motif: motifs[i] || null,
  }));
}

const worldNames = [
  "起点", "古巴", "命运", "墨西哥", "所得税", "纽约站", "阿根廷", "机会", "加拿大", "美国",
  "暂停", "荷兰", "电力", "希腊", "西班牙", "巴黎站", "意大利", "命运", "德国", "法国",
  "停车场", "英国", "机会", "俄罗斯", "土耳其", "东京站", "泰国", "澳大利亚", "自来水", "新加坡",
  "强制暂停", "巴西", "日本", "命运", "韩国", "上海站", "印度", "机会", "中国", "财产税",
];
const worldMotifs = {
  1: "sail", 3: "peak", 6: "peak", 8: "tree", 9: "spire",
  11: "bridge", 13: "dome", 14: "gate", 16: "dome", 18: "gate", 19: "spire",
  21: "spire", 23: "wall", 24: "dome", 26: "pagoda", 27: "sail", 29: "sail",
  31: "tree", 32: "pagoda", 34: "gate", 36: "dome", 38: "wall",
};

const jiangnanNames = [
  "起点", "苏州", "命运", "杭州", "关税", "京口站", "扬州", "机会", "无锡", "镇江",
  "茶寮", "南京", "灯市", "绍兴", "嘉兴", "运河站", "宁波", "命运", "温州", "金华",
  "园林", "合肥", "机会", "南昌", "长沙", "长江站", "武汉", "成都", "水埠", "重庆",
  "误船", "西安", "洛阳", "命运", "开封", "钱塘站", "北京", "机会", "广州", "田赋",
];
const jiangnanMotifs = {
  1: "bridge", 3: "pagoda", 6: "gate", 8: "tree", 9: "peak",
  11: "wall", 13: "bridge", 14: "lantern", 16: "sail", 18: "sail", 19: "market",
  21: "tree", 23: "lantern", 24: "peak", 26: "bridge", 27: "gate", 29: "peak",
  31: "wall", 32: "pagoda", 34: "wall", 36: "wall", 38: "sail",
};

const silkNames = [
  "起点", "长安", "命运", "兰州", "关税", "玉门关", "敦煌", "机会", "哈密", "吐鲁番",
  "沙暴", "喀什", "驼队", "和田", "阿克苏", "阳关", "撒马尔罕", "命运", "布哈拉", "塔什干",
  "绿洲", "伊斯法罕", "机会", "巴格达", "大马士革", "安西驿", "伊斯坦布尔", "布尔萨", "水井", "特拉布宗",
  "迷途", "威尼斯", "佛罗伦萨", "命运", "罗马", "河西驿", "亚历山大", "机会", "开罗", "过所",
];
const silkMotifs = {
  1: "wall", 3: "gate", 6: "peak", 8: "oasis", 9: "peak",
  11: "market", 13: "oasis", 14: "tree", 16: "dome", 18: "dome", 19: "market",
  21: "dome", 23: "dome", 24: "gate", 26: "dome", 27: "market", 29: "sail",
  31: "sail", 32: "dome", 34: "spire", 36: "sail", 38: "peak",
};

export const MAPS = [
  {
    id: "world",
    name: "世界之旅",
    tag: "环球航线",
    blurb: "四大洲城市，绿毡海图",
    felt: "#1c5a38",
    paper: "#f4efe4",
    ink: "#2a2118",
    price: "#7a3030",
    center: "world",
    en: "WORLD TOUR",
    cells: build(worldNames, worldMotifs),
  },
  {
    id: "jiangnan",
    name: "江南烟雨",
    tag: "运河水乡",
    blurb: "苏杭沿江，青瓷河图",
    felt: "#2c6a62",
    paper: "#f3f7f1",
    ink: "#1d332c",
    price: "#8a4b32",
    center: "jiangnan",
    en: "RIVER TOWNS",
    cells: build(jiangnanNames, jiangnanMotifs),
  },
  {
    id: "silk",
    name: "丝路商队",
    tag: "沙海驿道",
    blurb: "长安到地中海，沙色舆图",
    felt: "#8a5a32",
    paper: "#f8f1e0",
    ink: "#3a2918",
    price: "#8a3030",
    center: "silk",
    en: "SILK ROAD",
    cells: build(silkNames, silkMotifs),
  },
];
