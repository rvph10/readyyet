/*! Temlis · Two Plan Pricing Cards · licensed to tmfp_todrbqozfsyjmpf6 · temlis.com/license */
// Temlis: this script only sees its own section (see temlis-scope.js).
(function (document) {
// Contelas — load entrance and scroll reveals.
// Port of src/scripts/hero-intro.ts + src/scripts/scroll-reveal.ts, same logic, one
// file because BaseLayout loads both on every page.
//
// Classic script, no module syntax: the catalog preview inlines it and cannot defer
// it, so it waits for the DOM itself and reads window.gsap inside init.
(function () {
  // ── Hero entrance ────────────────────────────────────────────────────────
  // Runs once on load, cascading the hero down the page with the same grammar as
  // the scroll reveals. The head snippet of a hero page adds html.hero-armed before
  // first paint and clears it after 2.5s, so a failure here leaves the hero visible.

  /** Solves a CSS cubic-bezier so the motion matches the stylesheet exactly. */
  function cubicBezier(x1, y1, x2, y2) {
    const curve = (a, b, t) => {
      const c = 3 * a;
      const d = 3 * (b - a) - c;
      const e = 1 - c - d;
      return ((e * t + d) * t + c) * t;
    };
    return (time) => {
      // Invert the x curve by bisection, then read y at that point.
      let low = 0;
      let high = 1;
      let t = time;
      for (let i = 0; i < 20; i++) {
        const x = curve(x1, x2, t);
        if (Math.abs(x - time) < 1e-5) break;
        if (x < time) low = t;
        else high = t;
        t = (low + high) / 2;
      }
      return curve(y1, y2, t);
    };
  }

  // Mirrors the reveal transition in the stylesheet.
  const EASE = cubicBezier(0.16, 1, 0.3, 1);
  const DURATION = 0.85;
  const STAGGER = 0.09;

  function heroIntro() {
    const gsap = window.gsap;
    const scope = document.querySelector("[data-hero]");
    const root = document.documentElement;
    const release = () => root.classList.remove("hero-armed");

    if (!scope || !root.classList.contains("hero-armed") || !gsap) {
      release();
      return;
    }

    const run = () => {
      // Document order is the entrance order.
      const items = Array.from(scope.querySelectorAll("[data-hero-item]"));
      if (items.length === 0) {
        release();
        return;
      }

      gsap.set(items, { opacity: 1 });
      release();

      gsap.from(items, {
        opacity: 0,
        y: 18,
        scale: 0.94,
        duration: DURATION,
        ease: EASE,
        stagger: STAGGER,
        onComplete: () => {
          // Hand the elements back to the browser once they have arrived.
          gsap.set(items, { clearProps: "all" });
        },
      });
    };

    // Waiting for fonts keeps the text from shifting mid-animation.
    if (document.fonts && document.fonts.status === "loaded") run();
    else ((document.fonts && document.fonts.ready) || Promise.resolve()).then(run).catch(release);
  }

  // ── Scroll reveals ───────────────────────────────────────────────────────
  // Elements are visible in CSS by default; the hidden starting state is only armed
  // once this runs, so a blocked or failed script can never leave content invisible.
  // Motion is CSS transitions, not a JavaScript ticker.
  const SELECTOR =
    ".animation, .box-green, .box-card, .h1, .button-wrap, .scroll-into-view, [data-reveal]";
  const STAGGER_MS = 90;
  const MAX_STAGGER_STEPS = 5;

  function scrollReveal() {
    // Elements the hero animates on load stay out of the scroll system.
    const items = Array.from(document.querySelectorAll(SELECTOR)).filter(
      (el) => !el.closest("[data-hero-item]"),
    );
    if (items.length === 0) return;

    document.documentElement.classList.add("reveals-armed");

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      for (const el of items) el.classList.add("is-revealed");
      return;
    }

    // Elements that reveal together cascade instead of arriving at once. Grouping
    // walks up to the nearest ancestor holding more than one revealing element, so
    // cards still cascade when each sits in its own wrapper — a slider slide, say.
    const descendantCount = new Map();
    for (const el of items) {
      let ancestor = el.parentElement;
      while (ancestor && ancestor !== document.documentElement) {
        descendantCount.set(ancestor, (descendantCount.get(ancestor) || 0) + 1);
        ancestor = ancestor.parentElement;
      }
    }

    const groups = new Map();
    for (const el of items) {
      let container = el.parentElement;
      while (container && (descendantCount.get(container) || 0) < 2) {
        container = container.parentElement;
      }
      if (!container) continue;
      const group = groups.get(container);
      if (group) group.push(el);
      else groups.set(container, [el]);
    }

    for (const group of groups.values()) {
      if (group.length < 2) continue;
      group.forEach((el, index) => {
        if (el.dataset.revealStagger === "off") return;
        const step = Math.min(index, MAX_STAGGER_STEPS);
        el.style.setProperty("--reveal-stagger", `${step * STAGGER_MS}ms`);
      });
    }

    const reveal = (entry, observer) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-revealed");
      observer.unobserve(entry.target);
    };

    // Two thresholds: headings and button rows start as soon as their edge enters
    // the viewport, everything else waits until 10% inside.
    const atEdge = new IntersectionObserver((entries, o) => entries.forEach((e) => reveal(e, o)), {
      rootMargin: "0px",
    });
    const inset = new IntersectionObserver((entries, o) => entries.forEach((e) => reveal(e, o)), {
      rootMargin: "0px 0px -10% 0px",
    });

    for (const el of items) {
      const delay = el.dataset.revealDelay;
      if (delay) el.style.setProperty("--reveal-delay", `${delay}ms`);

      const edgeTriggered =
        el.classList.contains("h1") ||
        el.classList.contains("button-wrap") ||
        el.dataset.revealOffset === "0";

      (edgeTriggered ? atEdge : inset).observe(el);
    }
  }

  function init() {
    heroIntro();
    scrollReveal();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();

}).call(this, window.temlisScope ? window.temlisScope("contelas-518") : document);
