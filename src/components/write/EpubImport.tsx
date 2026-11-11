"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp } from "lucide-react";
import { readEpub, type EpubBook } from "@/lib/epub";
import { addImportedChapter, createImportedBook, setBookFlags } from "@/app/write/actions";
import { supabaseBrowser } from "@/lib/supabase/client";
import { CLOTHS } from "@/lib/cloth";
import s from "./write.module.css";
import e from "./EpubImport.module.css";

const MAX_FILE = 50 * 1024 * 1024;
const MAX_COVER = 2 * 1024 * 1024;

export function EpubImport() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [book, setBook] = useState<EpubBook | null>(null);
  const [title, setTitle] = useState("");
  const [blurb, setBlurb] = useState("");
  const [cloth, setCloth] = useState("oxblood");
  const [picked, setPicked] = useState<boolean[]>([]);
  const [rights, setRights] = useState(false);
  const [useCover, setUseCover] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const open = async (f: File) => {
    setError(null);
    if (!/\.epub$/i.test(f.name)) return setError("Choose a file that ends in .epub.");
    if (f.size > MAX_FILE) return setError("That file is larger than 50 MB.");
    setBusy("Reading the EPUB…");
    try {
      const b = await readEpub(f);
      setBook(b);
      setTitle(b.title);
      setBlurb(b.description.slice(0, 2000));
      setPicked(b.chapters.map((c) => c.suggested));
    } catch (err) {
      setError(err instanceof Error ? err.message : "That EPUB couldn't be read.");
    } finally {
      setBusy(null);
    }
  };

  const chosen = book ? book.chapters.filter((_, i) => picked[i]) : [];

  const run = async () => {
    if (!book) return;
    setError(null);
    setBusy("Creating the book…");
    const created = await createImportedBook({ title, blurb, cloth, rights });
    if (created.error || !created.id) { setBusy(null); return setError(created.error ?? "Couldn't create the book."); }
    const bookId = created.id;
    for (let i = 0; i < chosen.length; i++) {
      setBusy(`Adding chapter ${i + 1} of ${chosen.length}…`);
      const r = await addImportedChapter(bookId, i + 1, chosen[i].title, chosen[i].doc);
      if (r.error) { setBusy(null); return setError(`${r.error} The chapters before it were saved; you'll find the book under Your books.`); }
    }
    if (useCover && book.cover && book.cover.size <= MAX_COVER) {
      setBusy("Adding the cover…");
      try {
        const sb = supabaseBrowser();
        const { data } = await sb.auth.getUser();
        if (data.user) {
          const ext = book.cover.type.split("/")[1].replace("jpeg", "jpg");
          const path = `${data.user.id}/${bookId}-epub.${ext}`;
          const up = await sb.storage.from("covers").upload(path, book.cover, { contentType: book.cover.type });
          if (!up.error) await setBookFlags(bookId, { cover_url: sb.storage.from("covers").getPublicUrl(path).data.publicUrl });
        }
      } catch { /* the cover is optional */ }
    }
    router.push(`/write/${bookId}`);
  };

  if (!book) {
    return (
      <div className={e.drop}>
        <FileUp size={28} strokeWidth={1.4} aria-hidden="true" />
        <p>Import a book you&rsquo;ve already written. The EPUB is read on this device; chapters arrive as drafts for you to check before publishing.</p>
        <input ref={input} type="file" accept=".epub,application/epub+zip" hidden
          onChange={(ev) => { const f = ev.target.files?.[0]; if (f) open(f); ev.target.value = ""; }} />
        <button type="button" className={`${s.btn} ${s.primary}`} disabled={!!busy} onClick={() => input.current?.click()}>
          {busy ?? "Choose an EPUB file"}
        </button>
        {error && <p className={s.error} role="alert">{error}</p>}
      </div>
    );
  }

  const coverUrl = book.cover ? URL.createObjectURL(book.cover) : null;
  const totalWords = chosen.reduce((a, c) => a + c.words, 0);

  return (
    <div className={s.form}>
      <div className={s.field}>
        <label htmlFor="ititle">Title</label>
        <input id="ititle" className={s.input} value={title} maxLength={160} onChange={(ev) => setTitle(ev.target.value)} />
        {book.author && <span className={s.hint}>The EPUB names the author as {book.author}. Books here appear under your name.</span>}
      </div>
      <div className={s.field}>
        <label htmlFor="iblurb">Blurb</label>
        <textarea id="iblurb" className={s.textarea} value={blurb} maxLength={2000} onChange={(ev) => setBlurb(ev.target.value)}
          placeholder="A few lines to tell readers what the book is about." />
      </div>

      <div className={s.field}>
        <span className={s.legend}>Cover</span>
        <div className={e.coverRow}>
          {coverUrl && useCover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverUrl} alt="" className={e.cover} />
          ) : (
            <span className={e.cover} style={{ background: CLOTHS[cloth as keyof typeof CLOTHS].cloth }} aria-hidden="true" />
          )}
          <div className={s.field}>
            {book.cover && book.cover.size <= MAX_COVER && (
              <label className={e.check}>
                <input type="checkbox" checked={useCover} onChange={(ev) => setUseCover(ev.target.checked)} /> Use the EPUB&rsquo;s cover image
              </label>
            )}
            {book.cover && book.cover.size > MAX_COVER && <span className={s.hint}>The EPUB&rsquo;s cover is over 2 MB, so the cloth is used. You can upload a smaller cover later.</span>}
            <div className={s.cloths} role="radiogroup" aria-label="Cloth colour">
              {Object.values(CLOTHS).map((c) => (
                <label key={c.id} className={s.swatch} style={{ background: c.cloth }} title={c.name}>
                  <input type="radio" name="icloth" value={c.id} checked={cloth === c.id} onChange={() => setCloth(c.id)} aria-label={c.name} />
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className={s.field}>
        <span className={s.legend}>Chapters to import</span>
        <span className={s.hint}>
          {chosen.length} of {book.chapters.length} selected · {totalWords.toLocaleString("en")} words. Pages like the contents and copyright, and very short pages, start unticked.
        </span>
        <ol className={e.chapters}>
          {book.chapters.map((c, i) => (
            <li key={i}>
              <label className={e.chapter}>
                <input type="checkbox" checked={picked[i] ?? false}
                  onChange={(ev) => setPicked((p) => p.map((v, j) => (j === i ? ev.target.checked : v)))} />
                <span className={e.chTitle}>{c.title}</span>
                <span className={e.chWords}>{c.words.toLocaleString("en")} words</span>
              </label>
            </li>
          ))}
        </ol>
      </div>

      <label className={e.check}>
        <input type="checkbox" checked={rights} onChange={(ev) => setRights(ev.target.checked)} />
        I wrote this book, or I have the right to publish it here.
      </label>

      {error && <p className={s.error} role="alert">{error}</p>}
      <div className={s.actions}>
        <button type="button" className={`${s.btn} ${s.primary}`} disabled={!!busy || !rights || !chosen.length || !title.trim()} onClick={run}>
          {busy ?? `Import ${chosen.length} ${chosen.length === 1 ? "chapter" : "chapters"} as drafts`}
        </button>
        <button type="button" className={`${s.btn} ${s.quiet}`} disabled={!!busy} onClick={() => { setBook(null); setRights(false); }}>
          Choose another file
        </button>
      </div>
    </div>
  );
}
