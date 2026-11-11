"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { cmp, quoteOf, sliceIn, tokenize, type Block, type Pos, type Range } from "@/lib/text";
import { addBookmark, jumpToBookmark, removeBookmark, updateNote, type Bookmark } from "@/lib/bookmarks/local";
import { SelectionPopup } from "./SelectionPopup";
import s from "./ChapterText.module.css";

type Tok = { p: number; s: number; e: number };
type Mark = { id: string; s: number; e: number; anchor: boolean };
type Popup = { kind: "new" } | { kind: "edit"; id: string };
type Place = { x: number; y: number; below: boolean; handles: { sx: number; sy: number; sh: number; ex: number; ey: number; eh: number } | null };

export type ChapterMeta = {
  bookId: string;
  bookTitle: string;
  cloth: string;
  chapterNumber: number;
  chapterTitle: string;
  href: string;
};

const LONG_PRESS_MS = 420;

function tokAt(el: Element | null): Tok | null {
  const span = el?.closest?.("[data-s]") as HTMLElement | null;
  const para = span?.closest("[data-p]") as HTMLElement | null;
  if (!span || !para) return null;
  // a space between words counts as the word before it
  let w: HTMLElement | null = span;
  if (w.dataset.sp) w = (w.previousElementSibling as HTMLElement | null) ?? (w.nextElementSibling as HTMLElement | null);
  if (!w) return null;
  return { p: Number(para.dataset.p), s: Number(w.dataset.s), e: Number(w.dataset.e) };
}

function rangeOf(a: Tok, b: Tok): Range {
  const A: Pos = { p: a.p, o: a.s };
  const B: Pos = { p: b.p, o: b.s };
  return cmp(A, B) <= 0
    ? { start: A, end: { p: b.p, o: b.e } }
    : { start: B, end: { p: a.p, o: a.e } };
}

const Para = memo(function Para({ p, block, sel, marks }: {
  p: number;
  block: Extract<Block, { type: "p" }>;
  sel: [number, number] | null;
  marks: Mark[] | undefined;
}) {
  const tokens = useMemo(() => tokenize(block.runs), [block]);
  return (
    <p data-p={p}>
      {tokens.map((t) => {
        const inSel = sel !== null && t.s >= sel[0] && t.e <= sel[1];
        const m = marks?.find((m) => t.s >= m.s && t.e <= m.e);
        const text = t.i ? <em>{t.t}</em> : t.b ? <strong>{t.t}</strong> : t.t;
        return (
          <span
            key={t.s}
            data-s={t.s}
            data-e={t.e}
            data-sp={t.space ? 1 : undefined}
            data-bm={m?.id}
            data-sel={inSel ? "" : undefined}
            id={m && m.anchor && t.s === m.s ? `bm-${m.id}` : undefined}
          >
            {text}
          </span>
        );
      })}
    </p>
  );
});

