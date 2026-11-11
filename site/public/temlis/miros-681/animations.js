/*! Temlis · Intro Card With Two Pricing Plans · licensed to tmfp_dyylm7mpjcw7qp4n · temlis.com/license */
// Temlis: this script only sees its own section (see temlis-scope.js).
(function (document) {
/**
 * Miros — shared motion engine.
 *
 * Hand-ported from `src/scripts/reveal.ts` and `src/scripts/motion.ts` of Temlis-Design/Miros.
 * The logic is the template's; what changed is the packaging:
 *
 *   - Classic script, no modules. The catalogue preview inlines the files of a piece and strips
 *     module syntax, so nothing here is exported and the file starts itself on DOM ready.
 *   - It marks `reveal-live` on the <html> as soon as it runs. The inline flag in each piece's
 *     <head> drops `reveal-ready` if that mark never arrives, so a blocked script leaves the
 *     section fully visible instead of stuck at opacity 0.
 *
 * Miros uses no animation library: the entrances are CSS transitions that this file only
 * triggers by adding classes, and the scroll-linked motion is a single rAF loop.
 *
 * Every section carries this file; each init returns early when its own markup is absent,
 * exactly as the template's layout runs all of them on every page.
 */
(function () {
  "use strict";

  const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ── reveal.ts ──────────────────────────────────────────────────────────────────── */

  const SELECTOR = "[data-reveal]";
  const DRAW_SELECTOR = "[data-draw]";

  function revealAll() {
    document.querySelectorAll(SELECTOR).forEach((el) => el.classList.add("is-revealed"));
    document.querySelectorAll(DRAW_SELECTOR).forEach((el) => el.classList.add("is-drawn"));
  }

  /** Draws the accent strokes once their section reaches the viewport. */
  function initDrawings() {
    const lines = Array.from(document.querySelectorAll(DRAW_SELECTOR));
    if (!lines.length) return;

    if (reducedMotion() || !("IntersectionObserver" in window)) {
      lines.forEach((line) => line.classList.add("is-drawn"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-drawn");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -20% 0px", threshold: 0.01 }
    );

    lines.forEach((line) => {
      // A line already on screen at load still draws, one frame later so the transition has
      // an undrawn state to start from.
      if (line.getBoundingClientRect().top < window.innerHeight * 0.9) {
        requestAnimationFrame(() => requestAnimationFrame(() => line.classList.add("is-drawn")));
        return;
      }
      observer.observe(line);
    });
  }

  /** Wraps every word of a heading in a clipping span so it can slide up. */
  function splitWords(root) {
    (root || document).querySelectorAll("[data-reveal-words]").forEach((el) => {
      if (el.dataset.split === "done") return;

      const walk = (node) => {
        const children = Array.from(node.childNodes);
        for (const child of children) {
          if (child.nodeType === Node.TEXT_NODE) {
            const text = child.textContent || "";
            if (!text.trim()) continue;
            const fragment = document.createDocumentFragment();
            text.split(/(\s+)/).forEach((chunk) => {
              if (!chunk.trim()) {
                fragment.append(chunk);
                return;
              }
              const line = document.createElement("span");
              line.className = "word-line";
              const inner = document.createElement("span");
              inner.textContent = chunk;
              line.append(inner);
              fragment.append(line);
            });
            if (child.parentNode) child.parentNode.replaceChild(fragment, child);
          } else if (child.nodeType === Node.ELEMENT_NODE && !child.classList.contains("word-line")) {
            walk(child);
          }
        }
      };

      walk(el);
      el.querySelectorAll(".word-line > span").forEach((word, i) => {
        word.style.setProperty("--w", String(i));
      });
      el.dataset.split = "done";
    });
  }

  /** Gives each child of a group an increasing delay so items cascade. */
  function staggerGroups(root) {
    (root || document).querySelectorAll("[data-reveal-group]").forEach((group) => {
      const step = Number(group.dataset.revealStep || 90);
      group.querySelectorAll(":scope > [data-reveal]").forEach((item, i) => {
        item.style.setProperty("--reveal-delay", `${100 + i * step}ms`);
      });
    });
  }

  function initReveals() {
    if (reducedMotion() || !("IntersectionObserver" in window)) {
      revealAll();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-revealed");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.1 }
    );

    document.querySelectorAll(SELECTOR).forEach((el) => {
      // Anything already in view when the page loads reveals immediately rather than waiting
      // for a scroll that may never happen.
      if (el.getBoundingClientRect().top < window.innerHeight * 0.92) {
        el.classList.add("is-revealed");
        return;
      }
      observer.observe(el);
    });
  }

  /* ── motion.ts ──────────────────────────────────────────────────────────────────── */

  function pair(value) {
    if (!value) return null;
    const [from, to] = value.split(",").map((n) => Number(n.trim()));
    if (!Number.isFinite(from) || !Number.isFinite(to)) return null;
    return [from, to];
  }

  /** 0 as the trigger enters from the bottom, 1 as it leaves past the top. */
  function progressOf(trigger) {
    const rect = trigger.getBoundingClientRect();
    const viewport = window.innerHeight;
    return Math.min(Math.max((viewport - rect.top) / (viewport + rect.height), 0), 1);
  }

  const lerp = (from, to, t) => from + (to - from) * t;
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);

  /** Rescales raw travel onto the item's window, so it can finish early. */
  function windowed(progress, range) {
    const [start, end] = range;
    if (end <= start) return progress;
    return Math.min(Math.max((progress - start) / (end - start), 0), 1);
  }

  /**
   * Drives every `[data-scrub-*]` and `[data-float]` element from a single loop so the two
   * effects can share one transform without fighting each other.
   */
  function initMotion() {
    const nodes = Array.from(
      document.querySelectorAll("[data-scrub-x], [data-scrub-y], [data-scrub-rotate], [data-scrub-scale], [data-float]")
    );
    if (!nodes.length) return;

    const items = nodes.map((el) => {
      const trigger = el.closest("[data-scrub]") || el;
      const rangeSource = el.dataset.scrubRange || trigger.dataset.scrubRange;
      const easeSource = el.dataset.scrubEase || trigger.dataset.scrubEase;
      return {
        el,
        trigger,
        x: pair(el.dataset.scrubX),
        y: pair(el.dataset.scrubY),
        rotate: pair(el.dataset.scrubRotate),
        scale: pair(el.dataset.scrubScale),
        opacity: pair(el.dataset.scrubOpacity),
        fadeSpan: Math.min(Math.max(Number(el.dataset.scrubFade || 0.1), 0.01), 1),
        range: pair(rangeSource) || [0, 1],
        eased: easeSource === "out",
        floatAmount: Number(el.dataset.float || 0),
        floatDuration: Number(el.dataset.floatDuration || 3400),
        scrubX: 0,
        scrubY: 0,
        scrubR: 0,
        scrubS: 1,
        scrubO: null,
        xFactor: 1,
      };
    });

    const measure = () => {
      for (const item of items) {
        const value = Number(getComputedStyle(item.el).getPropertyValue("--scrub-x-factor"));
        item.xFactor = Number.isFinite(value) && value > 0 ? value : 1;
      }
    };

    if (reducedMotion()) {
      // Hold the resting pose so the composition still reads as designed.
      for (const item of items) {
        if (!(item.x || item.y || item.rotate || item.scale || item.opacity)) continue;
        const x = item.x ? item.x[1] : 0;
        const y = item.y ? item.y[1] : 0;
        const r = item.rotate ? item.rotate[1] : 0;
        const sc = item.scale ? item.scale[1] : 1;
        item.el.style.transform = `translate(${x}%, ${y}%) rotate(${r}deg) scale(${sc})`;
        if (item.opacity) item.el.style.opacity = String(item.opacity[1]);
      }
      return;
    }

    const floats = items.filter((item) => item.floatAmount !== 0);
    const scrubs = items.filter((item) => item.x || item.y || item.rotate || item.scale);

    let visible = true;
    let frame = 0;

    const write = (item, floatY) => {
      const x = item.scrubX;
      const y = item.scrubY + floatY;
      const r = item.scrubR;
      const sc = item.scrubS;
      item.el.style.transform =
        `translate(${x.toFixed(3)}%, ${y.toFixed(3)}%) rotate(${r.toFixed(3)}deg) scale(${sc.toFixed(4)})`;
      if (item.scrubO !== null) item.el.style.opacity = item.scrubO.toFixed(3);
    };

    const readScroll = () => {
      for (const item of scrubs) {
        const raw = windowed(progressOf(item.trigger), item.range);
        const t = item.eased ? easeOut(raw) : raw;
        item.scrubX = item.x ? lerp(item.x[0], item.x[1], t) * item.xFactor : 0;
        item.scrubY = item.y ? lerp(item.y[0], item.y[1], t) : 0;
        item.scrubR = item.rotate ? lerp(item.rotate[0], item.rotate[1], t) : 0;
        item.scrubS = item.scale ? lerp(item.scale[0], item.scale[1], t) : 1;
        // The fade is over early so the travel itself is what you watch.
        item.scrubO = item.opacity ? lerp(item.opacity[0], item.opacity[1], Math.min(raw / item.fadeSpan, 1)) : null;
      }
    };

    const tick = (now) => {
      for (const item of floats) {
        write(item, (item.floatAmount * (1 - Math.cos((now / item.floatDuration) * Math.PI * 2))) / 2);
      }
      if (visible) frame = requestAnimationFrame(tick);
    };

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        readScroll();
        // Items without an idle float are written here rather than in the loop, so they keep
        // updating even while the loop is parked.
        for (const item of items) if (!item.floatAmount) write(item, 0);
        ticking = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener(
      "resize",
      () => {
        measure();
        onScroll();
      },
      { passive: true }
    );

    measure();
    readScroll();

    if (floats.length) {
      // Park the loop while every animated block is off screen. Visibility is tracked per
      // root: an entry only reports the block that just changed, so reading the batch alone
      // would stop the loop with others still on screen.
      const roots = new Set(floats.map((item) => item.trigger));
      const onScreen = new Set();

      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) onScreen.add(entry.target);
            else onScreen.delete(entry.target);
          }
          const anyVisible = onScreen.size > 0;
          if (anyVisible && !visible) {
            visible = true;
            frame = requestAnimationFrame(tick);
          } else if (!anyVisible && visible) {
            visible = false;
            cancelAnimationFrame(frame);
          }
        },
        { rootMargin: "20% 0px" }
      );
      roots.forEach((root) => observer.observe(root));
      frame = requestAnimationFrame(tick);
    } else {
      items.forEach((item) => write(item, 0));
    }
  }

  /**
   * Counts `[data-count]` values up the first time they scroll into view. The markup already
   * holds the final value, so nothing is lost without JS.
   */
  function initCounters() {
    const items = Array.from(document.querySelectorAll("[data-count]"));
    if (!items.length || reducedMotion() || !("IntersectionObserver" in window)) return;

    const run = (el) => {
      const final = el.textContent || "";
      const match = final.match(/^([^\d]*)([\d.,]+)(.*)$/s);
      if (!match) return;

      const [, prefix, rawNumber, suffix] = match;
      const decimals = (rawNumber.split(".")[1] || "").length;
      const target = Number(rawNumber.replace(/,/g, ""));
      if (!Number.isFinite(target)) return;

      const duration = 1400;
      const start = performance.now();

      const frame = (now) => {
        const t = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - t, 4);
        el.textContent = `${prefix}${(target * eased).toFixed(decimals)}${suffix}`;
        if (t < 1) requestAnimationFrame(frame);
      };

      requestAnimationFrame(frame);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          run(entry.target);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.6 }
    );

    items.forEach((el) => observer.observe(el));
  }

  /** Pulls a button slightly toward the pointer while it hovers. */
  function initMagnetic() {
    if (reducedMotion() || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    document.querySelectorAll("[data-magnetic]").forEach((el) => {
      const strength = Number(el.dataset.magneticStrength || 0.2);

      el.addEventListener("pointerenter", () => {
        el.style.transition = "transform 0.15s ease-out";
      });

      el.addEventListener("pointermove", (event) => {
        const rect = el.getBoundingClientRect();
        const x = (event.clientX - (rect.left + rect.width / 2)) * strength;
        const y = (event.clientY - (rect.top + rect.height / 2)) * strength;
        el.style.transform = `translate(${x}px, ${y}px)`;
      });

      el.addEventListener("pointerleave", () => {
        el.style.transition = "transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)";
        el.style.transform = "";
      });
    });
  }

  /* ── start (BaseLayout.astro) ───────────────────────────────────────────────────── */

  function start() {
    document.documentElement.classList.add("reveal-live");
    splitWords();
    staggerGroups();
    initReveals();
    initDrawings();
    initMotion();
    initCounters();
    initMagnetic();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();

}).call(this, window.temlisScope ? window.temlisScope("miros-681") : document);
