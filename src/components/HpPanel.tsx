"use client";

import { useState } from "react";
import { abilityMod, abilityScore, maxHp } from "@/engine/calc";
import { CLASSES } from "@/engine/data/classes";
import { hitDicePool } from "@/engine/hp";
import { activeEffects } from "@/engine/rage";
import { useCharacter } from "@/engine/store";
import type { Character } from "@/engine/types";

export function HpPanel({ c }: { c: Character }) {
  const { damage, heal, setTempHp, setDeathSaves, spendHitDie, update } = useCharacter();
  const [amount, setAmount] = useState("");
  const [halve, setHalve] = useState(false);

  const max = maxHp(c);
  const value = Math.max(0, parseInt(amount, 10) || 0);
  const pct = Math.min(100, Math.round((c.currentHp / max) * 100));
  const raging = activeEffects(c).resistances.length > 0;
  const dying = c.currentHp === 0;
  const barColor = pct > 50 ? "bg-good" : pct > 25 ? "bg-accent" : "bg-danger";
  const con = abilityMod(abilityScore(c, "con"));
  const done = () => setAmount("");

  return (
    <section className="panel space-y-4">
      <div className="flex items-baseline justify-between">
        <h2 className="panel-title !mb-0">Hit points</h2>
        {c.tempHp > 0 && <span className="text-sm font-semibold text-accent">+{c.tempHp} temp</span>}
      </div>

      <div>
        <div className="flex items-end gap-2">
          <input
            type="number"
            aria-label="Current HP"
            className="field w-24 text-3xl font-bold"
            value={c.currentHp}
            min={0}
            max={max}
            onChange={(e) => update({ currentHp: Math.min(max, Math.max(0, Number(e.target.value) || 0)) })}
          />
          <span className="pb-1 text-xl text-muted">/ {max}</span>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={c.currentHp} aria-valuemin={0} aria-valuemax={max}>
          <div className={`h-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="space-y-2">
        <label className="label-caps block" htmlFor="hp-amount">
          Amount
        </label>
        <div className="flex flex-wrap gap-2">
          <input
            id="hp-amount"
            type="number"
            min={0}
            placeholder="0"
            className="field w-24"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <button
            className="btn"
            disabled={value === 0}
            onClick={() => {
              damage(value, halve && raging);
              done();
            }}
          >
            Damage
          </button>
          <button
            className="btn"
            disabled={value === 0}
            onClick={() => {
              heal(value);
              done();
            }}
          >
            Heal
          </button>
          <button
            className="btn"
            disabled={value === 0}
            onClick={() => {
              setTempHp(value);
              done();
            }}
          >
            Set temp HP
          </button>
        </div>
        {raging && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={halve} onChange={(e) => setHalve(e.target.checked)} />
            Halve damage (rage resistance: bludgeoning, piercing, slashing)
          </label>
        )}
      </div>

      <div>
        <div className="label-caps mb-1">Hit dice</div>
        <ul className="space-y-1">
          {hitDicePool(c).map((h) => (
            <li key={h.classId} className="flex items-center gap-3 text-sm">
              <span className="w-28">
                {h.total - h.used} / {h.total} × d{CLASSES[h.classId].hitDie}
              </span>
              <button
                className="btn !py-0.5"
                disabled={value === 0 || h.used >= h.total || c.currentHp >= max}
                title="Roll the die yourself, type the result in Amount, then press this. Your CON modifier is added."
                onClick={() => {
                  spendHitDie(h.classId, Math.max(1, value + con));
                  done();
                }}
              >
                Spend (Amount {con >= 0 ? "+" : "−"} CON)
              </button>
            </li>
          ))}
        </ul>
      </div>

      {dying && (
        <div className="rounded-lg border border-danger bg-danger-bg p-3">
          <div className="mb-1 font-semibold text-danger">At 0 HP: death saving throws</div>
          {(["successes", "failures"] as const).map((kind) => (
            <div key={kind} className="flex items-center gap-2 text-sm">
              <span className="w-20 capitalize">{kind}</span>
              {[1, 2, 3].map((n) => (
                <input
                  key={n}
                  type="checkbox"
                  aria-label={`${kind} ${n}`}
                  checked={c.deathSaves[kind] >= n}
                  onChange={() => setDeathSaves(kind, c.deathSaves[kind] >= n ? n - 1 : n)}
                />
              ))}
            </div>
          ))}
          {c.deathSaves.failures >= 3 && <div className="mt-1 text-sm font-semibold text-danger">Three failures: the character has died.</div>}
          {c.deathSaves.successes >= 3 && <div className="mt-1 text-sm font-semibold text-good">Three successes: stable.</div>}
        </div>
      )}
    </section>
  );
}
