import { create } from "zustand";
import { maxHp, newCharacter } from "./calc";
import type { Ability, Character, ClassId } from "./types";

interface State {
  character: Character | null;
  start: (classId: ClassId) => void;
  load: (c: Character) => void;
  update: (patch: Partial<Character>) => void;
  setAbility: (a: Ability, score: number) => void;
  toggleSkill: (skill: string, kind: "skillProficiencies" | "expertise") => void;
  setResourceUsed: (id: string, used: number) => void;
}

export const useCharacter = create<State>((set, get) => ({
  character: null,
  start: (classId) => {
    const c = newCharacter(classId);
    set({ character: { ...c, currentHp: maxHp(c) } });
  },
  load: (character) => set({ character }),
  update: (patch) => {
    const c = get().character;
    if (c) set({ character: { ...c, ...patch } });
  },
  setAbility: (a, score) => {
    const c = get().character;
    if (c) set({ character: { ...c, abilities: { ...c.abilities, [a]: score } } });
  },
  toggleSkill: (skill, kind) => {
    const c = get().character;
    if (!c) return;
    const list = c[kind];
    set({
      character: {
        ...c,
        [kind]: list.includes(skill) ? list.filter((s) => s !== skill) : [...list, skill],
      },
    });
  },
  setResourceUsed: (id, used) => {
    const c = get().character;
    if (c) set({ character: { ...c, resourcesUsed: { ...c.resourcesUsed, [id]: used } } });
  },
}));
