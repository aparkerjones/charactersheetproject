import { z } from "zod";

export const ABILITIES = ["str", "dex", "con", "int", "wis", "cha"] as const;
export type Ability = (typeof ABILITIES)[number];

export const SKILLS = {
  acrobatics: "dex",
  animalHandling: "wis",
  arcana: "int",
  athletics: "str",
  deception: "cha",
  history: "int",
  insight: "wis",
  intimidation: "cha",
  investigation: "int",
  medicine: "wis",
  nature: "int",
  perception: "wis",
  performance: "cha",
  persuasion: "cha",
  religion: "int",
  sleightOfHand: "dex",
  stealth: "dex",
  survival: "wis",
} as const satisfies Record<string, Ability>;
export type Skill = keyof typeof SKILLS;

export const RULESETS = ["2014", "2024"] as const;
export type Ruleset = (typeof RULESETS)[number];

export const CLASS_IDS = ["barbarian", "fighter", "rogue", "wizard"] as const;
export type ClassId = (typeof CLASS_IDS)[number];

export interface ClassResource {
  id: string;
  label: string;
  minLevel?: number;
  max: (level: number, ruleset: Ruleset) => number;
  // Uses regained on a short rest; Infinity restores everything. Long rests always restore everything.
  shortRestRecovery: (ruleset: Ruleset) => number;
}

export interface SubclassDefinition {
  id: string;
  name: string;
  summary: string;
}

export interface ClassFeature {
  level: number;
  name: string;
  description: string;
  rulesets?: Ruleset[];
}

export interface ClassDefinition {
  id: ClassId;
  name: string;
  hitDie: number;
  saves: Ability[];
  primaryAbilities: Ability[];
  skillCount: number;
  skillOptions: Record<Ruleset, Skill[]>;
  subclassLevel: Record<Ruleset, number>;
  subclasses: Record<Ruleset, SubclassDefinition[]>;
  spellcasting?: { ability: Ability };
  resources: ClassResource[];
  features: ClassFeature[];
}

export interface SpeciesDefinition {
  id: string;
  name: string;
  speed: number;
  // Fixed ability bonuses; only used by the 2014 rules.
  asi?: Partial<Record<Ability, number>>;
  traits: string[];
}

export interface BackgroundDefinition {
  id: string;
  name: string;
  skills: [Skill, Skill];
  // 2024 backgrounds let you spread bonuses across these abilities.
  abilityOptions?: Ability[];
  featId?: string;
  summary: string;
}

export interface FeatMods {
  hpPerLevel?: number;
  initiativeFlat?: number;
  initiativeProficiency?: boolean;
}

export interface FeatDefinition {
  id: string;
  name: string;
  description: string;
  mods?: (ruleset: Ruleset) => FeatMods;
}

const score = z.number().int().min(1).max(30);

export const CharacterSchema = z
  .object({
    version: z.literal(2),
    ruleset: z.enum(RULESETS),
    name: z.string(),
    speciesId: z.string(),
    backgroundId: z.string(),
    feats: z.array(z.string()),
    classes: z
      .array(
        z.object({
          classId: z.enum(CLASS_IDS),
          level: z.number().int().min(1).max(20),
          subclassId: z.string().optional(),
        }),
      )
      .min(1),
    abilities: z.object({ str: score, dex: score, con: score, int: score, wis: score, cha: score }),
    skillProficiencies: z.array(z.string()),
    expertise: z.array(z.string()),
    currentHp: z.number().int(),
    tempHp: z.number().int().min(0).default(0),
    hitDiceUsed: z.record(z.string(), z.number().int().min(0)).default({}),
    deathSaves: z
      .object({ successes: z.number().int().min(0).max(3), failures: z.number().int().min(0).max(3) })
      .default({ successes: 0, failures: 0 }),
    resourcesUsed: z.record(z.string(), z.number().int().min(0)),
    rageActive: z.boolean(),
    notes: z.string(),
  })
  .refine((c) => c.classes.reduce((n, k) => n + k.level, 0) <= 20, { message: "Total level cannot exceed 20" });

export type Character = z.infer<typeof CharacterSchema>;
export type ClassLevel = Character["classes"][number];
