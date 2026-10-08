import type { Character, ClassId } from "./types";
import { speciesForCharacter } from "./data/species";

export interface PassiveClassModifiers {
  speed: number;
  savingThrow: number;
  abilityCheck: number;
  initiative: number;
}

interface PassiveRule {
  classId: ClassId;
  minLevel: number;
  rulesets?: Character["ruleset"][];
  modifiers: (character: Character) => Partial<PassiveClassModifiers>;
}

const RULES: PassiveRule[] = [
  { classId: "barbarian", minLevel: 5, modifiers: () => ({ speed: 10 }) },
  { classId: "bard", minLevel: 2, modifiers: (c) => ({ abilityCheck: Math.floor(proficiency(c) / 2) }) },
  { classId: "paladin", minLevel: 6, modifiers: (c) => ({ savingThrow: Math.max(1, modifier(score(c, "cha"))) }) },
];

const levelOf = (c: Character, classId: ClassId) => c.classes.find((entry) => entry.classId === classId)?.level ?? 0;
const score = (c: Character, ability: "dex" | "con" | "wis" | "cha") => c.abilityOverrides[ability] ?? c.abilities[ability];
const modifier = (score: number) => Math.floor((score - 10) / 2);
const proficiency = (c: Character) => 2 + Math.floor((c.classes.reduce((sum, entry) => sum + entry.level, 0) - 1) / 4);

export function passiveClassModifiers(c: Character): PassiveClassModifiers {
  return RULES.reduce(
    (total, rule) => {
      if (levelOf(c, rule.classId) < rule.minLevel || (rule.rulesets && !rule.rulesets.includes(c.ruleset))) return total;
      const modifiers = rule.modifiers(c);
      return {
        speed: total.speed + (modifiers.speed ?? 0),
        savingThrow: total.savingThrow + (modifiers.savingThrow ?? 0),
        abilityCheck: total.abilityCheck + (modifiers.abilityCheck ?? 0),
        initiative: total.initiative + (modifiers.initiative ?? 0),
      };
    },
    { speed: 0, savingThrow: 0, abilityCheck: 0, initiative: 0 },
  );
}

export function unarmoredArmorClass(c: Character): number[] {
  const dex = modifier(score(c, "dex"));
  const options = [10 + dex];
  const species = speciesForCharacter(c);
  if (species?.naturalArmorBase !== undefined) {
    const ability = species.naturalArmorAbility ?? (species.naturalArmorDexterity ? "dex" : undefined);
    const bonus = ability ? Math.floor(((c.abilityOverrides[ability] ?? c.abilities[ability]) - 10) / 2) : 0;
    options.push(species.naturalArmorBase + bonus);
  }
  if (levelOf(c, "barbarian") > 0) options.push(10 + dex + modifier(score(c, "con")));
  if (levelOf(c, "monk") > 0) options.push(10 + dex + modifier(score(c, "wis")));
  return options.map((ac) => ac + (species?.armorBonus ?? 0));
}
