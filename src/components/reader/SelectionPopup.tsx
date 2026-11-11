"use client";

import { useEffect, useRef, useState } from "react";
import s from "./ChapterText.module.css";

type Props = {
  x: number;
  y: number;
  below: boolean;
  editing: boolean;
  initialNote: string;
  onSave: (note: string) => void;
  onDelete: () => void;
  onCancel: () => void;
};

export function SelectionPopup({ x, y, below, editing, initialNote, onSave, onDelete, onCancel }: Props) {
  const [note, setNote] = useState(initialNote);
  const ref = useRef<HTMLDivElement>(null);

  // keep the popup inside the screen horizontally
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const pad = 12;
    let shift = 0;
    if (r.left < pad) shift = pad - r.left;
    else if (r.right > window.innerWidth - pad) shift = window.innerWidth - pad - r.right;
    if (shift) el.style.setProperty("--shift", `${shift}px`);
  }, []);

  return (
    <div
      ref={ref}
      data-ui
      role="dialog"
      aria-label={editing ? "Your bookmark" : "New bookmark"}
      className={`${s.popup} ${below ? s.below : s.above}`}
      style={{ left: x, top: y }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <label className={s.popLabel} htmlFor="bm-note">{editing ? "Your note" : "Bookmark this passage"}</label>
      <textarea
        id="bm-note"
        className={s.popNote}
        rows={2}
        placeholder="Add a note or a reminder (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={2000}
      />
      <div className={s.popActions}>
        {editing && (
          <button type="button" className={`${s.popBtn} ${s.popDanger}`} onClick={onDelete}>Delete</button>
        )}
        <span className={s.popSpacer} />
        <button type="button" className={s.popBtn} onClick={onCancel}>Cancel</button>
        <button type="button" className={`${s.popBtn} ${s.popSave}`} onClick={() => onSave(note.trim())}>
          {editing ? "Save" : "Save bookmark"}
        </button>
      </div>
    </div>
  );
}
