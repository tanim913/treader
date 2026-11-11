"use client";
// Registers the scrambled fonts for one key. Text must not show until they load,
// or the browser would draw the scrambled letters in a normal font.

const STYLES = [
  ["r", "normal", "400"],
  ["i", "italic", "400"],
  ["b", "normal", "700"],
  ["bi", "italic", "700"],
] as const;

const loaded = new Map<number, Promise<void>>();

export const cipherFamilies = (k: number) => ({ serif: `tcs${k}`, sans: `tca${k}` });

export function loadCipherFonts(k: number): Promise<void> {
  const ready = loaded.get(k);
  if (ready) return ready;
  const fonts: FontFace[] = [];
  for (const [fam, name] of [["s", `tcs${k}`], ["a", `tca${k}`]] as const) {
    for (const [tag, style, weight] of STYLES) {
      fonts.push(new FontFace(name, `url(/f/${k}${fam}${tag}.woff2) format("woff2")`, { style, weight, display: "block" }));
    }
  }
  const p = Promise.all(fonts.map((f) => f.load().then((ff) => { document.fonts.add(ff); }))).then(() => undefined);
  p.catch(() => loaded.delete(k));
  loaded.set(k, p);
  return p;
}
