import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { MyBookmarks } from "@/components/bookmarks/MyBookmarks";
import { DeleteAccount } from "@/components/account/DeleteAccount";
import { getMe } from "@/lib/auth";
import s from "./page.module.css";

export const metadata: Metadata = { title: "Your bookmarks" };

export default function MePage() {
  return (
    <>
      <SiteHeader />
      <main className={s.main}>
        <h1 className={s.h1}>Your bookmarks</h1>
        <p className={s.lede}>Every passage you kept, book by book. Tap one to go straight back to that line.</p>
        <MyBookmarks />
        <Suspense>
          <Account />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}

async function Account() {
  const me = await getMe();
  if (!me) {
    return (
      <section className={s.account}>
        <p>Bookmarks are kept in this browser. <Link href="/login?next=/me">Sign in</Link> to keep them on every device.</p>
      </section>
    );
  }
  return (
    <section className={s.account} aria-labelledby="account">
      <h2 id="account">Account</h2>
      <p>Signed in as <strong>{me.displayName}</strong> (@{me.handle}).</p>
      <div className={s.accountActions}>
        <form action="/auth/signout" method="post">
          <button type="submit" className={s.signoutBtn}>Sign out</button>
        </form>
        <DeleteAccount handle={me.handle} />
      </div>
    </section>
  );
}
