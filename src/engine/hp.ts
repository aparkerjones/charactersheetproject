import { maxHp } from "./calc";
import { activeEffects } from "./rage";
import type { Character } from "./types";

export type HpState = Pick<Character, "currentHp" | "tempHp" | "deathSaves">;

const NO_DEATH_SAVES = { successes: 0, failures: 0 };

// Temp HP soaks up damage first; any real HP loss clears death saves only when HP stays above 0.
export function applyDamage(c: Character, amount: number, halve = false): HpState {
  const dmg = Math.max(0, Math.floor(halve ? amount / 2 : amount));
  const fromTemp = Math.min(c.tempHp, dmg);
  const currentHp = Math.max(0, c.currentHp - (dmg - fromTemp));
  return { currentHp, tempHp: c.tempHp - fromTemp, deathSaves: currentHp > 0 ? NO_DEATH_SAVES : c.deathSaves };
}

export function applyHealing(c: Character, amount: number): HpState {
  const heal = Math.max(0, Math.floor(amount));
  if (heal === 0) return { currentHp: c.currentHp, tempHp: c.tempHp, deathSaves: c.deathSaves };
  return { currentHp: Math.min(maxHp(c), c.currentHp + heal), tempHp: c.tempHp, deathSaves: NO_DEATH_SAVES };
}

// Temp HP doesn't stack: keep whichever value is higher.
export function grantTempHp(c: Character, amount: number): number {
  return Math.max(c.tempHp, Math.max(0, Math.floor(amount)));
}

export const hitDicePool = (c: Character) =>
  c.classes.map((k) => ({
    classId: k.classId,
    total: k.level,
    used: Math.min(c.hitDiceUsed[k.classId] ?? 0, k.level),
  }));

// A long rest returns half your total hit dice (minimum one), largest dice first.
export function recoverHitDice(c: Character, hitDie: (id: Character["classes"][number]["classId"]) => number) {
  let budget = Math.max(1, Math.floor(c.classes.reduce((n, k) => n + k.level, 0) / 2));
  const used = { ...c.hitDiceUsed };
  for (const k of [...c.classes].sort((a, b) => hitDie(b.classId) - hitDie(a.classId))) {
    const give = Math.min(budget, used[k.classId] ?? 0);
    used[k.classId] = (used[k.classId] ?? 0) - give;
    budget -= give;
  }
  return used;
}

export const DAMAGE_TYPES = [
  "Acid",
  "Bludgeoning",
  "Cold",
  "Fire",
  "Force",
  "Lightning",
  "Necrotic",
  "Piercing",
  "Poison",
  "Psychic",
  "Radiant",
  "Slashing",
  "Thunder",
] as const;
export type DamageType = (typeof DAMAGE_TYPES)[number];

export const isResistant = (c: Character, type: DamageType) => activeEffects(c).resistances.includes(type);

// Resistance halves damage, rounded down.
export const resolveDamage = (c: Character, amount: number, type: DamageType) =>
  Math.max(0, Math.floor(isResistant(c, type) ? amount / 2 : amount));
