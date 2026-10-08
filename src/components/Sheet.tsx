"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  abilityMod,
  abilityScore,
  armorClass,
  passiveScore,
  initiative,
  proficiencyBonus,
  saveBonus,
  skillBonus,
  speed,
  spellSaveDc,
  totalLevel,
} from "@/engine/calc";
import { BACKGROUNDS } from "@/engine/data/backgrounds";
import { CLASSES } from "@/engine/data/classes";
import { CLASS_PROFILES } from "@/engine/data/classProfiles";
import { className, rosterSubclassName, rosterSubclassNames } from "@/engine/data/roster";
import { featById } from "@/engine/data/feats";
import { canUseClassAction, classActions } from "@/engine/actions";
import {
  cantripOptionsForStyle,
  expertiseKey,
  fightingStyleCantripsKey,
  fightingStyleKey,
  fightingStyleOptions,
} from "@/engine/classChoices";
import { speciesForCharacter } from "@/engine/data/species";
import { downloadCharacter, parseCharacter } from "@/engine/file";
import { activeEffects, canStartRage, rageUses } from "@/engine/rage";
import { resourcePools } from "@/engine/resources";
import { spellSlotPools } from "@/engine/spells";
import { loadActiveCharacter } from "@/engine/storage";
import { useCharacter } from "@/engine/store";
import { ABILITIES, SKILLS, type Ability, type Skill } from "@/engine/types";
import { AbilityDialog } from "./AbilityDialog";
import { HpBox } from "./HpBox";
import { LevelUpDialog } from "./LevelUpDialog";
import { SavedCharacters } from "./SavedCharacters";
import { RuleActionDialog } from "./RuleActionDialog";
import { ThemeToggle } from "./ThemeToggle";

const signed = (n: number) => (n >= 0 ? `+${n}` : `${n}`);
const label = (s: string) => s.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());

