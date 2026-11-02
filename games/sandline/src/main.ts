import './ui/style.css';
import * as THREE from 'three';
import { Simulation, eyeHeight } from './game/simulation';
import { EMPTY_INPUT, type PlayerInput, type WeaponKind } from './game/types';
import { getActiveMap, setActiveMap } from './game/map';
import { allowsWeapon, type PlayableMode } from './game/offlineModes';
import { isAirborne } from './game/jump';
import { weaponReady, weaponSwitchPose } from './game/weaponSwitch';
import { createWorld } from './render/world';
import { createSnowWorld } from './render/snowWorld';
import { FirstPersonMotion } from './render/firstPersonMotion';
import { createSoldier, createHostage, updateSoldier } from './render/actors';
import { createViewWeapons, poseViewWeapon } from './render/viewWeapon';
import { CombatFx } from './render/fx';
import { GameAudio } from './audio';
import { Controls } from './ui/input';
import { Hud } from './ui/hud';

const params = new URLSearchParams(location.search);
const simulation = new Simulation(20261102);
const audio = new GameAudio();
const canvas = document.createElement('canvas');
canvas.id = 'game';
document.body.prepend(canvas);

let renderer: THREE.WebGLRenderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
} catch {
  document.getElementById('webgl-fail')!.classList.remove('hidden');
  throw new Error('WebGL');
}
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog('#c8b89a', 28, 78);
const hemi = new THREE.HemisphereLight('#f0e2c8', '#6a5438', 1.15);
const sun = new THREE.DirectionalLight('#ffe2b0', 2.2);
sun.position.set(-16, 28, 12);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = sun.shadow.camera.bottom = -30;
sun.shadow.camera.right = sun.shadow.camera.top = 30;
scene.add(hemi, sun);

setActiveMap('desert');
const desert = createWorld();
setActiveMap('snow');
const snow = createSnowWorld();
setActiveMap('desert');
snow.visible = false;
scene.add(desert, snow);

const fx = new CombatFx();
scene.add(fx.root);
const soldiers = Array.from({ length: 21 }, (_, index) => {
  const soldier = createSoldier(index < 11 ? 'blue' : 'red');
  scene.add(soldier);
  return soldier;
});
const hostages = Array.from({ length: 4 }, () => {
  const hostage = createHostage();
  hostage.visible = false;
  scene.add(hostage);
  return hostage;
});
const bombMesh = new THREE.Mesh(
  new THREE.BoxGeometry(0.38, 0.16, 0.24),
  new THREE.MeshStandardMaterial({ color: 0x242820, emissive: 0x663311, emissiveIntensity: 0.4 }),
);
bombMesh.visible = false;
scene.add(bombMesh);

const camera = new THREE.PerspectiveCamera(58, 1, 0.08, 180);
camera.rotation.order = 'YXZ';
const motion = new FirstPersonMotion();
const weaponScene = new THREE.Scene();
weaponScene.add(new THREE.HemisphereLight('#e7f0f2', '#6e6248', 0.7));
const weaponLight = new THREE.DirectionalLight('#fff1dc', 1.8);
weaponLight.position.set(-1.5, 2.4, 2);
weaponScene.add(weaponLight);
const weaponCamera = new THREE.PerspectiveCamera(52, 1, 0.02, 8);
const weaponRoot = new THREE.Group();
weaponRoot.position.set(0.24, -0.22, -0.48);
weaponScene.add(weaponRoot);
const arms = new THREE.Group();
const armMat = new THREE.MeshStandardMaterial({ color: 0xd7b394, roughness: 0.7 });
const sleeveMat = new THREE.MeshStandardMaterial({ color: 0x31486e, roughness: 0.8 });
for (const side of [-1, 1]) {
  const sleeve = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.08, 0.28), sleeveMat);
  sleeve.position.set(side * 0.16, -0.04, 0.08);
  const hand = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, 0.08), armMat);
  hand.position.set(side * 0.1, -0.02, -0.08);
  arms.add(sleeve, hand);
}
weaponRoot.add(arms);
const weapons = createViewWeapons();
weaponRoot.add(...Object.values(weapons));

