import { CharacterSchema, type Character } from "./types";

export function serializeCharacter(c: Character): string {
  return JSON.stringify(c, null, 2);
}

export function parseCharacter(text: string): Character {
  return CharacterSchema.parse(JSON.parse(text));
}

export function downloadCharacter(c: Character) {
  const blob = new Blob([serializeCharacter(c)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${c.name.trim() || "character"}.character.json`;
  a.click();
  URL.revokeObjectURL(url);
}
