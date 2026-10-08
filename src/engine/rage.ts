import { classLevel } from "./calc";
import { CLASSES } from "./data/classes";
import { speciesForCharacter } from "./data/species";
import type { Ability, Character, Ruleset } from "./types";

export function rageUses(level: number, ruleset: Ruleset) {
  const rage = CLASSES.barbarian?.resources.find((resource) => resource.id === "rage");
  if (!rage) throw new Error("Barbarian rage resource is not configured.");
  return rage.max(level, ruleset);
}

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
  const speciesResistances = speciesForCharacter(c)?.resistances ?? [];
  if (!c.rageActive || level === 0) {
    return speciesResistances.length > 0 ? { ...NO_EFFECTS, resistances: speciesResistances.map((resistance) => resistance[0].toUpperCase() + resistance.slice(1)) } : NO_EFFECTS;
  }
  return {
    resistances: [...new Set([...speciesResistances.map((resistance) => resistance[0].toUpperCase() + resistance.slice(1)), "Bludgeoning", "Piercing", "Slashing"])],
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
