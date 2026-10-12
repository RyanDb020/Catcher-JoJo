// Shattered Universe 1.0 mission rules; engine-neutral and testable without WebGL.
export const MISSION_WAVES = 5;
export const isBossWave = wave => wave === MISSION_WAVES;
export function resolveDefeat(wave, boss) {
  const completed = Boolean(boss && isBossWave(wave));
  return { completed, nextWave: completed ? wave : Math.min(MISSION_WAVES, wave + 1) };
}
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
export function createEnemy(level = 1, boss = false) {
  const type = boss ? 'chrono-shade' : level === 2 ? 'rift-stalker' : level === 3 ? 'iron-guard' : level === 4 ? 'clock-adept' : 'time-wraith';
  const hp = boss ? 420 : RULES.enemyBaseHp + Math.min(180, (level - 1) * 18);
  return {
    hp, maxHp: hp, level, boss, type, phase: 1, state: 'patrol', timer: 0, attackReady: 0,
    damage: boss ? 23 : RULES.enemyBaseDamage + Math.floor(level * .9),
    damageScale: 1, speed: boss ? 1.72 : type === 'rift-stalker' ? 3.45 : type === 'iron-guard' ? 1.65 : 2.2 + Math.min(1.0, (level - 1) * 0.12),
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
      const flank = enemy.type === 'rift-stalker' ? .38 : 0;
      out.x = (dx / dist - dz / dist * flank) * enemy.speed * dt;
      out.z = (dz / dist + dx / dist * flank) * enemy.speed * dt;
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

