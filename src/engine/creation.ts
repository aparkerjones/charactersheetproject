import { maxHp } from "./calc";
import { backgroundById } from "./data/backgrounds";
import { CLASSES } from "./data/classes";
import { CLASS_PROFILES } from "./data/classProfiles";
import { className } from "./data/roster";
import { speciesById, speciesForCharacter, speciesVariantById } from "./data/species";
import { ABILITIES, CLASS_IDS, type Ability, type Character, type ClassId, type Ruleset, type Skill } from "./types";
import {
  cantripOptionsForStyle,
  classChoiceRequirements,
  expertiseKey,
  fightingStyleCantripsKey,
  fightingStyleKey,
  fightingStyleOptions,
  isCantripStyle,
  isSkillChoice,
} from "./classChoices";

export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8] as const;
export const MULTICLASS_MIN_SCORE = 13;

export type StepId = "ruleset" | "species" | "background" | "abilities" | "class" | "review";
export const STEPS: { id: StepId; label: string }[] = [
  { id: "ruleset", label: "Ruleset" },
  { id: "species", label: "Species" },
  { id: "background", label: "Background" },
  { id: "abilities", label: "Abilities" },
  { id: "class", label: "Class" },
  { id: "review", label: "Review" },
];

export interface ClassPick {
  classId: ClassId;
  level: number;
  subclassId?: string;
}

export interface Draft {
  ruleset: Ruleset | null;
  name: string;
  speciesId: string | null;
  speciesVariantId: string | null;
  speciesChoices: Record<string, string[]>;
  backgroundId: string | null;
  bgBonus: "2-1" | "1-1-1";
  bgPlus2: Ability | null;
  bgPlus1: Ability | null;
  scoreMethod: "standard" | "manual";
  // 0 means "not assigned yet" for the standard array.
  baseScores: Record<Ability, number>;
  optionalFeatId: string | null;
  classes: ClassPick[];
  classSkills: Skill[];
  classChoices: Record<string, string[]>;
}

export const emptyScores = (): Record<Ability, number> => ({ str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 });

export const emptyDraft = (): Draft => ({
  ruleset: null,
  name: "",
  speciesId: null,
  speciesVariantId: null,
  speciesChoices: {},
  backgroundId: null,
  bgBonus: "2-1",
  bgPlus2: null,
  bgPlus1: null,
  scoreMethod: "standard",
  baseScores: emptyScores(),
  optionalFeatId: null,
  classes: [],
  classSkills: [],
  classChoices: {},
});

function speciesChoiceBonuses(d: Draft): Partial<Record<Ability, number>> {
  if (!d.ruleset || !d.speciesId) return {};
  const species = speciesById(d.ruleset, d.speciesId);
  const variant = speciesVariantById(d.ruleset, d.speciesId, d.speciesVariantId);
  return [...(species?.choices ?? []), ...(variant?.choices ?? [])]
    .flatMap((choice) => (d.speciesChoices[choice.id] ?? []).flatMap((id) => {
      const asi = choice.options.find((option) => option.id === id)?.asi;
      return asi ? Object.entries(asi) as [Ability, number][] : [];
    }))
    .reduce<Partial<Record<Ability, number>>>((total, [ability, bonus]) => {
      total[ability] = (total[ability] ?? 0) + bonus;
      return total;
    }, {});
}

