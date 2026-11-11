import Link from "next/link";
import { APP_NAME } from "@/lib/brand";
import s from "./SiteFooter.module.css";

export function SiteFooter() {
  return (
    <footer className={s.footer}>
      <div className={s.inner}>
        <span>{APP_NAME}</span>
        <Link href="/privacy">Privacy</Link>
      </div>
    </footer>
  );
}
