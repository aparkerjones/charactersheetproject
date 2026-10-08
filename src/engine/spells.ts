import { CLASS_PROFILES } from "./data/classProfiles";
import type { Character, ClassId } from "./types";

const FULL_CASTER_SLOTS = [
  [],
  [2],
  [3],
  [4, 2],
  [4, 3],
  [4, 3, 2],
  [4, 3, 3],
  [4, 3, 3, 1],
  [4, 3, 3, 2],
  [4, 3, 3, 3, 1],
  [4, 3, 3, 3, 2],
  [4, 3, 3, 3, 2, 1],
  [4, 3, 3, 3, 2, 1],
  [4, 3, 3, 3, 2, 1, 1],
  [4, 3, 3, 3, 2, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 2, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 2, 1, 1],
] as const;

export interface SpellSlotPool {
  key: string;
  level: number;
  total: number;
  used: number;
  kind: "spell" | "pact";
  label: string;
}

export function effectiveCasterLevel(c: Character): number {
  return c.classes.reduce((sum, entry) => {
    const spellcasting = CLASS_PROFILES[entry.classId].spellcasting;
    if (entry.level < (spellcasting?.minLevel ?? 1)) return sum;
    const progression = spellcasting?.progression;
    if (progression === "full") return sum + entry.level;
    if (progression === "halfUp") return sum + Math.ceil(entry.level / 2);
    if (progression === "halfDown") return sum + Math.floor(entry.level / 2);
    return sum;
  }, 0);
}

export function spellSlotPools(c: Character): SpellSlotPool[] {
  const casterLevel = Math.min(20, effectiveCasterLevel(c));
  const standard = FULL_CASTER_SLOTS[casterLevel] ?? [];
  const pools: SpellSlotPool[] = standard.flatMap((total, index) =>
    total > 0
      ? [{
          key: `spell-slot-${index + 1}`,
          level: index + 1,
          total,
          used: Math.min(c.resourcesUsed[`spell-slot-${index + 1}`] ?? 0, total),
          kind: "spell" as const,
          label: "Spell slots",
        }]
      : [],
  );

  const warlockLevel = c.classes
    .filter((entry) => {
      const spellcasting = CLASS_PROFILES[entry.classId].spellcasting;
      return spellcasting?.progression === "pact" && entry.level >= (spellcasting.minLevel ?? 1);
    })
    .reduce((sum, entry) => sum + entry.level, 0);
  if (warlockLevel > 0) {
    const slotLevel = Math.min(5, Math.ceil(warlockLevel / 2));
    const slotCount = warlockLevel >= 17 ? 4 : warlockLevel >= 11 ? 3 : warlockLevel >= 2 ? 2 : 1;
    pools.push({
      key: "pact-slots",
      level: slotLevel,
      total: slotCount,
      used: Math.min(c.resourcesUsed["pact-slots"] ?? 0, slotCount),
      kind: "pact",
      label: "Pact slots",
    });
  }
  return pools;
}

export const isSpellSlotResource = (key: string) => key.startsWith("spell-slot-") || key === "pact-slots";

export const classSpellcastingAbility = (classId: ClassId) => CLASS_PROFILES[classId].spellcasting?.ability;
