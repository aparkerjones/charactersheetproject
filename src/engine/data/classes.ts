import type { ClassDefinition, ClassId, Ruleset } from "../types";

const barbarianRages = (l: number, r: Ruleset) => {
  if (l >= 20) return r === "2014" ? Infinity : 6;
  if (l >= 17) return 6;
  if (l >= 12) return 5;
  if (l >= 6) return 4;
  if (l >= 3) return 3;
  return 2;
};

// Features are short paraphrases; verify against your sources.
export const CLASSES: Partial<Record<ClassId, ClassDefinition>> = {
  barbarian: {
    id: "barbarian",
    name: "Barbarian",
    hitDie: 12,
    saves: ["str", "con"],
    primaryAbilities: ["str"],
    skillCount: 2,
    skillOptions: {
      "2014": ["animalHandling", "athletics", "intimidation", "nature", "perception", "survival"],
      "2024": ["animalHandling", "athletics", "intimidation", "nature", "perception", "survival"],
    },
    subclassLevel: { "2014": 3, "2024": 3 },
    subclasses: {
      "2014": [
        { id: "berserker", name: "Path of the Berserker", summary: "Frenzied extra attacks at a cost." },
        { id: "totemWarrior", name: "Path of the Totem Warrior", summary: "Spirit animals shape your rage." },
      ],
      "2024": [
        { id: "berserker", name: "Path of the Berserker", summary: "Frenzied extra damage while raging." },
        { id: "wildHeart", name: "Path of the Wild Heart", summary: "Animal spirits empower your rage." },
        { id: "worldTree", name: "Path of the World Tree", summary: "Cosmic tree grants vitality and reach." },
        { id: "zealot", name: "Path of the Zealot", summary: "Divine fury and resilient recovery." },
      ],
    },
    resources: [
      {
        id: "rage",
        label: "Rages",
        max: barbarianRages,
        shortRestRecovery: (r) => (r === "2024" ? 1 : 0),
      },
    ],
    features: [
      { level: 1, name: "Rage", description: "Bonus action: resist weapon damage, add damage to Strength attacks, and gain Strength advantage." },
      { level: 1, name: "Unarmored Defense", description: "Without armor, AC = 10 + DEX + CON." },
      { level: 1, name: "Weapon Mastery", description: "Use mastery properties of chosen weapons.", rulesets: ["2024"] },
      { level: 2, name: "Danger Sense", description: "Advantage on DEX saves against effects you can see." },
      { level: 2, name: "Reckless Attack", description: "Attack with advantage, but enemies gain advantage against you." },
      { level: 3, name: "Primal Knowledge", description: "Gain an extra skill proficiency.", rulesets: ["2024"] },
      { level: 5, name: "Extra Attack", description: "Attack twice when you take the Attack action." },
      { level: 5, name: "Fast Movement", description: "+10 ft speed while not in heavy armor." },
      { level: 9, name: "Brutal Strike", description: "Trade Reckless Attack advantage for extra damage and an effect.", rulesets: ["2024"] },
    ],
  },
  fighter: {
    id: "fighter",
    name: "Fighter",
    hitDie: 10,
    saves: ["str", "con"],
    primaryAbilities: ["str", "dex"],
    skillCount: 2,
    skillOptions: {
      "2014": ["acrobatics", "animalHandling", "athletics", "history", "insight", "intimidation", "perception", "survival"],
      "2024": ["acrobatics", "animalHandling", "athletics", "history", "insight", "intimidation", "persuasion", "perception", "survival"],
    },
    subclassLevel: { "2014": 3, "2024": 3 },
    subclasses: {
      "2014": [
        { id: "champion", name: "Champion", summary: "Improved critical hits and athletic prowess." },
        { id: "battleMaster", name: "Battle Master", summary: "Combat maneuvers fueled by superiority dice." },
      ],
      "2024": [
        { id: "champion", name: "Champion", summary: "Improved critical hits and athletic prowess." },
        { id: "battleMaster", name: "Battle Master", summary: "Combat maneuvers fueled by superiority dice." },
      ],
    },
    resources: [
      {
        id: "secondWind",
        label: "Second Wind",
        max: (l, r) => (r === "2014" ? 1 : l >= 10 ? 4 : l >= 4 ? 3 : 2),
        shortRestRecovery: (r) => (r === "2014" ? Infinity : 1),
      },
      {
        id: "actionSurge",
        label: "Action Surge",
        minLevel: 2,
        max: (l) => (l >= 17 ? 2 : 1),
        shortRestRecovery: () => Infinity,
      },
    ],
    features: [
      { level: 1, name: "Fighting Style", description: "Adopt a specialty such as Defense or Dueling." },
      { level: 1, name: "Second Wind", description: "Bonus action: regain 1d10 + fighter level HP." },
      { level: 1, name: "Weapon Mastery", description: "Use mastery properties of chosen weapons.", rulesets: ["2024"] },
      { level: 2, name: "Action Surge", description: "Take one additional action on your turn." },
      { level: 5, name: "Extra Attack", description: "Attack twice when you take the Attack action." },
    ],
  },
  rogue: {
    id: "rogue",
    name: "Rogue",
    hitDie: 8,
    saves: ["dex", "int"],
    primaryAbilities: ["dex"],
    skillCount: 4,
    skillOptions: {
      "2014": ["acrobatics", "athletics", "deception", "insight", "intimidation", "investigation", "perception", "performance", "persuasion", "sleightOfHand", "stealth"],
      "2024": ["acrobatics", "athletics", "deception", "insight", "intimidation", "investigation", "perception", "persuasion", "sleightOfHand", "stealth"],
    },
    subclassLevel: { "2014": 3, "2024": 3 },
    subclasses: {
      "2014": [
        { id: "thief", name: "Thief", summary: "Fast hands and climbing skill." },
        { id: "assassin", name: "Assassin", summary: "Lethal surprise attacks." },
      ],
      "2024": [
        { id: "thief", name: "Thief", summary: "Fast hands and climbing skill." },
        { id: "assassin", name: "Assassin", summary: "Lethal surprise attacks." },
      ],
    },
    resources: [],
    features: [
      { level: 1, name: "Expertise", description: "Double your proficiency bonus on two skills." },
      { level: 1, name: "Sneak Attack", description: "Once per turn, add extra damage when you have an edge." },
      { level: 1, name: "Thieves' Cant", description: "Secret rogue language.", rulesets: ["2014"] },
      { level: 1, name: "Weapon Mastery", description: "Use mastery properties of chosen weapons.", rulesets: ["2024"] },
      { level: 2, name: "Cunning Action", description: "Dash, Disengage or Hide as a bonus action." },
    ],
  },
  wizard: {
    id: "wizard",
    name: "Wizard",
    hitDie: 6,
    saves: ["int", "wis"],
    primaryAbilities: ["int"],
    skillCount: 2,
    skillOptions: {
      "2014": ["arcana", "history", "insight", "investigation", "medicine", "religion"],
      "2024": ["arcana", "history", "insight", "investigation", "medicine", "nature", "religion"],
    },
    subclassLevel: { "2014": 2, "2024": 3 },
    subclasses: {
      "2014": [
        { id: "evocation", name: "School of Evocation", summary: "Shape destructive spells." },
        { id: "abjuration", name: "School of Abjuration", summary: "Protective wards." },
      ],
      "2024": [
        { id: "evoker", name: "Evoker", summary: "Shape destructive spells." },
        { id: "abjurer", name: "Abjurer", summary: "Protective wards." },
      ],
    },
    spellcasting: { ability: "int" },
    resources: [
      { id: "arcaneRecovery", label: "Arcane Recovery", max: () => 1, shortRestRecovery: () => 0 },
    ],
    features: [
      { level: 1, name: "Spellcasting", description: "Prepare spells from your spellbook." },
      { level: 1, name: "Arcane Recovery", description: "Once per day, recover some spell slots on a short rest." },
      { level: 2, name: "Scholar", description: "Expertise in a knowledge skill.", rulesets: ["2024"] },
    ],
  },
};
