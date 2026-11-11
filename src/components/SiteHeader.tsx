import Link from "next/link";
import { Suspense } from "react";
import { Bookmark, PenLine } from "lucide-react";
import { APP_NAME } from "@/lib/brand";
import { getMe } from "@/lib/auth";
import s from "./SiteHeader.module.css";

export function SiteHeader() {
  return (
    <header className={s.header}>
      <div className={s.inner}>
        <Link href="/" className={s.mark}>{APP_NAME}</Link>
        <nav className={s.nav} aria-label="Main">
          <Link href="/write" className={s.link}>
            <PenLine size={17} strokeWidth={1.6} aria-hidden="true" />
            Write
          </Link>
          <Link href="/me" className={s.link} aria-label="Your bookmarks">
            <Bookmark size={17} strokeWidth={1.6} aria-hidden="true" />
            <span className={s.wide}>Bookmarks</span>
          </Link>
          <Suspense fallback={<span className={s.slot} aria-hidden="true" />}>
            <Account />
          </Suspense>
        </nav>
      </div>
    </header>
  );
}

async function Account() {
  const me = await getMe();
  if (!me) return <Link href="/login" className={`${s.link} ${s.primary}`}>Sign in</Link>;
  const initial = me.displayName.trim().charAt(0).toUpperCase() || "?";
  return (
    <Link href="/me" className={s.avatar} aria-label={`Your profile, ${me.displayName}`}>
      {me.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={me.avatarUrl} alt="" referrerPolicy="no-referrer" />
      ) : (
        <span>{initial}</span>
      )}
    </Link>
  );
}
