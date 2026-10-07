"use client";

import { useState } from "react";
import { BACKGROUNDS } from "@/engine/data/backgrounds";
import { CLASSES } from "@/engine/data/classes";
import { totalLevel } from "@/engine/calc";
import { deleteSaved, listSaved } from "@/engine/storage";
import type { Character } from "@/engine/types";

export function SavedCharacters({
  currentId,
  onPick,
  onDeleteCurrent,
}: {
  currentId?: string;
  onPick: (c: Character) => void;
  onDeleteCurrent?: () => void;
}) {
  const [list, setList] = useState(listSaved);
  if (list.length === 0) return <p className="px-3 py-2 text-sm text-muted">No saved characters.</p>;
  return (
    <ul className="flex flex-col gap-1">
      {list.map((c) => {
        const bg = BACKGROUNDS[c.ruleset].find((b) => b.id === c.backgroundId)?.name;
        return (
          <li key={c.id} className="flex items-center gap-1">
            <button
              role="menuitem"
              disabled={c.id === currentId}
              onClick={() => onPick(c)}
              className="flex-1 rounded px-3 py-2 text-left text-sm hover:bg-line/40 disabled:bg-line/30"
            >
              <span className="font-semibold">{c.name || "Unnamed"}</span>
              <span className="block text-xs text-muted">
                {c.classes.map((k) => `${CLASSES[k.classId].name} ${k.level}`).join(" / ")} · Lv {totalLevel(c)} · {bg}
              </span>
            </button>
            <button
              aria-label={`Delete ${c.name || "character"}`}
              className="rounded px-2 py-1 text-muted hover:text-danger"
              onClick={() => {
                if (!confirm(`Delete ${c.name || "this character"}? This can't be undone.`)) return;
                deleteSaved(c.id);
                setList(listSaved());
                if (c.id === currentId) onDeleteCurrent?.();
              }}
            >
              ✕
            </button>
          </li>
        );
      })}
    </ul>
  );
}
