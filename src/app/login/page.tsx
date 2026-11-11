import type { Metadata } from "next";
import { Suspense } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { safeNext } from "@/lib/auth";
import s from "@/components/auth/auth.module.css";

export const metadata: Metadata = { title: "Sign in" };

const ERRORS: Record<string, string> = {
  "missing-code": "Google didn't send the sign-in back. Please try again.",
  "sign-in-failed": "That sign-in didn't go through. Please try again.",
  provider: "Google sign-in is not set up correctly on our side yet. Please try again later.",
};

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <>
      <SiteHeader />
      <main className={s.main}>
        <h1 className={s.h1}>Sign in</h1>
        <p className={s.lede}>Keep your bookmarks and notes, pick up where you stopped on any device, and follow writers.</p>
        <Suspense fallback={<GoogleButton next="/" />}>
          <LoginBody searchParams={searchParams} />
        </Suspense>
        <p className={s.fine}>You can read every book without an account.</p>
      </main>
    </>
  );
}

async function LoginBody({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const sp = await searchParams;
  const next = safeNext(typeof sp.next === "string" ? sp.next : null);
  const err = typeof sp.error === "string" ? ERRORS[sp.error] : undefined;
  return (
    <>
      <GoogleButton next={next} />
      {err && <p className={s.error} role="alert">{err}</p>}
    </>
  );
}
