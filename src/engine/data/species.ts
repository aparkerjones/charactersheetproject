import type { Ruleset, SpeciesDefinition } from "../types";

// 2014 species carry fixed ability bonuses; 2024 moved those onto backgrounds.
// Traits are short paraphrases; verify against your sources.
export const SPECIES: Record<Ruleset, SpeciesDefinition[]> = {
  "2014": [
    {
      id: "human",
      name: "Human",
      speed: 30,
      asi: { str: 1, dex: 1, con: 1, int: 1, wis: 1, cha: 1 },
      traits: ["+1 to every ability score", "One extra language"],
    },
    {
      id: "elf",
      name: "Elf",
      speed: 30,
      asi: { dex: 2 },
      traits: ["Darkvision 60 ft", "Resistant to being charmed and immune to magical sleep", "Trance instead of sleep"],
    },
    {
      id: "dwarf",
      name: "Dwarf",
      speed: 25,
      asi: { con: 2 },
      traits: ["Darkvision 60 ft", "Advantage on saves against poison, resistance to poison damage"],
    },
    {
      id: "halfling",
      name: "Halfling",
      speed: 25,
      asi: { dex: 2 },
      traits: ["Reroll natural 1s on d20 tests", "Advantage on saves against fear", "Slip past larger creatures"],
    },
  ],
  "2024": [
    {
      id: "human",
      name: "Human",
      speed: 30,
      traits: ["Resourceful: gain Heroic Inspiration after a long rest", "Skillful: one extra skill proficiency", "Versatile: one extra Origin feat"],
    },
    {
      id: "elf",
      name: "Elf",
      speed: 30,
      traits: ["Darkvision 60 ft", "Advantage against being charmed", "Trance instead of sleep", "Lineage grants spells"],
    },
    {
      id: "dwarf",
      name: "Dwarf",
      speed: 30,
      traits: ["Darkvision 120 ft", "Resistance to poison damage", "Stonecunning"],
    },
    {
      id: "halfling",
      name: "Halfling",
      speed: 30,
      traits: ["Reroll natural 1s on d20 tests", "Brave against fear", "Move through larger creatures' spaces"],
    },
  ],
};

export const speciesById = (ruleset: Ruleset, id: string) => SPECIES[ruleset].find((s) => s.id === id);