export function abilityBonuses(d: Draft): Partial<Record<Ability, number>> {
  if (!d.ruleset) return {};
  if (d.ruleset === "2014") {
    const base = (d.speciesId && speciesById("2014", d.speciesId)?.asi) || {};
    const variant = d.speciesId && d.speciesVariantId
      ? speciesById("2014", d.speciesId)?.variants?.find((entry) => entry.id === d.speciesVariantId)
      : undefined;
    const selected = speciesChoiceBonuses(d);
    if (variant?.replaceAbilityBonuses) {
      return ABILITIES.reduce<Partial<Record<Ability, number>>>((total, ability) => {
        const bonus = (variant.asi?.[ability] ?? 0) + (selected[ability] ?? 0);
        if (bonus > 0) total[ability] = bonus;
        return total;
      }, {});
    }
    return ABILITIES.reduce<Partial<Record<Ability, number>>>((total, ability) => {
      const bonus = (base[ability] ?? 0) + (variant?.asi?.[ability] ?? 0) + (selected[ability] ?? 0);
      if (bonus > 0) total[ability] = bonus;
      return total;
    }, {});
  }

  const bg = d.backgroundId ? backgroundById("2024", d.backgroundId) : undefined;
  if (!bg?.abilityOptions) return {};
  if (d.bgBonus === "1-1-1") return Object.fromEntries(bg.abilityOptions.map((a) => [a, 1]));
  const out: Partial<Record<Ability, number>> = {};
  if (d.bgPlus2) out[d.bgPlus2] = 2;
  if (d.bgPlus1) out[d.bgPlus1] = (out[d.bgPlus1] ?? 0) + 1;
  return out;
}

export function finalAbilities(d: Draft): Record<Ability, number> {
  const bonus = abilityBonuses(d);
  return Object.fromEntries(
    ABILITIES.map((a) => [a, d.baseScores[a] > 0 ? Math.min(20, d.baseScores[a] + (bonus[a] ?? 0)) : 0]),
  ) as Record<Ability, number>;
}

export function multiclassIssues(scores: Record<Ability, number>, classIds: ClassId[]): string[] {
  if (classIds.length < 2) return [];
  return classIds.flatMap((id) => {
    const unmet = CLASS_PROFILES[id].multiclassRequirements.filter(
      (group) => !group.some((a) => scores[a] >= MULTICLASS_MIN_SCORE),
    );
    if (unmet.length === 0) return [];
    const need = unmet.map((group) => group.map((a) => a.toUpperCase()).join(" or ")).join(" and ");
    return [`${className(id)} needs ${need} ${MULTICLASS_MIN_SCORE}+ to multiclass.`];
  });
}

export function backgroundSkills(d: Draft): Skill[] {
  const bg = d.ruleset && d.backgroundId ? backgroundById(d.ruleset, d.backgroundId) : undefined;
  return bg ? [...bg.skills] : [];
}

export function draftTotalLevel(d: Draft) {
  return d.classes.reduce((n, k) => n + k.level, 0);
}

