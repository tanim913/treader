import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { APP_NAME, CONTACT_EMAIL } from "@/lib/brand";
import s from "./page.module.css";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main className={s.main}>
        <h1>Privacy</h1>
        <p className={s.updated}>Last updated 12 November 2026</p>

        <p>
          {APP_NAME} is a place to publish and read books chapter by chapter. This page explains what we
          keep about you and why. We do not show ads, and we do not sell or share your information with anyone.
        </p>

        <h2>Reading without an account</h2>
        <p>
          You can read without signing in. Your browser then keeps your reading settings and a short random
          guest code (used for the faint watermark on chapter pages) on your own device. Nothing about you is
          sent to us beyond what any website receives, such as your IP address in server logs.
        </p>

        <h2>When you sign in with Google</h2>
        <p>Google shares your name, email address and profile photo with us. We use them to:</p>
        <ul>
          <li>create your profile (your name, @handle and photo are public on your profile and comments);</li>
          <li>show your name in the faint watermark on chapters you read, which discourages copying;</li>
          <li>contact you about your account if we ever need to.</li>
        </ul>
        <p>Your email address is never shown to other readers.</p>

        <h2>What we store for you</h2>
        <ul>
          <li><strong>Private:</strong> your bookmarks and notes, reading progress, reading settings and reports you send. Only you can see these.</li>
          <li><strong>Public:</strong> your profile, the books and chapters you publish, your comments, likes and who you follow.</li>
        </ul>

        <h2>Cookies</h2>
        <p>We use one sign-in cookie to keep you signed in. We use no tracking or advertising cookies.</p>

        <h2>Where it is kept</h2>
        <p>
          Your data is stored with Supabase (a database service, in Singapore). The website is served by Vercel.
          They process it only to run {APP_NAME}.
        </p>

        <h2>Your choices</h2>
        <p>
          You can edit your profile, delete your bookmarks, comments and books at any time. To delete your
          account and everything in it, email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> and we
          will do it within 30 days.
        </p>

        <h2>Contact</h2>
        <p>Questions about this policy: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>
      </main>
      <SiteFooter />
    </>
  );
}
