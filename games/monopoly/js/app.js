import {
  MAPS,
  useMap,
  rentOf,
  isDeed,
  buildLevelLabel,
  getDeedCard,
  listBankSellActions,
  BANK_BUYBACK_RATE,
} from "./data.js";
import {
  createInitialState,
  currentPlayer,
  rollDicePair,
  applyDiceMove,
  confirmDialog,
  shouldAutoAct,
  autoAct,
  setAllHumanAuto,
  sellActionToBank,
  giveUpAndBankrupt,
  tryTrade,
  aiAcceptsTrade,
} from "./engine.js";
import { BoardView } from "./board3d.js";

const clickAudio = document.getElementById("clickAudio");
const selectAudio = document.getElementById("selectAudio");

const els = {
  turnLabel: document.getElementById("turnLabel"),
  turnDot: document.getElementById("turnDot"),
  phaseBadge: document.getElementById("phaseBadge"),
  dayCount: document.getElementById("dayCount"),
  message: document.getElementById("message"),
  result: document.getElementById("result"),
  players: document.getElementById("playerList"),
  log: document.getElementById("logList"),
  dice: document.getElementById("diceBtn"),
  diceSum: document.getElementById("diceSum"),
  dialog: document.getElementById("dialog"),
  dialogTitle: document.getElementById("dialogTitle"),
  dialogText: document.getElementById("dialogText"),
  dialogOk: document.getElementById("dialogOk"),
  dialogCancel: document.getElementById("dialogCancel"),
  tip: document.getElementById("cellTip"),
  deedOverlay: document.getElementById("deedOverlay"),
  deedBand: document.getElementById("deedBand"),
  deedKind: document.getElementById("deedKind"),
  deedTitle: document.getElementById("deedTitle"),
  deedOwner: document.getElementById("deedOwner"),
  deedRentTable: document.querySelector("#deedRentTable tbody"),
  deedCostTable: document.querySelector("#deedCostTable tbody"),
  deedNote: document.getElementById("deedNote"),
  deedClose: document.getElementById("deedClose"),
  startMoney: document.getElementById("startMoney"),
  humanCount: document.getElementById("humanCount"),
  aiCount: document.getElementById("aiCount"),
  btnNew: document.getElementById("btnNew"),
  setupDetails: document.getElementById("setupDetails"),
  btnSpeed: document.getElementById("btnSpeed"),
  btnAuto: document.getElementById("btnAuto"),
  btnSell: document.getElementById("btnSell"),
  btnTrade: document.getElementById("btnTrade"),
  playerName: document.getElementById("playerName"),
  tradeOverlay: document.getElementById("tradeOverlay"),
  tradePartner: document.getElementById("tradePartner"),
  tradeGive: document.getElementById("tradeGive"),
  tradeTake: document.getElementById("tradeTake"),
  tradeCash: document.getElementById("tradeCash"),
  tradeStatus: document.getElementById("tradeStatus"),
  tradeOk: document.getElementById("tradeOk"),
  tradeClose: document.getElementById("tradeClose"),
  assetOverlay: document.getElementById("assetOverlay"),
  assetStatus: document.getElementById("assetStatus"),
  assetList: document.getElementById("assetList"),
  assetBankrupt: document.getElementById("assetBankrupt"),
  assetClose: document.getElementById("assetClose"),
  bootNote: document.getElementById("bootNote"),
  mapPick: document.getElementById("mapPick"),
  brandSub: document.getElementById("brandSub"),
};

const PIECE_NAME = { round: "车", triangle: "帽", square: "犬", star: "船" };

const view = new BoardView(document.getElementById("scene"));

let state = null;
let busy = false;
let fast = false;
let autoHumans = false;
let round = 0;

