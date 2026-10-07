import type { ClassDefinition, ClassId } from "./types";

export const CLASSES: Record<ClassId, ClassDefinition> = {
  barbarian: {
    id: "barbarian",
    name: "Barbarian",
    hitDie: 12,
    saves: ["str", "con"],
    resources: [
      {
        id: "rage",
        label: "Rages",
        max: (l) => (l >= 20 ? 99 : l >= 17 ? 6 : l >= 12 ? 5 : l >= 6 ? 4 : l >= 3 ? 3 : 2),
        recharge: "long",
      },
    ],
    features: [
      { level: 1, name: "Rage", description: "Bonus action: advantage on STR checks/saves and bonus melee damage." },
      { level: 1, name: "Unarmored Defense", description: "AC = 10 + DEX + CON while unarmored." },
    ],
  },
  fighter: {
    id: "fighter",
    name: "Fighter",
    hitDie: 10,
    saves: ["str", "con"],
    resources: [
      { id: "secondWind", label: "Second Wind", max: () => 1, recharge: "short" },
      { id: "actionSurge", label: "Action Surge", max: (l) => (l >= 17 ? 2 : 1), recharge: "short" },
    ],
    features: [
      { level: 1, name: "Fighting Style", description: "Choose a style, such as Defense or Dueling." },
      { level: 1, name: "Second Wind", description: "Bonus action: regain 1d10 + level HP." },
    ],
  },
  rogue: {
    id: "rogue",
    name: "Rogue",
    hitDie: 8,
    saves: ["dex", "int"],
    resources: [],
    features: [
      { level: 1, name: "Sneak Attack", description: "Extra damage once per turn: ceil(level / 2) d6." },
      { level: 1, name: "Expertise", description: "Double proficiency in two skills." },
    ],
  },
  wizard: {
    id: "wizard",
    name: "Wizard",
    hitDie: 6,
    saves: ["int", "wis"],
    spellcasting: { ability: "int", fullCaster: true },
    resources: [
      { id: "arcaneRecovery", label: "Arcane Recovery", max: () => 1, recharge: "long" },
    ],
    features: [
      { level: 1, name: "Spellcasting", description: "Prepare spells from your spellbook." },
      { level: 1, name: "Arcane Recovery", description: "Recover spell slots on a short rest." },
    ],
  },
};
