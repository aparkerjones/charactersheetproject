import { CLASSES } from "./classes";
import { ABILITIES, SKILLS, type Ability, type Character, type Skill } from "./types";

export const abilityMod = (score: number) => Math.floor((score - 10) / 2);

export const proficiencyBonus = (level: number) => 2 + Math.floor((level - 1) / 4);

export function abilityMods(c: Character): Record<Ability, number> {
  return Object.fromEntries(ABILITIES.map((a) => [a, abilityMod(c.abilities[a])])) as Record<Ability, number>;
}

export function maxHp(c: Character): number {
  const { hitDie } = CLASSES[c.classId];
  const con = abilityMod(c.abilities.con);
  const avg = Math.floor(hitDie / 2) + 1;
  return hitDie + con + (c.level - 1) * (avg + con);
}

export function skillBonus(c: Character, skill: Skill): number {
  const prof = proficiencyBonus(c.level);
  const base = abilityMod(c.abilities[SKILLS[skill]]);
  if (c.expertise.includes(skill)) return base + prof * 2;
  if (c.skillProficiencies.includes(skill)) return base + prof;
  return base;
}

export function saveBonus(c: Character, ability: Ability): number {
  const proficient = CLASSES[c.classId].saves.includes(ability);
  return abilityMod(c.abilities[ability]) + (proficient ? proficiencyBonus(c.level) : 0);
}

export function spellSaveDc(c: Character): number | null {
  const sc = CLASSES[c.classId].spellcasting;
  return sc ? 8 + proficiencyBonus(c.level) + abilityMod(c.abilities[sc.ability]) : null;
}

export function newCharacter(classId: Character["classId"]): Character {
  return {
    version: 1,
    name: "",
    classId,
    level: 1,
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    skillProficiencies: [],
    expertise: [],
    currentHp: 0,
    resourcesUsed: {},
    notes: "",
  };
}
