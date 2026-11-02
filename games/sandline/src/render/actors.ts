import * as THREE from 'three';
import type { Actor, WeaponKind } from '../game/types';

const GUN_COLOR: Record<WeaponKind, number> = {
  rifle: 0x6b4a2a, pistol: 0x22262c, smg: 0x3a4048, shotgun: 0x5a4632,
  m4: 0x2c3238, sniper: 0x1c2420, knife: 0xd0d4dc, deagle: 0xc4a15a,
};

function mat(color: number, roughness = 0.7) {
  return new THREE.MeshStandardMaterial({ color, roughness });
}

export function createSoldier(team: 'blue' | 'red') {
  const root = new THREE.Group();
  const cloth = team === 'blue' ? 0x2f4f86 : 0x8a3a32;
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.62, 4, 8), mat(cloth));
  body.position.y = 1.05;
  body.castShadow = true;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), mat(0xd7b394, 0.6));
  head.position.y = 1.62;
  head.castShadow = true;
  const helm = new THREE.Mesh(new THREE.SphereGeometry(0.175, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.55), mat(team === 'blue' ? 0x24324a : 0x4a3028, 0.5));
  helm.position.y = 1.68;
  const gun = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.55), mat(0x23272c, 0.4));
  gun.position.set(0.22, 1.15, -0.28);
  const bomb = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.28), mat(0x3a3a32, 0.8));
  bomb.position.set(0, 1.05, 0.22);
  bomb.visible = false;
  root.add(body, head, helm, gun, bomb);
  root.userData.parts = { body, head, gun, bomb };
  return root;
}

export function createHostage() {
  const root = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.5, 4, 8), mat(0xd8c07a));
  body.position.y = 0.9;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), mat(0xe0b89a));
  head.position.y = 1.42;
  root.add(body, head);
  return root;
}

export function updateSoldier(root: THREE.Group, actor: Actor, view: boolean) {
  const parts = root.userData.parts as { gun: THREE.Mesh; bomb: THREE.Mesh };
  const alive = actor.health > 0 && actor.active !== false;
  root.visible = !view && actor.active !== false;
  if (!root.visible) return;
  const crouch = actor.crouched ? 0.72 : 1;
  root.scale.set(1, alive ? crouch : 1, 1);
  root.position.set(actor.x, actor.y ?? 0, actor.z);
  root.rotation.set(alive ? 0 : Math.PI / 2, actor.yaw, 0);
  if (!alive) root.position.y += 0.35;
  (parts.gun.material as THREE.MeshStandardMaterial).color.setHex(GUN_COLOR[actor.weapon]);
  parts.gun.visible = actor.weapon !== 'knife';
  parts.bomb.visible = !!actor.hasBomb && alive;
  const bob = alive && actor.moving ? Math.sin(performance.now() * 0.01 + actor.id) * 0.03 : 0;
  parts.gun.position.y = 1.15 + bob;
}
