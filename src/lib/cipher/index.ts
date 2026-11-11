import "server-only";
import data from "./keys.json";
import type { Block } from "@/lib/text";

// Server only: the keys never reach the browser. Each key shuffles a-z, A-Z and 0-9,
// and public/f/<key>* are fonts that draw the shuffled letters as the real ones.
const tables = data.keys.map((key) => {
  const m = new Map<string, string>();
  for (let i = 0; i < data.alphabet.length; i++) m.set(data.alphabet[i], key[i]);
  return m;
});

export const KEY_COUNT = tables.length;
export const randomKey = () => Math.floor(Math.random() * KEY_COUNT);

const scramble = (t: string, m: Map<string, string>) => {
  let out = "";
  for (const ch of t) out += m.get(ch) ?? ch;
  return out;
};

export function scrambleBlocks(blocks: Block[], k: number): Block[] {
  const m = tables[k];
  return blocks.map((b) => (b.type === "p" ? { type: "p", runs: b.runs.map((r) => ({ ...r, t: scramble(r.t, m) })) } : b));
}
