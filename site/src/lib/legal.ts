import { readFile } from "node:fs/promises";
import path from "node:path";
import { Marked, Renderer, type Tokens } from "marked";

export const LEGAL_DOCS = ["terms", "privacy", "legal-notice", "customer-data"] as const;
export type LegalDoc = (typeof LEGAL_DOCS)[number];

// The date the texts took effect, the same as TERMS_VERSION in the app
// (ADR 0130): a change to the terms means a new date in both.
export const LEGAL_DATE = "2026-11-10";

type Section = { id: string; label: string; number?: string; part: boolean };

const slug = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

// The texts are written as Markdown, the form they are drafted and reviewed
// in. "## Title {#id}" fixes an id other pages and the app link to, the
// others are made from the title. The first "#" is the page title; later
// ones open an annex, whose sections sit a level below it.
export async function readLegal(locale: string, doc: LegalDoc) {
  const source = await readFile(path.join(process.cwd(), "content/legal", locale, `${doc}.md`), "utf8");
  const [first, ...rest] = source.split("\n");
  const title = first.replace(/^# /, "");

  const sections: Section[] = [];
  let inPart = false;
  const renderer = new Renderer();
  renderer.heading = function ({ tokens, depth, text }: Tokens.Heading) {
    const fixed = text.match(/\s*\{#([\w-]+)\}$/);
    const label = (fixed ? text.slice(0, fixed.index) : text).replace(/^\d+\.\s+/, "");
    const id = fixed?.[1] ?? slug(label);
    const inline = this.parser.parseInline(tokens).replace(/\s*\{#[\w-]+\}$/, "");
    const numbered = inline.match(/^(\d+)\.\s+(.*)$/);

    if (depth === 1) {
      inPart = true;
      sections.push({ id, label, part: true });
      return `<h2 id="${id}" class="legal__part">${inline}</h2>\n`;
    }
    if (!inPart) sections.push({ id, label, number: numbered?.[1], part: false });
    const tag = inPart ? "h3" : "h2";
    const body = numbered ? `<span class="legal__num">${numbered[1]}</span>${numbered[2]}` : inline;
    return `<${tag} id="${id}">${body}</${tag}>\n`;
  };
  // Wide tables scroll on their own on a phone instead of the page.
  renderer.table = function (token: Tokens.Table) {
    return `<div class="legal__table">${Renderer.prototype.table.call(this, token)}</div>\n`;
  };

  const html = await new Marked({ gfm: true, breaks: true, renderer }).parse(rest.join("\n"));
  return { title, html, sections };
}
