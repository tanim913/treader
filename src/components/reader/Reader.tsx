"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Bookmark, ChevronLeft, ChevronRight, Type, X } from "lucide-react";
import { ShareButton } from "@/components/ShareButton";
import { clothOf } from "@/lib/cloth";
import type { Block } from "@/lib/text";
import { useBookmarkState } from "@/lib/bookmarks/store";
import { savePlace } from "@/lib/progress";
import { SettingsSheet } from "./SettingsSheet";
import { BookmarksSheet } from "./BookmarksSheet";
import { ChapterText } from "./ChapterText";
import { DEFAULT_READ, applyRead, applyTheme, loadRead, loadTheme, type ReadSettings, type Theme } from "./settings";
import { useProtection } from "./protection";
import s from "./Reader.module.css";

export type ReaderProps = {
  chapterId: string;
  bookId: string;
  /** what a guest's saved place needs to draw the book on the home shelf */
  book: { slug: string; coverUrl: string | null; author: string };
  /** the next published chapter: finishing this one moves the reader's place there */
  next: { id: string; number: number; title: string } | null;
  /** the signed-in reader; null for guests */
  userId: string | null;
  /** the writer, for "Follow …" at the end of an unfinished book (null on the writer's own book) */
  author: { name: string; href: string } | null;
  /** scroll to this paragraph once the text is drawn (a Continue link) */
  jumpTo?: number;
  /** offer to go back to this paragraph (where the reader stopped in this chapter) */
  offer?: number;
  bookTitle: string;
  bookHref: string;
  cloth: string;
  chapterHref: string;
  chapterNumber: number;
  chapterCount: number;
  chapterTitle: string;
  minutesLeft: number;
  prevHref: string | null;
  nextHref: string | null;
  /** "next" = more chapters published; "soon" = writer hasn't published more yet; "end" = book finished */
  ending: { kind: "next" } | { kind: "soon"; date?: string } | { kind: "end" };
  blocks: Block[];
  /** The signed-in reader's name for the watermark; guests get a code. */
  readerName?: string;
  /** While the text is still on its way, or if it couldn't be loaded. */
  textState?: "loading" | "error";
  /** The scramble key of the text; the matching fonts are already loaded. */
  cipherKey?: number;
  /** Path of this chapter, for the Share button. */
  sharePath?: string;
};

