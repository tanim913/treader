"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ensureImported } from "@/lib/guest-import";

/** After sign-in, moves what a guest kept in this browser into the account, then refreshes the page. */
export function GuestImport({ userId }: { userId: string }) {
  const router = useRouter();
  useEffect(() => {
    void ensureImported(userId).then((moved) => { if (moved > 0) router.refresh(); });
  }, [userId, router]);
  return null;
}
