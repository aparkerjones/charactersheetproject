import { describe, expect, it } from "vitest";
import { abilityMod, maxHp, newCharacter, proficiencyBonus, saveBonus, skillBonus, spellSaveDc } from "./calc";

describe("calc", () => {
  it("computes modifiers and proficiency", () => {
    expect(abilityMod(8)).toBe(-1);
    expect(abilityMod(15)).toBe(2);
    expect(proficiencyBonus(1)).toBe(2);
    expect(proficiencyBonus(5)).toBe(3);
    expect(proficiencyBonus(17)).toBe(6);
  });

  it("computes hp, saves and skills", () => {
    const c = newCharacter("fighter");
    c.abilities.con = 14;
    c.abilities.str = 16;
    c.level = 3;
    c.skillProficiencies = ["athletics"];
    expect(maxHp(c)).toBe(10 + 2 + 2 * (6 + 2));
    expect(saveBonus(c, "str")).toBe(3 + 2);
    expect(saveBonus(c, "dex")).toBe(0);
    expect(skillBonus(c, "athletics")).toBe(5);
  });

  it("handles expertise and spell DC", () => {
    const w = newCharacter("wizard");
    w.abilities.int = 16;
    expect(spellSaveDc(w)).toBe(8 + 2 + 3);
    expect(spellSaveDc(newCharacter("rogue"))).toBeNull();
    const r = newCharacter("rogue");
    r.abilities.dex = 14;
    r.skillProficiencies = ["stealth"];
    r.expertise = ["stealth"];
    expect(skillBonus(r, "stealth")).toBe(2 + 4);
  });
});
