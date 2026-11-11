/*! Temlis · Use Case Card Slider · licensed to tmfp_ngj73s52iqhloxrc · temlis.com/license */
// Temlis: this script only sees its own section (see temlis-scope.js).
(function (document) {
/**
 * Lumora — shared motion engine.
 *
 * Hand-ported from `src/scripts/{split-text,load-animations,scroll-reveal}.ts` of
 * Temlis-Design/Lumora. The logic is the template's; what changed is the packaging:
 *
 *   - Classic script, no modules. The catalogue preview inlines the files of a piece and
 *     strips module syntax, so the splitter lives here instead of being imported.
 *   - `window.gsap` is resolved INSIDE init, never at parse time: inline cannot defer, so a
 *     top-level read runs before the library has landed.
 *   - ScrollTrigger is registered defensively. The preview window serves it because this file
 *     names it, but a piece opened outside it must degrade rather than throw.
 *
 * Every section carries this file. Each hook resolves to nothing when its markup is absent,
 * exactly as in the template, where the same two modules run on every page.
 */
(function () {
  "use strict";

  /* ── split-text.ts ──────────────────────────────────────────────────────────────── */

  const store = new WeakMap();

  function wrapWord(word) {
    const mask = document.createElement("span");
    mask.className = "split-mask";
    mask.setAttribute("aria-hidden", "true");

    const inner = document.createElement("span");
    inner.className = "split-word";
    inner.textContent = word;

    mask.appendChild(inner);
    return inner;
  }

  /**
   * Line splitting needs a word split first: words are laid out, their vertical offsets are
   * read back, and words sharing an offset are regrouped into a line. It depends on the final
   * font and container width, so it has to be redone whenever either can change.
   */
  function groupIntoLines(el, words) {
    const rows = new Map();
    for (const w of words) {
      const top = Math.round(w.getBoundingClientRect().top);
      const bucket = rows.get(top);
      if (bucket) bucket.push(w);
      else rows.set(top, [w]);
    }

    el.textContent = "";
    const lines = [];

    for (const wordsInRow of rows.values()) {
      const mask = document.createElement("span");
      mask.className = "split-mask";
      mask.style.display = "block";
      mask.setAttribute("aria-hidden", "true");

      const line = document.createElement("span");
      line.className = "split-line";
      line.textContent = wordsInRow.map((w) => w.textContent).join(" ");

      mask.appendChild(line);
      el.appendChild(mask);
      lines.push(line);
    }

    return lines;
  }

  /**
   * Splitting replaces the target's contents with spans, so pointing it at a wrapper would
   * dissolve whatever is inside. Descend to the element that actually holds the text first.
   */
  function resolveTarget(el) {
    let target = el;

    while (target.children.length === 1) {
      const child = target.firstElementChild;
      const ownText = Array.from(target.childNodes).some(
        (node) => node.nodeType === Node.TEXT_NODE && (node.textContent || "").trim() !== "",
      );
      if (ownText || !(child instanceof HTMLElement)) break;
      target = child;
    }

    return target;
  }

  function split(target, type) {
    const el = resolveTarget(target);
    const existing = store.get(el);
    if (existing) existing.result.revert();

    const originalHtml = el.innerHTML;
    const text = (el.textContent || "").trim();

    if (!text) return { pieces: [], revert: function () {} };

    if (!el.hasAttribute("aria-label")) el.setAttribute("aria-label", text);

    el.textContent = "";
    const words = text.split(/\s+/).map((word, i, all) => {
      const inner = wrapWord(word);
      el.appendChild(inner.parentElement);
      if (i < all.length - 1) el.appendChild(document.createTextNode(" "));
      return inner;
    });

    const pieces = type === "lines" ? groupIntoLines(el, words) : words;

    const result = {
      pieces: pieces,
      revert: function () {
        el.innerHTML = originalHtml;
        el.removeAttribute("aria-label");
        store.delete(el);
      },
    };

    store.set(el, { html: originalHtml, result: result });
    return result;
  }

  /** Re-splits line-based elements after a resize, since line breaks move with the width. */
  function watchLineResplit(targets, onResplit) {
    if (!targets.length) return;

    let width = window.innerWidth;
    let timer;

    window.addEventListener("resize", () => {
      if (window.innerWidth === width) return;
      width = window.innerWidth;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        for (const el of targets) onResplit(el, split(el, "lines").pieces);
      }, 150);
    });
  }

  /* ── load-animations.ts ─────────────────────────────────────────────────────────── */

  const $ = (sel) => Array.from(document.querySelectorAll(sel));
  const hook = (name) => $('[animation="' + name + '"]');
  const childrenOf = (sel) => $(sel).flatMap((el) => Array.from(el.children));

  // A single curve family keeps the whole sequence feeling like one movement.
  const RISE = "power3.out";
  const UNVEIL = "expo.out";
  const POP = "back.out(1.5)";

  function initLoadAnimations(gsap) {
    const release = () => document.documentElement.classList.remove("anim-pending");

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      release();
      return;
    }

    /** GSAP warns when handed an empty target list, so every call is guarded. */
    const from = (tl, t, vars, at) => {
      if (t.length) tl.from(t, vars, at);
    };
    const fromTo = (tl, t, a, b, at) => {
      if (t.length) tl.fromTo(t, a, b, at);
    };
    const to = (tl, t, vars, at) => {
      if (t.length) tl.to(t, vars, at);
    };

    // Split first: the timeline animates the resulting pieces, not the containers.
    const wordTargets = [...hook("heading-one"), ...hook("blog-heading"), ...hook("blog-description")];
    const lineTargets = [...hook("description")];

    const pieces = new Map();
    for (const el of wordTargets) pieces.set(el, split(el, "words").pieces);
    for (const el of lineTargets) pieces.set(el, split(el, "lines").pieces);
    const partsOf = (els) => els.flatMap((el) => pieces.get(el) || [el]);

    const heroImages = childrenOf(".hero_images");
    const statsWrapChildren = childrenOf('[animation="hero-stats-wrap"]');
    const articleHeaderChildren = childrenOf('[animation="blog-header"]');
    const articleBlocks = childrenOf('[animation="blog-content"]');

    // Header pieces are animated individually, which is what makes the bar assemble instead of
    // sliding in as a slab.
    const logo = $(".navbar_logo-link");
    const navLinks = $(".navbar_list > *");
    const navButtons = $(".nav_buttons-wrap > * > *, .nav_buttons-wrap > button");

    // Building the timelines is what applies the starting values. Do NOT pre-apply them with
    // gsap.set(): a `from` tween would then animate from 0 to 0 and never appear.

    // --- header -------------------------------------------------------------
    const header = gsap.timeline();
    from(header, logo, { opacity: 0, y: -12, duration: 0.7, ease: RISE }, 0);
    from(header, navLinks, { opacity: 0, y: -14, duration: 0.6, ease: RISE, stagger: 0.055 }, 0.08);
    // GSAP and the stylesheet must not both drive `transform` on one element: the button hover
    // transitions it, so the transition is suppressed for the entrance and handed back after.
    for (const button of navButtons) button.setAttribute("data-entering", "");
    from(
      header,
      navButtons,
      {
        opacity: 0,
        scale: 0.85,
        duration: 0.6,
        ease: POP,
        stagger: 0.07,
        onComplete: () => {
          gsap.set(navButtons, { clearProps: "transform" });
          for (const button of navButtons) button.removeAttribute("data-entering");
        },
      },
      0.24,
    );

    // --- hero ---------------------------------------------------------------
    const hero = gsap.timeline();

    from(hero, hook("hero-badge"), { opacity: 0, y: 24, duration: 0.7, ease: RISE }, 0.1);

    // Words rise out of their own line box; the mask around each one turns the offset into a
    // reveal instead of a slide over the line above.
    from(hero, partsOf(hook("heading-one")), { yPercent: 125, opacity: 0, duration: 0.9, ease: UNVEIL, stagger: 0.055 }, 0.18);

    from(hero, partsOf(hook("description")), { yPercent: 120, opacity: 0, duration: 0.8, ease: UNVEIL, stagger: 0.08 }, 0.5);

    from(hero, hook("custom-button"), { opacity: 0, y: 20, duration: 0.7, ease: RISE }, 0.66);

    from(hero, hook("hero-feature"), { opacity: 0, y: 20, duration: 0.7, ease: RISE, stagger: 0.09 }, 0.76);

    // The artwork unveils upward from its lower-left corner and settles out of a slight
    // over-scale, so it reads as being revealed rather than fading in.
    fromTo(
      hero,
      hook("hero-main-img"),
      { clipPath: "inset(100% 0% 0% 0% round 2.5rem)", scale: 1.08, opacity: 0 },
      {
        clipPath: "inset(0% 0% 0% 0% round 2.5rem)",
        scale: 1,
        opacity: 1,
        transformOrigin: "0% 100%",
        duration: 1.2,
        ease: UNVEIL,
      },
      0.28,
    );

    from(hero, heroImages, { scale: 0, opacity: 0, transformOrigin: "0% 100%", duration: 0.8, ease: POP, stagger: 0.11 }, 0.4);

    // Floating figures pop in over the artwork once it is mostly revealed.
    from(hero, [...hook("hero-card"), ...hook("hero-stats")], { scale: 0.4, opacity: 0, duration: 0.9, ease: POP, stagger: 0.12 }, 0.72);

    from(hero, hook("hero-chip"), { scale: 0.4, opacity: 0, duration: 0.9, ease: POP, stagger: 0.12 }, 0.86);

    // Once the entrance has landed the figures drift for good, in opposite directions.
    to(hero, [...hook("hero-card"), ...hook("hero-stats")], { yPercent: 10, duration: 2, repeat: -1, yoyo: true, ease: "sine.inOut" }, 1.9);
    to(hero, hook("hero-chip"), { yPercent: -10, duration: 2, repeat: -1, yoyo: true, ease: "sine.inOut" }, 1.98);

    // --- stats bar ----------------------------------------------------------
    const stats = gsap.timeline();
    fromTo(
      stats,
      hook("hero-stats-wrap"),
      { opacity: 0, scaleY: 0 },
      { opacity: 1, scaleY: 1, transformOrigin: "50% 0%", duration: 0.8, ease: UNVEIL, stagger: 0.12 },
      0.2,
    );
    from(stats, statsWrapChildren, { opacity: 0, y: 14, duration: 0.6, ease: RISE, stagger: 0.05 }, 0.45);

    // --- decorative vector --------------------------------------------------
    const vector = gsap.timeline();
    from(vector, hook("vector"), { scale: 0, duration: 0.9, ease: POP }, 0.3);

    // --- article header -----------------------------------------------------
    const article = gsap.timeline();
    from(article, partsOf(hook("blog-heading")), { yPercent: 125, opacity: 0, duration: 0.9, ease: UNVEIL, stagger: 0.05 }, 0.1);
    from(article, partsOf(hook("blog-description")), { yPercent: 120, opacity: 0, duration: 0.8, ease: UNVEIL, stagger: 0.04 }, 0.34);
    from(article, articleHeaderChildren, { opacity: 0, y: 20, duration: 0.7, ease: RISE, stagger: 0.08 }, 0.5);
    from(article, articleBlocks, { opacity: 0, y: 24, duration: 0.7, ease: RISE, stagger: { amount: 0.6 } }, 0.7);

    // Every starting value is now in place, so the elements can be shown.
    release();

    // Line breaks move with the viewport, so line-split elements are rebuilt on resize and left
    // in their final state (the entrance has already played).
    watchLineResplit(lineTargets, (_el, parts) => {
      if (parts.length) gsap.set(parts, { clearProps: "all" });
    });
  }

  /* ── scroll-reveal.ts ───────────────────────────────────────────────────────────── */

  const RECIPES = {
    default: {
      from: { opacity: 0, yPercent: 15 },
      to: { opacity: 1, yPercent: 0, duration: 0.7, ease: "power3.out" },
    },
    card: {
      from: { opacity: 0, yPercent: 15, scale: 0.96 },
      to: { opacity: 1, yPercent: 0, scale: 1, duration: 1.2, ease: "power3.out" },
    },
    large: {
      from: { opacity: 0, yPercent: 100 },
      to: { opacity: 1, yPercent: 0, duration: 1, ease: "expo.out" },
    },
  };

  /**
   * Elements are visible by default in CSS and only hidden here, once this file has confirmed it
   * can animate them. If it never runs, the section still reads — it just does not move.
   */
  function initScrollReveal(gsap, ScrollTrigger) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    for (const el of $("[data-reveal]")) {
      const recipe = RECIPES[el.dataset.reveal || "default"] || RECIPES.default;
      const delay = Number(el.dataset.revealDelay != null ? el.dataset.revealDelay : 100) / 1000;

      gsap.set(el, recipe.from);

      ScrollTrigger.create({
        trigger: el,
        start: "top 90%",
        once: true,
        onEnter: () => gsap.to(el, Object.assign({}, recipe.to, { delay: delay })),
      });
    }
  }

  /* ── init ───────────────────────────────────────────────────────────────────────── */

  function init() {
    const gsap = window.gsap;
    // No GSAP: nothing is hidden by this file, and the <head> timer lifts `anim-pending`.
    if (!gsap) return;

    const ScrollTrigger = window.ScrollTrigger || null;
    if (ScrollTrigger) {
      try {
        gsap.registerPlugin(ScrollTrigger);
      } catch (e) {}
    }

    // Added by the port: the line split measures where each line breaks, so it has to run on the
    // real face. The template preloads its two above-the-fold faces in the <head>; a standalone
    // piece does not, and the split measured the fallback face — the hero description came out
    // in five ragged lines instead of three. Wait for the faces the split targets use, capped
    // below the <head> timer (1.5 s) so the entrance never runs after the content is released.
    fontsFor([...hook("heading-one"), ...hook("description")]).then(() => initLoadAnimations(gsap));
    if (ScrollTrigger) initScrollReveal(gsap, ScrollTrigger);
  }

  function fontsFor(els) {
    if (!els.length || !document.fonts || !document.fonts.load) return Promise.resolve();
    const loads = els.map((el) => {
      const cs = getComputedStyle(resolveTarget(el));
      return document.fonts.load(`${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`).catch(() => {});
    });
    return Promise.race([Promise.all(loads), new Promise((r) => setTimeout(r, 1000))]);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();

}).call(this, window.temlisScope ? window.temlisScope("lumoras-699") : document);
