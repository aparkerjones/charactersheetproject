"use client";

import { useState } from "react";
import { abilityMod, abilityScore, saveBonus, skillBonus } from "@/engine/calc";
import { CLASS_PROFILES } from "@/engine/data/classProfiles";
import { useCharacter } from "@/engine/store";
import { SKILLS, type Ability, type Character, type Skill } from "@/engine/types";

const NAMES: Record<Ability, string> = {
  str: "Strength",
  dex: "Dexterity",
  con: "Constitution",
  int: "Intelligence",
  wis: "Wisdom",
  cha: "Charisma",
};

const signed = (n: number) => (n >= 0 ? `+${n}` : `${n}`);
const label = (s: string) => s.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());

export function AbilityDialog({ c, ability, onClose }: { c: Character; ability: Ability; onClose: () => void }) {
  const { setAbilityOverride } = useCharacter();
  const override = c.abilityOverrides[ability];
  const [draft, setDraft] = useState(String(override ?? ""));

  const score = abilityScore(c, ability);
  const proficient = CLASS_PROFILES[c.classes[0].classId].saves.includes(ability);
  const skills = (Object.keys(SKILLS) as Skill[]).filter((s) => SKILLS[s] === ability);

  const apply = (value: string) => {
    setDraft(value);
    const n = Number(value);
    if (value.trim() === "" || !Number.isFinite(n)) setAbilityOverride(ability, null);
    else setAbilityOverride(ability, n);
  };

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label={NAMES[ability]}>
      <div className="panel max-h-[90vh] w-full max-w-md space-y-4 overflow-y-auto">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold">{NAMES[ability]}</h2>
            <div className="text-sm text-muted">
              Score {score} · Modifier {signed(abilityMod(score))}
              {override !== undefined && " · overridden"}
            </div>
          </div>
          <button className="btn" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg border border-line bg-surface-2 p-3">
            <div className="label-caps">Base score</div>
            <div className="text-lg font-bold">{c.abilities[ability]}</div>
          </div>
          <div className="rounded-lg border border-line bg-surface-2 p-3">
            <div className="label-caps">Saving throw</div>
            <div className="text-lg font-bold">
              {signed(saveBonus(c, ability))}
              {proficient && <span className="ml-1 text-sm font-normal text-muted">proficient</span>}
            </div>
          </div>
        </div>

        {skills.length > 0 && (
          <div>
            <div className="label-caps mb-1">Skills</div>
            <ul className="divide-y divide-line text-sm">
              {skills.map((s) => (
                <li key={s} className="flex justify-between py-1">
                  <span>
                    {label(s)}
                    {c.expertise.includes(s) ? " (expertise)" : c.skillProficiencies.includes(s) ? " (proficient)" : ""}
                  </span>
                  <span className="tabular-nums">{signed(skillBonus(c, s))}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <label className="label-caps mb-1 block" htmlFor="ability-override">
            Override score
          </label>
          <div className="flex items-center gap-2">
            <input
              id="ability-override"
              type="number"
              min={1}
              max={30}
              placeholder={String(c.abilities[ability])}
              className="field w-24"
              value={draft}
              onChange={(e) => apply(e.target.value)}
            />
            <button className="btn" disabled={override === undefined} onClick={() => apply("")}>
              Reset to base
            </button>
          </div>
          <p className="mt-1 text-xs text-muted">Replaces the base score everywhere on the sheet. Leave empty to use the base score.</p>
        </div>
      </div>
    </div>
  );
}
