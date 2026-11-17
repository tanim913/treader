import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { ModButton } from "@/components/admin/ModButton";
import { getMe } from "@/lib/auth";
import { profileHref } from "@/lib/paths";
import { supabaseServer } from "@/lib/supabase/server";
import s from "@/components/admin/admin.module.css";

export const metadata: Metadata = { title: "Moderation", robots: { index: false } };

const TABS = [
  { id: "open", label: "Open reports" },
  { id: "resolved", label: "Resolved" },
  { id: "dismissed", label: "Dismissed" },
  { id: "audio", label: "Audio requests" },
  { id: "hidden", label: "Hidden" },
  { id: "banned", label: "Banned" },
] as const;
type Tab = (typeof TABS)[number]["id"];

export default function AdminPage({ searchParams }: PageProps<"/admin">) {
  return (
    <>
      <SiteHeader />
      <main className={s.main}>
        <h1 className={s.h1}>Moderation</h1>
        <Suspense fallback={<p className={s.muted}>Loading…</p>}>
          <Admin searchParams={searchParams} />
        </Suspense>
      </main>
    </>
  );
}

type Owner = { id: string; handle: string; display_name: string; banned: boolean };
type Target = { what: string; href: string | null; excerpt?: string; hidden?: boolean; owner: Owner | null };

async function Admin({ searchParams }: { searchParams: PageProps<"/admin">["searchParams"] }) {
  const me = await getMe();
  if (!me || me.role !== "admin") notFound();
  const sp = await searchParams;
  const raw = typeof sp.tab === "string" ? sp.tab : "open";
  const tab: Tab = (TABS.some((t) => t.id === raw) ? raw : "open") as Tab;
  const sb = await supabaseServer();
  const { count: openCount } = await sb.from("reports").select("id", { count: "exact", head: true }).eq("status", "open");

  return (
    <>
      <nav className={s.tabs} aria-label="Moderation views">
        {TABS.map((t) => (
          <Link key={t.id} href={t.id === "open" ? "/admin" : `/admin?tab=${t.id}`} className={s.tab}
            aria-current={tab === t.id ? "page" : undefined}>
            {t.label}{t.id === "open" && openCount ? <span className={s.badge}>{openCount}</span> : null}
          </Link>
        ))}
      </nav>
      {tab === "audio" ? <AudioRequests /> : tab === "hidden" ? <Hidden /> : tab === "banned" ? <Banned meId={me.id} /> : <Reports status={tab} meId={me.id} />}
    </>
  );
}

