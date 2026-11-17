"use client";

import { useId, useState } from "react";
import st from "@/components/reader/SettingsSheet.module.css";
import s from "./write.module.css";

export type AuthorshipValue = { whose: "own" | "other"; author: string; rights: boolean };

/** "Whose writing is this?" Inside a form it posts whose, original_author and rights;
 *  onChange lets a form without FormData (the EPUB import) follow along. */
export function Authorship({ initial, onChange }: {
  initial?: Partial<AuthorshipValue>;
  onChange?: (v: AuthorshipValue) => void;
}) {
  const [v, setV] = useState<AuthorshipValue>({ whose: "own", author: "", rights: false, ...initial });
  const id = useId();
  const set = (patch: Partial<AuthorshipValue>) => {
    const next = { ...v, ...patch };
    setV(next);
    onChange?.(next);
  };
  return (
    <fieldset className={s.whose}>
      <legend className={s.legend}>Whose writing is this?</legend>
      <input type="hidden" name="whose" value={v.whose} />
      <div className={st.seg} role="group" aria-label="Whose writing is this?">
        <button type="button" aria-pressed={v.whose === "own"} className={st.opt}
          onClick={() => set({ whose: "own" })}>My own writing</button>
        <button type="button" aria-pressed={v.whose === "other"} className={st.opt}
          onClick={() => set({ whose: "other" })}>Someone else&rsquo;s</button>
      </div>
      {v.whose === "other" && (
        <>
          <div className={s.field}>
            <label htmlFor={`${id}-a`}>Author&rsquo;s name</label>
            <input id={`${id}-a`} name="original_author" className={s.input} value={v.author} maxLength={120}
              required autoComplete="off" onChange={(e) => set({ author: e.target.value })} />
            <span className={s.hint}>Readers will see &ldquo;by {v.author.trim() || "the author"} · shared by you&rdquo;.</span>
          </div>
          <label className={s.checkRow}>
            <input type="checkbox" name="rights" checked={v.rights} required
              onChange={(e) => set({ rights: e.target.checked })} />
            <span>I have the author&rsquo;s permission to share this book here, or it is in the public domain.</span>
          </label>
        </>
      )}
    </fieldset>
  );
}
