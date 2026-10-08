import { CLASSES } from "./data/classes";
import { CLASS_PROFILES } from "./data/classProfiles";
import { isSpellSlotResource } from "./spells";
import type { Character, ClassId, ClassResource } from "./types";

export interface ResourcePool extends ClassResource {
  classId: ClassId;
  level: number;
  used: number;
  total: number;
}

export function resourcePools(c: Character): ResourcePool[] {
  return c.classes.flatMap(({ classId, level }) => {
    const definitions = CLASSES[classId]?.resources ?? CLASS_PROFILES[classId].resources ?? [];
    return definitions
      .filter((resource) => level >= (resource.minLevel ?? 1))
      .map((resource) => {
        const total = resource.max(level, c.ruleset, c);
        return {
          ...resource,
          classId,
          level,
          total,
          used: Math.min(c.resourcesUsed[resource.id] ?? 0, total),
        };
      });
  });
}

export function recoverResourceUses(c: Character, kind: "short" | "long"): Record<string, number> {
  const used = { ...c.resourcesUsed };
  for (const resource of resourcePools(c)) {
    const recovery =
      kind === "long" ? Infinity : resource.shortRestRecovery(c.ruleset, resource.level, c);
    used[resource.id] = Math.max(0, (used[resource.id] ?? 0) - recovery);
  }
  if (kind === "long") {
    for (const id of Object.keys(used)) {
      if (isSpellSlotResource(id)) used[id] = 0;
    }
  } else if (c.classes.some((entry) => CLASS_PROFILES[entry.classId].spellcasting?.progression === "pact")) {
    used["pact-slots"] = 0;
  }
  return used;
}
