"use client";
// Reads an EPUB in the browser: metadata, cover, and the reading order (spine)
// turned into chapters of editor JSON. Nothing is uploaded until the writer imports.
import JSZip from "jszip";
import type { TNode } from "./doc";

export type EpubChapter = { title: string; doc: TNode; words: number; suggested: boolean };
export type EpubBook = {
  title: string;
  author: string;
  description: string;
  cover: Blob | null;
  chapters: EpubChapter[];
};

const BLOCK = new Set(["p", "h1", "h2", "h3", "h4", "h5", "h6", "li", "pre", "dt", "dd", "figcaption", "td"]);
const SKIP = new Set(["script", "style", "head", "nav", "svg", "math", "aside", "img", "figure", "table"]);
const FRONT = /^(contents|table of contents|copyright|cover|title page|also by|dedication|about the author|acknowledg)/i;
const SCENE = /^\s*(?:[*•·#~◇◆❖⁂]\s*){1,5}\s*$/;

function joinPath(base: string, href: string) {
  const parts = (base.includes("/") ? base.slice(0, base.lastIndexOf("/") + 1) : "").concat(href).split("/");
  const out: string[] = [];
  for (const p of parts) {
    if (p === "..") out.pop();
    else if (p !== "." && p !== "") out.push(p);
  }
  return out.join("/");
}

const text = (el: Element | null | undefined) => (el?.textContent ?? "").replace(/\s+/g, " ").trim();

function byLocal(doc: Document | Element, name: string): Element[] {
  return Array.from(doc.getElementsByTagName("*")).filter((e) => e.localName === name);
}

/** Inline content of a block element as Tiptap text nodes with italic/bold marks. */
function inline(el: Element): TNode[] {
  const out: TNode[] = [];
  const walk = (n: Node, marks: string[]) => {
    if (n.nodeType === Node.TEXT_NODE) {
      const t = (n.textContent ?? "").replace(/\s+/g, " ");
      if (t) out.push(marks.length ? { type: "text", text: t, marks: marks.map((m) => ({ type: m })) } : { type: "text", text: t });
      return;
    }
    if (n.nodeType !== Node.ELEMENT_NODE) return;
    const e = n as Element;
    const tag = e.localName;
    if (SKIP.has(tag)) return;
    if (tag === "br") { out.push({ type: "text", text: " " }); return; }
    const style = (e.getAttribute("style") ?? "").toLowerCase();
    const next = [...marks];
    if ((tag === "em" || tag === "i" || /font-style:\s*italic/.test(style)) && !next.includes("italic")) next.push("italic");
    if ((tag === "strong" || tag === "b" || /font-weight:\s*(bold|[6-9]00)/.test(style)) && !next.includes("bold")) next.push("bold");
    e.childNodes.forEach((c) => walk(c, next));
  };
  el.childNodes.forEach((c) => walk(c, []));
  // trim the edges and merge neighbours with the same marks
  if (out[0]?.text) out[0].text = out[0].text.replace(/^\s+/, "");
  const last = out[out.length - 1];
  if (last?.text) last.text = last.text.replace(/\s+$/, "");
  const merged: TNode[] = [];
  for (const n of out.filter((x) => x.text)) {
    const prev = merged[merged.length - 1];
    if (prev && JSON.stringify(prev.marks ?? []) === JSON.stringify(n.marks ?? [])) prev.text += n.text!;
    else merged.push({ ...n });
  }
  return merged;
}

function hasBlockChild(el: Element) {
  return Array.from(el.children).some((c) => BLOCK.has(c.localName) || c.localName === "div" || c.localName === "section" || c.localName === "blockquote" || c.localName === "hr");
}

/** Turns one XHTML document into paragraphs and scene breaks. The first heading becomes the title. */
function convert(body: Element): { title: string; content: TNode[] } {
  const content: TNode[] = [];
  let title = "";
  const push = (nodes: TNode[], heading: boolean) => {
    const plain = nodes.map((n) => n.text).join("").trim();
    if (!plain) return;
    if (SCENE.test(plain)) { content.push({ type: "horizontalRule" }); return; }
    if (heading && !title && content.length === 0) { title = plain; return; }
    content.push({ type: "paragraph", content: heading ? nodes.map((n) => ({ ...n, marks: [{ type: "bold" }] })) : nodes });
  };
  const walk = (el: Element) => {
    for (const c of Array.from(el.children)) {
      const tag = c.localName;
      if (SKIP.has(tag)) continue;
      if (tag === "hr") { content.push({ type: "horizontalRule" }); continue; }
      const cls = (c.getAttribute("class") ?? "").toLowerCase();
      if (/(^|\s)(scene|section)?-?break|space-?break|ornament|dinkus/.test(cls) && !text(c)) { content.push({ type: "horizontalRule" }); continue; }
      if (BLOCK.has(tag) || ((tag === "div" || tag === "section" || tag === "blockquote") && !hasBlockChild(c))) {
        push(inline(c), /^h[1-6]$/.test(tag));
      } else {
        walk(c);
      }
    }
  };
  walk(body);
  // tidy scene breaks: none first or last, never two together
  const clean = content.filter((n, i, a) => n.type !== "horizontalRule" || (i > 0 && i < a.length - 1 && a[i - 1].type !== "horizontalRule"));
  return { title, content: clean };
}

function words(nodes: TNode[]) {
  return nodes.reduce((a, n) => a + (n.content ?? []).reduce((b, t) => b + (t.text ?? "").split(/\s+/).filter(Boolean).length, 0), 0);
}

export async function readEpub(file: File): Promise<EpubBook> {
  const zip = await JSZip.loadAsync(file);
  if (zip.file("META-INF/encryption.xml") || zip.file("META-INF/rights.xml")) {
    const enc = await zip.file("META-INF/encryption.xml")?.async("string");
    if (!enc || /EncryptedData/.test(enc) && !/font/i.test(enc)) {
      throw new Error("This EPUB is copy-protected (DRM), so it can't be imported. Export an unprotected EPUB from your writing app and try again.");
    }
  }
  const xml = (s: string) => new DOMParser().parseFromString(s, "application/xml");
  const container = await zip.file("META-INF/container.xml")?.async("string");
  if (!container) throw new Error("This file doesn't look like an EPUB.");
  const opfPath = byLocal(xml(container), "rootfile")[0]?.getAttribute("full-path");
  const opfText = opfPath ? await zip.file(opfPath)?.async("string") : null;
  if (!opfPath || !opfText) throw new Error("This EPUB is missing its table of contents file.");
  const opf = xml(opfText);

  const manifest = new Map<string, { href: string; type: string; props: string }>();
  for (const it of byLocal(opf, "item")) {
    manifest.set(it.getAttribute("id") ?? "", {
      href: joinPath(opfPath, decodeURIComponent(it.getAttribute("href") ?? "")),
      type: it.getAttribute("media-type") ?? "",
      props: it.getAttribute("properties") ?? "",
    });
  }

  const title = text(byLocal(opf, "title")[0]) || file.name.replace(/\.epub$/i, "");
  const author = text(byLocal(opf, "creator")[0]);
  const description = (() => {
    const raw = byLocal(opf, "description")[0]?.textContent ?? "";
    return new DOMParser().parseFromString(raw, "text/html").body.textContent?.replace(/\s+/g, " ").trim() ?? "";
  })();

  // cover: EPUB 3 "cover-image", or EPUB 2 <meta name="cover" content="id">
  let coverHref = [...manifest.values()].find((m) => m.props.includes("cover-image"))?.href;
  if (!coverHref) {
    const id = byLocal(opf, "meta").find((m) => m.getAttribute("name") === "cover")?.getAttribute("content");
    if (id) coverHref = manifest.get(id)?.href;
  }
  const coverFile = coverHref ? zip.file(coverHref) : null;
  const cover = coverFile && /\.(jpe?g|png|webp)$/i.test(coverHref ?? "")
    ? new Blob([await coverFile.async("arraybuffer")], { type: /png$/i.test(coverHref!) ? "image/png" : /webp$/i.test(coverHref!) ? "image/webp" : "image/jpeg" })
    : null;

  const chapters: EpubChapter[] = [];
  for (const ref of byLocal(opf, "itemref")) {
    const item = manifest.get(ref.getAttribute("idref") ?? "");
    if (!item || item.props.includes("nav") || !/x?html/.test(item.type)) continue;
    const src = await zip.file(item.href)?.async("string");
    if (!src) continue;
    let doc = new DOMParser().parseFromString(src, "application/xhtml+xml");
    if (doc.getElementsByTagName("parsererror").length) doc = new DOMParser().parseFromString(src, "text/html");
    const body = doc.getElementsByTagName("body")[0];
    if (!body) continue;
    const { title: heading, content } = convert(body);
    const w = words(content);
    if (!w && !heading) continue;
    const name = heading || text(doc.getElementsByTagName("title")[0]) || `Chapter ${chapters.length + 1}`;
    chapters.push({
      title: name.slice(0, 200),
      doc: { type: "doc", content: content.length ? content : [{ type: "paragraph" }] },
      words: w,
      suggested: w >= 60 && !FRONT.test(name) && ref.getAttribute("linear") !== "no",
    });
  }
  if (!chapters.length) throw new Error("No readable chapters were found in this EPUB.");
  return { title, author, description, cover, chapters };
}
