"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { profileHref } from "@/lib/paths";
import { ReportButton } from "./ReportButton";
import s from "./social.module.css";

type Row = {
  id: string;
  parent_id: string | null;
  user_id: string;
  body: string;
  created_at: string;
  edited_at: string | null;
  hidden_by_admin: boolean;
  author: { handle: string; display_name: string; avatar_url: string | null } | null;
};

const SELECT = "id, parent_id, user_id, body, created_at, edited_at, hidden_by_admin, author:profiles(handle, display_name, avatar_url)";
const MAX = 2000;

const day = (iso: string) => {
  const d = new Date(iso);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", ...(sameYear ? {} : { year: "numeric" }) }).format(d);
};

/** Comments at the end of a chapter, with one level of replies. */
export function Comments({ chapterId, userId, chapterAuthorId }: {
  chapterId: string;
  userId: string | null;
  /** the chapter's writer may remove comments on it */
  chapterAuthorId: string;
}) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [failed, setFailed] = useState(false);
  const path = usePathname();

  const load = useCallback(async () => {
    const { data, error } = await supabaseBrowser().from("comments").select(SELECT)
      .eq("chapter_id", chapterId).order("created_at").limit(300);
    if (error) { setFailed(true); return; }
    setFailed(false);
    setRows((data ?? []) as unknown as Row[]);
  }, [chapterId]);

  useEffect(() => {
    let alive = true;
    supabaseBrowser().from("comments").select(SELECT).eq("chapter_id", chapterId).order("created_at").limit(300)
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) setFailed(true);
        else setRows((data ?? []) as unknown as Row[]);
      });
    return () => { alive = false; };
  }, [chapterId]);

  const top = (rows ?? []).filter((r) => !r.parent_id);
  const repliesTo = (id: string) => (rows ?? []).filter((r) => r.parent_id === id);
  const count = (rows ?? []).filter((r) => !r.hidden_by_admin).length;

  return (
    <section className={s.comments} aria-labelledby={`comments-${chapterId}`}>
      <h2 id={`comments-${chapterId}`} className={s.commentsHead}>
        Comments{rows && count > 0 ? <span className={s.count}> {count}</span> : null}
      </h2>

      {userId ? (
        <Composer chapterId={chapterId} userId={userId} onPosted={load} />
      ) : (
        <p className={s.muted}><Link href={`/login?next=${encodeURIComponent(path)}`}>Sign in</Link> to leave a comment.</p>
      )}

      {failed ? (
        <p className={s.muted} role="alert">Comments couldn&rsquo;t be loaded. <button type="button" className={s.textBtn} onClick={load}>Try again</button></p>
      ) : !rows ? (
        <p className={s.muted} role="status">Loading comments…</p>
      ) : !top.length ? (
        <p className={s.muted}>No comments yet.</p>
      ) : (
        <ol className={s.thread}>
          {top.map((c) => (
            <li key={c.id}>
              <Comment c={c} userId={userId} chapterId={chapterId} chapterAuthorId={chapterAuthorId} onChange={load} canReply />
              {repliesTo(c.id).length > 0 && (
                <ol className={s.replies}>
                  {repliesTo(c.id).map((r) => (
                    <li key={r.id}>
                      <Comment c={r} userId={userId} chapterId={chapterId} chapterAuthorId={chapterAuthorId} onChange={load} />
                    </li>
                  ))}
                </ol>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function Composer({ chapterId, userId, parentId, onPosted, onCancel, autoFocus }: {
  chapterId: string;
  userId: string;
  parentId?: string;
  onPosted: () => void;
  onCancel?: () => void;
  autoFocus?: boolean;
}) {
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const post = async () => {
    const text = body.trim();
    if (!text) return;
    setBusy(true);
    setError(null);
    const { error: e } = await supabaseBrowser().from("comments")
      .insert({ chapter_id: chapterId, user_id: userId, body: text.slice(0, MAX), parent_id: parentId ?? null });
    setBusy(false);
    if (e) { setError("Couldn't post. Check your connection and try again."); return; }
    setBody("");
    onPosted();
    onCancel?.();
  };
  return (
    <div className={s.composer}>
      <label className="sr-only" htmlFor={`c-${parentId ?? chapterId}`}>{parentId ? "Your reply" : "Your comment"}</label>
      <textarea id={`c-${parentId ?? chapterId}`} className={s.textarea} rows={parentId ? 2 : 3} maxLength={MAX}
        placeholder={parentId ? "Write a reply" : "What did you think of this chapter?"}
        value={body} onChange={(e) => setBody(e.target.value)} autoFocus={autoFocus} />
      {error && <p className={s.problem} role="alert">{error}</p>}
      <div className={s.composerRow}>
        {onCancel && <button type="button" className={s.textBtn} onClick={onCancel}>Cancel</button>}
        <button type="button" className={s.primaryBtn} disabled={busy || !body.trim()} onClick={post}>
          {busy ? "Posting…" : parentId ? "Reply" : "Post comment"}
        </button>
      </div>
    </div>
  );
}

function Comment({ c, userId, chapterId, chapterAuthorId, onChange, canReply }: {
  c: Row;
  userId: string | null;
  chapterId: string;
  chapterAuthorId: string;
  onChange: () => void;
  canReply?: boolean;
}) {
  const [mode, setMode] = useState<"view" | "edit" | "reply" | "confirm">("view");
  const [draft, setDraft] = useState(c.body);
  const [error, setError] = useState<string | null>(null);
  const mine = userId === c.user_id;
  const canDelete = mine || userId === chapterAuthorId;
  const name = c.author?.display_name ?? "A reader";

  const save = async () => {
    const text = draft.trim();
    if (!text) return;
    const { error: e } = await supabaseBrowser().from("comments")
      .update({ body: text.slice(0, MAX), edited_at: new Date().toISOString() }).eq("id", c.id);
    if (e) { setError("Couldn't save. Try again."); return; }
    setMode("view");
    onChange();
  };
  const remove = async () => {
    const { error: e } = await supabaseBrowser().from("comments").delete().eq("id", c.id);
    if (e) { setError("Couldn't delete. Try again."); return; }
    onChange();
  };

  return (
    <article className={s.comment} aria-label={`Comment by ${name}`}>
      <header className={s.commentHead}>
        {c.author ? <Link href={profileHref(c.author.handle)} className={s.who}>{name}</Link> : <span className={s.who}>{name}</span>}
        <span className={s.when}>{day(c.created_at)}{c.edited_at ? " · edited" : ""}</span>
      </header>
      {c.hidden_by_admin && <p className={s.hiddenNote}>Hidden by the moderators. Only you can see it.</p>}
      {mode === "edit" ? (
        <div className={s.composer}>
          <label className="sr-only" htmlFor={`e-${c.id}`}>Edit your comment</label>
          <textarea id={`e-${c.id}`} className={s.textarea} rows={3} maxLength={MAX} value={draft}
            onChange={(e) => setDraft(e.target.value)} autoFocus />
          <div className={s.composerRow}>
            <button type="button" className={s.textBtn} onClick={() => { setMode("view"); setDraft(c.body); }}>Cancel</button>
            <button type="button" className={s.primaryBtn} disabled={!draft.trim()} onClick={save}>Save</button>
          </div>
        </div>
      ) : (
        <p className={s.body}>{c.body}</p>
      )}
      {error && <p className={s.problem} role="alert">{error}</p>}
      {mode === "confirm" ? (
        <div className={s.commentActions}>
          <span className={s.muted}>Delete this comment{canReply ? " and its replies" : ""}?</span>
          <button type="button" className={`${s.textBtn} ${s.danger}`} onClick={remove}>Delete</button>
          <button type="button" className={s.textBtn} onClick={() => setMode("view")}>Keep</button>
        </div>
      ) : mode === "view" && userId ? (
        <div className={s.commentActions}>
          {canReply && <button type="button" className={s.textBtn} onClick={() => setMode("reply")}>Reply</button>}
          {mine && <button type="button" className={s.textBtn} onClick={() => setMode("edit")}>Edit</button>}
          {canDelete && <button type="button" className={s.textBtn} onClick={() => setMode("confirm")}>Delete</button>}
          {!mine && <ReportButton target="comment" id={c.id} userId={userId} what="this comment" className={s.textBtn} />}
        </div>
      ) : null}
      {mode === "reply" && userId && (
        <Composer chapterId={chapterId} userId={userId} parentId={c.id} autoFocus
          onPosted={onChange} onCancel={() => setMode("view")} />
      )}
    </article>
  );
}
