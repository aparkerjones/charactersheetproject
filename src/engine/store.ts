import { create } from "zustand";
import { maxHp } from "./calc";
import { CLASSES } from "./data/classes";
import { applyDamage, applyHealing, grantTempHp, recoverHitDice } from "./hp";
import { canStartRage } from "./rage";
import type { Ability, Character } from "./types";

interface State {
  character: Character | null;
  load: (c: Character) => void;
  update: (patch: Partial<Character>) => void;
  setAbility: (a: Ability, score: number) => void;
  toggleSkill: (skill: string, kind: "skillProficiencies" | "expertise") => void;
  setResourceUsed: (id: string, used: number) => void;
  setClassLevel: (classId: string, level: number) => void;
  setSubclass: (classId: string, subclassId: string) => void;
  toggleRage: () => void;
  rest: (kind: "short" | "long") => void;
  damage: (amount: number, halve?: boolean) => void;
  heal: (amount: number) => void;
  setTempHp: (amount: number) => void;
  setDeathSaves: (kind: "successes" | "failures", count: number) => void;
  spendHitDie: (classId: string, healed: number) => void;
}

export const useCharacter = create<State>((set, get) => {
  const patch = (fn: (c: Character) => Partial<Character> | null) => {
    const c = get().character;
    const p = c && fn(c);
    if (c && p) set({ character: { ...c, ...p } });
  };

  return {
    character: null,
    load: (character) => set({ character }),
    update: (p) => patch(() => p),
    setAbility: (a, score) => patch((c) => ({ abilities: { ...c.abilities, [a]: score } })),
    toggleSkill: (skill, kind) =>
      patch((c) => ({
        [kind]: c[kind].includes(skill) ? c[kind].filter((s) => s !== skill) : [...c[kind], skill],
      })),
    setResourceUsed: (id, used) => patch((c) => ({ resourcesUsed: { ...c.resourcesUsed, [id]: used } })),
    setClassLevel: (classId, level) =>
      patch((c) => {
        const others = c.classes.filter((k) => k.classId !== classId).reduce((n, k) => n + k.level, 0);
        const next = Math.min(20 - others, Math.max(1, level));
        return { classes: c.classes.map((k) => (k.classId === classId ? { ...k, level: next } : k)) };
      }),
    setSubclass: (classId, subclassId) =>
      patch((c) => ({ classes: c.classes.map((k) => (k.classId === classId ? { ...k, subclassId } : k)) })),
    toggleRage: () =>
      patch((c) => {
        if (c.rageActive) return { rageActive: false };
        if (!canStartRage(c)) return null;
        return { rageActive: true, resourcesUsed: { ...c.resourcesUsed, rage: (c.resourcesUsed.rage ?? 0) + 1 } };
      }),
    rest: (kind) =>
      patch((c) => {
        const used = { ...c.resourcesUsed };
        for (const k of c.classes) {
          for (const r of CLASSES[k.classId].resources) {
            const recovery = kind === "long" ? Infinity : r.shortRestRecovery(c.ruleset);
            used[r.id] = Math.max(0, (used[r.id] ?? 0) - recovery);
          }
        }
        return {
          resourcesUsed: used,
          rageActive: false,
          ...(kind === "long"
            ? {
                currentHp: maxHp(c),
                tempHp: 0,
                deathSaves: { successes: 0, failures: 0 },
                hitDiceUsed: recoverHitDice(c, (id) => CLASSES[id].hitDie),
              }
            : {}),
        };
      }),
    damage: (amount, halve) => patch((c) => applyDamage(c, amount, halve)),
    heal: (amount) => patch((c) => applyHealing(c, amount)),
    setTempHp: (amount) => patch((c) => ({ tempHp: grantTempHp(c, amount) })),
    setDeathSaves: (kind, count) =>
      patch((c) => ({ deathSaves: { ...c.deathSaves, [kind]: Math.min(3, Math.max(0, count)) } })),
    // The player rolls the die themselves and enters the total healed.
    spendHitDie: (classId, healed) =>
      patch((c) => {
        const level = c.classes.find((k) => k.classId === classId)?.level ?? 0;
        const used = c.hitDiceUsed[classId] ?? 0;
        if (used >= level) return null;
        return { ...applyHealing(c, healed), hitDiceUsed: { ...c.hitDiceUsed, [classId]: used + 1 } };
      }),
  };
});