export function stepIssues(d: Draft, step: StepId): string[] {
  const issues: string[] = [];
  switch (step) {
    case "ruleset":
      if (!d.ruleset) issues.push("Choose a ruleset.");
      break;
    case "species":
      if (!d.speciesId) issues.push("Choose a species.");
      else if (d.ruleset) {
        const species = speciesById(d.ruleset, d.speciesId);
        if (species?.variants?.length && !d.speciesVariantId) issues.push("Choose a lineage or subspecies.");
        const variant = speciesVariantById(d.ruleset, d.speciesId, d.speciesVariantId);
        for (const choice of [...(species?.choices ?? []), ...(variant?.choices ?? [])]) {
          const selected = d.speciesChoices[choice.id] ?? [];
          const count = choice.selectionCount ?? 1;
          if (selected.length !== count) issues.push(`${choice.label}: choose ${count}.`);
          else if (new Set(selected).size !== selected.length || selected.some((id) => !choice.options.some((option) => option.id === id))) {
            issues.push(`${choice.label}: selection is invalid.`);
          }
        }
      }
      break;
    case "background": {
      const bg = d.ruleset && d.backgroundId ? backgroundById(d.ruleset, d.backgroundId) : undefined;
      if (!bg) {
        issues.push("Choose a background.");
        break;
      }
      if (d.ruleset === "2024" && d.bgBonus === "2-1") {
        const opts = bg.abilityOptions ?? [];
        if (!d.bgPlus2 || !d.bgPlus1) issues.push("Pick the abilities for your +2 and +1 bonuses.");
        else if (d.bgPlus2 === d.bgPlus1) issues.push("The +2 and +1 bonuses must go to different abilities.");
        else if (!opts.includes(d.bgPlus2) || !opts.includes(d.bgPlus1)) issues.push("Bonuses must use this background's abilities.");
      }
      break;
    }
    case "abilities": {
      const values = ABILITIES.map((a) => d.baseScores[a]);
      if (values.some((v) => v < 1)) issues.push("Assign a score to every ability.");
      else if (d.scoreMethod === "standard") {
        const sorted = [...values].sort((a, b) => b - a);
        if (sorted.some((v, i) => v !== STANDARD_ARRAY[i])) issues.push("Use each standard array value exactly once.");
      } else if (values.some((v) => v > 20)) issues.push("Scores cannot exceed 20.");
      break;
    }
    case "class": {
      if (d.classes.length === 0) {
        issues.push("Choose a starting class.");
        break;
      }
      if (draftTotalLevel(d) > 20) issues.push("Total level cannot exceed 20.");
      for (const k of d.classes) {
        const subclassLevel = CLASSES[k.classId]?.subclassLevel ?? CLASS_PROFILES[k.classId].subclassLevel;
        if (d.ruleset && k.level >= subclassLevel[d.ruleset] && !k.subclassId) {
          issues.push(`Choose a ${className(k.classId)} subclass.`);
        }
      }
      const primary = CLASS_PROFILES[d.classes[0].classId];
      if (d.ruleset) {
        const proficiencies = draftSkillProficiencies(d);
        const proficienciesBeforeCanny = draftSkillProficiencies(d, false);
        const selectedExpertise = d.classes.flatMap((entry) => d.classChoices?.[expertiseKey(entry.classId)] ?? []);
        for (const entry of d.classes) {
          const requirements = classChoiceRequirements(entry.classId, d.ruleset, entry.level);
          const styleKey = fightingStyleKey(entry.classId);
          const cantripsKey = fightingStyleCantripsKey(entry.classId);
          const expertiseChoices = d.classChoices?.[expertiseKey(entry.classId)] ?? [];
          const styleId = d.classChoices?.[styleKey]?.[0];
          if (requirements.fightingStyle) {
            if (!styleId || !fightingStyleOptions(entry.classId, d.ruleset).some((option) => option.id === styleId)) {
              issues.push(`Choose a valid ${className(entry.classId)} Fighting Style.`);
            }
          } else if (d.classChoices?.[styleKey]?.length) {
            issues.push(`${className(entry.classId)} does not have a Fighting Style at this level.`);
          }
          const cantripChoices = d.classChoices?.[cantripsKey] ?? [];
          if (styleId && isCantripStyle(styleId)) {
            const validCantrips = cantripOptionsForStyle(styleId, d.ruleset).map((option) => option.id);
            if (cantripChoices.length !== 2 || new Set(cantripChoices).size !== 2 ||
              cantripChoices.some((cantrip) => !validCantrips.includes(cantrip))) {
              issues.push(`${className(entry.classId)}'s selected Fighting Style requires two different valid cantrips.`);
            }
          } else if (cantripChoices.length) {
            issues.push(`${className(entry.classId)} has cantrip choices without a cantrip-based Fighting Style.`);
          }
          if (expertiseChoices.length !== requirements.expertiseCount ||
            new Set(expertiseChoices).size !== expertiseChoices.length ||
            expertiseChoices.some((skill) => !isSkillChoice(skill))) {
            issues.push(`${className(entry.classId)} must choose ${requirements.expertiseCount} Expertise skill${requirements.expertiseCount === 1 ? "" : "s"}.`);
          } else if (entry.classId === "ranger" && d.ruleset === "2024" && requirements.expertiseCount) {
            const selected = expertiseChoices[0];
            if (!isSkillChoice(selected) || proficienciesBeforeCanny.includes(selected)) {
              issues.push("Ranger Canny must choose a skill without proficiency.");
            }
          } else if (expertiseChoices.some((skill) => !isSkillChoice(skill) || !proficiencies.includes(skill))) {
            issues.push(`${className(entry.classId)} can only gain Expertise in proficient skills.`);
          }
        }
        if (new Set(selectedExpertise).size !== selectedExpertise.length) issues.push("Each skill can only be chosen for Expertise once.");
        const validChoiceKeys = new Set(d.classes.flatMap((entry) => [
          expertiseKey(entry.classId),
          fightingStyleKey(entry.classId),
          fightingStyleCantripsKey(entry.classId),
        ]));
        if (Object.keys(d.classChoices ?? {}).some((key) => !validChoiceKeys.has(key))) {
          issues.push("Remove class choices that no longer match your selected classes.");
        }
        const options = primary.skillOptions[d.ruleset];
        const taken = backgroundSkills(d);
        const valid = d.classSkills.filter((s) => options.includes(s) && !taken.includes(s));
        if (new Set(d.classSkills).size !== primary.skillCount || valid.length !== primary.skillCount) {
          issues.push(`Choose ${primary.skillCount} class skills.`);
        }
      }
      issues.push(
        ...multiclassIssues(
          finalAbilities(d),
          d.classes.map((k) => k.classId),
        ),
      );
      break;
    }
    case "review":
      break;
  }
  return issues;
}

