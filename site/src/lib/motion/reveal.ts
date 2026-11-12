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
  nodes.forEach((node) => (node.nodeValue = (node.nodeValue ?? "").replace(/[^\S ]+/g, " ")));
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
  return { lines, revert: () => split.revert() };
}

// Section entrances. A [data-entrance-group] plays once when its top reaches
// REVEAL.start, its [data-entrance] members in page order: titles
// (data-entrance="title") rise out of their lines, everything else rises
// REVEAL.rise, REVEAL.follow after the title and REVEAL.stagger apart.
export async function startReveals() {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  // Lines are measured on the real face.
  await Promise.race([document.fonts.ready, new Promise((resolve) => setTimeout(resolve, 800))]);

  document.querySelectorAll<HTMLElement>("[data-entrance-group]").forEach((group) => {
    const members = [...group.querySelectorAll<HTMLElement>("[data-entrance]")];
    const titles = members.filter((el) => el.dataset.entrance === "title").map(splitTitle);
    const rest = members.filter((el) => el.dataset.entrance !== "title");
    gsap.set(rest, { autoAlpha: 0, y: REVEAL.rise });

    ScrollTrigger.create({
      trigger: group,
      start: REVEAL.start,
      once: true,
      onEnter: () => {
        const tl = gsap.timeline({ defaults: { ease: REVEAL.ease, clearProps: CLEAR } });
        titles.forEach(({ lines, revert }) =>
          tl.to(lines, { yPercent: 0, duration: REVEAL.duration, stagger: REVEAL.stagger, onComplete: revert }, 0),
        );
        tl.to(
          rest,
          { autoAlpha: 1, y: 0, duration: REVEAL.duration, stagger: REVEAL.stagger },
          titles.length ? REVEAL.follow : 0,
        );
      },
    });
  });
}
