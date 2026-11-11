import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { MyBookmarks } from "@/components/bookmarks/MyBookmarks";
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
        <form action="/auth/signout" method="post" className={s.signout}>
          <button type="submit">Sign out</button>
        </form>
      </main>
    </>
  );
}
