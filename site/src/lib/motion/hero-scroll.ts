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
const EXPAND = bezier(0.6, 0, 0.2, 1.12);
const RISE = bezier(0.16, 1, 0.3, 1);

const U_MAX = 616;
const U_PIN = 30.6;
const U_STACK = 150;
const U_STEP = 24;
const U_SLIDE = 30;
const U_LATE = 144;

// Ledger's hero: the panel opens to the window, the camera zooms and pans
// over the mat, and the phone plays a shop's day in ReadyYet: its Tickets,
// one Ticket opened, new Tickets landing in the week's count, and the jacket
// slid to Ready while its email goes out, all scrubbed by the scroll. Timeline
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
    const svg = hero.querySelector<SVGSVGElement>(".hero__device svg")!;
    const $ = (selector: string) => svg.querySelector(selector);

    const uStart = wide ? 12 : U_PIN;
    const uEnd = (wide ? 440 : 400) + U_LATE;
    const at = (u: number) => u - uStart;
    const later = (u: number) => at(u + U_LATE);
    const unit = () => (4 * window.innerHeight + 188) / U_MAX;

    const tl = gsap.timeline({ paused: true, defaults: { ease: "none" } });
    const cleanup: (() => void)[] = [];

    tl.fromTo(box, { "--open": 0 }, { "--open": 1, duration: 76 - uStart, ease: "sine.inOut" }, at(uStart));
    tl.fromTo(box, { "--zoom": 0 }, { "--zoom": 1, duration: 147 - 86, ease: ZOOM }, at(86));
    tl.fromTo(box, { "--pan": 0 }, { "--pan": 1, duration: 298 - 156, ease: PAN }, later(156));

    const huld = $(".phone__card--huld");
    const deck = [$(".phone__card--artc"), $(".phone__card--nexaa"), $(".phone__card--joy"), huld];
    const stacked = (k: number) => -114 * k;
    const slide = { duration: U_SLIDE, ease: "power3.inOut" };

    deck.slice(1).forEach((card, i) => {
      const k = i + 1;
      tl.fromTo(card, { y: 0 }, { y: stacked(k), ...slide }, at(U_STACK + i * U_STEP));
      deck.slice(0, k).forEach((under, j) => {
        tl.fromTo(
          under,
          { scale: 1 - 0.05 * (k - 1 - j), transformOrigin: "50% 0%" },
          { scale: 1 - 0.05 * (k - j), ...slide, immediateRender: j === k - 1 },
          at(U_STACK + i * U_STEP),
        );
      });
    });
    tl.fromTo(deck.slice(0, 3), { opacity: 1 }, { opacity: 0, duration: 1 }, at(U_STACK + 2 * U_STEP + U_SLIDE));

    (
      [
        [".phone__header-top", 88],
        [".phone__header-balance", 92],
      ] as const
    ).forEach(([selector, u]) => {
      tl.fromTo(
        $(selector),
        { opacity: 1, y: 0, scale: 1, transformOrigin: "50% 50%" },
        { opacity: 0, y: -18, scale: 0.94, duration: 22, ease: "power1.in" },
        later(u),
      );
    });

    const expand = { duration: 52, ease: EXPAND };
    tl.fromTo(
      $(".phone__huld-bg"),
      { attr: { y: 617, height: 194 } },
      { attr: { y: 80, height: 341 }, ...expand },
      later(98),
    );
    tl.fromTo(
      $(".phone__huld-edge"),
      { attr: { y: 617.5, height: 193 } },
      { attr: { y: 80.5, height: 340 }, ...expand },
      later(98),
    );
    tl.fromTo(
      $("#phone-huld-grad"),
      { attr: { y1: 617, y2: 811 } },
      { attr: { y1: 80, y2: 421 }, ...expand },
      later(98),
    );
    tl.fromTo([$(".phone__huld-head"), $(".phone__huld-row")], { y: 0 }, { y: -537, ...expand }, later(98));
    tl.fromTo($(".phone__huld-detail"), { y: 537 }, { y: 0, ...expand }, later(98));
    tl.fromTo(huld, { y: stacked(3) }, { y: 299, ...expand, immediateRender: false }, later(98));
    tl.fromTo($(".phone__huld-row"), { opacity: 1 }, { opacity: 0, duration: 14, ease: "sine.in" }, later(98));

    tl.fromTo($(".phone__detail-top"), { opacity: 0 }, { opacity: 1, duration: 1 }, later(102));
    tl.fromTo(
      [$(".phone__nav-back"), $(".phone__nav-more")],
      { opacity: 0, scale: 0.6, transformOrigin: "50% 50%" },
      { opacity: 1, scale: 1, duration: 22, ease: RISE, stagger: 6 },
      later(104),
    );
    tl.fromTo(
      $(".phone__nav-title"),
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 22, ease: RISE },
      later(108),
    );
    tl.fromTo($(".phone__rev-label"), { y: 22 }, { y: 0, duration: 28, ease: RISE }, later(110));
    tl.fromTo($(".phone__rev-amount"), { y: 52 }, { y: 0, duration: 32, ease: RISE }, later(114));
    tl.fromTo($(".phone__chart-days"), { opacity: 0 }, { opacity: 1, duration: 24, ease: "sine.out" }, later(128));
    tl.fromTo(
      $(".phone__rev-badge"),
      { opacity: 0, scale: 0.7, transformOrigin: "50% 50%" },
      { opacity: 1, scale: 1, duration: 20, ease: RISE },
      later(130),
    );

    const bars = [...svg.querySelectorAll<SVGRectElement>(".phone__bar")];
    const peaks = [33.1, 44.6, 28.8, 53.3, 39.6, 61.9, 66.2];
    bars.forEach((bar, i) => {
      tl.fromTo(
        bar,
        { attr: { y: 334, height: 0 } },
        { attr: { y: 334 - peaks[i], height: peaks[i] }, duration: 26, ease: RISE },
        later(122 + i * 5),
      );
    });

    tl.fromTo($(".phone__huld-detail"), { opacity: 0 }, { opacity: 1, duration: 1 }, later(140));
    tl.fromTo($(".phone__huld-amount"), { y: 60 }, { y: 0, duration: 34, ease: RISE }, later(142));
    tl.fromTo($(".phone__huld-caption"), { y: 18 }, { y: 0, duration: 28, ease: RISE }, later(152));
    tl.fromTo(
      $(".phone__huld-arrow"),
      { opacity: 0, x: -8, y: 8 },
      { opacity: 1, x: 0, y: 0, duration: 20, ease: RISE },
      later(162),
    );
    svg.querySelectorAll(".phone__huld-stat").forEach((stat, i) => {
      tl.fromTo(
        stat,
        { opacity: 0, y: 24, scale: 0.96, transformOrigin: "50% 100%" },
        { opacity: 1, y: 0, scale: 1, duration: 24, ease: RISE },
        later(154 + i * 8),
      );
    });
    svg.querySelectorAll<SVGTextElement>(".phone__huld-stat-value").forEach((value) => {
      const shown = (value.dataset.value ??= value.textContent);
      const [, sign, digits] = shown.match(/^(\D*)([\d,]+)$/)!;
      const count = { n: 0 };
      cleanup.push(() => (value.textContent = shown));
      tl.fromTo(
        count,
        { n: 0 },
        {
          n: Number(digits.replace(/,/g, "")),
          duration: 96,
          ease: "power1.out",
          onUpdate: () => (value.textContent = `${sign}${Math.round(count.n).toLocaleString("en-US")}`),
        },
        later(154),
      );
    });

    tl.fromTo($(".phone__cta"), { y: 64 }, { y: 0, duration: 40, ease: RISE }, later(226));
    tl.fromTo($(".phone__cta"), { opacity: 0 }, { opacity: 1, duration: 16, ease: "sine.out" }, later(226));

    const float = (name: string) => hero.querySelector<HTMLElement>(`.hero__float--${name}`)!;
    const payment = float("payment");
    const tap = float("tap");
    const invoice = float("invoice");
    const enter = { "--s": 1, duration: 30, ease: "back.out(1.4)" };

    tl.fromTo(payment, { autoAlpha: 1, "--s": 0 }, { ...enter }, at(92));
    tl.fromTo(tap, { autoAlpha: 1, "--s": 0 }, { ...enter }, later(116));
    tl.fromTo(invoice, { autoAlpha: 1, "--s": 0 }, { ...enter }, later(252));
    tl.fromTo(
      invoice.querySelector(".float__ready"),
      { opacity: 1 },
      { opacity: 0, duration: 10, ease: "sine.in" },
      later(378),
    );
    tl.fromTo(
      invoice.querySelector(".float__done"),
      { opacity: 0 },
      { opacity: 1, duration: 10, ease: "sine.out" },
      later(384),
    );

    const today = bars[6];
    const pulse = $(".phone__bar-pulse");
    const value = $(".phone__rev-value")!;
    const rate = $(".phone__rev-rate")!;
    const tally = { amount: 24, rate: 12 };
    const write = () => {
      value.textContent = `${Math.round(tally.amount)}`;
      rate.textContent = `${Math.round(tally.rate)}%`;
    };

    (
      [
        { card: payment, u: 140, from: peaks[6], to: 72, amount: 25, pace: 17, gain: ".phone__bar-gain" },
        { card: tap, u: 186, from: 72, to: 78, amount: 26, pace: 21, gain: ".phone__bar-gain2" },
      ] as const
    ).forEach(({ card, u, from, to, amount, pace, gain }, i) => {
      const land = u + 40;

      tl.to(card, { "--fx": 0.871, duration: 40, ease: "power2.inOut" }, later(u));
      tl.to(card, { "--fy": 0.348, duration: 40, ease: "power1.inOut" }, later(u));
      tl.to(card, { "--s": 0, duration: 40, ease: "power2.in" }, later(u));
      tl.fromTo(
        card,
        { "--dy": 0 },
        { "--dy": -110, duration: 20, ease: "sine.out", immediateRender: false },
        later(u),
      );
      tl.fromTo(
        card,
        { "--dy": -110 },
        { "--dy": 0, duration: 20, ease: "sine.in", immediateRender: false },
        later(u + 20),
      );

      tl.fromTo(
        today,
        { attr: { y: 334 - from, height: from } },
        { attr: { y: 334 - to, height: to }, duration: 18, ease: EXPAND, immediateRender: false },
        later(land),
      );
      tl.fromTo(
        pulse,
        { opacity: 0, attr: { r: 6, cy: 334 - to } },
        { opacity: 0.35, attr: { r: 12 }, duration: 4, immediateRender: i === 0 },
        later(land),
      );
      tl.fromTo(
        pulse,
        { opacity: 0.35, attr: { r: 12 } },
        { opacity: 0, attr: { r: 30 }, duration: 20, ease: "power2.out", immediateRender: false },
        later(land + 4),
      );
      tl.fromTo($(gain), { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 10, ease: RISE }, later(land));
      tl.fromTo(
        $(gain),
        { opacity: 1, y: 0 },
        { opacity: 0, y: -8, duration: 14, ease: "sine.in", immediateRender: false },
        later(land + 18),
      );
      tl.to(tally, { amount, rate: pace, duration: 20, ease: "power1.out", onUpdate: write }, later(land));
    });

    tl.fromTo($(".phone__cta-chip"), { x: -310 }, { x: 0, duration: 382 - 287, ease: PAN }, later(287));
    tl.fromTo(
      [$(".phone__cta-fill"), $(".phone__cta-clip")],
      { attr: { width: 32 } },
      { attr: { width: 342 }, duration: 382 - 287, ease: PAN },
      later(287),
    );
    tl.fromTo(
      svg.querySelectorAll(".phone__cta-label"),
      { x: 32 },
      { x: 89.6, duration: 382 - 287, ease: PAN },
      later(287),
    );

    if (wide) {
      const mark = $(".phone__cta-mark");

      tl.fromTo(
        [...svg.querySelectorAll(".phone__cta-label"), $(".phone__cta-arrow")],
        { opacity: 1 },
        { opacity: 0, duration: 16, ease: "sine.inOut" },
        later(384),
      );
      tl.fromTo(
        mark,
        { opacity: 0, scale: 0.4, transformOrigin: "50% 50%" },
        { opacity: 1, scale: 1, duration: 12, ease: "power2.out" },
        later(400),
      );
    }

    // The slide lands: the jacket is Ready, its last step is filled and the
    // Customer's email is counted.
    const done = { duration: 12, ease: "sine.inOut" };
    tl.fromTo($(".phone__huld-status"), { opacity: 1 }, { opacity: 0, ...done }, later(380));
    tl.fromTo($(".phone__huld-ready"), { opacity: 0 }, { opacity: 1, ...done }, later(386));
    tl.fromTo($(".phone__huld-caption"), { opacity: 1 }, { opacity: 0, ...done }, later(380));
    tl.fromTo($(".phone__huld-emailed"), { opacity: 0 }, { opacity: 1, ...done }, later(386));
    tl.fromTo(
      $(".phone__huld-progress"),
      { attr: { width: 151 } },
      { attr: { width: 302 }, duration: 18, ease: EXPAND },
      later(382),
    );
    const emails = svg.querySelectorAll<SVGTextElement>(".phone__huld-stat-value")[1];
    const sent = { n: 2 };
    tl.fromTo(
      sent,
      { n: 2 },
      { n: 3, duration: 6, onUpdate: () => (emails.textContent = `${Math.round(sent.n)}`) },
      later(386),
    );

    tl.set({}, {}, at(uEnd));

    if (wide) {
      const restTop = () => {
        const u = box.clientWidth / 1408;
        return (window.innerHeight - 665.496 * u) / 2 + 103 * u;
      };

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
