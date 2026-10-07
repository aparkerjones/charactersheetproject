import type { FeatDefinition, Ruleset } from "../types";

// Descriptions are short paraphrases; verify exact wording and numbers against your rulebooks.
export const FEATS: FeatDefinition[] = [
  {
    id: "alert",
    name: "Alert",
    description: "You are quick to react at the start of a fight, boosting your initiative.",
    mods: (r: Ruleset) => (r === "2024" ? { initiativeProficiency: true } : { initiativeFlat: 5 }),
  },
  {
    id: "lucky",
    name: "Lucky",
    description: "You have a small pool of luck points to reroll important dice.",
  },
  {
    id: "savageAttacker",
    name: "Savage Attacker",
    description: "Once per turn you can reroll weapon damage dice and keep the better result.",
  },
  {
    id: "tough",
    name: "Tough",
    description: "Your hit point maximum increases by 2 for every level you have.",
    mods: () => ({ hpPerLevel: 2 }),
  },
  {
    id: "magicInitiateCleric",
    name: "Magic Initiate (Cleric)",
    description: "Learn a couple of cantrips and one first-level spell from the Cleric list.",
  },
  {
    id: "magicInitiateWizard",
    name: "Magic Initiate (Wizard)",
    description: "Learn a couple of cantrips and one first-level spell from the Wizard list.",
  },
];

export const featById = (id: string) => FEATS.find((f) => f.id === id);
