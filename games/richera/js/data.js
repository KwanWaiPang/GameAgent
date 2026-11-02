/**
 * 金城纪棋盘与卡牌。
 * 玩法致敬街市富翁这一类棋，地名、人物、牌面文字均为原创，
 * 不是任何商业「富翁」产品的地图、角色或文案。
 */

export const CELL_COUNT = 32;
export const START_INDEX = 0;
export const HOSPITAL_INDEX = 24;
export const JAIL_INDEX = 30;

export const SALARY = 2000;
export const MINE_FEE = 800;
export const BOMB_FEE = 1000;
export const BAIL = 800;
export const RELEASE = 1000;
export const LOTTERY_STAKE = 500;
export const BAG_LIMIT = 6;
export const RENT_FACTOR = [0.2, 0.5, 1.15, 2.5];
export const LEVEL_NAME = ["空地", "茅屋", "洋房", "大厦"];

export const GROUP_COLOR = {
  south: "#d3544a",
  east: "#e0a045",
  north: "#2f9aa0",
  west: "#7d6bb5",
};

export const GROUP_NAME = {
  south: "南市",
  east: "东坊",
  north: "北岸",
  west: "西园",
};

export const CAST = [
  { name: "阿梨", title: "红短打", color: "#e23b3b", accent: "#ffc1b5" },
  { name: "小山", title: "青布衫", color: "#3c7ad9", accent: "#c5dbff" },
  { name: "小禾", title: "绿蓑衣", color: "#2f9e62", accent: "#c8f5d8" },
  { name: "老金", title: "金冠", color: "#e0a12a", accent: "#ffe6b0" },
];

export const GODS = {
  wealth: { name: "财神", blurb: "俸禄与收到的租金都更高", left: 5 },
  poor: { name: "穷神", blurb: "没有俸禄，付租更多，收租变少", left: 4 },
  fortune: { name: "福神", blurb: "挡下税、陷阱、牢狱和坏牌", left: 5 },
  weak: { name: "衰神", blurb: "掷出的点数减一", left: 3 },
};

/** 32 格，每边 8 格，顺时针：南 → 西 → 北 → 东。 */
export const BOARD = [
  { type: "start", name: "金城门" },
  { type: "property", name: "南市口", group: "south", price: 1200 },
  { type: "chance", name: "机会" },
  { type: "property", name: "布行", group: "south", price: 1600 },
  { type: "property", name: "茶寮", group: "south", price: 2000 },
  { type: "shop", name: "杂货铺" },
  { type: "property", name: "米仓", group: "south", price: 2400 },
  { type: "fate", name: "命运" },
  { type: "bank", name: "钱庄" },
  { type: "property", name: "东栅", group: "east", price: 2800 },
  { type: "lottery", name: "彩票" },
  { type: "property", name: "灯市", group: "east", price: 3400 },
  { type: "property", name: "绸庄", group: "east", price: 4000 },
  { type: "chance", name: "机会" },
  { type: "property", name: "戏园", group: "east", price: 4600 },
  { type: "fate", name: "命运" },
  { type: "park", name: "公园" },
  { type: "property", name: "北岸", group: "north", price: 5200 },
  { type: "property", name: "船埠", group: "north", price: 5800 },
  { type: "shop", name: "杂货铺" },
  { type: "property", name: "盐栈", group: "north", price: 6600 },
  { type: "chance", name: "机会" },
  { type: "property", name: "钟楼", group: "north", price: 7400 },
  { type: "tax", name: "税所" },
  { type: "hospital", name: "医馆" },
  { type: "property", name: "西坊", group: "west", price: 8200 },
  { type: "fate", name: "命运" },
  { type: "property", name: "书肆", group: "west", price: 9000 },
  { type: "temple", name: "土地庙" },
  { type: "property", name: "画舫", group: "west", price: 9800 },
  { type: "jail", name: "拘所" },
  { type: "property", name: "绣坊", group: "west", price: 10800 },
];

