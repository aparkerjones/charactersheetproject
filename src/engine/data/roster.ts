import rosterData from "../../content/roster.json";
import type { ClassId } from "../types";

type RosterSubclass = string | { name: string; group: string };

interface RosterClass {
  id: ClassId;
  name: string;
  subclasses: RosterSubclass[];
}

const rosterClasses = rosterData.classes as RosterClass[];

export const CLASS_ROSTER = Object.fromEntries(
  rosterClasses.map((entry) => [entry.id, entry]),
) as Record<ClassId, RosterClass>;

export const className = (id: ClassId) => CLASS_ROSTER[id].name;

const subclassEntry = (subclass: RosterSubclass) =>
  typeof subclass === "string" ? { name: subclass } : subclass;

const subclassId = (name: string) =>
  `roster-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;

export const rosterSubclasses = (id: ClassId) =>
  CLASS_ROSTER[id].subclasses.map((item) => {
    const entry = subclassEntry(item);
    return { id: subclassId(entry.name), ...entry };
  });

export const rosterSubclassName = (id: ClassId, selectedId?: string) =>
  rosterSubclasses(id).find((subclass) => subclass.id === selectedId)?.name;

export const rosterSubclassNames = (id: ClassId) => rosterSubclasses(id).map((subclass) => subclass.name);
