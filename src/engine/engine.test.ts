import { describe, expect, it } from "vitest";
import { abilityMod, abilityScore, armorClass, passiveScore, initiative, maxHp, proficiencyBonus, saveBonus, skillBonus, speed, spellSaveDc } from "./calc";
import { activeEffects, canStartRage, rageDamage, rageUses } from "./rage";
import { resolveDamage, applyDamage, applyHealing, grantTempHp, hitDicePool, recoverHitDice } from "./hp";
import { buildCharacter, draftFromCharacter, emptyDraft, finalAbilities, multiclassIssues, stepIssues, type Draft } from "./creation";
import { CLASS_IDS, type Character } from "./types";
import { CLASS_ROSTER, rosterSubclassNames } from "./data/roster";
import { CLASS_PROFILES } from "./data/classProfiles";
import { effectiveCasterLevel, spellSlotPools } from "./spells";
import { recoverResourceUses, resourcePools } from "./resources";
import { bardicInspirationDie, canUseClassAction, classActions, resolveClassAction } from "./actions";
import { passiveClassModifiers, unarmoredArmorClass } from "./passives";
import { SPECIES } from "./data/species";
import { classChoiceRequirements, expertiseKey, fightingStyleCantripsKey, fightingStyleKey, fightingStyleOptions } from "./classChoices";

