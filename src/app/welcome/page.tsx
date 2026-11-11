import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { getMe, safeNext } from "@/lib/auth";
import { WelcomeForm } from "./WelcomeForm";
import s from "@/components/auth/auth.module.css";

export const metadata: Metadata = { title: "Welcome" };

export default function WelcomePage({ searchParams }: PageProps<"/welcome">) {
  return (
    <>
      <SiteHeader />
      <main className={s.main}>
        <h1 className={s.h1}>Welcome</h1>
        <p className={s.lede}>Choose how you appear here. You can change this later.</p>
        <Suspense>
          <Welcome searchParams={searchParams} />
        </Suspense>
      </main>
    </>
  );
}

async function Welcome({ searchParams }: { searchParams: PageProps<"/welcome">["searchParams"] }) {
  const [me, sp] = await Promise.all([getMe(), searchParams]);
  if (!me) redirect("/login");
  const next = safeNext(typeof sp.next === "string" ? sp.next : null);
  return <WelcomeForm handle={me.handle} name={me.displayName} next={next} />;
}
