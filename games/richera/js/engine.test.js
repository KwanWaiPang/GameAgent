import { test } from "node:test";
import assert from "node:assert/strict";
import { BOARD, HOSPITAL_INDEX, JAIL_INDEX } from "./data.js";
import {
  aiAction,
  applyChoice,
  buildOn,
  choices,
  commitRoll,
  createGame,
  endTurn,
  netWorth,
  planRoll,
  previewPath,
  rentAmount,
  useTool,
} from "./engine.js";

function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function game(extra = {}) {
  return createGame({
    humanCount: 1,
    aiCount: 1,
    cash: 15000,
    maxDay: 12,
    rng: mulberry32(7),
    ...extra,
  });
}

function roll(state, face) {
  const plan = planRoll(state, face);
  assert.ok(plan, "应当能掷骰");
  commitRoll(state, plan);
  return plan;
}

function ackAll(state) {
  let guard = 0;
  while (state.phase === "resolve" && state.pending?.type === "ack" && guard++ < 5) {
    applyChoice(state, { type: "ack" });
  }
}

test("棋盘是 32 格的城街", () => {
  assert.equal(BOARD.length, 32);
  assert.equal(BOARD[0].type, "start");
  assert.equal(BOARD[HOSPITAL_INDEX].type, "hospital");
  assert.equal(BOARD[JAIL_INDEX].type, "jail");
  assert.equal(BOARD[16].type, "park");
  const groups = {};
  for (const cell of BOARD) {
    if (cell.type !== "property") continue;
    groups[cell.group] = (groups[cell.group] || 0) + 1;
  }
  assert.deepEqual(groups, { south: 4, east: 4, north: 4, west: 4 });
});

test("买地、升级、收租", () => {
  const state = game();
  state.players[0].position = 0;
  roll(state, 1);
  assert.equal(state.pending.type, "buy");
  assert.equal(state.cells[1].name, "南市口");
  applyChoice(state, { type: "buy" });
  assert.equal(state.cells[1].owner, 0);
  assert.equal(state.players[0].cash, 15000 - 1200);
  assert.equal(state.phase, "between");

  state.phase = "idle";
  state.turn = 1;
  state.players[1].position = 0;
  roll(state, 1);
  assert.equal(state.phase, "between");
  assert.equal(rentAmount(state, state.cells[1], 1), 240);
  assert.equal(state.players[1].cash, 15000 - 240);
  assert.equal(state.players[0].cash, 15000 - 1200 + 240);

  state.phase = "idle";
  state.turn = 0;
  state.players[0].position = 0;
  state.built = false;
  roll(state, 1);
  assert.equal(state.pending.type, "upgrade");
  applyChoice(state, { type: "upgrade" });
  assert.equal(state.cells[1].level, 1);
  assert.equal(rentAmount(state, state.cells[1], 1), 600);
});

test("同区集齐后租金提高，神仙会改租金", () => {
  const state = game();
  for (const cell of state.cells) {
    if (cell.group === "south") cell.owner = 0;
  }
  const boosted = rentAmount(state, state.cells[1], 1);
  assert.equal(boosted, 360);
  state.players[0].god = { id: "wealth", left: 5 };
  assert.equal(rentAmount(state, state.cells[1], 1), 540);
  state.players[0].god = { id: "poor", left: 4 };
  state.players[1].god = { id: "poor", left: 4 };
  assert.equal(rentAmount(state, state.cells[1], 1), Math.round(Math.round(360 * 0.7) * 1.5));
});

test("路过城门领俸禄，存款计息", () => {
  const state = game();
  state.players[0].position = 30;
  state.players[0].deposit = 1000;
  const plan = roll(state, 3);
  assert.deepEqual(plan.path, [31, 0, 1]);
  assert.equal(state.players[0].cash, 15000 + 2000);
  assert.equal(state.players[0].deposit, 1100);
  assert.equal(state.pending.type, "buy");
});

