"use client";

import {
  cantripOptionsForStyle,
  classChoiceRequirements,
  expertiseKey,
  fightingStyleCantripsKey,
  fightingStyleKey,
  fightingStyleOptions,
  isCantripStyle,
  isSkillChoice,
} from "@/engine/classChoices";
import { SKILLS, type ClassId, type Ruleset, type Skill } from "@/engine/types";

const label = (value: string) => value.replace(/([A-Z])/g, " $1").replace(/^./, (letter) => letter.toUpperCase());

export function ClassChoiceFields({
  classId,
  ruleset,
  level,
  choices,
  proficiencies,
  onChange,
}: {
  classId: ClassId;
  ruleset: Ruleset;
  level: number;
  choices: Record<string, string[]>;
  proficiencies: Skill[];
  onChange: (updates: Record<string, string[]>) => void;
}) {
  const requirements = classChoiceRequirements(classId, ruleset, level);
  const styleKey = fightingStyleKey(classId);
  const cantripsKey = fightingStyleCantripsKey(classId);
  const styleId = choices[styleKey]?.[0] ?? "";
  const cantripChoices = choices[cantripsKey] ?? [];
  const expertiseChoiceKey = expertiseKey(classId);
  const expertiseChoices = choices[expertiseChoiceKey] ?? [];
  const otherExpertise = new Set(
    Object.entries(choices)
      .filter(([key]) => key.startsWith("expertise:") && key !== expertiseChoiceKey)
      .flatMap(([, values]) => values),
  );
  const canny = classId === "ranger" && ruleset === "2024" && requirements.expertiseCount === 1;
  const expertiseOptions = canny
    ? (Object.keys(SKILLS) as Skill[]).filter((skill) =>
        !proficiencies.includes(skill) || expertiseChoices.includes(skill),
      )
    : proficiencies.filter((skill) => isSkillChoice(skill));
  const filteredExpertiseOptions = expertiseOptions.filter((skill) =>
    !otherExpertise.has(skill) || expertiseChoices.includes(skill),
  );

  if (!requirements.fightingStyle && !requirements.expertiseCount) return null;

  return (
    <div className="space-y-3 rounded-md border border-line p-3">
      <div className="font-semibold">Class feature choices</div>
      {requirements.fightingStyle && (
        <label className="block space-y-1 text-sm">
          <span>Fighting Style</span>
          <select
            className="field block"
            value={styleId}
            onChange={(event) => {
              const next = event.target.value;
              onChange({
                [styleKey]: next ? [next] : [],
                ...(next !== styleId || !isCantripStyle(next) ? { [cantripsKey]: [] } : {}),
              });
            }}
          >
            <option value="">Choose…</option>
            {fightingStyleOptions(classId, ruleset).map((style) => (
              <option key={style.id} value={style.id}>{style.label}</option>
            ))}
          </select>
          {styleId && (
            <span className="block text-xs text-muted">
              {fightingStyleOptions(classId, ruleset).find((style) => style.id === styleId)?.description}
            </span>
          )}
        </label>
      )}
      {isCantripStyle(styleId) && (
        <fieldset className="space-y-1">
          <legend className="text-sm font-medium">
            Choose two {styleId === "blessed-warrior" ? "Cleric" : "Druid"} cantrips ({cantripChoices.length}/2)
          </legend>
          <div className="flex flex-wrap gap-2">
            {cantripOptionsForStyle(styleId, ruleset).map((cantrip) => (
              <label key={cantrip.id} className="rounded-md border border-line px-2 py-1 text-sm">
                <input
                  type="checkbox"
                  checked={cantripChoices.includes(cantrip.id)}
                  disabled={!cantripChoices.includes(cantrip.id) && cantripChoices.length >= 2}
                  onChange={() => {
                    const next = cantripChoices.includes(cantrip.id)
                      ? cantripChoices.filter((id) => id !== cantrip.id)
                      : [...cantripChoices, cantrip.id];
                    onChange({ [cantripsKey]: next });
                  }}
                />{" "}
                {cantrip.label}
              </label>
            ))}
          </div>
          <p className="text-xs text-muted">The selected cantrips are recorded on the sheet; spell casting is not implemented yet.</p>
        </fieldset>
      )}
      {requirements.expertiseCount > 0 && (
        <fieldset className="space-y-1">
          <legend className="text-sm font-medium">
            Expertise ({expertiseChoices.length}/{requirements.expertiseCount})
          </legend>
          {canny && <p className="text-xs text-muted">Canny also grants proficiency in the chosen skill.</p>}
          <div className="flex flex-wrap gap-2">
            {filteredExpertiseOptions.map((skill) => (
              <label key={skill} className="rounded-md border border-line px-2 py-1 text-sm">
                <input
                  type="checkbox"
                  checked={expertiseChoices.includes(skill)}
                  disabled={!expertiseChoices.includes(skill) && expertiseChoices.length >= requirements.expertiseCount}
                  onChange={() => {
                    const next = expertiseChoices.includes(skill)
                      ? expertiseChoices.filter((entry) => entry !== skill)
                      : [...expertiseChoices, skill];
                    onChange({ [expertiseChoiceKey]: next });
                  }}
                />{" "}
                {label(skill)}
              </label>
            ))}
          </div>
          {filteredExpertiseOptions.length === 0 && <p className="text-xs text-muted">No eligible skills are currently available.</p>}
        </fieldset>
      )}
    </div>
  );
}
