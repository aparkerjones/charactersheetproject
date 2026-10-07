import { CLASSES } from "./data/classes";
import { featById } from "./data/feats";
import { speciesById } from "./data/species";
import { ABILITIES, SKILLS, type Ability, type Character, type FeatMods, type Skill } from "./types";

export const abilityMod = (score: number) => Math.floor((score - 10) / 2);

export const totalLevel = (c: Character) => c.classes.reduce((n, k) => n + k.level, 0);

export const proficiencyBonus = (level: number) => 2 + Math.floor((level - 1) / 4);

export const classLevel = (c: Character, classId: Character["classes"][number]["classId"]) =>
  c.classes.find((k) => k.classId === classId)?.level ?? 0;

// An override replaces the base score outright (items, magic effects or house rules).
export const abilityScore = (c: Character, a: Ability) => c.abilityOverrides[a] ?? c.abilities[a];

export function abilityMods(c: Character): Record<Ability, number> {
  return Object.fromEntries(ABILITIES.map((a) => [a, abilityMod(abilityScore(c, a))])) as Record<Ability, number>;
}

export function featMods(c: Character): Required<FeatMods> {
  const total = { hpPerLevel: 0, initiativeFlat: 0, initiativeProficiency: false };
  for (const id of c.feats) {
    const m = featById(id)?.mods?.(c.ruleset);
    if (!m) continue;
    total.hpPerLevel += m.hpPerLevel ?? 0;
    total.initiativeFlat += m.initiativeFlat ?? 0;
    total.initiativeProficiency ||= m.initiativeProficiency ?? false;
  }
  return total;
}

// The first class gets maximum hit die at level 1; every other level uses the fixed average.
export function maxHp(c: Character): number {
  const con = abilityMod(abilityScore(c, "con"));
  let hp = 0;
  c.classes.forEach((k, ci) => {
    const { hitDie } = CLASSES[k.classId];
    for (let i = 0; i < k.level; i++) {
      hp += (ci === 0 && i === 0 ? hitDie : Math.floor(hitDie / 2) + 1) + con;
    }
  });
  return Math.max(totalLevel(c), hp + featMods(c).hpPerLevel * totalLevel(c));
}

export function skillBonus(c: Character, skill: Skill): number {
  const prof = proficiencyBonus(totalLevel(c));
  const base = abilityMod(abilityScore(c, SKILLS[skill]));
  if (c.expertise.includes(skill)) return base + prof * 2;
  if (c.skillProficiencies.includes(skill)) return base + prof;
  return base;
}

// Saving throw proficiencies come only from the starting class.
export function saveBonus(c: Character, ability: Ability): number {
  const proficient = CLASSES[c.classes[0].classId].saves.includes(ability);
  return abilityMod(abilityScore(c, ability)) + (proficient ? proficiencyBonus(totalLevel(c)) : 0);
}

export function initiative(c: Character): number {
  const m = featMods(c);
  return abilityMod(abilityScore(c, "dex")) + m.initiativeFlat + (m.initiativeProficiency ? proficiencyBonus(totalLevel(c)) : 0);
}

export function speed(c: Character): number {
  const base = speciesById(c.ruleset, c.speciesId)?.speed ?? 30;
  return base + (classLevel(c, "barbarian") >= 5 ? 10 : 0);
}

export function spellSaveDc(c: Character): number | null {
  const caster = c.classes.map((k) => CLASSES[k.classId].spellcasting).find(Boolean);
  return caster ? 8 + proficiencyBonus(totalLevel(c)) + abilityMod(abilityScore(c, caster.ability)) : null;
}

// Best unarmored formula available. Equipment will feed armor in later.
export function armorClass(c: Character): number {
  const dex = abilityMod(abilityScore(c, "dex"));
  const options = [10 + dex];
  if (classLevel(c, "barbarian") > 0) options.push(10 + dex + abilityMod(abilityScore(c, "con")));
  return Math.max(...options);
}

export const passiveScore = (c: Character, skill: Skill) => 10 + skillBonus(c, skill);