test("穷神停俸禄，财神加俸禄，衰神减点，遥控骰不受衰神影响", () => {
  const poor = game();
  poor.players[0].position = 31;
  poor.players[0].god = { id: "poor", left: 4 };
  poor.players[0].deposit = 1000;
  roll(poor, 1);
  assert.equal(poor.players[0].cash, 15000);
  assert.equal(poor.players[0].deposit, 1100);

  const rich = game();
  rich.players[0].position = 31;
  rich.players[0].god = { id: "wealth", left: 5 };
  roll(rich, 1);
  assert.equal(rich.players[0].cash, 15000 + 3000);

  const weak = game();
  weak.players[0].god = { id: "weak", left: 3 };
  const weakPlan = planRoll(weak, 6);
  assert.equal(weakPlan.face, 5);
  assert.equal(weakPlan.path.length, 5);

  const remote = game();
  remote.players[0].god = { id: "weak", left: 3 };
  remote.players[0].remote = 2;
  const remotePlan = planRoll(remote, 6);
  assert.equal(remotePlan.face, 2);
  assert.equal(remote.players[0].remote, 0);
});

test("路障拦住，自己的地雷不伤自己，别人的地雷送医", () => {
  const blocked = game();
  blocked.decks.chance = ["purse"];
  blocked.traps.push({ id: 9, kind: "block", at: 2, owner: 1 });
  const plan = roll(blocked, 4);
  assert.deepEqual(plan.path, [1, 2]);
  assert.equal(blocked.players[0].position, 2);
  assert.equal(blocked.traps.length, 0);

  const own = game();
  own.traps.push({ id: 3, kind: "mine", at: 2, owner: 0 });
  const ownPlan = roll(own, 3);
  assert.deepEqual(ownPlan.path, [1, 2, 3]);
  assert.equal(own.traps.length, 1);
  assert.equal(own.players[0].position, 3);

  const mine = game();
  mine.traps.push({ id: 4, kind: "mine", at: 1, owner: 1 });
  roll(mine, 1);
  assert.equal(mine.players[0].position, HOSPITAL_INDEX);
  assert.equal(mine.players[0].halt, 2);
  assert.equal(mine.players[0].haltWhy, "hospital");
  assert.equal(mine.players[0].cash, 15000 - 800);
  assert.equal(mine.players[1].cash, 15000 + 800);
  assert.equal(mine.traps.length, 0);
  assert.equal(mine.phase, "between");
});

test("护身符和福神能挡地雷", () => {
  const shielded = game();
  shielded.players[0].items = ["shield"];
  shielded.traps.push({ id: 4, kind: "mine", at: 1, owner: 1 });
  roll(shielded, 1);
  assert.equal(shielded.players[0].position, 1);
  assert.deepEqual(shielded.players[0].items, []);
  assert.equal(shielded.players[1].cash, 15000);
  assert.equal(shielded.pending.type, "buy");

  const blessed = game();
  blessed.players[0].god = { id: "fortune", left: 5 };
  blessed.players[0].items = ["shield"];
  blessed.traps.push({ id: 4, kind: "mine", at: 1, owner: 1 });
  roll(blessed, 1);
  assert.equal(blessed.players[0].position, 1);
  assert.deepEqual(blessed.players[0].items, ["shield"]);
});

test("付不出租金就变卖，再不够就破产", () => {
  const state = game();
  state.cells[1].owner = 1;
  state.cells[1].level = 0;
  state.players[0].cash = 100;
  state.cells[4].owner = 0;
  state.cells[4].level = 0;
  roll(state, 1);
  assert.equal(state.pending.type, "liquidate");
  assert.equal(state.pending.due, 240);
  const sell = choices(state).find((item) => item.choice.kind === "land");
  assert.ok(sell);
  applyChoice(state, sell.choice);
  assert.equal(state.phase, "between");
  assert.equal(state.cells[4].owner, null);
  assert.equal(state.players[0].cash, 860);
  assert.equal(state.players[1].cash, 15240);

  const bust = game();
  bust.players[0].isHuman = false;
  bust.cells[1].owner = 1;
  bust.cells[1].level = 3;
  bust.players[0].cash = 100;
  roll(bust, 1);
  assert.equal(bust.players[0].bankrupt, true);
  assert.equal(bust.phase, "ended");
  assert.equal(bust.winner, 1);
  assert.ok(bust.players.every((p) => p.cash >= 0));
});

