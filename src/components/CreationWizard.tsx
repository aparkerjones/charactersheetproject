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
import { FEATS, featById } from "@/engine/data/feats";
import { SPECIES } from "@/engine/data/species";
import { useCharacter } from "@/engine/store";
import { ABILITIES, RULESETS, type Ability, type Character, type Skill } from "@/engine/types";
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
  return (
    <>
      <h2 className="text-lg font-semibold">{d.ruleset === "2014" ? "Race" : "Species"}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {SPECIES[d.ruleset].map((s) => (
          <button key={s.id} onClick={() => patch({ speciesId: s.id })} className="option-card" aria-pressed={d.speciesId === s.id}>
            <div className="font-semibold">{s.name}</div>
            <div className="text-xs text-muted">
              Speed {s.speed} ft
              {s.asi && ` · ${Object.entries(s.asi).map(([a, v]) => `${a.toUpperCase()} +${v}`).join(", ")}`}
            </div>
            <ul className="mt-1 list-disc pl-4 text-sm text-muted">
              {s.traits.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </button>
        ))}
      </div>
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

  const setClasses = (classes: Draft["classes"], classSkills = d.classSkills) => patch({ classes, classSkills });
  const update = (i: number, p: Partial<Draft["classes"][number]>) =>
    setClasses(d.classes.map((k, j) => (j === i ? { ...k, ...p } : k)));

  const primary = d.classes[0] && CLASSES[d.classes[0].classId];
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
              <div className="font-semibold">{CLASSES[id].name}</div>
              <div className="text-xs text-muted">
                d{CLASSES[id].hitDie} · saves {CLASSES[id].saves.map((s) => s.toUpperCase()).join("/")}
              </div>
            </button>
          ))}
        </div>
      )}

      {d.classes.map((k, i) => {
        const def = CLASSES[k.classId];
        const needsSub = k.level >= def.subclassLevel[ruleset];
        return (
          <div key={k.classId} className="panel space-y-2 !p-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-semibold">
                {def.name}
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
                    update(i, { level, subclassId: level >= def.subclassLevel[ruleset] ? k.subclassId : undefined });
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
                  {def.subclasses[ruleset].map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <div className="text-xs text-muted">Subclass unlocks at level {def.subclassLevel[ruleset]}.</div>
            )}
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
                  + {CLASSES[id].name}
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
        <dd>{species?.name}</dd>
        <dt className="text-muted">Background</dt>
        <dd>{bg?.name}</dd>
        <dt className="text-muted">Classes</dt>
        <dd>
          {d.classes
            .map((k) => {
              const sub = CLASSES[k.classId].subclasses[d.ruleset!].find((s) => s.id === k.subclassId);
              return `${CLASSES[k.classId].name} ${k.level}${sub ? ` (${sub.name})` : ""}`;
            })
            .join(" / ")}
        </dd>
        <dt className="text-muted">Abilities</dt>
        <dd>{ABILITIES.map((a) => `${a.toUpperCase()} ${final[a]}`).join(" · ")}</dd>
        <dt className="text-muted">Skills</dt>
        <dd>{[...new Set([...backgroundSkills(d), ...d.classSkills])].map(label).join(", ")}</dd>
        <dt className="text-muted">Feats</dt>
        <dd>{[bg?.featId, d.ruleset === "2014" ? d.optionalFeatId : null].filter(Boolean).map((f) => featById(f!)?.name).join(", ") || "None"}</dd>
      </dl>
      {issues.length > 0 && <p className="text-danger">Some earlier steps are incomplete: {issues.join(" ")}</p>}
    </>
  );
}
