import { createBoard } from "./board3d.js";
import { GODS, HOSPITAL_INDEX, LEVEL_NAME, TOOLS } from "./data.js";
import {
  aiAction,
  applyChoice,
  buildOn,
  choices,
  commitRoll,
  createGame,
  current,
  describeCell,
  endTurn,
  itemCounts,
  openBuild,
  openSell,
  planRoll,
  promptText,
  toolCells,
  useTool,
} from "./engine.js";

const $ = (id) => document.getElementById(id);

const TYPE_BLURB = {
  start: "走到或路过时领取俸禄。存款在这时结一成利息。",
  chance: "抽一张机会。",
  fate: "抽一张命运。",
  shop: "可以买道具，行囊最多六件。",
  bank: "存入或取出。路过城门时，存款结一成利息。",
  lottery: "押 $500，开出 6 点得到 $2000。",
  park: "歇脚，得茶水 $300。",
  tax: "缴纳现金的一成，至少 $200。福神和护身符可挡。",
  hospital: "自己走进来只是看看。被地雷或炸弹送来则会留医。",
  temple: "随机请来财神、穷神、福神或衰神。",
  jail: "留下一回合，也可以交保释立刻走。",
  property: "买下后可升级。别人停在这里要付租。",
};

let state;
let board;
let busy = false;
let pace = 1;
let round = 0;
let local = null;
let shownDie = 0;

const clips = {
  die: new Audio("./assets/kenney/dieThrow1.ogg"),
  coin: new Audio("./assets/kenney/chipsCollide1.ogg"),
  card: new Audio("./assets/kenney/cardPlace1.ogg"),
};

function playClip(name) {
  const clip = clips[name];
  if (!clip) return;
  clip.currentTime = 0;
  clip.play().catch(() => {});
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms / pace));
}

function esc(text) {
  return String(text).replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[ch]));
}

function humanHere() {
  const player = current(state);
  return !!(player && player.isHuman && !player.auto && !player.bankrupt);
}

function needsHuman() {
  if (state.phase !== "resolve" || !state.pending) return false;
  const payer = state.players[state.pending.payerId];
  return !!(payer && payer.isHuman && !payer.auto);
}

function actorIsAuto() {
  if (state.phase === "resolve" && state.pending) {
    const payer = state.players[state.pending.payerId];
    return !payer || !payer.isHuman || payer.auto;
  }
  const player = current(state);
  return !player.isHuman || player.auto;
}

function readSetup() {
  return {
    humanCount: Number($("humanCount").value),
    aiCount: Number($("aiCount").value),
    cash: Number($("startMoney").value),
    maxDay: Number($("maxDay").value),
    names: [$("playerName").value],
  };
}

function showDie(face) {
  const n = Math.max(1, Math.min(6, face | 0 || 1));
  $("die").dataset.face = String(n);
}

function fillActions(buttons, mode) {
  const box = $("modalActions");
  box.replaceChildren();
  buttons.forEach((item, index) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = item.label;
    if (item.blurb) btn.title = item.blurb;
    const kind = item.choice?.type;
    if (mode === "local") btn.dataset.local = String(index);
    else btn.dataset.choice = JSON.stringify(item.choice);
    if (["skip", "leave", "serve", "bust"].includes(kind) || item.label === "取消" || item.label === "返回") {
      btn.className = "ghost";
    }
    box.appendChild(btn);
  });
}

