import type { ClassId, ClassProfile, ClassResource } from "../types";

const ALL_SKILLS = [
  "acrobatics", "animalHandling", "arcana", "athletics", "deception", "history", "insight",
  "intimidation", "investigation", "medicine", "nature", "perception", "performance",
  "persuasion", "religion", "sleightOfHand", "stealth", "survival",
] as const;

const both = (skills: ClassProfile["skillOptions"]["2014"]) => ({ "2014": skills, "2024": skills });
const resource = (
  id: string,
  label: string,
  minLevel: number,
  max: ClassResource["max"],
  shortRestRecovery: ClassResource["shortRestRecovery"] = () => 0,
  unit: ClassResource["unit"] = "uses",
): ClassResource => ({ id, label, minLevel, max, shortRestRecovery, unit });
const longRestOnly: ClassResource["shortRestRecovery"] = () => 0;
const recoverAll: ClassResource["shortRestRecovery"] = () => Infinity;
const abilityModifier = (character: Parameters<ClassResource["max"]>[2], ability: "wis" | "cha") =>
  Math.floor(((character?.abilityOverrides[ability] ?? character?.abilities[ability] ?? 10) - 10) / 2);

export const CLASS_PROFILES: Record<ClassId, ClassProfile> = {
  artificer: {
    id: "artificer", name: "Artificer", hitDie: 8, saves: ["con", "int"], primaryAbilities: ["int"], multiclassRequirements: [["int"]],
    skillCount: 2,
    skillOptions: both(["arcana", "history", "investigation", "medicine", "nature", "perception", "sleightOfHand"]),
    subclassLevel: { "2014": 3, "2024": 3 }, spellcasting: { ability: "int", progression: "halfUp" },
  },
  barbarian: {
    id: "barbarian", name: "Barbarian", hitDie: 12, saves: ["str", "con"], primaryAbilities: ["str"], multiclassRequirements: [["str"]],
    skillCount: 2,
    skillOptions: both(["animalHandling", "athletics", "intimidation", "nature", "perception", "survival"]),
    subclassLevel: { "2014": 3, "2024": 3 },
  },
  bard: {
    id: "bard", name: "Bard", hitDie: 8, saves: ["dex", "cha"], primaryAbilities: ["cha"], multiclassRequirements: [["dex"], ["cha"]],
    skillCount: 3, skillOptions: both([...ALL_SKILLS]),
    subclassLevel: { "2014": 3, "2024": 3 }, spellcasting: { ability: "cha", progression: "full" },
    resources: [
      resource(
        "bardicInspiration",
        "Bardic Inspiration",
        1,
        (_level, _ruleset, character) => Math.max(1, abilityModifier(character, "cha")),
        (_ruleset, level = 1) => level >= 5 ? Infinity : 0,
      ),
    ],
  },
  cleric: {
    id: "cleric", name: "Cleric", hitDie: 8, saves: ["wis", "cha"], primaryAbilities: ["wis"], multiclassRequirements: [["wis"]],
    skillCount: 2,
    skillOptions: both(["history", "insight", "medicine", "persuasion", "religion"]),
    subclassLevel: { "2014": 1, "2024": 3 }, spellcasting: { ability: "wis", progression: "full" },
    resources: [
      resource(
        "channelDivinity",
        "Channel Divinity",
        2,
        (level, ruleset) => ruleset === "2014"
          ? level >= 18 ? 3 : level >= 6 ? 2 : 1
          : level >= 18 ? 4 : level >= 6 ? 3 : 2,
        (ruleset) => ruleset === "2014" ? recoverAll(ruleset) : 1,
      ),
    ],
  },
  druid: {
    id: "druid", name: "Druid", hitDie: 8, saves: ["int", "wis"], primaryAbilities: ["wis"], multiclassRequirements: [["wis"]],
    skillCount: 2,
    skillOptions: both(["animalHandling", "arcana", "insight", "medicine", "nature", "perception", "religion", "survival"]),
    subclassLevel: { "2014": 2, "2024": 3 }, spellcasting: { ability: "wis", progression: "full" },
    resources: [
      resource(
        "wildShape",
        "Wild Shape",
        2,
        (level, ruleset) => ruleset === "2014" ? 2 : level >= 17 ? 4 : level >= 6 ? 3 : 2,
        (ruleset) => ruleset === "2014" ? recoverAll(ruleset) : 1,
      ),
    ],
  },
  fighter: {
    id: "fighter", name: "Fighter", hitDie: 10, saves: ["str", "con"], primaryAbilities: ["str", "dex"], multiclassRequirements: [["str", "dex"]],
    skillCount: 2,
    skillOptions: {
      "2014": ["acrobatics", "animalHandling", "athletics", "history", "insight", "intimidation", "perception", "survival"],
      "2024": ["acrobatics", "animalHandling", "athletics", "history", "insight", "intimidation", "persuasion", "perception", "survival"],
    },
    subclassLevel: { "2014": 3, "2024": 3 },
  },
  monk: {
    id: "monk", name: "Monk", hitDie: 8, saves: ["str", "dex"], primaryAbilities: ["dex", "wis"], multiclassRequirements: [["dex"], ["wis"]],
    skillCount: 2,
    skillOptions: both(["acrobatics", "athletics", "history", "insight", "religion", "stealth"]),
    subclassLevel: { "2014": 3, "2024": 3 },
    resources: [
      resource("focusPoints", "Focus Points", 2, (level) => level, recoverAll),
    ],
  },
  paladin: {
    id: "paladin", name: "Paladin", hitDie: 10, saves: ["wis", "cha"], primaryAbilities: ["str", "cha"], multiclassRequirements: [["str"], ["cha"]],
    skillCount: 2,
    skillOptions: both(["athletics", "insight", "intimidation", "medicine", "persuasion", "religion"]),
    subclassLevel: { "2014": 3, "2024": 3 }, spellcasting: { ability: "cha", progression: "halfDown", minLevel: 2 },
    resources: [
      resource("layOnHands", "Lay on Hands", 1, (level) => level * 5, longRestOnly, "points"),
    ],
  },
  ranger: {
    id: "ranger", name: "Ranger", hitDie: 10, saves: ["str", "dex"], primaryAbilities: ["str", "dex"], multiclassRequirements: [["dex"], ["wis"]],
    skillCount: 3,
    skillOptions: both(["animalHandling", "athletics", "insight", "investigation", "nature", "perception", "stealth", "survival"]),
    subclassLevel: { "2014": 3, "2024": 3 }, spellcasting: { ability: "wis", progression: "halfDown", minLevel: 2 },
  },
  rogue: {
    id: "rogue", name: "Rogue", hitDie: 8, saves: ["dex", "int"], primaryAbilities: ["dex"], multiclassRequirements: [["dex"]],
    skillCount: 4,
    skillOptions: {
      "2014": ["acrobatics", "athletics", "deception", "insight", "intimidation", "investigation", "perception", "performance", "persuasion", "sleightOfHand", "stealth"],
      "2024": ["acrobatics", "athletics", "deception", "insight", "intimidation", "investigation", "perception", "persuasion", "sleightOfHand", "stealth"],
    },
    subclassLevel: { "2014": 3, "2024": 3 },
  },
  sorcerer: {
    id: "sorcerer", name: "Sorcerer", hitDie: 6, saves: ["con", "cha"], primaryAbilities: ["cha"], multiclassRequirements: [["cha"]],
    skillCount: 2,
    skillOptions: both(["arcana", "deception", "insight", "intimidation", "persuasion", "religion"]),
    subclassLevel: { "2014": 1, "2024": 3 }, spellcasting: { ability: "cha", progression: "full" },
    resources: [
      resource("sorceryPoints", "Sorcery Points", 2, (level) => level, longRestOnly, "points"),
    ],
  },
  warlock: {
    id: "warlock", name: "Warlock", hitDie: 8, saves: ["wis", "cha"], primaryAbilities: ["cha"], multiclassRequirements: [["cha"]],
    skillCount: 2,
    skillOptions: both(["arcana", "deception", "history", "intimidation", "investigation", "nature", "religion"]),
    subclassLevel: { "2014": 1, "2024": 3 }, spellcasting: { ability: "cha", progression: "pact" },
  },
  wizard: {
    id: "wizard", name: "Wizard", hitDie: 6, saves: ["int", "wis"], primaryAbilities: ["int"], multiclassRequirements: [["int"]],
    skillCount: 2,
    skillOptions: {
      "2014": ["arcana", "history", "insight", "investigation", "medicine", "religion"],
      "2024": ["arcana", "history", "insight", "investigation", "medicine", "nature", "religion"],
    },
    subclassLevel: { "2014": 2, "2024": 3 }, spellcasting: { ability: "int", progression: "full" },
  },
};
