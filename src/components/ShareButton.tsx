"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";

/** Opens the phone's share sheet, or copies the link where there is none. */
export function ShareButton({ path, title, className, label = "Share", iconOnly = false }: {
  path: string; title: string; className?: string; label?: string; iconOnly?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const url = window.location.origin + path;
    if (navigator.share) {
      try { await navigator.share({ title, url }); } catch {}
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };
  return (
    <button type="button" className={className} onClick={share} aria-label={iconOnly ? (copied ? "Link copied" : label) : undefined}>
      {copied ? <Check size={18} strokeWidth={1.8} /> : <Share2 size={18} strokeWidth={1.6} />}
      {!iconOnly && <span>{copied ? "Link copied" : label}</span>}
    </button>
  );
}
