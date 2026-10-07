"use client";

import { useRef, useState } from "react";
import { abilityMod, abilityScore, maxHp } from "@/engine/calc";
import { CLASSES } from "@/engine/data/classes";
import { DAMAGE_TYPES, hitDicePool, isResistant, resolveDamage, type DamageType } from "@/engine/hp";
import { useCharacter } from "@/engine/store";
import type { Character } from "@/engine/types";

export function HpBox({ c }: { c: Character }) {
  const { damage, heal, setTempHp, setDeathSaves, spendHitDie, update } = useCharacter();
  const [amount, setAmount] = useState("");
  const [tempDraft, setTempDraft] = useState<string | null>(null);
  const cancelled = useRef(false);

  const max = maxHp(c);
  const value = Math.max(0, parseInt(amount, 10) || 0);
  const pct = Math.min(100, Math.round((c.currentHp / max) * 100));
  const barColor = pct > 50 ? "bg-good" : pct > 25 ? "bg-accent" : "bg-danger";
  const con = abilityMod(abilityScore(c, "con"));
  const clear = () => setAmount("");

  const commitTemp = () => {
    const n = parseInt(tempDraft ?? "", 10);
    if (!cancelled.current && Number.isFinite(n)) setTempHp(n);
    cancelled.current = false;
    setTempDraft(null);
  };

  return (
    <div className="panel relative w-72 space-y-2 !p-3">
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <div className="label-caps">Hit points</div>
          <div className="flex items-baseline gap-1">
            <input
              type="number"
              aria-label="Current HP"
              className="w-16 bg-transparent text-3xl font-bold outline-none focus:underline"
              value={c.currentHp}
              min={0}
              max={max}
              onChange={(e) => update({ currentHp: Math.min(max, Math.max(0, Number(e.target.value) || 0)) })}
            />
            <span className="text-lg text-muted">/ {max}</span>
          </div>
        </div>
        <div className="text-center">
          <div className="label-caps">Temp</div>
          <div className="flex items-center gap-1">
            <span className="text-muted">+</span>
            <input
              type="text"
              inputMode="numeric"
              aria-label="Temp HP"
              className="field w-14 text-center"
              value={tempDraft ?? String(c.tempHp)}
              placeholder={String(c.tempHp)}
              onFocus={(e) => {
                cancelled.current = false;
                setTempDraft("");
                e.currentTarget.select();
              }}
              onChange={(e) => setTempDraft(e.target.value.replace(/\D/g, ""))}
              onBlur={commitTemp}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.currentTarget.blur();
                if (e.key === "Escape") {
                  cancelled.current = true;
                  e.currentTarget.blur();
                }
              }}
            />
          </div>
        </div>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={c.currentHp} aria-valuemin={0} aria-valuemax={max}>
        <div className={`h-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
      </div>

      <input
        type="number"
        min={0}
        aria-label="Damage or healing amount"
        placeholder="Damage / heal amount"
        className="field w-full"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && clear()}
      />

      {value > 0 && (
        <div role="menu" aria-label="Apply amount" className="absolute right-0 top-full z-10 mt-2 w-80 space-y-3 rounded-xl border border-line bg-surface p-3 shadow-lg">
          <button
            role="menuitem"
            className="w-full rounded-lg bg-good px-3 py-2 font-semibold text-background"
            onClick={() => {
              heal(value);
              clear();
            }}
          >
            Heal {value}
          </button>

          <div>
            <div className="label-caps mb-1">Damage type</div>
            <div className="grid grid-cols-3 gap-1.5">
              {DAMAGE_TYPES.map((type: DamageType) => {
                const resisted = isResistant(c, type);
                return (
                  <button
                    key={type}
                    role="menuitem"
                    className="btn !px-1.5 !py-1 text-xs"
                    title={resisted ? `Resistant: takes ${resolveDamage(c, value, type)}` : `Takes ${value}`}
                    onClick={() => {
                      damage(resolveDamage(c, value, type));
                      clear();
                    }}
                  >
                    {type}
                    {resisted && <span className="ml-1 font-bold text-accent">½</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {hitDicePool(c).some((h) => h.used < h.total) && c.currentHp < max && (
            <div>
              <div className="label-caps mb-1">Hit die (amount is your roll{con ? `, ${con > 0 ? "+" : "−"}${Math.abs(con)} CON added` : ""})</div>
              <div className="flex flex-wrap gap-1.5">
                {hitDicePool(c).map((h) => (
                  <button
                    key={h.classId}
                    role="menuitem"
                    className="btn !py-1 text-xs"
                    disabled={h.used >= h.total}
                    onClick={() => {
                      spendHitDie(h.classId, Math.max(1, value + con));
                      clear();
                    }}
                  >
                    d{CLASSES[h.classId].hitDie} ({h.total - h.used} left)
                  </button>
                ))}
              </div>
            </div>
          )}

          <button className="btn w-full" onClick={clear}>
            Cancel
          </button>
        </div>
      )}

      {c.currentHp === 0 && (
        <div className="rounded-lg border border-danger bg-danger-bg p-2 text-sm">
          <div className="mb-1 font-semibold text-danger">Death saving throws</div>
          {(["successes", "failures"] as const).map((kind) => (
            <div key={kind} className="flex items-center gap-2">
              <span className="w-16 capitalize">{kind}</span>
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
          {c.deathSaves.failures >= 3 && <div className="mt-1 font-semibold text-danger">Three failures: the character has died.</div>}
          {c.deathSaves.successes >= 3 && <div className="mt-1 font-semibold text-good">Three successes: stable.</div>}
        </div>
      )}
    </div>
  );
}