const controls = new Controls(canvas);
let kick = 0;
let last = performance.now();
let accumulator = 0;
let pending: PlayerInput = { ...EMPTY_INPUT };
let started = false;
let mode: PlayableMode = 'deathmatch';
let previousPhase = simulation.state.phase;

function showWorld() {
  const snowy = getActiveMap().id === 'snow';
  desert.visible = !snowy;
  snow.visible = snowy;
  scene.background = new THREE.Color(snowy ? '#c5d0d8' : '#d7c3a4');
  scene.fog = new THREE.Fog(snowy ? '#d5dee4' : '#c8b89a', snowy ? 36 : 26, snowy ? 90 : 72);
  sun.intensity = snowy ? 1.35 : 2.15;
  sun.color.set(snowy ? '#f7fbff' : '#ffe2b0');
}

function resize() {
  const width = innerWidth;
  const height = Math.max(1, innerHeight);
  renderer.setSize(width, height);
  camera.aspect = width / height;
  applyFov();
  weaponCamera.aspect = camera.aspect;
  weaponCamera.updateProjectionMatrix();
}

const hud = new Hud({
  onMap: (id) => {
    if (simulation.state.phase !== 'menu') return;
    setActiveMap(id);
    simulation.refreshMap();
    showWorld();
    hud.selectMap(id);
  },
  onMode: (next) => {
    if (!simulation.selectMode(next)) return;
    mode = next;
    hud.selectMode(next);
  },
  onBots: (teammates, enemies) => {
    if (!simulation.setBotCounts(teammates, enemies)) return;
    hud.selectBots(teammates, enemies);
  },
  onStart: () => startMatch(),
  onResume: () => resume(),
  onMenu: () => backToMenu(),
  onShop: (open) => setShop(open),
  onPurchase: (item) => {
    const ok = simulation.purchase(item);
    audio.ui(ok ? 'confirm' : 'cancel');
    hud.update(simulation.state);
    return ok;
  },
  onUpgrade: (id) => {
    if (simulation.chooseDefenseUpgrade(id)) audio.ui('confirm');
    hud.update(simulation.state);
  },
  onWave: () => {
    if (!simulation.startDefenseWave()) return;
    hud.show('defense', false);
    controls.clear();
    lock();
    hud.update(simulation.state);
  },
});

function setShop(open: boolean) {
  const state = simulation.state;
  if (open) {
    if (state.phase === 'menu' || state.phase === 'matchEnd') return;
    simulation.setPaused(true);
    controls.active = false;
    controls.clear();
    release();
  } else if (hud.shopOpen && state.phase !== 'menu' && state.phase !== 'matchEnd' && state.phase !== 'intermission') {
    simulation.setPaused(false);
    controls.active = true;
    lock();
  }
  hud.setShop(open);
  hud.update(simulation.state);
}

function lock() {
  if (matchMedia('(pointer: coarse)').matches) return;
  canvas.requestPointerLock?.()?.catch(() => {});
}

function release() {
  if (document.pointerLockElement) document.exitPointerLock();
}

function startMatch() {
  audio.unlock();
  simulation.start();
  started = true;
  kick = 0;
  controls.aiming = false;
  controls.clear();
  controls.setOwned(simulation.state.player.inventory);
  hud.show('menu', false);
  hud.show('pause', false);
  hud.show('result', false);
  hud.show('hud', true);
  const playing = simulation.state.phase === 'playing' || simulation.state.phase === 'planted';
  controls.active = playing;
  if (playing) lock();
  hud.update(simulation.state);
}

function resume() {
  audio.unlock();
  hud.setShop(false);
  simulation.setPaused(false);
  controls.active = true;
  controls.clear();
  hud.show('pause', false);
  lock();
}

function backToMenu() {
  simulation.menu();
  started = false;
  controls.active = false;
  controls.aiming = false;
  controls.clear();
  release();
  hud.setShop(false);
  hud.show('pause', false);
  hud.show('result', false);
  hud.show('hud', false);
  hud.show('defense', false);
  hud.show('menu', true);
  showWorld();
}

