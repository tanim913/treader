import { Suspense } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Shelf } from "@/components/Shelf";
import { supabaseServer } from "@/lib/supabase/server";
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
