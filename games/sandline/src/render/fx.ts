import * as THREE from 'three';
import type { GameEvent, Grenade, GroundWeapon, WeaponKind } from '../game/types';
import { LOADOUTS } from '../game/loadouts';

const TINT: Record<WeaponKind, number> = {
  rifle: 0x8a5a32, pistol: 0x22262c, smg: 0x4a545c, shotgun: 0x6a5340,
  m4: 0x343a40, sniper: 0x243028, knife: 0xd8dce4, deagle: 0xc4a15a,
};

export class CombatFx {
  readonly root = new THREE.Group();
  private readonly tracers: { line: THREE.Line; life: number }[] = [];
  private readonly sparks: THREE.Mesh[] = [];
  private sparkCursor = 0;
  private readonly bursts: { mesh: THREE.Mesh; life: number }[] = [];
  private readonly grenadeMeshes = new Map<number, THREE.Mesh>();
  private readonly pickups = new Map<number, THREE.Mesh>();
  private readonly grenadeGeo = new THREE.SphereGeometry(0.08, 8, 6);
  private readonly grenadeMat = new THREE.MeshStandardMaterial({ color: 0x3d4a32, roughness: 0.6 });

  constructor() {
    const tracerMat = new THREE.LineBasicMaterial({ color: 0xf4c47b, transparent: true, opacity: 0.7 });
    for (let i = 0; i < 24; i++) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
      const line = new THREE.Line(geometry, tracerMat);
      line.visible = false;
      line.frustumCulled = false;
      this.root.add(line);
      this.tracers.push({ line, life: 0 });
    }
    const sparkGeo = new THREE.SphereGeometry(0.05, 6, 4);
    const sparkMat = new THREE.MeshBasicMaterial({ color: 0xffe0a0 });
    for (let i = 0; i < 20; i++) {
      const mesh = new THREE.Mesh(sparkGeo, sparkMat);
      mesh.visible = false;
      this.root.add(mesh);
      this.sparks.push(mesh);
    }
  }

  emit(event: GameEvent) {
    if (event.type === 'shot' && event.tracer && event.x != null && event.endX != null) {
      const slot = this.tracers.find((t) => t.life <= 0) ?? this.tracers[0];
      const position = slot.line.geometry.getAttribute('position') as THREE.BufferAttribute;
      position.setXYZ(0, event.x, event.y ?? 1.4, event.z ?? 0);
      position.setXYZ(1, event.endX, event.endY ?? 1, event.endZ ?? 0);
      position.needsUpdate = true;
      slot.line.visible = true;
      slot.life = 0.06;
    }
    if ((event.type === 'impact' || event.type === 'hit') && event.x != null) {
      const spark = this.sparks[this.sparkCursor++ % this.sparks.length];
      spark.position.set(event.x, event.y ?? 1, event.z ?? 0);
      spark.visible = true;
      spark.scale.setScalar(event.type === 'hit' ? 1.4 : 0.7);
      spark.userData.life = 0.18;
    }
    if (event.type === 'explosion' || event.type === 'bombExplode') {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(event.type === 'bombExplode' ? 2.4 : 0.8, 12, 8),
        new THREE.MeshBasicMaterial({ color: event.type === 'bombExplode' ? 0xffb15a : 0xffe2a0, transparent: true, opacity: 0.7 }),
      );
      mesh.position.set(event.x ?? 0, event.y ?? 0.4, event.z ?? 0);
      this.root.add(mesh);
      this.bursts.push({ mesh, life: event.type === 'bombExplode' ? 0.8 : 0.35 });
    }
  }

  update(dt: number, grenades: readonly Grenade[], pickups: readonly GroundWeapon[]) {
    for (const tracer of this.tracers) {
      if (tracer.life <= 0) continue;
      tracer.life -= dt;
      if (tracer.life <= 0) tracer.line.visible = false;
    }
    for (const spark of this.sparks) {
      if (!spark.visible) continue;
      spark.userData.life -= dt;
      spark.scale.multiplyScalar(0.92);
      if (spark.userData.life <= 0) spark.visible = false;
    }
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const burst = this.bursts[i];
      burst.life -= dt;
      burst.mesh.scale.multiplyScalar(1 + dt * 2.2);
      (burst.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, burst.life * 1.4);
      if (burst.life <= 0) {
        burst.mesh.geometry.dispose();
        (burst.mesh.material as THREE.Material).dispose();
        this.root.remove(burst.mesh);
        this.bursts.splice(i, 1);
      }
    }
    const seenGrenades = new Set<number>();
    for (const grenade of grenades) {
      seenGrenades.add(grenade.id);
      let mesh = this.grenadeMeshes.get(grenade.id);
      if (!mesh) {
        mesh = new THREE.Mesh(this.grenadeGeo, this.grenadeMat);
        this.grenadeMeshes.set(grenade.id, mesh);
        this.root.add(mesh);
      }
      mesh.position.set(grenade.x, grenade.y, grenade.z);
    }
    for (const [id, mesh] of this.grenadeMeshes) {
      if (seenGrenades.has(id)) continue;
      this.root.remove(mesh);
      this.grenadeMeshes.delete(id);
    }
    const seenPickups = new Set<number>();
    for (const pickup of pickups) {
      seenPickups.add(pickup.id);
      let mesh = this.pickups.get(pickup.id);
      if (!mesh) {
        mesh = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.16), new THREE.MeshStandardMaterial({ color: TINT[pickup.weapon] }));
        mesh.name = LOADOUTS[pickup.weapon].name;
        this.pickups.set(pickup.id, mesh);
        this.root.add(mesh);
      }
      mesh.position.set(pickup.x, (pickup.y ?? 0) + 0.18, pickup.z);
      mesh.rotation.y += dt;
    }
    for (const [id, mesh] of this.pickups) {
      if (seenPickups.has(id)) continue;
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
      this.root.remove(mesh);
      this.pickups.delete(id);
    }
  }
}
