import type { ClassId, Ruleset, Skill } from "./types";

export interface ChoiceOption {
  id: string;
  label: string;
  description: string;
}

const styles: Record<string, ChoiceOption> = {
  archery: { id: "archery", label: "Archery", description: "+2 to ranged weapon attack rolls." },
  "blind-fighting": { id: "blind-fighting", label: "Blind Fighting", description: "Blindsight within 10 feet." },
  defense: { id: "defense", label: "Defense", description: "+1 AC while wearing armor; armor is not tracked by this sheet yet." },
  dueling: { id: "dueling", label: "Dueling", description: "+2 damage with a one-handed melee weapon while holding no other weapon." },
  "great-weapon-fighting": { id: "great-weapon-fighting", label: "Great Weapon Fighting", description: "Reroll 1s and 2s on eligible two-handed melee weapon damage dice." },
  interception: { id: "interception", label: "Interception", description: "Use your reaction to reduce nearby damage; roll and resolve it at the table." },
  protection: { id: "protection", label: "Protection", description: "Use your reaction and shield to hinder an attack against a nearby ally." },
  "thrown-weapon-fighting": { id: "thrown-weapon-fighting", label: "Thrown Weapon Fighting", description: "Draw a thrown weapon as part of an attack and gain +2 damage on ranged attacks with thrown weapons." },
  "two-weapon-fighting": { id: "two-weapon-fighting", label: "Two-Weapon Fighting", description: "Add your ability modifier to the damage of your second light-weapon attack." },
  "unarmed-fighting": { id: "unarmed-fighting", label: "Unarmed Fighting", description: "Improve unarmed strike damage and damage from grappling." },
  "blessed-warrior": { id: "blessed-warrior", label: "Blessed Warrior", description: "Learn two Cleric cantrips; choose them below. Spell casting is not implemented yet." },
  "druidic-warrior": { id: "druidic-warrior", label: "Druidic Warrior", description: "Learn two Druid cantrips; choose them below. Spell casting is not implemented yet." },
};

const PHB_2014: Record<ClassId, string[]> = {
  artificer: [],
  barbarian: [],
  bard: [],
  cleric: [],
  druid: [],
  fighter: ["archery", "defense", "dueling", "great-weapon-fighting", "protection", "two-weapon-fighting", "blind-fighting", "interception", "thrown-weapon-fighting", "unarmed-fighting"],
  monk: [],
  paladin: ["defense", "dueling", "great-weapon-fighting", "protection", "blessed-warrior", "blind-fighting", "interception"],
  ranger: ["archery", "defense", "dueling", "two-weapon-fighting", "druidic-warrior", "blind-fighting", "interception", "thrown-weapon-fighting"],
  rogue: [],
  sorcerer: [],
  warlock: [],
  wizard: [],
};

const PHB_2024 = [
  "archery",
  "blind-fighting",
  "defense",
  "dueling",
  "great-weapon-fighting",
  "interception",
  "protection",
  "thrown-weapon-fighting",
  "two-weapon-fighting",
  "unarmed-fighting",
];

const CLERIC_CANTRIPS: Record<Ruleset, string[]> = {
  "2014": [
    "guidance", "light", "mending", "resistance", "sacred-flame",
    "spare-the-dying", "thaumaturgy", "toll-the-dead", "word-of-radiance",
  ],
  "2024": ["guidance", "light", "mending", "resistance", "sacred-flame", "spare-the-dying", "thaumaturgy"],
};
const DRUID_CANTRIPS: Record<Ruleset, string[]> = {
  "2014": [
    "control-flames", "create-bonfire", "druidcraft", "frostbite", "guidance",
    "gust", "infestation", "magic-stone", "mending", "mold-earth",
    "poison-spray", "produce-flame", "primal-savagery", "resistance",
    "shape-water", "shillelagh", "thorn-whip", "thunderclap",
  ],
  "2024": [
    "druidcraft", "elementalism", "guidance", "mending", "poison-spray",
    "produce-flame", "resistance", "shillelagh", "starry-wisp", "thorn-whip",
  ],
};
export const fightingStyleKey = (classId: ClassId) => `fighting-style:${classId}`;
export const fightingStyleCantripsKey = (classId: ClassId) => `fighting-style-cantrips:${classId}`;
export const expertiseKey = (classId: ClassId) => `expertise:${classId}`;

export function fightingStyleOptions(classId: ClassId, ruleset: Ruleset): ChoiceOption[] {
  const ids = ruleset === "2014"
    ? PHB_2014[classId]
    : ["fighter", "paladin", "ranger"].includes(classId)
      ? [...PHB_2024, ...(classId === "paladin" ? ["blessed-warrior"] : []), ...(classId === "ranger" ? ["druidic-warrior"] : [])]
      : [];
  return ids.map((id) => styles[id]);
}

export function classChoiceRequirements(classId: ClassId, ruleset: Ruleset, level: number) {
  const fightingStyle = (classId === "fighter" && level >= 1) ||
    ((classId === "paladin" || classId === "ranger") && level >= 2);
  let expertiseCount = 0;
  if (classId === "rogue") expertiseCount = level >= 6 ? 4 : level >= 1 ? 2 : 0;
  if (classId === "bard") {
    expertiseCount = ruleset === "2014"
      ? level >= 10 ? 4 : level >= 3 ? 2 : 0
      : level >= 9 ? 4 : level >= 2 ? 2 : 0;
  }
  if (classId === "ranger" && ruleset === "2024" && level >= 2) expertiseCount = 1;
  return { fightingStyle, expertiseCount };
}

export function cantripOptionsForStyle(styleId: string, ruleset: Ruleset): ChoiceOption[] {
  const ids = styleId === "blessed-warrior" ? CLERIC_CANTRIPS[ruleset]
    : styleId === "druidic-warrior" ? DRUID_CANTRIPS[ruleset]
      : [];
  return ids.map((id) => ({
    id,
    label: id.split("-").map((word) => word[0].toUpperCase() + word.slice(1)).join(" "),
    description: "",
  }));
}

export function isCantripStyle(styleId: string): boolean {
  return styleId === "blessed-warrior" || styleId === "druidic-warrior";
}

export function skillChoiceKey(classId: ClassId) {
  return expertiseKey(classId);
}

export function isSkillChoice(value: string): value is Skill {
  return [
    "acrobatics", "animalHandling", "arcana", "athletics", "deception",
    "history", "insight", "intimidation", "investigation", "medicine",
    "nature", "perception", "performance", "persuasion", "religion",
    "sleightOfHand", "stealth", "survival",
  ].includes(value);
}
