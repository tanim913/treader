"use client";

import { useState } from "react";
import { Monitor, Smartphone } from "lucide-react";
import type { Block } from "@/lib/text";
import { tokenize } from "@/lib/text";
import t from "@/components/reader/ChapterText.module.css";
import r from "@/components/reader/Reader.module.css";
import s from "./ChapterEditor.module.css";

export function ChapterPreview({ number, title, blocks }: { number: number; title: string; blocks: Block[] }) {
  const [size, setSize] = useState<"phone" | "desktop">("phone");
  return (
    <div className={s.previewBody}>
      <div className={s.sizes} role="group" aria-label="Preview size">
        <button type="button" aria-pressed={size === "phone"} onClick={() => setSize("phone")}><Smartphone size={16} /> Phone</button>
        <button type="button" aria-pressed={size === "desktop"} onClick={() => setSize("desktop")}><Monitor size={16} /> Desktop</button>
      </div>
      <div className={`${s.device} ${size === "phone" ? s.phone : s.desktop}`}>
        <div className={r.headband} aria-hidden="true" />
        <article className={r.article} style={{ paddingTop: 40 }}>
          <header className={r.head}>
            <span className={r.number}>Chapter {number}</span>
            <h1 className={r.title}>{title}</h1>
          </header>
          <div className={t.text} style={{ userSelect: "text" }}>
            {blocks.map((b, i) =>
              b.type === "hr" ? <hr key={i} /> : (
                <p key={i}>
                  {tokenize(b.runs).map((tok) => tok.i ? <em key={tok.s}>{tok.t}</em> : tok.b ? <strong key={tok.s}>{tok.t}</strong> : tok.t)}
                </p>
              ))}
            {!blocks.length && <p>Nothing written yet.</p>}
          </div>
        </article>
      </div>
    </div>
  );
}
