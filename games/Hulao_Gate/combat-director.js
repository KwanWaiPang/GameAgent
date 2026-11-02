/**
 * Deterministic, stateless combat rules. Enemy animations and telegraphs are
 * consumers of these attack contracts; neither rendering nor RNG live here.
 */
export function chooseEnemyStrike(kind, hpRatio = 1, random = Math.random) {
  if (kind === 'boss') {
    const enraged = hpRatio <= 0.5;
    const roll = random();
    if (roll < (enraged ? 0.38 : 0.18)) {
      return { type: 'shockwave', windup: enraged ? 0.95 : 1.16, reach: 5.6, arc: Math.PI * 2,
        damage: enraged ? 29 : 24, recovery: 2.3, label: '方天裂地' };
    }
    if (roll < 0.7) {
      return { type: 'cleave', windup: enraged ? 0.58 : 0.86, reach: 4.6, arc: 2.65,
        damage: enraged ? 23 : 18, recovery: enraged ? 1.15 : 1.7, label: '横扫千军' };
    }
    return { type: 'thrust', windup: enraged ? 0.48 : 0.67, reach: 4.1, arc: 1.05,
      damage: enraged ? 21 : 16, recovery: enraged ? 0.95 : 1.5, label: '飞将突刺' };
  }
  const elite = kind === 'elite';
  return { type: 'thrust', windup: elite ? 0.62 : 0.74, reach: elite ? 2.9 : 2.55,
    arc: elite ? 1.75 : 1.6, damage: elite ? 12 : 7,
    recovery: elite ? 1.45 : 1.8, label: elite ? '精锐突刺' : '突刺' };
}

/** Yaw zero points towards negative Z, matching the existing battle controller. */
export function hitInStrike(strike, attacker, target, yaw) {
  if (!strike) return false;
  const dx = target.x - attacker.x;
  const dz = target.z - attacker.z;
  const dist = Math.hypot(dx, dz);
  if (dist > strike.reach) return false;
  if (strike.type === 'shockwave') return dist >= 1.0;
  const angle = Math.atan2(-dx, -dz);
  const delta = Math.atan2(Math.sin(angle - yaw), Math.cos(angle - yaw));
  return Math.abs(delta) <= strike.arc * 0.5;
}

export function canParry(parryRemaining, playerPosition, playerYaw, enemyPosition) {
  if (parryRemaining <= 0) return false;
  const dx = enemyPosition.x - playerPosition.x, dz = enemyPosition.z - playerPosition.z;
  if (Math.hypot(dx, dz) > 4.8) return false;
  const direction = Math.atan2(-dx, -dz);
  const delta = Math.atan2(Math.sin(direction - playerYaw), Math.cos(direction - playerYaw));
  return Math.abs(delta) <= 1.32;
}

/** Coarse wave director: prevents every soldier from starting an attack together. */
export function canEnemyEngage(attackingNearby, kind) {
  return kind === 'boss' ? attackingNearby < 3 : attackingNearby < 2;
}
