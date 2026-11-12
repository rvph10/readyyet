import { gsap } from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { REVEAL } from "./reveal";

gsap.registerPlugin(CustomEase, ScrollTrigger, SplitText);

const SHOWN = "is-revealed";
const CLEAR = "transform,translate,rotate,scale,opacity,visibility";

type Target = HTMLElement | null | undefined;

const $ = (selector: string) => document.querySelector<HTMLElement>(selector);
const $$ = (selector: string) => [...document.querySelectorAll<HTMLElement>(selector)];

const show = (...els: Target[]) => els.forEach((el) => el?.classList.add(SHOWN));

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

function split(el: HTMLElement, vars: SplitText.Vars) {
  keepBindings(el);
  return SplitText.create(el, { reduceWhiteSpace: false, ...vars });
}

function pivot(el: HTMLElement, frame: HTMLElement) {
  const a = el.getBoundingClientRect();
  const b = frame.getBoundingClientRect();
  return `${a.left + a.width / 2 - b.left}px ${a.top + a.height / 2 - b.top}px`;
}

// The hero's artwork: the panel rises, the props swing in from either side,
// the phone drops in from below the fold and its screen settles last.
function stage(box: Target) {
  const panel = box?.querySelector<HTMLElement>(".hero__panel");
  const phone = box?.querySelector<HTMLElement>(".hero__phone");
  if (!box || !panel || !phone) return;

  const [coins, cards] = [...box.querySelectorAll<HTMLElement>(".hero__swing")];
  const screen = [...box.querySelectorAll<SVGGElement>(".phone__header, .phone__cards")];
  const width = box.offsetWidth;
  const swing = {
    autoAlpha: 1,
    x: 0,
    y: 0,
    rotation: 0,
    scale: 1,
    duration: 1.7,
    ease: "expo.out",
    clearProps: CLEAR,
  };

  if (coins) {
    const origin = pivot(coins.firstElementChild as HTMLElement, coins);
    gsap.fromTo(
      coins,
      { x: width * 0.07, y: width * 0.09, rotation: 28, scale: 0.86, transformOrigin: origin },
      { ...swing, delay: 0.12 },
    );
  }
  if (cards) {
    const origin = pivot(cards.querySelector("img")!, cards);
    gsap.fromTo(
      cards,
      { x: -width * 0.07, y: width * 0.09, rotation: -22, scale: 0.86, transformOrigin: origin },
      { ...swing, delay: 0.06 },
    );
  }

  gsap.fromTo(
    panel,
    { autoAlpha: 0, y: width * 0.06, scale: 0.94, transformOrigin: "50% 100%" },
    { autoAlpha: 1, y: 0, scale: 1, duration: 1.5, ease: "expo.out", clearProps: CLEAR },
  );
  const rect = phone.getBoundingClientRect();
  const drop = (window.innerHeight - rect.top) / (rect.height / phone.offsetHeight);
  gsap.fromTo(
    phone,
    { y: Math.max(0, drop), scale: 0.9, transformOrigin: "50% 0%" },
    { ...swing, duration: 1.6, delay: 0.18 },
  );
  gsap.fromTo(
    screen,
    { y: 48 },
    { y: 0, duration: 1.1, ease: "expo.out", stagger: 0.12, delay: 0.5, clearProps: "transform" },
  );
}

function hero() {
  const nav = $(".nav");
  const title = $(".hero__title");
  const lede = $(".hero__lede");
  const cta = $(".hero .cta");
  const buttons = $$(".hero .cta .btn");
  const box = $(".hero__panelbox");
  if (!title) return;

  const lines = split(title, { type: "lines", mask: "lines" });
  fitMasks(lines.lines as HTMLElement[]);
  const after = [lede, ...buttons].filter(Boolean) as HTMLElement[];
  gsap.set([nav, ...after].filter(Boolean), { autoAlpha: 0, y: REVEAL.rise });
  gsap.set(lines.lines, { yPercent: 110 });
  stage(box);
  show(nav, title, lede, cta, box);

  // The same order as every section below: the title rises out of its
  // lines, then what it leads to.
  const enter = { ease: REVEAL.ease, clearProps: CLEAR };
  gsap
    .timeline()
    .to(nav, { autoAlpha: 1, y: 0, duration: REVEAL.small, ...enter }, 0)
    .to(
      lines.lines,
      {
        yPercent: 0,
        duration: REVEAL.duration,
        stagger: REVEAL.stagger,
        ...enter,
        onComplete: () => lines.revert(),
      },
      0.1,
    )
    .to(after, { autoAlpha: 1, y: 0, duration: REVEAL.duration, stagger: REVEAL.stagger, ...enter }, 0.35);
}

// A display face set solid (line-height 1) draws its accents and descenders
// outside the line box, which a line's mask would cut while it rises.
function fitMasks(lines: HTMLElement[]) {
  const ctx = document.createElement("canvas").getContext("2d")!;
  lines.forEach((line) => {
    const style = getComputedStyle(line);
    ctx.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    const m = ctx.measureText(line.textContent ?? "");
    const spill = Math.ceil((m.fontBoundingBoxAscent + m.fontBoundingBoxDescent - line.offsetHeight) / 2);
    if (spill > 0) line.parentElement!.style.overflowClipMargin = `${spill}px`;
  });
}

export async function startEntrances() {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  await Promise.race([document.fonts.ready, new Promise((resolve) => setTimeout(resolve, 800))]);

  hero();
}
