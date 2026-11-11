import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// The trades slide sideways while their section crosses the window, so a
// visitor sees more than the first four without a click. It moves Swiper's
// container, not its wrapper, which Swiper owns, so the arrows and dragging
// still work on top.
export function startTradesScroll() {
  const mm = gsap.matchMedia();
  mm.add("(prefers-reduced-motion: no-preference)", () => {
    const slider = document.querySelector<HTMLElement>("[data-temlis='lumoras-699'] [data-slider]")!;
    gsap.fromTo(
      slider.querySelector(".swiper"),
      { x: () => window.innerWidth * 0.3 },
      {
        x: () => window.innerWidth * -0.5,
        ease: "none",
        scrollTrigger: {
          trigger: slider,
          start: "top bottom",
          end: "bottom top",
          scrub: 0.6,
          invalidateOnRefresh: true,
        },
      },
    );
  });
  return () => mm.revert();
}
