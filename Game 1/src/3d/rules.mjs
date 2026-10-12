// Shattered Universe 0.1 — engine-neutral rules; can be tested without WebGL.
export const RULES = Object.freeze({
  maxHp: 100, enemyBaseHp: 100, enemyBaseDamage: 12,
  meleeRange: 3.3, meleeHalfAngle: Math.PI * 0.39,
  standMax: 100, oraCost: 55, timeStopCost: 40,
  timeStopSeconds: 3.2, arenaRadius: 18.8
});
export const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
export const lengthXZ = (x, z) => Math.hypot(x, z);
export function withinAttackCone(origin, facing, target, range = RULES.meleeRange, halfAngle = RULES.meleeHalfAngle) {
  const dx = target.x - origin.x, dz = target.z - origin.z;
  const dist = lengthXZ(dx, dz);
  if (dist > range || dist < 0.00001) return dist < 0.00001;
  const size = Math.max(0.00001, lengthXZ(facing.x, facing.z));
  return (dx * facing.x + dz * facing.z) / (dist * size) >= Math.cos(halfAngle);
}
export function enforceArena(position, radius = RULES.arenaRadius) {
  const distance = lengthXZ(position.x, position.z);
  if (distance > radius) {
    position.x *= radius / distance;
    position.z *= radius / distance;
  }
  return position;
}
export function createEnemy(level = 1) {
  const hp = RULES.enemyBaseHp + Math.min(180, (level - 1) * 12);
  return {
    hp, maxHp: hp, level, state: 'patrol', timer: 0, attackReady: 0,
    speed: 2.15 + Math.min(1.2, (level - 1) * 0.07),
    stagger: 0, attacked: false, dead: false
  };
}
export function damageEnemy(enemy, damage, stagger = 0.22) {
  if (enemy.dead || damage <= 0) return { dealt: 0, killed: false };
  const dealt = Math.min(enemy.hp, damage);
  enemy.hp = Math.max(0, enemy.hp - damage);
  if (!enemy.hp) { enemy.dead = true; enemy.state = 'dead'; enemy.timer = 0; }
  else { enemy.state = 'stagger'; enemy.timer = stagger; }
  return { dealt, killed: enemy.dead };
}
// Returns movement and a single explicit attack event; never damages the player internally.
export function stepEnemy(enemy, enemyPos, playerPos, delta, frozen = false) {
  const dt = clamp(delta, 0, 0.05);
  const out = { x: 0, z: 0, attack: false, telegraph: false, state: enemy.state };
  if (enemy.dead || frozen) return out;
  enemy.attackReady = Math.max(0, enemy.attackReady - dt);
  enemy.timer = Math.max(0, enemy.timer - dt);
  const dx = playerPos.x - enemyPos.x, dz = playerPos.z - enemyPos.z;
  const dist = Math.hypot(dx, dz);
  if (enemy.state === 'stagger') {
    if (enemy.timer <= 0) enemy.state = 'chase';
  } else if (enemy.state === 'windup') {
    out.telegraph = true;
    if (enemy.timer <= 0) {
      enemy.state = 'recover';
      enemy.timer = 0.7;
      enemy.attackReady = 0.5;
      out.attack = dist < 2.65;
    }
  } else if (enemy.state === 'recover') {
    if (enemy.timer <= 0) enemy.state = 'chase';
  } else if (dist > 16) {
    enemy.state = 'patrol';
  } else if (dist > 2.35 || enemy.attackReady > 0) {
    enemy.state = 'chase';
    if (dist > 1.5) {
      out.x = dx / dist * enemy.speed * dt;
      out.z = dz / dist * enemy.speed * dt;
    }
  } else {
    enemy.state = 'windup';
    enemy.timer = 0.8; // readable warning before damage
    out.telegraph = true;
  }
  out.state = enemy.state;
  return out;
}
export function grantXP(profile, amount) {
  const earned = Math.max(0, Math.round(amount));
  profile.xp += earned;
  let leveled = false;
  while (profile.xp >= xpRequired(profile.level)) {
    profile.xp -= xpRequired(profile.level);
    profile.level += 1;
    profile.maxHp += 5;
    profile.hp = Math.min(profile.maxHp, profile.hp + 18);
    leveled = true;
  }
  return leveled;
}
export const xpRequired = level => Math.round(80 + (level - 1) * 42 + (level - 1) ** 1.4 * 12);