test("道具：转向、拆迁、均富、查税回到掷骰", () => {
  const state = game();
  state.players[0].items = ["reverse", "demolish", "equalize", "tax"];
  state.players[1].cash = 20000;
  state.cells[14].owner = 1;
  state.cells[14].level = 2;
  assert.equal(useTool(state, { tool: "reverse" }).ok, true);
  assert.equal(state.players[0].dir, -1);
  assert.equal(previewPath(state, 0, state.players[0].dir, 1, 0)[0], 31);
  assert.equal(useTool(state, { tool: "demolish", cell: 14 }).ok, false);

  const next = game();
  next.players[0].items = ["demolish", "equalize", "tax"];
  next.players[1].cash = 20000;
  next.cells[14].owner = 1;
  next.cells[14].level = 2;
  assert.equal(useTool(next, { tool: "demolish", cell: 14 }).ok, true);
  assert.equal(next.cells[14].level, 1);
  assert.equal(useTool(next, { tool: "equalize", playerId: 1 }).ok, false);

  const tax = game();
  tax.players[0].items = ["tax"];
  tax.players[1].cash = 10000;
  tax.players[1].isHuman = false;
  assert.equal(useTool(tax, { tool: "tax", playerId: 1 }).ok, true);
  assert.equal(tax.phase, "idle");
  assert.equal(tax.players[1].cash, 10000 - 1500);
  assert.equal(tax.players[0].cash, 15000 + 1500);

  const avg = game();
  avg.players[0].items = ["equalize"];
  avg.players[0].cash = 1000;
  avg.players[1].cash = 9000;
  useTool(avg, { tool: "equalize", playerId: 1 });
  assert.equal(avg.players[0].cash + avg.players[1].cash, 10000);
  assert.equal(avg.players[0].cash, 5000);
});

test("机会牌发饷，福神挡税", () => {
  const state = game();
  state.players[0].position = 1;
  state.decks.chance = ["bonus-gate"];
  roll(state, 1);
  assert.equal(state.players[0].position, 0);
  assert.equal(state.players[0].cash, 15000 + 2000);
  assert.equal(state.pending.type, "ack");
  ackAll(state);
  assert.equal(state.phase, "between");

  const tax = game();
  tax.players[0].position = 22;
  tax.players[0].god = { id: "fortune", left: 5 };
  roll(tax, 1);
  assert.equal(tax.players[0].cash, 15000);
  assert.equal(tax.phase, "between");
});

test("盖楼每回合一次，钱庄可以存取", () => {
  const state = game();
  state.cells[1].owner = 0;
  const built = buildOn(state, 1);
  assert.equal(built.ok, true);
  assert.equal(state.cells[1].level, 1);
  assert.equal(buildOn(state, 1).ok, false);

  state.players[0].position = 7;
  roll(state, 1);
  assert.equal(state.pending.type, "bank");
  applyChoice(state, { type: "deposit", mode: "half" });
  assert.equal(state.players[0].deposit, 7200);
  assert.equal(state.players[0].cash, 7200);
  applyChoice(state, { type: "leave" });
  assert.equal(state.phase, "between");
});

test("天数到了按资产收市", () => {
  const state = game({ maxDay: 1, humanCount: 0, aiCount: 2 });
  endTurn(state);
  assert.equal(state.day, 1);
  assert.equal(state.phase, "idle");
  endTurn(state);
  assert.equal(state.phase, "ended");
  assert.equal(state.day, 2);
  assert.ok(state.rankings.length >= 1);
  assert.equal(state.winner, state.rankings[0].id);
});

test("电脑对局能在天数内结束且现金不为负", () => {
  const state = createGame({
    humanCount: 0,
    aiCount: 3,
    cash: 12000,
    maxDay: 6,
    rng: mulberry32(11),
  });
  let guard = 0;
  while (state.phase !== "ended" && guard++ < 4000) {
    if (state.phase === "between") {
      endTurn(state);
      continue;
    }
    const action = aiAction(state);
    assert.notEqual(action.type, "noop", state.message);
    if (action.type === "roll") {
      const plan = planRoll(state);
      assert.ok(plan);
      commitRoll(state, plan);
    } else if (action.type === "tool") {
      const res = useTool(state, action);
      assert.equal(res.ok, true, res.error || state.message);
      if (res.roll) {
        const plan = planRoll(state);
        commitRoll(state, plan);
      }
    } else if (action.type === "build") {
      const res = buildOn(state, action.index);
      assert.equal(res.ok, true, res.error || state.message);
    } else if (action.type === "end") {
      endTurn(state);
    } else {
      const res = applyChoice(state, action);
      assert.equal(res.ok, true, `${res.error || ""} / ${state.message} / ${JSON.stringify(action)}`);
    }
    for (const player of state.players) assert.ok(player.cash >= 0);
  }
  assert.equal(state.phase, "ended");
  assert.ok(state.winner != null);
  const winner = state.players[state.winner];
  if (!winner.bankrupt) assert.equal(netWorth(state, winner) >= 0, true);
});