addEventListener('keydown', (event) => {
  if (event.repeat) return;
  if (event.code === 'KeyB') {
    const phase = simulation.state.phase;
    if (phase === 'menu' || phase === 'matchEnd') return;
    setShop(!hud.shopOpen);
  }
  if (hud.shopOpen && event.code.startsWith('Digit')) hud.buySlot(Number(event.code.slice(5)));
});
addEventListener('pointerdown', () => audio.unlock());
document.addEventListener('pointerlockchange', () => {
  if (!document.pointerLockElement && controls.active && !hud.shopOpen && simulation.state.phase !== 'intermission') {
    simulation.setPaused(true);
    controls.active = false;
    hud.show('pause', true);
  }
});
addEventListener('resize', resize);
resize();
hud.selectMap('desert');
hud.selectMode('deathmatch');
hud.selectBots(2, 3);
showWorld();

const coarse = matchMedia('(pointer: coarse)').matches || params.has('touch');
document.body.classList.toggle('is-touch', coarse);

function applyFov() {
  const scoped = document.body.classList.contains('is-scoped');
  const aiming = document.body.classList.contains('is-aiming');
  const mag = scoped ? 2.7 : aiming ? 1.28 : 1;
  const next = (2 * Math.atan(Math.tan((78 * Math.PI) / 360) / (camera.aspect * mag)) * 180) / Math.PI;
  if (Math.abs(camera.fov - next) > 0.05) {
    camera.fov = next;
    camera.updateProjectionMatrix();
  }
}

