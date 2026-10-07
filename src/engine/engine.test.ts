import { describe, expect, it } from "vitest";
import { abilityMod, initiative, maxHp, proficiencyBonus, saveBonus, skillBonus, speed, spellSaveDc } from "./calc";
import { activeEffects, canStartRage, rageDamage, rageUses } from "./rage";
import { applyDamage, applyHealing, grantTempHp, hitDicePool, recoverHitDice } from "./hp";
import { buildCharacter, emptyDraft, finalAbilities, multiclassIssues, stepIssues, type Draft } from "./creation";
import type { Character } from "./types";

const base = (over: Partial<Character> = {}): Character => ({
  version: 2,
  ruleset: "2024",
  name: "T",
  speciesId: "human",
  backgroundId: "soldier",
  feats: [],
  classes: [{ classId: "fighter", level: 1 }],
  abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
  skillProficiencies: [],
  expertise: [],
  currentHp: 0,
  tempHp: 0,
  hitDiceUsed: {},
  deathSaves: { successes: 0, failures: 0 },
  resourcesUsed: {},
  rageActive: false,
  notes: "",
  ...over,
});

describe("hp", () => {
  const hero = (over: Partial<Character> = {}) =>
    base({
      classes: [{ classId: "fighter", level: 4 }],
      abilities: { ...base().abilities, con: 14 },
      currentHp: 20,
      ...over,
    });

  it("spends temp hp before real hp", () => {
    const r = applyDamage(hero({ tempHp: 5 }), 8);
    expect(r).toMatchObject({ tempHp: 0, currentHp: 17 });
  });

  it("halves damage for resistance and never goes below zero", () => {
    expect(applyDamage(hero(), 9, true).currentHp).toBe(16);
    expect(applyDamage(hero({ currentHp: 3 }), 50).currentHp).toBe(0);
  });

  it("caps healing at max hp and clears death saves", () => {
    const c = hero({ currentHp: 0, deathSaves: { successes: 1, failures: 2 } });
    const r = applyHealing(c, 999);
    expect(r.currentHp).toBe(maxHp(c));
    expect(r.deathSaves).toEqual({ successes: 0, failures: 0 });
  });

  it("keeps the higher temp hp instead of stacking", () => {
    expect(grantTempHp(hero({ tempHp: 6 }), 4)).toBe(6);
    expect(grantTempHp(hero({ tempHp: 6 }), 9)).toBe(9);
  });

  it("recovers half the hit dice on a long rest, minimum one", () => {
    const c = hero({ hitDiceUsed: { fighter: 4 } });
    expect(recoverHitDice(c, () => 10)).toEqual({ fighter: 2 });
    const solo = hero({ classes: [{ classId: "fighter", level: 1 }], hitDiceUsed: { fighter: 1 } });
    expect(recoverHitDice(solo, () => 10)).toEqual({ fighter: 0 });
    expect(hitDicePool(c)[0]).toEqual({ classId: "fighter", total: 4, used: 4 });
  });
});

describe("calc", () => {
  it("computes modifiers and proficiency", () => {
    expect(abilityMod(8)).toBe(-1);
    expect(abilityMod(15)).toBe(2);
    expect(proficiencyBonus(1)).toBe(2);
    expect(proficiencyBonus(5)).toBe(3);
    expect(proficiencyBonus(17)).toBe(6);
  });

  it("computes single-class hp, saves and skills", () => {
    const c = base({
      classes: [{ classId: "fighter", level: 3 }],
      abilities: { str: 16, dex: 10, con: 14, int: 10, wis: 10, cha: 10 },
      skillProficiencies: ["athletics"],
    });
    expect(maxHp(c)).toBe(10 + 2 + 2 * (6 + 2));
    expect(saveBonus(c, "str")).toBe(5);
    expect(saveBonus(c, "dex")).toBe(0);
    expect(skillBonus(c, "athletics")).toBe(5);
  });

  it("handles multiclass hp and starting-class saves", () => {
    const c = base({
      classes: [
        { classId: "wizard", level: 2 },
        { classId: "barbarian", level: 2 },
      ],
      abilities: { str: 13, dex: 10, con: 12, int: 13, wis: 10, cha: 10 },
    });
    // wizard: 6+1, then 4+1; barbarian: 7+1, 7+1
    expect(maxHp(c)).toBe(7 + 5 + 8 + 8);
    expect(saveBonus(c, "int")).toBe(1 + 2);
    expect(saveBonus(c, "str")).toBe(1);
    expect(spellSaveDc(c)).toBe(8 + 2 + 1);
  });

  it("applies feat modifiers", () => {
    const tough = base({ feats: ["tough"], classes: [{ classId: "wizard", level: 2 }] });
    expect(maxHp(tough)).toBe(6 + 4 + 4);
    const alert24 = base({ feats: ["alert"], abilities: { ...base().abilities, dex: 14 } });
    expect(initiative(alert24)).toBe(2 + 2);
    expect(initiative({ ...alert24, ruleset: "2014" })).toBe(2 + 5);
  });

  it("adds barbarian fast movement", () => {
    expect(speed(base({ classes: [{ classId: "barbarian", level: 5 }] }))).toBe(40);
    expect(speed(base({ classes: [{ classId: "barbarian", level: 4 }] }))).toBe(30);
  });
});