function play(el) {
  if (!el) return;
  try {
    el.currentTime = 0;
    const p = el.play();
    if (p && p.catch) p.catch(() => {});
  } catch (_) {}
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function speed() {
  return fast ? Math.max(220, (state?.speedMs || 700) * 0.45) : state?.speedMs || 700;
}

function pieceChip(pl) {
  const label = PIECE_NAME[pl.shape] || "子";
  return `<span class="piece-pip" style="--c:${pl.color}" title="${pl.name}">${label}</span>`;
}

function showTip(i, x, y) {
  if (!state || i == null) {
    hideTip();
    return;
  }
  const cell = state.cells[i];
  let extra = "";
  if (isDeed(cell)) {
    const owner = cell.owner == null ? "银行" : state.players[cell.owner]?.name || "—";
    extra = `<div>地主：${owner}</div><div>现租金：$${rentOf(cell, state)}</div><div class="tip-hint">点击查看地契</div>`;
  } else if (cell.subtitle) {
    extra = `<div>${cell.subtitle}</div>`;
  } else if (cell.type === "tax") {
    extra = `<div>向银行缴纳 $${cell.value}</div>`;
  } else if (cell.type === "chance" || cell.type === "fate") {
    extra = `<div>抽取一张${cell.name}</div>`;
  }
  els.tip.hidden = false;
  els.tip.innerHTML = `<strong>${cell.name}</strong>${extra}`;
  const w = 220;
  els.tip.style.left = `${Math.min(window.innerWidth - w, Math.max(8, x + 14))}px`;
  els.tip.style.top = `${Math.min(window.innerHeight - 96, Math.max(8, y + 16))}px`;
}

function hideTip() {
  els.tip.hidden = true;
}

function openDeed(index) {
  if (!state) return;
  const cell = state.cells[index];
  const deed = getDeedCard(cell, state);
  if (!deed) return;

  hideTip();
  play(selectAudio);

  els.deedKind.textContent = deed.kindLabel;
  els.deedTitle.textContent = deed.name;
  els.deedBand.style.background =
    deed.groupColor ||
    (deed.type === "station" ? "#43a047" : deed.type === "utility" ? "#0288d1" : "#8d6e63");

  const ownerName = deed.ownerId == null ? "尚未出售" : state.players[deed.ownerId]?.name || "—";
  let status = "";
  if (deed.type === "property") {
    status = `当前建筑：${buildLevelLabel(deed.level)}`;
  } else if (deed.type === "station") {
    status = deed.ownerId == null ? "当前无人持有" : `持有者已有 ${deed.stationOwned} 座车站`;
  }
  els.deedOwner.textContent = `地主：${ownerName}${status ? ` · ${status}` : ""}`;

  const activeLevel =
    deed.type === "property" ? deed.level : deed.type === "station" ? deed.stationOwned || 0 : 0;

  els.deedRentTable.innerHTML = deed.rows
    .map((row) => {
      const active =
        (deed.type === "property" && row.level === activeLevel) ||
        (deed.type === "station" && row.level === activeLevel);
      return `<tr class="${active ? "is-current" : ""}">
        <th scope="row">${row.label}</th>
        <td>$${row.value}</td>
      </tr>`;
    })
    .join("");

  els.deedCostTable.innerHTML = deed.costs
    .map(
      (row) => `<tr>
        <th scope="row">${row.label}</th>
        <td>$${row.value}</td>
      </tr>`
    )
    .join("");

  els.deedNote.textContent = deed.note || "";
  els.deedOverlay.hidden = false;
}

function closeDeed() {
  els.deedOverlay.hidden = true;
}

function setDiceSumText(text) {
  if (els.diceSum) els.diceSum.textContent = text;
}

async function animateDice(a, b) {
  setDiceSumText("骰子滚动中…");
  await view.rollDice(a, b, fast);
  setDiceSumText(`${a} + ${b} = ${a + b}`);
}

async function animateWalk(playerId, from, steps) {
  await view.walk(playerId, from, steps, fast);
}

async function playTurnRoll(my = round) {
  const p = currentPlayer(state);
  const from = p.position;
  const pair = rollDicePair();
  play(selectAudio);
  await animateDice(pair.a, pair.b);
  if (my !== round) return;
  await animateWalk(p.id, from, pair.sum);
  if (my !== round) return;
  p.position = from;
  state = applyDiceMove(state, pair);
  play(clickAudio);
  render();
}

function render() {
  if (!state) return;
  const p = currentPlayer(state);

  els.turnLabel.textContent = state.phase === "ended" ? "对局结束" : `${p.name} 行动`;
  els.turnDot.style.background = p?.color || "#888";
  els.dayCount.textContent = `第 ${state.day} 天`;
  els.message.textContent = state.message || "";
  els.message.className = "message info";

  const phaseMap = {
    ready: "待掷骰",
    moving: "行进中",
    event: "结算中",
    dialog: "决策中",
    raise: "变卖凑钱",
    ended: "已结束",
  };
  els.phaseBadge.textContent = phaseMap[state.phase] || state.phase;

  if (state.phase === "ended" && state.winner) {
    els.result.hidden = false;
    els.result.textContent = `${state.winner.name} 获胜`;
  } else {
    els.result.hidden = true;
    els.result.textContent = "";
  }

  els.players.innerHTML = state.players
    .map((pl) => {
      const props = state.cells.filter((c) => c.owner === pl.id).length;
      return `<li class="${pl.bankrupt ? "bankrupt" : ""} ${pl.id === state.turn ? "current" : ""}">
        <span class="token-wrap">${pieceChip(pl)}</span>
        <span class="name">${pl.name}${pl.auto ? " · 托管" : ""}</span>
        <span class="money">$${pl.bankrupt ? 0 : pl.money}</span>
        <span class="props">${props}处产业</span>
      </li>`;
    })
    .join("");

  els.log.innerHTML = state.log
    .slice(0, 12)
    .map((t) => `<li>${t}</li>`)
    .join("");

  if (!view.rolling) {
    if (state.lastDiceA > 0 && state.lastDiceB > 0) {
      setDiceSumText(`${state.lastDiceA} + ${state.lastDiceB} = ${state.lastDiceA + state.lastDiceB}`);
    } else {
      setDiceSumText("点击掷双骰");
    }
  }

  view.sync(state);

  const canRoll = !busy && state.phase === "ready" && p && p.isHuman && !p.auto && state.phase !== "ended";
  if (els.dice) els.dice.disabled = !canRoll;

  const canSell =
    !busy && p && p.isHuman && !p.auto && !p.bankrupt && (state.phase === "ready" || state.phase === "raise");
  if (els.btnSell) els.btnSell.disabled = !canSell;
  const canTrade =
    canSell && state.phase === "ready" && state.players.some((pl) => !pl.bankrupt && pl.id !== p.id);
  if (els.btnTrade) els.btnTrade.disabled = !canTrade;

  if (state.phase === "dialog" && state.pendingDialog) {
    els.dialog.hidden = false;
    els.dialogTitle.textContent = state.pendingDialog.title;
    els.dialogText.textContent = state.pendingDialog.text;
    els.dialogOk.disabled = !state.pendingDialog.canConfirm;
  } else {
    els.dialog.hidden = true;
  }

  if (state.phase === "raise" && p?.isHuman && !p.auto) {
    renderAssetPanel();
  } else if (!els.assetOverlay.hidden && state.phase !== "raise") {
    renderAssetPanel();
  }
  if (state.phase !== "raise" && state.phase !== "ready" && !els.assetOverlay.hidden) {
    els.assetOverlay.hidden = true;
  }
}

function renderAssetPanel() {
  if (!state || !els.assetOverlay) return;
  const p = currentPlayer(state);
  const debt = state.pendingDebt;
  const actions = listBankSellActions(state, p.id);
  const rate = Math.round(BANK_BUYBACK_RATE * 100);

  if (debt) {
    els.assetStatus.innerHTML = `待支付 <strong>$${debt.amount}</strong>：${debt.label}<br/>当前现金 <strong>$${p.money}</strong>，还差 <strong>$${Math.max(0, debt.amount - p.money)}</strong>（银行回收价为 ${rate}%）`;
  } else {
    els.assetStatus.innerHTML = `当前现金 <strong>$${p.money}</strong>。可随时半价变卖产业换现金（折旧 ${rate}%）。`;
  }

  if (!actions.length) {
    els.assetList.innerHTML = `<li class="asset-empty">没有可变卖的房子或空地（有建筑须先拆房）。</li>`;
  } else {
    els.assetList.innerHTML = actions
      .map(
        (a, idx) => `<li>
          <div class="asset-meta">
            <span class="asset-name">${a.name}</span>
            <span class="asset-detail">${a.detail} · 回收 <span class="asset-price">$${a.price}</span></span>
          </div>
          <button type="button" data-sell-idx="${idx}">${a.label}</button>
        </li>`
      )
      .join("");
    els.assetList.querySelectorAll("[data-sell-idx]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const i = Number(btn.getAttribute("data-sell-idx"));
        onSellAction(actions[i]);
      });
    });
  }

  const inDebt = state.phase === "raise";
  els.assetBankrupt.hidden = !inDebt;
  els.assetClose.hidden = inDebt;
  els.assetClose.textContent = "关闭";
  els.assetOverlay.hidden = false;
}

