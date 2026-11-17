import Link from "next/link";
import { Suspense } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Shelf } from "@/components/Shelf";
import { GuestShelf } from "@/components/progress/GuestShelf";
import { supabaseServer } from "@/lib/supabase/server";
import { getMe } from "@/lib/auth";
import { getMyPlaces } from "@/lib/places";
import { newFromFollowed } from "@/lib/profiles";
import { audioNotices } from "@/lib/requests";
import { AudioNotices } from "@/components/social/AudioNotices";
import { profileHref } from "@/lib/paths";
import { credit } from "@/lib/byline";
import { clothOf } from "@/lib/cloth";
import { fmtDay } from "@/lib/books";
import p from "@/components/profile/profile.module.css";
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
          <NowWithAudio />
        </Suspense>
        <Suspense>
          <ContinueReading />
        </Suspense>
        <Suspense>
          <FromFollowed />
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
    .select("slug, title, cloth, cover_url, completed, status, updated_at, original_author, author:profiles!books_author_id_fkey(display_name, handle), chapters(count)")
    .eq("status", "published")
    .eq("hidden_by_admin", false)
    .order("updated_at", { ascending: false })
    .limit(24);
  const books = (data ?? []).map((b) => {
    const author = b.author as unknown as { display_name: string; handle: string } | null;
    return {
    href: `/b/${b.slug}`,
    title: b.title,
    ...credit(author, b.original_author),
    cloth: b.cloth,
    coverUrl: b.cover_url,
    chapters: (b.chapters as { count: number }[] | null)?.[0]?.count ?? 0,
    completed: b.completed,
    };
  });
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
      <Shelf books={places.map((x) => ({
        href: `/b/${x.slug}/${x.chapterNumber}${x.paragraph > 0 ? `#p-${x.paragraph}` : ""}`,
        title: x.title,
        ...credit({ display_name: x.uploader, handle: x.authorHandle }, x.originalAuthor),
        cloth: x.cloth,
        coverUrl: x.coverUrl,
        chapters: x.chapters,
        completed: x.completed,
        note: `Chapter ${x.chapterNumber} of ${x.chapters}`,
      }))} />
    </section>
  );
}

/** The latest chapters from writers this reader follows. */
async function FromFollowed() {
  const me = await getMe();
  if (!me) return null;
  const items = await newFromFollowed(me.id);
  if (!items.length) return null;
  return (
    <section className={s.section} aria-labelledby="followed">
      <h2 id="followed">New from writers you follow</h2>
      <ul className={p.chapters}>
        {items.map((c) => (
          <li key={c.href} className={p.chapterRow} style={{ "--cloth": clothOf(c.cloth).cloth } as React.CSSProperties}>
            <span className={p.band} aria-hidden="true" />
            <div>
              <Link href={c.href} className={p.chapterLink}>
                <span className={p.chTitle}>{c.number}. {c.title}</span>
                <span className={p.chMeta}>{c.bookTitle}{c.at ? ` · ${fmtDay(c.at)}` : ""}</span>
              </Link>
              <Link href={profileHref(c.authorHandle)} className={p.chMeta}>{c.author}</Link>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Audio this reader asked for that is now ready. */
async function NowWithAudio() {
  const me = await getMe();
  if (!me) return null;
  const items = await audioNotices(me.id);
  return items.length ? <AudioNotices items={items} /> : null;
}