describe("rage", () => {
  const barb = (level: number, over: Partial<Character> = {}) =>
    base({ classes: [{ classId: "barbarian", level }], ...over });

  it("follows the rage tables", () => {
    expect([1, 3, 6, 12, 17].map((l) => rageUses(l, "2024"))).toEqual([2, 3, 4, 5, 6]);
    expect(rageUses(20, "2014")).toBe(Infinity);
    expect(rageUses(20, "2024")).toBe(6);
    expect([1, 8, 9, 15, 16, 20].map(rageDamage)).toEqual([2, 2, 3, 3, 4, 4]);
  });

  it("only applies effects while raging", () => {
    expect(activeEffects(barb(9)).resistances).toEqual([]);
    const fx = activeEffects(barb(9, { rageActive: true }));
    expect(fx.resistances).toEqual(["Bludgeoning", "Piercing", "Slashing"]);
    expect(fx.damageBonuses[0].value).toBe(3);
    expect(fx.advantage).toEqual({ checks: ["str"], saves: ["str"] });
    expect(fx.spellcastingBlocked).toBe(true);
  });

  it("limits rage by remaining uses", () => {
    expect(canStartRage(barb(1))).toBe(true);
    expect(canStartRage(barb(1, { resourcesUsed: { rage: 2 } }))).toBe(false);
    expect(canStartRage(barb(1, { rageActive: true }))).toBe(false);
    expect(canStartRage(base())).toBe(false);
  });
});

describe("creation", () => {
  const draft = (): Draft => ({
    ...emptyDraft(),
    ruleset: "2024",
    name: "Ayla",
    speciesId: "human",
    backgroundId: "soldier",
    bgPlus2: "str",
    bgPlus1: "con",
    baseScores: { str: 15, dex: 13, con: 14, int: 8, wis: 10, cha: 12 },
    classes: [{ classId: "barbarian", level: 1 }],
    classSkills: ["perception", "survival"],
  });

  it("applies 2024 background bonuses and builds a character", () => {
    const d = draft();
    expect(finalAbilities(d)).toMatchObject({ str: 17, con: 15, dex: 13 });
    const c = buildCharacter(d);
    expect(c.feats).toEqual(["savageAttacker"]);
    expect(c.skillProficiencies).toEqual(["athletics", "intimidation", "perception", "survival"]);
    expect(c.currentHp).toBe(12 + 2);
  });

  it("applies 2014 species bonuses and an optional feat", () => {
    const d: Draft = {
      ...draft(),
      ruleset: "2014",
      speciesId: "dwarf",
      optionalFeatId: "tough",
      baseScores: { str: 15, dex: 13, con: 14, int: 8, wis: 10, cha: 12 },
    };
    expect(finalAbilities(d).con).toBe(16);
    expect(buildCharacter(d).feats).toEqual(["tough"]);
  });

  it("validates steps", () => {
    expect(stepIssues(emptyDraft(), "ruleset")).not.toEqual([]);
    expect(stepIssues({ ...draft(), bgPlus1: "str" }, "background")).not.toEqual([]);
    expect(stepIssues({ ...draft(), baseScores: { ...draft().baseScores, dex: 15 } }, "abilities")).not.toEqual([]);
    expect(stepIssues({ ...draft(), classSkills: ["athletics", "perception"] }, "class")).not.toEqual([]);
    const sub = { ...draft(), classes: [{ classId: "barbarian" as const, level: 3 }] };
    expect(stepIssues(sub, "class")).toContain("Choose a Barbarian subclass.");
    expect(() => buildCharacter(emptyDraft())).toThrow();
  });

  it("enforces multiclass prerequisites", () => {
    const scores = { str: 15, dex: 8, con: 10, int: 12, wis: 10, cha: 10 };
    expect(multiclassIssues(scores, ["barbarian"])).toEqual([]);
    expect(multiclassIssues(scores, ["barbarian", "wizard"])).toEqual(["Wizard needs INT 13+ to multiclass."]);
    expect(multiclassIssues({ ...scores, int: 13 }, ["barbarian", "wizard"])).toEqual([]);
  });
});
