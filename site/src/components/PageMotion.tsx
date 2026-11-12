"use client";

import { useEffect } from "react";
import { startFillButtons } from "@/lib/motion/fill-buttons";
import { registerRevealEase, startReveals } from "@/lib/motion/reveal";
import { startSmoothScroll } from "@/lib/motion/smooth-scroll";

// The home's shared entrance and buttons, for a page without its hero.
let started = false;

export function PageMotion() {
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
  }, []);
  return null;
}