function render() {
  if (!state) return;
  const player = current(state);
  const cap = state.maxDay > 0 ? ` / ${state.maxDay}` : " · 不限";
  $("dayLabel").textContent = `第 ${state.day} 天${cap}`;
  const phaseText = {
    idle: humanHere() ? "待掷骰" : "思考中",
    resolve: "做决定",
    between: "走完了",
    ended: "收市",
  };
  $("phaseBadge").textContent = phaseText[state.phase] || state.phase;
  $("message").textContent = state.message || "";
  const face = shownDie || state.lastDie || 0;
  showDie(face || 1);
  $("dieText").textContent = face ? `掷出 ${face}` : "准备开市";

  const me = humanHere();
  $("rollBtn").disabled = busy || !me || state.phase !== "idle";
  $("buildBtn").disabled = busy || !me || state.phase !== "idle" || state.built;
  $("sellBtn").disabled = busy || !me || state.phase !== "idle";
  $("autoBtn").disabled = !player?.isHuman;
  $("autoBtn").textContent = player?.auto ? "取消托管" : "托管";
  $("paceBtn").textContent = pace > 1 ? "原速" : "加快";

  $("players").innerHTML = state.players
    .map((p) => {
      const counts = itemCounts(p);
      const items = Object.entries(counts)
        .map(([id, n]) => `${TOOLS[id]?.name || id}${n > 1 ? `×${n}` : ""}`)
        .join("、");
      const god = p.god ? `${GODS[p.god.id]?.name || ""} ${p.god.left}` : "";
      const where = state.cells[p.position]?.name || "";
      const halt = p.halt > 0 ? ` · 停 ${p.halt}` : "";
      const dir = p.dir < 0 ? " · 逆行" : "";
      const bits = [
        p.isHuman ? "玩家" : "电脑",
        p.title,
        `现金 $${p.cash}`,
        p.deposit ? `存款 $${p.deposit}` : "",
        god,
        items,
        p.bomb ? `炸弹 ${p.bomb.fuse} 步` : "",
        p.bankrupt ? "已破产" : `在${where}${halt}${dir}`,
      ].filter(Boolean);
      return `<li class="${p.id === state.turn && !p.bankrupt ? "current" : ""} ${p.bankrupt ? "out" : ""}">
        <div class="who"><span><i class="dot" style="background:${p.color}"></i>${esc(p.name)}</span><b>$${p.cash}</b></div>
        <span class="sub">${esc(bits.join(" · "))}</span>
      </li>`;
    })
    .join("");

  const toolBox = $("tools");
  toolBox.replaceChildren();
  if (me && state.phase === "idle") {
    const counts = itemCounts(player);
    for (const [id, n] of Object.entries(counts)) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "ghost";
      btn.textContent = `${TOOLS[id].name}${n > 1 ? ` ×${n}` : ""}`;
      btn.title = TOOLS[id].blurb;
      btn.disabled = busy || state.toolUsed || id === "shield" || id === "waiver";
      btn.addEventListener("click", () => onTool(id));
      toolBox.appendChild(btn);
    }
  }
  if (!toolBox.childElementCount) {
    const empty = document.createElement("span");
    empty.className = "sub";
    empty.textContent = me ? "行囊是空的。走到杂货铺可以买。" : "轮到你时，道具会出现在这里。";
    toolBox.appendChild(empty);
  }

  $("log").innerHTML = state.log.slice(0, 14).map((line) => `<li>${esc(line)}</li>`).join("");

  const result = $("result");
  if (state.phase === "ended" && state.rankings) {
    result.hidden = false;
    const rows = state.rankings.map((row) => `<li>${esc(row.name)} · 资产 $${row.worth}</li>`).join("");
    result.innerHTML = `<strong>${esc(state.message)}</strong><ol>${rows}</ol>`;
  } else result.hidden = true;

  const modal = $("modal");
  modal.querySelector(".modal-card")?.classList.toggle("slip", state.pending?.type === "ack" && !local);
  if (local) {
    modal.hidden = false;
    $("modalTitle").textContent = local.title;
    $("modalText").textContent = local.text;
    fillActions(local.buttons, "local");
  } else if (needsHuman()) {
    const prompt = promptText(state);
    modal.hidden = false;
    $("modalTitle").textContent = prompt?.title || "决定";
    $("modalText").textContent = prompt?.text || state.message;
    fillActions(choices(state), "engine");
  } else {
    modal.hidden = true;
  }
}

