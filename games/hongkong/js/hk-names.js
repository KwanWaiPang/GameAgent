// Display names for the Hong Kong adaptation. Geometry, traffic and shaders stay on the
// original simulation frame; this module only decides what the player reads.

const AVENUE_BY_ID = {
  riverside: '海傍径',
  11: '砵兰街',
  10: '上海街',
  9: '洗衣街',
  manhattan: '塘尾道',
  8: '漆咸道南',
  7: '通菜街',
  6: '西洋菜南街',
  5: '弥敦道',
  madison: '山林道',
  park: '康庄道',
  lex: '公主道',
  3: '科学馆道',
  2: '卫理道',
  1: '基堤道',
  york: '京士柏道',
  eastend: '天光道',
  c: '马头围道',
  d: '土瓜湾道',
  vanderbilt: '云咸街',
  university: '德己立街',
  st_nicholas: '南昌街'
};

const AVENUE_RAW = {
  'RIVERSIDE DR': AVENUE_BY_ID.riverside,
  'W END AVE': AVENUE_BY_ID[11],
  'WEST END AVE': AVENUE_BY_ID[11],
  '11 AVE': AVENUE_BY_ID[11],
  'AMSTERDAM AVE': AVENUE_BY_ID[10],
  '10 AVE': AVENUE_BY_ID[10],
  'COLUMBUS AVE': AVENUE_BY_ID[9],
  '9 AVE': AVENUE_BY_ID[9],
  'MANHATTAN AVE': AVENUE_BY_ID.manhattan,
  'FREDERICK DOUGLASS BLVD': AVENUE_BY_ID[8],
  'CENTRAL PARK W': AVENUE_BY_ID[8],
  '8 AVE': AVENUE_BY_ID[8],
  'ADAM CLAYTON POWELL JR BLVD': AVENUE_BY_ID[7],
  '7 AVE': AVENUE_BY_ID[7],
  '7 AVE S': AVENUE_BY_ID[7],
  'LENOX AVE': AVENUE_BY_ID[6],
  'MALCOLM X BLVD': AVENUE_BY_ID[6],
  'AVE OF THE AMERICAS': AVENUE_BY_ID[6],
  '6 AVE': AVENUE_BY_ID[6],
  '5 AVE': AVENUE_BY_ID[5],
  'MADISON AVE': AVENUE_BY_ID.madison,
  'PARK AVE': AVENUE_BY_ID.park,
  'PARK AVE S': AVENUE_BY_ID.park,
  'LEXINGTON AVE': AVENUE_BY_ID.lex,
  '3 AVE': AVENUE_BY_ID[3],
  '2 AVE': AVENUE_BY_ID[2],
  '1 AVE': AVENUE_BY_ID[1],
  'YORK AVE': AVENUE_BY_ID.york,
  'AVE A': AVENUE_BY_ID.york,
  'E END AVE': AVENUE_BY_ID.eastend,
  'EAST END AVE': AVENUE_BY_ID.eastend,
  'AVE B': AVENUE_BY_ID.eastend,
  'AVE C': AVENUE_BY_ID.c,
  'AVE D': AVENUE_BY_ID.d,
  'VANDERBILT AVE': AVENUE_BY_ID.vanderbilt,
  'UNIVERSITY PL': AVENUE_BY_ID.university,
  'IRVING PL': '伊利近街',
  'ST NICHOLAS AVE': AVENUE_BY_ID.st_nicholas,
  'BROADWAY': '海港道',
  'WEST ST': '干诺道西',
  '12 AVE': '海辉道',
  'HENRY HUDSON PKWY': '西区海底隧道',
  'BOWERY': '亚皆老街',
  'CANAL ST': '界限街',
  'WALL ST': '雪厂街',
  'E HOUSTON ST': '荷李活道',
  'W HOUSTON ST': '荷李活道',
  'BLEECKER ST': '士丹顿街',
  'PRINCE ST': '威灵顿街',
  'SPRING ST': '摆花街',
  'DELANCEY ST': '骆克道',
  'BROOME ST': '太原街',
  'GRAND ST': '庄士敦道',
  'HESTER ST': '春园街',
  'WORTH ST': '金钟道',
  'CHAMBERS ST': '夏悫道',
  'VESEY ST': '民耀街',
  'FULTON ST': '干诺道中',
  'JOHN ST': '遮打道',
  'MAIDEN LN': '都爹利街',
  'LIBERTY ST': '金融街',
  'PINE ST': '银行街',
  'RECTOR ST': '民祥街',
  'BEAVER ST': '康乐广场',
  'BATTERY PL': '龙和道',
  'STATE ST': '民光街',
  'BROADWAY ALY': '海港里',
  'BATTERY PARK UNDERPASS': '中环海滨隧道'
};

