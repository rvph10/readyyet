"use client";

import { useEffect } from "react";
import { startEntrances } from "@/lib/motion/entrances";
import { startFillButtons } from "@/lib/motion/fill-buttons";
import { startHeroScroll } from "@/lib/motion/hero-scroll";
import { startSmoothScroll } from "@/lib/motion/smooth-scroll";
import { startTemlisSections } from "@/lib/motion/temlis";

// The entrances split and hide elements as they run, so they must only ever
// start once per page, even when React mounts this twice in development.
let started = false;

export function HomeMotion() {
  useEffect(() => {
    const hero = document.querySelector<HTMLElement>(".hero")!;
    const intro = hero.querySelector<HTMLElement>(".hero__intro")!;
    // On phones the artwork fills what's left of the screen below the intro.
    const measure = () =>
      hero.style.setProperty(
        "--intro-end",
        `${intro.getBoundingClientRect().bottom - hero.getBoundingClientRect().top}px`,
      );
    measure();
    const resize = new ResizeObserver(measure);
    resize.observe(intro);

    const stopHero = startHeroScroll(hero);

    if (!started) {
      started = true;
      // The scroll-driven hero is laid out for the top of the page.
      history.scrollRestoration = "manual";
      startSmoothScroll();
      startFillButtons();
      void startEntrances();
      // Ledger's scripts play their entrances whenever data-enter is set,
      // the page serves it to everyone.
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
        document.documentElement.removeAttribute("data-enter");
      }
      void startTemlisSections([
        "/temlis/payable-626/animations.js",
        "/temlis/ledger-782/animations.js",
        "/temlis/ledger-782/script.js",
        "/temlis/lumoras-699/animations.js",
        "/temlis/lumoras-699/slider.js",
        "/temlis/ledger-781/animations.js",
        "/temlis/miros-681/animations.js",
      ]);
    }

    return () => {
      resize.disconnect();
      stopHero();
    };
  }, []);

  return null;
}