export function Sheet() {
  const {
    character: c,
    load,
    update,

    toggleSkill,
    setResourceUsed,
    toggleRage,
    rest,
    activateClassAction,
  } = useCharacter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [levelUpOpen, setLevelUpOpen] = useState(false);
  const [actionOpen, setActionOpen] = useState<ReturnType<typeof classActions>[number] | null>(null);
  const [abilityOpen, setAbilityOpen] = useState<Ability | null>(null);
  const [editSkills, setEditSkills] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [menuOpen]);
  const hydrated = useSyncExternalStore(() => () => {}, () => true, () => false);

  useEffect(() => {
    if (!useCharacter.getState().character) {
      const saved = loadActiveCharacter();
      if (saved) load(saved);
    }
  }, [load]);

  const raging = c?.rageActive ?? false;
  useEffect(() => {
    document.documentElement.classList.toggle("rage", raging);
    return () => document.documentElement.classList.remove("rage");
  }, [raging]);

  const importFile = async (file: File) => {
    try {
      load(parseCharacter(await file.text()));
      setError(null);
    } catch {
      setError("That file isn't a valid character sheet.");
    }
  };

  const fileInput = (
    <input
      ref={fileRef}
      type="file"
      accept=".json,application/json"
      hidden
      onChange={(e) => {
        const f = e.target.files?.[0];
        if (f) void importFile(f);
        e.target.value = "";
      }}
    />
  );

  if (!hydrated) return null;

  if (!c) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">Character Sheet</h1>
            <p className="mt-2 text-muted">Create a new character, or load one you saved earlier.</p>
          </div>
          <ThemeToggle />
        </div>
        <div className="flex gap-3">
          <Link href="/create" className="btn-primary !px-5 !py-2.5">
            Create character
          </Link>
          <button onClick={() => fileRef.current?.click()} className="btn !px-5 !py-2.5">
            Load character file
          </button>
        </div>
        {error && <p className="text-danger">{error}</p>}
        <section className="panel max-w-md !p-2">
          <h2 className="label-caps px-3 py-2">Saved characters</h2>
          <SavedCharacters onPick={load} />
        </section>
        {fileInput}
      </main>
    );
  }

  const level = totalLevel(c);
  const dc = spellSaveDc(c);
  const fx = activeEffects(c);
  const barbarian = c.classes.find((k) => k.classId === "barbarian");
  const species = speciesForCharacter(c);
  const background = BACKGROUNDS[c.ruleset].find((b) => b.id === c.backgroundId);
  const rageMax = barbarian ? rageUses(barbarian.level, c.ruleset) : 0;
  const rageUsed = c.resourcesUsed.rage ?? 0;
  const spellPools = spellSlotPools(c);
  const classResourcePools = resourcePools(c);
  const hasAdvantage = (ability: string, kind: "checks" | "saves") => (fx.advantage[kind] as string[]).includes(ability);

  return (
    <div className="flex-1">
      <header className="sticky top-0 z-10 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
          <div className="min-w-48 flex-1">
            <input
              aria-label="Character name"
              placeholder="Character name"
              className="w-full bg-transparent text-2xl font-bold outline-none placeholder:text-muted"
              value={c.name}
              onChange={(e) => update({ name: e.target.value })}
            />
            <div className="text-sm text-muted">
              {species?.name} · {background?.name} · Level {level} · {c.ruleset} rules
            </div>
          </div>
          <button onClick={() => setLevelUpOpen(true)} className="btn-primary">
            Level up
          </button>
          <ThemeToggle />
          <div ref={menuRef} className="relative">
            <button
              aria-label="Menu"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((o) => !o)}
              className="btn !px-3 text-lg leading-none"
            >
              ☰
            </button>
            {menuOpen && (
              <>
                <div role="menu" className="panel absolute right-0 z-30 mt-2 flex w-72 flex-col gap-1 !p-1 shadow-lg max-h-[70vh] overflow-y-auto">
                  <button
                    role="menuitem"
                    className="rounded px-3 py-2 text-left text-sm hover:bg-line/40"
                    onClick={() => {
                      setMenuOpen(false);
                      downloadCharacter(c);
                    }}
                  >
                    Download character
                  </button>
                  <button
                    role="menuitem"
                    className="rounded px-3 py-2 text-left text-sm hover:bg-line/40"
                    onClick={() => {
                      setMenuOpen(false);
                      fileRef.current?.click();
                    }}
                  >
                    Load from file
                  </button>                  <div className="my-1 border-t border-line" />
                  <div className="label-caps px-3 pt-1">Characters</div>
                  <SavedCharacters
                    currentId={c.id}
                    onPick={(s) => {
                      setMenuOpen(false);
                      load(s);
                    }}
                    onDeleteCurrent={() => {
                      setMenuOpen(false);
                      useCharacter.setState({ character: null });
                    }}
                  />
                  <div className="my-1 border-t border-line" />
                  <Link
                    href="/create"
                    role="menuitem"
                    className="rounded px-3 py-2 text-sm hover:bg-line/40"
                    onClick={() => {
                      setMenuOpen(false);
                    }}
                  >
                    New character
                  </Link>
                </div>
              </>
            )}
          </div>          {fileInput}
        </div>
      </header>

      {abilityOpen && <AbilityDialog c={c} ability={abilityOpen} onClose={() => setAbilityOpen(null)} />}
      {levelUpOpen && <LevelUpDialog c={c} onClose={() => setLevelUpOpen(false)} />}
      {actionOpen && (
        <RuleActionDialog
          c={c}
          action={actionOpen}
          onClose={() => setActionOpen(null)}
          onResolve={(inputValue, choiceId) => {
            if (activateClassAction(actionOpen.id, inputValue, choiceId)) setActionOpen(null);
          }}
        />
      )}
      <main className="mx-auto max-w-6xl space-y-5 p-4">
        {error && <p className="text-danger">{error}</p>}

        <section className="flex flex-wrap items-start gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <div className="flex flex-wrap items-stretch gap-2">
              {c.classes.map((k) => {
                const def = CLASSES[k.classId];
                const sub = def && k.level >= def.subclassLevel[c.ruleset] ? def.subclasses[c.ruleset].find((s) => s.id === k.subclassId) : undefined;
                return (
                  <div key={k.classId} className="panel !px-4 !py-2">
                    <div className="font-semibold">
                      {className(k.classId)} <span className="font-normal text-muted">Level {k.level}</span>
                    </div>
                    {sub && <div className="text-sm text-muted">{sub.name}</div>}
                    {!def && <div className="text-xs text-muted">Mechanics not implemented</div>}
                  </div>
                );
              })}
              <div className="ml-auto flex gap-2">
                <button onClick={() => rest("short")} className="btn" title="Recovers some class resources">
                  Short rest
                </button>
                <button onClick={() => rest("long")} className="btn" title="Restores HP, resources and half your hit dice">
                  Long rest
                </button>
              </div>
            </div>
          <section aria-label="Abilities" className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {ABILITIES.map((a) => {
              const proficient = CLASS_PROFILES[c.classes[0].classId].saves.includes(a);
              return (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAbilityOpen(a)}
                  aria-label={`${a} ability details`}
                  className="panel flex flex-col items-center justify-center !p-1.5 text-center transition hover:border-accent"
                >
                  <div className="label-caps">
                    {a}
                    {hasAdvantage(a, "saves") && <span title="Advantage on saves" className="ml-1 font-bold text-danger">▲</span>}
                  </div>
                  <div className="text-xl font-bold leading-tight">{signed(abilityMod(abilityScore(c, a)))}</div>
                  <div className={`text-xs ${c.abilityOverrides[a] !== undefined ? "font-semibold text-accent" : "text-muted"}`}>
                    {abilityScore(c, a)}
                  </div>
                  <div className="mt-1 w-full border-t border-line pt-1 text-[11px] text-muted">
                    Save <span className="font-semibold text-foreground">{signed(saveBonus(c, a))}</span>
                    {proficient && <span title="Proficient"> ●</span>}
                  </div>
                </button>
              );
            })}
          </section>
          </div>
          <HpBox c={c} />
        </section>
        <section className="panel grid grid-cols-[repeat(auto-fit,minmax(7.5rem,1fr))] items-stretch gap-y-4 !p-0">
          {[
            barbarian && (
              <div key="rage" className="flex flex-col items-center justify-center gap-2">
                <label className="flex items-center gap-2 text-lg font-bold">
                  <input
                    type="checkbox"
                    className="h-5 w-5 accent-[var(--accent)]"
                    checked={c.rageActive}
                    disabled={!c.rageActive && !canStartRage(c)}
                    onChange={toggleRage}
                  />
                  Rage
                </label>
                {Number.isFinite(rageMax) ? (
                  <div className="flex gap-1.5" aria-label={`${Math.max(0, rageMax - rageUsed)} of ${rageMax} rages left`}>
                    {Array.from({ length: rageMax }, (_, i) => (
                      <input key={i} type="checkbox" readOnly tabIndex={-1} checked={i < rageUsed} className="pointer-events-none h-4 w-4 accent-[var(--accent)]" />
                    ))}
                  </div>
                ) : (
                  <span className="text-sm text-muted">Unlimited</span>
                )}
              </div>
            ),
            <Stat key="ac" title="Armor class" value={String(armorClass(c))} />,
            <Stat key="init" title="Initiative" value={signed(initiative(c))} />,
            <Stat key="speed" title="Speed" value={`${speed(c)} ft`} />,
            <Stat key="prof" title="Proficiency" value={signed(proficiencyBonus(level))} />,
            dc !== null && <Stat key="dc" title="Spell save DC" value={fx.spellcastingBlocked ? "Raging" : String(dc)} />,
            fx.resistances.length > 0 && <Stat key="res" title="Resistances" value={fx.resistances.map((r) => r[0]).join(" / ")} />,
            <Stat key="pp" title="Passive Perception" value={String(passiveScore(c, "perception"))} />,
            <Stat key="pi" title="Passive Investigation" value={String(passiveScore(c, "investigation"))} />,
            <Stat key="pin" title="Passive Insight" value={String(passiveScore(c, "insight"))} />,
          ]
            .filter(Boolean)
            .map((cell, i) => (
              <div key={i} className={`flex flex-col justify-center px-3 py-3 ${i > 0 ? "sm:border-l sm:border-line" : ""}`}>
                {cell}
              </div>
            ))}
        </section>

        <section className="panel">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="panel-title">{species?.name}{species && "variantName" in species && species.variantName ? ` · ${species.variantName}` : ""} traits</h2>
                <div className="text-sm text-muted">
                  {[species?.size, species?.darkvisionFt ? `Darkvision ${species.darkvisionFt} ft` : null]
                    .concat(species?.flySpeed ? [`Fly ${species.flySpeed} ft`] : [])
                    .concat(species?.swimSpeed ? [`Swim ${species.swimSpeed} ft`] : [])
                    .concat(species?.climbSpeed ? [`Climb ${species.climbSpeed} ft`] : [])
                    .filter(Boolean)
                    .join(" · ")}
                  {species?.resistances?.length ? ` · Resistance: ${species.resistances.join(", ")}` : ""}
                </div>
              </div>
              {species?.sourceUrl && (
                <a href={species.sourceUrl} target="_blank" rel="noreferrer" className="text-sm text-accent underline">
                  Source page
                </a>
              )}
            </div>
            {species?.traits?.length ? (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                {species.traits.map((trait) => <li key={trait}>{trait}</li>)}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-muted">Species features have not been added yet.</p>
            )}
            {species?.mechanicsStatus === "partial" && (
              <p className="mt-2 text-xs text-muted">Some selectable traits or special actions may still need manual handling.</p>
            )}
            {species?.mechanicsStatus === "roster-only" && (
              <p className="mt-2 text-xs text-muted">Only the species name and source link are currently included.</p>
            )}
        </section>


        <div className="grid gap-5 md:grid-cols-2">
          <section className="panel">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="panel-title !mb-0">Skills</h2>
              <button className="btn !px-2 !py-1 text-xs" aria-pressed={editSkills} onClick={() => setEditSkills((v) => !v)}>
                {editSkills ? "Done" : "Edit proficiencies"}
              </button>
            </div>
            <ul className="divide-y divide-line">
              {(Object.keys(SKILLS) as Skill[]).map((s) => {
                const proficient = c.skillProficiencies.includes(s);
                const expert = c.expertise.includes(s);
                return (
                  <li key={s} className={`flex items-center gap-2 py-1 ${proficient ? "font-medium" : ""}`}>
                    <span className="w-9 text-right tabular-nums">{signed(skillBonus(c, s))}</span>
                    <span className="flex-1">
                      {label(s)} <span className="text-xs uppercase text-muted">{SKILLS[s]}</span>
                      {hasAdvantage(SKILLS[s], "checks") && <span className="ml-1 text-xs font-bold text-danger">ADV</span>}
                    </span>
                    {editSkills ? (
                      <>
                        <label className="flex items-center gap-1 text-xs text-muted">
                          <input type="checkbox" aria-label={`${label(s)} proficiency`} checked={proficient} onChange={() => toggleSkill(s, "skillProficiencies")} />
                          Prof
                        </label>
                        <label className="flex items-center gap-1 text-xs text-muted">
                          <input type="checkbox" aria-label={`${label(s)} expertise`} checked={expert} onChange={() => toggleSkill(s, "expertise")} />
                          Exp
                        </label>
                      </>
                    ) : (
                      <span
                        className="w-20 text-right text-xs text-muted"
                        title={expert ? "Expertise" : proficient ? "Proficient" : "Not proficient"}
                      >
                        {expert ? "◆ Expertise" : proficient ? "● Proficient" : "○"}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          <div className="space-y-5">
            {spellPools.length > 0 && (
              <section className="panel space-y-3">
                <h2 className="panel-title !mb-0">Spell slots</h2>
                {spellPools.map((pool) => (
                  <div key={pool.key} className="flex flex-wrap items-center gap-3">
                    <span className="min-w-32 text-sm font-medium">
                      {pool.label} · Level {pool.level}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {Array.from({ length: pool.total }, (_, i) => (
                        <input
                          key={i}
                          type="checkbox"
                          className="h-4 w-4"
                          aria-label={`${pool.label}, level ${pool.level}, slot ${i + 1} used`}
                          checked={i < pool.used}
                          onChange={() => setResourceUsed(pool.key, i < pool.used ? i : i + 1)}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-muted">{pool.total - pool.used} / {pool.total} available</span>
                  </div>
                ))}
              </section>
            )}
            {c.classes.map((k) => {
              const def = CLASSES[k.classId];
              const resources = classResourcePools.filter((resource) => resource.classId === k.classId);
              const actions = classActions(c).filter((action) => action.classId === k.classId);
              const sub = def?.subclasses[c.ruleset].find((s) => s.id === k.subclassId);
              const rosterSubName = rosterSubclassName(k.classId, k.subclassId);
              return (
                <section key={k.classId} className="panel">
                  <h2 className="panel-title !mb-1">
                    {className(k.classId)} {k.level}
                  </h2>
                  {(sub?.name ?? rosterSubName) && (
                    <div className="mb-3 text-sm text-muted">{sub?.name ?? rosterSubName}</div>
                  )}
                  {(() => {
                    const choices = c.classChoices ?? {};
                    const styleId = choices[fightingStyleKey(k.classId)]?.[0];
                    const style = styleId && fightingStyleOptions(k.classId, c.ruleset).find((option) => option.id === styleId);
                    const cantrips = (choices[fightingStyleCantripsKey(k.classId)] ?? [])
                      .map((id) => cantripOptionsForStyle(styleId ?? "", c.ruleset).find((option) => option.id === id)?.label)
                      .filter((name): name is string => Boolean(name));
                    const expertise = choices[expertiseKey(k.classId)] ?? [];
                    if (!style && expertise.length === 0) return null;
                    return (
                      <div className="mb-3 rounded-md border border-line p-3 text-sm">
                        {style && (
                          <>
                            <div className="font-semibold">Fighting Style: {style.label}</div>
                            <div className="text-muted">{style.description}</div>
                            {cantrips.length > 0 && <div className="mt-1">Cantrips chosen: {cantrips.join(", ")} (casting not implemented)</div>}
                          </>
                        )}
                        {expertise.length > 0 && (
                          <div className="mt-1">
                            Expertise: {expertise.map((skill) => label(skill)).join(", ")}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  <details className="mb-3 text-sm">
                    <summary className="cursor-pointer text-muted">Full subclass roster (reference only)</summary>
                    <p className="mt-1 text-muted">{rosterSubclassNames(k.classId).join(", ") || "None listed"}</p>
                    <p className="mt-1 text-xs text-muted">Additional subclass mechanics are being implemented.</p>
                  </details>
                  {actions.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {actions.map((action) => (
                        <button
                          key={action.id}
                          type="button"
                          className="btn"
                          disabled={!canUseClassAction(c, action)}
                          onClick={() => setActionOpen(action)}
                        >
                          {action.label}{action.rollFormula ? ` · ${action.rollFormula}` : ""}
                        </button>
                      ))}
                    </div>
                  )}
                  {!def && (
                    <p className="mb-3 text-sm text-muted">
                      Core class statistics, hit dice, spell slots, and class resources are applied. Additional feature effects are being implemented.
                    </p>
                  )}
                  {resources.map((r) => {
                    const max = r.total;
                    const shown = Math.min(max, 12);
                    const isRage = r.id === "rage";
                    return (
                      <div key={r.id} className="mb-3">
                        <div className="text-sm font-medium">
                          {r.label}{r.unit === "points" && ` · ${max - r.used} / ${max}`}
                          {isRage && <span className="ml-2 text-xs text-muted">(use the Rage toggle above)</span>}
                        </div>
                        {r.unit === "points" ? (
                          <input
                            type="number"
                            className="field mt-1 w-24"
                            min={0}
                            max={max}
                            value={r.used}
                            aria-label={`${r.label} spent`}
                            onChange={(e) => setResourceUsed(r.id, Math.min(max, Math.max(0, Number(e.target.value) || 0)))}
                          />
                        ) : (
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {Array.from({ length: shown }, (_, i) => (
                              <input
                                key={i}
                                type="checkbox"
                                className="h-4 w-4"
                                aria-label={`${r.label} ${i + 1} used`}
                                checked={i < r.used}
                                disabled={isRage}
                                onChange={() => setResourceUsed(r.id, i < r.used ? i : i + 1)}
                              />
                            ))}
                            {!Number.isFinite(max) && <span className="text-xs text-muted">Unlimited</span>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {def ? (
                    <ul className="space-y-2">
                      {def.features
                        .filter((f) => f.level <= k.level && (!f.rulesets || f.rulesets.includes(c.ruleset)))
                        .map((f) => (
                          <li key={f.name}>
                            <div className="font-semibold">{f.name}</div>
                            <div className="text-sm text-muted">{f.description}</div>
                          </li>
                        ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted">Core class feature actions and their roll prompts will appear here as they are implemented.</p>
                  )}
                </section>
              );
            })}

            {c.feats.length > 0 && (
              <section className="panel">
                <h2 className="panel-title">Feats</h2>
                <ul className="space-y-2">
                  {c.feats.map((id) => (
                    <li key={id}>
                      <div className="font-semibold">{featById(id)?.name ?? id}</div>
                      <div className="text-sm text-muted">{featById(id)?.description}</div>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="panel">
              <h2 className="panel-title">Notes</h2>
              <textarea
                aria-label="Notes"
                className="field h-32 w-full"
                value={c.notes}
                onChange={(e) => update({ notes: e.target.value })}
              />
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

function Stat({ title, value }: { title: string; value: string }) {
  return (
    <div className="text-center">
      <div className="label-caps">{title}</div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  );
}
