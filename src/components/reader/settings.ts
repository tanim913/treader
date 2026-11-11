"use client";

export type Theme = "system" | "light" | "sepia" | "dark";
export type ReadSettings = { size: number; leading: "compact" | "normal" | "loose"; face: "serif" | "sans" };

export const DEFAULT_READ: ReadSettings = { size: 18, leading: "normal", face: "serif" };
export const SIZE_MIN = 15;
export const SIZE_MAX = 26;
const LEADING = { compact: 1.45, normal: 1.62, loose: 1.8 };

export function loadTheme(): Theme {
  try {
    const t = localStorage.getItem("treader-theme");
    if (t === "light" || t === "sepia" || t === "dark") return t;
  } catch {}
  return "system";
}

export function applyTheme(t: Theme) {
  const el = document.documentElement;
  if (t === "system") delete el.dataset.theme;
  else el.dataset.theme = t;
  try {
    if (t === "system") localStorage.removeItem("treader-theme");
    else localStorage.setItem("treader-theme", t);
  } catch {}
}

export function loadRead(): ReadSettings {
  try {
    const raw = localStorage.getItem("treader-read");
    if (raw) return { ...DEFAULT_READ, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_READ;
}

export function applyRead(r: ReadSettings) {
  const st = document.documentElement.style;
  st.setProperty("--read-size", `${r.size}px`);
  st.setProperty("--read-leading", String(LEADING[r.leading]));
  st.setProperty("--font-read-active", r.face === "sans" ? "var(--font-ui)" : "var(--font-read)");
  try { localStorage.setItem("treader-read", JSON.stringify(r)); } catch {}
}
