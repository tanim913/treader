"use client";

import { useEffect, useState } from "react";
import type { Block } from "@/lib/text";
import { loadCipherFonts } from "@/lib/cipher/fonts";
import { readLocalPlaces } from "@/lib/progress";
import { Reader, type ReaderProps } from "./Reader";

type Saved = { chapterId: string; paragraph: number } | null;

/** Fetches the chapter text after the page loads, so it is never in the page source.
 *  `saved` is the signed-in reader's place in this book; guests' comes from this browser. */
export function ReaderLoader({ saved, ...props }: Omit<ReaderProps, "blocks" | "textState" | "jumpTo" | "offer"> & { saved: Saved }) {
  const [text, setText] = useState<{ k: number; blocks: Block[] } | null>(null);
  const [place, setPlace] = useState<{ jumpTo?: number; offer?: number }>({});
  const [failed, setFailed] = useState(false);
  const { chapterId, bookId, userId } = props;

  useEffect(() => {
    let alive = true;
    fetch(`/api/read?c=${chapterId}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(async (d: { k: number; blocks: Block[] }) => {
        await loadCipherFonts(d.k);
        if (!alive) return;
        setText(d);
        // a Continue link says where to open; otherwise offer the saved place in this chapter
        const hash = /^#p-(\d+)$/.exec(window.location.hash);
        if (hash) { setPlace({ jumpTo: Number(hash[1]) }); return; }
        if (window.location.hash) return; // a bookmark link (#bm-…) jumps on its own
        const mine = userId ? saved : readLocalPlaces().find((x) => x.bookId === bookId) ?? null;
        if (mine && mine.chapterId === chapterId && mine.paragraph >= 2) setPlace({ offer: mine.paragraph });
      })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [chapterId, bookId, userId, saved]);

  return <Reader {...props} {...place} blocks={text?.blocks ?? []} cipherKey={text?.k} textState={failed ? "error" : text ? undefined : "loading"} />;
}
