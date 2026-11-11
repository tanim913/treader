"use client";
// Copy protection for the reading page (layers 3 to 5 of the plan).
// None of this makes copying impossible; it makes it hard and traceable.
import { useEffect, type RefObject } from "react";

const BLOCKED_KEYS = new Set(["c", "x", "s", "p", "a", "u"]);

function inField(t: EventTarget | null) {
  return t instanceof HTMLElement && !!t.closest("input, textarea, [contenteditable='true']");
}

export function guestLabel(): string {
  let code = "";
  try {
    code = localStorage.getItem("treader-guest") ?? "";
    if (!code) {
      code = Math.random().toString(36).slice(2, 8).toUpperCase();
      localStorage.setItem("treader-guest", code);
    }
  } catch {
    code = "------";
  }
  return `guest ${code}`;
}

function watermarkSvg(label: string) {
  const day = new Date().toISOString().slice(0, 10);
  const text = `${label} · ${day}`.replace(/[<>&"]/g, "");
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='340' height='210'>` +
    `<text x='170' y='105' text-anchor='middle' transform='rotate(-24 170 105)' ` +
    `font-family='system-ui, sans-serif' font-size='13' fill='rgb(128,128,128)' fill-opacity='0.13'>${text}</text></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/**
 * Blocks copy, cut, right-click, drag, and the copy/save/print/select-all/source
 * shortcuts; veils the text when the page is hidden or loses focus; draws a
 * watermark naming the reader (or a guest code) over the text.
 */
export function useProtection(page: RefObject<HTMLElement | null>, text: RefObject<HTMLElement | null>, reader?: string) {
  useEffect(() => {
    const t = text.current;
    if (t) t.style.setProperty("--wm", watermarkSvg(reader ?? guestLabel()));

    const onCopy = (e: ClipboardEvent) => {
      if (inField(e.target) || inField(document.activeElement)) return;
      e.preventDefault();
      e.clipboardData?.setData("text/plain", "");
    };
    const block = (e: Event) => { if (!inField(e.target)) e.preventDefault(); };
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const k = e.key.toLowerCase();
      if (!BLOCKED_KEYS.has(k)) return;
      if (inField(e.target) && (k === "c" || k === "x" || k === "a")) return;
      e.preventDefault();
    };
    const veil = (on: boolean) => {
      const p = page.current;
      if (!p) return;
      if (on) p.setAttribute("data-veiled", "");
      else p.removeAttribute("data-veiled");
    };
    const onVis = () => veil(document.hidden);
    const onBlur = () => veil(true);
    const onFocus = () => veil(false);

    document.addEventListener("copy", onCopy);
    document.addEventListener("cut", onCopy);
    document.addEventListener("contextmenu", block);
    document.addEventListener("dragstart", block);
    document.addEventListener("selectstart", block);
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    return () => {
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("cut", onCopy);
      document.removeEventListener("contextmenu", block);
      document.removeEventListener("dragstart", block);
      document.removeEventListener("selectstart", block);
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
    };
  }, [page, text, reader]);
}