export function allIssues(d: Draft): string[] {
  return STEPS.flatMap((s) => stepIssues(d, s.id));
}

export function draftFromCharacter(c: Character): Draft {
  const saved = c.creation ?? {
    ...emptyDraft(),
    scoreMethod: "manual" as const,
    baseScores: { ...c.abilities },
    classSkills: (c.skillProficiencies as Skill[]).slice(0, CLASS_PROFILES[c.classes[0].classId].skillCount),
  };
  return {
    ...saved,
    ruleset: c.ruleset,
    name: c.name,
    speciesId: c.speciesId,
    speciesVariantId: saved.speciesVariantId ?? null,
    speciesChoices: saved.speciesChoices ?? {},
    classChoices: saved.classChoices ?? c.classChoices ?? {},
    backgroundId: c.backgroundId,
    classes: c.classes.map((k) => ({ ...k })),
  };
}

export function buildCharacter(d: Draft, existing?: Character): Character {
  const issues = allIssues(d);
  if (issues.length > 0 || !d.ruleset || !d.speciesId || !d.backgroundId) {
    throw new Error(issues.join(" ") || "Incomplete character");
  }
  const bg = backgroundById(d.ruleset, d.backgroundId);
  const speciesChoices = speciesChoiceEffects(d);
  const classChoices = d.classChoices ?? {};
  const classExpertise = Object.entries(classChoices)
    .filter(([key]) => key.startsWith("expertise:"))
    .flatMap(([, skills]) => skills);
  const feats = [...new Set([bg?.featId, d.ruleset === "2014" ? d.optionalFeatId : null, ...speciesChoices.feats].filter((f): f is string => Boolean(f)))];
  const species = speciesById(d.ruleset, d.speciesId);
  const variantSkills = speciesVariantById(d.ruleset, d.speciesId, d.speciesVariantId)?.skillProficiencies ?? [];
  const speciesSkills = [...new Set([...(species?.skillProficiencies ?? []), ...variantSkills, ...speciesChoices.skills])];
  const character: Character = {
    version: 2,
    id: existing?.id ?? crypto.randomUUID(),
    creation: { ...structuredClone(d), classChoices: structuredClone(classChoices) },
    ruleset: d.ruleset,
    name: d.name.trim(),
    speciesId: d.speciesId,
    backgroundId: d.backgroundId,
    feats,
    classes: d.classes.map((k) => ({ ...k })),
    classChoices: structuredClone(classChoices),
    abilities: finalAbilities(d),
    abilityOverrides: {},
    skillProficiencies: [...new Set([...backgroundSkills(d), ...d.classSkills, ...speciesSkills, ...classCannySkills(d)])],
    expertise: [...new Set(classExpertise)],
    currentHp: 0,
    tempHp: 0,
    hitDiceUsed: {},
    deathSaves: { successes: 0, failures: 0 },
    resourcesUsed: {},
    rageActive: false,
    notes: "",
  };
  if (!existing) return { ...character, currentHp: maxHp(character) };

  const oldSpeciesSkills = speciesForCharacter(existing)?.skillProficiencies ?? [];
  const oldSkills = existing.creation
    ? [...backgroundSkills(existing.creation), ...existing.creation.classSkills, ...oldSpeciesSkills]
    : oldSpeciesSkills;
  const oldCannySkills = existing.ruleset === "2024" ? existing.classChoices?.[expertiseKey("ranger")] ?? [] : [];
  const manualSkills = existing.skillProficiencies.filter((s) =>
    !(oldSkills as string[]).includes(s) && !oldCannySkills.includes(s),
  );
  const merged: Character = {
    ...existing,
    ...character,
    expertise: [...new Set([
      ...existing.expertise.filter((skill) => !Object.values(existing.classChoices ?? {}).flat().includes(skill)),
      ...character.expertise,
    ])],
    skillProficiencies: [...new Set([...character.skillProficiencies, ...manualSkills])],
    abilityOverrides: existing.abilityOverrides,
    tempHp: existing.tempHp,
    hitDiceUsed: existing.hitDiceUsed,
    deathSaves: existing.deathSaves,
    resourcesUsed: existing.resourcesUsed,
    rageActive: existing.rageActive,
    notes: existing.notes,
  };
  const gained = Math.max(0, maxHp(merged) - maxHp(existing));
  return { ...merged, currentHp: Math.min(maxHp(merged), existing.currentHp + gained) };
}

