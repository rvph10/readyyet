/*! Temlis · Dark About Statement Split · licensed to tmfp_zh5jun5so7vmmaer · temlis.com/license */
// Temlis: this script only sees its own section (see temlis-scope.js).
(function (document) {
/* Ledger — shared motion. Ported by hand from the landing's src/lib/entrances.ts (the entrances
   of about, features and endpoints) and src/lib/fill-buttons.ts (the fill that follows the
   pointer into a button). Same logic, no TypeScript and no module syntax: the catalog preview
   inlines the scripts of the package and strips module syntax, so everything has to exist as a
   global. GSAP and its plugins (CustomEase, ScrollTrigger, SplitText) are provided by the
   window — never linked to a CDN.

   Left out on purpose:
   - Lenis (smooth-scroll.ts). A section pasted into another site would take over that site's
     scroll. The entrances run on ScrollTrigger over native scroll.
   - The entrances of the hero, the testimonial and pricing: those sections were not ported.

   The component-scoped <script> of Features.astro (the card stack tied to the scroll) lives in
   the script.js of its own section. */
(function () {
  "use strict";

  const ROOT = document.documentElement;

  /* entrances.ts clears the <head> fallback the moment it loads. Only when GSAP is here: without
     it, the fallback has to fire and hand the content back. */
  if (window.gsap) clearTimeout(window.__enterFallback);

  let gsap = null;
  let ScrollTrigger = null;
  let SplitText = null;

  const SHOWN = "is-revealed";
  const CLEAR = "transform,translate,rotate,scale,opacity,visibility";
  const COLUMN = "(max-width: 991px)";

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];

  const show = (...els) => els.forEach((el) => el && el.classList.add(SHOWN));

  function once(trigger, start, play) {
    if (!trigger) return;
    ScrollTrigger.create({ trigger, start, once: true, onEnter: play });
  }

  function keepBindings(el) {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => (node.nodeValue = (node.nodeValue || "").replace(/[^\S ]+/g, " ")));
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (first) first.nodeValue = (first.nodeValue || "").replace(/^ /, "");
    if (last) last.nodeValue = (last.nodeValue || "").replace(/ $/, "");
  }

  function split(el, vars) {
    keepBindings(el);
    return SplitText.create(el, Object.assign({ reduceWhiteSpace: false }, vars));
  }

  function riseLines(el, delay) {
    if (!el) return;
    const parts = split(el, { type: "lines", mask: "lines" });
    parts.masks.forEach((mask) => {
      mask.style.overflow = "visible";
      mask.style.clipPath = "inset(-0.35em -100vw -0.2em -100vw)";
    });
    gsap.set(parts.lines, { yPercent: 125 });
    show(el);
    gsap.to(parts.lines, {
      yPercent: 0,
      duration: 0.8,
      ease: "ledger-mask",
      stagger: 0.08,
      delay: delay || 0,
      onComplete: () => parts.revert(),
    });
  }

  function reveal(els, from, to) {
    const targets = els.filter(Boolean);
    if (!targets.length) return;
    gsap.set(targets, from);
    show(...targets);
    return gsap.to(targets, to);
  }

  function uncover(img) {
    if (!img) return;
    reveal(
      [img],
      { autoAlpha: 0, scale: 1.1, filter: "blur(14px)" },
      { autoAlpha: 1, scale: 1, duration: 1.4, ease: "ledger-calm", clearProps: CLEAR },
    );
    gsap.to(img, { filter: "blur(0px)", duration: 0.95, ease: "ledger-calm", clearProps: "filter" });
  }

  function pop(els, from, to) {
    reveal(
      els,
      Object.assign({ scale: 0, autoAlpha: 0 }, from),
      Object.assign({ scale: 1, autoAlpha: 1, duration: 0.7, ease: "expo.out", stagger: 0.1, clearProps: CLEAR }, to),
    );
  }

  /* ---------- entrances.ts ---------- */

  function about() {
    const statement = $(".about__statement");
    const media = $(".about__media");
    const avatars = $$(".about__avatars img");

    once(statement, "top 85%", () => riseLines(statement));
    once(media, "top 85%", () => uncover(media));
    once(avatars[0], "top 90%", () => pop(avatars, {}, { delay: 0.2 }));
  }

  function features() {
    const heading = $(".features__heading");
    const cards = $$(".fcard");

    once(heading, "top 85%", () => riseLines(heading));

    /* gate:one-shot-mq ok — read once to pick the entrance, as the landing does. Above the cut
       the cards are shown at once and the stack in script.js deals them with the scroll; the
       stylesheet only hides them below the cut, so a window that narrows later finds them
       already shown instead of stuck. */
    if (!window.matchMedia(COLUMN).matches) {
      show(...cards);
      return;
    }

    ScrollTrigger.batch(cards, {
      start: "top 90%",
      once: true,
      onEnter: (batch) => {
        const dealt = batch;
        const deal = { duration: 1, ease: "expo.out", stagger: 0.1 };
        reveal(dealt, { autoAlpha: 0, "--spin": 0 }, Object.assign({ autoAlpha: 1, "--spin": 1, clearProps: "opacity,visibility" }, deal));
        gsap.fromTo(
          dealt.map((card) => card.parentElement),
          { y: "3em", rotation: (i) => (i % 2 ? 4 : -4) },
          Object.assign({ y: 0, rotation: 0, clearProps: CLEAR }, deal),
        );
      },
    });
  }

  function endpoints() {
    const title = $(".endpoints__title");
    const media = $(".endpoints__media");

    once(title, "top 85%", () => riseLines(title));
    once(media, "top 85%", () => uncover(media));
  }

  function startEntrances() {
    if (!ROOT.hasAttribute("data-enter")) return;

    Promise.race([document.fonts.ready, new Promise((resolve) => setTimeout(resolve, 800))]).then(() => {
      about();
      features();
      endpoints();
    });
  }

  /* ---------- fill-buttons.ts ---------- */

  function startFillButtons() {
    const hover = window.matchMedia("(min-width: 992px) and (hover: hover) and (pointer: fine)");

    document.querySelectorAll(".btn--fill").forEach((button) => {
      const overlay = button.querySelector(".btn__overlay");
      if (!overlay) return;

      const point = (event) => {
        const width = button.offsetWidth;
        const height = button.offsetHeight;
        const x = Math.min(Math.max(event.offsetX, 0), width);
        const y = Math.min(Math.max(event.offsetY, 0), height);
        return { x, y, r: Math.hypot(Math.max(x, width - x), Math.max(y, height - y)) + 1 };
      };

      const place = ({ x, y }) => {
        overlay.style.setProperty("--fill-x", `${x}px`);
        overlay.style.setProperty("--fill-y", `${y}px`);
      };

      button.addEventListener("pointerenter", (event) => {
        if (!hover.matches) return;
        const target = point(event);
        place(target);
        overlay.style.setProperty("--fill-r", `${target.r}px`);
      });

      button.addEventListener("pointerleave", (event) => {
        if (!hover.matches) return;
        const exit = point(event);
        const current = parseFloat(getComputedStyle(overlay).getPropertyValue("--fill-r")) || 0;
        const full = parseFloat(overlay.style.getPropertyValue("--fill-r")) || 0;

        if (full > 0 && current >= full - 0.5) {
          overlay.style.transition = "none";
          place(exit);
          overlay.style.setProperty("--fill-r", `${exit.r}px`);
          overlay.getBoundingClientRect();
          overlay.style.removeProperty("transition");
        }

        overlay.style.setProperty("--fill-r", "0px");
      });
    });
  }

  /* ---------- start ---------- */

  function init() {
    gsap = window.gsap;
    ScrollTrigger = window.ScrollTrigger;
    SplitText = window.SplitText;
    const CustomEase = window.CustomEase;

    // The fill is plain pointer events and CSS: it runs with or without GSAP.
    startFillButtons();

    if (!gsap || !ScrollTrigger || !SplitText || !CustomEase) {
      ROOT.removeAttribute("data-enter");
      return;
    }

    gsap.registerPlugin(CustomEase, ScrollTrigger, SplitText);
    CustomEase.create("ledger-mask", "0.625, 0.05, 0, 1");
    CustomEase.create("ledger-calm", "0.241, 0.969, 0.635, 0.997");

    startEntrances();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();

}).call(this, window.temlisScope ? window.temlisScope("ledger-781") : document);
