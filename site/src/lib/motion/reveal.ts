import { gsap } from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(CustomEase, ScrollTrigger, SplitText);

// The entrance every home section shares, whatever template it comes from,
// mirrored as --reveal-* in globals.css. The section scripts in public/temlis
// are classic scripts and can't import this, they name the "reveal" ease and
// repeat these numbers.
export const REVEAL = {
  ease: "reveal",
  start: "top 85%",
  duration: 0.9,
  small: 0.6,
  rise: 24,
  stagger: 0.08,
  // How long after a section's title its other members follow.
  follow: 0.15,
};

const CLEAR = "transform,translate,rotate,scale,opacity,visibility";

// Ledger's own curve, the one its hero phone settles on: fast, no overshoot.
export function registerRevealEase() {
  CustomEase.create(REVEAL.ease, "M0,0 C0.16,1 0.3,1 1,1");
}

// SplitText would otherwise break lines at the non-breaking spaces that keep
// a title's last words together.
function keepBindings(el: HTMLElement) {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  nodes.forEach((node) => (node.nodeValue = (node.nodeValue ?? "").replace(/[^\S\u00a0]+/g, " ")));
  const first = nodes[0];
  const last = nodes[nodes.length - 1];
  if (first) first.nodeValue = (first.nodeValue ?? "").replace(/^ /, "");
  if (last) last.nodeValue = (last.nodeValue ?? "").replace(/ $/, "");
}

// A display face set solid (line-height 1) draws its accents and descenders
// outside the line box, which a line's mask would cut while it rises. Masks
// only clip upright: a long word may run past its column.
function fitMasks(lines: HTMLElement[]) {
  const ctx = document.createElement("canvas").getContext("2d")!;
  lines.forEach((line) => {
    line.parentElement!.style.overflowX = "visible";
    const style = getComputedStyle(line);
    ctx.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    const m = ctx.measureText(line.textContent ?? "");
    const spill = Math.ceil((m.fontBoundingBoxAscent + m.fontBoundingBoxDescent - line.offsetHeight) / 2);
    if (spill > 0) line.parentElement!.style.overflowClipMargin = `${spill}px`;
  });
}

// A title's lines, each in its own mask, waiting below it.
export function splitTitle(el: HTMLElement) {
  keepBindings(el);
  const split = SplitText.create(el, { type: "lines", mask: "lines", reduceWhiteSpace: false });
  const lines = split.lines as HTMLElement[];
  fitMasks(lines);
  gsap.set(lines, { yPercent: 110 });
  return { lines, to: { yPercent: 0 }, revert: () => split.revert() };
}

// A title already built of rows (data-entrance="rows"), stickers between its
// words, rises a row at a time the way split lines do: each row is clipped
// to where it will rest while it travels up into it.
function rowsOf(el: HTMLElement) {
  const lines = [...el.children] as HTMLElement[];
  gsap.set(lines, { yPercent: 110, clipPath: "inset(0% 0% 100% 0%)" });
  return {
    lines,
    to: { yPercent: 0, clipPath: "inset(0% 0% 0% 0%)" },
    revert: () => gsap.set(lines, { clearProps: "clipPath" }),
  };
}

// The order a group's members arrive in: as read on screen, top to bottom
// then left to right. What sits off to the side, a slider's hidden slides,
// arrives with the first.
function readingOrder(els: HTMLElement[]) {
  const shown = els
    .map((el) => ({ el, box: el.getBoundingClientRect() }))
    .filter(({ box }) => box.right > 0 && box.left < window.innerWidth)
    .sort((a, b) => (Math.abs(a.box.top - b.box.top) > 4 ? a.box.top - b.box.top : a.box.left - b.box.left))
    .map(({ el }) => el);
  return (_: number, el: HTMLElement) => Math.max(0, shown.indexOf(el)) * REVEAL.stagger;
}

// Section entrances. A [data-entrance-group] plays once when its top reaches
// REVEAL.start: titles (data-entrance="title" or "rows") rise out of their
// lines, its other [data-entrance] members rise REVEAL.rise, REVEAL.follow
// after the title and REVEAL.stagger apart.
export async function startReveals() {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  // Lines are measured on the real face.
  await Promise.race([document.fonts.ready, new Promise((resolve) => setTimeout(resolve, 800))]);

  const isTitle = (el: HTMLElement) => el.dataset.entrance === "title" || el.dataset.entrance === "rows";
  const others = (group: HTMLElement) =>
    [...group.querySelectorAll<HTMLElement>("[data-entrance]")].filter((el) => !isTitle(el));

  document.querySelectorAll<HTMLElement>("[data-entrance-group]").forEach((group) => {
    const titles = [...group.querySelectorAll<HTMLElement>("[data-entrance]")]
      .filter(isTitle)
      .map((el) => (el.dataset.entrance === "rows" ? rowsOf(el) : splitTitle(el)));
    gsap.set(others(group), { autoAlpha: 0, y: REVEAL.rise });

    ScrollTrigger.create({
      trigger: group,
      start: REVEAL.start,
      once: true,
      onEnter: () => {
        // Gathered again: the trades slider clones its slides for its loop,
        // and the clones carry the hidden state they were copied in.
        const rest = others(group);
        const tl = gsap.timeline({ defaults: { ease: REVEAL.ease, clearProps: CLEAR } });
        titles.forEach(({ lines, to, revert }) => {
          tl.to(lines, { ...to, duration: REVEAL.duration, stagger: REVEAL.stagger, onComplete: revert }, 0);
        });
        tl.to(
          rest,
          { autoAlpha: 1, y: 0, duration: REVEAL.duration, stagger: readingOrder(rest) },
          titles.length ? REVEAL.follow : 0,
        );
      },
    });
  });
}