const base = (over: Partial<Character> = {}): Character => ({
  version: 2,
  id: "test",
  ruleset: "2024",
  name: "T",
  speciesId: "human",
  backgroundId: "soldier",
  feats: [],
  classes: [{ classId: "fighter", level: 1 }],
  abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
  abilityOverrides: {},
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
    expect(hitDicePool(c)[0]).toEqual({ classId: "fighter", hitDie: 10, total: 4, used: 4 });
  });

  it("applies core statistics to every rostered class", () => {
    const c = buildCharacter({
      ...emptyDraft(),
      ruleset: "2024",
      name: "Mira",
      speciesId: "aasimar",
      backgroundId: "soldier",
      bgPlus2: "str",
      bgPlus1: "con",
      baseScores: { str: 15, dex: 13, con: 14, int: 8, wis: 10, cha: 12 },
      classes: [{ classId: "druid", level: 3, subclassId: "roster-circle-of-the-moon" }],
      classSkills: ["perception", "survival"],
    });

    expect(CLASS_IDS).toHaveLength(13);
    expect(CLASS_IDS.every((id) => CLASS_ROSTER[id])).toBe(true);
    expect(CLASS_IDS.every((id) => CLASS_PROFILES[id])).toBe(true);
    expect(rosterSubclassNames("druid")).toContain("Circle of the Moon");
    expect(c.currentHp).toBe(24);
    expect(maxHp(c)).toBe(24);
    expect(saveBonus(c, "wis")).toBe(2);
    expect(spellSaveDc(c)).toBe(10);
    expect(hitDicePool(c)).toEqual([{ classId: "druid", hitDie: 8, total: 3, used: 0 }]);
  });

  it("uses class passive features in skill checks, initiative, saves, and unarmored AC", () => {
    const bard = base({
      classes: [{ classId: "bard", level: 2 }],
      abilities: { ...base().abilities, dex: 16, str: 14 },
    });
    expect(skillBonus(bard, "athletics")).toBe(3);
    expect(initiative(bard)).toBe(4);

    const paladin = base({
      classes: [{ classId: "paladin", level: 6 }],
      abilities: { ...base().abilities, cha: 16 },
    });
    expect(saveBonus(paladin, "str")).toBe(3);
    expect(saveBonus(paladin, "wis")).toBe(6);

    const monk = base({
      classes: [{ classId: "monk", level: 1 }],
      abilities: { ...base().abilities, dex: 16, wis: 16 },
    });
    expect(unarmoredArmorClass(monk)).toEqual([13, 16]);
    expect(armorClass(monk)).toBe(16);
  });

  it("computes multiclass spell slots and separate pact magic pools", () => {
    const mixed = base({
      classes: [
        { classId: "wizard", level: 3 },
        { classId: "paladin", level: 3 },
      ],
    });
    expect(effectiveCasterLevel(mixed)).toBe(4);
    expect(spellSlotPools(mixed)).toMatchObject([
      { key: "spell-slot-1", total: 4 },
      { key: "spell-slot-2", total: 3 },
    ]);

    const warlock1 = base({ classes: [{ classId: "warlock", level: 1 }] });
    expect(spellSlotPools(warlock1)).toMatchObject([{ key: "pact-slots", level: 1, total: 1 }]);
    const warlock11 = base({ classes: [{ classId: "warlock", level: 11 }] });
    expect(spellSlotPools(warlock11)).toMatchObject([{ key: "pact-slots", level: 5, total: 3 }]);
  });

  it("applies a half-up Artificer caster level and only grants spellcasting at its class threshold", () => {
    expect(effectiveCasterLevel(base({ classes: [{ classId: "artificer", level: 1 }] }))).toBe(1);
    expect(spellSlotPools(base({ classes: [{ classId: "artificer", level: 1 }] }))).toMatchObject([
      { key: "spell-slot-1", total: 2 },
    ]);
    expect(spellSaveDc(base({ classes: [{ classId: "ranger", level: 1 }] }))).toBeNull();
  });

  it("calculates ability-based resource pools and rest recovery", () => {
    const bard = base({
      ruleset: "2024",
      classes: [{ classId: "bard", level: 5 }],
      abilities: { ...base().abilities, cha: 16 },
      resourcesUsed: { bardicInspiration: 2 },
    });
    expect(resourcePools(bard)).toMatchObject([{ id: "bardicInspiration", total: 3, used: 2 }]);
    expect(recoverResourceUses(bard, "short").bardicInspiration).toBe(0);

    const cleric = base({
      ruleset: "2024",
      classes: [{ classId: "cleric", level: 6 }],
      resourcesUsed: { channelDivinity: 2, "spell-slot-1": 2 },
    });
    expect(resourcePools(cleric)).toMatchObject([{ id: "channelDivinity", total: 3, used: 2 }]);
    expect(recoverResourceUses(cleric, "short")).toMatchObject({ channelDivinity: 1, "spell-slot-1": 2 });
    expect(recoverResourceUses(cleric, "long")).toMatchObject({ channelDivinity: 0, "spell-slot-1": 0 });
  });

  it("resolves class actions with player-entered rolls and resource costs", () => {
    const fighter = base({ classes: [{ classId: "fighter", level: 5 }], currentHp: 8 });
    const secondWind = classActions(fighter).find((action) => action.id === "fighter-second-wind")!;
    expect(canUseClassAction(fighter, secondWind)).toBe(true);
    expect(resolveClassAction(fighter, secondWind.id)).toBeNull();
    expect(resolveClassAction(fighter, secondWind.id, 9)).toMatchObject({
      resourcesUsed: { secondWind: 1 },
      healing: 9,
    });
    const spent = base({ classes: [{ classId: "fighter", level: 5 }], resourcesUsed: { secondWind: 3 } });
    expect(canUseClassAction(spent, secondWind)).toBe(false);

    expect([1, 5, 10, 15].map(bardicInspirationDie)).toEqual([6, 8, 10, 12]);
    const paladin = base({ classes: [{ classId: "paladin", level: 2 }], resourcesUsed: { layOnHands: 7 } });
    expect(resolveClassAction(paladin, "paladin-lay-on-hands", 3)).toMatchObject({
      resourcesUsed: { layOnHands: 10 },
      healing: 3,
    });
    expect(resolveClassAction(paladin, "paladin-lay-on-hands", 4)).toBeNull();
  });

  it("offers the Interception reaction prompt for a selected Fighting Style", () => {
    const fighter = base({ classChoices: { [fightingStyleKey("fighter")]: ["interception"] } });
    const interception = classActions(fighter).find((action) => action.id === "fighting-style-interception-fighter");
    expect(interception).toMatchObject({
      activation: "Reaction",
      rollFormula: "1d10 + proficiency bonus",
    });
    expect(resolveClassAction(fighter, interception!.id)).toEqual({ resourcesUsed: {} });
  });

  it("offers ruleset, level, and subclass appropriate Channel Divinity options", () => {
    const cleric2014 = base({
      ruleset: "2014",
      classes: [{ classId: "cleric", level: 2, subclassId: "roster-life-domain" }],
    });
    const action2014 = classActions(cleric2014).find(({ id }) => id === "cleric-channel-divinity")!;
    expect(action2014.choices?.map(({ id }) => id)).toEqual(["turn-undead", "preserve-life"]);
    expect(resolveClassAction(cleric2014, action2014.id)).toBeNull();
    expect(resolveClassAction(cleric2014, action2014.id, undefined, "not-an-option")).toBeNull();
    expect(resolveClassAction(cleric2014, action2014.id, undefined, "preserve-life")).toMatchObject({
      resourcesUsed: { channelDivinity: 1 },
    });
    const spentCleric = base({
      ruleset: "2014",
      classes: [{ classId: "cleric", level: 2, subclassId: "roster-life-domain" }],
      resourcesUsed: { channelDivinity: 1 },
    });
    expect(canUseClassAction(spentCleric, classActions(spentCleric).find(({ id }) => id === action2014.id)!)).toBe(false);
    expect(resolveClassAction(spentCleric, action2014.id, undefined, "preserve-life")).toBeNull();

    const knowledge = base({
      ruleset: "2014",
      classes: [{ classId: "cleric", level: 6, subclassId: "roster-knowledge-domain" }],
    });
    expect(classActions(knowledge).find(({ id }) => id === "cleric-channel-divinity")?.choices?.map(({ id }) => id)).toContain("read-thoughts");
    const war = base({
      ruleset: "2014",
      classes: [{ classId: "cleric", level: 6, subclassId: "roster-war-domain" }],
    });
    expect(classActions(war).find(({ id }) => id === "cleric-channel-divinity")?.choices?.map(({ id }) => id)).toContain("war-gods-blessing");

    const revisedLife = base({
      ruleset: "2024",
      classes: [{ classId: "cleric", level: 13, subclassId: "roster-life-domain" }],
    });
    const revisedOptions = classActions(revisedLife).find(({ id }) => id === "cleric-channel-divinity")?.choices ?? [];
    expect(revisedOptions.map(({ id }) => id)).toEqual(["divine-spark", "turn-undead", "preserve-life"]);
    expect(revisedOptions.find(({ id }) => id === "divine-spark")?.rollFormula).toBe("3d8 + Wisdom modifier");
    expect(revisedOptions.find(({ id }) => id === "preserve-life")?.instruction).toContain("Bloodied");
    const revisedTurn = revisedOptions.find(({ id }) => id === "turn-undead");
    expect(revisedTurn?.instruction).toContain("Sear Undead");
  });

  it("provides a Channel Divinity option for every rostered Cleric domain", () => {
    const domainIds = [
      "arcana", "death", "forge", "grave", "knowledge", "life", "light", "nature", "order",
      "peace", "tempest", "trickery", "twilight", "war", "ambition", "solidarity", "strength",
      "zeal", "fate",
    ];
    for (const domainId of domainIds) {
      const cleric = base({
        ruleset: "2014",
        classes: [{ classId: "cleric", level: 6, subclassId: `roster-${domainId}-domain` }],
      });
      const choices = classActions(cleric).find(({ id }) => id === "cleric-channel-divinity")?.choices ?? [];
      expect(choices.length, domainId).toBeGreaterThan(1);
    }
  });

  it("uses short- and long-rest recovery rules for resources and slot pools", () => {
    const warlock = base({
      classes: [{ classId: "warlock", level: 3 }],
      resourcesUsed: { "pact-slots": 2 },
    });
    expect(recoverResourceUses(warlock, "short")["pact-slots"]).toBe(0);

    const bard2014 = base({
      ruleset: "2014",
      classes: [{ classId: "bard", level: 4 }],
      resourcesUsed: { bardicInspiration: 3 },
    });
    expect(recoverResourceUses(bard2014, "short").bardicInspiration).toBe(3);
    const fontBard2014 = base({
      ruleset: "2014",
      classes: [{ classId: "bard", level: 5 }],
      resourcesUsed: { bardicInspiration: 3 },
    });
    expect(recoverResourceUses(fontBard2014, "short").bardicInspiration).toBe(0);

    const monk = base({
      classes: [{ classId: "monk", level: 4 }],
      resourcesUsed: { focusPoints: 4, "spell-slot-1": 1 },
    });
    expect(recoverResourceUses(monk, "short")).toMatchObject({ focusPoints: 0, "spell-slot-1": 1 });
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
    expect(passiveClassModifiers(base({ classes: [{ classId: "barbarian", level: 5 }] }))).toMatchObject({ speed: 10 });
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
    speciesId: "aasimar",
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

  it("requires and persists class choices and applies expertise to skill bonuses", () => {
    const d: Draft = {
      ...draft(),
      ruleset: "2014",
      speciesId: "human",
      classes: [{ classId: "rogue", level: 1 }],
      classSkills: ["acrobatics", "insight", "investigation", "stealth"],
      classChoices: { [expertiseKey("rogue")]: ["stealth", "athletics"] },
    };
    const c = buildCharacter(d);
    expect(c.expertise).toEqual(["stealth", "athletics"]);
    expect(skillBonus(c, "stealth")).toBe(6);
    expect(draftFromCharacter(c).classChoices).toEqual(d.classChoices);
  });

  it("validates fighting styles and cantrip selections", () => {
    const fighter = { ...draft(), classes: [{ classId: "fighter" as const, level: 1 }] };
    expect(stepIssues(fighter, "class")).toContain("Choose a valid Fighter Fighting Style.");

    const paladin: Draft = {
      ...draft(),
      ruleset: "2024",
      classes: [{ classId: "paladin", level: 2 }],
      classSkills: ["insight", "medicine"],
      classChoices: {
        [fightingStyleKey("paladin")]: ["blessed-warrior"],
        [fightingStyleCantripsKey("paladin")]: ["guidance", "sacred-flame"],
      },
    };
    const c = buildCharacter(paladin);
    expect(c.classChoices?.[fightingStyleKey("paladin")]).toEqual(["blessed-warrior"]);
    expect(c.classChoices?.[fightingStyleCantripsKey("paladin")]).toEqual(["guidance", "sacred-flame"]);
    expect(stepIssues({ ...paladin, classChoices: { ...paladin.classChoices, [fightingStyleCantripsKey("paladin")]: ["guidance"] } }, "class"))
      .toContain("Paladin's selected Fighting Style requires two different valid cantrips.");
  });

  it("uses class and ruleset specific style and expertise progression", () => {
    expect(fightingStyleOptions("fighter", "2014").map((option) => option.id)).toContain("unarmed-fighting");
    expect(fightingStyleOptions("ranger", "2014").map((option) => option.id)).toContain("druidic-warrior");
    expect(classChoiceRequirements("bard", "2014", 2).expertiseCount).toBe(0);
    expect(classChoiceRequirements("bard", "2014", 3).expertiseCount).toBe(2);
    expect(classChoiceRequirements("bard", "2014", 10).expertiseCount).toBe(4);
    expect(classChoiceRequirements("bard", "2024", 2).expertiseCount).toBe(2);
    expect(classChoiceRequirements("bard", "2024", 9).expertiseCount).toBe(4);
    expect(classChoiceRequirements("rogue", "2024", 6).expertiseCount).toBe(4);
    expect(classChoiceRequirements("ranger", "2024", 2).expertiseCount).toBe(1);
  });

  it("applies 2024 Ranger Canny proficiency and expertise", () => {
    const ranger = buildCharacter({
      ...draft(),
      classes: [{ classId: "ranger", level: 2 }],
      classSkills: ["perception", "stealth", "survival"],
      classChoices: {
        [fightingStyleKey("ranger")]: ["archery"],
        [expertiseKey("ranger")]: ["animalHandling"],
      },
    });
    expect(ranger.skillProficiencies).toContain("animalHandling");
    expect(ranger.expertise).toContain("animalHandling");
    expect(skillBonus(ranger, "animalHandling")).toBe(4);
    expect(draftFromCharacter(ranger).classChoices).toEqual(ranger.classChoices);
    const deLevelled = buildCharacter({
      ...draft(),
      classes: [{ classId: "ranger", level: 1 }],
      classSkills: ["perception", "stealth", "survival"],
      classChoices: {},
    }, ranger);
    expect(deLevelled.skillProficiencies).not.toContain("animalHandling");
    expect(deLevelled.expertise).not.toContain("animalHandling");
  });

  it("applies 2014 species bonuses and an optional feat", () => {
    const d: Draft = {
      ...draft(),
      ruleset: "2014",
      speciesId: "dwarf",
      speciesVariantId: "hill",
      optionalFeatId: "tough",
      baseScores: { str: 15, dex: 13, con: 14, int: 8, wis: 10, cha: 12 },
    };
    expect(finalAbilities(d).con).toBe(16);
    expect(buildCharacter(d).feats).toEqual(["tough"]);
  });

  it("applies and persists selected species ability, skill, feat, and resistance choices", () => {
    const halfElf: Draft = {
      ...draft(),
      ruleset: "2014",
      speciesId: "half-elf",
      speciesChoices: {
        "ability-bonuses": ["dex", "wis"],
        "skill-proficiencies": ["acrobatics", "stealth"],
      },
    };
    expect(finalAbilities(halfElf)).toMatchObject({ dex: 14, wis: 11, cha: 14 });
    const halfElfCharacter = buildCharacter(halfElf);
    expect(halfElfCharacter.skillProficiencies).toEqual(expect.arrayContaining(["acrobatics", "stealth"]));
    expect(draftFromCharacter(halfElfCharacter).speciesChoices).toEqual(halfElf.speciesChoices);

    const dragonborn = buildCharacter({
      ...draft(),
      speciesId: "dragonborn",
      speciesChoices: { "draconic-ancestry": ["black"] },
    });
    expect(activeEffects(dragonborn).resistances).toContain("Acid");

    const human = buildCharacter({
      ...draft(),
      speciesId: "human",
      speciesChoices: {
        "skill-proficiency": ["arcana"],
        "origin-feat": ["tough"],
      },
    });
    expect(human.skillProficiencies).toContain("arcana");
    expect(human.feats).toContain("tough");
  });

  it("includes the supplied species rosters without duplicate choices", () => {
    expect(SPECIES["2014"]).toHaveLength(83);
    expect(SPECIES["2024"]).toHaveLength(25);
    expect(SPECIES["2014"].every(({ mechanicsStatus }) => mechanicsStatus === "partial")).toBe(true);
    for (const species of Object.values(SPECIES)) {
      expect(new Set(species.map(({ id }) => id)).size).toBe(species.length);
    }
    expect(SPECIES["2014"].find(({ id }) => id === "genasi-air")).toMatchObject({ name: "Genasi (Air)", mechanicsStatus: "partial" });
    expect(SPECIES["2024"].find(({ id }) => id === "duskling")).toMatchObject({ name: "Duskling", mechanicsStatus: "partial" });
    expect(SPECIES["2024"].every(({ mechanicsStatus }) => mechanicsStatus === "partial")).toBe(true);
    expect(SPECIES["2014"].every(({ sourceUrl }) => sourceUrl?.startsWith("https://dnd5e.wikidot.com/lineage:"))).toBe(true);
    expect(SPECIES["2024"].every(({ sourceUrl }) => sourceUrl?.startsWith("https://dnd2024.wikidot.com/species:"))).toBe(true);
  });

  it("applies modeled species speed, ability bonuses, skill proficiency, and resistance", () => {
    const legacyDraft: Draft = {
      ...draft(),
      ruleset: "2014",
      speciesId: "dwarf",
      speciesVariantId: "hill",
      baseScores: { str: 15, dex: 13, con: 14, int: 8, wis: 10, cha: 12 },
    };
    const dwarf = buildCharacter(legacyDraft);
    expect(finalAbilities(legacyDraft).con).toBe(16);
    expect(speed(dwarf)).toBe(25);
    expect(activeEffects(dwarf).resistances).toContain("Poison");

    const elfDraft: Draft = { ...legacyDraft, speciesId: "elf", speciesVariantId: "high" };
    const elf = buildCharacter(elfDraft);
    expect(elf.skillProficiencies).toContain("perception");
    expect(skillBonus(elf, "perception")).toBe(2);

    const revisedDwarf = base({ speciesId: "dwarf", ruleset: "2024" });
    expect(speed(revisedDwarf)).toBe(30);
    expect(activeEffects(revisedDwarf).resistances).toContain("Poison");

    const dwarfHill = buildCharacter(legacyDraft);
    expect(dwarfHill.currentHp).toBe(maxHp(dwarfHill));

    const woodElf = base({
      ruleset: "2024",
      speciesId: "elf",
      creation: { ...emptyDraft(), ruleset: "2024", speciesId: "elf", speciesVariantId: "wood" },
    });
    expect(speed(woodElf)).toBe(35);
    const chthonicTiefling = base({
      ruleset: "2024",
      speciesId: "tiefling",
      creation: { ...emptyDraft(), ruleset: "2024", speciesId: "tiefling", speciesVariantId: "chthonic" },
    });
    expect(activeEffects(chthonicTiefling).resistances).toContain("Necrotic");
  });

  it("models the next 2014 exotic lineage batch and variant passives", () => {
    const getLegacySpecies = (id: string) => SPECIES["2014"].find((species) => species.id === id);
    expect(getLegacySpecies("aarakocra")).toMatchObject({ speed: 25, flySpeed: 50, asi: { dex: 2, wis: 1 }, mechanicsStatus: "partial" });
    expect(getLegacySpecies("deep-gnome")).toMatchObject({ darkvisionFt: 120, asi: { int: 2, dex: 1 } });
    expect(getLegacySpecies("duergar")).toMatchObject({ darkvisionFt: 120, resistances: ["poison"], asi: { con: 2, str: 1 } });
    expect(getLegacySpecies("fairy")).toMatchObject({ speed: 30, flySpeed: 30 });
    expect(getLegacySpecies("firbolg")).toMatchObject({ asi: { wis: 2, str: 1 } });
    expect(getLegacySpecies("eladrin")?.variants?.map(({ id }) => id)).toEqual(["autumn", "winter", "spring", "summer"]);
    expect(getLegacySpecies("yuan-ti")).toMatchObject({ darkvisionFt: 60, resistances: ["poison"], mechanicsStatus: "partial" });
    expect(getLegacySpecies("grung")).toMatchObject({ speed: 25, climbSpeed: 25 });
    expect(getLegacySpecies("grung")?.traits).toContain("Poison immunity and poisonous skin");
    expect(getLegacySpecies("shifter")?.variants).toHaveLength(4);

    const protector = base({
      ruleset: "2014",
      speciesId: "aasimar",
      creation: {
        ...emptyDraft(),
        ruleset: "2014",
        speciesId: "aasimar",
        speciesVariantId: "protector",
        baseScores: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
      },
    });
    expect(finalAbilities(protector.creation!)).toMatchObject({ cha: 12, wis: 11 });
    expect(activeEffects(protector).resistances).toEqual(expect.arrayContaining(["Necrotic", "Radiant"]));
  });

  it("applies modeled species initiative, natural armor, and granted skills", () => {
    const rabbit = base({
      ruleset: "2014",
      speciesId: "harengon",
      abilities: { ...base().abilities, dex: 14 },
    });
    expect(initiative(rabbit)).toBe(4);
    expect(skillBonus(rabbit, "perception")).toBe(2);

    const tortle = base({ ruleset: "2014", speciesId: "tortle", abilities: { ...base().abilities, dex: 18 } });
    expect(armorClass(tortle)).toBe(17);

    const locathah = buildCharacter({
      ...draft(),
      ruleset: "2014",
      speciesId: "locathah",
      scoreMethod: "manual",
      backgroundId: "soldier",
      bgPlus2: "str",
      bgPlus1: "con",
      baseScores: { str: 15, dex: 16, con: 14, int: 8, wis: 10, cha: 12 },
      classes: [{ classId: "fighter", level: 1 }],
      classChoices: { [fightingStyleKey("fighter")]: ["archery"] },
    });
    expect(armorClass(locathah)).toBe(15);
    expect(locathah.skillProficiencies).toContain("athletics");

    const warforged = base({ ruleset: "2024", speciesId: "warforged" });
    expect(armorClass(warforged)).toBe(11);
    expect(activeEffects(warforged).resistances).toContain("Poison");

    const loxodon = base({ ruleset: "2014", speciesId: "loxodon", abilities: { ...base().abilities, con: 16 } });
    expect(armorClass(loxodon)).toBe(15);
  });

  it("validates steps", () => {
    expect(stepIssues(emptyDraft(), "ruleset")).not.toEqual([]);
    expect(stepIssues({ ...draft(), ruleset: "2014", speciesId: "elf", speciesVariantId: null }, "species")).toContain("Choose a lineage or subspecies.");
    expect(stepIssues({ ...draft(), ruleset: "2014", speciesId: "half-elf", speciesChoices: {} }, "species")).toContain("Choose two different abilities for +1: choose 2.");
    expect(finalAbilities({ ...draft(), ruleset: "2014", speciesId: "dwarf", speciesVariantId: "mountain" })).toMatchObject({ con: 16, str: 17 });
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
    expect(multiclassIssues(scores, ["barbarian", "paladin"])).toEqual(["Paladin needs CHA 13+ to multiclass."]);
    expect(multiclassIssues({ ...scores, dex: 13 }, ["barbarian", "fighter"])).toEqual([]);
  });
});

