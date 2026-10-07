import { create } from "zustand";
import { maxHp } from "./calc";
import { CLASSES } from "./data/classes";
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
          currentHp: kind === "long" ? maxHp(c) : c.currentHp,
        };
      }),
  };
});