export const TOOLS = {
  block: { id: "block", name: "路障", price: 500, blurb: "放在前方八步内，走进去的人会停下" },
  mine: { id: "mine", name: "地雷", price: 800, blurb: "踩中的人付钱并进医馆。福神和护身符可挡" },
  bomb: { id: "bomb", name: "定时炸弹", price: 1000, blurb: "贴在走过的人身上，再走 8 步爆炸，并拆掉那一格的房子" },
  sweep: { id: "sweep", name: "清道", price: 700, blurb: "清掉前方六步内的路障、地雷和炸弹" },
  waiver: { id: "waiver", name: "免单符", price: 900, blurb: "自动免掉下一次租金" },
  remote: { id: "remote", name: "遥控骰子", price: 1200, blurb: "指定 1 到 6 点，并立刻走" },
  reverse: { id: "reverse", name: "转向", price: 400, blurb: "自己掉头走" },
  stay: { id: "stay", name: "停留", price: 700, blurb: "指定一人，下一回合停下" },
  shield: { id: "shield", name: "护身符", price: 900, blurb: "自动挡下一次灾祸" },
  equalize: { id: "equalize", name: "均富", price: 1500, blurb: "和一名对手把现金拉平" },
  demolish: { id: "demolish", name: "拆迁", price: 1100, blurb: "把别人的房子降一级" },
  tax: { id: "tax", name: "查税", price: 1000, blurb: "向一名对手征收现金的一成半" },
};

export const TOOL_ORDER = ["block", "mine", "bomb", "sweep", "waiver", "remote", "reverse", "stay", "shield", "equalize", "demolish", "tax"];

export const CHANCE_CARDS = [
  { id: "bonus-gate", text: "城门发饷：立刻走到金城门，并领取俸禄。" },
  { id: "purse", text: "捡到一只钱袋。" },
  { id: "feast", text: "请客吃饭，破费一笔。" },
  { id: "back3", text: "走错巷子，退回三步。" },
  { id: "to-hospital", text: "突发急症，送去医馆休养。" },
  { id: "gain-block", text: "路人塞给你一张路障。" },
  { id: "windfall", text: "旧货出手，进账一笔。" },
  { id: "levy", text: "街道摊派，要你出钱。" },
  { id: "to-park", text: "被邀去公园坐坐。" },
  { id: "interest", text: "钱庄给你提前结了一笔息。" },
  { id: "gain-remote", text: "得到一枚遥控骰子。" },
  { id: "collect", text: "街坊凑份子，每位对手给你一点钱。" },
];

export const FATE_CARDS = [
  { id: "god-wealth", text: "财神在檐下看了你一眼。" },
  { id: "god-poor", text: "穷神跟上了你。" },
  { id: "god-fortune", text: "福神把你的名字记在簿上。" },
  { id: "god-weak", text: "衰神在你骰子上吹了口气。" },
  { id: "legacy", text: "远亲留下一笔遗产。" },
  { id: "stolen", text: "袖里的钱不翼而飞。" },
  { id: "split", text: "街坊要你和最有钱的人平分现金。" },
  { id: "free-up", text: "工匠义务给你盖了一级房子。" },
  { id: "typhoon", text: "夜风过城，吹坏一处最高的房子。" },
  { id: "to-jail", text: "被请去拘所待一天。" },
  { id: "gain-shield", text: "庙祝塞给你一张护身符。" },
  { id: "tea", text: "无事发生，只喝到一盏热茶。" },
];

export function upgradeCost(cell) {
  return Math.round((cell?.price || 0) * 0.5);
}

export function levelName(level) {
  return LEVEL_NAME[Math.max(0, Math.min(3, level || 0))];
}

export function baseRent(cell) {
  if (!cell || cell.type !== "property") return 0;
  const level = Math.max(0, Math.min(3, cell.level || 0));
  return Math.round(cell.price * RENT_FACTOR[level]);
}