describe("ability override", () => {
  it("replaces the base score in derived stats", () => {
    const c = base({ abilityOverrides: { con: 18 } });
    expect(abilityScore(c, "con")).toBe(18);
    expect(abilityScore(c, "str")).toBe(10);
    expect(saveBonus(c, "con")).toBe(abilityMod(18) + proficiencyBonus(1));
  });
});

describe("armor class and passives", () => {
  it("uses 10 + DEX unarmored, and the better Barbarian formula", () => {
    const plain = base({ abilities: { ...base().abilities, dex: 14, con: 16 } });
    const expectedDex = 10 + abilityMod(14);
    const hasBarb = plain.classes.some((k) => k.classId === "barbarian");
    expect(armorClass(plain)).toBe(hasBarb ? expectedDex + abilityMod(16) : expectedDex);
    const rogue = base({ classes: [{ classId: "rogue", level: 1 }], abilities: { ...base().abilities, dex: 14, con: 16 } });
    expect(armorClass(rogue)).toBe(12);
    const barb = base({ classes: [{ classId: "barbarian", level: 1 }], abilities: { ...base().abilities, dex: 14, con: 16 } });
    expect(armorClass(barb)).toBe(15);
  });

  it("adds proficiency to passive scores", () => {
    const c = base({ skillProficiencies: ["perception"], abilities: { ...base().abilities, wis: 14 } });
    expect(passiveScore(c, "perception")).toBe(10 + abilityMod(14) + proficiencyBonus(1));
    expect(passiveScore(c, "insight")).toBe(10 + abilityMod(14));
  });
});

describe("typed damage", () => {
  const raging = base({ classes: [{ classId: "barbarian", level: 3 }], rageActive: true });
  it("halves resisted types (rounded down) and leaves others", () => {
    expect(resolveDamage(raging, 9, "Slashing")).toBe(4);
    expect(resolveDamage(raging, 9, "Fire")).toBe(9);
  });
  it("applies no resistance when not raging", () => {
    expect(resolveDamage({ ...raging, rageActive: false }, 9, "Slashing")).toBe(9);
  });
});
