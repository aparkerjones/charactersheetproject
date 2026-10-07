"use client";

import { useEffect, useState } from "react";

type Theme = "system" | "light" | "dark";
const ORDER: Theme[] = ["system", "light", "dark"];
const ICON: Record<Theme, string> = { system: "🖥 Auto", light: "☀ Light", dark: "☾ Dark" };

function apply(theme: Theme) {
  const dark = theme === "dark" || (theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    const saved = localStorage.getItem("theme") as Theme | null;
    // Syncing from localStorage after mount avoids a server/client mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved && ORDER.includes(saved)) setTheme(saved);
  }, []);

  useEffect(() => {
    if (theme !== "system") return;
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  const cycle = () => {
    const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];
    setTheme(next);
    localStorage.setItem("theme", next);
    apply(next);
  };

  return (
    <button onClick={cycle} className="btn" title="Switch theme" aria-label={`Theme: ${theme}. Click to change.`}>
      {ICON[theme]}
    </button>
  );
}
