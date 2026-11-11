"use client";

import { useEffect, useState } from "react";
import type { Block } from "@/lib/text";
import { loadCipherFonts } from "@/lib/cipher/fonts";
import { Reader, type ReaderProps } from "./Reader";

/** Fetches the chapter text after the page loads, so it is never in the page source. */
export function ReaderLoader({ chapterId, ...props }: Omit<ReaderProps, "blocks" | "textState"> & { chapterId: string }) {
  const [text, setText] = useState<{ k: number; blocks: Block[] } | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch(`/api/read?c=${chapterId}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(async (d: { k: number; blocks: Block[] }) => {
        await loadCipherFonts(d.k);
        if (alive) setText(d);
      })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [chapterId]);

  return <Reader {...props} blocks={text?.blocks ?? []} cipherKey={text?.k} textState={failed ? "error" : text ? undefined : "loading"} />;
}
