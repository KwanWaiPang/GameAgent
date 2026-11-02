import { LOADOUTS, ITEM_PRICES, type ArsenalItem } from '../game/loadouts';
import { DEFENSE_UPGRADES, PLAYABLE_MODES, mapPlayableModes, raceRanking, type PlayableMode } from '../game/offlineModes';
import { objectiveInteraction } from '../game/objectiveInteraction';
import { nearestPickup } from '../game/pickups';
import { purchaseWindow } from '../game/economy';
import { BOT_PRESETS } from '../game/botRoster';
import { MAPS, type MapId } from '../game/map';
import type { GameSnapshot, WeaponKind } from '../game/types';

const SHOP_ITEMS: ArsenalItem[] = ['rifle', 'pistol', 'smg', 'shotgun', 'm4', 'sniper', 'deagle', 'armor', 'ammo', 'he', 'defuseKit'];

export class Hud {
  readonly root = document.body;
  shopOpen = false;
  private feedSeen = 0;
  readonly onPurchase: (item: ArsenalItem) => boolean;
  readonly onUpgrade: (id: keyof typeof DEFENSE_UPGRADES) => void;
  readonly onWave: () => void;

  constructor(hooks: {
    onPurchase: (item: ArsenalItem) => boolean;
    onUpgrade: (id: keyof typeof DEFENSE_UPGRADES) => void;
    onWave: () => void;
    onMap: (id: MapId) => void;
    onMode: (mode: PlayableMode) => void;
    onBots: (teammates: number, enemies: number) => void;
    onStart: () => void;
    onResume: () => void;
    onMenu: () => void;
    onShop: (open: boolean) => void;
  }) {
    this.onPurchase = hooks.onPurchase;
    this.onUpgrade = hooks.onUpgrade;
    this.onWave = hooks.onWave;
    const maps = document.getElementById('map-row')!;
    for (const id of ['desert', 'snow'] as const) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.map = id;
      button.innerHTML = `<strong>${MAPS[id].name}</strong><span>${MAPS[id].description}</span>`;
      button.addEventListener('click', () => hooks.onMap(id));
      maps.append(button);
    }
    const modes = document.getElementById('mode-row')!;
    for (const id of mapPlayableModes('desert')) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.mode = id;
      button.innerHTML = `<strong>${PLAYABLE_MODES[id].name}</strong><span>${PLAYABLE_MODES[id].description}</span>`;
      button.addEventListener('click', () => hooks.onMode(id));
      modes.append(button);
    }
    const bots = document.getElementById('bot-row')!;
    for (const count of BOT_PRESETS) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.bots = String(count);
      button.textContent = `${count}v${count}`;
      button.addEventListener('click', () => hooks.onBots(count - 1, count));
      bots.append(button);
    }
    const items = document.getElementById('shop-items')!;
    SHOP_ITEMS.forEach((item, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.item = item;
      const slot = index < 9 ? index + 1 : 0;
      button.dataset.slot = String(slot);
      button.addEventListener('click', () => hooks.onPurchase(item));
      items.append(button);
    });
    document.getElementById('shop-close')!.addEventListener('click', () => hooks.onShop(false));
    document.getElementById('start')!.addEventListener('click', hooks.onStart);
    document.getElementById('resume')!.addEventListener('click', hooks.onResume);
    document.getElementById('quit')!.addEventListener('click', hooks.onMenu);
    document.getElementById('result-menu')!.addEventListener('click', hooks.onMenu);
    document.getElementById('next-wave')!.addEventListener('click', hooks.onWave);
    for (const id of Object.keys(DEFENSE_UPGRADES) as (keyof typeof DEFENSE_UPGRADES)[]) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.upgrade = id;
      button.innerHTML = `<strong>${DEFENSE_UPGRADES[id].name}</strong><span>${DEFENSE_UPGRADES[id].description}</span>`;
      button.addEventListener('click', () => hooks.onUpgrade(id));
      document.getElementById('upgrades')!.append(button);
    }
  }

  setShop(open: boolean) {
    this.shopOpen = open;
    document.getElementById('shop')!.classList.toggle('hidden', !open);
  }

  selectMap(id: MapId) {
    document.querySelectorAll('#map-row button').forEach((button) => {
      button.classList.toggle('is-on', (button as HTMLButtonElement).dataset.map === id);
    });
  }

  selectMode(mode: PlayableMode) {
    document.querySelectorAll('#mode-row button').forEach((button) => {
      button.classList.toggle('is-on', (button as HTMLButtonElement).dataset.mode === mode);
    });
  }

  selectBots(teammates: number, enemies: number) {
    document.querySelectorAll('#bot-row button').forEach((button) => {
      const count = Number((button as HTMLButtonElement).dataset.bots);
      button.classList.toggle('is-on', count === enemies && count === teammates + 1);
    });
  }

  show(id: string, on: boolean) {
    document.getElementById(id)!.classList.toggle('hidden', !on);
  }

  update(state: GameSnapshot) {
    const player = state.player;
    const gun = player.guns[player.weapon];
    const spec = LOADOUTS[player.weapon];
    document.body.dataset.weapon = player.weapon;
    document.body.dataset.phase = state.phase;
    const text = (id: string, value: string) => { const node = document.getElementById(id); if (node) node.textContent = value; };
    text('hp', String(Math.max(0, Math.ceil(player.health))));
    text('armor', String(Math.ceil(player.armor)));
    text('ammo', player.weapon === 'knife' ? '—' : String(gun.ammo));
    text('reserve', player.weapon === 'knife' ? '' : `/ ${gun.reserve}`);
    text('weapon-name', spec.name);
    text('money', `$${player.money}`);
    text('grenades', String(player.grenades));
    const bar = document.getElementById('hp-bar') as HTMLElement;
    bar.style.transform = `scaleX(${Math.max(0, player.health) / 100})`;
    document.body.classList.toggle('is-hurt', state.time - player.hurtTime < 0.25 && player.health > 0);
    document.body.classList.toggle('is-scoped', state.phase !== 'menu' && player.weapon === 'sniper' && document.body.classList.contains('is-aiming') && player.health > 0);
    const objective = objectiveInteraction(state, player);
    const pickup = nearestPickup(state, player);
    const buy = purchaseWindow(state, player);
    let hint = objective?.hint ?? (pickup ? `按 E 拾取 ${LOADOUTS[pickup.weapon].name}` : '');
    if (!hint && buy.allowed) hint = buy.reason;
    if (player.health <= 0 && player.respawnAt) hint = `复活 ${Math.max(0, player.respawnAt - state.time).toFixed(1)} 秒`;
    if (state.spectating && player.health <= 0) hint = `观战 ${state.spectating.name}`;
    text('interact', hint);
    document.getElementById('interact')!.classList.toggle('hidden', !hint);
    const marker = document.getElementById('hitmarker')!;
    marker.classList.toggle('hidden', state.hitMarker <= 0);
    marker.classList.toggle('is-head', state.feed[0]?.headshot === true && state.time - state.feed[0].at < 0.2);
    const damage = document.getElementById('damage') as HTMLElement;
    damage.style.opacity = state.time - player.hurtTime < 0.8 ? '1' : '0';
    damage.style.transform = `rotate(${state.damageAngle}rad)`;
    const banner = document.getElementById('banner')!;
    let bannerText = '';
    if (state.phase === 'roundEnd') bannerText = state.roundReason || (state.winner === 'blue' ? '本回合胜利' : state.winner === 'red' ? '本回合失利' : '平局');
    else if (state.phase === 'planted') bannerText = `C4 ${Math.ceil(state.bomb.timer)} 秒`;
    else if (state.defense && state.phase === 'playing') bannerText = `第 ${state.defense.wave} 波 · 据点 ${Math.ceil(state.defense.health)} · 剩余 ${state.defense.remaining}`;
    else if (state.race?.alert && state.time < state.race.alertUntil) bannerText = state.race.alert;
    banner.textContent = bannerText;
    banner.classList.toggle('hidden', !bannerText);
    text('score', `${state.blueScore} : ${state.redScore}`);
    text('clock', formatClock(state));
    const feed = document.getElementById('feed')!;
    const feedStamp = state.feed[0] ? state.feed[0].at + state.feed.length : 0;
    if (feedStamp !== this.feedSeen) {
      this.feedSeen = feedStamp;
      feed.innerHTML = state.feed.slice(0, 5).map((entry) => `<li class="${entry.team}">${entry.killer} › ${entry.victim}${entry.headshot ? ' · 头部' : ''}</li>`).join('');
    }
    this.drawRadar(state);
    this.updateShop(state);
    this.updateDefense(state);
    this.updateRace(state);
    const result = state.phase === 'matchEnd';
    this.show('result', result);
    if (result) {
      const win = state.winner === 'blue' || (state.mode === 'armsRace' && state.race?.winnerId === 0);
      text('result-title', win ? '行动完成' : state.winner === 'draw' ? '平局' : '行动结束');
      text('result-body', state.defense?.reason || state.roundReason || `击杀 ${state.totalKills} · 阵亡 ${state.totalDeaths}`);
    }
  }

  private updateShop(state: GameSnapshot) {
    const buy = purchaseWindow(state);
    const reason = document.getElementById('shop-reason')!;
    reason.textContent = buy.reason;
    document.getElementById('shop-money')!.textContent = `$${state.player.money}`;
    document.querySelectorAll<HTMLButtonElement>('#shop-items button').forEach((button) => {
      const item = button.dataset.item as ArsenalItem;
      const price = priceOf(item);
      const name = item in LOADOUTS ? LOADOUTS[item as WeaponKind].name : labelOf(item);
      const slot = button.dataset.slot !== '0' ? button.dataset.slot : '';
      button.textContent = `${slot ? slot + '  ' : ''}${name}  $${price}`;
      button.disabled = !purchaseWindow(state, state.player, item).allowed;
    });
  }

  private updateDefense(state: GameSnapshot) {
    const panel = document.getElementById('defense')!;
    const show = state.mode === 'defense' && state.phase === 'intermission';
    panel.classList.toggle('hidden', !show);
    if (!show || !state.defense) return;
    document.getElementById('wave-label')!.textContent = state.defense.completed === 0
      ? '坚守据点 · 八波攻势'
      : `已击退 ${state.defense.completed} / ${state.defense.total} 波`;
    document.getElementById('next-wave')!.toggleAttribute('disabled', state.defense.upgradePending);
    document.querySelectorAll<HTMLButtonElement>('#upgrades button').forEach((button) => {
      const id = button.dataset.upgrade as keyof typeof DEFENSE_UPGRADES;
      const rank = state.defense?.upgrades[id] ?? 0;
      button.disabled = !state.defense?.upgradePending || rank >= 3;
      button.querySelector('span')!.textContent = `${DEFENSE_UPGRADES[id].description} · ${rank}/3`;
    });
  }

  private updateRace(state: GameSnapshot) {
    const node = document.getElementById('race')!;
    if (state.mode !== 'armsRace' || state.phase === 'menu') {
      node.classList.add('hidden');
      return;
    }
    node.classList.remove('hidden');
    node.innerHTML = raceRanking(state.actors).slice(0, 4).map((row) => `<li>${row.rank}. ${row.actor.name}</li>`).join('');
  }

  private drawRadar(state: GameSnapshot) {
    const canvas = document.getElementById('radar') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const size = canvas.width;
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = 'rgba(10, 16, 18, 0.55)';
    ctx.fillRect(0, 0, size, size);
    const map = 44;
    const project = (x: number, z: number) => [(x / map + 0.5) * size, (z / map + 0.5) * size];
    ctx.strokeStyle = 'rgba(232, 214, 180, 0.35)';
    for (const actor of state.actors) {
      if (actor.active === false || actor.health <= 0) continue;
      const [x, z] = project(actor.x, actor.z);
      ctx.fillStyle = actor.player ? '#f4e2b0' : actor.team === 'blue' ? '#7eb0e8' : '#e07a6a';
      ctx.beginPath();
      ctx.arc(x, z, actor.player ? 3.2 : 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  buySlot(slot: number) {
    const button = document.querySelector<HTMLButtonElement>(`#shop-items button[data-slot="${slot}"]`);
    if (button && !button.disabled) button.click();
  }
}

function priceOf(item: ArsenalItem) {
  return item in LOADOUTS ? LOADOUTS[item as WeaponKind].price : ITEM_PRICES[item as keyof typeof ITEM_PRICES];
}

function labelOf(item: ArsenalItem) {
  if (item === 'armor') return '护甲';
  if (item === 'ammo') return '弹药';
  if (item === 'he') return '手雷';
  if (item === 'defuseKit') return '拆弹器';
  return item;
}

function formatClock(state: GameSnapshot) {
  if (state.mode === 'deathmatch' || state.mode === 'knifeOnly' || state.mode === 'pistolOnly' || state.mode === 'bounty' || state.mode === 'armsRace') {
    const time = Math.floor(state.time);
    return `${Math.floor(time / 60)}:${String(time % 60).padStart(2, '0')}`;
  }
  const time = Math.max(0, Math.ceil(state.roundTime));
  return `${Math.floor(time / 60)}:${String(time % 60).padStart(2, '0')}`;
}

