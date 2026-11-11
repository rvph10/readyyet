import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const bezier = (x1: number, y1: number, x2: number, y2: number) => (t: number) => {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  let lo = 0;
  let hi = 1;
  let s = t;
  for (let i = 0; i < 24; i++) {
    s = (lo + hi) / 2;
    const x = 3 * (1 - s) * (1 - s) * s * x1 + 3 * (1 - s) * s * s * x2 + s * s * s;
    if (x < t) lo = s;
    else hi = s;
  }
  return 3 * (1 - s) * (1 - s) * s * y1 + 3 * (1 - s) * s * s * y2 + s * s * s;
};

const ZOOM = bezier(0.4, 0.05, 0.35, 0.95);
const PAN = bezier(0.4, 0.05, 0.6, 1);
const RISE = bezier(0.16, 1, 0.3, 1);

const U_MAX = 616;
const U_PIN = 30.6;
const U_BURST = 436;
const U_LATE = 144;

// Ledger's hero: the panel opens to the window, the camera zooms and pans
// over the mat, the phone's screen plays its story, and the call to action
// bursts into a full-screen panel, all scrubbed by the scroll. Timeline
// positions are in the template's own units, unit() turns one into pixels of
// scroll for the current window height.
export function startHeroScroll(hero: HTMLElement) {
  const mm = gsap.matchMedia();
  mm.add({ wide: "(min-width: 768px)", motion: "(prefers-reduced-motion: no-preference)" }, (context) => {
    const { wide, motion } = context.conditions as { wide: boolean; motion: boolean };
    if (!motion) return;

    const pin = hero.querySelector<HTMLElement>(".hero__pin")!;
    const box = hero.querySelector<HTMLElement>(".hero__panelbox")!;
    const panel = hero.querySelector<HTMLElement>(".hero__panel")!;
    const burst = hero.querySelector<HTMLElement>(".hero__burst")!;
    const svg = hero.querySelector<SVGSVGElement>(".hero__device svg")!;
    const $ = (selector: string) => svg.querySelector(selector);

    const uStart = wide ? 12 : U_PIN;
    const uEnd = (wide ? 496 : 400) + U_LATE;
    const at = (u: number) => u - uStart;
    const later = (u: number) => at(u + U_LATE);
    const unit = () => (4 * window.innerHeight + 188) / U_MAX;

    const tl = gsap.timeline({ paused: true, defaults: { ease: "none" } });
    const cleanup: (() => void)[] = [];

    tl.fromTo(box, { "--open": 0 }, { "--open": 1, duration: 76 - uStart, ease: "sine.inOut" }, at(uStart));
    tl.fromTo(box, { "--zoom": 0 }, { "--zoom": 1, duration: 147 - 86, ease: ZOOM }, at(86));
    tl.fromTo(box, { "--pan": 0 }, { "--pan": 1, duration: 298 - 156, ease: PAN }, later(156));

    // The tracking page walks the Workflow. Each step becomes the current one
    // at its time here, the Status above changing with it.
    const reach = [0, 110, 140, 224, 330];
    const all = (selector: string) => [...svg.querySelectorAll(selector)];
    const labels = all(".phone__status-label");
    const now = all(".phone__step-now");
    const done = all(".phone__step-done");
    const lines = all(".phone__line");
    const swap = { duration: 18, ease: RISE };
    const pop = { duration: 16, ease: RISE };
    const origin = { transformOrigin: "50% 50%" };

    reach.forEach((u, i) => {
      const next = reach[i + 1];
      if (i > 0) tl.fromTo(labels[i], { opacity: 0, y: 30 }, { opacity: 1, y: 0, ...swap }, at(u));
      if (next !== undefined) {
        tl.fromTo(labels[i], { opacity: 1, y: 0 }, { opacity: 0, y: -30, ...swap, immediateRender: i === 0 }, at(next));
        if (i > 0) tl.fromTo(now[i], { opacity: 0, scale: 0.6, ...origin }, { opacity: 1, scale: 1, ...pop }, at(u));
        tl.fromTo(
          now[i],
          { opacity: 1, scale: 1, ...origin },
          { opacity: 0, scale: 0.6, duration: 8, immediateRender: i === 0 },
          at(next),
        );
        tl.fromTo(lines[i], { scaleY: 0, transformOrigin: "50% 0%" }, { scaleY: 1, duration: 14 }, at(next));
      }
      tl.fromTo(done[i], { opacity: 0, scale: 0.4, ...origin }, { opacity: 1, scale: 1, ...pop }, at(next ?? u));
    });

    const ready = reach.at(-1)!;
    tl.fromTo($(".phone__ready-fill"), { opacity: 0 }, { opacity: 1, duration: 16, ease: "sine.out" }, at(ready));
    tl.fromTo($(".phone__expected"), { opacity: 1 }, { opacity: 0, duration: 8 }, at(ready));
    tl.fromTo($(".phone__open"), { opacity: 0 }, { opacity: 1, duration: 12 }, at(ready + 6));

    all(".phone__photo").forEach((photo, i) => {
      tl.fromTo(
        photo,
        { opacity: 0, scale: 0.5, ...origin },
        { opacity: 1, scale: 1, duration: 20, ease: RISE },
        at([244, 258, 310][i]),
      );
    });

    tl.fromTo($(".phone__cta"), { y: 64 }, { y: 0, duration: 40, ease: RISE }, later(226));
    tl.fromTo($(".phone__cta"), { opacity: 0 }, { opacity: 1, duration: 16, ease: "sine.out" }, later(226));

    const float = (name: string) => hero.querySelector<HTMLElement>(`.hero__float--${name}`)!;
    const quote = float("quote");
    const photo = float("photo");
    const readyCard = float("ready");
    const enter = { "--s": 1, duration: 30, ease: "back.out(1.4)" };

    tl.fromTo(quote, { autoAlpha: 1, "--s": 0 }, { ...enter }, at(140));
    tl.fromTo(photo, { autoAlpha: 1, "--s": 0 }, { ...enter }, at(230));
    tl.fromTo(readyCard, { autoAlpha: 1, "--s": 0 }, { ...enter }, at(ready + 4));
    tl.fromTo(
      readyCard.querySelector(".float__ready"),
      { opacity: 1 },
      { opacity: 0, duration: 10, ease: "sine.in" },
      later(378),
    );
    tl.fromTo(
      readyCard.querySelector(".float__done"),
      { opacity: 0 },
      { opacity: 1, duration: 10, ease: "sine.out" },
      later(384),
    );

    // The quote lands on the Status, the photo in the third slot, each one's
    // landing being the change it brings. fx and fy are fractions of the phone.
    (
      [
        { card: quote, u: 184, fx: 0.5, fy: 0.257 },
        { card: photo, u: 270, fx: 0.736, fy: 0.781 },
      ] as const
    ).forEach(({ card, u, fx, fy }) => {
      tl.to(card, { "--fx": fx, duration: 40, ease: "power2.inOut" }, at(u));
      tl.to(card, { "--fy": fy, duration: 40, ease: "power1.inOut" }, at(u));
      tl.to(card, { "--s": 0, duration: 40, ease: "power2.in" }, at(u));
      tl.fromTo(card, { "--dy": 0 }, { "--dy": -110, duration: 20, ease: "sine.out", immediateRender: false }, at(u));
      tl.fromTo(
        card,
        { "--dy": -110 },
        { "--dy": 0, duration: 20, ease: "sine.in", immediateRender: false },
        at(u + 20),
      );
    });

    tl.fromTo($(".phone__cta-chip"), { x: -310 }, { x: 0, duration: 382 - 287, ease: PAN }, later(287));
    tl.fromTo(
      [$(".phone__cta-fill"), $(".phone__cta-clip")],
      { attr: { width: 32 } },
      { attr: { width: 342 }, duration: 382 - 287, ease: PAN },
      later(287),
    );
    tl.fromTo(all(".phone__cta-label"), { x: 16 }, { x: -16, duration: 382 - 287, ease: PAN }, later(287));

    if (wide) {
      tl.fromTo(
        [...all(".phone__cta-label"), $(".phone__cta-arrow")],
        { opacity: 1 },
        { opacity: 0, duration: 16, ease: "sine.inOut" },
        later(384),
      );
      tl.fromTo(
        $(".phone__cta-mark"),
        { opacity: 0, scale: 0.4, ...origin },
        { opacity: 1, scale: 1, duration: 12, ease: "power2.out" },
        later(400),
      );
    }

    tl.set({}, {}, at(uEnd));

    if (wide) {
      const restTop = () => {
        const u = box.clientWidth / 1408;
        return (window.innerHeight - 665.496 * u) / 2 + 103 * u;
      };

      const track = svg.querySelector(".phone__cta > rect")!;
      const fill = $(".phone__cta-fill")!;
      const pill = burst.querySelector<HTMLElement>(".hero__burst-pill")!;
      const from = { top: 0, right: 0, bottom: 0, left: 0, radius: 0 };
      const shift = { x: 0, y: 0 };
      const shape = { p: 0 };

      const measure = () => {
        const b = box.getBoundingClientRect();
        const t = track.getBoundingClientRect();
        const f = fill.getBoundingClientRect();
        const width = document.documentElement.clientWidth;
        const height = window.innerHeight;
        const top = b.top - restTop();
        Object.assign(burst.style, {
          top: `${-restTop()}px`,
          left: `${-b.left}px`,
          width: `${width}px`,
          height: `${height}px`,
        });
        Object.assign(from, {
          top: t.top - top,
          right: width - t.right,
          bottom: top + height - t.bottom,
          left: t.left,
          radius: t.height / 3,
        });
        Object.assign(pill.style, {
          left: `${f.left}px`,
          top: `${f.top - top}px`,
          width: `${f.width}px`,
          height: `${f.height}px`,
          borderRadius: `${f.height / 4}px`,
        });
        shift.x = width / 2 - (f.left + f.width / 2);
        shift.y = height / 2 - (f.top - top + f.height / 2);
      };

      let measured = false;
      const paint = () => {
        if (!measured) {
          measure();
          measured = true;
        }
        const p = shape.p;
        const q = 1 - p;
        burst.style.clipPath = `inset(${from.top * q}px ${from.right * q}px ${from.bottom * q}px ${from.left * q}px round ${q * (from.radius + p * 64)}px)`;
        pill.style.transform = `translate(${shift.x * p}px, ${shift.y * p}px) scale(${1 - 0.4 * p})`;
      };

      const tuckNext = () => {
        const bottom = parseFloat(getComputedStyle(hero).paddingBottom);
        hero.style.marginBottom = `${window.innerHeight - restTop() - box.offsetHeight - bottom}px`;
      };
      tuckNext();
      ScrollTrigger.addEventListener("refreshInit", tuckNext);

      const remeasure = () => {
        measured = false;
        if (shape.p > 0) paint();
      };
      ScrollTrigger.addEventListener("refresh", remeasure);

      tl.fromTo(burst, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5 }, later(U_BURST));
      tl.fromTo(
        shape,
        { p: 0 },
        { p: 1, duration: 496 - U_BURST, ease: "sine.inOut", onUpdate: paint },
        later(U_BURST),
      );
      tl.fromTo(pill, { autoAlpha: 1 }, { autoAlpha: 0, duration: 28, ease: "sine.in" }, later(462));

      const pinned = ScrollTrigger.create({
        trigger: pin,
        start: () => `top ${restTop() - parseFloat(getComputedStyle(pin).paddingTop)}px`,
        end: () => `+=${(uEnd - U_PIN) * unit()}`,
        pin,
        invalidateOnRefresh: true,
      });

      const reach = () => {
        const rem = parseFloat(getComputedStyle(document.documentElement).fontSize);
        const radius = parseFloat(getComputedStyle(box).getPropertyValue("--radius-panel")) * rem;
        return Math.max(0, window.innerHeight - restTop() - box.offsetHeight + radius);
      };

      gsap.fromTo(
        box,
        { "--fill": 0 },
        {
          "--fill": 1,
          ease: "none",
          scrollTrigger: {
            trigger: pin,
            start: () => pinned.start - Math.max(1, reach()),
            end: () => pinned.start,
            scrub: true,
            invalidateOnRefresh: true,
          },
        },
      );

      cleanup.push(() => {
        ScrollTrigger.removeEventListener("refreshInit", tuckNext);
        ScrollTrigger.removeEventListener("refresh", remeasure);
        hero.style.marginBottom = "";
        ["top", "left", "width", "height", "clipPath"].forEach((key) =>
          burst.style.removeProperty(key.replace("clipPath", "clip-path")),
        );
        pill.removeAttribute("style");
      });

      ScrollTrigger.create({
        trigger: pin,
        start: () => pinned.start - (U_PIN - uStart) * unit(),
        end: () => pinned.end,
        animation: tl,
        scrub: true,
        invalidateOnRefresh: true,
      });
    } else {
      const pinned = ScrollTrigger.create({
        trigger: pin,
        start: "top top",
        end: () => `+=${(uEnd - U_PIN) * unit()}`,
        pin,
        animation: tl,
        scrub: true,
        invalidateOnRefresh: true,
      });

      gsap.fromTo(
        box,
        { "--grow": 0 },
        {
          "--grow": 1,
          ease: "none",
          scrollTrigger: {
            trigger: panel,
            start: () => {
              const rest = (panel.offsetWidth * 598) / 1408;
              return Math.min(pinned.start - 1, Math.max(0, pinned.start + 16 + rest - window.innerHeight));
            },
            end: () => pinned.start,
            scrub: true,
            invalidateOnRefresh: true,
          },
        },
      );

      gsap.fromTo(
        box,
        { "--tuck": 1 },
        {
          "--tuck": 0,
          ease: "none",
          scrollTrigger: {
            trigger: pin,
            start: () => Math.max(0, pinned.start - (panel.offsetWidth * 120) / 1408 - 16),
            end: () => pinned.start,
            scrub: true,
            invalidateOnRefresh: true,
          },
        },
      );
    }

    return () => {
      tl.kill();
      cleanup.forEach((fn) => fn());
    };
  });
  return () => mm.revert();
}
