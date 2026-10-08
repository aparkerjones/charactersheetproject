"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  STANDARD_ARRAY,
  STEPS,
  abilityBonuses,
  allIssues,
  availableClassIds,
  backgroundSkills,
  buildCharacter,
  draftFromCharacter,
  draftSkillProficiencies,
  draftTotalLevel,
  emptyDraft,
  emptyScores,
  finalAbilities,
  multiclassIssues,
  stepIssues,
  type Draft,
} from "@/engine/creation";
import { BACKGROUNDS } from "@/engine/data/backgrounds";
import { CLASSES } from "@/engine/data/classes";
import { CLASS_PROFILES } from "@/engine/data/classProfiles";
import { className, rosterSubclassName, rosterSubclasses, rosterSubclassNames } from "@/engine/data/roster";
import { FEATS, featById } from "@/engine/data/feats";
import { SPECIES } from "@/engine/data/species";
import { classChoiceRequirements, expertiseKey, fightingStyleCantripsKey, fightingStyleKey } from "@/engine/classChoices";
import { ClassChoiceFields } from "./ClassChoiceFields";
import { useCharacter } from "@/engine/store";
import { ABILITIES, RULESETS, type Ability, type Character, type Skill, type SpeciesDefinition } from "@/engine/types";
import { ThemeToggle } from "./ThemeToggle";

const label = (s: string) => s.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());

export function CreationWizard({ editing }: { editing?: Character }) {
  const router = useRouter();
  const load = useCharacter((s) => s.load);
  const [d, setD] = useState<Draft>(() => (editing ? draftFromCharacter(editing) : emptyDraft()));
  const [step, setStep] = useState(0);
  const [showIssues, setShowIssues] = useState(false);

  const patch = (p: Partial<Draft>) => setD((prev) => ({ ...prev, ...p }));
  const current = STEPS[step].id;
  const issues = stepIssues(d, current);

  const next = () => {
    if (issues.length > 0) return setShowIssues(true);
    setShowIssues(false);
    setStep(step + 1);
  };
  const back = () => {
    setShowIssues(false);
    setStep(step - 1);
  };
  const finish = () => {
    if (allIssues(d).length > 0) return setShowIssues(true);
    load(buildCharacter(d, editing));
    if (!editing) {
      // Next keeps this page mounted after navigating away, so clear the finished draft.
      setD(emptyDraft());
      setStep(0);
      setShowIssues(false);
    }
    router.push("/");
  };

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{editing ? "Edit character" : "Create a character"}</h1>
        <div className="flex items-center gap-3"><ThemeToggle /><Link href="/" className="text-sm underline">
          Cancel
        </Link></div>
      </header>

      <ol className="flex flex-wrap gap-2 text-sm">
        {STEPS.map((s, i) => (
          <li key={s.id}>
            <button
              type="button"
              disabled={!editing}
              onClick={() => {
                setShowIssues(false);
                setStep(i);
              }}
              className={`rounded px-3 py-1 ${i === step ? "bg-accent text-accent-fg" : "border border-line text-muted"} ${editing ? "hover:border-accent" : ""}`}
            >
              {i + 1}. {s.label}
            </button>
          </li>
        ))}
      </ol>

      <section className="space-y-4">
        {current === "ruleset" && <RulesetStep d={d} setD={setD} locked={Boolean(editing)} />}
        {current === "species" && <SpeciesStep d={d} patch={patch} />}
        {current === "background" && <BackgroundStep d={d} patch={patch} />}
        {current === "abilities" && <AbilitiesStep d={d} patch={patch} />}
        {current === "class" && <ClassStep d={d} patch={patch} />}
        {current === "review" && <ReviewStep d={d} patch={patch} />}
      </section>

      {showIssues && issues.length > 0 && (
        <ul className="list-disc space-y-1 pl-5 text-danger">
          {issues.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
      )}

      <footer className="flex justify-between">
        <button onClick={back} disabled={step === 0} className="btn">
          Back
        </button>
        <div className="flex gap-2">
          {editing && current !== "review" && (
            <button onClick={finish} className="btn">
              Save changes
            </button>
          )}
          {current === "review" ? (
            <button onClick={finish} className="btn-primary">
              {editing ? "Save changes" : "Create character"}
            </button>
          ) : (
            <button onClick={next} className="btn-primary">
              Next
            </button>
          )}
        </div>
      </footer>
    </main>
  );
}

