import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Plus } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { requireMe } from "@/lib/session";
import { supabaseServer } from "@/lib/supabase/server";
import { clothOf } from "@/lib/cloth";
import s from "@/components/write/write.module.css";

export const metadata: Metadata = { title: "Your books" };

export default function WritePage() {
  return (
    <>
      <SiteHeader />
      <main className={s.main}>
        <Suspense fallback={<p className={s.sub}>Loading your books…</p>}>
          <Books />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}

async function Books() {
  const me = await requireMe("/write");
  const sb = await supabaseServer();
  const { data: books } = await sb
    .from("books")
    .select("id, title, slug, cloth, cover_url, status, completed, updated_at, chapters(count)")
    .eq("author_id", me.id)
    .order("updated_at", { ascending: false });

  return (
    <>
      <div className={s.top}>
        <div>
          <h1 className={s.h1}>Your books</h1>
          <p className={s.sub}>Write here, publish a chapter at a time.</p>
        </div>
        <Link href="/write/new" className={`${s.btn} ${s.primary}`}>
          <Plus size={18} strokeWidth={1.8} aria-hidden="true" /> New book
        </Link>
      </div>

      {!books?.length ? (
        <div className={s.empty}>
          <p>You haven&rsquo;t started a book yet.</p>
          <Link href="/write/new" className={`${s.btn} ${s.primary}`}>Start your first book</Link>
        </div>
      ) : (
        <ul className={s.list}>
          {books.map((b) => {
            const count = (b.chapters as { count: number }[] | null)?.[0]?.count ?? 0;
            return (
              <li key={b.id}>
                <Link href={`/write/${b.id}`} className={s.row}>
                  <span
                    className={s.mini}
                    style={b.cover_url ? { backgroundImage: `url(${b.cover_url})` } : { background: clothOf(b.cloth).cloth }}
                    aria-hidden="true"
                  />
                  <span className={s.rowBody}>
                    <span className={s.rowTitle}>{b.title}</span>
                    <span className={s.meta}>
                      <span className={`${s.pill} ${b.status === "published" ? s.live : ""}`}>
                        {b.status === "published" ? "Published" : "Draft"}
                      </span>
                      <span>{count} {count === 1 ? "chapter" : "chapters"}</span>
                      <span>{b.completed ? "Complete" : "Ongoing"}</span>
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
