"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Bookmark, ChevronLeft, ChevronRight, Type } from "lucide-react";
import { clothOf } from "@/lib/cloth";
import { SettingsSheet } from "./SettingsSheet";
import { DEFAULT_READ, applyRead, applyTheme, loadRead, loadTheme, type ReadSettings, type Theme } from "./settings";
import s from "./Reader.module.css";

export type ReaderProps = {
  bookTitle: string;
  bookHref: string;
  cloth: string;
  chapterNumber: number;
  chapterCount: number;
  chapterTitle: string;
  minutesLeft: number;
  prevHref: string | null;
  nextHref: string | null;
  /** "next" = more chapters published; "soon" = writer hasn't published more yet; "end" = book finished */
  ending: { kind: "next" } | { kind: "soon"; date?: string } | { kind: "end" };
  children: ReactNode;
};

export function Reader(p: ReaderProps) {
  const [shown, setShown] = useState(false);
  const [marked, setMarked] = useState(false);
  const [theme, setTheme] = useState<Theme>("system");
  const [read, setRead] = useState<ReadSettings>(DEFAULT_READ);
  const sheet = useRef<HTMLDialogElement>(null);
  const cloth = clothOf(p.cloth);

  // Saved settings are applied before paint by the script in the root layout;
  // the sheet reads them when it opens.
  const openSettings = () => {
    setTheme(loadTheme());
    setRead(loadRead());
    sheet.current?.showModal();
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

  const onTap = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("a,button")) return;
    setShown((v) => !v);
  };

  const pct = Math.round((p.chapterNumber / p.chapterCount) * 100);

  return (
    <div className={s.page} style={{ "--cloth": cloth.cloth } as CSSProperties}>
      <div className={s.headband} aria-hidden="true" />
      {marked && <div className={s.ribbon} aria-hidden="true" />}

      <div className={`${s.bar} ${s.top} ${shown ? "" : s.hidden}`} inert={!shown}>
        <div className={s.barInner}>
          <Link href={p.bookHref} className={s.icon} aria-label={`Back to ${p.bookTitle}`}>
            <ChevronLeft size={22} strokeWidth={1.6} />
          </Link>
          <span className={s.barTitle}>{p.bookTitle}</span>
          <button className={s.icon} aria-label="Reading settings" onClick={openSettings}>
            <Type size={20} strokeWidth={1.6} />
          </button>
          <button className={s.icon} aria-label={marked ? "Remove bookmark" : "Bookmark this place"} aria-pressed={marked}
            onClick={() => setMarked((m) => !m)}>
            <Bookmark size={20} strokeWidth={1.6} fill={marked ? "currentColor" : "none"} />
          </button>
        </div>
      </div>

      <article className={s.article} onClick={onTap}>
        <header className={s.head}>
          <span className={s.number}>Chapter {p.chapterNumber}</span>
          <h1 className={s.title}>{p.chapterTitle}</h1>
        </header>
        <div className={s.text}>{p.children}</div>

        <footer className={s.end}>
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
              <p className={s.endNote}>Follow the writer to hear when it arrives.</p>
            </>
          )}
          {p.ending.kind === "next" && p.nextHref && (
            <Link href={p.nextHref} className={s.navLink}>Next chapter <ChevronRight size={18} strokeWidth={1.6} /></Link>
          )}
        </footer>
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
            <span className={s.where} aria-label={`Chapter ${p.chapterNumber} of ${p.chapterCount}, ${p.minutesLeft} minutes left`}>{p.chapterNumber} of {p.chapterCount} · {p.minutesLeft} min left</span>
            <Link href={p.nextHref ?? "#"} className={s.navLink} aria-disabled={!p.nextHref}>
              Next <ChevronRight size={18} strokeWidth={1.6} />
            </Link>
          </nav>
        </div>
      </div>

      <SettingsSheet
        ref={sheet}
        theme={theme}
        read={read}
        onTheme={(t) => { setTheme(t); applyTheme(t); }}
        onRead={(r) => { setRead(r); applyRead(r); }}
      />
    </div>
  );
}
