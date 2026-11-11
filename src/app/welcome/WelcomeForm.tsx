"use client";

import { useActionState } from "react";
import { saveWelcome, type WelcomeState } from "./actions";
import s from "@/components/auth/auth.module.css";

export function WelcomeForm({ handle, name, next }: { handle: string; name: string; next: string }) {
  const [state, action, pending] = useActionState<WelcomeState, FormData>(saveWelcome, {});
  return (
    <form action={action} className={s.form}>
      <input type="hidden" name="next" value={next} />
      <div className={s.field}>
        <label htmlFor="name">Your name</label>
        <input id="name" name="name" defaultValue={name} maxLength={60} required autoComplete="name" />
        <span className={s.hint}>Shown on your profile, your books and your comments.</span>
      </div>
      <div className={s.field}>
        <label htmlFor="handle">Handle</label>
        <div className={s.prefix}>
          @<input id="handle" name="handle" defaultValue={handle} maxLength={24} required
            pattern="[a-z0-9_]{3,24}" autoCapitalize="none" autoCorrect="off" spellCheck={false} />
        </div>
        <span className={s.hint}>Your profile address. Lowercase letters, numbers and underscores.</span>
      </div>
      {state.error && <p className={s.error} role="alert">{state.error}</p>}
      <button className={s.submit} disabled={pending}>{pending ? "Saving…" : "Continue"}</button>
    </form>
  );
}
