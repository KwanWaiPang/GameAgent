/**
 * Resolve a third-person camera target against the battle arena and tents.
 * Obstacles are vertical cylinders with {x,z,r,height}; all units are metres.
 */
export function resolveCameraTarget(origin, desired, obstacles, { halfWidth = 33, halfDepth = 55, clearance = 0.38 } = {}) {
  const target = desired.clone();
  target.x = Math.max(-halfWidth, Math.min(halfWidth, target.x));
  target.z = Math.max(-halfDepth, Math.min(halfDepth, target.z));
  const dx = target.x - origin.x;
  const dz = target.z - origin.z;
  const a = dx * dx + dz * dz;
  if (a < 1e-6) return target;
  let nearest = 1;
  for (const b of obstacles) {
    const radius = b.r + clearance;
    const sx = origin.x - b.x;
    const sz = origin.z - b.z;
    const dot = sx * dx + sz * dz;
    const c = sx * sx + sz * sz - radius * radius;
    if (c <= 0) continue; // never trap the camera if the character is inside an obstacle
    const discriminant = dot * dot - a * c;
    if (discriminant <= 0) continue;
    const enter = (-dot - Math.sqrt(discriminant)) / a;
    if (enter <= 0 || enter >= nearest) continue;
    const atHeight = origin.y + (target.y - origin.y) * enter;
    if (atHeight > (b.height ?? 2.8) + clearance) continue;
    nearest = Math.max(0.18, enter - 0.055);
  }
  // Preserve the desired endpoint: copy(origin) would overwrite it before lerp.
  if (nearest < 1) return origin.clone().lerp(target, nearest);
  return target;
}
