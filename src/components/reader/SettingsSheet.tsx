"use client";

import { forwardRef } from "react";
import { X } from "lucide-react";
import { SIZE_MAX, SIZE_MIN, type ReadSettings, type Theme } from "./settings";
import s from "./SettingsSheet.module.css";

const THEMES: { id: Theme; label: string; swatch: string }[] = [
  { id: "system", label: "Auto", swatch: "linear-gradient(90deg,#f3efe6 50%,#171614 50%)" },
  { id: "light", label: "Paper", swatch: "#f3efe6" },
  { id: "sepia", label: "Sepia", swatch: "#ebdfc6" },
  { id: "dark", label: "Night", swatch: "#171614" },
];

type Props = {
  theme: Theme;
  read: ReadSettings;
  onTheme: (t: Theme) => void;
  onRead: (r: ReadSettings) => void;
};

export const SettingsSheet = forwardRef<HTMLDialogElement, Props>(function SettingsSheet(
  { theme, read, onTheme, onRead },
  ref,
) {
  const close = () => (ref as React.RefObject<HTMLDialogElement>)?.current?.close();
  return (
    <dialog
      ref={ref}
      className={s.sheet}
      aria-labelledby="reading-settings"
      onClick={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      <div className={s.grip} aria-hidden="true" />
      <div className={s.headRow}>
        <h2 id="reading-settings">Reading settings</h2>
        <button className={s.close} onClick={close} aria-label="Close settings">
          <X size={20} strokeWidth={1.6} />
        </button>
      </div>

      <fieldset className={s.group}>
        <legend>Page</legend>
        <div className={s.seg}>
          {THEMES.map((t) => (
            <button key={t.id} className={s.opt} aria-pressed={theme === t.id} onClick={() => onTheme(t.id)}>
              <span className={s.swatch} style={{ background: t.swatch }} aria-hidden="true" />
              {t.label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className={s.group}>
        <legend>Text size</legend>
        <div className={s.size}>
          <button className={s.opt} aria-label="Smaller text" disabled={read.size <= SIZE_MIN}
            onClick={() => onRead({ ...read, size: read.size - 1 })}>
            <span className={s.serif} style={{ fontSize: 14 }}>A</span>
          </button>
          <output aria-live="polite">{read.size}px</output>
          <button className={s.opt} aria-label="Larger text" disabled={read.size >= SIZE_MAX}
            onClick={() => onRead({ ...read, size: read.size + 1 })}>
            <span className={s.serif} style={{ fontSize: 21 }}>A</span>
          </button>
        </div>
      </fieldset>

      <fieldset className={s.group}>
        <legend>Line spacing</legend>
        <div className={s.seg}>
          {(["compact", "normal", "loose"] as const).map((l) => (
            <button key={l} className={s.opt} aria-pressed={read.leading === l} onClick={() => onRead({ ...read, leading: l })}>
              {l === "compact" ? "Tight" : l === "normal" ? "Normal" : "Loose"}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className={s.group}>
        <legend>Typeface</legend>
        <div className={s.seg}>
          <button className={`${s.opt} ${s.serif}`} aria-pressed={read.face === "serif"} onClick={() => onRead({ ...read, face: "serif" })}>Serif</button>
          <button className={s.opt} aria-pressed={read.face === "sans"} onClick={() => onRead({ ...read, face: "sans" })}>Sans</button>
        </div>
      </fieldset>
    </dialog>
  );
});
