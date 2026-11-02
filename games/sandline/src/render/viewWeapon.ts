import * as THREE from 'three';
import { WEAPON_KINDS, type WeaponKind } from '../game/types';
import { LOADOUTS } from '../game/loadouts';
import type { Actor } from '../game/types';

function metal(color: number, roughness = 0.45, metalness = 0.35) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function add(parent: THREE.Object3D, mesh: THREE.Mesh, x: number, y: number, z: number) {
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

function build(kind: WeaponKind) {
  const root = new THREE.Group();
  root.name = kind;
  const dark = metal(0x2a2e32, 0.55, 0.2);
  const steel = metal(0x8d9290, 0.35, 0.7);
  const wood = metal(0x7a5230, 0.8, 0);
  const brass = metal(0xc6a15a, 0.4, 0.6);
  if (kind === 'knife') {
    add(root, new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.02, 0.28), steel), 0, 0, -0.2);
    add(root, new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.045, 0.12), dark), 0, -0.01, 0.02);
  } else if (kind === 'pistol' || kind === 'deagle') {
    const slide = kind === 'deagle' ? brass : steel;
    add(root, new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 0.18), slide), 0, 0.03, -0.08);
    add(root, new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.09, 0.05), dark), 0, -0.04, 0.02);
  } else {
    const length = kind === 'sniper' ? 0.86 : kind === 'shotgun' ? 0.74 : kind === 'smg' ? 0.46 : kind === 'm4' ? 0.66 : 0.7;
    const bodyColor = kind === 'rifle' ? wood : kind === 'shotgun' ? wood : dark;
    add(root, new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.05, length), bodyColor), 0, 0.02, -length * 0.35);
    add(root, new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, length * 0.72), steel), 0, 0.055, -length * 0.42);
    add(root, new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.1, 0.08), dark), 0, -0.05, 0.02);
    if (kind === 'sniper') add(root, new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.05, 0.16), dark), 0, 0.09, -0.12);
    if (kind === 'rifle') add(root, new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.08, 0.16), wood), 0, 0.02, 0.12);
  }
  const muzzle = new THREE.Object3D();
  muzzle.name = 'muzzle';
  const z = kind === 'knife' ? -0.34 : kind === 'pistol' ? -0.2 : kind === 'deagle' ? -0.22 : kind === 'smg' ? -0.42 : kind === 'shotgun' ? -0.7 : kind === 'sniper' ? -0.84 : kind === 'm4' ? -0.62 : -0.66;
  muzzle.position.set(0, 0.05, z);
  root.add(muzzle);
  root.userData.kind = kind;
  return root;
}

export function createViewWeapons() {
  const weapons = {} as Record<WeaponKind, THREE.Group>;
  for (const kind of WEAPON_KINDS) weapons[kind] = build(kind);
  return weapons;
}

export function poseViewWeapon(gun: THREE.Group, actor: Actor, time: number) {
  const kind = gun.userData.kind as WeaponKind;
  const age = time - actor.shotTime;
  const spec = LOADOUTS[kind];
  const reload = actor.guns[kind].reloadLeft;
  let pitch = 0;
  let y = 0;
  let roll = 0;
  if (kind !== 'knife' && age >= 0 && age < spec.interval) {
    const t = 1 - age / spec.interval;
    pitch = -0.08 * t * (kind === 'sniper' ? 1.8 : kind === 'deagle' ? 1.5 : 1);
  }
  if (kind === 'knife' && age >= 0 && age < 0.45) {
    const t = age / 0.45;
    roll = actor.meleeAttack === 'stab' ? 0 : -1.1 * Math.sin(t * Math.PI);
    pitch = actor.meleeAttack === 'stab' ? -0.8 * Math.sin(t * Math.PI) : -0.2 * t;
  }
  if (reload > 0 && spec.reload > 0) y = -0.12 * Math.sin((1 - reload / spec.reload) * Math.PI);
  gun.rotation.set(pitch, 0, roll);
  gun.position.y = y;
}
