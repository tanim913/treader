"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition, type CSSProperties } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, ChevronLeft, Eye, Italic, Minus, Redo2, Undo2, X } from "lucide-react";
import { deleteChapter, saveChapter, type ChapterSave } from "@/app/write/actions";
import { plainTextToDoc, toBlocks, wordCount, type TNode } from "@/lib/doc";
import { clothOf } from "@/lib/cloth";
import { ChapterPreview } from "./ChapterPreview";
import s from "./ChapterEditor.module.css";
import w from "./write.module.css";

type Chapter = { id: string; number: number; title: string; status: "draft" | "scheduled" | "published"; publishAt: string | null };

const fmt = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

/** datetime-local value for an hour from now, in the browser's own time zone */
function inAnHour() {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  d.setMinutes(0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ChapterEditor({ bookId, bookTitle, cloth, chapter, initial }: {
  bookId: string; bookTitle: string; cloth: string; chapter: Chapter; initial: TNode;
}) {
  const [title, setTitle] = useState(chapter.title);
  const [number, setNumber] = useState(chapter.number);
  const [status, setStatus] = useState(chapter.status);
  const [publishAt, setPublishAt] = useState(chapter.publishAt);
  const [dirty, setDirty] = useState(false);
  const [words, setWords] = useState(() => wordCount(initial));
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [scheduling, setScheduling] = useState(false);
  const [when, setWhen] = useState(inAnHour);
  const [preview, setPreview] = useState<TNode | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, start] = useTransition();
  const editorRef = useRef<ReturnType<typeof useEditor>>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2] },
        code: false, codeBlock: false, link: false, underline: false, strike: false,
        bulletList: false, orderedList: false, listItem: false, listKeymap: false,
      }),
    ],
    content: initial,
    editorProps: {
      attributes: { class: s.prose, "aria-label": "Chapter text", spellcheck: "true" },
      // Plain text with several lines (no formatting) becomes paragraphs, scene breaks and italics.
      handlePaste: (_view, event) => {
        const dt = event.clipboardData;
        if (!dt || dt.getData("text/html")) return false;
        const text = dt.getData("text/plain");
        if (!text.includes("\n")) return false;
        editorRef.current?.chain().focus().insertContent(plainTextToDoc(text).content ?? []).run();
        return true;
      },
    },
    onUpdate: ({ editor }) => {
      setDirty(true);
      setWords(wordCount(editor.getJSON() as TNode));
    },
  });
  useEffect(() => { editorRef.current = editor; }, [editor]);

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const save = (publish: ChapterSave["publish"], at?: string) => {
    if (!editor) return;
    start(async () => {
      setMsg(null);
      const r = await saveChapter(bookId, chapter.id, {
        title, number, content: editor.getJSON() as TNode, publish,
        publishAt: at ? new Date(at).toISOString() : null,
      });
      if (r.error) return setMsg({ kind: "error", text: r.error });
      setDirty(false);
      setScheduling(false);
      if (publish === "draft") { setStatus("draft"); setPublishAt(null); }
      if (publish === "published") { setStatus("published"); setPublishAt(new Date().toISOString()); }
      if (publish === "scheduled" && at) { setStatus("scheduled"); setPublishAt(new Date(at).toISOString()); }
      setMsg({
        kind: "ok",
        text: publish === "published" ? "Published." : publish === "scheduled" ? "Scheduled." : publish === "draft" && status !== "draft" ? "Moved back to drafts." : "Saved.",
      });
    });
  };

  // Ctrl/Cmd+S saves without changing the status.
  const saveRef = useRef(save);
  useEffect(() => { saveRef.current = save; });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); saveRef.current("keep"); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const blocks = useMemo(() => (preview ? toBlocks(preview) : []), [preview]);
  const markDirty = () => setDirty(true);
  const statusText =
    status === "published" ? "Published" : status === "scheduled" && publishAt ? `Scheduled for ${fmt(publishAt)}` : "Draft";

  return (
    <div className={s.page} style={{ "--cloth": clothOf(cloth).cloth } as CSSProperties}>
      <header className={s.bar}>
        <Link href={`/write/${bookId}`} className={s.icon} aria-label={`Back to ${bookTitle}`}>
          <ChevronLeft size={22} strokeWidth={1.6} />
        </Link>
        <span className={s.barTitle}>{bookTitle}</span>
        <span className={s.state} aria-live="polite">{pending ? "Saving…" : dirty ? "Unsaved changes" : statusText}</span>
        <button type="button" className={s.icon} aria-label="Preview" onClick={() => editor && setPreview(editor.getJSON() as TNode)}>
          <Eye size={20} strokeWidth={1.6} />
        </button>
      </header>

      <div className={s.toolbar} role="toolbar" aria-label="Formatting">
        <button type="button" aria-label="Bold" aria-pressed={editor?.isActive("bold") ?? false}
          onClick={() => editor?.chain().focus().toggleBold().run()}><Bold size={18} strokeWidth={1.8} /></button>
        <button type="button" aria-label="Italic" aria-pressed={editor?.isActive("italic") ?? false}
          onClick={() => editor?.chain().focus().toggleItalic().run()}><Italic size={18} strokeWidth={1.8} /></button>
        <button type="button" aria-label="Scene break" onClick={() => editor?.chain().focus().setHorizontalRule().run()}>
          <Minus size={18} strokeWidth={1.8} /><span className={s.tlabel}>Scene break</span>
        </button>
        <span className={s.sep} />
        <button type="button" aria-label="Undo" onClick={() => editor?.chain().focus().undo().run()}><Undo2 size={18} strokeWidth={1.8} /></button>
        <button type="button" aria-label="Redo" onClick={() => editor?.chain().focus().redo().run()}><Redo2 size={18} strokeWidth={1.8} /></button>
        <span className={s.words}>{words.toLocaleString("en")} words</span>
      </div>

      <main className={s.sheet}>
        <div className={s.headFields}>
          <label className={s.numField}>
            <span>Chapter</span>
            <input type="number" min={1} inputMode="numeric" value={number}
              onChange={(e) => { setNumber(Number(e.target.value)); markDirty(); }} aria-label="Chapter number" />
          </label>
          <input className={s.titleField} value={title} maxLength={200} aria-label="Chapter title"
            placeholder="Chapter title" onChange={(e) => { setTitle(e.target.value); markDirty(); }} />
        </div>
        <EditorContent editor={editor} />
        <p className={s.pasteHint}>Paste from Word, Google Docs or a text file. Italics and scene breaks (a line of ***) are kept.</p>
      </main>

      <footer className={s.publish}>
        <div className={s.publishInner}>
          {msg && <p className={msg.kind === "error" ? w.error : w.saved} role={msg.kind === "error" ? "alert" : "status"}>{msg.text}</p>}
          {scheduling ? (
            <div className={s.scheduleRow}>
              <label className={s.when}>
                <span>Publish on</span>
                <input type="datetime-local" value={when} min={inAnHour().slice(0, 16)} onChange={(e) => setWhen(e.target.value)} />
              </label>
              <div className={w.actions}>
                <button type="button" className={`${w.btn} ${w.quiet}`} onClick={() => setScheduling(false)}>Cancel</button>
                <button type="button" className={`${w.btn} ${w.primary}`} disabled={pending} onClick={() => save("scheduled", when)}>Schedule</button>
              </div>
            </div>
          ) : (
            <div className={w.actions}>
              {status === "draft" && (
                <>
                  <button type="button" className={`${w.btn} ${w.quiet}`} disabled={pending} onClick={() => save("keep")}>Save draft</button>
                  <button type="button" className={`${w.btn} ${w.quiet}`} onClick={() => setScheduling(true)}>Schedule</button>
                  <button type="button" className={`${w.btn} ${w.primary}`} disabled={pending} onClick={() => save("published")}>Publish</button>
                </>
              )}
              {status === "published" && (
                <>
                  <button type="button" className={`${w.btn} ${w.quiet}`} disabled={pending} onClick={() => save("draft")}>Unpublish</button>
                  <button type="button" className={`${w.btn} ${w.primary}`} disabled={pending || !dirty} onClick={() => save("keep")}>Update</button>
                </>
              )}
              {status === "scheduled" && (
                <>
                  <button type="button" className={`${w.btn} ${w.quiet}`} disabled={pending} onClick={() => save("draft")}>Unschedule</button>
                  <button type="button" className={`${w.btn} ${w.quiet}`} disabled={pending} onClick={() => save("keep")}>Save</button>
                  <button type="button" className={`${w.btn} ${w.primary}`} disabled={pending} onClick={() => save("published")}>Publish now</button>
                </>
              )}
              <span className={s.grow} />
              {!confirmDelete ? (
                <button type="button" className={`${w.btn} ${w.danger}`} onClick={() => setConfirmDelete(true)}>Delete</button>
              ) : (
                <span className={w.actions}>
                  <span className={s.confirmText}>Delete this chapter?</span>
                  <button type="button" className={`${w.btn} ${w.quiet}`} onClick={() => setConfirmDelete(false)}>Keep</button>
                  <button type="button" className={`${w.btn} ${w.primary}`} style={{ background: "var(--danger)", borderColor: "var(--danger)" }}
                    onClick={() => start(async () => { setDirty(false); await deleteChapter(bookId, chapter.id); })}>Delete</button>
                </span>
              )}
            </div>
          )}
        </div>
      </footer>

      {preview && (
        <div className={s.previewWrap} role="dialog" aria-label="Preview">
          <div className={s.previewBar}>
            <span>Preview · how readers will see it</span>
            <button type="button" className={s.icon} aria-label="Close preview" onClick={() => setPreview(null)}>
              <X size={20} strokeWidth={1.6} />
            </button>
          </div>
          <ChapterPreview number={number} title={title} blocks={blocks} />
        </div>
      )}
    </div>
  );
}