function showDeed(index) {
  const info = describeCell(state, index);
  if (!info) return;
  $("deedKind").textContent = info.type === "property" ? "地契" : "格子";
  $("deedTitle").textContent = info.name;
  $("deedOwner").textContent = info.type === "property" ? `业主：${info.ownerName}${info.district ? " · 已集齐本区" : ""}` : TYPE_BLURB[info.type] || "";
  const table = $("deedTable");
  table.replaceChildren();
  if (info.type === "property") {
    for (const row of info.rents) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${row.name}</td><td>租金 $${row.rent}</td>`;
      table.appendChild(tr);
    }
    const cost = document.createElement("tr");
    cost.innerHTML = `<td>升级</td><td>$${info.upgrade} / 级</td>`;
    table.appendChild(cost);
    $("deedNote").textContent = `现为${LEVEL_NAME[info.level] || "空地"}。${info.trap ? `上面有${info.trap.ownerName}的${info.trap.name}${info.trap.fuse ? `（${info.trap.fuse}）` : ""}。` : ""}`;
  } else {
    $("deedNote").textContent = info.trap ? `这里放着${info.trap.ownerName}的${info.trap.name}。` : "";
  }
  $("deed").hidden = false;
}

async function perform(action) {
  const live = state;
  const ticket = round;
  if (action.type === "roll") {
    const player = current(live);
    const plan = planRoll(live);
    if (!plan) return;
    shownDie = plan.face;
    playClip("die");
    live.message = `${player.name} 掷出 ${plan.face}，正在走…`;
    render();
    await board.play(plan, player.id);
    if (live !== state || ticket !== round) return;
    const visual = plan.hospital ? HOSPITAL_INDEX : plan.landing;
    commitRoll(live, plan);
    const hop = live.extraHop;
    live.extraHop = null;
    if (hop != null && hop !== visual && !live.players[player.id].bankrupt) {
      await board.fly(player.id, visual, hop);
    }
    return;
  }
  if (action.type === "tool") {
    const res = useTool(state, action);
    if (!res?.ok) {
      state.message = res?.error || state.message;
      return;
    }
    if (res.roll) await perform({ type: "roll" });
    return;
  }
  if (action.type === "build") {
    const res = buildOn(state, action.index);
    if (!res.ok) state.message = res.error || state.message;
    return;
  }
  if (action.type === "end") {
    endTurn(state);
    return;
  }
  const res = applyChoice(state, action);
  if (!res?.ok) state.message = res?.error || state.message;
  else if (action.type === "buy") playClip("coin");
  else if (action.type === "ack") playClip("card");
}

async function settle(ticket) {
  let guard = 0;
  while (state.phase !== "ended" && guard++ < 160) {
    if (ticket !== round || local) return;
    if (state.phase === "between") {
      const reader = current(state);
      await delay(!reader.isHuman || reader.auto ? 320 : 720);
      if (ticket !== round || state.phase !== "between") continue;
      endTurn(state);
      board.sync(state);
      render();
      continue;
    }
    if (!actorIsAuto()) return;
    const action = aiAction(state);
    if (!action || action.type === "noop") return;
    await delay(240);
    if (ticket !== round) return;
    await perform(action);
    board.sync(state);
    render();
  }
}

async function userAct(action) {
  if (busy || state.phase === "ended") return;
  local = null;
  busy = true;
  const ticket = round;
  try {
    board.setPick(null);
    $("pickBar").hidden = true;
    await perform(action);
    if (ticket !== round) return;
    board.sync(state);
    render();
    await settle(ticket);
  } finally {
    if (ticket === round) {
      busy = false;
      board.sync(state);
      render();
    }
  }
}

function showLocal(title, text, buttons) {
  local = { title, text, buttons };
  render();
}

function onTool(tool) {
  if (busy || state.phase !== "idle" || !humanHere()) return;
  const me = current(state);
  if (tool === "shield" || tool === "waiver") {
    state.message = TOOLS[tool].blurb;
    render();
    return;
  }
  if (tool === "sweep") {
    userAct({ type: "tool", tool });
    return;
  }
  if (tool === "reverse") {
    userAct({ type: "tool", tool });
    return;
  }
  if (tool === "remote") {
    showLocal(
      "遥控骰子",
      "选一个点数，选完立刻走。衰神改不了这个点数。",
      [1, 2, 3, 4, 5, 6]
        .map((face) => ({
          label: String(face),
          choice: { type: "local" },
          run: () => userAct({ type: "tool", tool, face }),
        }))
        .concat([{ label: "取消", run: () => { local = null; render(); } }])
    );
    return;
  }
  if (tool === "stay" || tool === "equalize" || tool === "tax") {
    const foes = state.players.filter((p) => !p.bankrupt && p.id !== me.id);
    showLocal(
      TOOLS[tool].name,
      TOOLS[tool].blurb,
      foes
        .map((p) => ({
          label: p.name,
          run: () => userAct({ type: "tool", tool, playerId: p.id }),
        }))
        .concat([{ label: "取消", run: () => { local = null; render(); } }])
    );
    return;
  }
  if (tool === "demolish") {
    const cells = state.cells.filter(
      (c) => c.type === "property" && c.owner != null && c.owner !== me.id && (c.level || 0) > 0
    );
    if (!cells.length) {
      state.message = "现在没有可拆迁的房子。";
      render();
      return;
    }
    showLocal(
      "拆迁",
      "选一处别人的房子，降一级。",
      cells
        .map((c) => ({
          label: `${c.name} · ${LEVEL_NAME[c.level]}`,
          run: () => userAct({ type: "tool", tool, cell: c.index }),
        }))
        .concat([{ label: "取消", run: () => { local = null; render(); } }])
    );
    return;
  }
  const cells = toolCells(state, tool);
  if (!cells.length) {
    state.message = "没有能放下的格子。";
    render();
    return;
  }
  board.setPick(cells);
  $("pickText").textContent = `点选格子，放置${TOOLS[tool].name}`;
  $("pickBar").hidden = false;
  $("pickBar").dataset.tool = tool;
}

function newGame() {
  round += 1;
  local = null;
  shownDie = 0;
  busy = false;
  board.setPick(null);
  $("pickBar").hidden = true;
  $("deed").hidden = true;
  state = createGame(readSetup());
  board.sync(state);
  render();
  settle(round);
}

function bind() {
  $("rollBtn").addEventListener("click", () => userAct({ type: "roll" }));
  $("buildBtn").addEventListener("click", () => {
    const res = openBuild(state);
    if (!res.ok) state.message = res.error;
    render();
  });
  $("sellBtn").addEventListener("click", () => {
    const res = openSell(state);
    if (!res.ok) state.message = res.error;
    render();
  });
  $("autoBtn").addEventListener("click", () => {
    const player = current(state);
    if (!player?.isHuman) return;
    player.auto = !player.auto;
    render();
    if (player.auto) settle(round);
  });
  $("paceBtn").addEventListener("click", () => {
    pace = pace > 1 ? 1 : 3;
    render();
  });
  $("newBtn").addEventListener("click", newGame);
  $("camIso").addEventListener("click", () => board.setCamera("iso"));
  $("camTop").addEventListener("click", () => board.setCamera("top"));
  $("camLow").addEventListener("click", () => board.setCamera("low"));
  $("pickCancel").addEventListener("click", () => {
    board.setPick(null);
    $("pickBar").hidden = true;
  });
  $("deedClose").addEventListener("click", () => {
    $("deed").hidden = true;
  });
  $("deed").addEventListener("click", (event) => {
    if (event.target === $("deed")) $("deed").hidden = true;
  });
  $("modalActions").addEventListener("click", (event) => {
    const btn = event.target.closest("button");
    if (!btn || busy) return;
    if (btn.dataset.local != null) {
      local?.buttons?.[Number(btn.dataset.local)]?.run?.();
      return;
    }
    if (!btn.dataset.choice) return;
    userAct(JSON.parse(btn.dataset.choice));
  });
  window.addEventListener("keydown", (event) => {
    if (event.code !== "Space") return;
    const tag = event.target?.tagName;
    if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") return;
    if (state.phase !== "idle" || busy || !humanHere() || local) return;
    event.preventDefault();
    userAct({ type: "roll" });
  });
}

async function main() {
  try {
    if (document.fonts?.ready) await document.fonts.ready;
    board = createBoard($("scene"), {
      onInspect: (index) => {
        if ($("pickBar").hidden) showDeed(index);
      },
      onPick: (index) => {
        const tool = $("pickBar").dataset.tool;
        $("pickBar").hidden = true;
        board.setPick(null);
        if (tool) userAct({ type: "tool", tool, cell: index });
      },
    });
    bind();
    $("boot").hidden = true;
    newGame();
  } catch (error) {
    console.error(error);
    $("boot").hidden = false;
    $("boot").textContent = "这台浏览器开不了三维画面。";
  }
}

main();
