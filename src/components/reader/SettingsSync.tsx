"use client";

import { useEffect } from "react";
import { pullAccountSettings } from "./settings";

let pulled: string | null = null;

/** Brings the signed-in reader's page, size, spacing and typeface to this device (once per visit). */
export function SettingsSync({ userId, onApplied }: { userId: string; onApplied?: () => void }) {
  useEffect(() => {
    if (pulled === userId) return;
    pulled = userId;
    void pullAccountSettings(userId).then(() => onApplied?.());
  }, [userId, onApplied]);
  return null;
}
