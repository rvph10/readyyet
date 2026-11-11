const NBSP = "\u00a0";
const NB_HYPHEN = "\u2011";

const isWord = (t: string) => /[\p{L}\p{N}]/u.test(t);

const hard = (w: string) => w.replace(/-/g, NB_HYPHEN);

const OPENING = /^[«“‘(/]+$/;

// Punctuation that stands alone, like French's spaced "?" or ":", is glued
// to the word before it so it can't start a line; an opening mark such as
// "«" is glued to the word after it.
function toWords(tokens: string[]): string[] {
  const words: string[] = [];
  let opening = "";
  for (const t of tokens) {
    if (isWord(t)) {
      words.push(opening ? `${opening}${NBSP}${t}` : t);
      opening = "";
    } else if (OPENING.test(t) || !words.length) {
      opening = opening ? `${opening}${NBSP}${t}` : t;
    } else {
      words[words.length - 1] += `${NBSP}${t}`;
    }
  }
  if (opening) {
    if (words.length) words[words.length - 1] += `${NBSP}${opening}`;
    else words.push(opening);
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
