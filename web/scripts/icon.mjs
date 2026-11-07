// Copies icons from the Be Bold pack into icon.tsx (ADR 0049). The pack's
// licence doesn't let the whole set sit in this public repo, so each icon is
// added when a page first needs it, from the pack on the developer's machine.
//
//   pnpm icon list [search]
//   pnpm icon add <name> [<name>...]
//
// BE_BOLD_SVG_DIR, in web/.env.local, is the pack's SVG folder.

import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ICON_FILE = new URL("../src/components/ui/icon.tsx", import.meta.url).pathname;
const ENTRY = /^ {2}"?([a-z0-9-]+)"?: \(/gm;

function packIcons() {
  const dir = process.env.BE_BOLD_SVG_DIR;
  if (!dir) {
    fail("Set BE_BOLD_SVG_DIR in web/.env.local to the Be Bold pack's SVG folder.");
  }
  const icons = new Map();
  for (const folder of readdirSync(dir, { withFileTypes: true })) {
    if (!folder.isDirectory()) continue;
    for (const file of readdirSync(join(dir, folder.name))) {
      if (file.endsWith(".svg")) {
        icons.set(file.slice(0, -4).toLowerCase(), join(dir, folder.name, file));
      }
    }
  }
  return icons;
}

// The pack draws each icon in a 14px viewBox with a <style> for its fill.
// Only the shapes are kept, filled with the text's colour by <Icon>, and a
// class whose rule sets evenodd becomes the fillRule it stood for.
function toJsx(svg) {
  const evenodd = new Set();
  for (const [, selectors, rules] of svg.matchAll(/([^{}>]+)\{([^}]*)\}/g)) {
    if (rules.includes("fill-rule:evenodd")) {
      for (const selector of selectors.split(",")) evenodd.add(selector.trim().slice(1));
    }
  }
  const shapes = [...svg.matchAll(/<(path|rect|circle|polygon)\b([^>]*?)\/?>/g)].map(([, tag, attrs]) => {
    const kept = [...attrs.matchAll(/([a-z-]+)="([^"]*)"/g)]
      .filter(([, name]) => !["id", "class", "data-name"].includes(name))
      .map(([, name, value]) => `${name}="${value}"`);
    const className = attrs.match(/class="([^"]*)"/)?.[1];
    if (className && className.split(" ").some((name) => evenodd.has(name))) {
      kept.push('fillRule="evenodd"');
    }
    return `<${tag} ${kept.join(" ")} />`;
  });
  if (shapes.length === 0) {
    fail("No shapes found in the SVG.");
  }
  return shapes.length === 1 ? shapes[0] : `<>${shapes.join("")}</>`;
}

function existingNames(source) {
  return [...source.matchAll(ENTRY)].map((match) => match[1]);
}

function add(names) {
  const pack = packIcons();
  let source = readFileSync(ICON_FILE, "utf8");
  for (const name of names) {
    const path = pack.get(name);
    if (!path) {
      fail(`No icon "${name}" in the pack. Try: pnpm icon list ${name.split("-")[0]}`);
    }
    if (existingNames(source).includes(name)) {
      console.log(`${name} is already in icon.tsx`);
      continue;
    }
    const key = /^[a-z][a-z0-9]*$/.test(name) ? name : `"${name}"`;
    const entry = `  ${key}: (${toJsx(readFileSync(path, "utf8"))}),\n`;
    // Kept in alphabetical order, before the first entry that sorts after it.
    const next = [...source.matchAll(ENTRY)].find((match) => match[1] > name);
    const at = next ? next.index : source.indexOf("} satisfies Record<string, ReactNode>;");
    source = source.slice(0, at) + entry + source.slice(at);
    console.log(`added ${name}`);
  }
  writeFileSync(ICON_FILE, source);
  execFileSync("pnpm", ["exec", "prettier", "--write", ICON_FILE], { stdio: "ignore" });
}

function list(search = "") {
  const added = new Set(existingNames(readFileSync(ICON_FILE, "utf8")));
  const names = [...packIcons().keys()].filter((name) => name.includes(search.toLowerCase())).sort();
  for (const name of names) {
    console.log(added.has(name) ? `${name}  (added)` : name);
  }
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

const [command, ...args] = process.argv.slice(2);
if (command === "add" && args.length > 0) {
  add(args);
} else if (command === "list") {
  list(args[0]);
} else {
  fail("Usage: pnpm icon list [search] | pnpm icon add <name> [<name>...]");
}
