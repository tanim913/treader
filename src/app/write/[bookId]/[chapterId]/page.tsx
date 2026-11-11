import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireMe } from "@/lib/session";
import { supabaseServer } from "@/lib/supabase/server";
import { ChapterEditor } from "@/components/write/ChapterEditor";
import { EMPTY_DOC, type TNode } from "@/lib/doc";

export const metadata: Metadata = { title: "Edit chapter" };

export default function ChapterPage({ params }: PageProps<"/write/[bookId]/[chapterId]">) {
  return (
    <Suspense>
      <Chapter params={params} />
    </Suspense>
  );
}

async function Chapter({ params }: { params: PageProps<"/write/[bookId]/[chapterId]">["params"] }) {
  const { bookId, chapterId } = await params;
  const me = await requireMe(`/write/${bookId}/${chapterId}`);
  const sb = await supabaseServer();
  const [{ data: book }, { data: ch }, { data: body }] = await Promise.all([
    sb.from("books").select("id, author_id, title, cloth, completed").eq("id", bookId).maybeSingle(),
    sb.from("chapters").select("id, book_id, number, title, status, publish_at").eq("id", chapterId).maybeSingle(),
    sb.from("chapter_bodies").select("content").eq("chapter_id", chapterId).maybeSingle(),
  ]);
  if (!book || book.author_id !== me.id || !ch || ch.book_id !== bookId) notFound();
  const content = body?.content && (body.content as TNode).type === "doc" ? (body.content as TNode) : EMPTY_DOC;

  return (
    <ChapterEditor
      bookId={book.id}
      bookTitle={book.title}
      cloth={book.cloth}
      chapter={{ id: ch.id, number: ch.number, title: ch.title, status: ch.status, publishAt: ch.publish_at }}
      initial={content}
    />
  );
}
