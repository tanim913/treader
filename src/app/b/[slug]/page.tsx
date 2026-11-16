import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { BookCover } from "@/components/BookBoard";
import { ShareButton } from "@/components/ShareButton";
import { fmtDay, getBook, nextScheduled } from "@/lib/books";
import { minutesFor } from "@/lib/doc";
import { getMe } from "@/lib/auth";
import { getPlace } from "@/lib/places";
import { ContinueButton } from "@/components/progress/ContinueButton";
import { FollowButton } from "@/components/profile/FollowButton";
import { isFollowing } from "@/lib/profiles";
import { profileHref } from "@/lib/paths";
import s from "./book.module.css";

export async function generateMetadata({ params }: PageProps<"/b/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const book = await getBook(slug);
  if (!book) return { title: "Book not found" };
  return { title: book.title, description: book.blurb.slice(0, 200) || `${book.title}, by ${book.author.display_name}` };
}

export default function BookPage({ params }: PageProps<"/b/[slug]">) {
  return (
    <>
      <SiteHeader />
      <main className={s.main}>
        <Suspense fallback={<p className={s.loading}>Opening the book…</p>}>
          <Book params={params} />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}

async function Book({ params }: { params: PageProps<"/b/[slug]">["params"] }) {
  const { slug } = await params;
  const book = await getBook(slug);
  if (!book) notFound();
  const me = await getMe();
  const [soon, saved, following] = await Promise.all([
    !book.completed ? nextScheduled(book.id) : null,
    me ? getPlace(book.id) : null,
    me && !book.own ? isFollowing(me.id, book.author_id) : false,
  ]);
  const first = book.chapters[0];
  const count = book.chapters.length;
  const draft = book.status !== "published";

  return (
    <>
      {draft && <p className={s.draftNote}>Only you can see this book. Make it public from your writing dashboard.</p>}
      {!draft && book.own && book.chapters.some((c) => c.draft) && (
        <p className={s.draftNote}>Chapters marked Draft are visible only to you.</p>
      )}
      <section className={s.hero}>
        <div className={s.coverWrap}>
          <BookCover title={book.title} author={book.author.display_name} cloth={book.cloth} coverUrl={book.cover_url} />
        </div>
        <div className={s.info}>
          <h1 className={s.title}>{book.title}</h1>
          <p className={s.by}>by <Link href={profileHref(book.author.handle)} className={s.byLink}>{book.author.display_name}</Link></p>
          <p className={s.meta}>
            {count} {count === 1 ? "chapter" : "chapters"} · {book.completed ? "Complete" : "Ongoing"}
          </p>
          {book.blurb && <p className={s.blurb}>{book.blurb}</p>}
          <div className={s.actions}>
            {first ? (
              <ContinueButton
                slug={book.slug}
                bookId={book.id}
                numbers={book.chapters.map((c) => c.number)}
                saved={saved}
                signedIn={!!me}
                className={`${s.btn} ${s.primary}`}
              />
            ) : (
              <span className={s.meta}>The first chapter is on its way.</span>
            )}
            <ShareButton path={`/b/${book.slug}`} title={book.title} className={s.btn} />
            {!book.own && (
              <FollowButton authorId={book.author_id} authorName={book.author.display_name}
                userId={me?.id ?? null} initial={following} quiet className={s.followBtn} />
            )}
          </div>
        </div>
      </section>

      <section className={s.contents} aria-labelledby="contents">
        <h2 id="contents">Contents</h2>
        <ol className={s.list}>
          {book.chapters.map((c) => (
            <li key={c.id}>
              <Link href={`/b/${book.slug}/${c.number}`} className={s.row}>
                <span className={s.num}>{c.number}</span>
                <span className={s.chTitle}>{c.title}{c.draft && <span className={s.draftPill}>Draft</span>}</span>
                <span className={s.mins}>{minutesFor(c.word_count)} min</span>
              </Link>
            </li>
          ))}
        </ol>
        <p className={s.after}>
          {book.completed ? "The End." : soon ? `Next chapter on ${fmtDay(soon)}.` : "More chapters coming soon."}
        </p>
      </section>
    </>
  );
}
