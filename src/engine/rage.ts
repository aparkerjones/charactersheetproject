import { classLevel } from "./calc";
import { CLASSES } from "./data/classes";
import type { Ability, Character, Ruleset } from "./types";

export const rageUses = (level: number, ruleset: Ruleset) => CLASSES.barbarian.resources[0].max(level, ruleset);

export const rageDamage = (level: number) => (level >= 16 ? 4 : level >= 9 ? 3 : 2);

export interface ActiveEffects {
  resistances: string[];
  damageBonuses: { label: string; value: number }[];
  advantage: { checks: Ability[]; saves: Ability[] };
  spellcastingBlocked: boolean;
}

export const NO_EFFECTS: ActiveEffects = {
  resistances: [],
  damageBonuses: [],
  advantage: { checks: [], saves: [] },
  spellcastingBlocked: false,
};

export function activeEffects(c: Character): ActiveEffects {
  const level = classLevel(c, "barbarian");
  if (!c.rageActive || level === 0) return NO_EFFECTS;
  return {
    resistances: ["Bludgeoning", "Piercing", "Slashing"],
    damageBonuses: [
      {
        label: c.ruleset === "2024" ? "Rage damage (Strength attacks, incl. unarmed)" : "Rage damage (melee Strength weapon attacks)",
        value: rageDamage(level),
      },
    ],
    advantage: { checks: ["str"], saves: ["str"] },
    spellcastingBlocked: true,
  };
}

export function canStartRage(c: Character): boolean {
  const level = classLevel(c, "barbarian");
  if (level === 0 || c.rageActive) return false;
  return (c.resourcesUsed.rage ?? 0) < rageUses(level, c.ruleset);
}
