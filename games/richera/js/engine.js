/**
 * 金城纪规则。纯数据，不管画面。
 * 单骰绕城、买地盖楼、道具、钱庄、神仙。原创规则，不是商业棋的移植。
 */

import {
  BAG_LIMIT,
  BAIL,
  BOARD,
  BOMB_FEE,
  CAST,
  CELL_COUNT,
  CHANCE_CARDS,
  FATE_CARDS,
  GODS,
  HOSPITAL_INDEX,
  JAIL_INDEX,
  LOTTERY_STAKE,
  MINE_FEE,
  RELEASE,
  SALARY,
  START_INDEX,
  TOOL_ORDER,
  TOOLS,
  baseRent,
  levelName,
  upgradeCost,
} from "./data.js";

export { upgradeCost, levelName };

export function wrap(n) {
  return ((n % CELL_COUNT) + CELL_COUNT) % CELL_COUNT;
}

export function current(state) {
  return state.players[state.turn];
}

export function alivePlayers(state) {
  return state.players.filter((p) => !p.bankrupt);
}

function log(state, text) {
  state.log.unshift(text);
  if (state.log.length > 60) state.log.length = 60;
}

function shuffle(rng, list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function createGame(opts = {}) {
  const rng = opts.rng || Math.random;
  let humans = Math.min(3, Math.max(0, opts.humanCount | 0));
  let ais = Math.min(3, Math.max(0, opts.aiCount | 0));
  if (humans + ais < 2) ais = 2 - humans;
  if (humans + ais > 4) ais = 4 - humans;
  const cash = Math.max(1000, Math.min(100000, opts.cash | 0 || 15000));
  const maxDay = opts.maxDay == null ? 12 : Math.max(0, opts.maxDay | 0);
  const names = Array.isArray(opts.names) ? opts.names : [];

  const players = [];
  for (let i = 0; i < humans + ais; i++) {
    const cast = CAST[i];
    const isHuman = i < humans;
    const fallback = isHuman ? (i === 0 ? cast.name : `玩家${i + 1}`) : cast.name;
    const name = String(names[i] || fallback).trim().slice(0, 8) || fallback;
    players.push({
      id: i,
      name,
      title: cast.title,
      color: cast.color,
      accent: cast.accent,
      isHuman,
      auto: false,
      cash,
      deposit: 0,
      position: 0,
      dir: 1,
      items: [],
      god: null,
      halt: 0,
      haltWhy: "",
      remote: 0,
      bomb: null,
      bankrupt: false,
    });
  }

  const cells = BOARD.map((cell, index) => ({
    ...cell,
    index,
    owner: null,
    level: 0,
  }));

  const state = {
    rng,
    players,
    cells,
    traps: [],
    trapSeq: 1,
    decks: {
      chance: shuffle(rng, CHANCE_CARDS.map((c) => c.id)),
      fate: shuffle(rng, FATE_CARDS.map((c) => c.id)),
    },
    turn: 0,
    day: 1,
    maxDay,
    phase: "idle",
    pending: null,
    bombsDone: false,
    toolUsed: false,
    built: false,
    winner: null,
    rankings: null,
    lastDie: 0,
    extraHop: null,
    message: "按「掷骰」走出第一步。空格键也可以。",
    log: ["金城开市。路过城门领俸禄，买地，盖楼，留到最后或在收市那天比资产。"],
  };
  return state;
}

export function trapAt(state, index) {
  return state.traps.find((t) => t.at === index) || null;
}

export function ownsDistrict(state, cell) {
  if (!cell?.group || cell.owner == null) return false;
  const mates = state.cells.filter((c) => c.group === cell.group);
  return mates.length > 0 && mates.every((c) => c.owner === cell.owner);
}

export function rentAmount(state, cell, payerId) {
  if (!cell || cell.type !== "property" || cell.owner == null) return 0;
  let rent = baseRent(cell);
  if (ownsDistrict(state, cell)) rent = Math.round(rent * 1.5);
  const owner = state.players[cell.owner];
  const payer = payerId == null ? null : state.players[payerId];
  if (owner?.god?.id === "wealth") rent = Math.round(rent * 1.5);
  if (owner?.god?.id === "poor") rent = Math.round(rent * 0.7);
  if (payer?.god?.id === "poor") rent = Math.round(rent * 1.5);
  return rent;
}

export function netWorth(state, player) {
  let n = player.cash + player.deposit;
  for (const cell of state.cells) {
    if (cell.owner !== player.id) continue;
    n += cell.price + upgradeCost(cell) * (cell.level || 0);
  }
  return n;
}

export function previewPath(state, from, dir, steps, walkerId = -1) {
  const path = [];
  let pos = from;
  const n = Math.max(0, steps | 0);
  for (let s = 0; s < n; s++) {
    pos = wrap(pos + dir);
    path.push(pos);
    const trap = trapAt(state, pos);
    if (!trap) continue;
    if (trap.kind === "block") break;
    if (trap.kind === "mine" && trap.owner !== walkerId) break;
  }
  return path;
}

function canAbsorb(player) {
  return !!(player && (player.god?.id === "fortune" || player.items.includes("shield")));
}

function salaryPacket(player) {
  let salary = SALARY;
  if (player.god?.id === "poor") salary = 0;
  else if (player.god?.id === "wealth") salary = Math.round(SALARY * 1.5);
  const interest = Math.round(player.deposit * 0.1);
  return { salary, interest };
}

export function planRoll(state, face) {
  if (!state || state.phase !== "idle" || state.phase === "ended") return null;
  const player = current(state);
  if (!player || player.bankrupt) return null;
  let value;
  let remote = false;
  if (player.remote) {
    value = player.remote;
    player.remote = 0;
    remote = true;
  } else {
    value = face == null ? 1 + Math.floor(state.rng() * 6) : face | 0;
    value = Math.max(1, Math.min(6, value));
    if (player.god?.id === "weak") value = Math.max(1, value - 1);
  }
  const full = previewPath(state, player.position, player.dir, value, player.id);
  const events = [];
  let carried = player.bomb ? { fuse: player.bomb.fuse, ownerId: player.bomb.ownerId } : null;
  const walked = [];
  let hospital = false;
  for (const idx of full) {
    walked.push(idx);
    if (carried) {
      carried = { fuse: carried.fuse - 1, ownerId: carried.ownerId };
      if (carried.fuse <= 0) {
        events.push({ type: "explode", at: idx, ownerId: carried.ownerId });
        carried = null;
        hospital = true;
        break;
      }
    }
    const trap = trapAt(state, idx);
    if (trap?.kind === "bomb" && !carried) {
      const shielded = canAbsorb(player);
      events.push({
        type: "stick",
        id: trap.id,
        at: idx,
        fuse: trap.fuse || 8,
        ownerId: trap.owner,
        shielded,
      });
      if (!shielded) carried = { fuse: trap.fuse || 8, ownerId: trap.owner };
    } else if (trap?.kind === "block") {
      events.push({ type: "block", id: trap.id, at: idx });
    } else if (trap?.kind === "mine" && trap.owner !== player.id) {
      const shielded = canAbsorb(player);
      events.push({
        type: "mine",
        id: trap.id,
        at: idx,
        shielded,
        ownerId: trap.owner,
        fee: MINE_FEE,
      });
      if (!shielded) hospital = true;
    }
  }
  const landing = walked[walked.length - 1];
  if (player.dir > 0 && walked.includes(START_INDEX)) {
    events.unshift({ type: "salary", ...salaryPacket(player) });
  }
  return {
    face: value,
    remote,
    path: walked,
    landing,
    events,
    hospital,
    from: player.position,
    bomb: hospital ? null : carried,
  };
}

function give(state, id, amount) {
  if (id == null || amount <= 0) return;
  const player = state.players[id];
  if (!player || player.bankrupt) return;
  player.cash += amount;
}

export function sellOptions(state, playerId) {
  const player = state.players[playerId];
  if (!player || player.bankrupt) return [];
  const out = [];
  if (player.deposit > 0) {
    out.push({
      kind: "deposit",
      amount: player.deposit,
      label: `取出存款 $${player.deposit}`,
    });
  }
  for (const cell of state.cells) {
    if (cell.owner !== playerId) continue;
    if ((cell.level || 0) > 0) {
      const amount = Math.round(upgradeCost(cell) * 0.5);
      out.push({
        kind: "level",
        cell: cell.index,
        amount,
        label: `${cell.name} ${levelName(cell.level)} 拆一级，得 $${amount}`,
      });
    } else if (cell.type === "property") {
      const amount = Math.round(cell.price * 0.5);
      out.push({
        kind: "land",
        cell: cell.index,
        amount,
        label: `卖掉${cell.name}，得 $${amount}`,
      });
    }
  }
  out.sort((a, b) => b.amount - a.amount);
  return out;
}

export function applySell(state, playerId, option) {
  const player = state.players[playerId];
  if (!player || player.bankrupt || !option) return false;
  if (option.kind === "deposit") {
    if (player.deposit <= 0) return false;
    player.cash += player.deposit;
    log(state, `${player.name} 取出存款 $${player.deposit}`);
    player.deposit = 0;
    return true;
  }
  const cell = state.cells[option.cell];
  if (!cell || cell.owner !== playerId) return false;
  if (option.kind === "level") {
    if ((cell.level || 0) <= 0) return false;
    const amount = Math.round(upgradeCost(cell) * 0.5);
    cell.level -= 1;
    player.cash += amount;
    log(state, `${player.name} 拆掉 ${cell.name} 一级，收回 $${amount}`);
    return true;
  }
  if (option.kind === "land") {
    if ((cell.level || 0) > 0 || cell.type !== "property") return false;
    const amount = Math.round(cell.price * 0.5);
    cell.owner = null;
    cell.level = 0;
    player.cash += amount;
    log(state, `${player.name} 卖掉 ${cell.name}，收回 $${amount}`);
    return true;
  }
  return false;
}

function crown(state, player, message) {
  const rows = alivePlayers(state)
    .map((p) => ({ id: p.id, name: p.name, worth: netWorth(state, p), color: p.color }))
    .sort((a, b) => b.worth - a.worth);
  state.rankings = rows;
  state.winner = player ? player.id : rows[0]?.id ?? null;
  state.phase = "ended";
  state.pending = null;
  state.message = message || (player ? `${player.name} 是最后的富翁` : "金城收市");
  log(state, state.message);
}

function bankrupt(state, playerId, creditorId) {
  const player = state.players[playerId];
  if (!player || player.bankrupt) return;
  if (player.cash > 0) give(state, creditorId, player.cash);
  player.cash = 0;
  player.deposit = 0;
  player.items = [];
  player.god = null;
  player.halt = 0;
  player.haltWhy = "";
  player.remote = 0;
  player.bomb = null;
  player.bankrupt = true;
  for (const cell of state.cells) {
    if (cell.owner === playerId) {
      cell.owner = null;
      cell.level = 0;
    }
  }
  state.traps = state.traps.filter((t) => t.owner !== playerId);
  log(state, `${player.name} 破产离场`);
  const left = alivePlayers(state);
  if (left.length <= 1) crown(state, left[0] || null);
}

function forcePay(state, fromId, toId, amount, reason) {
  const from = state.players[fromId];
  if (!from || from.bankrupt) return "dead";
  let guard = 0;
  while (from.cash < amount && !from.bankrupt && guard++ < 48) {
    const opt = sellOptions(state, fromId)[0];
    if (!opt) break;
    applySell(state, fromId, opt);
  }
  if (from.cash >= amount) {
    from.cash -= amount;
    give(state, toId, amount);
    log(state, `${from.name} 支付 $${amount}（${reason}）`);
    return "ok";
  }
  log(state, `${from.name} 付不出 ${reason}`);
  bankrupt(state, fromId, toId);
  return "bust";
}

function pay(state, fromId, toId, amount, reason, resume = "between", ackText = null) {
  const from = state.players[fromId];
  if (!from || from.bankrupt) return "dead";
  if (!from.isHuman || from.auto) return forcePay(state, fromId, toId, amount, reason);
  if (from.cash >= amount) {
    from.cash -= amount;
    give(state, toId, amount);
    log(state, `${from.name} 支付 $${amount}（${reason}）`);
    return "ok";
  }
  state.pending = {
    type: "liquidate",
    payerId: fromId,
    creditorId: toId,
    due: amount,
    reason,
    resume,
    ackText,
  };
  state.phase = "resolve";
  state.message = `${from.name} 要付 $${amount}（${reason}），先变卖凑钱`;
  return "debt";
}

function absorb(state, player) {
  if (!player) return false;
  if (player.god?.id === "fortune") {
    log(state, `${player.name} 的福神挡下了灾祸`);
    return true;
  }
  const i = player.items.indexOf("shield");
  if (i >= 0) {
    player.items.splice(i, 1);
    log(state, `${player.name} 用掉一张护身符`);
    return true;
  }
  return false;
}

function setBetween(state, message) {
  if (state.phase === "ended") return;
  state.pending = null;
  state.phase = "between";
  if (message) state.message = message;
}

function setAck(state, text) {
  if (state.phase === "ended") return;
  state.pending = { type: "ack", text, payerId: current(state).id };
  state.phase = "resolve";
  state.message = text;
}

function removeTrap(state, id) {
  state.traps = state.traps.filter((t) => t.id !== id);
}

function applyEvent(state, event) {
  const player = current(state);
  if (event.type === "salary") {
    player.cash += event.salary;
    player.deposit += event.interest;
    const bits = [];
    if (event.salary) bits.push(`俸禄 $${event.salary}`);
    if (event.interest) bits.push(`存款利息 $${event.interest}`);
    log(state, bits.length ? `${player.name} 经过金城门，${bits.join("，")}` : `${player.name} 经过金城门`);
  } else if (event.type === "block") {
    removeTrap(state, event.id);
    log(state, `${player.name} 被路障拦住`);
  } else if (event.type === "mine") {
    removeTrap(state, event.id);
    if (event.shielded) {
      absorb(state, player);
      log(state, `${player.name} 避开了地雷`);
    } else {
      forcePay(state, player.id, event.ownerId, event.fee, "地雷医药费");
    }
  } else if (event.type === "stick") {
    removeTrap(state, event.id);
    if (event.shielded) {
      absorb(state, player);
      log(state, `${player.name} 挡下了定时炸弹`);
    } else {
      log(state, `${player.name} 贴上定时炸弹，还要再走 ${event.fuse} 步`);
    }
  } else if (event.type === "explode") {
    const cell = state.cells[event.at];
    if (cell?.type === "property" && (cell.level || 0) > 0) {
      cell.level -= 1;
      log(state, `定时炸弹炸坏 ${cell.name}，降为${levelName(cell.level)}`);
    }
    log(state, `${player.name} 身上的定时炸弹炸开了`);
    if (!player.bankrupt && state.phase !== "ended") {
      forcePay(state, player.id, event.ownerId, BOMB_FEE, "炸弹医药费");
    }
  }
}

function giveItem(state, player, toolId) {
  if (player.items.length >= BAG_LIMIT) {
    player.cash += 300;
    log(state, `${player.name} 的行囊满了，改领 $${300}`);
    return;
  }
  player.items.push(toolId);
  log(state, `${player.name} 得到「${TOOLS[toolId].name}」`);
}

function setGod(state, player, godId) {
  const spec = GODS[godId];
  player.god = { id: godId, left: spec.left };
  log(state, `${player.name} 附上${spec.name}，持续 ${spec.left} 个自己的回合`);
}

function flyTo(state, index) {
  const player = current(state);
  if (player.position !== index) state.extraHop = index;
  player.position = index;
}

function cardById(deck, id) {
  const list = deck === "chance" ? CHANCE_CARDS : FATE_CARDS;
  return list.find((c) => c.id === id) || { id: "unknown", text: "牌面模糊，什么也没发生。" };
}

function drawCard(state, deck) {
  if (!state.decks[deck].length) {
    const list = deck === "chance" ? CHANCE_CARDS : FATE_CARDS;
    state.decks[deck] = shuffle(state.rng, list.map((c) => c.id));
  }
  const id = state.decks[deck].pop();
  return cardById(deck, id);
}

function blockedPunish(state, player, text) {
  if (!absorb(state, player)) return false;
  setAck(state, `${text} 被挡下了。`);
  return true;
}

function punishBill(state, amount, reason, text) {
  const player = current(state);
  if (blockedPunish(state, player, text)) return;
  const res = pay(state, player.id, null, amount, reason, "ack", text);
  if (res === "debt") return;
  if (state.phase !== "ended") setAck(state, text);
}

function applyCard(state, card) {
  const player = current(state);
  const text = card.text;
  switch (card.id) {
    case "bonus-gate": {
      flyTo(state, START_INDEX);
      const pack = salaryPacket(player);
      player.cash += pack.salary;
      player.deposit += pack.interest;
      const extra = pack.salary ? ` 领取 $${pack.salary}` : " 穷神把俸禄收走了";
      setAck(state, text + extra);
      break;
    }
    case "purse":
      player.cash += 1500;
      setAck(state, `${text} 得到 $1500。`);
      break;
    case "feast":
      punishBill(state, 800, "请客", text);
      break;
    case "back3": {
      const next = wrap(player.position - player.dir * 3);
      flyTo(state, next);
      setAck(state, `${text} 现在在「${state.cells[next].name}」。`);
      break;
    }
    case "to-hospital":
      if (blockedPunish(state, player, text)) break;
      flyTo(state, HOSPITAL_INDEX);
      player.halt = Math.max(player.halt, 1);
      player.haltWhy = "hospital";
      setAck(state, text);
      break;
    case "gain-block":
      giveItem(state, player, "block");
      setAck(state, text);
      break;
    case "windfall":
      player.cash += 2000;
      setAck(state, `${text} 得到 $2000。`);
      break;
    case "levy":
      punishBill(state, 1000, "摊派", text);
      break;
    case "to-park":
      flyTo(state, 16);
      player.cash += 300;
      setAck(state, `${text} 茶水 $300。`);
      break;
    case "interest": {
      const bonus = Math.max(100, Math.round(player.deposit * 0.15));
      player.deposit += bonus;
      setAck(state, `${text} 存款增加 $${bonus}。`);
      break;
    }
    case "gain-remote":
      giveItem(state, player, "remote");
      setAck(state, text);
      break;
    case "collect": {
      let got = 0;
      for (const other of alivePlayers(state)) {
        if (other.id === player.id) continue;
        const payAmt = Math.min(400, other.cash);
        other.cash -= payAmt;
        got += payAmt;
      }
      player.cash += got;
      setAck(state, `${text} 一共 $${got}。`);
      break;
    }
    case "god-wealth":
      setGod(state, player, "wealth");
      setAck(state, text);
      break;
    case "god-poor":
      if (blockedPunish(state, player, text)) break;
      setGod(state, player, "poor");
      setAck(state, text);
      break;
    case "god-fortune":
      setGod(state, player, "fortune");
      setAck(state, text);
      break;
    case "god-weak":
      if (blockedPunish(state, player, text)) break;
      setGod(state, player, "weak");
      setAck(state, text);
      break;
    case "legacy":
      player.cash += 3000;
      setAck(state, `${text} 得到 $3000。`);
      break;
    case "stolen":
      punishBill(state, 1500, "失窃", text);
      break;
    case "split": {
      const others = alivePlayers(state).filter((p) => p.id !== player.id);
      const rich = others.sort((a, b) => b.cash - a.cash)[0];
      if (!rich || rich.cash <= player.cash) {
        setAck(state, `${text} 你已经不比别人少。`);
        break;
      }
      const sum = player.cash + rich.cash;
      const avg = Math.floor(sum / 2);
      player.cash = avg;
      rich.cash = sum - avg;
      setAck(state, `${text} 与${rich.name}平分后各持约 $${avg}。`);
      break;
    }
    case "free-up": {
      const owned = state.cells.filter((c) => c.owner === player.id && c.type === "property" && (c.level || 0) < 3);
      if (!owned.length) {
        player.cash += 500;
        setAck(state, `${text} 你还没有可盖的地，改领 $500。`);
        break;
      }
      const cell = owned[Math.floor(state.rng() * owned.length)];
      cell.level += 1;
      setAck(state, `${text} ${cell.name} 成为${levelName(cell.level)}。`);
      break;
    }
    case "typhoon": {
      const piles = state.cells.filter((c) => c.type === "property" && (c.level || 0) > 0 && c.owner !== player.id);
      piles.sort((a, b) => b.level - a.level || b.price - a.price);
      const cell = piles[0];
      if (!cell) {
        setAck(state, `${text} 城里没有可吹坏的房子。`);
        break;
      }
      const owner = state.players[cell.owner];
      if (absorb(state, owner)) {
        setAck(state, `${text} ${owner.name} 挡住了，${cell.name} 无恙。`);
        break;
      }
      cell.level -= 1;
      setAck(state, `${text} ${cell.name} 降为${levelName(cell.level)}。`);
      break;
    }
    case "to-jail":
      if (blockedPunish(state, player, text)) break;
      flyTo(state, JAIL_INDEX);
      player.halt = Math.max(player.halt, 1);
      player.haltWhy = "jail";
      setAck(state, text);
      break;
    case "gain-shield":
      giveItem(state, player, "shield");
      setAck(state, text);
      break;
    case "tea":
      player.cash += 200;
      setAck(state, `${text} 找回 $200。`);
      break;
    default:
      setAck(state, text);
  }
}

function doUpgrade(state, cell) {
  const player = current(state);
  const cost = upgradeCost(cell);
  if (!cell || cell.owner !== player.id || (cell.level || 0) >= 3) return false;
  if (player.cash < cost) return false;
  player.cash -= cost;
  cell.level += 1;
  log(state, `${player.name} 把 ${cell.name} 盖成${levelName(cell.level)}，花费 $${cost}`);
  return true;
}

function resolveLanding(state) {
  if (state.phase === "ended") return;
  const player = current(state);
  const cell = state.cells[player.position];
  const who = player.id;

  if (cell.type === "property") {
    if (cell.owner == null) {
      state.pending = { type: "buy", cell: cell.index, payerId: who };
      state.phase = "resolve";
      state.message = `「${cell.name}」无主，地价 $${cell.price}`;
      return;
    }
    if (cell.owner === who) {
      if ((cell.level || 0) >= 3) {
        setBetween(state, `${cell.name} 已是大厦`);
        return;
      }
      state.pending = { type: "upgrade", cell: cell.index, payerId: who };
      state.phase = "resolve";
      state.message = `站在自家的 ${cell.name}，可花 $${upgradeCost(cell)} 升级`;
      return;
    }
    const owner = state.players[cell.owner];
    if (player.items.includes("waiver")) {
      player.items.splice(player.items.indexOf("waiver"), 1);
      log(state, `${player.name} 用免单符挡下了 ${cell.name} 的租金`);
      setBetween(state, `${player.name} 免掉了这次租金`);
      return;
    }
    const rent = rentAmount(state, cell, who);
    const res = pay(state, who, owner.id, rent, `${cell.name} 租金`, "between");
    if (res === "ok") setBetween(state, `${player.name} 向 ${owner.name} 付了 $${rent} 租金`);
    else if (res === "bust" && state.phase !== "ended") setBetween(state, `${player.name} 付租破产`);
    return;
  }

  if (cell.type === "start") {
    setBetween(state, `${player.name} 站在金城门`);
    return;
  }
  if (cell.type === "park") {
    player.cash += 300;
    setBetween(state, `${player.name} 在公园歇脚，茶水 $300`);
    return;
  }
  if (cell.type === "tax") {
    if (absorb(state, player)) {
      setBetween(state, `${player.name} 挡住了税单`);
      return;
    }
    const due = Math.max(200, Math.round(player.cash * 0.1));
    const res = pay(state, who, null, due, "税款", "between");
    if (res === "ok") setBetween(state, `${player.name} 缴税 $${due}`);
    else if (res === "bust" && state.phase !== "ended") setBetween(state, `${player.name} 缴税破产`);
    return;
  }
  if (cell.type === "chance" || cell.type === "fate") {
    const card = drawCard(state, cell.type);
    log(state, `${player.name} 抽到：${card.text}`);
    applyCard(state, card);
    return;
  }
  if (cell.type === "shop") {
    state.pending = { type: "shop", payerId: who, bought: false };
    state.phase = "resolve";
    state.message = "杂货铺开着，行囊最多六件";
    return;
  }
  if (cell.type === "bank") {
    state.pending = { type: "bank", payerId: who, acted: false };
    state.phase = "resolve";
    state.message = `钱庄：现金 $${player.cash}，存款 $${player.deposit}`;
    return;
  }
  if (cell.type === "lottery") {
    state.pending = { type: "lottery", payerId: who };
    state.phase = "resolve";
    state.message = `彩票一注 $${LOTTERY_STAKE}，开出 6 点赢得 $2000`;
    return;
  }
  if (cell.type === "temple") {
    const ids = Object.keys(GODS);
    const godId = ids[Math.floor(state.rng() * ids.length)];
    setGod(state, player, godId);
    setAck(state, `土地庙请来${GODS[godId].name}。${GODS[godId].blurb}`);
    return;
  }
  if (cell.type === "hospital") {
    setBetween(state, `${player.name} 进医馆看了看，没有留医`);
    return;
  }
  if (cell.type === "jail") {
    if (absorb(state, player)) {
      setBetween(state, `${player.name} 在拘所门口被放行`);
      return;
    }
    player.halt = Math.max(player.halt, 1);
    player.haltWhy = "jail";
    setBetween(state, `${player.name} 被请入拘所，下回合可交保释`);
    return;
  }
  setBetween(state, `${player.name} 经过 ${cell.name}`);
}

export function commitRoll(state, plan) {
  if (!plan || state.phase !== "idle") return { ok: false };
  const player = current(state);
  state.extraHop = null;
  state.lastDie = plan.face;
  log(state, `${player.name} 掷出 ${plan.face}，走向「${state.cells[plan.landing].name}」`);
  for (const event of plan.events) {
    applyEvent(state, event);
    if (state.phase === "ended") return { ok: true, plan };
  }
  if (!player.bankrupt) player.bomb = plan.hospital ? null : plan.bomb || null;
  if (plan.hospital) {
    if (!player.bankrupt) {
      player.position = HOSPITAL_INDEX;
      player.halt = Math.max(player.halt, 2);
      player.haltWhy = "hospital";
      player.bomb = null;
    }
    if (state.phase !== "ended") {
      const boom = plan.events.some((event) => event.type === "explode");
      setBetween(state, boom ? `${player.name} 被炸弹送进医馆` : `${player.name} 踩中地雷，被送进医馆`);
    }
    return { ok: true, plan };
  }
  player.position = plan.landing;
  resolveLanding(state);
  return { ok: true, plan };
}

function finishDebt(state) {
  const pending = state.pending;
  const from = state.players[pending.payerId];
  if (from.cash < pending.due) return false;
  from.cash -= pending.due;
  give(state, pending.creditorId, pending.due);
  log(state, `${from.name} 凑齐 $${pending.due}（${pending.reason}）`);
  const resume = pending.resume;
  const ackText = pending.ackText;
  if (state.phase === "ended") return true;
  if (resume === "ack") {
    setAck(state, ackText || "款项已付清");
    return true;
  }
  if (resume === "end-continue") {
    state.pending = null;
    endTurn(state);
    return true;
  }
  if (resume === "idle-back") {
    state.pending = null;
    if (state.phase !== "ended") {
      const actor = current(state);
      if (actor.bankrupt) setBetween(state, `${actor.name} 破产了`);
      else {
        state.phase = "idle";
        state.message = `${from.name} 付清了${pending.reason}`;
      }
    }
    return true;
  }
  setBetween(state, `${from.name} 付清了${pending.reason}`);
  return true;
}

function afterBust(state, pending) {
  if (state.phase === "ended") return;
  if (pending?.resume === "ack") {
    setAck(state, pending.ackText || "有人破产了");
    return;
  }
  if (pending?.resume === "end-continue") {
    state.pending = null;
    endTurn(state);
    return;
  }
  if (pending?.resume === "idle-back") {
    state.pending = null;
    const actor = current(state);
    if (actor.bankrupt) setBetween(state, `${actor.name} 破产了`);
    else {
      state.phase = "idle";
      state.message = "对手破产离场";
    }
    return;
  }
  setBetween(state, state.message);
}

export function buildTargets(state, playerId = current(state).id) {
  const player = state.players[playerId];
  if (!player) return [];
  return state.cells.filter(
    (c) => c.owner === playerId && c.type === "property" && (c.level || 0) < 3 && player.cash >= upgradeCost(c)
  );
}

export function buildOn(state, index) {
  if (state.phase !== "idle" && state.pending?.type !== "build") return { ok: false, error: "现在不能盖楼" };
  if (state.built) return { ok: false, error: "这回合已经盖过楼" };
  const cell = state.cells[index];
  if (!doUpgrade(state, cell)) return { ok: false, error: "盖不了" };
  state.built = true;
  if (state.pending?.type === "build") {
    state.pending = null;
    state.phase = "idle";
  }
  state.message = `${cell.name} 现在是${levelName(cell.level)}`;
  return { ok: true };
}

export function openBuild(state) {
  if (state.phase !== "idle") return { ok: false, error: "现在不能盖楼" };
  if (state.built) return { ok: false, error: "这回合已经盖过楼" };
  if (!buildTargets(state).length) return { ok: false, error: "没有盖得起的房子" };
  state.pending = { type: "build", payerId: current(state).id };
  state.phase = "resolve";
  state.message = "选一块自家的地盖高一级";
  return { ok: true };
}

export function openSell(state) {
  if (state.phase !== "idle") return { ok: false, error: "现在不能变卖" };
  if (!sellOptions(state, current(state).id).length) return { ok: false, error: "没有可卖的产业" };
  state.pending = { type: "pawn", payerId: current(state).id };
  state.phase = "resolve";
  state.message = "半价变卖。房子要先拆掉，才能卖地。";
  return { ok: true };
}

export function toolCells(state, tool) {
  const player = current(state);
  if (tool === "block") {
    const cells = [];
    let pos = player.position;
    for (let s = 1; s <= 8; s++) {
      pos = wrap(pos + player.dir);
      if (pos !== START_INDEX && !trapAt(state, pos)) cells.push(pos);
    }
    return cells;
  }
  if (tool === "mine" || tool === "bomb") {
    const cells = [];
    for (let i = 0; i < CELL_COUNT; i++) {
      if (i === START_INDEX || i === HOSPITAL_INDEX || i === JAIL_INDEX) continue;
      if (trapAt(state, i)) continue;
      cells.push(i);
    }
    return cells;
  }
  return [];
}

function takeItem(player, tool) {
  const i = player.items.indexOf(tool);
  if (i < 0) return false;
  player.items.splice(i, 1);
  return true;
}

export function useTool(state, spec) {
  if (!state || state.phase !== "idle") return { ok: false, error: "现在不能用道具" };
  if (state.toolUsed) return { ok: false, error: "这回合用过道具了" };
  const player = current(state);
  const tool = spec?.tool;
  if (!TOOLS[tool]) return { ok: false, error: "没有这种道具" };
  if (!player.items.includes(tool)) return { ok: false, error: "行囊里没有" };

  if (tool === "remote") {
    const face = spec.face | 0;
    if (face < 1 || face > 6) return { ok: false, error: "点数要在 1 到 6" };
    takeItem(player, tool);
    player.remote = face;
    state.toolUsed = true;
    log(state, `${player.name} 使用遥控骰子，指定 ${face} 点`);
    return { ok: true, roll: true };
  }

  if (tool === "reverse") {
    takeItem(player, tool);
    player.dir *= -1;
    state.toolUsed = true;
    log(state, `${player.name} 掉过头来走`);
    state.message = player.dir > 0 ? "现在顺时针走" : "现在逆时针走";
    return { ok: true };
  }

  if (tool === "block" || tool === "mine" || tool === "bomb") {
    const cell = spec.cell | 0;
    if (!toolCells(state, tool).includes(cell)) return { ok: false, error: "不能放在那里" };
    takeItem(player, tool);
    const trap = { id: state.trapSeq++, kind: tool, at: cell, owner: player.id };
    if (tool === "bomb") trap.fuse = 8;
    state.traps.push(trap);
    state.toolUsed = true;
    log(state, `${player.name} 在「${state.cells[cell].name}」放下${TOOLS[tool].name}`);
    state.message = `已放置${TOOLS[tool].name}`;
    return { ok: true };
  }

  if (tool === "stay") {
    const target = state.players[spec.playerId];
    if (!target || target.bankrupt || target.id === player.id) return { ok: false, error: "要选一名对手" };
    takeItem(player, tool);
    target.halt += 1;
    if (!target.haltWhy) target.haltWhy = "stay";
    state.toolUsed = true;
    log(state, `${player.name} 让 ${target.name} 停留一回合`);
    state.message = `${target.name} 下回合停下`;
    return { ok: true };
  }

  if (tool === "equalize") {
    const target = state.players[spec.playerId];
    if (!target || target.bankrupt || target.id === player.id) return { ok: false, error: "要选一名对手" };
    takeItem(player, tool);
    const sum = player.cash + target.cash;
    const avg = Math.floor(sum / 2);
    player.cash = avg;
    target.cash = sum - avg;
    state.toolUsed = true;
    log(state, `${player.name} 与 ${target.name} 均富，现金拉平`);
    state.message = `双方现金约为 $${avg}`;
    return { ok: true };
  }

  if (tool === "demolish") {
    const cell = state.cells[spec.cell];
    if (!cell || cell.type !== "property" || cell.owner == null || cell.owner === player.id || (cell.level || 0) <= 0) {
      return { ok: false, error: "要选别人有房子的地" };
    }
    const owner = state.players[cell.owner];
    takeItem(player, tool);
    state.toolUsed = true;
    if (absorb(state, owner)) {
      state.message = `${owner.name} 挡住了拆迁`;
      return { ok: true };
    }
    cell.level -= 1;
    log(state, `${player.name} 拆迁 ${cell.name}，现为${levelName(cell.level)}`);
    state.message = `${cell.name} 降为${levelName(cell.level)}`;
    return { ok: true };
  }

  if (tool === "tax") {
    const target = state.players[spec.playerId];
    if (!target || target.bankrupt || target.id === player.id) return { ok: false, error: "要选一名对手" };
    takeItem(player, tool);
    state.toolUsed = true;
    if (absorb(state, target)) {
      state.message = `${target.name} 挡住了查税`;
      return { ok: true };
    }
    const due = Math.max(100, Math.round(target.cash * 0.15));
    const res = pay(state, target.id, player.id, due, "查税", "idle-back");
    if (res === "ok") state.message = `${target.name} 缴了 $${due}`;
    else if (res === "bust" && state.phase !== "ended") state.message = `${target.name} 被查税破产`;
    if (res !== "debt" && state.phase === "idle") {
      /* 查税发生在自己的回合，付清后继续 */
    }
    if (res === "debt") return { ok: true };
    if (state.phase !== "ended" && state.phase !== "resolve") state.phase = "idle";
    return { ok: true };
  }

  if (tool === "sweep") {
    takeItem(player, tool);
    state.toolUsed = true;
    let pos = player.position;
    let cleared = 0;
    for (let step = 1; step <= 6; step++) {
      pos = wrap(pos + player.dir);
      const trap = trapAt(state, pos);
      if (!trap) continue;
      removeTrap(state, trap.id);
      cleared += 1;
    }
    log(state, cleared ? `${player.name} 清掉前方 ${cleared} 处障碍` : `${player.name} 清了道，前方是空的`);
    state.message = cleared ? `清掉 ${cleared} 处障碍` : "前方没有障碍";
    return { ok: true };
  }

  if (tool === "shield") return { ok: false, error: "护身符会在遇险时自动用掉" };
  if (tool === "waiver") return { ok: false, error: "免单符会在付租时自动用掉" };
  return { ok: false, error: "用不了" };
}

function tickBombs() {
  // 地上的炸弹要等人踩上才贴身，之后按步数倒数，不在回合结束时自行爆炸。
}

function finishByScore(state) {
  const rows = alivePlayers(state)
    .map((p) => ({ id: p.id, name: p.name, worth: netWorth(state, p), color: p.color }))
    .sort((a, b) => b.worth - a.worth || a.id - b.id);
  state.rankings = rows;
  state.winner = rows[0]?.id ?? null;
  state.phase = "ended";
  state.pending = null;
  const top = rows[0];
  state.message = top ? `收市。${top.name} 以资产 $${top.worth} 居首` : "收市";
  log(state, state.message);
}

function openTurn(state, guard) {
  if (state.phase === "ended") return;
  const player = current(state);
  if (guard > 48) {
    player.halt = 0;
    player.haltWhy = "";
  }
  if (player.god) {
    player.god.left -= 1;
    if (player.god.left <= 0) {
      log(state, `${player.name} 身上的${GODS[player.god.id].name}离开了`);
      player.god = null;
    }
  }
  if (player.halt > 0 && (player.haltWhy === "jail" || player.haltWhy === "hospital")) {
    state.pending = {
      type: player.haltWhy === "jail" ? "bail" : "release",
      payerId: player.id,
    };
    state.phase = "resolve";
    state.message =
      player.haltWhy === "jail"
        ? `${player.name} 在拘所，保释 $${BAIL}`
        : `${player.name} 在医馆，出院 $${RELEASE}`;
    return;
  }
  if (player.halt > 0) {
    player.halt -= 1;
    if (player.halt <= 0) player.haltWhy = "";
    log(state, `${player.name} 停留，跳过本回合`);
    state.message = `${player.name} 停留一回合`;
    advance(state, guard + 1);
    return;
  }
  state.phase = "idle";
  state.pending = null;
  state.toolUsed = false;
  state.built = false;
  state.message = `轮到 ${player.name}`;
}

function advance(state, guard = 0) {
  if (state.phase === "ended") return;
  const left = alivePlayers(state);
  if (left.length <= 1) {
    crown(state, left[0] || null);
    return;
  }
  const prev = state.turn;
  let next = prev;
  for (let n = 0; n < state.players.length; n++) {
    next = (next + 1) % state.players.length;
    if (!state.players[next].bankrupt) break;
  }
  if (next <= prev) {
    state.day += 1;
    if (state.maxDay > 0 && state.day > state.maxDay) {
      finishByScore(state);
      return;
    }
  }
  state.turn = next;
  openTurn(state, guard);
}

export function endTurn(state) {
  if (!state || state.phase === "ended") return state;
  if (!state.bombsDone) {
    state.bombsDone = true;
    tickBombs(state);
    if (state.phase === "ended") return state;
    if (state.pending?.type === "liquidate") {
      state.pending.resume = "end-continue";
      state.phase = "resolve";
      return state;
    }
  }
  state.bombsDone = false;
  advance(state, 0);
  return state;
}

function findSell(state, choice) {
  return sellOptions(state, state.pending.payerId).find((opt) => {
    if (choice.kind === "deposit") return opt.kind === "deposit";
    return opt.kind === choice.kind && opt.cell === choice.cell;
  });
}

export function applyChoice(state, choice) {
  if (!state || state.phase !== "resolve" || !state.pending || !choice) {
    return { ok: false, error: "没有待决定的事" };
  }
  const pending = state.pending;
  const player = state.players[pending.payerId];

  if (pending.type === "buy") {
    const cell = state.cells[pending.cell];
    if (choice.type === "buy") {
      if (player.cash < cell.price) return { ok: false, error: "钱不够" };
      player.cash -= cell.price;
      cell.owner = player.id;
      cell.level = 0;
      log(state, `${player.name} 买下 ${cell.name}，花费 $${cell.price}`);
      setBetween(state, `${player.name} 买下了 ${cell.name}`);
      return { ok: true };
    }
    setBetween(state, `${player.name} 放过了 ${cell.name}`);
    return { ok: true };
  }

  if (pending.type === "upgrade") {
    const cell = state.cells[pending.cell];
    if (choice.type === "upgrade") {
      if (!doUpgrade(state, cell)) return { ok: false, error: "升级失败" };
      setBetween(state, `${cell.name} 现在是${levelName(cell.level)}`);
      return { ok: true };
    }
    setBetween(state, `${player.name} 没有在 ${cell.name} 盖楼`);
    return { ok: true };
  }

  if (pending.type === "build") {
    if (choice.type === "build") return buildOn(state, choice.cell);
    state.pending = null;
    state.phase = "idle";
    state.message = `轮到 ${player.name}`;
    return { ok: true };
  }

  if (pending.type === "pawn") {
    if (choice.type === "leave") {
      state.pending = null;
      state.phase = "idle";
      state.message = `轮到 ${player.name}`;
      return { ok: true };
    }
    if (choice.type === "sell") {
      const opt = findSell(state, choice);
      if (!opt || !applySell(state, pending.payerId, opt)) return { ok: false, error: "卖不了" };
      state.message = `现金 $${player.cash}`;
      if (!sellOptions(state, pending.payerId).length) {
        state.pending = null;
        state.phase = "idle";
      }
      return { ok: true };
    }
  }

  if (pending.type === "shop") {
    if (choice.type === "leave") {
      setBetween(state, `${player.name} 离开杂货铺`);
      return { ok: true };
    }
    if (choice.type === "buy-tool") {
      const spec = TOOLS[choice.tool];
      if (!spec) return { ok: false, error: "没有这种货" };
      if (player.items.length >= BAG_LIMIT) return { ok: false, error: "行囊已满" };
      if (player.cash < spec.price) return { ok: false, error: "钱不够" };
      player.cash -= spec.price;
      player.items.push(spec.id);
      pending.bought = true;
      log(state, `${player.name} 买了「${spec.name}」`);
      state.message = `买下${spec.name}。还可以再买，或离开`;
      return { ok: true };
    }
  }

  if (pending.type === "bank") {
    if (choice.type === "leave") {
      setBetween(state, `${player.name} 离开钱庄`);
      return { ok: true };
    }
    if (choice.type === "deposit") {
      const room = choice.mode === "spare" ? Math.max(0, player.cash - 4000) : player.cash;
      const amount = choice.mode === "half" ? Math.floor(player.cash / 2) : room;
      if (amount <= 0) return { ok: false, error: "没有可存的现金" };
      player.cash -= amount;
      player.deposit += amount;
      pending.acted = true;
      log(state, `${player.name} 存入 $${amount}`);
      state.message = `存款 $${player.deposit}，现金 $${player.cash}`;
      return { ok: true };
    }
    if (choice.type === "withdraw") {
      const amount = choice.mode === "half" ? Math.floor(player.deposit / 2) : player.deposit;
      if (amount <= 0) return { ok: false, error: "没有存款" };
      player.deposit -= amount;
      player.cash += amount;
      pending.acted = true;
      log(state, `${player.name} 取出 $${amount}`);
      state.message = `存款 $${player.deposit}，现金 $${player.cash}`;
      return { ok: true };
    }
  }

  if (pending.type === "lottery") {
    if (choice.type === "bet") {
      if (player.cash < LOTTERY_STAKE) return { ok: false, error: "钱不够" };
      const roll = 1 + Math.floor(state.rng() * 6);
      player.cash -= LOTTERY_STAKE;
      if (roll === 6) {
        player.cash += 2000;
        setAck(state, `开出 ${roll} 点，彩金 $2000`);
      } else {
        setAck(state, `开出 ${roll} 点，输掉 $${LOTTERY_STAKE}`);
      }
      return { ok: true };
    }
    setBetween(state, `${player.name} 没有买彩票`);
    return { ok: true };
  }

  if (pending.type === "bail" || pending.type === "release") {
    const cost = pending.type === "bail" ? BAIL : RELEASE;
    if (choice.type === "pay") {
      if (player.cash < cost) return { ok: false, error: "钱不够" };
      player.cash -= cost;
      player.halt = 0;
      player.haltWhy = "";
      state.pending = null;
      state.phase = "idle";
      state.toolUsed = false;
      state.built = false;
      log(state, `${player.name} 花 $${cost} 离开了`);
      state.message = `${player.name} 可以继续走`;
      return { ok: true };
    }
    player.halt -= 1;
    if (player.halt <= 0) player.haltWhy = "";
    setBetween(state, `${player.name} 又耽搁了一回合`);
    return { ok: true };
  }

  if (pending.type === "ack") {
    setBetween(state, pending.text);
    return { ok: true };
  }

  if (pending.type === "liquidate") {
    if (choice.type === "sell") {
      const opt = findSell(state, choice);
      if (!opt || !applySell(state, pending.payerId, opt)) return { ok: false, error: "卖不了" };
      if (player.cash >= pending.due) finishDebt(state);
      else state.message = `还差 $${pending.due - player.cash}`;
      return { ok: true };
    }
    if (choice.type === "bust") {
      if (sellOptions(state, pending.payerId).length && player.cash + worthQuick(state, player) > 0) {
        const leftover = sellOptions(state, pending.payerId);
        if (leftover.length) return { ok: false, error: "还有可卖的产业" };
      }
      const snapshot = pending;
      bankrupt(state, pending.payerId, pending.creditorId);
      afterBust(state, snapshot);
      return { ok: true };
    }
  }

  return { ok: false, error: "不能这样选" };
}

function worthQuick(state, player) {
  return sellOptions(state, player.id).reduce((sum, opt) => sum + opt.amount, 0);
}

export function promptText(state) {
  if (!state?.pending) return null;
  const pending = state.pending;
  const player = state.players[pending.payerId];
  if (pending.type === "buy") {
    const cell = state.cells[pending.cell];
    return { title: `买下${cell.name}？`, text: `地价 $${cell.price}。买下后，别人走到这里要付租。` };
  }
  if (pending.type === "upgrade") {
    const cell = state.cells[pending.cell];
    return {
      title: `升级${cell.name}`,
      text: `现在是${levelName(cell.level)}，花 $${upgradeCost(cell)} 可盖成${levelName((cell.level || 0) + 1)}。`,
    };
  }
  if (pending.type === "build") return { title: "盖楼", text: "选一块地盖高一级。盖完仍可以掷骰。" };
  if (pending.type === "pawn") return { title: "变卖", text: "银行半价回收。有房子时要先拆楼。" };
  if (pending.type === "shop") return { title: "杂货铺", text: state.message };
  if (pending.type === "bank") return { title: "钱庄", text: state.message };
  if (pending.type === "lottery") return { title: "彩票", text: state.message };
  if (pending.type === "bail") return { title: "拘所", text: `交 $${BAIL} 立刻出来，或在这里再耗一回合。` };
  if (pending.type === "release") return { title: "医馆", text: `交 $${RELEASE} 出院并继续走，或再休养一回合。` };
  if (pending.type === "ack") return { title: "城里消息", text: pending.text };
  if (pending.type === "liquidate") {
    return {
      title: "凑钱",
      text: `${player.name} 还要 $${Math.max(0, pending.due - player.cash)} 才付得起${pending.reason}。`,
    };
  }
  return { title: "决定", text: state.message || "" };
}

export function choices(state) {
  if (!state || state.phase !== "resolve" || !state.pending) return [];
  const pending = state.pending;
  const player = state.players[pending.payerId];
  const list = [];

  if (pending.type === "buy") {
    const cell = state.cells[pending.cell];
    list.push({ label: `买下 $${cell.price}`, choice: { type: "buy" } });
    list.push({ label: "放过", choice: { type: "skip" } });
  } else if (pending.type === "upgrade") {
    const cell = state.cells[pending.cell];
    list.push({ label: `升级 $${upgradeCost(cell)}`, choice: { type: "upgrade" } });
    list.push({ label: "先不盖", choice: { type: "skip" } });
  } else if (pending.type === "build") {
    for (const cell of buildTargets(state, player.id)) {
      list.push({
        label: `${cell.name} → ${levelName(cell.level + 1)}（$${upgradeCost(cell)}）`,
        choice: { type: "build", cell: cell.index },
      });
    }
    list.push({ label: "取消", choice: { type: "skip" } });
  } else if (pending.type === "pawn" || pending.type === "liquidate") {
    for (const opt of sellOptions(state, player.id)) {
      list.push({
        label: opt.label,
        choice: { type: "sell", kind: opt.kind, cell: opt.cell },
      });
    }
    if (pending.type === "pawn") list.push({ label: "返回", choice: { type: "leave" } });
    else list.push({ label: "宣告破产", choice: { type: "bust" } });
  } else if (pending.type === "shop") {
    for (const id of TOOL_ORDER) {
      const spec = TOOLS[id];
      if (player.cash < spec.price || player.items.length >= BAG_LIMIT) continue;
      list.push({ label: `${spec.name} $${spec.price}`, choice: { type: "buy-tool", tool: id }, blurb: spec.blurb });
    }
    list.push({ label: "离开", choice: { type: "leave" } });
  } else if (pending.type === "bank") {
    if (player.cash >= 1000) {
      list.push({ label: "存一半", choice: { type: "deposit", mode: "half" } });
      if (player.cash > 4000) {
        list.push({ label: "留下 $4000，其余存入", choice: { type: "deposit", mode: "spare" } });
      }
      list.push({ label: "全部存入", choice: { type: "deposit", mode: "all" } });
    }
    if (player.deposit > 0) {
      list.push({ label: "取出一半", choice: { type: "withdraw", mode: "half" } });
      list.push({ label: "全部取出", choice: { type: "withdraw", mode: "all" } });
    }
    list.push({ label: "离开", choice: { type: "leave" } });
  } else if (pending.type === "lottery") {
    if (player.cash >= LOTTERY_STAKE) list.push({ label: `押 $${LOTTERY_STAKE}`, choice: { type: "bet" } });
    list.push({ label: "不买", choice: { type: "skip" } });
  } else if (pending.type === "bail") {
    if (player.cash >= BAIL) list.push({ label: `保释 $${BAIL}`, choice: { type: "pay" } });
    list.push({ label: "再待一回合", choice: { type: "serve" } });
  } else if (pending.type === "release") {
    if (player.cash >= RELEASE) list.push({ label: `出院 $${RELEASE}`, choice: { type: "pay" } });
    list.push({ label: "继续休养", choice: { type: "serve" } });
  } else if (pending.type === "ack") {
    list.push({ label: "知道了", choice: { type: "ack" } });
  }
  return list;
}

function stepsUntil(from, dir, target) {
  let pos = from;
  for (let n = 1; n <= CELL_COUNT; n++) {
    pos = wrap(pos + dir);
    if (pos === target) return n;
  }
  return 99;
}

function scoreSteps(state, steps) {
  const player = current(state);
  const path = previewPath(state, player.position, player.dir, steps, player.id);
  if (!path.length) return -9999;
  const land = path[path.length - 1];
  const cell = state.cells[land];
  const trap = trapAt(state, land);
  if (trap?.kind === "mine" && trap.owner !== player.id && !canAbsorb(player)) return -2200;
  if (trap?.kind === "bomb" && !canAbsorb(player)) return -1500;
  if (cell.type === "property" && cell.owner == null) {
    if (player.cash >= cell.price + 1500) return 280 + Math.round(cell.price * 0.12);
    if (player.cash >= cell.price) return 40;
    return -80;
  }
  if (cell.owner === player.id) {
    if ((cell.level || 0) < 3 && player.cash >= upgradeCost(cell) + 2000) return 520 + (cell.level || 0) * 180;
    return 90;
  }
  if (cell.owner != null) return -rentAmount(state, cell, player.id);
  if (cell.type === "tax") return canAbsorb(player) ? 20 : -420;
  if (cell.type === "jail") return canAbsorb(player) ? 10 : -320;
  if (cell.type === "hospital") return -40;
  if (cell.type === "start") return 760;
  if (cell.type === "park") return 180;
  if (cell.type === "shop") return player.cash > 6000 ? 160 : 40;
  if (cell.type === "bank") return player.cash > 8000 ? 180 : 30;
  if (cell.type === "temple") return 80;
  if (cell.type === "lottery") return player.cash > 7000 ? 60 : -40;
  return 0;
}

function bestRemote(state) {
  let best = 1;
  let bestScore = -Infinity;
  let sum = 0;
  for (let face = 1; face <= 6; face++) {
    const score = scoreSteps(state, face);
    sum += score;
    if (score > bestScore) {
      bestScore = score;
      best = face;
    }
  }
  const avg = sum / 6;
  if (bestScore >= avg + 180 && bestScore >= 180) return best;
  return 0;
}

function aiTool(state) {
  const player = current(state);
  const has = (id) => player.items.includes(id);
  const foes = alivePlayers(state).filter((p) => p.id !== player.id);
  const richest = foes.slice().sort((a, b) => netWorth(state, b) - netWorth(state, a))[0];

  if (has("remote")) {
    const face = bestRemote(state);
    if (face) return { type: "tool", tool: "remote", face };
  }
  if (has("demolish")) {
    const piles = state.cells
      .filter((c) => c.type === "property" && c.owner != null && c.owner !== player.id && (c.level || 0) >= 2)
      .sort((a, b) => b.level - a.level || b.price - a.price);
    if (piles[0]) return { type: "tool", tool: "demolish", cell: piles[0].index };
  }
  if (has("tax") && richest && richest.cash >= 8000 && !canAbsorb(richest)) {
    return { type: "tool", tool: "tax", playerId: richest.id };
  }
  if (has("equalize") && richest && richest.cash > player.cash * 1.7 && richest.cash > 4000) {
    return { type: "tool", tool: "equalize", playerId: richest.id };
  }
  if (has("stay") && richest && netWorth(state, richest) > netWorth(state, player) + 4000) {
    return { type: "tool", tool: "stay", playerId: richest.id };
  }
  if (has("sweep")) {
    let pos = player.position;
    for (let step = 1; step <= 6; step++) {
      pos = wrap(pos + player.dir);
      const trap = trapAt(state, pos);
      if (trap && !(trap.kind === "mine" && trap.owner === player.id)) {
        return { type: "tool", tool: "sweep" };
      }
    }
  }
  if (has("mine")) {
    const mineCell = state.cells
      .filter((c) => c.owner === player.id && (c.level || 0) >= 1 && toolCells(state, "mine").includes(c.index))
      .sort((a, b) => (b.level || 0) - (a.level || 0) || b.price - a.price)[0];
    if (mineCell) return { type: "tool", tool: "mine", cell: mineCell.index };
  }
  if (has("block")) {
    let best = null;
    for (const foe of foes) {
      for (const cell of state.cells) {
        if (cell.owner !== player.id || cell.type !== "property") continue;
        const dist = stepsUntil(foe.position, foe.dir, cell.index);
        if (dist < 2 || dist > 7 || !toolCells(state, "block").includes(cell.index)) continue;
        const rent = rentAmount(state, cell, foe.id);
        if (!best || rent > best.rent) best = { cell: cell.index, rent };
      }
    }
    if (best && best.rent >= 500) return { type: "tool", tool: "block", cell: best.cell };
  }
  if (has("bomb") && richest) {
    const at = previewPath(state, richest.position, richest.dir, 3, richest.id).slice(-1)[0];
    if (at != null && toolCells(state, "bomb").includes(at)) return { type: "tool", tool: "bomb", cell: at };
  }
  if (has("reverse")) {
    const forward = [1, 2, 3, 4, 5, 6].reduce((s, n) => s + scoreSteps(state, n), 0);
    player.dir *= -1;
    const back = [1, 2, 3, 4, 5, 6].reduce((s, n) => s + scoreSteps(state, n), 0);
    player.dir *= -1;
    if (back > forward + 500) return { type: "tool", tool: "reverse" };
  }
  return null;
}

function bestBuild(state) {
  const player = current(state);
  const cells = buildTargets(state).slice().sort((a, b) => b.price - a.price || (a.level || 0) - (b.level || 0));
  for (const cell of cells) {
    const cost = upgradeCost(cell);
    if (player.cash - cost < 2500) continue;
    if ((cell.level || 0) === 0 && cell.price < 2800) continue;
    return cell.index;
  }
  return null;
}

function pickShopTool(state) {
  const player = current(state);
  if (player.cash < 6000) return null;
  const order = ["remote", "mine", "sweep", "block", "waiver", "shield", "bomb", "demolish", "tax", "stay", "equalize", "reverse"];
  for (const id of order) {
    if (player.items.includes(id)) continue;
    if (player.cash >= TOOLS[id].price + 2500) return id;
  }
  return null;
}

function pickResolve(state, list) {
  const pending = state.pending;
  const player = state.players[pending.payerId];
  const find = (type) => list.find((item) => item.choice.type === type);

  if (pending.type === "buy") {
    const price = state.cells[pending.cell].price;
    const want = player.cash >= price && player.cash - price >= 1500 && price <= player.cash * 0.62;
    return (want ? find("buy") : find("skip"))?.choice;
  }
  if (pending.type === "upgrade") {
    const cost = upgradeCost(state.cells[pending.cell]);
    const want = player.cash - cost >= 2200 && cost <= player.cash * 0.45;
    return (want ? find("upgrade") : find("skip"))?.choice;
  }
  if (pending.type === "build") {
    const build = list.find((item) => item.choice.type === "build");
    return (build || find("skip"))?.choice;
  }
  if (pending.type === "shop") {
    if (pending.bought) return find("leave")?.choice;
    const tool = pickShopTool(state);
    const buy = list.find((item) => item.choice.type === "buy-tool" && item.choice.tool === tool);
    return (buy || find("leave"))?.choice;
  }
  if (pending.type === "bank") {
    if (pending.acted) return find("leave")?.choice;
    if (player.cash >= 9000 && find("deposit")) {
      return list.find((item) => item.choice.type === "deposit" && item.choice.mode === "spare")?.choice
        || find("deposit")?.choice;
    }
    if (player.cash < 1800 && player.deposit > 0) {
      return list.find((item) => item.choice.type === "withdraw" && item.choice.mode === "all")?.choice;
    }
    return find("leave")?.choice;
  }
  if (pending.type === "lottery") {
    return (player.cash > 7000 ? find("bet") : find("skip"))?.choice;
  }
  if (pending.type === "bail" || pending.type === "release") {
    const cost = pending.type === "bail" ? BAIL : RELEASE;
    if (player.cash >= cost + 2500 && find("pay")) return find("pay").choice;
    return find("serve")?.choice;
  }
  if (pending.type === "ack") return find("ack")?.choice;
  if (pending.type === "pawn") return find("leave")?.choice;
  if (pending.type === "liquidate") {
    const sell = list.find((item) => item.choice.type === "sell");
    if (sell) return sell.choice;
    return find("bust")?.choice;
  }
  return list[0]?.choice || { type: "noop" };
}

export function aiAction(state) {
  if (!state || state.phase === "ended") return { type: "noop" };
  if (state.phase === "between") return { type: "end" };
  if (state.phase === "resolve") {
    const list = choices(state);
    return pickResolve(state, list) || { type: "noop" };
  }
  if (state.phase === "idle") {
    if (!state.toolUsed) {
      const tool = aiTool(state);
      if (tool) return tool;
    }
    if (!state.built) {
      const index = bestBuild(state);
      if (index != null) return { type: "build", index };
    }
    return { type: "roll" };
  }
  return { type: "noop" };
}

export function describeCell(state, index) {
  const cell = state.cells[index];
  if (!cell) return null;
  const owner = cell.owner == null ? null : state.players[cell.owner];
  const trap = trapAt(state, index);
  const rents = [0, 1, 2, 3].map((level) => ({
    level,
    name: levelName(level),
    rent: baseRent({ ...cell, level }),
  }));
  return {
    ...cell,
    ownerName: owner ? owner.name : "无主",
    ownerColor: owner ? owner.color : null,
    district: ownsDistrict(state, cell),
    rents,
    upgrade: cell.type === "property" ? upgradeCost(cell) : 0,
    currentRent: owner ? rentAmount(state, cell, null) : baseRent(cell),
    trap: trap
      ? {
          kind: trap.kind,
          name: TOOLS[trap.kind]?.name || trap.kind,
          fuse: trap.fuse,
          ownerName: state.players[trap.owner]?.name || "",
        }
      : null,
  };
}

export function itemCounts(player) {
  const counts = {};
  for (const id of player.items) counts[id] = (counts[id] || 0) + 1;
  return counts;
}
