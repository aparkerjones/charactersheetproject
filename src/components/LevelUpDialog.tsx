"use client";

import { useState } from "react";
import { totalLevel } from "@/engine/calc";
import { multiclassIssues } from "@/engine/creation";
import { CLASSES } from "@/engine/data/classes";
import { useCharacter } from "@/engine/store";
import type { Character, ClassId } from "@/engine/types";

export function LevelUpDialog({ c, onClose }: { c: Character; onClose: () => void }) {
  const { levelUp, setSubclass } = useCharacter();
  const [override, setOverride] = useState(false);
  const [picked, setPicked] = useState<ClassId | null>(null);
  const [subclass, setSub] = useState("");

  const atCap = totalLevel(c) >= 20;
  const currentIds = c.classes.map((k) => k.classId as ClassId);

  const options = (Object.keys(CLASSES) as ClassId[]).map((id) => {
    const existing = c.classes.find((k) => k.classId === id);
    const issues = existing ? [] : multiclassIssues(c.abilities, [...currentIds, id]);
    return { id, existing, issues, allowed: !atCap && (override || issues.length === 0) };
  });

  const choice = options.find((o) => o.id === picked);
  const def = picked ? CLASSES[picked] : null;
  const newLevel = (choice?.existing?.level ?? 0) + 1;
  const needsSubclass = def && newLevel >= def.subclassLevel[c.ruleset] && !choice?.existing?.subclassId;

  const confirm = () => {
    if (!picked || !choice?.allowed) return;
    levelUp(picked);
    if (needsSubclass && subclass) setSubclass(picked, subclass);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="Level up">
      <div className="panel max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Level up</h2>
          <span className="text-sm text-muted">Level {totalLevel(c)} → {Math.min(20, totalLevel(c) + 1)}</span>
        </div>

        {atCap && <p className="text-danger">This character is already level 20.</p>}

        <div className="grid gap-2">
          {options.map(({ id, existing, issues, allowed }) => (
            <button
              key={id}
              type="button"
              disabled={!allowed}
              aria-pressed={picked === id}
              onClick={() => {
                setPicked(id);
                setSub("");
              }}
              className="option-card disabled:cursor-not-allowed disabled:opacity-50"
            >
              <div className="font-semibold">
                {CLASSES[id].name}
                <span className="ml-2 text-sm font-normal text-muted">
                  {existing ? `Level ${existing.level} → ${existing.level + 1}` : "New class (level 1)"}
                </span>
              </div>
              {!allowed && issues.length > 0 && <div className="text-xs text-danger">{issues.join(" ")}</div>}
              {allowed && issues.length > 0 && <div className="text-xs text-muted">Requirement overridden: {issues.join(" ")}</div>}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={override} onChange={(e) => setOverride(e.target.checked)} />
          Override multiclass requirements
        </label>

        {def && needsSubclass && (
          <label className="flex items-center gap-2 text-sm">
            Subclass
            <select className="field" value={subclass} onChange={(e) => setSub(e.target.value)}>
              <option value="">Choose later…</option>
              {def.subclasses[c.ruleset].map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="flex justify-end gap-2">
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary disabled:opacity-50" disabled={!choice?.allowed} onClick={confirm}>
            Level up
          </button>
        </div>
      </div>
    </div>
  );
}
