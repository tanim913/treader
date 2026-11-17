"use client";

import { supabaseBrowser } from "@/lib/supabase/client";

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
  document.documentElement.dataset.face = r.face;
  try { localStorage.setItem("treader-read", JSON.stringify(r)); } catch {}
}

// ---- settings that follow the account (reader_settings, private to the reader)

type AccountSettings = { theme: Theme; read: ReadSettings };

function clean(raw: unknown): AccountSettings | null {
  const x = raw as Partial<{ theme: string; size: number; leading: string; face: string }> | null;
  if (!x || typeof x !== "object") return null;
  const theme = (["system", "light", "sepia", "dark"] as const).find((t) => t === x.theme) ?? "system";
  const size = Number.isFinite(x.size) ? Math.min(SIZE_MAX, Math.max(SIZE_MIN, Math.round(x.size!))) : DEFAULT_READ.size;
  const leading = (["compact", "normal", "loose"] as const).find((l) => l === x.leading) ?? DEFAULT_READ.leading;
  const face = x.face === "sans" ? "sans" : "serif";
  return { theme, read: { size, leading, face } };
}

const same = (a: AccountSettings, b: AccountSettings) =>
  a.theme === b.theme && a.read.size === b.read.size && a.read.leading === b.read.leading && a.read.face === b.read.face;

/** On a new device, the account's settings win; an account without any takes this browser's. */
export async function pullAccountSettings(userId: string): Promise<void> {
  const { data, error } = await supabaseBrowser().from("reader_settings").select("settings").eq("user_id", userId).maybeSingle();
  if (error) return;
  const local: AccountSettings = { theme: loadTheme(), read: loadRead() };
  const remote = clean(data?.settings);
  if (!remote) { await pushAccountSettings(userId, local); return; }
  if (same(remote, local)) return;
  applyTheme(remote.theme);
  applyRead(remote.read);
}

let timer: ReturnType<typeof setTimeout> | undefined;

/** Saves the settings to the account a moment after the last change. */
export function pushAccountSettings(userId: string, s: AccountSettings = { theme: loadTheme(), read: loadRead() }): Promise<void> {
  clearTimeout(timer);
  return new Promise((resolve) => {
    timer = setTimeout(async () => {
      await supabaseBrowser().from("reader_settings")
        .upsert({ user_id: userId, settings: { theme: s.theme, ...s.read } }, { onConflict: "user_id" });
      resolve();
    }, 600);
  });
}
