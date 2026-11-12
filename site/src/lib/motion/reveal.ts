import { CustomEase } from "gsap/CustomEase";

// The entrance every home section shares, whatever template it comes from,
// mirrored as --reveal-* in globals.css. The section scripts in public/temlis
// are classic scripts and can't import this, they name the "reveal" ease and
// repeat these numbers.
export const REVEAL = {
  ease: "reveal",
  start: "top 85%",
  duration: 0.9,
  small: 0.6,
  rise: 24,
  stagger: 0.08,
};

// Ledger's own curve, the one its hero phone settles on: fast, no overshoot.
export function registerRevealEase() {
  CustomEase.create(REVEAL.ease, "M0,0 C0.16,1 0.3,1 1,1");
}
