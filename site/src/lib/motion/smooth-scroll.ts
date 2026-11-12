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

  // Arriving on a section's link (/fr#pricing from a legal page or an email):
  // the page is laid out from the top for the hero, so it goes there once the
  // hero's pin has added its length above every section.
  const target = location.hash.length > 1 ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null;
  if (target) {
    requestAnimationFrame(() => {
      ScrollTrigger.refresh();
      lenis.scrollTo(target, { immediate: true });
    });
  }
}

function linkAnchors(lenis: Lenis) {
  document.addEventListener("click", (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey) return;

    // Section links carry the page's path too, to work from the legal pages.
    const link = (event.target as Element | null)?.closest?.<HTMLAnchorElement>('a[href*="#"]');
    if (!link || link.origin !== location.origin || link.pathname !== location.pathname || link.target === "_blank")
      return;
    if (link.search !== location.search) return;
    const hash = link.hash;
    if (!hash || hash === "#") return;

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