async function Reports({ status, meId }: { status: "open" | "resolved" | "dismissed"; meId: string }) {
  const sb = await supabaseServer();
  const { data } = await sb
    .from("reports")
    .select("id, target_type, target_id, reason, status, created_at, reporter:profiles!reports_reporter_id_fkey(handle, display_name)")
    .eq("status", status)
    .order("created_at", { ascending: false })
    .limit(100);
  type R = {
    id: string; target_type: "book" | "chapter" | "comment" | "profile"; target_id: string; reason: string;
    status: string; created_at: string; reporter: { handle: string; display_name: string } | null;
  };
  const reports = (data ?? []) as unknown as R[];
  if (!reports.length) {
    return <p className={s.muted}>{status === "open" ? "No open reports. Nothing needs you." : `No ${status} reports.`}</p>;
  }
  const targets = await describe(reports.map((r) => ({ type: r.target_type, id: r.target_id })));

  return (
    <ol className={s.list}>
      {reports.map((r) => {
        const t = targets.get(`${r.target_type}:${r.target_id}`);
        return (
          <li key={r.id} className={s.item}>
            <p className={s.kind}>
              {r.target_type}{t?.hidden ? <span className={s.flag}>hidden</span> : null}
              {t?.owner?.banned ? <span className={s.flag}>owner banned</span> : null}
            </p>
            {t ? (
              <p className={s.what}>{t.href ? <Link href={t.href}>{t.what}</Link> : t.what}</p>
            ) : (
              <p className={s.what}>No longer exists (deleted).</p>
            )}
            {t?.excerpt && <blockquote className={s.excerpt}>{t.excerpt}</blockquote>}
            {t?.owner && (
              <p className={s.meta}>By <Link href={profileHref(t.owner.handle)}>{t.owner.display_name} (@{t.owner.handle})</Link></p>
            )}
            <p className={s.reason}>&ldquo;{r.reason}&rdquo;</p>
            <p className={s.meta}>
              Reported by {r.reporter ? <Link href={profileHref(r.reporter.handle)}>@{r.reporter.handle}</Link> : "a deleted account"}
              {" · "}{new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Dhaka" }).format(new Date(r.created_at))}
            </p>
            <div className={s.actions}>
              {t && r.target_type !== "profile" && (
                <ModButton act={{ kind: "hide", target: r.target_type, id: r.target_id, hide: !t.hidden }}
                  label={t.hidden ? "Restore" : `Hide ${r.target_type}`} tone={t.hidden ? "plain" : "danger"} />
              )}
              {t?.owner && t.owner.id !== meId && (
                <ModButton act={{ kind: "ban", userId: t.owner.id, ban: !t.owner.banned }}
                  label={t.owner.banned ? "Unban account" : "Ban account"} tone={t.owner.banned ? "plain" : "danger"} />
              )}
              {status === "open" ? (
                <>
                  <ModButton act={{ kind: "report", reportId: r.id, status: "resolved" }} label="Mark resolved" tone="primary" />
                  <ModButton act={{ kind: "report", reportId: r.id, status: "dismissed" }} label="Dismiss" />
                </>
              ) : (
                <ModButton act={{ kind: "report", reportId: r.id, status: "open" }} label="Reopen" />
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Looks up what each report points at (admins can see hidden things). */
async function describe(items: { type: string; id: string }[]): Promise<Map<string, Target>> {
  const sb = await supabaseServer();
  const ids = (type: string) => [...new Set(items.filter((i) => i.type === type).map((i) => i.id))];
  const out = new Map<string, Target>();
  const [books, chapters, comments, people] = await Promise.all([
    ids("book").length ? sb.from("books").select("id, slug, title, hidden_by_admin, author:profiles!books_author_id_fkey(id, handle, display_name, banned)").in("id", ids("book")) : { data: [] },
    ids("chapter").length ? sb.from("chapters").select("id, number, title, hidden_by_admin, book:books(slug, title, author:profiles!books_author_id_fkey(id, handle, display_name, banned))").in("id", ids("chapter")) : { data: [] },
    ids("comment").length ? sb.from("comments").select("id, body, hidden_by_admin, user:profiles(id, handle, display_name, banned), chapter:chapters(number, book:books(slug, title))").in("id", ids("comment")) : { data: [] },
    ids("profile").length ? sb.from("profiles").select("id, handle, display_name, banned").in("id", ids("profile")) : { data: [] },
  ]);
  type B = { id: string; slug: string; title: string; hidden_by_admin: boolean; author: Owner | null };
  for (const b of (books.data ?? []) as unknown as B[]) {
    out.set(`book:${b.id}`, { what: b.title, href: `/b/${b.slug}`, hidden: b.hidden_by_admin, owner: b.author });
  }
  type C = { id: string; number: number; title: string; hidden_by_admin: boolean; book: { slug: string; title: string; author: Owner | null } | null };
  for (const c of (chapters.data ?? []) as unknown as C[]) {
    out.set(`chapter:${c.id}`, {
      what: `Chapter ${c.number}, “${c.title}”, in ${c.book?.title ?? "a book"}`,
      href: c.book ? `/b/${c.book.slug}/${c.number}` : null, hidden: c.hidden_by_admin, owner: c.book?.author ?? null,
    });
  }
  type M = { id: string; body: string; hidden_by_admin: boolean; user: Owner | null; chapter: { number: number; book: { slug: string; title: string } | null } | null };
  for (const m of (comments.data ?? []) as unknown as M[]) {
    out.set(`comment:${m.id}`, {
      what: `A comment on chapter ${m.chapter?.number ?? "?"} of ${m.chapter?.book?.title ?? "a book"}`,
      href: m.chapter?.book ? `/b/${m.chapter.book.slug}/${m.chapter.number}` : null,
      excerpt: m.body.length > 400 ? `${m.body.slice(0, 400)}…` : m.body, hidden: m.hidden_by_admin, owner: m.user,
    });
  }
  for (const p of (people.data ?? []) as Owner[]) {
    out.set(`profile:${p.id}`, { what: `${p.display_name} (@${p.handle})`, href: profileHref(p.handle), owner: p });
  }
  return out;
}

async function Hidden() {
  const sb = await supabaseServer();
  const [books, chapters, comments] = await Promise.all([
    sb.from("books").select("id, slug, title").eq("hidden_by_admin", true).limit(100),
    sb.from("chapters").select("id, number, title, book:books(slug, title)").eq("hidden_by_admin", true).limit(100),
    sb.from("comments").select("id, body, chapter:chapters(number, book:books(slug, title))").eq("hidden_by_admin", true).limit(100),
  ]);
  type Ch = { id: string; number: number; title: string; book: { slug: string; title: string } | null };
  type Co = { id: string; body: string; chapter: { number: number; book: { slug: string; title: string } | null } | null };
  const rows: { key: string; target: "book" | "chapter" | "comment"; id: string; label: string; href: string | null }[] = [
    ...(books.data ?? []).map((b) => ({ key: `b${b.id}`, target: "book" as const, id: b.id, label: `Book: ${b.title}`, href: `/b/${b.slug}` })),
    ...((chapters.data ?? []) as unknown as Ch[]).map((c) => ({
      key: `c${c.id}`, target: "chapter" as const, id: c.id, label: `Chapter ${c.number}, “${c.title}”, in ${c.book?.title ?? "a book"}`,
      href: c.book ? `/b/${c.book.slug}/${c.number}` : null,
    })),
    ...((comments.data ?? []) as unknown as Co[]).map((m) => ({
      key: `m${m.id}`, target: "comment" as const, id: m.id, label: `Comment: “${m.body.slice(0, 120)}${m.body.length > 120 ? "…" : ""}”`,
      href: m.chapter?.book ? `/b/${m.chapter.book.slug}/${m.chapter.number}` : null,
    })),
  ];
  if (!rows.length) return <p className={s.muted}>Nothing is hidden.</p>;
  return (
    <ul className={s.list}>
      {rows.map((r) => (
        <li key={r.key} className={s.item}>
          <p className={s.what}>{r.href ? <Link href={r.href}>{r.label}</Link> : r.label}</p>
          <div className={s.actions}><ModButton act={{ kind: "hide", target: r.target, id: r.id, hide: false }} label="Restore" /></div>
        </li>
      ))}
    </ul>
  );
}

async function Banned({ meId }: { meId: string }) {
  const sb = await supabaseServer();
  const { data } = await sb.from("profiles").select("id, handle, display_name").eq("banned", true).order("handle").limit(200);
  const people = (data ?? []).filter((p) => p.id !== meId);
  if (!people.length) return <p className={s.muted}>No banned accounts.</p>;
  return (
    <ul className={s.list}>
      {people.map((p) => (
        <li key={p.id} className={s.item}>
          <p className={s.what}><Link href={profileHref(p.handle)}>{p.display_name} (@{p.handle})</Link></p>
          <div className={s.actions}><ModButton act={{ kind: "ban", userId: p.id, ban: false }} label="Unban account" /></div>
        </li>
      ))}
    </ul>
  );
}

/** What readers have asked to hear, most-wanted book first. */
async function AudioRequests() {
  const sb = await supabaseServer();
  const [{ data }, { data: voiced }] = await Promise.all([
    sb.from("audio_requests").select("book_id, chapter_id, book:books(id, slug, title, audio_enabled), chapter:chapters(number, title)").limit(5000),
    sb.from("chapter_audio").select("chapter_id"),
  ]);
  type R = {
    book_id: string; chapter_id: string | null;
    book: { id: string; slug: string; title: string; audio_enabled: boolean } | null;
    chapter: { number: number; title: string } | null;
  };
  const hasAudio = new Set((voiced ?? []).map((v) => v.chapter_id as string));
  const books = new Map<string, { book: NonNullable<R["book"]>; whole: number; chapters: Map<string, { number: number; title: string; count: number }> }>();
  for (const r of (data ?? []) as unknown as R[]) {
    if (!r.book) continue;
    const g = books.get(r.book_id) ?? { book: r.book, whole: 0, chapters: new Map() };
    if (!r.chapter_id) g.whole++;
    else if (r.chapter) {
      const c = g.chapters.get(r.chapter_id) ?? { number: r.chapter.number, title: r.chapter.title, count: 0 };
      c.count++;
      g.chapters.set(r.chapter_id, c);
    }
    books.set(r.book_id, g);
  }
  const list = [...books.values()].map((g) => ({ ...g, total: g.whole + [...g.chapters.values()].reduce((a, c) => a + c.count, 0) }))
    .sort((a, b) => b.total - a.total);
  if (!list.length) return <p className={s.muted}>No audio requests yet. Readers can ask from a book page or the end of a chapter.</p>;
  return (
    <ol className={s.list}>
      {list.map((g) => (
        <li key={g.book.id} className={s.item}>
          <p className={s.kind}>{g.total} {g.total === 1 ? "request" : "requests"}{g.book.audio_enabled ? "" : <span className={s.flag}>audio off</span>}</p>
          <p className={s.what}><Link href={`/b/${g.book.slug}`}>{g.book.title}</Link></p>
          {g.whole > 0 && <p className={s.meta}>{g.whole} {g.whole === 1 ? "reader wants" : "readers want"} the whole book</p>}
          {[...g.chapters.entries()].sort((a, b) => a[1].number - b[1].number).map(([id, c]) => (
            <p key={id} className={s.meta}>
              Chapter {c.number}, “{c.title}”: {c.count} {c.count === 1 ? "request" : "requests"} · {hasAudio.has(id) ? "has audio" : "no audio yet"}
            </p>
          ))}
          <div className={s.actions}>
            <Link href={`/admin/audio/${g.book.id}`} className={`${s.btn} ${s.primary}`}>Narrate this book</Link>
          </div>
        </li>
      ))}
    </ol>
  );
}
