"use client";

import { useActionState } from "react";
import { createBook, type Result } from "@/app/write/actions";
import { ClothPicker } from "./ClothPicker";
import s from "./write.module.css";

export function NewBookForm() {
  const [state, action, pending] = useActionState<Result, FormData>(createBook, {});
  return (
    <form action={action} className={s.form}>
      <div className={s.field}>
        <label htmlFor="title">Title</label>
        <input id="title" name="title" className={s.input} maxLength={160} required autoComplete="off" />
      </div>
      <div className={s.field}>
        <label htmlFor="blurb">Blurb</label>
        <textarea id="blurb" name="blurb" className={s.textarea} maxLength={2000}
          placeholder="A few lines to tell readers what the book is about." />
      </div>
      <div className={s.field}>
        <span className={s.legend}>Cloth</span>
        <span className={s.hint}>The colour of the book&rsquo;s cover on the shelf. You can upload a cover image later.</span>
        <ClothPicker value="oxblood" />
      </div>
      {state.error && <p className={s.error} role="alert">{state.error}</p>}
      <div className={s.actions}>
        <button className={`${s.btn} ${s.primary}`} disabled={pending}>{pending ? "Creating…" : "Create book"}</button>
      </div>
    </form>
  );
}
