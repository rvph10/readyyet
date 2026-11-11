import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function startSmoothScroll() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const lenis = new Lenis({
    lerp: 0.15,
    smoothWheel: true,
    syncTouch: true,
    syncTouchLerp: 0.1,
  });

  lenis.on("scroll", () => ScrollTrigger.update());
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  linkAnchors(lenis);
}

function linkAnchors(lenis: Lenis) {
  document.addEventListener("click", (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey) return;

    const link = (event.target as Element | null)?.closest?.<HTMLAnchorElement>('a[href^="#"]');
    const hash = link?.getAttribute("href");
    if (!hash || hash === "#" || link?.target === "_blank") return;

    const target = document.querySelector<HTMLElement>(hash);
    if (!target) return;

    event.preventDefault();
    lenis.scrollTo(target);
    focus(target);

    if (location.hash !== hash) history.pushState(null, "", hash);
  });
}

function focus(target: HTMLElement) {
  const restore = target.getAttribute("tabindex") === null;
  if (restore) target.setAttribute("tabindex", "-1");
  target.focus({ preventScroll: true });
  if (restore) target.addEventListener("blur", () => target.removeAttribute("tabindex"), { once: true });
}
