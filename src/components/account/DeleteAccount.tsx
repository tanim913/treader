"use client";

import { useActionState, useState } from "react";
import { deleteAccount, type DeleteState } from "@/app/me/actions";
import w from "@/components/write/write.module.css";

export function DeleteAccount({ handle }: { handle: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<DeleteState, FormData>(deleteAccount, {});
  if (!open) {
    return (
      <button type="button" className={`${w.btn} ${w.danger}`} onClick={() => setOpen(true)}>Delete account</button>
    );
  }
  return (
    <form action={action} className={w.confirm}>
      <p>
        This permanently deletes your account: your profile, every book and chapter you wrote, your bookmarks,
        notes, comments and uploaded images. It can&rsquo;t be undone.
      </p>
      <label className={w.field}>
        <span>Type your handle, <strong>{handle}</strong>, to confirm</span>
        <input name="confirm" className={w.input} autoComplete="off" autoCapitalize="none" spellCheck={false} required />
      </label>
      {state.error && <p className={w.error} role="alert">{state.error}</p>}
      <div className={w.actions}>
        <button className={`${w.btn} ${w.primary}`} style={{ background: "var(--danger)", borderColor: "var(--danger)" }} disabled={pending}>
          {pending ? "Deleting…" : "Delete my account forever"}
        </button>
        <button type="button" className={`${w.btn} ${w.quiet}`} onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </form>
  );
}
