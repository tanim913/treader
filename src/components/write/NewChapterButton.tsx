"use client";

import { useTransition, useState } from "react";
import { Plus } from "lucide-react";
import { createChapter } from "@/app/write/actions";
import s from "./write.module.css";

export function NewChapterButton({ bookId }: { bookId: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className={s.actions}>
      {error && <p className={s.error} role="alert">{error}</p>}
      <button type="button" className={`${s.btn} ${s.primary}`} disabled={pending}
        onClick={() => start(async () => { const r = await createChapter(bookId); if (r?.error) setError(r.error); })}>
        <Plus size={18} strokeWidth={1.8} aria-hidden="true" /> {pending ? "Adding…" : "New chapter"}
      </button>
    </div>
  );
}
