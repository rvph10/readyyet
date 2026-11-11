import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// The trades section holds still while the page's scroll runs its cards from
// the first to the last, which ends on the content's right edge, then the
// page carries on (ADR 0134).
export function startTradesScroll() {
  const mm = gsap.matchMedia();
  mm.add("(prefers-reduced-motion: no-preference)", () => {
    const row = document.querySelector<HTMLElement>("[data-trades]")!;
    const section = row.closest<HTMLElement>(".section_solutions")!;
    const container = row.closest<HTMLElement>(".container-large")!;
    const track = row.querySelector<HTMLElement>(".swiper-wrapper")!;
    const last = track.lastElementChild!;

    section.setAttribute("data-pinned", "");
    const distance = () => {
      const x = Number(gsap.getProperty(track, "x"));
      return Math.max(0, last.getBoundingClientRect().right - x - container.getBoundingClientRect().right);
    };

    gsap.to(track, {
      x: () => -distance(),
      ease: "none",
      scrollTrigger: {
        trigger: section,
        start: "top top",
        end: () => `+=${distance()}`,
        pin: true,
        scrub: true,
        invalidateOnRefresh: true,
      },
    });

    return () => section.removeAttribute("data-pinned");
  });
  return () => mm.revert();
}