export function ChapterText({ blocks, meta, bookmarks }: { blocks: Block[]; meta: ChapterMeta; bookmarks: Bookmark[] }) {
  const box = useRef<HTMLDivElement>(null);
  const [range, setRange] = useState<Range | null>(null);
  const [popup, setPopup] = useState<Popup | null>(null);
  const [place, setPlace] = useState<Place | null>(null);

  // drag state lives in refs: it changes on every pointer move
  const anchor = useRef<Tok | null>(null);
  const dragging = useRef(false);
  const suppressClick = useRef(false);
  const press = useRef<{ timer: number; x: number; y: number } | null>(null);

  const mine = useMemo(() => bookmarks.filter((b) => b.href === meta.href), [bookmarks, meta.href]);

  const marksByPara = useMemo(() => {
    const map = new Map<number, Mark[]>();
    for (const b of mine) {
      for (let p = b.start.p; p <= b.end.p; p++) {
        const sl = sliceIn(b, p);
        if (!sl) continue;
        const list = map.get(p) ?? [];
        list.push({ id: b.id, s: sl[0], e: sl[1], anchor: p === b.start.p });
        map.set(p, list);
      }
    }
    return map;
  }, [mine]);

  /** Measures the drawn selection (or a bookmark) and places the popup and handles. */
  const measure = (selector: string, withHandles: boolean) => {
    const c = box.current;
    if (!c) return;
    const parts = c.querySelectorAll<HTMLElement>(selector);
    if (!parts.length) return;
    const cr = c.getBoundingClientRect();
    const first = parts[0].getBoundingClientRect();
    const last = parts[parts.length - 1].getBoundingClientRect();
    const below = first.top < 230;
    let left = Infinity, right = -Infinity;
    parts.forEach((el) => { const r = el.getBoundingClientRect(); left = Math.min(left, r.left); right = Math.max(right, r.right); });
    setPlace({
      x: Math.min(Math.max((left + right) / 2 - cr.left, 0), cr.width),
      y: below ? last.bottom - cr.top + (withHandles ? 26 : 10) : first.top - cr.top - 10,
      below,
      handles: withHandles
        ? { sx: first.left - cr.left, sy: first.top - cr.top, sh: first.height, ex: last.right - cr.left, ey: last.top - cr.top, eh: last.height }
        : null,
    });
  };

  const startDrag = (from: Tok, to: Tok = from) => {
    anchor.current = from;
    dragging.current = true;
    setPopup(null);
    setPlace(null);
    setRange(rangeOf(from, to));
  };

  const moveTo = (x: number, y: number) => {
    if (!dragging.current || !anchor.current) return;
    const t = tokAt(document.elementFromPoint(x, y));
    if (t) setRange(rangeOf(anchor.current, t));
  };

  const endDrag = () => {
    if (!dragging.current) return;
    dragging.current = false;
    suppressClick.current = true;
    setPopup({ kind: "new" });
    // the selection is already drawn from the last move; measure it next frame
    requestAnimationFrame(() => measure("[data-sel]", true));
  };

  const clear = () => {
    setRange(null);
    setPopup(null);
    setPlace(null);
    anchor.current = null;
  };

  // Touch: press and hold starts a selection; dragging extends it.
  // touchmove must be non-passive so the page doesn't scroll while selecting.
  useEffect(() => {
    const c = box.current;
    if (!c) return;
    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1 || (e.target as Element).closest("[data-ui]")) return;
      suppressClick.current = false;
      const touch = e.touches[0];
      const t = tokAt(e.target as Element);
      if (!t) return;
      const timer = window.setTimeout(() => {
        press.current = null;
        navigator.vibrate?.(8);
        startDrag(t);
      }, LONG_PRESS_MS);
      press.current = { timer, x: touch.clientX, y: touch.clientY };
    };
    const onMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (press.current && Math.hypot(touch.clientX - press.current.x, touch.clientY - press.current.y) > 10) {
        window.clearTimeout(press.current.timer);
        press.current = null;
      }
      if (dragging.current) {
        e.preventDefault();
        moveTo(touch.clientX, touch.clientY - 24); // aim just above the finger
      }
    };
    const onEnd = () => {
      if (press.current) { window.clearTimeout(press.current.timer); press.current = null; }
      endDrag();
    };
    c.addEventListener("touchstart", onStart, { passive: true });
    c.addEventListener("touchmove", onMove, { passive: false });
    c.addEventListener("touchend", onEnd);
    c.addEventListener("touchcancel", onEnd);
    return () => {
      c.removeEventListener("touchstart", onStart);
      c.removeEventListener("touchmove", onMove);
      c.removeEventListener("touchend", onEnd);
      c.removeEventListener("touchcancel", onEnd);
    };
  });

  // Opening a chapter from a bookmark link (#bm-<id>) jumps to that line.
  const jumped = useRef(false);
  useEffect(() => {
    if (jumped.current || !mine.length) return;
    const h = window.location.hash;
    if (h.startsWith("#bm-") && jumpToBookmark(h.slice(4))) jumped.current = true;
  }, [mine]);

  // Mouse: click and drag selects; double-click selects a word.
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse" || e.button !== 0 || (e.target as Element).closest("[data-ui]")) return;
    suppressClick.current = false;
    anchor.current = tokAt(e.target as Element);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse" || !(e.buttons & 1) || !anchor.current) return;
    if (!dragging.current) {
      const t = tokAt(e.target as Element);
      if (!t || (t.p === anchor.current.p && t.s === anchor.current.s)) return;
      startDrag(anchor.current, t);
    }
    moveTo(e.clientX, e.clientY);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    endDrag();
  };
  const onDoubleClick = (e: React.MouseEvent) => {
    const t = tokAt(e.target as Element);
    if (!t) return;
    startDrag(t);
    endDrag();
  };

  // A tap clears a selection, opens a bookmark, or (otherwise) reaches the reader to show its controls.
  const onClick = (e: React.MouseEvent) => {
    if ((e.target as Element).closest("[data-ui]")) { e.stopPropagation(); return; }
    if (suppressClick.current) { suppressClick.current = false; e.stopPropagation(); return; }
    if (range || popup) { clear(); e.stopPropagation(); return; }
    const id = (e.target as Element).closest<HTMLElement>("[data-bm]")?.dataset.bm;
    if (id) {
      e.stopPropagation();
      setPopup({ kind: "edit", id });
      measure(`[data-bm="${id}"]`, false);
    }
  };

  // Handles: drag either end of a selection to adjust it (mouse or touch).
  const onHandleDown = (e: React.PointerEvent<HTMLElement>) => {
    const c = box.current;
    if (!range || !c) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    // the end that stays put becomes the anchor
    const words = [...c.querySelectorAll<HTMLElement>("[data-sel]:not([data-sp])")];
    const fixed = e.currentTarget.dataset.which === "start" ? words[words.length - 1] : words[0];
    const t = tokAt(fixed ?? null);
    if (!t) return;
    anchor.current = t;
    dragging.current = true;
    setPopup(null); // the handles stay mounted so they keep the pointer
  };
  const onHandleMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    moveTo(e.clientX, e.clientY - (e.pointerType === "touch" ? 24 : 0));
  };
  const onHandleUp = () => endDrag();

  const save = (note: string) => {
    if (popup?.kind === "edit") updateNote(popup.id, note);
    else if (range) addBookmark({ ...meta, ...range, quote: quoteOf(blocks, range), note });
    clear();
  };
  const del = () => {
    if (popup?.kind === "edit") removeBookmark(popup.id);
    clear();
  };

  useEffect(() => {
    if (!popup) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") clear(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [popup]);

  const editing = popup?.kind === "edit" ? mine.find((b) => b.id === popup.id) : undefined;

  return (
    <div
      ref={box}
      className={s.text}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onDoubleClick={onDoubleClick}
      onClick={onClick}
    >
      {blocks.map((b, p) =>
        b.type === "hr" ? (
          <hr key={p} />
        ) : (
          <Para key={p} p={p} block={b} sel={range ? sliceIn(range, p) : null} marks={marksByPara.get(p)} />
        ),
      )}

      {range && place?.handles && (
        <>
          <span data-ui className={`${s.handle} ${s.hStart}`}
            style={{ left: place.handles.sx, top: place.handles.sy, height: place.handles.sh }}
            data-which="start" onPointerDown={onHandleDown} onPointerMove={onHandleMove} onPointerUp={onHandleUp}
            aria-hidden="true" />
          <span data-ui className={`${s.handle} ${s.hEnd}`}
            style={{ left: place.handles.ex, top: place.handles.ey, height: place.handles.eh }}
            data-which="end" onPointerDown={onHandleDown} onPointerMove={onHandleMove} onPointerUp={onHandleUp}
            aria-hidden="true" />
        </>
      )}

      {popup && place && (
        <SelectionPopup
          key={popup.kind === "edit" ? popup.id : "new"}
          x={place.x}
          y={place.y}
          below={place.below}
          editing={!!editing}
          initialNote={editing?.note ?? ""}
          onSave={save}
          onDelete={del}
          onCancel={clear}
        />
      )}
    </div>
  );
}