function frame(now: number) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const state = simulation.state;
  document.body.classList.toggle('is-aiming', controls.aiming && state.player.weapon !== 'knife' && state.player.health > 0);
  const intent = controls.consume();
  if (intent.pause) {
    if (hud.shopOpen) setShop(false);
    else if (state.paused) resume();
    else if (state.phase === 'playing' || state.phase === 'planted' || state.phase === 'intermission') {
      simulation.setPaused(true);
      controls.active = false;
      release();
      hud.show('pause', true);
    }
  }
  const live = !state.paused && (state.phase === 'playing' || state.phase === 'planted' || state.phase === 'roundEnd');
  if (live) {
    pending = {
      ...intent,
      jump: pending.jump || intent.jump,
      fire: pending.fire || intent.fire,
      reload: pending.reload || intent.reload,
      grenade: pending.grenade || intent.grenade,
      secondaryFire: pending.secondaryFire || intent.secondaryFire,
      interact: pending.interact || intent.interact,
      switchWeapon: intent.switchWeapon || pending.switchWeapon,
      lookDX: pending.lookDX + intent.lookDX,
      lookDY: pending.lookDY + intent.lookDY,
    };
    accumulator += dt;
    let steps = 0;
    while (accumulator >= 1 / 60 && steps++ < 4) {
      simulation.update(1 / 60, state.phase === 'roundEnd' ? EMPTY_INPUT : pending);
      accumulator -= 1 / 60;
      pending = {
        ...intent,
        jump: false,
        fire: !!intent.fireHeld,
        reload: false,
        grenade: false,
        secondaryFire: false,
        lookDX: 0,
        lookDY: 0,
        switchWeapon: null,
        interact: !!intent.interact,
      };
    }
  } else {
    accumulator = 0;
    pending = { ...EMPTY_INPUT };
  }

  const view = state.player.health > 0 ? state.player : state.spectating;
  for (const event of simulation.events) {
    if (event.type === 'shot' && event.actorId === 0) kick = Math.min(0.16, kick + (event.weapon === 'sniper' ? 0.05 : event.weapon === 'shotgun' ? 0.04 : 0.018));
    audio.play(event, event.actorId === 0 ? 0 : 8);
    fx.emit(event);
    if (event.type === 'respawn' && event.actorId === 0) {
      controls.aiming = false;
      controls.setOwned(state.player.inventory);
      kick = 0;
    }
    if (event.type === 'weaponPickup' && event.actorId === 0) controls.setOwned(state.player.inventory);
  }
  simulation.events = [];
  kick *= Math.exp(-dt / 0.12);

  if (state.phase === 'menu') {
    const spin = now * 0.00008;
    camera.position.set(Math.sin(spin) * 10 + 8, 4.2, 16);
    camera.lookAt(0, 1.4, 0);
  } else if (view) {
    motion.update({
      x: view.x, y: eyeHeight(view), z: view.z, yaw: view.yaw, pitch: view.pitch,
      speed: view.moving ? (view.moveSpeed ?? 3.9) : 0, moving: view.moving, crouched: view.crouched,
      airborne: isAirborne(view), aiming: controls.aiming, weapon: view.weapon, actorId: view.id,
      spawnTime: view.spawnedAt, time: state.time,
    }, dt);
    camera.position.set(view.x, eyeHeight(view), view.z);
    camera.rotation.set(view.pitch - kick, view.yaw, 0);
  }

  soldiers.forEach((soldier, index) => {
    const actor = state.actors[index];
    if (!actor) {
      soldier.visible = false;
      return;
    }
    updateSoldier(soldier, actor, actor === view);
  });
  const rescue = state.rescue?.hostages ?? [];
  hostages.forEach((mesh, index) => {
    const hostage = rescue[index];
    mesh.visible = !!hostage && hostage.status !== 'rescued';
    if (!hostage) return;
    mesh.position.set(hostage.x, hostage.y, hostage.z);
    mesh.rotation.y = hostage.yaw;
  });
  const bomb = state.bomb;
  bombMesh.visible = state.mode === 'demolition' && (bomb.status === 'dropped' || bomb.status === 'planted');
  if (bombMesh.visible) {
    bombMesh.position.set(bomb.x, (bomb.y ?? 0) + 0.12, bomb.z);
    const mat = bombMesh.material as THREE.MeshStandardMaterial;
    mat.emissiveIntensity = bomb.status === 'planted' ? 0.6 + Math.sin(now * 0.01) * 0.4 : 0.15;
  }
  fx.update(dt, state.grenades, state.pickups);

  const player = state.player;
  const displayed = (player.weaponSwitch?.displayed ?? player.weapon) as WeaponKind;
  const pose = weaponSwitchPose(displayed, player.weaponSwitch?.depth ?? 0);
  const sway = motion.offset;
  const ads = controls.aiming && player.weapon !== 'knife' ? 1 : 0;
  weaponRoot.position.set(
    0.24 * (1 - ads) + sway.x + pose.x,
    -0.22 + sway.y + pose.y,
    -0.48 + sway.z + pose.z,
  );
  weaponRoot.rotation.set(sway.pitch + pose.pitch, sway.yaw + pose.yaw, sway.roll + pose.roll, 'YXZ');
  for (const kind of Object.keys(weapons) as WeaponKind[]) {
    weapons[kind].visible = kind === displayed && player.health > 0 && state.phase !== 'menu' && state.phase !== 'matchEnd';
    if (weapons[kind].visible) poseViewWeapon(weapons[kind], player, state.time);
  }
  const canAim = weaponReady(player) && player.health > 0 && player.weapon !== 'knife';
  if (!canAim) controls.aiming = false;
  applyFov();

  const playing = state.phase === 'playing' || state.phase === 'planted';
  controls.active = started && playing && !state.paused && !hud.shopOpen && player.health > 0;
  controls.setOwned(player.inventory.filter((kind) => allowsWeapon(state.mode, kind)));

  renderer.autoClear = false;
  renderer.clear();
  renderer.render(scene, camera);
  const showWeapon = player.health > 0 && playing && !state.paused && !document.body.classList.contains('is-scoped');
  if (showWeapon) {
    renderer.clearDepth();
    renderer.render(weaponScene, weaponCamera);
  }
  if (state.mode === 'bounty' && state.phase === 'playing' && previousPhase === 'roundEnd' && state.round > 1) setShop(true);
  previousPhase = state.phase;
  hud.update(state);
}

if (params.get('map') === 'snow') {
  setActiveMap('snow');
  simulation.refreshMap();
  hud.selectMap('snow');
  showWorld();
}
const requested = params.get('mode');
if (requested && simulation.selectMode(requested as PlayableMode)) {
  mode = requested as PlayableMode;
  hud.selectMode(mode);
}
if (params.has('play')) startMatch();

requestAnimationFrame(frame);

window.__SANDLINE__ = { simulation, start: startMatch, audio };
