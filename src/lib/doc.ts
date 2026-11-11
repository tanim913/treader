// Chapter content is stored as Tiptap JSON. The reader works on Blocks (src/lib/text.ts).
import type { Block, Run } from "./text";

export type TNode = {
  type: string;
  text?: string;
  marks?: { type: string }[];
  attrs?: Record<string, unknown>;
  content?: TNode[];
};

export const EMPTY_DOC: TNode = { type: "doc", content: [{ type: "paragraph" }] };

function runsOf(n: TNode, bold = false): Run[] {
  const out: Run[] = [];
  for (const c of n.content ?? []) {
    if (c.type === "text" && c.text) {
      const marks = new Set((c.marks ?? []).map((m) => m.type));
      out.push({ t: c.text, i: marks.has("italic") || undefined, b: bold || marks.has("bold") || undefined });
    } else if (c.type === "hardBreak") {
      out.push({ t: " " });
    }
  }
  return out;
}

/** Flattens the editor document into paragraphs and scene breaks. Headings become bold paragraphs; quotes and lists become paragraphs. */
export function toBlocks(doc: TNode | null | undefined): Block[] {
  const blocks: Block[] = [];
  const walk = (nodes: TNode[] | undefined) => {
    for (const n of nodes ?? []) {
      if (n.type === "horizontalRule") blocks.push({ type: "hr" });
      else if (n.type === "paragraph" || n.type === "heading") {
        const runs = runsOf(n, n.type === "heading");
        const plainText = runs.map((r) => r.t).join("").trim();
        // a paragraph that is only "***" or "* * *" (common in pasted manuscripts) is a scene break
        if (/^(\*\s*){3}$|^#$/.test(plainText)) { blocks.push({ type: "hr" }); continue; }
        if (runs.some((r) => r.t.trim())) blocks.push({ type: "p", runs });
      } else walk(n.content);
    }
  };
  walk(doc?.content);
  // no scene break at the very start or end, and never two in a row
  return blocks.filter((b, i, a) => b.type !== "hr" || (i > 0 && i < a.length - 1 && a[i - 1].type !== "hr"));
}

export function wordCount(doc: TNode | null | undefined): number {
  let n = 0;
  const walk = (nodes: TNode[] | undefined) => {
    for (const c of nodes ?? []) {
      if (c.text) n += c.text.split(/\s+/).filter(Boolean).length;
      walk(c.content);
    }
  };
  walk(doc?.content);
  return n;
}

export const minutesFor = (words: number) => Math.max(1, Math.round(words / 230));

export function slugify(title: string): string {
  const s = title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
  return s || "book";
}

/** Plain text pasted without formatting: blank-line paragraphs, *** for scene breaks, *word* for italics. */
export function plainTextToDoc(text: string): TNode {
  const paras = text.replace(/\r\n?/g, "\n").split(/\n\s*\n|\n(?=\s*(?:\*\s*){3}\s*$)/m);
  const content: TNode[] = [];
  for (const raw of paras) {
    const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
    if (!lines.length) continue;
    if (lines.length === 1 && /^(\*\s*){3}$|^#$|^-{3,}$/.test(lines[0])) {
      content.push({ type: "horizontalRule" });
      continue;
    }
    // single newlines inside a block: treat each line as its own paragraph (manuscripts often use one line per paragraph)
    for (const line of lines) {
      if (/^(\*\s*){3}$|^-{3,}$/.test(line)) { content.push({ type: "horizontalRule" }); continue; }
      const parts = line.split(/(\*[^*\s][^*]*\*|_[^_\s][^_]*_)/).filter(Boolean);
      content.push({
        type: "paragraph",
        content: parts.map((p) =>
          /^(\*[^*]+\*|_[^_]+_)$/.test(p)
            ? { type: "text", text: p.slice(1, -1), marks: [{ type: "italic" }] }
            : { type: "text", text: p }),
      });
    }
  }
  return { type: "doc", content: content.length ? content : [{ type: "paragraph" }] };
}
