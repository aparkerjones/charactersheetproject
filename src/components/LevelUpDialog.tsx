"use client";

import Link from "next/link";
import { useState } from "react";
import { abilityScore, totalLevel } from "@/engine/calc";
import { multiclassIssues } from "@/engine/creation";
import { CLASSES } from "@/engine/data/classes";
import { CLASS_PROFILES } from "@/engine/data/classProfiles";
import { className, rosterSubclasses } from "@/engine/data/roster";
import {
  classChoiceRequirements,
  expertiseKey,
  fightingStyleCantripsKey,
  fightingStyleKey,
  fightingStyleOptions,
  isCantripStyle,
} from "@/engine/classChoices";
import { useCharacter } from "@/engine/store";
import { ABILITIES, CLASS_IDS, SKILLS, type Ability, type Character, type ClassId, type Skill } from "@/engine/types";
import { ClassChoiceFields } from "./ClassChoiceFields";

export function LevelUpDialog({ c, onClose }: { c: Character; onClose: () => void }) {
  const { levelUp, setSubclass, update } = useCharacter();
  const [override, setOverride] = useState(false);
  const [picked, setPicked] = useState<ClassId | null>(null);
  const [subclass, setSub] = useState("");
  const [classChoices, setClassChoices] = useState<Record<string, string[]>>(() => c.classChoices ?? {});

  const atCap = totalLevel(c) >= 20;
  const effectiveScores = Object.fromEntries(ABILITIES.map((a) => [a, abilityScore(c, a)])) as Record<Ability, number>;
  const currentIds = c.classes.map((k) => k.classId as ClassId);

  const options = CLASS_IDS.map((id) => {
    const existing = c.classes.find((k) => k.classId === id);
    const issues = existing ? [] : multiclassIssues(effectiveScores, [...currentIds, id]);
    return { id, existing, issues, allowed: !atCap && (override || issues.length === 0) };
  });

  const choice = options.find((o) => o.id === picked);
  const def = picked ? { ...CLASS_PROFILES[picked], ...CLASSES[picked] } : undefined;
  const subclassOptions = picked
    ? [
        ...(def?.subclasses?.[c.ruleset] ?? []),
        ...rosterSubclasses(picked).filter(
          (subclass) => !(def?.subclasses?.[c.ruleset] ?? []).some((implemented) => implemented.name === subclass.name),
        ),
      ]
    : [];
  const newLevel = (choice?.existing?.level ?? 0) + 1;
  const needsSubclass = def && newLevel >= def.subclassLevel[c.ruleset] && !choice?.existing?.subclassId;
  const requirements = picked ? classChoiceRequirements(picked, c.ruleset, newLevel) : null;
  const styleKey = picked ? fightingStyleKey(picked) : "";
  const selectedStyle = classChoices[styleKey]?.[0] ?? "";
  const cantripKey = picked ? fightingStyleCantripsKey(picked) : "";
  const expertiseChoiceKey = picked ? expertiseKey(picked) : "";
  const needsStyle = Boolean(requirements?.fightingStyle &&
    !fightingStyleOptions(picked!, c.ruleset).some((style) => style.id === selectedStyle));
  const needsCantrips = Boolean(isCantripStyle(selectedStyle) && (classChoices[cantripKey]?.length ?? 0) !== 2);
  const needsExpertise = Boolean(requirements && (classChoices[expertiseChoiceKey]?.length ?? 0) !== requirements.expertiseCount);
  const cannySkill = picked === "ranger" && c.ruleset === "2024" && requirements?.expertiseCount === 1
    ? classChoices[expertiseChoiceKey]?.[0]
    : undefined;
  const savedCannySkill = c.classChoices?.[expertiseKey("ranger")]?.[0];
  const invalidCanny = Boolean(cannySkill && c.skillProficiencies.includes(cannySkill) && cannySkill !== savedCannySkill);
  const classChoicesValid = !needsStyle && !needsCantrips && !needsExpertise && !invalidCanny;

  const confirm = () => {
    if (!picked || !choice?.allowed || !classChoicesValid) return;
    const previousClassChoices = c.classChoices ?? {};
    const previouslySelectedExpertise = Object.values(previousClassChoices).flat();
    const manualExpertise = c.expertise.filter((skill) => !previouslySelectedExpertise.includes(skill));
    const selectedExpertise = Object.entries(classChoices)
      .filter(([key]) => key.startsWith("expertise:"))
      .flatMap(([, skills]) => skills);
    levelUp(picked);
    if (needsSubclass && subclass) setSubclass(picked, subclass);
    update({
      classChoices,
      expertise: [...new Set([...manualExpertise, ...selectedExpertise])],
      ...(cannySkill ? { skillProficiencies: [...new Set([...c.skillProficiencies, cannySkill])] } : {}),
      ...(c.creation ? { creation: { ...c.creation, classChoices } } : {}),
    });
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
                {className(id)}
                <span className="ml-2 text-sm font-normal text-muted">
                  {existing ? `Level ${existing.level} → ${existing.level + 1}` : "New class (level 1)"}
                </span>
              </div>
              {!CLASSES[id] && <div className="text-xs text-muted">Additional class and subclass features are pending implementation.</div>}
              {!allowed && issues.length > 0 && <div className="text-xs text-danger">{issues.join(" ")}</div>}
              {allowed && issues.length > 0 && <div className="text-xs text-muted">Requirement overridden: {issues.join(" ")}</div>}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={override} onChange={(e) => setOverride(e.target.checked)} />
          Override multiclass requirements
        </label>

        {needsSubclass && (
          <label className="flex items-center gap-2 text-sm">
            Subclass
            <select className="field" value={subclass} onChange={(e) => setSub(e.target.value)}>
              <option value="">Choose later…</option>
              {subclassOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {"summary" in s ? s.name : `${s.name} (mechanics pending)`}
                </option>
              ))}
            </select>
          </label>
        )}

        {picked && requirements && (
          <ClassChoiceFields
            classId={picked}
            ruleset={c.ruleset}
            level={newLevel}
            choices={classChoices}
            proficiencies={c.skillProficiencies.filter((skill): skill is Skill => Object.hasOwn(SKILLS, skill))}
            onChange={(updates) => setClassChoices((previous) => ({ ...previous, ...updates }))}
          />
        )}

        <Link href="/create?edit=1" className="btn block text-center">
          Edit character options (species, background, classes…)
        </Link>

        <div className="flex justify-end gap-2">
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary disabled:opacity-50" disabled={!choice?.allowed || !classChoicesValid} onClick={confirm}>
            Level up
          </button>
        </div>
      </div>
    </div>
  );
}
