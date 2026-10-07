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

export type ClassId = "barbarian" | "fighter" | "rogue" | "wizard";

export interface ClassResource {
  id: string;
  label: string;
  max: (level: number) => number;
  recharge: "short" | "long";
}

export interface ClassDefinition {
  id: ClassId;
  name: string;
  hitDie: number;
  saves: Ability[];
  spellcasting?: { ability: Ability; fullCaster: boolean };
  resources: ClassResource[];
  features: { level: number; name: string; description: string }[];
}

export const CharacterSchema = z.object({
  version: z.literal(1),
  name: z.string(),
  classId: z.enum(["barbarian", "fighter", "rogue", "wizard"]),
  level: z.number().int().min(1).max(20),
  abilities: z.object({
    str: z.number().int().min(1).max(30),
    dex: z.number().int().min(1).max(30),
    con: z.number().int().min(1).max(30),
    int: z.number().int().min(1).max(30),
    wis: z.number().int().min(1).max(30),
    cha: z.number().int().min(1).max(30),
  }),
  skillProficiencies: z.array(z.string()),
  expertise: z.array(z.string()),
  currentHp: z.number().int(),
  resourcesUsed: z.record(z.string(), z.number().int().min(0)),
  notes: z.string(),
});
export type Character = z.infer<typeof CharacterSchema>;
