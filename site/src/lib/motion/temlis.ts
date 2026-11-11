import { gsap } from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

function load(src: string) {
  return new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Couldn't load ${src}`));
    document.body.append(script);
  });
}

// temlis-scope.js first, then each section's scripts, in order: a section's
// script expects the scope helper to be there when it runs.
export async function startTemlisSections(scripts: string[]) {
  // Temlis sections are classic scripts that read GSAP from window (ADR 0133).
  // They get the same instance as the rest of the page, so their
  // ScrollTriggers follow Lenis like the hero's.
  Object.assign(window, { gsap, ScrollTrigger, SplitText, CustomEase, DrawSVGPlugin });
  // Wilun's and Atniily's scripts play their entrances only when <html>
  // carries data-motion or .motion, which their templates set from an inline
  // head script.
  if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.documentElement.setAttribute("data-motion", "");
    document.documentElement.classList.add("motion");
  }
  for (const src of ["/temlis/temlis-scope.js", ...scripts]) await load(src);
}
