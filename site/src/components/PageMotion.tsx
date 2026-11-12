"use client";

import { useEffect } from "react";
import { startFillButtons } from "@/lib/motion/fill-buttons";
import { registerRevealEase, startReveals } from "@/lib/motion/reveal";
import { startSmoothScroll } from "@/lib/motion/smooth-scroll";
import { startTemlisSections } from "@/lib/motion/temlis";

// The home's shared entrance and buttons, for a page without its hero, with
// the scripts of the Temlis sections the page has.
let started = false;

export function PageMotion({ temlis = [] }: { temlis?: string[] }) {
  useEffect(() => {
    if (started) return;
    started = true;
    registerRevealEase();
    startSmoothScroll();
    startFillButtons();
    void startReveals();
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      document.documentElement.removeAttribute("data-enter");
    }
    if (temlis.length > 0) void startTemlisSections(temlis);
  }, [temlis]);
  return null;
}
