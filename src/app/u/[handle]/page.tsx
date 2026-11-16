import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { Shelf } from "@/components/Shelf";
import { Avatar } from "@/components/profile/Avatar";
import { FollowButton } from "@/components/profile/FollowButton";
import { EditProfile } from "@/components/profile/EditProfile";
import { ShowReading } from "@/components/profile/ShowReading";
import { BookmarkList } from "@/components/bookmarks/BookmarkList";
import { getMe } from "@/lib/auth";
import { getMyPlaces } from "@/lib/places";
import { profileHref } from "@/lib/paths";
import { booksBy, followCounts, getProfile, isFollowing, publicReading } from "@/lib/profiles";
import { supabaseServer } from "@/lib/supabase/server";
import { fromRow, NOTE_SELECT, type Bookmark, type NoteRow } from "@/lib/bookmarks/shape";
import s from "@/components/profile/profile.module.css";

export async function generateMetadata({ params }: PageProps<"/u/[handle]">): Promise<Metadata> {
  const { handle } = await params;
  const p = await getProfile(handle);
  if (!p) return { title: "Profile not found" };
  return { title: `${p.displayName} (@${p.handle})`, description: p.bio.slice(0, 200) || `${p.displayName} on treader` };
}

export default function ProfilePage({ params }: PageProps<"/u/[handle]">) {
  return (
    <>
      <SiteHeader />
      <main className={s.main}>
        <Suspense fallback={<p className={s.loading}>Opening the profile…</p>}>
          <ProfileView params={params} />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}

async function ProfileView({ params }: { params: PageProps<"/u/[handle]">["params"] }) {
  const { handle } = await params;
  const [p, me] = await Promise.all([getProfile(handle), getMe()]);
  if (!p) notFound();
  const own = me?.id === p.id;

  const [counts, books, following, reading] = await Promise.all([
    followCounts(p.id),
    p.banned ? Promise.resolve([]) : booksBy(p.id),
    me && !own ? isFollowing(me.id, p.id) : Promise.resolve(false),
    !own && p.showReading && !p.banned ? publicReading(p.id) : Promise.resolve([]),
  ]);
  const base = profileHref(p.handle);

  return (
    <>
      <header className={s.head}>
        <div className={s.who}>
          <Avatar name={p.displayName} url={p.avatarUrl} size={64} />
          <div>
            <h1 className={s.name}>{p.displayName}</h1>
            <p className={s.handle}>@{p.handle}</p>
          </div>
        </div>
        {p.banned && <p className={s.suspended}>This account has been suspended.</p>}
        {p.bio && <p className={s.bio}>{p.bio}</p>}
        <p className={s.counts}>
          <span><strong>{books.length}</strong> {books.length === 1 ? "book" : "books"}</span>
          <span aria-hidden="true">·</span>
          <Link href={`${base}/followers`} className={s.countLink}>
            <span><strong>{counts.followers}</strong> {counts.followers === 1 ? "follower" : "followers"}</span>
          </Link>
          <span aria-hidden="true">·</span>
          <Link href={`${base}/following`} className={s.countLink}>
            <span><strong>{counts.following}</strong> following</span>
          </Link>
        </p>
        <div className={s.actions}>
          {own ? (
            <>
              <EditProfile name={p.displayName} handle={p.handle} bio={p.bio} />
              <form action="/auth/signout" method="post">
                <button type="submit" className={`${s.follow} ${s.following}`}>Sign out</button>
              </form>
            </>
          ) : !p.banned ? (
            <FollowButton authorId={p.id} authorName={p.displayName} userId={me?.id ?? null} initial={following} />
          ) : null}
        </div>
      </header>

      <section className={s.section} aria-labelledby="books">
        <h2 id="books">Books</h2>
        {books.length ? (
          <Shelf books={books.map((b) => ({
            href: `/b/${b.slug}`, title: b.title, author: p.displayName, cloth: b.cloth,
            coverUrl: b.coverUrl, chapters: b.chapters, completed: b.completed,
          }))} />
        ) : (
          <p className={s.empty}>
            {own ? <>No published books yet. <Link href="/write">Open your writing desk</Link> to start one.</> : "No published books yet."}
          </p>
        )}
        {own && books.length > 0 && <Link href="/write" className={s.more}>Manage your books</Link>}
      </section>

      {reading.length > 0 && (
        <section className={s.section} aria-labelledby="reading">
          <h2 id="reading">Currently reading</h2>
          <Shelf books={reading.map((r) => ({
            href: `/b/${r.slug}`, title: r.title, author: r.author, authorHref: profileHref(r.authorHandle),
            cloth: r.cloth, coverUrl: r.coverUrl, chapters: 0, completed: r.completed, note: `On chapter ${r.chapterNumber}`,
          }))} />
        </section>
      )}

      {own && <OwnReading showReading={p.showReading} />}
    </>
  );
}

/** Only the owner sees this: where they are in each book, their latest bookmarks, and the public switch. */
async function OwnReading({ showReading }: { showReading: boolean }) {
  const sb = await supabaseServer();
  const [places, { data: rows }] = await Promise.all([
    getMyPlaces(8),
    sb.from("notes").select(NOTE_SELECT).order("created_at", { ascending: false }).limit(3),
  ]);
  const marks = ((rows ?? []) as unknown as NoteRow[]).map(fromRow).filter((b): b is Bookmark => !!b);
  const last = places[0];

  return (
    <section className={s.private} aria-labelledby="your-reading">
      <h2 id="your-reading">Your reading</h2>
      <p className={s.privateNote}>Only you can see this part of your profile.</p>

      <h3 className={s.sub}>{last ? "Last opened" : "Reading"}</h3>
      {places.length ? (
        <Shelf books={places.map((x) => ({
          href: `/b/${x.slug}/${x.chapterNumber}${x.paragraph > 0 ? `#p-${x.paragraph}` : ""}`,
          title: x.title, author: x.author, authorHref: x.authorHandle ? profileHref(x.authorHandle) : undefined,
          cloth: x.cloth, coverUrl: x.coverUrl, chapters: x.chapters, completed: x.completed,
          note: `Chapter ${x.chapterNumber} of ${x.chapters}`,
        }))} />
      ) : (
        <p className={s.empty}>Books you open will appear here, so you can carry on where you stopped.</p>
      )}

      <h3 className={s.sub}>Latest bookmarks</h3>
      <div className={s.recent}>
        <BookmarkList items={marks} />
      </div>
      {marks.length > 0 && <Link href="/me" className={s.more}>All your bookmarks</Link>}

      <ShowReading initial={showReading} />
    </section>
  );
}
