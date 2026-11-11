"use client";

import { useEffect, useState } from "react";
import type { Block } from "@/lib/text";
import { Reader, type ReaderProps } from "./Reader";

/** Fetches the chapter text after the page loads, so it is never in the page source. */
export function ReaderLoader({ chapterId, ...props }: Omit<ReaderProps, "blocks" | "textState"> & { chapterId: string }) {
  const [blocks, setBlocks] = useState<Block[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch(`/api/read?c=${chapterId}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d: { blocks: Block[] }) => { if (alive) setBlocks(d.blocks); })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [chapterId]);

  return <Reader {...props} blocks={blocks ?? []} textState={failed ? "error" : blocks ? undefined : "loading"} />;
}
