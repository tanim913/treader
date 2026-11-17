import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ReaderLoader } from "@/components/reader/ReaderLoader";
import { fmtDay, getBook, nextScheduled } from "@/lib/books";
import { getMe } from "@/lib/auth";
import { minutesFor } from "@/lib/doc";
import { getPlace } from "@/lib/places";

export async function generateMetadata({ params }: PageProps<"/b/[slug]/[n]">): Promise<Metadata> {
  const { slug, n } = await params;
  const book = await getBook(slug);
  const ch = book?.chapters.find((c) => c.number === Number(n));
  if (!book || !ch) return { title: "Chapter not found" };
  return { title: `${ch.title} · ${book.title}`, description: `Chapter ${ch.number} of ${book.title}, by ${book.writer}` };
}

export default function ChapterPage({ params }: PageProps<"/b/[slug]/[n]">) {
  return (
    <Suspense>
      <Chapter params={params} />
    </Suspense>
  );
}

async function Chapter({ params }: { params: PageProps<"/b/[slug]/[n]">["params"] }) {
  const { slug, n } = await params;
  const [book, me] = await Promise.all([getBook(slug), getMe()]);
  if (!book) notFound();
  const i = book.chapters.findIndex((c) => c.number === Number(n));
  if (i < 0) notFound();
  const ch = book.chapters[i];
  const prev = book.chapters[i - 1];
  const next = book.chapters[i + 1];
  const left = book.chapters.slice(i).reduce((a, c) => a + c.word_count, 0);
  const [soon, saved] = await Promise.all([
    !next && !book.completed ? nextScheduled(book.id) : null,
    me ? getPlace(book.id) : null,
  ]);
  const base = `/b/${book.slug}`;

  return (
    <ReaderLoader
      key={ch.id}
      chapterId={ch.id}
      bookId={book.id}
      book={{ slug: book.slug, coverUrl: book.cover_url, author: book.writer }}
      next={next && !next.draft ? { id: next.id, number: next.number, title: next.title } : null}
      userId={me?.id ?? null}
      author={book.own ? null : { name: book.author.display_name, href: `/@${book.author.handle}` }}
      saved={saved ? { chapterId: saved.chapterId, paragraph: saved.paragraph } : null}
      bookTitle={book.title}
      bookHref={base}
      cloth={book.cloth}
      chapterHref={`${base}/${ch.number}`}
      sharePath={`${base}/${ch.number}`}
      chapterNumber={ch.number}
      chapterCount={book.chapters.length}
      chapterTitle={ch.title}
      minutesLeft={minutesFor(left)}
      prevHref={prev ? `${base}/${prev.number}` : null}
      nextHref={next ? `${base}/${next.number}` : null}
      ending={next ? { kind: "next" } : book.completed ? { kind: "end" } : { kind: "soon", date: soon ? `on ${fmtDay(soon)}` : undefined }}
      readerName={me ? `${me.displayName} @${me.handle}` : undefined}
    />
  );
}
