import { Suspense } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Shelf } from "@/components/Shelf";
import { GuestShelf } from "@/components/progress/GuestShelf";
import { supabaseServer } from "@/lib/supabase/server";
import { getMe } from "@/lib/auth";
import { getMyPlaces } from "@/lib/places";
import { APP_TAGLINE } from "@/lib/brand";
import s from "./page.module.css";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className={s.main}>
        <div className={s.intro}>
          <h1>{APP_TAGLINE}</h1>
          <p>Follow a book as it is written. Keep your own notes in its margins.</p>
        </div>
        <Suspense>
          <ContinueReading />
        </Suspense>
        <section className={s.section} aria-labelledby="recent">
          <h2 id="recent">Recently updated</h2>
          <Suspense fallback={<p className={s.note}>Loading books…</p>}>
            <Recent />
          </Suspense>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

async function Recent() {
  const sb = await supabaseServer();
  const { data } = await sb
    .from("books")
    .select("slug, title, cloth, cover_url, completed, status, updated_at, author:profiles!books_author_id_fkey(display_name), chapters(count)")
    .eq("status", "published")
    .eq("hidden_by_admin", false)
    .order("updated_at", { ascending: false })
    .limit(24);
  const books = (data ?? []).map((b) => ({
    href: `/b/${b.slug}`,
    title: b.title,
    author: (b.author as unknown as { display_name: string } | null)?.display_name ?? "",
    cloth: b.cloth,
    coverUrl: b.cover_url,
    chapters: (b.chapters as { count: number }[] | null)?.[0]?.count ?? 0,
    completed: b.completed,
  }));
  if (!books.length) return <p className={s.note}>No books have been published yet. The first ones are on their way.</p>;
  return <Shelf books={books} />;
}

/** The books this reader is in the middle of: from their account, or this browser for guests. */
async function ContinueReading() {
  const me = await getMe();
  const heading = <h2 id="continue">Continue reading</h2>;
  if (!me) return <GuestShelf heading={heading} className={s.section} />;
  const places = await getMyPlaces();
  if (!places.length) return null;
  return (
    <section className={s.section} aria-labelledby="continue">
      {heading}
      <Shelf books={places.map((p) => ({
        href: `/b/${p.slug}/${p.chapterNumber}${p.paragraph > 0 ? `#p-${p.paragraph}` : ""}`,
        title: p.title,
        author: p.author,
        cloth: p.cloth,
        coverUrl: p.coverUrl,
        chapters: p.chapters,
        completed: p.completed,
        note: `Chapter ${p.chapterNumber} of ${p.chapters}`,
      }))} />
    </section>
  );
}
