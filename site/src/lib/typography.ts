const NBSP = "\u00a0";
const NB_HYPHEN = "\u2011";

const isWord = (t: string) => /[\p{L}\p{N}]/u.test(t);

const hard = (w: string) => w.replace(/-/g, NB_HYPHEN);

// Punctuation that stands alone, like French's spaced "?" or ":", is glued
// to its word so it can't start a line by itself.
function toWords(tokens: string[]): string[] {
  const words: string[] = [];
  let pending = "";
  for (const t of tokens) {
    if (!isWord(t)) {
      pending = pending ? `${pending}${NBSP}${t}` : t;
      continue;
    }
    words.push(pending ? `${pending}${NBSP}${t}` : t);
    pending = "";
  }
  if (pending) {
    if (words.length) words[words.length - 1] += `${NBSP}${pending}`;
    else words.push(pending);
  }
  return words;
}

// Keeps the last two words of a text on one line, so no line holds a single
// word.
export function noOrphan(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  const words = toWords(clean.split(" "));

  if (words.length < 2) return clean;
  if (words.length === 2) return words.map(hard).join(NBSP);

  return words.slice(0, -2).join(" ") + " " + words.slice(-2).map(hard).join(NBSP);
}
