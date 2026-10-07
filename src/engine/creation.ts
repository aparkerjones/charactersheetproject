import { maxHp } from "./calc";
import { backgroundById } from "./data/backgrounds";
import { CLASSES } from "./data/classes";
import { speciesById } from "./data/species";
import { ABILITIES, CLASS_IDS, type Ability, type Character, type ClassId, type Ruleset, type Skill } from "./types";

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
}

export const emptyScores = (): Record<Ability, number> => ({ str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 });

export const emptyDraft = (): Draft => ({
  ruleset: null,
  name: "",
  speciesId: null,
  backgroundId: null,
  bgBonus: "2-1",
  bgPlus2: null,
  bgPlus1: null,
  scoreMethod: "standard",
  baseScores: emptyScores(),
  optionalFeatId: null,
  classes: [],
  classSkills: [],
});

export function abilityBonuses(d: Draft): Partial<Record<Ability, number>> {
  if (!d.ruleset) return {};
  if (d.ruleset === "2014") return (d.speciesId && speciesById("2014", d.speciesId)?.asi) || {};
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
    const def = CLASSES[id];
    if (def.primaryAbilities.some((a) => scores[a] >= MULTICLASS_MIN_SCORE)) return [];
    const need = def.primaryAbilities.map((a) => a.toUpperCase()).join(" or ");
    return [`${def.name} needs ${need} ${MULTICLASS_MIN_SCORE}+ to multiclass.`];
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
        const def = CLASSES[k.classId];
        if (d.ruleset && k.level >= def.subclassLevel[d.ruleset] && !k.subclassId) {
          issues.push(`Choose a ${def.name} subclass.`);
        }
      }
      const primary = CLASSES[d.classes[0].classId];
      if (d.ruleset) {
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

export function buildCharacter(d: Draft): Character {
  const issues = allIssues(d);
  if (issues.length > 0 || !d.ruleset || !d.speciesId || !d.backgroundId) {
    throw new Error(issues.join(" ") || "Incomplete character");
  }
  const bg = backgroundById(d.ruleset, d.backgroundId);
  const feats = [bg?.featId, d.ruleset === "2014" ? d.optionalFeatId : null].filter((f): f is string => Boolean(f));
  const character: Character = {
    version: 2,
    id: crypto.randomUUID(),
    ruleset: d.ruleset,
    name: d.name.trim(),
    speciesId: d.speciesId,
    backgroundId: d.backgroundId,
    feats,
    classes: d.classes.map((k) => ({ ...k })),
    abilities: finalAbilities(d),
    abilityOverrides: {},
    skillProficiencies: [...new Set([...backgroundSkills(d), ...d.classSkills])],
    expertise: [],
    currentHp: 0,
    tempHp: 0,
    hitDiceUsed: {},
    deathSaves: { successes: 0, failures: 0 },
    resourcesUsed: {},
    rageActive: false,
    notes: "",
  };
  return { ...character, currentHp: maxHp(character) };
}

export const availableClassIds = (d: Draft): ClassId[] =>
  CLASS_IDS.filter((id) => !d.classes.some((k) => k.classId === id));