export function Reader(p: ReaderProps) {
  const [shown, setShown] = useState(false);
  const [theme, setTheme] = useState<Theme>("system");
  const [read, setRead] = useState<ReadSettings>(DEFAULT_READ);
  const settings = useRef<HTMLDialogElement>(null);
  const marksSheet = useRef<HTMLDialogElement>(null);
  const page = useRef<HTMLDivElement>(null);
  const textBox = useRef<HTMLDivElement>(null);
  const cloth = clothOf(p.cloth);

  useProtection(page, textBox, p.readerName);

  const all = useBookmarkState(p.userId).items;
  const bookMarks = useMemo(() => all.filter((b) => b.bookId === p.bookId), [all, p.bookId]);
  const meta = useMemo(() => ({
    chapterId: p.chapterId, bookId: p.bookId, bookTitle: p.bookTitle, cloth: p.cloth,
    chapterNumber: p.chapterNumber, chapterTitle: p.chapterTitle, href: p.chapterHref, k: p.cipherKey,
  }), [p.chapterId, p.bookId, p.bookTitle, p.cloth, p.chapterNumber, p.chapterTitle, p.chapterHref, p.cipherKey]);

  // Saved settings are applied before paint by the script in the root layout;
  // the sheet reads them when it opens.
  const openSettings = () => {
    setTheme(loadTheme());
    setRead(loadRead());
    settings.current?.showModal();
  };

  // Scrolling on hides the controls again, so the page holds still for reading.
  useEffect(() => {
    if (!shown) return;
    let last = window.scrollY;
    const onScroll = () => {
      if (Math.abs(window.scrollY - last) > 24) setShown(false);
      last = window.scrollY;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [shown]);

  // ---- the reader's place in the book
  const textReady = !p.textState && p.blocks.length > 0;
  const endRef = useRef<HTMLElement>(null);
  const [offerGone, setOfferGone] = useState(false);
  const showOffer = textReady && p.offer !== undefined && !offerGone;

  const toPara = (n: number, smooth: boolean) => {
    const el = textBox.current?.querySelector<HTMLElement>(`[data-p="${n}"]`);
    el?.scrollIntoView({ block: "start", behavior: smooth ? "smooth" : "instant" });
  };

  // a Continue link (#p-12) opens at that paragraph
  useEffect(() => {
    if (textReady && p.jumpTo !== undefined) toPara(p.jumpTo, false);
  }, [textReady, p.jumpTo]);

  // Saves the place while reading. Nothing is saved until the reader has really moved
  // (200px), so glancing at a chapter doesn't lose their place further on.
  useEffect(() => {
    if (!textReady) return;
    const base = { bookId: p.bookId, slug: p.book.slug, bookTitle: p.bookTitle, cloth: p.cloth, coverUrl: p.book.coverUrl, author: p.book.author };
    const startY = window.scrollY;
    let armed = false;
    let timer = 0;
    const paragraph = () => {
      const line = window.innerHeight * 0.3;
      let at = 0;
      for (const el of textBox.current?.querySelectorAll<HTMLElement>("[data-p]") ?? []) {
        if (el.getBoundingClientRect().top > line) break;
        at = Number(el.dataset.p);
      }
      return at;
    };
    const save = () => {
      if (!armed) return;
      const atEnd = (endRef.current?.getBoundingClientRect().top ?? Infinity) < window.innerHeight;
      void savePlace(p.userId, atEnd && p.next
        ? { ...base, chapterId: p.next.id, chapterNumber: p.next.number, chapterTitle: p.next.title, paragraph: 0, updatedAt: "" }
        : { ...base, chapterId: p.chapterId, chapterNumber: p.chapterNumber, chapterTitle: p.chapterTitle, paragraph: paragraph(), updatedAt: "" });
    };
    const onScroll = () => {
      if (!armed) {
        if (Math.abs(window.scrollY - startY) < 200) return;
        armed = true;
        setOfferGone(true);
      }
      window.clearTimeout(timer);
      timer = window.setTimeout(save, 1200);
    };
    const onHide = () => { if (document.visibilityState === "hidden") { window.clearTimeout(timer); save(); } };
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", save);
    return () => {
      window.clearTimeout(timer);
      save();
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", save);
    };
  }, [textReady, p.userId, p.chapterId, p.chapterNumber, p.chapterTitle, p.next, p.bookId, p.book, p.bookTitle, p.cloth]);

  const onTap = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("a,button,[data-ui]")) return;
    setShown((v) => !v);
  };

  const pct = Math.round((p.chapterNumber / p.chapterCount) * 100);

  return (
    <div ref={page} className={s.page} style={{ "--cloth": cloth.cloth } as CSSProperties}>
      <div className={s.headband} aria-hidden="true" />

      <div className={`${s.bar} ${s.top} ${shown ? "" : s.hidden}`} inert={!shown}>
        <div className={s.barInner}>
          <Link href={p.bookHref} className={s.icon} aria-label={`Back to ${p.bookTitle}`}>
            <ChevronLeft size={22} strokeWidth={1.6} />
          </Link>
          <span className={s.barTitle}>{p.bookTitle}</span>
          {p.sharePath && <ShareButton path={p.sharePath} title={`${p.bookTitle}: ${p.chapterTitle}`} className={s.icon} iconOnly label="Share this chapter" />}
          <button className={s.icon} aria-label="Reading settings" onClick={openSettings}>
            <Type size={20} strokeWidth={1.6} />
          </button>
          <button className={`${s.icon} ${s.withCount}`} aria-label={`Bookmarks (${bookMarks.length})`}
            onClick={() => marksSheet.current?.showModal()}>
            <Bookmark size={20} strokeWidth={1.6} />
            {bookMarks.length > 0 && <span className={s.count} aria-hidden="true">{bookMarks.length}</span>}
          </button>
        </div>
      </div>

      <article className={s.article} onClick={onTap} data-protected>
        <header className={s.head}>
          <span className={s.number}>Chapter {p.chapterNumber}</span>
          <h1 className={s.title}>{p.chapterTitle}</h1>
        </header>
        <div ref={textBox} className={s.veilable}>
          {p.textState === "loading" ? (
            <p className={s.textNote} aria-live="polite">Opening the chapter…</p>
          ) : p.textState === "error" ? (
            <p className={s.textNote} role="alert">This chapter couldn&rsquo;t be loaded. Check your connection and reload the page.</p>
          ) : (
            <ChapterText blocks={p.blocks} meta={meta} bookmarks={bookMarks} userId={p.userId} />
          )}
        </div>

        {!p.textState && <footer ref={endRef} className={s.end}>
          {p.ending.kind === "end" && (
            <>
              <p className={s.theEnd}>The End</p>
              <p className={s.endNote}>You have finished {p.bookTitle}.</p>
            </>
          )}
          {p.ending.kind === "soon" && (
            <>
              <div className={s.stamp}>
                <strong>Coming soon</strong>
                <span>{p.ending.date ? `Next chapter ${p.ending.date}` : "The next chapter is being written"}</span>
              </div>
              {p.author && (
                <p className={s.endNote}>
                  <Link href={p.author.href} className={s.endLink}>Follow {p.author.name}</Link> to see new chapters on your home page.
                </p>
              )}
            </>
          )}
          {p.ending.kind === "next" && p.nextHref && (
            <Link href={p.nextHref} className={s.navLink}>Next chapter <ChevronRight size={18} strokeWidth={1.6} /></Link>
          )}
        </footer>}
      </article>

      <div className={`${s.bar} ${s.bottom} ${shown ? "" : s.hidden}`} inert={!shown}>
        <div className={s.progress} role="progressbar" aria-label="Progress through the book" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <span style={{ width: `${pct}%` }} />
        </div>
        <div className={s.barInner}>
          <nav className={s.chapterNav} aria-label="Chapters">
            <Link href={p.prevHref ?? "#"} className={s.navLink} aria-disabled={!p.prevHref}>
              <ChevronLeft size={18} strokeWidth={1.6} /> Previous
            </Link>
            <span className={s.where} aria-label={`Chapter ${p.chapterNumber} of ${p.chapterCount}, ${p.minutesLeft} minutes left`}>
              {p.chapterNumber} of {p.chapterCount} · {p.minutesLeft} min left
            </span>
            <Link href={p.nextHref ?? "#"} className={s.navLink} aria-disabled={!p.nextHref}>
              Next <ChevronRight size={18} strokeWidth={1.6} />
            </Link>
          </nav>
        </div>
      </div>

      {showOffer && !shown && (
        <div className={s.resume} data-ui role="region" aria-label="Your place">
          <button type="button" className={s.resumeGo}
            onClick={() => { setOfferGone(true); toPara(p.offer!, true); }}>
            <span className={s.ribbon} aria-hidden="true" />
            Resume where you left off
          </button>
          <button type="button" className={s.resumeX} aria-label="Stay at the top" onClick={() => setOfferGone(true)}>
            <X size={18} strokeWidth={1.6} />
          </button>
        </div>
      )}

      <SettingsSheet
        ref={settings}
        theme={theme}
        read={read}
        onTheme={(t) => { setTheme(t); applyTheme(t); }}
        onRead={(r) => { setRead(r); applyRead(r); }}
      />
      <BookmarksSheet ref={marksSheet} bookTitle={p.bookTitle} items={bookMarks} chapterHref={p.chapterHref} />
    </div>
  );
}
