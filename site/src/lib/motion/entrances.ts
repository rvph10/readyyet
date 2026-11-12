import { gsap } from "gsap";
import { REVEAL, splitTitle } from "./reveal";

const SHOWN = "is-revealed";
const CLEAR = "transform,translate,rotate,scale,opacity,visibility";

type Target = HTMLElement | null | undefined;

const $ = (selector: string) => document.querySelector<HTMLElement>(selector);
const $$ = (selector: string) => [...document.querySelectorAll<HTMLElement>(selector)];

const show = (...els: Target[]) => els.forEach((el) => el?.classList.add(SHOWN));

function pivot(el: HTMLElement, frame: HTMLElement) {
  const a = el.getBoundingClientRect();
  const b = frame.getBoundingClientRect();
  return `${a.left + a.width / 2 - b.left}px ${a.top + a.height / 2 - b.top}px`;
}

// The hero's artwork: the panel rises, the props swing in from either side,
// the phone drops in from below the fold.
function stage(box: Target) {
  const panel = box?.querySelector<HTMLElement>(".hero__panel");
  const phone = box?.querySelector<HTMLElement>(".hero__phone");
  if (!box || !panel || !phone) return;

  const [coins, cards] = [...box.querySelectorAll<HTMLElement>(".hero__swing")];
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
}

function hero() {
  const nav = $(".nav");
  const title = $(".hero__title");
  const lede = $(".hero__lede");
  const cta = $(".hero .cta");
  const buttons = $$(".hero .cta .btn");
  const box = $(".hero__panelbox");
  if (!title) return;

  const lines = splitTitle(title);
  const after = [lede, ...buttons].filter(Boolean) as HTMLElement[];
  gsap.set([nav, ...after].filter(Boolean), { autoAlpha: 0, y: REVEAL.rise });
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

export async function startEntrances() {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  await Promise.race([document.fonts.ready, new Promise((resolve) => setTimeout(resolve, 800))]);

  hero();
}
