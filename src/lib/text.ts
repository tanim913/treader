// The chapter text model. Positions are character offsets inside a paragraph,
// so they stay valid when the text is later drawn with a scrambled font.
export type Run = { t: string; i?: boolean; b?: boolean };
export type Block = { type: "p"; runs: Run[] } | { type: "hr" };
export type Pos = { p: number; o: number };
export type Range = { start: Pos; end: Pos }; // end is exclusive
export type Token = { s: number; e: number; t: string; space: boolean; i?: boolean; b?: boolean };

export const cmp = (a: Pos, b: Pos) => a.p - b.p || a.o - b.o;

export function tokenize(runs: Run[]): Token[] {
  const out: Token[] = [];
  let o = 0;
  for (const r of runs) {
    const re = /(\s+)|(\S+)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(r.t))) {
      out.push({ s: o + m.index, e: o + m.index + m[0].length, t: m[0], space: !!m[1], i: r.i, b: r.b });
    }
    o += r.t.length;
  }
  return out;
}

export const plain = (b: Block) => (b.type === "p" ? b.runs.map((r) => r.t).join("") : "");

export function quoteOf(blocks: Block[], r: Range): string {
  const parts: string[] = [];
  for (let p = r.start.p; p <= r.end.p; p++) {
    const b = blocks[p];
    if (!b || b.type !== "p") continue;
    const t = plain(b);
    parts.push(t.slice(p === r.start.p ? r.start.o : 0, p === r.end.p ? r.end.o : t.length));
  }
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

/** The part of a range that falls inside paragraph p, as [s, e), or null. */
export function sliceIn(r: Range, p: number): [number, number] | null {
  if (p < r.start.p || p > r.end.p) return null;
  return [p === r.start.p ? r.start.o : 0, p === r.end.p ? r.end.o : Number.MAX_SAFE_INTEGER];
}

/** Plain strings to blocks: "" or "***" becomes a scene break, *text* becomes italic. */
export function blocksFrom(paragraphs: string[]): Block[] {
  return paragraphs.map((t) => {
    if (t.trim() === "" || t.trim() === "***") return { type: "hr" } as Block;
    const runs: Run[] = t.split(/(\*[^*]+\*)/).filter(Boolean).map((x) =>
      x.startsWith("*") && x.endsWith("*") ? { t: x.slice(1, -1), i: true } : { t: x });
    return { type: "p", runs };
  });
}
