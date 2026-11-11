import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { ChevronLeft } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { requireMe } from "@/lib/session";
import { supabaseServer } from "@/lib/supabase/server";
import { BookSettings } from "@/components/write/BookSettings";
import { BookPublishing } from "@/components/write/BookPublishing";
import { NewChapterButton } from "@/components/write/NewChapterButton";
import s from "@/components/write/write.module.css";

export const metadata: Metadata = { title: "Edit book" };

export default function BookPage({ params }: PageProps<"/write/[bookId]">) {
  return (
    <>
      <SiteHeader />
      <main className={s.main}>
        <Link href="/write" className={s.back}><ChevronLeft size={18} strokeWidth={1.6} /> Your books</Link>
        <Suspense fallback={<p className={s.sub}>Loading…</p>}>
          <Book params={params} />
        </Suspense>
      </main>
    </>
  );
}

const STATUS: Record<string, string> = { draft: "Draft", published: "Published", scheduled: "Scheduled" };

async function Book({ params }: { params: PageProps<"/write/[bookId]">["params"] }) {
  const { bookId } = await params;
  const me = await requireMe(`/write/${bookId}`);
  const sb = await supabaseServer();
  const { data: book } = await sb.from("books")
    .select("id, author_id, title, slug, blurb, cloth, cover_url, status, completed")
    .eq("id", bookId).maybeSingle();
  if (!book || book.author_id !== me.id) notFound();
  const { data: chapters } = await sb.from("chapters")
    .select("id, number, title, status, publish_at, word_count")
    .eq("book_id", bookId).order("number");

  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
  const fmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Dhaka" });

  return (
    <>
      <div className={s.top}>
        <div>
          <h1 className={s.h1}>{book.title}</h1>
          <p className={s.sub}>{chapters?.length ?? 0} chapters · {book.status === "published" ? "Published" : "Draft"} · {book.completed ? "Complete" : "Ongoing"}</p>
        </div>
      </div>

      <section className={s.section} aria-labelledby="chapters">
        <div className={s.sectionHead}>
          <h2 id="chapters">Chapters</h2>
          <NewChapterButton bookId={book.id} />
        </div>
        {!chapters?.length ? (
          <div className={s.empty}><p>No chapters yet. Add the first one and paste your text in.</p></div>
        ) : (
          <ul className={s.list}>
            {chapters.map((c) => (
              <li key={c.id}>
                <Link href={`/write/${book.id}/${c.id}`} className={s.row}>
                  <span className={s.num}>{c.number}</span>
                  <span className={s.rowBody}>
                    <span className={s.rowTitle}>{c.title}</span>
                    <span className={s.meta}>
                      <span className={`${s.pill} ${c.status !== "draft" ? s.live : ""}`}>{STATUS[c.status]}</span>
                      {c.status === "scheduled" && c.publish_at && <span>{fmt.format(new Date(c.publish_at))}</span>}
                      <span>{c.word_count.toLocaleString("en")} words</span>
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={s.section} aria-labelledby="publishing">
        <h2 id="publishing">Publishing</h2>
        <BookPublishing origin={origin} bookId={book.id} slug={book.slug} status={book.status} completed={book.completed}
          publishedChapters={chapters?.filter((c) => c.status === "published").length ?? 0} />
      </section>

      <section className={s.section} aria-labelledby="details">
        <h2 id="details">Book details</h2>
        <BookSettings book={book} userId={me.id} />
      </section>
    </>
  );
}
