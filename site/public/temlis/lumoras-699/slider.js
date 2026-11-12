/*! Temlis · Use Case Card Slider · licensed to tmfp_ngj73s52iqhloxrc · temlis.com/license */
// Temlis: this script only sees its own section (see temlis-scope.js).
(function (document) {
/**
 * Lumora — card slider, replacing Webflow's `w-slider` runtime.
 *
 * Hand-ported from `src/scripts/slider.ts` of Temlis-Design/Lumora. Two packaging changes, both
 * forced by the preview and neither of them behavioural:
 *
 *   - `modules: [Navigation, A11y]` is gone. The template imported those from `swiper/modules`;
 *     the window serves `swiper-bundle.min.js`, which has every module registered already. The
 *     options below (`navigation`, `a11y`) are what actually turn them on, and they are untouched.
 *   - There is no Swiper stylesheet to import: the template borrows only the handful of layout
 *     rules it needs (`.swiper-wrapper`, `.swiper-slide`) into its own components.css, which
 *     travels inside `/lumora/styles.css`.
 *
 * Every configuration value is read from the source markup rather than chosen — no autoplay,
 * loop, 500 ms per transition, no pagination dots. `slidesPerView: 'auto'` falls out of the CSS:
 * the mask has a fixed width per variant and each slide is 100% of it. `spaceBetween` stays at 0
 * on purpose: the gap is `.slide-item`'s margin-right in the stylesheet, which Swiper already
 * folds into each slide's measured size.
 *
 * The mask is narrower than the section and does not clip, so several cards show while the
 * slider believes only one is. The set is repeated until it outruns the widest viewport, and
 * Swiper starts recycling a full screen early, so the right-hand side never empties out.
 */
(function () {
  "use strict";

  /** How many cards fit across the widest the window can plausibly become. */
  function visibleSlides(step) {
    const widest = Math.max(window.innerWidth, (window.screen && window.screen.width) || 0);
    return Math.max(1, Math.ceil(widest / step));
  }

  /**
   * Repeats the slides until there are enough for the loop to always have a full screen in hand
   * on either side. Clones stay interactive and stay in the accessibility tree: Swiper reorders
   * slides as the loop advances, so any of them can end up being the one on screen.
   */
  function padForLoop(wrapper, needed) {
    const originals = Array.from(wrapper.children);
    let count = originals.length;

    while (count < needed) {
      for (const el of originals) {
        const clone = el.cloneNode(true);
        clone.setAttribute("data-slider-clone", "");
        wrapper.append(clone);
      }
      count += originals.length;
    }
  }

  function initSliders() {
    const Swiper = window.Swiper;
    if (typeof Swiper === "undefined") return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const roots = document.querySelectorAll("[data-slider]:not([data-slider-ready])");

    for (const root of roots) {
      const container = root.querySelector(".swiper");
      const wrapper = root.querySelector(".swiper-wrapper");
      if (!container || !wrapper || wrapper.children.length === 0) continue;

      root.setAttribute("data-slider-ready", "");

      const first = wrapper.firstElementChild;
      const style = getComputedStyle(first);
      const step = first.getBoundingClientRect().width + parseFloat(style.marginRight || "0");

      const visible = visibleSlides(step);
      // Swiper adds `slidesPerGroup` (1) of its own, so this is one less than the number of
      // slides it should keep queued up on each side.
      const extra = visible;
      padForLoop(wrapper, visible + extra + 3);

      new Swiper(container, {
        slidesPerView: "auto",
        spaceBetween: 0,
        loop: true,
        loopAdditionalSlides: extra,
        speed: reduced ? 0 : 500,
        autoplay: false,
        watchOverflow: true,
        navigation: {
          prevEl: root.querySelector("[data-slider-prev]"),
          nextEl: root.querySelector("[data-slider-next]"),
        },
        a11y: {
          prevSlideMessage: "Previous slide",
          nextSlideMessage: "Next slide",
          firstSlideMessage: "This is the first slide",
          lastSlideMessage: "This is the last slide",
        },
      });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initSliders);
  else initSliders();
})();

}).call(this, window.temlisScope ? window.temlisScope("lumoras-699") : document);