function openAssetPanel() {
  if (!state) return;
  const p = currentPlayer(state);
  if (!p?.isHuman || p.auto || p.bankrupt) return;
  if (state.phase !== "ready" && state.phase !== "raise") return;
  renderAssetPanel();
}

function closeAssetPanel() {
  if (state?.phase === "raise") return;
  els.assetOverlay.hidden = true;
}

function onSellAction(action) {
  if (!state || !action || busy) return;
  play(selectAudio);
  state = sellActionToBank(state, action);
  render();
  if (state.phase !== "raise") {
    closeAssetPanel();
    runAutoLoop();
  } else {
    renderAssetPanel();
  }
}

function onGiveUpBankrupt() {
  if (!state || state.phase !== "raise") return;
  play(selectAudio);
  state = giveUpAndBankrupt(state);
  els.assetOverlay.hidden = true;
  render();
  runAutoLoop();
}

async function runAutoLoop(my = round) {
  while (state && my === round && shouldAutoAct(state) && state.phase !== "ended") {
    busy = true;
    render();
    if (my !== round) return;
    if (state.phase === "ready") {
      await delay(speed() * 0.35);
      if (my !== round) return;
      await playTurnRoll(my);
    } else {
      await delay(speed());
      if (my !== round) return;
      state = autoAct(state);
      play(clickAudio);
      render();
    }
    await delay(speed() * 0.45);
  }
  if (my !== round) return;
  busy = false;
  render();
}