function RulesetStep({ d, setD, locked }: { d: Draft; setD: React.Dispatch<React.SetStateAction<Draft>>; locked: boolean }) {
  const choose = (ruleset: Draft["ruleset"]) => {
    if (locked || ruleset === d.ruleset) return;
    // Options differ between rulesets, so downstream choices restart.
    setD({ ...emptyDraft(), ruleset, name: d.name });
  };
  const blurb = {
    "2014": "Original 5e rules. Species (races) grant ability score bonuses; backgrounds grant skills and tools.",
    "2024": "Revised rules. Backgrounds grant ability bonuses and an Origin feat; species no longer change scores.",
  };
  return (
    <>
      <p className="text-muted">{locked ? "The ruleset can't be changed on an existing character." : "Which version of the rules should this character follow? Changing it later restarts your choices."}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {RULESETS.map((r) => (
          <button key={r} onClick={() => choose(r)} disabled={locked && d.ruleset !== r} className="option-card disabled:opacity-50" aria-pressed={d.ruleset === r}>
            <div className="text-lg font-semibold">{r} rules</div>
            <div className="text-sm text-muted">{blurb[r]}</div>
          </button>
        ))}
      </div>
    </>
  );
}

function SpeciesStep({ d, patch }: { d: Draft; patch: (p: Partial<Draft>) => void }) {
  if (!d.ruleset) return null;
  const ruleset = d.ruleset;
  const selectedSpecies = SPECIES[ruleset].find((species) => species.id === d.speciesId);
  const selectedVariant = selectedSpecies?.variants?.find((variant) => variant.id === d.speciesVariantId);
  const choices = [...(selectedSpecies?.choices ?? []), ...(selectedVariant?.choices ?? [])];
  const toggleChoice = (choiceId: string, optionId: string, selectionCount = 1) => {
    const current = d.speciesChoices[choiceId] ?? [];
    const selected = current.includes(optionId)
      ? current.filter((id) => id !== optionId)
      : selectionCount === 1
        ? [optionId]
        : current.length < selectionCount
          ? [...current, optionId]
          : current;
    patch({ speciesChoices: { ...d.speciesChoices, [choiceId]: selected } });
  };
  const renderSpecies = (species: SpeciesDefinition) => (
    <div key={species.id} className="flex h-full flex-col">
      <button onClick={() => patch({ speciesId: species.id, speciesVariantId: null, speciesChoices: {} })} className="option-card flex h-full w-full flex-1 flex-col" aria-pressed={d.speciesId === species.id}>
        <div className="flex items-start justify-between gap-2">
          <span className="font-semibold">{species.name}</span>
          {species.category && <span className="shrink-0 text-[10px] text-muted">{species.category}</span>}
        </div>
        {(species.speed !== undefined || species.asi || species.size || species.darkvisionFt || species.flySpeed || species.swimSpeed || species.climbSpeed || species.resistances?.length || species.skillProficiencies?.length) ? (
          <div className="text-xs text-muted">
            {species.speed !== undefined && `Speed ${species.speed} ft`}
            {species.flySpeed && ` · Fly ${species.flySpeed} ft`}
            {species.swimSpeed && ` · Swim ${species.swimSpeed} ft`}
            {species.climbSpeed && ` · Climb ${species.climbSpeed} ft`}
            {species.size && ` · ${species.size}`}
            {species.darkvisionFt && ` · Darkvision ${species.darkvisionFt} ft`}
            {species.resistances?.length && ` · Resistance: ${species.resistances.join(", ")}`}
            {species.skillProficiencies?.length && ` · Skill: ${species.skillProficiencies.map(label).join(", ")}`}
            {species.asi && ` · ${Object.entries(species.asi).map(([ability, value]) => `${ability.toUpperCase()} +${value}`).join(", ")}`}
          </div>
        ) : null}
        {species.traits?.length ? (
          <ul className="mt-1 list-disc pl-4 text-sm text-muted">
            {species.traits.map((trait) => (
              <li key={trait}>{trait}</li>
            ))}
          </ul>
        ) : species.mechanicsStatus === "roster-only" ? (
          <div className="mt-1 text-sm text-muted">Species mechanics are not implemented yet.</div>
        ) : null}
        {species.mechanicsStatus === "partial" && (
          <div className="mt-1 text-xs text-muted">Some selectable traits or actions may still need manual handling.</div>
        )}
      </button>
      {species.sourceUrl && (
        <a href={species.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 min-h-5 px-3 text-xs text-accent underline">
          Source page
        </a>
      )}
    </div>
  );
  return (
    <>
      <h2 className="text-lg font-semibold">{ruleset === "2014" ? "Race" : "Species"}</h2>
      <div className="grid auto-rows-fr gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SPECIES[ruleset].map(renderSpecies)}
      </div>
      {selectedSpecies?.variants && selectedSpecies.variants.length > 0 && (
        <section className="mt-6 space-y-2">
          <h3 className="font-semibold">Choose a {selectedSpecies.name} lineage or subspecies</h3>
          <div className="grid auto-rows-fr gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {selectedSpecies.variants.map((variant) => (
              <button
                key={variant.id}
                onClick={() => patch({ speciesVariantId: variant.id, speciesChoices: {} })}
                className="option-card flex h-full w-full flex-col"
                aria-pressed={d.speciesVariantId === variant.id}
              >
                <div className="font-semibold">{variant.name}</div>
                {variant.speed !== undefined && <div className="text-xs text-muted">Speed {variant.speed} ft</div>}
                {variant.darkvisionFt !== undefined && <div className="text-xs text-muted">Darkvision {variant.darkvisionFt} ft</div>}
                {variant.flySpeed !== undefined && <div className="text-xs text-muted">Fly {variant.flySpeed} ft</div>}
                {variant.swimSpeed !== undefined && <div className="text-xs text-muted">Swim {variant.swimSpeed} ft</div>}
                {variant.climbSpeed !== undefined && <div className="text-xs text-muted">Climb {variant.climbSpeed} ft</div>}
                {variant.asi && <div className="text-xs text-muted">{Object.entries(variant.asi).map(([ability, value]) => `${ability.toUpperCase()} +${value}`).join(", ")}</div>}
                {variant.traits && (
                  <ul className="mt-1 list-disc pl-4 text-sm text-muted">
                    {variant.traits.map((trait) => <li key={trait}>{trait}</li>)}
                  </ul>
                )}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted">Choosing a lineage applies modeled ability bonuses, speed, vision, resistances, and hit-point changes. Other listed features may require manual handling.</p>
        </section>
      )}
      {selectedSpecies && choices.length > 0 && (
        <section className="mt-6 space-y-3">
          <h3 className="font-semibold">Species choices</h3>
          {choices.map((choice) => {
            const selected = d.speciesChoices[choice.id] ?? [];
            const count = choice.selectionCount ?? 1;
            return (
              <fieldset key={choice.id} className="panel space-y-2 !p-3">
                <legend className="font-semibold">{choice.label}</legend>
                <div className="flex flex-wrap gap-2">
                  {choice.options.map((option) => {
                    const checked = selected.includes(option.id);
                    return (
                      <label key={option.id} className={`rounded-md border border-line px-2 py-1 text-sm ${checked ? "border-accent" : ""}`}>
                        <input
                          type={count === 1 ? "radio" : "checkbox"}
                          name={`species-choice-${choice.id}`}
                          checked={checked}
                          onChange={() => toggleChoice(choice.id, option.id, count)}
                        />{" "}
                        {option.label}
                        {option.description && <span className="ml-1 text-muted">({option.description})</span>}
                      </label>
                    );
                  })}
                </div>
                {count > 1 && <p className="text-xs text-muted">Choose {count}; selected {selected.length}/{count}.</p>}
              </fieldset>
            );
          })}
        </section>
      )}
    </>
  );
}

function BackgroundStep({ d, patch }: { d: Draft; patch: (p: Partial<Draft>) => void }) {
  if (!d.ruleset) return null;
  const bg = d.backgroundId ? BACKGROUNDS[d.ruleset].find((b) => b.id === d.backgroundId) : undefined;
  const opts = bg?.abilityOptions ?? [];
  return (
    <>
      <h2 className="text-lg font-semibold">Background</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {BACKGROUNDS[d.ruleset].map((b) => (
          <button
            key={b.id}
            onClick={() => patch({ backgroundId: b.id, bgPlus2: null, bgPlus1: null })}
            className="option-card" aria-pressed={d.backgroundId === b.id}
          >
            <div className="font-semibold">{b.name}</div>
            <div className="text-xs text-muted">Skills: {b.skills.map(label).join(", ")}</div>
            {b.featId && <div className="text-xs text-muted">Origin feat: {featById(b.featId)?.name}</div>}
            <div className="text-sm text-muted">{b.summary}</div>
          </button>
        ))}
      </div>

      {bg && d.ruleset === "2024" && (
        <div className="panel space-y-2 !p-3">
          <div className="font-semibold">Ability score bonuses</div>
          <div className="flex gap-4 text-sm">
            <label>
              <input type="radio" checked={d.bgBonus === "2-1"} onChange={() => patch({ bgBonus: "2-1" })} /> +2 and +1
            </label>
            <label>
              <input type="radio" checked={d.bgBonus === "1-1-1"} onChange={() => patch({ bgBonus: "1-1-1" })} /> +1 to all three
            </label>
          </div>
          {d.bgBonus === "2-1" ? (
            <div className="flex gap-4">
              <AbilitySelect label="+2" value={d.bgPlus2} options={opts} onChange={(v) => patch({ bgPlus2: v })} />
              <AbilitySelect label="+1" value={d.bgPlus1} options={opts} onChange={(v) => patch({ bgPlus1: v })} />
            </div>
          ) : (
            <div className="text-sm text-muted">{opts.map((a) => a.toUpperCase()).join(", ")} each get +1.</div>
          )}
        </div>
      )}

      {d.ruleset === "2014" && (
        <label className="block space-y-1">
          <span className="font-semibold">Starting feat (optional rule)</span>
          <select className="field block" value={d.optionalFeatId ?? ""} onChange={(e) => patch({ optionalFeatId: e.target.value || null })}>
            <option value="">None</option>
            {FEATS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
          {d.optionalFeatId && <span className="block text-sm text-muted">{featById(d.optionalFeatId)?.description}</span>}
        </label>
      )}
      {d.ruleset === "2024" && bg?.featId && (
        <p className="text-sm text-muted">
          <strong>{featById(bg.featId)?.name}:</strong> {featById(bg.featId)?.description}
        </p>
      )}
    </>
  );
}

function AbilitySelect({
  label: text,
  value,
  options,
  onChange,
}: {
  label: string;
  value: Ability | null;
  options: Ability[];
  onChange: (a: Ability | null) => void;
}) {
  return (
    <label className="flex items-center gap-2">
      <span className="font-semibold">{text}</span>
      <select className="field" value={value ?? ""} onChange={(e) => onChange((e.target.value || null) as Ability | null)}>
        <option value="">—</option>
        {options.map((a) => (
          <option key={a} value={a}>
            {a.toUpperCase()}
          </option>
        ))}
      </select>
    </label>
  );
}

function AbilitiesStep({ d, patch }: { d: Draft; patch: (p: Partial<Draft>) => void }) {
  const bonus = abilityBonuses(d);
  const final = finalAbilities(d);
  const setMethod = (scoreMethod: Draft["scoreMethod"]) =>
    patch({
      scoreMethod,
      baseScores: scoreMethod === "manual" ? { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 } : emptyScores(),
    });
  const usedValues = ABILITIES.map((a) => d.baseScores[a]);
  const setScore = (a: Ability, v: number) => patch({ baseScores: { ...d.baseScores, [a]: v } });

  return (
    <>
      <h2 className="text-lg font-semibold">Ability scores</h2>
      <div className="flex gap-4 text-sm">
        <label>
          <input type="radio" checked={d.scoreMethod === "standard"} onChange={() => setMethod("standard")} /> Standard array ({STANDARD_ARRAY.join(", ")})
        </label>
        <label>
          <input type="radio" checked={d.scoreMethod === "manual"} onChange={() => setMethod("manual")} /> Manual entry (rolled or point buy)
        </label>
      </div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {ABILITIES.map((a) => (
          <div key={a} className="rounded-lg border border-line bg-surface-2 p-3 text-center">
            <div className="text-xs font-semibold uppercase">{a}</div>
            {d.scoreMethod === "standard" ? (
              <select className="field" value={d.baseScores[a]} onChange={(e) => setScore(a, Number(e.target.value))}>
                <option value={0}>—</option>
                {STANDARD_ARRAY.map((v) => (
                  <option key={v} value={v} disabled={usedValues.includes(v) && d.baseScores[a] !== v}>
                    {v}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="number"
                min={1}
                max={20}
                className="field w-14 text-center"
                value={d.baseScores[a]}
                onChange={(e) => setScore(a, Math.min(20, Math.max(1, Number(e.target.value) || 1)))}
              />
            )}
            <div className="mt-1 text-xs text-muted">{bonus[a] ? `+${bonus[a]} bonus` : "\u00a0"}</div>
            <div className="text-lg font-bold">{final[a] || "—"}</div>
          </div>
        ))}
      </div>
    </>
  );
}

function ClassStep({ d, patch }: { d: Draft; patch: (p: Partial<Draft>) => void }) {
  if (!d.ruleset) return null;
  const ruleset = d.ruleset;
  const scores = finalAbilities(d);
  const total = draftTotalLevel(d);
  const available = availableClassIds(d);

  const setClasses = (classes: Draft["classes"], classSkills = d.classSkills) => {
    const classIds = new Set(classes.map((entry) => entry.classId));
    const classChoices = Object.fromEntries(Object.entries(d.classChoices ?? {}).filter(([key]) =>
      [...classIds].some((id) => key.endsWith(`:${id}`)),
    ));
    patch({ classes, classSkills, classChoices });
  };
  const update = (i: number, p: Partial<Draft["classes"][number]>) => {
    const classes = d.classes.map((k, j) => (j === i ? { ...k, ...p } : k));
    const entry = classes[i];
    const requirements = classChoiceRequirements(entry.classId, ruleset, entry.level);
    const classChoices = { ...d.classChoices };
    if (!requirements.fightingStyle) {
      delete classChoices[fightingStyleKey(entry.classId)];
      delete classChoices[fightingStyleCantripsKey(entry.classId)];
    }
    const expertiseChoiceKey = expertiseKey(entry.classId);
    if (classChoices[expertiseChoiceKey]?.length > requirements.expertiseCount) {
      classChoices[expertiseChoiceKey] = classChoices[expertiseChoiceKey].slice(0, requirements.expertiseCount);
    }
    patch({ classes, classChoices });
  };

  const primary = d.classes[0] && CLASS_PROFILES[d.classes[0].classId];
  const taken = backgroundSkills(d);
  const toggleSkill = (s: Skill) => {
    const has = d.classSkills.includes(s);
    if (!has && primary && d.classSkills.length >= primary.skillCount) return;
    patch({ classSkills: has ? d.classSkills.filter((x) => x !== s) : [...d.classSkills, s] });
  };

  return (
    <>
      <h2 className="text-lg font-semibold">Class</h2>
      {d.classes.length === 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {available.map((id) => (
            <button key={id} onClick={() => setClasses([{ classId: id, level: 1 }], [])} className="option-card" aria-pressed={false}>
              <div className="font-semibold">{className(id)}</div>
              <div className="text-xs text-muted">
                d{CLASS_PROFILES[id].hitDie} · saves {CLASS_PROFILES[id].saves.map((s) => s.toUpperCase()).join("/")}
              </div>
              {!CLASSES[id] && <div className="text-xs text-muted">Core statistics included · class features in progress</div>}
            </button>
          ))}
        </div>
      )}

      {d.classes.map((k, i) => {
        const def = CLASSES[k.classId];
        const subclassLevel = def?.subclassLevel[ruleset] ?? CLASS_PROFILES[k.classId].subclassLevel[ruleset];
        const needsSub = k.level >= subclassLevel;
        const implementedSubclasses = def?.subclasses[ruleset] ?? [];
        const rosterOptions = rosterSubclasses(k.classId).filter(
          (option) => !implementedSubclasses.some((subclass) => subclass.name === option.name),
        );
        return (
          <div key={k.classId} className="panel space-y-2 !p-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-semibold">
                {className(k.classId)}
                {i === 0 && <span className="ml-2 text-xs text-muted">(starting class)</span>}
              </span>
              <label className="text-sm">
                Level{" "}
                <input
                  type="number"
                  min={1}
                  max={20 - (total - k.level)}
                  className="field w-16"
                  value={k.level}
                  onChange={(e) => {
                    const level = Math.min(20 - (total - k.level), Math.max(1, Number(e.target.value) || 1));
                    const subclassId = level >= subclassLevel ? k.subclassId : undefined;
                    update(i, { level, subclassId });
                  }}
                />
              </label>
              <button
                className="ml-auto text-sm underline"
                onClick={() => setClasses(d.classes.filter((_, j) => j !== i), i === 0 ? [] : d.classSkills)}
              >
                Remove
              </button>
            </div>
            {needsSub ? (
              <label className="block text-sm">
                Subclass{" "}
                <select className="field" value={k.subclassId ?? ""} onChange={(e) => update(i, { subclassId: e.target.value || undefined })}>
                  <option value="">Choose…</option>
                  {implementedSubclasses.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                  {rosterOptions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} (mechanics pending)
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <div className="text-xs text-muted">Subclass unlocks at level {subclassLevel}.</div>
            )}
            {!def && (
              <div className="text-xs text-muted">
                Core statistics are applied. Class and subclass feature effects beyond those statistics are not implemented yet.
              </div>
            )}
            {!needsSub && !def ? (
              <details className="text-xs text-muted">
                <summary className="cursor-pointer">Subclass roster</summary>
                <p className="mt-1">{rosterSubclassNames(k.classId).join(", ") || "None listed"}</p>
              </details>
            ) : null}
            <ClassChoiceFields
              classId={k.classId}
              ruleset={ruleset}
              level={k.level}
              choices={d.classChoices ?? {}}
              proficiencies={draftSkillProficiencies(d)}
              onChange={(updates) => patch({ classChoices: { ...d.classChoices, ...updates } })}
            />
            <details className="text-xs text-muted">
              <summary className="cursor-pointer">Full subclass roster (reference only)</summary>
              <p className="mt-1">{rosterSubclassNames(k.classId).join(", ") || "None listed"}</p>
              <p>Mechanical effects for additional subclasses are being implemented.</p>
            </details>
          </div>
        );
      })}

      {primary && (
        <div className="panel space-y-2 !p-3">
          <div className="font-semibold">
            {primary.name} skills ({d.classSkills.length}/{primary.skillCount})
          </div>
          <div className="flex flex-wrap gap-2">
            {primary.skillOptions[ruleset].map((s) => {
              const fromBg = taken.includes(s);
              return (
                <label key={s} className={`rounded-md border border-line px-2 py-1 text-sm ${fromBg ? "opacity-40" : ""}`}>
                  <input
                    type="checkbox"
                    disabled={fromBg}
                    checked={d.classSkills.includes(s)}
                    onChange={() => toggleSkill(s)}
                  />{" "}
                  {label(s)}
                  {fromBg && " (background)"}
                </label>
              );
            })}
          </div>
        </div>
      )}
      {d.classes.length > 0 && !primary && (
        <p className="text-sm text-muted">No class skill proficiencies are applied until this class’s mechanics are implemented.</p>
      )}

      {d.classes.length > 0 && total < 20 && available.length > 0 && (
        <div className="space-y-1">
          <div className="text-sm font-semibold">Multiclass</div>
          <div className="flex flex-wrap gap-2">
            {available.map((id) => {
              const problems = multiclassIssues(scores, [...d.classes.map((k) => k.classId), id]);
              return (
                <button
                  key={id}
                  disabled={problems.length > 0}
                  title={problems.join(" ")}
                  onClick={() => setClasses([...d.classes, { classId: id, level: 1 }])}
                  className="btn"
                >
                  + {className(id)}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted">Multiclassing needs 13+ in the primary ability of your current and new classes. Hover a disabled class to see why.</p>
        </div>
      )}
    </>
  );
}

function ReviewStep({ d, patch }: { d: Draft; patch: (p: Partial<Draft>) => void }) {
  const issues = allIssues(d);
  if (!d.ruleset) return null;
  const species = SPECIES[d.ruleset].find((s) => s.id === d.speciesId);
  const speciesVariant = species?.variants?.find((variant) => variant.id === d.speciesVariantId);
  const speciesChoiceDefinitions = [...(species?.choices ?? []), ...(speciesVariant?.choices ?? [])];
  const selectedSpeciesOptions = speciesChoiceDefinitions.flatMap((choice) =>
    (d.speciesChoices[choice.id] ?? [])
      .map((id) => choice.options.find((option) => option.id === id))
      .filter((option) => option !== undefined),
  );
  const bg = BACKGROUNDS[d.ruleset].find((b) => b.id === d.backgroundId);
  const final = finalAbilities(d);
  return (
    <>
      <label className="block">
        <span className="text-xs uppercase text-muted">Name</span>
        <input
          className="block w-full border-b border-line bg-transparent text-2xl font-bold outline-none"
          value={d.name}
          onChange={(e) => patch({ name: e.target.value })}
          placeholder="Character name"
        />
      </label>
      <dl className="grid grid-cols-[8rem_1fr] gap-y-1 text-sm">
        <dt className="text-muted">Ruleset</dt>
        <dd>{d.ruleset}</dd>
        <dt className="text-muted">Species</dt>
        <dd>{[species?.name, speciesVariant?.name].filter(Boolean).join(" — ")}</dd>
        {selectedSpeciesOptions.length > 0 && (
          <>
            <dt className="text-muted">Species choices</dt>
            <dd>{selectedSpeciesOptions.map((option) => option.label).join(", ")}</dd>
          </>
        )}
        <dt className="text-muted">Background</dt>
        <dd>{bg?.name}</dd>
        <dt className="text-muted">Classes</dt>
        <dd>
          {d.classes
            .map((k) => {
              const def = CLASSES[k.classId];
              const sub = def?.subclasses[d.ruleset!].find((s) => s.id === k.subclassId);
              const subName = sub?.name ?? rosterSubclassName(k.classId, k.subclassId);
              return `${className(k.classId)} ${k.level}${subName ? ` (${subName})` : ""}`;
            })
            .join(" / ")}
        </dd>
        <dt className="text-muted">Abilities</dt>
        <dd>{ABILITIES.map((a) => `${a.toUpperCase()} ${final[a]}`).join(" · ")}</dd>
        <dt className="text-muted">Skills</dt>
        <dd>{[...new Set([...backgroundSkills(d), ...d.classSkills, ...selectedSpeciesOptions.flatMap((option) => option.skillProficiencies ?? [])])].map(label).join(", ")}</dd>
        {Object.values(d.classChoices ?? {}).some((values) => values.length > 0) && (
          <>
            <dt className="text-muted">Class choices</dt>
            <dd>
              {Object.entries(d.classChoices ?? {}).flatMap(([key, values]) =>
                values.map((value) => `${key.split(":")[0].replaceAll("-", " ")}: ${label(value)}`),
              ).join(", ")}
            </dd>
          </>
        )}
        <dt className="text-muted">Feats</dt>
        <dd>{[bg?.featId, d.ruleset === "2014" ? d.optionalFeatId : null, ...selectedSpeciesOptions.flatMap((option) => option.featId ? [option.featId] : [])].filter(Boolean).map((f) => featById(f!)?.name).join(", ") || "None"}</dd>
      </dl>
      {issues.length > 0 && <p className="text-danger">Some earlier steps are incomplete: {issues.join(" ")}</p>}
    </>
  );
}
