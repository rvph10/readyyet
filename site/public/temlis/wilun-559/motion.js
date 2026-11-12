/*! Temlis · Tinted Bento Feature Cards · licensed to tmfp_hhtc3y7fdy36ihjk · temlis.com/license */
// Temlis: this script only sees its own section (see temlis-scope.js).
(function (document) {
// Wilun — the shared motion layer. Port of src/lib/motion.ts (the helpers every entrance
// speaks) and src/lib/reveal.ts (the scroll entrances picked by class), same logic and same
// numbers. The gestures that belong to one section live in that section's script.js and
// read the helpers from `window.wilunMotion`, published below.
//
// Classic script, no module syntax: the catalog preview inlines it and cannot defer it, so
// it waits for the DOM itself and reads window.gsap when a helper is CALLED, never when it
// is defined — which is what lets a section script that loads after this one use them.
//
// Three deliberate divergences from the landing, all about a section being standalone:
//
//   1. No Lenis. src/lib/smooth-scroll.ts is not ported, and its anchor delegation goes
//      with it. A catalog section is pasted into someone else's page, where `new Lenis()`
//      would take over THEIR scroll — once per section pasted. Every gesture here is
//      ScrollTrigger reading native scroll, and the two held stages (benefits, testimonials)
//      are CSS sticky, so they need nothing from it. Same call as Zunar.
//   2. The entrances start a tick after DOM ready, not at it. The landing runs them last —
//      its layout script is the final module on the page — after the hero, benefits and
//      testimonials scripts have run. Two of those grow their section (`.is-tall`), and a
//      ScrollTrigger created before that measures the short layout. Waiting a tick keeps
//      the landing's order with each section's own script.js loading after this file.
//   3. A missing library clears `data-motion` at once. In the landing the bundle carries
//      gsap; here it is the page's global, and without it the only thing that shows the
//      section is the head's 900 ms timer. Clearing it now costs the entrance, which the
//      source already says costs nothing.
(function () {
  const ROOT = document.documentElement;

  // ReadyYet: timings and curves brought to the home page's shared entrance
  // (lib/motion/reveal.ts): "reveal" ease, 24px rise, no overshoot.
  const TILT = 20; // degrees a letter is turned either way before it lands
  const POP = 0.022; // seconds between one letter setting off and the next
  const START = "top 85%";
  const RISE = 0.6; // seconds for a line of the eyebrow to clear its mask

  const gsapOf = () => window.gsap;

  /** Every library this page's motion reads, as the window provides it. */
  const ready = () => Boolean(window.gsap && window.ScrollTrigger && window.SplitText && window.DrawSVGPlugin);

  const wants = () => ROOT.hasAttribute("data-motion");

  const finePointer = () => window.matchMedia("(pointer: fine)").matches;

  /**
   * Hands elements back to the stylesheet once their entrance is over. The class goes on
   * first: it is what stops the staging rule from hiding them again the moment the inline
   * styles are cleared.
   */
  const settle = (targets) => {
    targets.filter(Boolean).forEach((el) => el.classList.add("is-in"));
    gsapOf().set(targets, { clearProps: "all" });
  };

  /** Reveals a staged element and puts it at the start of its entrance. */
  const stage = (targets, from) => gsapOf().set(targets, Object.assign({ visibility: "visible" }, from));

  /**
   * A title lands a letter at a time, each turned a little and out of order, so it reads
   * as scattered rather than swept. The opening title and every section header make the
   * same gesture, so it is described once.
   */
  const popFrom = {
    scale: 0,
    y: 30,
    rotation: () => gsapOf().utils.random(-TILT, TILT),
  };

  const popTo = {
    scale: 1,
    y: 0,
    rotation: 0,
    duration: 0.4,
    ease: "back.out(2)",
    stagger: { each: POP, from: "random" },
  };

  /**
   * Cuts a heading into letters, keeping the words whole so the browser never breaks a
   * line inside one. Where the design broke the lines itself the stylesheet holds them.
   */
  const letters = (el) => window.SplitText.create(el, { type: "words,chars" });

  window.wilunMotion = { ready, wants, finePointer, settle, stage, popFrom, popTo, letters, POP };

  /**
   * Entrances tied to the scroll. Four gestures, picked by class:
   *
   * `reveal-rise`  a block comes up as it enters
   * `reveal-lines` a header arrives: the eyebrow rises out of its mask, then the title
   *                pops in letter by letter, then whatever else the block holds comes up
   * `reveal-build` a card builds itself: the shape behind is drawn end to end, then the
   *                artwork arrives, then the words
   * `reveal-draw`  a stroke draws itself
   */
  function startReveals(scope) {
    if (!wants()) return;

    const gsap = gsapOf();
    const ScrollTrigger = window.ScrollTrigger;
    const SplitText = window.SplitText;

    const rising = gsap.utils.toArray(scope.querySelectorAll(".reveal-rise"));
    stage(rising, { opacity: 0, y: 24 });

    ScrollTrigger.batch(rising, {
      start: START,
      onEnter: (batch) =>
        gsap.to(batch, {
          y: 0,
          opacity: 1,
          duration: 0.9,
          stagger: 0.08,
          ease: "reveal",
          onComplete: () => settle(batch),
        }),
    });

    // The cutting waits for the header to come into view rather than happening on load:
    // a title is cut along the lines it already has, so it has to be asked once those
    // lines are the ones it will keep.
    const playHeader = (block) => {
      const splits = [];
      const eyebrows = [];
      const glyphs = [];
      const rest = [];

      gsap.utils.toArray(block.children).forEach((child) => {
        if (child.classList.contains("display")) {
          const split = letters(child);
          splits.push(split);
          glyphs.push(...split.chars);
        } else if (child.classList.contains("eyebrow")) {
          const split = SplitText.create(child, { type: "lines", mask: "lines" });
          splits.push(split);
          eyebrows.push(...split.lines);
        } else {
          rest.push(child);
        }
      });
      if (!splits.length && !rest.length) return;

      stage(eyebrows, { yPercent: 115 });
      stage(glyphs, popFrom);
      if (rest.length) stage(rest, { opacity: 0, y: 24 });
      gsap.set(block, { visibility: "visible" });

      gsap
        .timeline({
          onComplete: () => {
            splits.forEach((split) => split.revert());
            settle([block, ...rest]);
          },
        })
        .to(eyebrows, { yPercent: 0, duration: RISE, stagger: 0.08, ease: "reveal" })
        .to(glyphs, popTo, 0.15)
        .to(rest, { y: 0, opacity: 1, duration: 0.9, ease: "reveal" }, 0.5);
    };

    scope.querySelectorAll(".reveal-lines").forEach((block) => {
      ScrollTrigger.create({
        trigger: block,
        start: START,
        once: true,
        onEnter: () => playHeader(block),
      });
    });

    scope.querySelectorAll(".reveal-build").forEach((card) => {
      const stroke = card.querySelector("svg path");
      const art = gsap.utils.toArray(card.querySelectorAll(".features_art, .features_phone"));
      const badge = card.querySelector(".features_badge");
      const copy = card.querySelector(".features_copy");

      gsap.set(card, { visibility: "visible" });
      stage(art, { opacity: 0, scale: 0.94 });
      if (copy) stage(copy, { opacity: 0, y: 24 });
      if (badge) gsap.set(badge, { opacity: 0 });

      const tl = gsap.timeline({
        scrollTrigger: { trigger: card, start: START },
        onComplete: () => settle([card, ...art, badge, copy].filter(Boolean)),
      });

      // The shape behind is drawn last and slowly: it is the background of the card, and
      // racing the words to the front is what made it read as the subject.
      if (stroke) {
        gsap.set(stroke, { drawSVG: "0% 0%" });
        tl.to(stroke, { drawSVG: "0% 100%", duration: 1.9, ease: "power2.out" }, 0.55);
      }

      tl.to(art, { scale: 1, opacity: 1, duration: 0.9, ease: "reveal", stagger: 0.08 }, 0.25)
        .to(badge, { opacity: 1, duration: 0.6, ease: "reveal" }, 0.5)
        .to(copy, { y: 0, opacity: 1, duration: 0.9, ease: "reveal" }, 0.4);
    });

    // The plans sit side by side, so their shapes would all be drawn at the same moment.
    // Batched, they go one after another instead.
    const drawn = gsap.utils.toArray(scope.querySelectorAll(".reveal-draw path"));
    gsap.set(drawn, { drawSVG: "0% 0%" });

    ScrollTrigger.batch(drawn, {
      start: START,
      onEnter: (batch) =>
        gsap.to(batch, {
          drawSVG: "0% 100%",
          duration: 1.3,
          stagger: 0.18,
          ease: "power2.out",
        }),
    });
  }

  function init() {
    // Divergence 3.
    if (!ready()) {
      clearTimeout(window.__motionFallback);
      ROOT.removeAttribute("data-motion");
      return;
    }

    const gsap = window.gsap;
    try {
      gsap.registerPlugin(window.ScrollTrigger, window.SplitText, window.DrawSVGPlugin);
    } catch (e) {}

    // The head set a timer that undoes the starting states if this never arrived. It did.
    clearTimeout(window.__motionFallback);

    // Divergence 2.
    window.setTimeout(() => startReveals(document), 0);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();

}).call(this, window.temlisScope ? window.temlisScope("wilun-559") : document);