async function onDice() {
  if (!state || busy || state.phase !== "ready") return;
  const p = currentPlayer(state);
  if (!p.isHuman || p.auto) return;
  const my = round;
  busy = true;
  render();
  await playTurnRoll(my);
  if (my !== round) return;
  busy = false;
  render();
  await runAutoLoop(my);
}

function onDialog(yes) {
  if (!state || state.phase !== "dialog") return;
  play(selectAudio);
  state = confirmDialog(state, yes);
  render();
  runAutoLoop();
}

function startNew(opts = {}) {
  round += 1;
  const my = round;
  view.cut();
  busy = false;
  const startMoney = Number(els.startMoney.value) || 15000;
  const humanCount = Math.max(1, Number(els.humanCount.value) || 1);
  const aiCount = Math.max(0, Number(els.aiCount.value) || 0);
  const you = (els.playerName?.value || "旅行者").trim().slice(0, 12) || "旅行者";
  const names = [you];
  const map = useMap(chosenMapId());
  view.setTheme(map);
  if (els.brandSub) els.brandSub.textContent = `${map.name} · 桌面对局`;
  try {
    sessionStorage.setItem("mono-map", map.id);
  } catch (_) {}
  state = createInitialState({ startMoney, humanCount, aiCount, names });
  if (autoHumans) setAllHumanAuto(state, true);
  play(clickAudio);
  if (opts.collapseSetup && els.setupDetails) els.setupDetails.open = false;
  render();
  view.resetTable();
  runAutoLoop(my);
}

function deedChecks(listEl, ownerId, name) {
  const cells = state.cells.filter((c) => isDeed(c) && c.owner === ownerId);
  listEl.innerHTML = cells.length
    ? cells
        .map(
          (c) => `<li>
            <label>
              <input type="checkbox" data-idx="${c.index}" />
              ${c.name}（$${c.value}${c.level ? ` · ${buildLevelLabel(c.level)}` : ""}）
            </label>
          </li>`
        )
        .join("")
    : `<li>${name} 暂无产业</li>`;
}

function selectedIdx(listEl) {
  return [...listEl.querySelectorAll("input[type=checkbox]:checked")].map((el) => Number(el.dataset.idx));
}

function fillTradePartner() {
  const p = currentPlayer(state);
  els.tradePartner.innerHTML = state.players
    .filter((pl) => !pl.bankrupt && pl.id !== p.id)
    .map((pl) => `<option value="${pl.id}">${pl.name}</option>`)
    .join("");
}

function refreshTradeLists() {
  const p = currentPlayer(state);
  const toId = Number(els.tradePartner.value);
  const to = state.players[toId];
  deedChecks(els.tradeGive, p.id, "你");
  deedChecks(els.tradeTake, toId, to?.name || "对方");
}

function openTradePanel() {
  if (!state || state.phase !== "ready") return;
  const p = currentPlayer(state);
  if (!p?.isHuman || p.auto) return;
  fillTradePartner();
  if (!els.tradePartner.options.length) {
    els.message.textContent = "没有可交易的对象";
    return;
  }
  els.tradeCash.value = "0";
  els.tradeStatus.textContent = "";
  refreshTradeLists();
  els.tradeOverlay.hidden = false;
}

function closeTradePanel() {
  if (els.tradeOverlay) els.tradeOverlay.hidden = true;
}

function submitTrade() {
  if (!state) return;
  const p = currentPlayer(state);
  const offer = {
    fromId: p.id,
    toId: Number(els.tradePartner.value),
    give: selectedIdx(els.tradeGive),
    take: selectedIdx(els.tradeTake),
    cashFrom: Number(els.tradeCash.value) || 0,
  };
  const partner = state.players[offer.toId];
  if (partner && !partner.isHuman) {
    if (!aiAcceptsTrade(state, offer)) {
      els.tradeStatus.textContent = `${partner.name} 拒绝了这笔交易（觉得吃亏）。`;
      play(clickAudio);
      return;
    }
  }
  const result = tryTrade(state, offer);
  if (!result.ok) {
    els.tradeStatus.textContent = result.reason;
    return;
  }
  closeTradePanel();
  play(selectAudio);
  render();
}