export function draftSkillProficiencies(d: Draft, includeCanny = true): Skill[] {
  const species = d.ruleset && d.speciesId ? speciesById(d.ruleset, d.speciesId) : undefined;
  const variantSkills = d.ruleset && d.speciesId
    ? speciesVariantById(d.ruleset, d.speciesId, d.speciesVariantId)?.skillProficiencies ?? []
    : [];
  const speciesSkillChoices = speciesChoiceEffects(d).skills;
  const canny = includeCanny ? classCannySkills(d) : [];
  const skillIds = new Set<string>([
    ...backgroundSkills(d),
    ...d.classSkills,
    ...(species?.skillProficiencies ?? []),
    ...variantSkills,
    ...speciesSkillChoices,
    ...canny,
  ]);
  return [...skillIds].filter(isSkillChoice);
}

function classCannySkills(d: Draft): Skill[] {
  if (d.ruleset !== "2024") return [];
  return d.classes
    .filter((entry) => entry.classId === "ranger" && classChoiceRequirements("ranger", d.ruleset!, entry.level).expertiseCount > 0)
    .flatMap((entry) => d.classChoices?.[expertiseKey(entry.classId)] ?? [])
    .filter(isSkillChoice);
}

function speciesChoiceEffects(d: Draft): { feats: string[]; skills: Skill[] } {
  const species = d.ruleset && d.speciesId ? speciesById(d.ruleset, d.speciesId) : undefined;
  const variant = d.ruleset && d.speciesId ? speciesVariantById(d.ruleset, d.speciesId, d.speciesVariantId) : undefined;
  const options = [...(species?.choices ?? []), ...(variant?.choices ?? [])]
    .flatMap((choice) => (d.speciesChoices[choice.id] ?? []).map((id) => choice.options.find((option) => option.id === id)))
    .filter((option): option is NonNullable<typeof option> => option !== undefined);
  return {
    feats: options.flatMap((option) => option.featId ? [option.featId] : []),
    skills: [...new Set(options.flatMap((option) => option.skillProficiencies ?? []))],
  };
}

export const availableClassIds = (d: Draft): ClassId[] =>
  CLASS_IDS.filter((id) => !d.classes.some((k) => k.classId === id));
