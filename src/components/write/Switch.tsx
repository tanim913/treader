"use client";

import s from "./Switch.module.css";

export function Switch({ checked, onChange, disabled, label }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled}
      className={s.switch} onClick={() => onChange(!checked)}>
      <span className={s.knob} />
    </button>
  );
}
