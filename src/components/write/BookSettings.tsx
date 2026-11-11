"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { deleteBook, setBookFlags, updateBook, type Result } from "@/app/write/actions";
import { supabaseBrowser } from "@/lib/supabase/client";
import { ClothPicker } from "./ClothPicker";
import s from "./write.module.css";

type Book = { id: string; title: string; blurb: string; cloth: string; cover_url: string | null };

const MAX_COVER = 2 * 1024 * 1024;

export function BookSettings({ book, userId }: { book: Book; userId: string }) {
  const [state, action, pending] = useActionState<Result, FormData>(updateBook.bind(null, book.id), {});
  const [cover, setCover] = useState(book.cover_url);
  const [coverMsg, setCoverMsg] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");
  const file = useRef<HTMLInputElement>(null);

  const upload = (f: File) =>
    start(async () => {
      setCoverMsg(null);
      if (!/^image\/(jpeg|png|webp)$/.test(f.type)) return setCoverMsg("Use a JPG, PNG or WebP image.");
      if (f.size > MAX_COVER) return setCoverMsg("The image must be 2 MB or smaller.");
      const ext = f.type.split("/")[1].replace("jpeg", "jpg");
      const path = `${userId}/${book.id}-${Date.now()}.${ext}`;
      const sb = supabaseBrowser();
      const { error } = await sb.storage.from("covers").upload(path, f, { contentType: f.type, upsert: false });
      if (error) return setCoverMsg("Upload failed. Please try again.");
      const url = sb.storage.from("covers").getPublicUrl(path).data.publicUrl;
      const r = await setBookFlags(book.id, { cover_url: url });
      if (r.error) return setCoverMsg(r.error);
      setCover(url);
    });

  return (
    <div className={s.form}>
      <form action={action} className={s.form}>
        <div className={s.field}>
          <label htmlFor="title">Title</label>
          <input id="title" name="title" className={s.input} defaultValue={book.title} maxLength={160} required />
        </div>
        <div className={s.field}>
          <label htmlFor="blurb">Blurb</label>
          <textarea id="blurb" name="blurb" className={s.textarea} defaultValue={book.blurb} maxLength={2000} />
        </div>
        <div className={s.field}>
          <span className={s.legend}>Cloth</span>
          <span className={s.hint}>Shown when the book has no cover image.</span>
          <ClothPicker value={book.cloth} />
        </div>
        {state.error && <p className={s.error} role="alert">{state.error}</p>}
        {state.ok && !pending && <p className={s.saved} role="status">Saved.</p>}
        <div className={s.actions}>
          <button className={`${s.btn} ${s.primary}`} disabled={pending}>{pending ? "Saving…" : "Save details"}</button>
        </div>
      </form>

      <div className={s.field}>
        <span className={s.legend}>Cover image</span>
        <span className={s.hint}>Optional. A tall image, about 2:3, up to 2 MB.</span>
        <div className={s.actions}>
          {cover && <span className={s.mini} style={{ backgroundImage: `url(${cover})` }} aria-hidden="true" />}
          <input ref={file} type="file" accept="image/jpeg,image/png,image/webp" hidden
            onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
          <button type="button" className={`${s.btn} ${s.quiet}`} disabled={busy} onClick={() => file.current?.click()}>
            {busy ? "Uploading…" : cover ? "Replace image" : "Upload image"}
          </button>
          {cover && (
            <button type="button" className={`${s.btn} ${s.danger}`} disabled={busy}
              onClick={() => start(async () => { const r = await setBookFlags(book.id, { cover_url: null }); if (!r.error) setCover(null); })}>
              Use cloth instead
            </button>
          )}
        </div>
        {coverMsg && <p className={s.error} role="alert">{coverMsg}</p>}
      </div>

      <div className={s.field}>
        {!confirming ? (
          <div className={s.actions}>
            <button type="button" className={`${s.btn} ${s.danger}`} onClick={() => setConfirming(true)}>Delete this book</button>
          </div>
        ) : (
          <div className={s.confirm}>
            <p>This deletes <strong>{book.title}</strong>, all its chapters, and every reader&rsquo;s bookmarks in it. It can&rsquo;t be undone. Type the title to confirm.</p>
            <input className={s.input} value={typed} onChange={(e) => setTyped(e.target.value)} aria-label="Type the book title to confirm" />
            <div className={s.actions}>
              <button type="button" className={`${s.btn} ${s.primary}`} style={{ background: "var(--danger)", borderColor: "var(--danger)" }}
                disabled={typed.trim() !== book.title.trim() || busy}
                onClick={() => start(async () => { await deleteBook(book.id); })}>Delete forever</button>
              <button type="button" className={`${s.btn} ${s.quiet}`} onClick={() => { setConfirming(false); setTyped(""); }}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