// East-west streets. Numbers follow the original grid so corners stay stable.
// 37 is the spawn street, so it reads as 北京道 beside 弥敦道.
const STREET_BY_NUMBER = {
  1: '摩利臣街', 2: '永乐街', 3: '文咸东街', 4: '文咸西街', 5: '皇后大道西',
  6: '高升街', 7: '水坑口街', 8: '皇后街', 9: '急庇利街', 10: '租庇利街',
  11: '阁麟街', 12: '机利文新街', 13: '禧利街', 14: '德辅道中', 15: '干诺道中',
  16: '民光街', 17: '统一码头道', 18: '爱丁堡广场', 19: '康乐广场', 20: '交易广场径',
  21: '港景街', 22: '金融街', 23: '皇后大道中', 24: '云咸街', 25: '兰桂坊',
  26: '德己立街', 27: '安兰街', 28: '戏院里', 29: '都爹利街', 30: '毕打街',
  31: '银行街', 32: '红棉路', 33: '花园道', 34: '佐敦道', 35: '柯士甸道',
  36: '广东道', 37: '北京道', 38: '汉口道', 39: '中间道', 40: '么地道',
  41: '漆咸围', 42: '轩尼诗道', 43: '骆克道', 44: '谢斐道', 45: '加连威老道',
  46: '金巴利道', 47: '赫德道', 48: '金马伦道', 49: '加拿分道', 50: '山林道',
  51: '天文台道', 52: '柯士甸路', 53: '西贡街', 54: '南京街', 55: '宝灵街',
  56: '吴松街', 57: '记利佐治街', 58: '波斯富街', 59: '梳士巴利道', 60: '尖沙咀海傍',
  61: '海防道', 62: '众坊街', 63: '炮台街', 64: '文明里', 65: '渡船街',
  66: '上海街西', 67: '砵兰街西', 68: '碧街', 69: '烟厂街', 70: '石龙街',
  71: '鸦打街', 72: '熙龙里', 73: '东莞街', 74: '新填地街', 75: '广东道北',
  76: '窝打老道', 77: '亚皆老街', 78: '太子道西', 79: '界限街', 80: '汝州街',
  81: '基隆街', 82: '长沙湾道', 83: '荔枝角道', 84: '东京街', 85: '通州街',
  86: '钦州街', 87: '大南街', 88: '枫树街', 89: '桂林街', 90: '黄竹街',
  91: '福华街', 92: '福荣街', 93: '元州街', 94: '青山道', 95: '呈祥道',
  96: '兴华街', 97: '顺宁道', 98: '怀惠道', 99: '石硖尾街', 100: '巴域街',
  101: '大埔道', 102: '界限街东', 103: '太子道东', 104: '联合道', 105: '衙前围道',
  106: '贾炳达道', 107: '侯王道', 108: '乐善道', 109: '启德道', 110: '宋皇台道',
  111: '马头围道北', 112: '土瓜湾道北', 113: '浙江街', 114: '落山道', 115: '谭公道',
  116: '马头角道', 117: '北帝街', 118: '木厂街', 119: '炮仗街', 120: '荣光街',
  121: '崇安街', 122: '安宁道', 123: '常安街', 124: '常悦道', 125: '宏照道',
  126: '启祥道', 127: '伟业街', 128: '敬业街', 129: '成业街', 130: '茶果岭道'
};

const AREAS = ['中环', '上环', '西营盘', '石塘咀', '坚尼地城', '金钟', '半山', '太平山', '湾仔', '铜锣湾', '天后', '炮台山', '北角', '鲗鱼涌', '太古', '西湾河', '筲箕湾', '柴湾', '跑马地', '大坑', '扫杆埔', '浅水湾', '赤柱', '尖沙咀', '尖东', '佐敦', '油麻地', '旺角', '太子', '深水埗', '长沙湾', '荔枝角', '美孚', '大角咀', '红磡', '土瓜湾', '何文田', '九龙塘', '石硖尾', '九龙城', '启德', '观塘', '牛头角', '蓝田', '油塘', '将军澳', '西贡', '沙田', '大围', '荃湾', '葵涌', '青衣', '屯门', '元朗', '天水围', '东涌'];
const SUFFIXES = ['道', '街', '里', '坊', '径', '台', '巷', '围'];

const assigned = new Map();
const reserved = new Set(Object.values(AVENUE_RAW).concat(Object.values(STREET_BY_NUMBER), Object.values(AVENUE_BY_ID), ['东区走廊', '香港公园径', '海港道']));
const used = new Set();

function collapse(raw) {
  return String(raw || '').replace(/\s+/g, ' ').trim();
}

function hash(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

function claimUnique(raw, base) {
  let name = base;
  let n = 2;
  while (reserved.has(name) || used.has(name)) name = `${base}${n++}`;
  used.add(name);
  assigned.set(raw, name);
  return name;
}

export function hkStreetTitle(n) {
  return STREET_BY_NUMBER[n] || `香港${n}街`;
}

export function hkAvenueDisplay(id, fallback = '') {
  const name = AVENUE_BY_ID[id] || fallback || '香港道';
  return { name, short: name };
}

export function hkPrettyName(raw) {
  const name = collapse(raw);
  if (!name) return '香港街道';
  const cached = assigned.get(name);
  if (cached) return cached;
  const remember = (label) => {
    assigned.set(name, label);
    return label;
  };
  if (AVENUE_RAW[name]) return remember(AVENUE_RAW[name]);
  if (name.includes('FDR')) return remember('东区走廊');
  if (name.includes('CENTRAL PARK')) return remember('香港公园径');
  const numbered = /^(?:[EW] )?(\d+) ST$/.exec(name);
  if (numbered) return remember(hkStreetTitle(+numbered[1]));
  const transverse = /^(\d+) ST TRANSVERSE$/.exec(name);
  if (transverse) return remember('香港公园径');
  const area = AREAS[hash(name) % AREAS.length];
  const suffix = SUFFIXES[(hash(name) >>> 8) % SUFFIXES.length];
  return claimUnique(name, `${area}${suffix}`);
}
