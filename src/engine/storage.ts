import { parseCharacter, serializeCharacter } from "./file";
import type { Character } from "./types";

const PREFIX = "dnd-char:";
const ACTIVE_KEY = "dnd-active";
const LEGACY_KEY = "dnd-character";

export interface SavedSummary {
  id: string;
  name: string;
  detail: string;
}

const safe = <T,>(fn: () => T, fallback: T): T => {
  try {
    return fn();
  } catch {
    return fallback;
  }
};

export function saveCharacter(c: Character) {
  safe(() => {
    localStorage.setItem(PREFIX + c.id, serializeCharacter(c));
    localStorage.setItem(ACTIVE_KEY, c.id);
  }, undefined);
}

export function deleteSaved(id: string) {
  safe(() => {
    localStorage.removeItem(PREFIX + id);
    if (localStorage.getItem(ACTIVE_KEY) === id) localStorage.removeItem(ACTIVE_KEY);
  }, undefined);
}

export function readSaved(id: string): Character | null {
  return safe(() => {
    const raw = localStorage.getItem(PREFIX + id);
    return raw ? parseCharacter(raw) : null;
  }, null);
}

export function listSaved(): Character[] {
  return safe(() => {
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const c = parseCharacter(legacy);
      localStorage.setItem(PREFIX + c.id, serializeCharacter(c));
      localStorage.setItem(ACTIVE_KEY, c.id);
      localStorage.removeItem(LEGACY_KEY);
    }
    const out: Character[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(PREFIX)) continue;
      const c = readSaved(key.slice(PREFIX.length));
      if (c) out.push(c);
    }
    return out.sort((a, b) => a.name.localeCompare(b.name));
  }, []);
}

export function loadActiveCharacter(): Character | null {
  return safe(() => {
    listSaved(); // migrates any pre-multi-character save
    const id = localStorage.getItem(ACTIVE_KEY);
    return id ? readSaved(id) : null;
  }, null);
}
