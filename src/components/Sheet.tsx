"use client";

import { useRef, useState } from "react";
import { abilityMod, abilityMods, maxHp, proficiencyBonus, saveBonus, skillBonus, spellSaveDc } from "@/engine/calc";
import { CLASSES } from "@/engine/classes";
import { downloadCharacter, parseCharacter } from "@/engine/file";
import { useCharacter } from "@/engine/store";
import { ABILITIES, SKILLS, type ClassId, type Skill } from "@/engine/types";

const signed = (n: number) => (n >= 0 ? `+${n}` : `${n}`);
const label = (s: string) => s.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());

export function Sheet() {
  const { character: c, start, load, update, setAbility, toggleSkill, setResourceUsed } = useCharacter();
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
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">Pick a class to start, or load a saved sheet.</p>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Object.values(CLASSES).map((k) => (
            <button
              key={k.id}
              onClick={() => start(k.id as ClassId)}
              className="rounded border p-4 text-lg font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              {k.name}
            </button>
          ))}
        </div>
        <button onClick={() => fileRef.current?.click()} className="mt-6 rounded border px-4 py-2">
          Load character file
        </button>
        {error && <p className="mt-3 text-red-600">{error}</p>}
        {fileInput}
      </main>
    );
  }

  const cls = CLASSES[c.classId];
  const mods = abilityMods(c);
  const hpMax = maxHp(c);
  const dc = spellSaveDc(c);

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
          <div className="text-xs uppercase text-zinc-500">Class</div>
          <div className="text-lg font-semibold">{cls.name}</div>
        </div>
        <label>
          <span className="block text-xs uppercase text-zinc-500">Level</span>
          <input
            type="number"
            min={1}
            max={20}
            className="w-16 rounded border bg-transparent p-1"
            value={c.level}
            onChange={(e) => update({ level: Math.min(20, Math.max(1, Number(e.target.value) || 1)) })}
          />
        </label>
        <button onClick={() => downloadCharacter(c)} className="rounded bg-black px-4 py-2 text-white dark:bg-white dark:text-black">
          Download
        </button>
        <button onClick={() => fileRef.current?.click()} className="rounded border px-4 py-2">
          Load
        </button>
        {fileInput}
      </header>
      {error && <p className="text-red-600">{error}</p>}

      <section className="flex flex-wrap gap-4 rounded border p-4">
        <Stat title="Proficiency" value={signed(proficiencyBonus(c.level))} />
        <Stat title="Initiative" value={signed(mods.dex)} />
        <Stat title="Hit Die" value={`d${cls.hitDie}`} />
        {dc !== null && <Stat title="Spell Save DC" value={String(dc)} />}
        <label className="flex flex-col">
          <span className="text-xs uppercase text-zinc-500">HP (max {hpMax})</span>
          <input
            type="number"
            className="w-24 rounded border bg-transparent p-1 text-xl"
            value={c.currentHp}
            onChange={(e) => update({ currentHp: Math.min(hpMax, Number(e.target.value) || 0) })}
          />
        </label>
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
              {cls.saves.includes(a) && " ●"}
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
          {cls.resources.length > 0 && (
            <section className="rounded border p-4">
              <h2 className="mb-2 font-bold">{cls.name} Resources</h2>
              {cls.resources.map((r) => {
                const max = r.max(c.level);
                const used = Math.min(c.resourcesUsed[r.id] ?? 0, max);
                return (
                  <div key={r.id} className="mb-2">
                    <div className="text-sm">
                      {r.label} <span className="text-xs text-zinc-500">({r.recharge} rest)</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {Array.from({ length: Math.min(max, 12) }, (_, i) => (
                        <input
                          key={i}
                          type="checkbox"
                          aria-label={`${r.label} ${i + 1} used`}
                          checked={i < used}
                          onChange={() => setResourceUsed(r.id, i < used ? i : i + 1)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </section>
          )}

          <section className="rounded border p-4">
            <h2 className="mb-2 font-bold">Class Features</h2>
            <ul className="space-y-2">
              {cls.features
                .filter((f) => f.level <= c.level)
                .map((f) => (
                  <li key={f.name}>
                    <div className="font-semibold">{f.name}</div>
                    <div className="text-sm text-zinc-600 dark:text-zinc-400">{f.description}</div>
                  </li>
                ))}
            </ul>
          </section>

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
