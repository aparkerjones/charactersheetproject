import type { BackgroundDefinition, Ruleset } from "../types";

// Paraphrased summaries; verify skill lists and feat grants against your sources.
export const BACKGROUNDS: Record<Ruleset, BackgroundDefinition[]> = {
  "2014": [
    { id: "acolyte", name: "Acolyte", skills: ["insight", "religion"], summary: "A life of service in a temple." },
    { id: "criminal", name: "Criminal", skills: ["deception", "stealth"], summary: "A history of breaking the law." },
    { id: "sage", name: "Sage", skills: ["arcana", "history"], summary: "Years spent studying lore." },
    { id: "soldier", name: "Soldier", skills: ["athletics", "intimidation"], summary: "Training and war service." },
  ],
  "2024": [
    {
      id: "acolyte",
      name: "Acolyte",
      skills: ["insight", "religion"],
      abilityOptions: ["int", "wis", "cha"],
      featId: "magicInitiateCleric",
      summary: "A life of service in a temple.",
    },
    {
      id: "criminal",
      name: "Criminal",
      skills: ["sleightOfHand", "stealth"],
      abilityOptions: ["dex", "con", "int"],
      featId: "alert",
      summary: "A history of breaking the law.",
    },
    {
      id: "sage",
      name: "Sage",
      skills: ["arcana", "history"],
      abilityOptions: ["con", "int", "wis"],
      featId: "magicInitiateWizard",
      summary: "Years spent studying lore.",
    },
    {
      id: "soldier",
      name: "Soldier",
      skills: ["athletics", "intimidation"],
      abilityOptions: ["str", "dex", "con"],
      featId: "savageAttacker",
      summary: "Training and war service.",
    },
  ],
};

export const backgroundById = (ruleset: Ruleset, id: string) => BACKGROUNDS[ruleset].find((b) => b.id === id);