view.onPick = (index) => {
  if (!state || !isDeed(state.cells[index])) return;
  openDeed(index);
};
view.onHover = (index, x, y) => {
  if (index == null) hideTip();
  else showTip(index, x, y);
};

els.dice?.addEventListener("click", onDice);
function chosenMapId() {
  return document.querySelector("#mapPick .map-card.is-on")?.dataset.map || "world";
}

function renderMapPicker() {
  let saved = "world";
  try {
    saved = sessionStorage.getItem("mono-map") || "world";
  } catch (_) {}
  if (!MAPS.some((map) => map.id === saved)) saved = "world";
  els.mapPick.innerHTML = MAPS.map(
    (map) => `<button type="button" class="map-card${map.id === saved ? " is-on" : ""}" data-map="${map.id}">
      <span class="map-swatch" style="--felt:${map.felt};--paper:${map.paper}"></span>
      <span>
        <span class="map-name">${map.name}</span>
        <span class="map-tag">${map.tag} · ${map.blurb}</span>
      </span>
    </button>`
  ).join("");
}

els.mapPick?.addEventListener("click", (ev) => {
  const btn = ev.target.closest("[data-map]");
  if (!btn || btn.classList.contains("is-on")) return;
  els.mapPick.querySelectorAll(".map-card").forEach((card) => {
    card.classList.toggle("is-on", card === btn);
  });
  startNew();
});

els.btnNew.addEventListener("click", () => startNew({ collapseSetup: true }));
els.dialogOk.addEventListener("click", () => onDialog(true));
els.dialogCancel.addEventListener("click", () => onDialog(false));
els.btnSell?.addEventListener("click", openAssetPanel);
els.btnTrade?.addEventListener("click", openTradePanel);
els.tradeClose?.addEventListener("click", closeTradePanel);
els.tradeOk?.addEventListener("click", submitTrade);
els.tradePartner?.addEventListener("change", refreshTradeLists);
els.tradeOverlay?.addEventListener("click", (ev) => {
  if (ev.target === els.tradeOverlay) closeTradePanel();
});
els.assetClose?.addEventListener("click", closeAssetPanel);
els.assetBankrupt?.addEventListener("click", onGiveUpBankrupt);
els.assetOverlay?.addEventListener("click", (ev) => {
  if (ev.target === els.assetOverlay && state?.phase !== "raise") closeAssetPanel();
});
els.deedClose.addEventListener("click", closeDeed);
els.deedOverlay.addEventListener("click", (ev) => {
  if (ev.target === els.deedOverlay) closeDeed();
});
document.getElementById("camTable")?.addEventListener("click", () => view.setCamera("table"));
document.getElementById("camTop")?.addEventListener("click", () => view.setCamera("top"));
document.getElementById("camLow")?.addEventListener("click", () => view.setCamera("low"));
document.addEventListener("keydown", (ev) => {
  if (ev.key === "Escape") {
    closeDeed();
    closeTradePanel();
    if (state?.phase !== "raise") closeAssetPanel();
  }
  if (ev.code === "Space") {
    const tag = document.activeElement?.tagName;
    if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA" || tag === "BUTTON") return;
    ev.preventDefault();
    onDice();
  }
});
els.btnSpeed.addEventListener("click", () => {
  fast = !fast;
  els.btnSpeed.textContent = fast ? "正常速度" : "加快速度";
});
els.btnAuto.addEventListener("click", () => {
  autoHumans = !autoHumans;
  els.btnAuto.textContent = autoHumans ? "取消托管" : "开启托管";
  if (state) {
    setAllHumanAuto(state, autoHumans);
    render();
    runAutoLoop();
  }
});

function syncCounts() {
  const h = Number(els.humanCount.value);
  if (h + Number(els.aiCount.value) > 4) {
    els.aiCount.value = String(Math.max(0, 4 - h));
  }
  if (h + Number(els.aiCount.value) < 2) {
    els.aiCount.value = "1";
  }
}
els.humanCount.addEventListener("change", syncCounts);
els.aiCount.addEventListener("change", syncCounts);

renderMapPicker();

try {
  await view.ready;
  if (els.bootNote) els.bootNote.hidden = true;
  startNew();
} catch (err) {
  console.error(err);
  if (els.bootNote) {
    els.bootNote.hidden = false;
    els.bootNote.textContent = "立体棋盘没有加载成功。请检查网络后刷新，页面需要加载 Three.js。";
  }
}
