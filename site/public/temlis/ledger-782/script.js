/*! Temlis · Scroll Stacked Feature Cards · licensed to tmfp_kefyc3jobn5hr42g · temlis.com/license */
// Temlis: this script only sees its own section (see temlis-scope.js).
(function (document) {
/* Ledger — Features. The <script> of Features.astro, ported by hand: above 991px the section
   grows a scroll track and the three cards deal onto a stack as the page scrolls, each turning
   from flat to its own tilt as it lands. Same logic, no TypeScript and no module syntax; GSAP and
   ScrollTrigger come from the window. The heading's entrance lives in
   /ledger/scripts/animations.js. */
(function () {
  "use strict";

  function init() {
    const gsap = window.gsap;
    const ScrollTrigger = window.ScrollTrigger;
    if (!gsap || !ScrollTrigger) return;

    gsap.registerPlugin(ScrollTrigger);

    const section = document.querySelector(".features");
    if (!section) return;

    const inner = section.querySelector(".features__inner");
    const slots = gsap.utils.toArray(document.querySelectorAll(".features__slot"), section);
    const cards = slots.map((slot) => slot.querySelector(".fcard"));

    const ENTER = 0.18;
    const CONTACT = 0;

    gsap.matchMedia().add("(min-width: 992px) and (prefers-reduced-motion: no-preference)", () => {
      section.classList.add("is-scrub");

      const boxes = [...inner.children].map((child) => child.getBoundingClientRect());
      const content = Math.max(...boxes.map((box) => box.bottom)) - Math.min(...boxes.map((box) => box.top));

      if (content > inner.clientHeight) {
        section.classList.remove("is-scrub");
        return;
      }

      const centres = slots.map((slot) => slot.offsetTop + slot.offsetHeight / 2);
      const last = centres[centres.length - 1];
      const rest = (count) => last - centres[count];
      const at = (index) => 0.04 + (index - 1) * ENTER;
      const end = at(slots.length);

      section.style.height = `calc(100svh + ${(end / 1.2) * 320}vh)`;

      slots.forEach((slot, index) => {
        gsap.set(slot, { y: rest(index) + 520 + (index + 1) * 50 });
        gsap.set(cards[index], { "--spin": 0 });
      });

      gsap
        .timeline({ scrollTrigger: { trigger: section, start: "top 75%", end: "top top", scrub: 0.3 } })
        .to(slots[0], { y: rest(0), ease: "none" }, 0)
        .to(cards[0], { "--spin": 1, ease: "none" }, 0);

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.3,
        },
      });

      slots.slice(1).forEach((slot, i) => {
        const index = i + 1;
        tl.to(slot, { y: rest(index), duration: ENTER, ease: "none" }, at(index));
        tl.to(cards[index], { "--spin": 1, duration: ENTER, ease: "none" }, at(index));
        tl.fromTo(
          slots.slice(0, index),
          { y: rest(index - 1) },
          { y: rest(index), duration: ENTER * (1 - CONTACT), ease: "none", immediateRender: false },
          at(index) + ENTER * CONTACT,
        );
      });

      return () => {
        section.classList.remove("is-scrub");
        section.style.removeProperty("height");
      };
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();

}).call(this, window.temlisScope ? window.temlisScope("ledger-782") : document);
