/**
 * Bounded combat effects: a single instanced draw for hit sparks, and reusable
 * slash meshes. This prevents per-hit GPU buffer/material allocation.
 */
export function createCombatEffects(THREE, scene, { low = false, random = Math.random } = {}) {
  const capacity = low ? 72 : 192;
  const geometry = new THREE.TetrahedronGeometry(1, 0);
  const material = new THREE.MeshBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 0.92, depthWrite: false,
  });
  const instanced = new THREE.InstancedMesh(geometry, material, capacity);
  instanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  instanced.frustumCulled = false;
  instanced.renderOrder = 5;
  scene.add(instanced);
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  const sparks = Array.from({ length: capacity }, () => ({
    active: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0,
    life: 0, max: 1, size: 0.1,
  }));
  let sparkCursor = 0;
  const zeroMatrix = (index) => {
    dummy.position.set(0, -1000, 0);
    dummy.scale.setScalar(0);
    dummy.updateMatrix();
    instanced.setMatrixAt(index, dummy.matrix);
  };
  for (let i = 0; i < capacity; i++) zeroMatrix(i);
  instanced.instanceMatrix.needsUpdate = true;

  const ringGeometry = new Map();
  const trailCount = low ? 6 : 12;
  const trails = Array.from({ length: trailCount }, () => {
    const ownMaterial = new THREE.MeshBasicMaterial({
      color: 0xf2cc9b, side: THREE.DoubleSide, transparent: true,
      opacity: 0.7, depthWrite: false,
    });
    const obj = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.05, 48), ownMaterial);
    obj.visible = false;
    obj.frustumCulled = false;
    obj.renderOrder = 4;
    scene.add(obj);
    return { obj, active: false, t: 0, max: 0.3, base: 0.7 };
  });
  const defaultRing = trails[0].obj.geometry;
  let trailCursor = 0;

  function emitSparks(center, hex, count) {
    const n = low ? Math.ceil(count * 0.45) : count;
    color.setHex(hex);
    for (let i = 0; i < n; i++) {
      const index = sparkCursor++ % capacity;
      const p = sparks[index];
      p.active = true;
      p.x = center.x + (random() - 0.5) * 0.6;
      p.y = center.y + (random() - 0.5) * 0.3;
      p.z = center.z + (random() - 0.5) * 0.6;
      p.vx = (random() - 0.5) * 12;
      p.vy = 2 + random() * 5;
      p.vz = (random() - 0.5) * 12;
      p.life = p.max = 0.35 + random() * 0.4;
      p.size = 0.045 + random() * 0.085;
      instanced.setColorAt(index, color);
      dummy.position.set(p.x, p.y, p.z);
      dummy.scale.setScalar(p.size);
      dummy.updateMatrix();
      instanced.setMatrixAt(index, dummy.matrix);
    }
    instanced.instanceMatrix.needsUpdate = true;
    if (instanced.instanceColor) instanced.instanceColor.needsUpdate = true;
  }

  function slash(position, yaw, radius, arc = 2.2, skill = false) {
    const trail = trails[trailCursor++ % trails.length];
    const key = String(radius) + ':' + String(arc);
    if (!ringGeometry.has(key)) {
      ringGeometry.set(key, new THREE.RingGeometry(radius - 0.18, radius + 0.16, 48, 1, -arc * 0.5, arc));
    }
    trail.obj.geometry = ringGeometry.get(key);
    trail.obj.material.color.setHex(skill ? 0xffd389 : 0xf2cc9b);
    trail.obj.position.set(position.x, skill ? 0.5 : 1.15, position.z);
    trail.obj.rotation.set(-Math.PI / 2, 0, yaw);
    trail.obj.scale.setScalar(1);
    trail.active = true;
    trail.t = 0;
    trail.max = skill ? 0.65 : 0.27;
    trail.base = skill ? 0.8 : 0.7;
    trail.obj.material.opacity = trail.base;
    trail.obj.visible = true;
  }

  function update(dt) {
    let changed = false;
    for (let i = 0; i < sparks.length; i++) {
      const p = sparks[i];
      if (!p.active) continue;
      changed = true;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        zeroMatrix(i);
        continue;
      }
      p.vy -= dt * 15;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      dummy.position.set(p.x, p.y, p.z);
      dummy.scale.setScalar(p.size * Math.max(0.05, p.life / p.max));
      dummy.updateMatrix();
      instanced.setMatrixAt(i, dummy.matrix);
    }
    if (changed) instanced.instanceMatrix.needsUpdate = true;
    for (const t of trails) {
      if (!t.active) continue;
      t.t += dt;
      if (t.t >= t.max) {
        t.active = false;
        t.obj.visible = false;
        continue;
      }
      const scale = 1 + t.t * 2.5;
      t.obj.scale.setScalar(scale);
      t.obj.material.opacity = (1 - t.t / t.max) * t.base;
    }
  }

  function clear() {
    for (let i = 0; i < sparks.length; i++) {
      sparks[i].active = false;
      zeroMatrix(i);
    }
    instanced.instanceMatrix.needsUpdate = true;
    for (const t of trails) {
      t.active = false;
      t.obj.visible = false;
    }
  }

  function dispose() {
    clear();
    scene.remove(instanced);
    geometry.dispose();
    material.dispose();
    for (const t of trails) {
      scene.remove(t.obj);
      t.obj.material.dispose();
    }
    defaultRing.dispose();
    for (const geom of ringGeometry.values()) geom.dispose();
    ringGeometry.clear();
  }
  return { emitSparks, slash, update, clear, dispose };
}
