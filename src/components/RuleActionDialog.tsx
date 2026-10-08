"use client";

import { useState } from "react";
import { canUseClassAction, resolveClassAction, type ClassAction } from "@/engine/actions";
import { resourcePools } from "@/engine/resources";
import type { Character } from "@/engine/types";

export function RuleActionDialog({
  c,
  action,
  onClose,
  onResolve,
}: {
  c: Character;
  action: ClassAction;
  onClose: () => void;
  onResolve: (inputValue?: number, choiceId?: string) => void;
}) {
  const [input, setInput] = useState("");
  const [choiceId, setChoiceId] = useState("");
  const value = input === "" ? undefined : Number(input);
  const selectedChoice = action.choices?.find((choice) => choice.id === choiceId);
  const resolution = resolveClassAction(c, action.id, value, choiceId || undefined);
  const remaining = action.resourceId
    ? resourcePools(c).find((pool) => pool.classId === action.classId && pool.id === action.resourceId)
    : undefined;
  const available = canUseClassAction(c, action);

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label={action.label}>
      <div className="panel w-full max-w-md space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold">{action.label}</h2>
            <p className="text-sm text-muted">{selectedChoice?.activation ?? action.activation}</p>
          </div>
          <button type="button" className="btn" onClick={onClose}>Close</button>
        </div>
        {action.choices && (
          <label className="block text-sm">
            Channel Divinity option
            <select className="field mt-1 block w-full" value={choiceId} onChange={(e) => setChoiceId(e.target.value)}>
              <option value="">Choose an option</option>
              {action.choices.map((choice) => (
                <option key={choice.id} value={choice.id}>{choice.label}</option>
              ))}
            </select>
          </label>
        )}
        {(selectedChoice?.rollFormula ?? action.rollFormula) && (
          <div className="rounded-md border border-line p-3">
            <div className="label-caps">Player roll</div>
            <div className="mt-1 text-lg font-semibold">{selectedChoice?.rollFormula ?? action.rollFormula}</div>
          </div>
        )}
        <p className="text-sm">{selectedChoice?.instruction ?? action.instruction}</p>
        {action.input && (
          <label className="block text-sm">
            {action.input === "roll-healing" ? "Rolled healing total" : "Points to spend"}
            <input
              type="number"
              className="field mt-1 block w-full"
              min={1}
              max={action.input === "points-healing" ? remaining?.total ? remaining.total - remaining.used : 0 : undefined}
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />
          </label>
        )}
        {!available && <p className="text-sm text-danger">No uses remain for this action.</p>}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="btn-primary disabled:opacity-50"
            disabled={!available || !resolution}
            onClick={() => resolution && onResolve(value, choiceId || undefined)}
          >
            {action.input ? "Apply" : action.resourceId ? "Use action" : "Done"}
          </button>
        </div>
      </div>
    </div>
  );
}
