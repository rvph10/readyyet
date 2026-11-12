import type Swiper from "swiper";

const DELAY = 3000;

// Moves the trades slider on like a click on its next arrow every few
// seconds, only while it is on screen, and holds it while the pointer or the
// keyboard focus is on it. Touching it stops it for good, so a visitor reading
// a card keeps it (WCAG 2.2.2).
// Lumoras' slider.js builds the Swiper with autoplay off, so the timer lives
// here rather than in its options; the Swiper only exists once that script
// has run.
export function startTradesAutoplay() {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return () => {};
  const root = document.querySelector<HTMLElement>("[data-temlis='lumoras-699'] [data-slider]")!;
  const container = root.querySelector<HTMLElement & { swiper?: Swiper }>(".swiper")!;
  let timer = 0;
  let held = false;
  let seen = false;
  let stopped = false;

  const schedule = () => {
    clearTimeout(timer);
    if (!held && seen && !stopped) timer = window.setTimeout(next, DELAY);
  };
  const next = () => {
    container.swiper?.slideNext();
    schedule();
  };
  const hold = () => {
    held = true;
    clearTimeout(timer);
  };
  const release = () => {
    held = false;
    schedule();
  };

  root.addEventListener("mouseenter", hold);
  root.addEventListener("mouseleave", release);
  root.addEventListener("focusin", hold);
  root.addEventListener("focusout", release);
  const stop = () => {
    stopped = true;
    clearTimeout(timer);
  };
  root.addEventListener("pointerdown", stop);
  const visible = new IntersectionObserver(([entry]) => {
    seen = entry.isIntersecting;
    schedule();
  });
  visible.observe(root);

  return () => {
    clearTimeout(timer);
    visible.disconnect();
    root.removeEventListener("mouseenter", hold);
    root.removeEventListener("mouseleave", release);
    root.removeEventListener("focusin", hold);
    root.removeEventListener("focusout", release);
    root.removeEventListener("pointerdown", stop);
  };
}
