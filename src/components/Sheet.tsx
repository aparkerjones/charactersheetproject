"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import {
  abilityMod,
  initiative,
  maxHp,
  proficiencyBonus,
  saveBonus,
  skillBonus,
  speed,
  spellSaveDc,
  totalLevel,
} from "@/engine/calc";
import { BACKGROUNDS } from "@/engine/data/backgrounds";
import { CLASSES } from "@/engine/data/classes";
import { featById } from "@/engine/data/feats";
import { SPECIES } from "@/engine/data/species";
import { downloadCharacter, parseCharacter } from "@/engine/file";
import { activeEffects, canStartRage, rageUses } from "@/engine/rage";
import { useCharacter } from "@/engine/store";
import { ABILITIES, SKILLS, type Skill } from "@/engine/types";

const signed = (n: number) => (n >= 0 ? `+${n}` : `${n}`);
const label = (s: string) => s.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());

export function Sheet() {
  const {
    character: c,
    load,
    update,
    setAbility,
    toggleSkill,
    setResourceUsed,
    setClassLevel,
    setSubclass,
    toggleRage,
    rest,
  } = useCharacter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

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

  if (!c) {
    return (
      <main className="mx-auto max-w-3xl p-8">
        <h1 className="text-3xl font-bold">Character Sheet</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">Create a new character, or load a saved sheet.</p>
        <div className="mt-6 flex gap-3">
          <Link href="/create" className="rounded bg-black px-4 py-2 text-white dark:bg-white dark:text-black">
            Create character
          </Link>
          <button onClick={() => fileRef.current?.click()} className="rounded border px-4 py-2">
            Load character file
          </button>
        </div>
        {error && <p className="mt-3 text-red-600">{error}</p>}
        {fileInput}
      </main>
    );
  }

  const level = totalLevel(c);
  const hpMax = maxHp(c);
  const dc = spellSaveDc(c);
  const fx = activeEffects(c);
  const barbarian = c.classes.find((k) => k.classId === "barbarian");
  const species = SPECIES[c.ruleset].find((s) => s.id === c.speciesId);
  const background = BACKGROUNDS[c.ruleset].find((b) => b.id === c.backgroundId);
  const rageMax = barbarian ? rageUses(barbarian.level, c.ruleset) : 0;
  const rageUsed = c.resourcesUsed.rage ?? 0;
  const hasAdvantage = (ability: string, kind: "checks" | "saves") =>
    (fx.advantage[kind] as string[]).includes(ability);

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <header className="flex flex-wrap items-end gap-4">
        <label className="flex-1">
          <span className="text-xs uppercase text-zinc-500">Name</span>
          <input
            className="block w-full border-b bg-transparent text-2xl font-bold outline-none"
            value={c.name}
            onChange={(e) => update({ name: e.target.value })}
          />
        </label>
        <div>
          <div className="text-xs uppercase text-zinc-500">
            {c.ruleset} rules · Level {level}
          </div>
          <div className="text-sm">
            {species?.name} · {background?.name}
          </div>
        </div>
        <button onClick={() => downloadCharacter(c)} className="rounded bg-black px-4 py-2 text-white dark:bg-white dark:text-black">
          Download
        </button>
        <button onClick={() => fileRef.current?.click()} className="rounded border px-4 py-2">
          Load
        </button>
        <Link href="/create" className="rounded border px-4 py-2">
          New
        </Link>
        {fileInput}
      </header>
      {error && <p className="text-red-600">{error}</p>}

      <section className="flex flex-wrap gap-4">
        {c.classes.map((k) => {
          const def = CLASSES[k.classId];
          const sub = def.subclasses[c.ruleset].find((s) => s.id === k.subclassId);
          const unlock = def.subclassLevel[c.ruleset];
          return (
            <div key={k.classId} className="flex items-center gap-2 rounded border p-2">
              <div>
                <div className="font-semibold">{def.name}</div>
                <div className="text-xs text-zinc-500">{sub?.name ?? (k.level >= unlock ? "No subclass" : `Subclass at ${unlock}`)}</div>
              </div>
              <input
                type="number"
                min={1}
                max={20}
                aria-label={`${def.name} level`}
                className="w-14 rounded border bg-transparent p-1"
                value={k.level}
                onChange={(e) => setClassLevel(k.classId, Number(e.target.value) || 1)}
              />
              {k.level >= unlock && (
                <select
                  aria-label={`${def.name} subclass`}
                  className="rounded border bg-transparent p-1 text-sm"
                  value={k.subclassId ?? ""}
                  onChange={(e) => setSubclass(k.classId, e.target.value)}
                >
                  <option value="">Subclass…</option>
                  {def.subclasses[c.ruleset].map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          );
        })}
        <div className="ml-auto flex gap-2">
          <button onClick={() => rest("short")} className="rounded border px-3 py-1 text-sm">
            Short rest
          </button>
          <button onClick={() => rest("long")} className="rounded border px-3 py-1 text-sm">
            Long rest
          </button>
        </div>
      </section>

      {barbarian && (
        <section className={`rounded border-2 p-4 ${c.rageActive ? "border-red-600 bg-red-50 dark:bg-red-950" : ""}`}>
          <label className="flex items-center gap-3 text-lg font-bold">
            <input
              type="checkbox"
              className="h-5 w-5"
              checked={c.rageActive}
              disabled={!c.rageActive && !canStartRage(c)}
              onChange={toggleRage}
            />
            Rage active
            <span className="text-sm font-normal text-zinc-500">
              {Number.isFinite(rageMax) ? `${Math.max(0, rageMax - rageUsed)} / ${rageMax} uses left` : "Unlimited uses"}
            </span>
          </label>
          {!c.rageActive && !canStartRage(c) && <p className="mt-1 text-sm text-zinc-500">No rages left. Take a rest to recover uses.</p>}
          {c.rageActive && (
            <ul className="mt-2 space-y-1 text-sm">
              <li>
                <strong>Resistance:</strong> {fx.resistances.join(", ")} damage
              </li>
              {fx.damageBonuses.map((b) => (
                <li key={b.label}>
                  <strong>{signed(b.value)} damage:</strong> {b.label}
                </li>
              ))}
              <li>
                <strong>Advantage:</strong> Strength checks (including Athletics) and Strength saves
              </li>
              <li>
                <strong>Spellcasting and concentration:</strong> unavailable while raging
              </li>
            </ul>
          )}
        </section>
      )}

      <section className="flex flex-wrap gap-4 rounded border p-4">
        <Stat title="Proficiency" value={signed(proficiencyBonus(level))} />
        <Stat title="Initiative" value={signed(initiative(c))} />
        <Stat title="Speed" value={`${speed(c)} ft`} />
        {dc !== null && <Stat title="Spell Save DC" value={fx.spellcastingBlocked ? "Raging" : String(dc)} />}
        <label className="flex flex-col">
          <span className="text-xs uppercase text-zinc-500">HP (max {hpMax})</span>
          <input
            type="number"
            className="w-24 rounded border bg-transparent p-1 text-xl"
            value={c.currentHp}
            onChange={(e) => update({ currentHp: Math.min(hpMax, Number(e.target.value) || 0) })}
          />
        </label>
        {fx.resistances.length > 0 && <Stat title="Resistances" value={fx.resistances.map((r) => r[0]).join("/")} />}
      </section>

      <section className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {ABILITIES.map((a) => (
          <div key={a} className="rounded border p-3 text-center">
            <div className="text-xs font-semibold uppercase">{a}</div>
            <div className="text-2xl font-bold">{signed(abilityMod(c.abilities[a]))}</div>
            <input
              type="number"
              min={1}
              max={30}
              className="w-14 rounded border bg-transparent text-center"
              value={c.abilities[a]}
              onChange={(e) => setAbility(a, Math.min(30, Math.max(1, Number(e.target.value) || 1)))}
            />
            <div className="mt-1 text-xs text-zinc-500">
              Save {signed(saveBonus(c, a))}
              {CLASSES[c.classes[0].classId].saves.includes(a) && " ●"}
              {hasAdvantage(a, "saves") && <span className="ml-1 font-bold text-red-600">ADV</span>}
            </div>
          </div>
        ))}
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded border p-4">
          <h2 className="mb-2 font-bold">Skills</h2>
          <div className="mb-1 flex justify-end gap-3 text-xs text-zinc-500">
            <span>Prof</span>
            <span>Exp</span>
          </div>
          <ul className="space-y-1">
            {(Object.keys(SKILLS) as Skill[]).map((s) => (
              <li key={s} className="flex items-center gap-2">
                <span className="w-8 text-right tabular-nums">{signed(skillBonus(c, s))}</span>
                <span className="flex-1">
                  {label(s)} <span className="text-xs text-zinc-500">({SKILLS[s]})</span>
                  {hasAdvantage(SKILLS[s], "checks") && <span className="ml-1 text-xs font-bold text-red-600">ADV</span>}
                </span>
                <input
                  type="checkbox"
                  aria-label={`${label(s)} proficiency`}
                  checked={c.skillProficiencies.includes(s)}
                  onChange={() => toggleSkill(s, "skillProficiencies")}
                />
                <input
                  type="checkbox"
                  aria-label={`${label(s)} expertise`}
                  checked={c.expertise.includes(s)}
                  onChange={() => toggleSkill(s, "expertise")}
                />
              </li>
            ))}
          </ul>
        </section>

        <div className="space-y-6">
          {c.classes.map((k) => {
            const def = CLASSES[k.classId];
            const resources = def.resources.filter((r) => k.level >= (r.minLevel ?? 1));
            return (
              <section key={k.classId} className="rounded border p-4">
                <h2 className="mb-2 font-bold">
                  {def.name} {k.level}
                </h2>
                {resources.map((r) => {
                  const max = r.max(k.level, c.ruleset);
                  const shown = Math.min(max, 12);
                  const used = Math.min(c.resourcesUsed[r.id] ?? 0, shown);
                  const isRage = r.id === "rage";
                  return (
                    <div key={r.id} className="mb-2">
                      <div className="text-sm">{r.label}</div>
                      <div className="flex flex-wrap gap-1">
                        {Array.from({ length: shown }, (_, i) => (
                          <input
                            key={i}
                            type="checkbox"
                            aria-label={`${r.label} ${i + 1} used`}
                            checked={i < used}
                            disabled={isRage}
                            onChange={() => setResourceUsed(r.id, i < used ? i : i + 1)}
                          />
                        ))}
                        {!Number.isFinite(max) && <span className="text-xs text-zinc-500">Unlimited</span>}
                      </div>
                    </div>
                  );
                })}
                <ul className="space-y-2">
                  {def.features
                    .filter((f) => f.level <= k.level && (!f.rulesets || f.rulesets.includes(c.ruleset)))
                    .map((f) => (
                      <li key={f.name}>
                        <div className="font-semibold">{f.name}</div>
                        <div className="text-sm text-zinc-600 dark:text-zinc-400">{f.description}</div>
                      </li>
                    ))}
                </ul>
              </section>
            );
          })}

          {c.feats.length > 0 && (
            <section className="rounded border p-4">
              <h2 className="mb-2 font-bold">Feats</h2>
              <ul className="space-y-2">
                {c.feats.map((id) => (
                  <li key={id}>
                    <div className="font-semibold">{featById(id)?.name ?? id}</div>
                    <div className="text-sm text-zinc-600 dark:text-zinc-400">{featById(id)?.description}</div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="rounded border p-4">
            <h2 className="mb-2 font-bold">Notes</h2>
            <textarea
              className="h-32 w-full rounded border bg-transparent p-2"
              value={c.notes}
              onChange={(e) => update({ notes: e.target.value })}
            />
          </section>
        </div>
      </div>
    </main>
  );
}

function Stat({ title, value }: { title: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase text-zinc-500">{title}</div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  );
}
