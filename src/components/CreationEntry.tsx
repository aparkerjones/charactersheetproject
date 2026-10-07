"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useSyncExternalStore } from "react";
import { loadActiveCharacter } from "@/engine/storage";
import { useCharacter } from "@/engine/store";
import { CreationWizard } from "./CreationWizard";

export function CreationEntry() {
  return (
    <Suspense>
      <Entry />
    </Suspense>
  );
}

function Entry() {
  const wantsEdit = useSearchParams().has("edit");
  const hydrated = useSyncExternalStore(() => () => {}, () => true, () => false);
  const stored = useCharacter((s) => s.character);
  if (!hydrated) return null;
  const editing = wantsEdit ? (stored ?? loadActiveCharacter() ?? undefined) : undefined;
  return <CreationWizard key={editing ? `edit-${editing.id}` : "new"} editing={editing} />;
}
