"use client";

import { useState, useTransition } from "react";
import { Copy, Check } from "lucide-react";
import { setBookFlags } from "@/app/write/actions";
import { Switch } from "./Switch";
import s from "./write.module.css";

export function BookPublishing(p: { origin: string; bookId: string; slug: string; status: string; completed: boolean; publishedChapters: number }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const published = p.status === "published";
  const url = `${p.origin}/b/${p.slug}`;

  const set = (flags: Parameters<typeof setBookFlags>[1]) =>
    start(async () => { const r = await setBookFlags(p.bookId, flags); setError(r.error ?? null); });

  return (
    <div className={s.panel}>
      <div className={s.toggleRow}>
        <div>
          <strong>Book is public</strong>
          <span>
            {published
              ? "Anyone with the link can see the book and its published chapters, without signing in."
              : "Only you can see this book. Chapters stay hidden even when published."}
          </span>
        </div>
        <Switch checked={published} disabled={pending} label="Book is public"
          onChange={(v) => set({ status: v ? "published" : "draft" })} />
      </div>
      <div className={s.toggleRow}>
        <div>
          <strong>Book is finished</strong>
          <span>{p.completed ? "The last chapter ends with “The End”." : "The last published chapter ends with “Coming soon”."}</span>
        </div>
        <Switch checked={p.completed} disabled={pending} label="Book is finished"
          onChange={(v) => set({ completed: v })} />
      </div>
      {published && (
        <div className={s.field}>
          <span className={s.legend}>Share link</span>
          <div className={s.link}>
            <span style={{ flex: 1 }}>{url}</span>
            <button type="button" className={`${s.btn} ${s.quiet}`} aria-label="Copy share link"
              onClick={async () => { try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch {} }}>
              {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? "Copied" : "Copy"}
            </button>
          </div>
          {p.publishedChapters === 0 && <span className={s.hint}>No chapters are published yet, so readers will see an empty contents page.</span>}
        </div>
      )}
      {error && <p className={s.error} role="alert">{error}</p>}
    </div>
  );
}
