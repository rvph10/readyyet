/*! Temlis · Three Plan Feature Comparison Table · licensed to tmfp_n73trk3tkq66jvtu · temlis.com/license */
// Temlis: this script only sees its own section (see temlis-scope.js).
(function (document) {
/* Corevia — shared motion. Ported by hand from the landing's src/scripts/reveal.ts, the one module
   BaseLayout loads on every page. Same logic, no TypeScript and no module syntax: the catalog
   preview inlines the scripts of the package and strips module syntax, so everything has to exist
   as a global. Corevia uses no GSAP — every entrance is a CSS transition keyed to `is-revealed`,
   and the hidden starting state lives behind the `anim-ready` class the <head> script adds, so if
   this file never runs the backstop timer drops that class and everything is simply visible. */
(function () {
  "use strict";

  const ROOT_MARGIN = "0px 0px -10% 0px";

  /* Pixels per second the testimonial wall drifts, taken from the design. */
  const WALL_SPEED = 19.2;

  function reveal(el) {
    el.classList.add("is-revealed");
  }

  /* A looping strip has to travel exactly one copy of its content, so the seam lands where the run
     started. Both the distance and the time it takes are measured rather than assumed, which keeps
     the speed steady at any width. */
  function sizeWall() {
    document.querySelectorAll("[data-wall-column]").forEach((column) => {
      const set = column.querySelector(".testimonials-two_set");
      if (!set) return;
      const gap = parseFloat(getComputedStyle(column).rowGap) || 0;
      const distance = set.getBoundingClientRect().height + gap;
      if (distance <= 0) return;
      column.style.setProperty("--wall-distance", `${distance}px`);
      column.style.setProperty("--wall-duration", `${distance / WALL_SPEED}s`);
    });
  }

  function init() {
    // This script is here, so the backstop that would strip the hidden state is no longer needed.
    if (window.__revealBackstop) clearTimeout(window.__revealBackstop);

    const targets = document.querySelectorAll("[data-reveal], [data-recipe]");

    if (!("IntersectionObserver" in window)) {
      targets.forEach(reveal);
    } else if (targets.length) {
      const io = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            // Anything already scrolled past — someone arriving on an anchor, or a browser
            // restoring the previous scroll position — is shown at once rather than left waiting
            // for an entrance it already missed.
            const passed = entry.boundingClientRect.bottom < 0;
            if (!entry.isIntersecting && !passed) continue;
            if (passed) entry.target.classList.add("is-instant");
            reveal(entry.target);
            io.unobserve(entry.target);
          }
        },
        { rootMargin: ROOT_MARGIN, threshold: 0 },
      );

      targets.forEach((el) => io.observe(el));
    }

    // Set the marquee speed from the value the section carries.
    document.querySelectorAll("[data-marquee]").forEach((el) => {
      const seconds = Number(el.dataset.marquee);
      if (Number.isFinite(seconds) && seconds > 0) {
        el.style.setProperty("--marquee-duration", `${seconds}s`);
      }
    });

    sizeWall();
    // Card heights change with the column width, so the cycle is re-measured.
    let resizeTimer;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(sizeWall, 200);
    });
    // Web fonts land after first paint and change how tall the quotes are.
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(sizeWall);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

}).call(this, window.temlisScope ? window.temlisScope("corevia-762") : document);
