import Link from "next/link";
import { PenLine } from "lucide-react";
import { APP_NAME } from "@/lib/brand";
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
          <Link href="/login" className={`${s.link} ${s.primary}`}>Sign in</Link>
        </nav>
      </div>
    </header>
  );
}
