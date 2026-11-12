/*! Temlis · Three Steps With Layered Art · licensed to tmfp_4lwqw7vuod4ix5k5 · temlis.com/license */
// Temlis: this script only sees its own section (see temlis-scope.js).
(function (document) {
/**
 * Payable — shared motion engine.
 *
 * Hand-ported from `src/scripts/{motion,reveal,sections,accordion,form}.ts` of
 * Temlis-Design/Payable. The logic is the template's; what changed is the packaging:
 *
 *   - Classic script, no modules. The catalogue preview inlines the files of a piece and
 *     strips module syntax, so everything an inlined file needs has to be a global. The
 *     shared helpers travel on `window.__payable` instead of being imported.
 *   - `window.gsap` is resolved INSIDE init, never at parse time: inline cannot defer, so a
 *     top-level read runs before the library has landed.
 *   - The plugins are registered defensively. The preview window serves ScrollTrigger,
 *     SplitText and CustomEase because this file names them, but a piece opened outside it
 *     must degrade rather than throw.
 *
 * Every section carries this file; each init returns early when its own markup is absent,
 * exactly as the template's layout gates its dynamic imports.
 */
(function () {
  "use strict";

  /* ── constants (motion.ts) ──────────────────────────────────────────────────────── */

  var EASE = {
    /** Entrances. Overshoots slightly and comes to rest. Falls back if CustomEase is absent. */
    settle: "settle",
    /** Long, decelerating travel — hero shell, big panels. */
    out: "power4.out",
    /** Two-way state changes: accordion, nav, toggles. */
    inOut: "power2.inOut",
    /** Hovers and other short reactions. */
    quick: "power2.out",
    /** Scrubbed to scroll — the scroll position is the easing. */
    none: "none",
  };

  var DUR = { xs: 0.2, sm: 0.35, md: 0.6, lg: 0.9, xl: 1.2 };
  var STAGGER = { tight: 0.05, base: 0.08, loose: 0.14 };

  /** Where an element is on screen when its entrance fires. */
  var START = "top 85%";

  var BP = {
    desktop: "(min-width: 992px)",
    belowDesktop: "(max-width: 991px)",
    tablet: "(min-width: 768px) and (max-width: 991px)",
    mobile: "(max-width: 767px)",
  };

  var gsap = null;
  var ScrollTrigger = null;
  var SplitText = null;
  var mm = null;

  /**
   * Resolve the libraries once, here rather than at parse time, and register whatever the
   * host page provides. Returns false when GSAP never arrived, which every caller treats as
   * "leave the page alone".
   */
  function libs() {
    if (gsap) return true;
    if (!window.gsap) return false;

    gsap = window.gsap;
    ScrollTrigger = window.ScrollTrigger || null;
    SplitText = window.SplitText || null;

    var plugins = [ScrollTrigger, window.CustomEase, SplitText].filter(Boolean);
    if (plugins.length) {
      try {
        gsap.registerPlugin.apply(gsap, plugins);
      } catch (e) {}
    }

    // The signature curve. Rises fast, passes about 1.5% beyond its target around the 40%
    // mark and settles back. Subtle on purpose — this is a finance product, not a toy; the
    // overshoot should register as weight, never as bounce.
    if (window.CustomEase) {
      try {
        window.CustomEase.create("settle", "M0,0 C0.1,0 0.18,1.04 0.42,1.015 0.62,0.998 0.78,1 1,1");
      } catch (e) {}
    } else {
      // No CustomEase: the nearest stock curve, so nothing downstream has to know.
      EASE.settle = "power3.out";
    }

    mm = gsap.matchMedia ? gsap.matchMedia() : null;
    return true;
  }

  /**
   * Spread a set of arrivals across a fixed span rather than a fixed step.
   *
   * A per-element delay reads well for three cards and badly for fifteen: the ladder grows
   * with the count, and the last item on a busy section starts over a second after the first
   * — long enough to look like it is not coming. The span stays put and the rungs close up.
   */
  function spread(index, count, span) {
    if (span === undefined) span = 0.5;
    if (count < 2) return 0;
    return (index / (count - 1)) * Math.min(span, (count - 1) * STAGGER.loose);
  }

  function reduced() {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  /** A real pointer — everything hover- or cursor-driven gates on this. */
  function finePointer() {
    return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  }

  /**
   * Fonts have to be in before any line splitting: SplitText measures where the lines break,
   * and a fallback face breaks them somewhere else. `fonts.status` reports "loaded" too early
   * in WebKit, so the promise is the only reliable signal — behind a timeout, because a font
   * that never arrives must not leave the page hidden.
   */
  function fontsReady(timeout) {
    if (timeout === undefined) timeout = 1500;
    var ready = document.fonts ? document.fonts.ready : Promise.resolve();
    return Promise.race([
      ready.then(function () {
        return undefined;
      }),
      new Promise(function (resolve) {
        window.setTimeout(resolve, timeout);
      }),
    ]);
  }

  /**
   * Open each line's mask to the size of the face inside it.
   *
   * A mask clips at the line box, and the line box is `line-height` tall. A display face set
   * at a tight line height draws outside that box — the tops of the capitals and the tails of
   * the descenders — so the wrapper cuts the letters for the whole length of the entrance.
   *
   * The overflow is not guessed: the browser reports the face's own metrics, and half of what
   * it exceeds the line box by is exactly what spills over each edge. `overflow-clip-margin`
   * then pushes the clip out by that much WITHOUT touching the box model, so the heading keeps
   * the height it had and nothing below it moves. Padding with a compensating negative margin
   * was the obvious way to do this and it is wrong: the margins of adjacent masks collapse
   * into one, so only part of the padding is taken back and the heading grows a pixel per line.
   */
  function fitMasks(lines) {
    var ctx = document.createElement("canvas").getContext("2d");
    if (!ctx) return;

    lines.forEach(function (line) {
      var mask = line.parentElement;
      if (!(mask instanceof HTMLElement)) return;

      var style = getComputedStyle(line);
      var size = parseFloat(style.fontSize);
      // The line box as laid out, not as declared: `line-height: normal` is a keyword, and
      // parsing it gives NaN — which silently skipped every heading that had one.
      var box = line.offsetHeight;
      if (!isFinite(size) || !box) return;

      ctx.font = style.fontStyle + " " + style.fontWeight + " " + size + "px " + style.fontFamily;
      var m = ctx.measureText(line.textContent || "");
      // The declared face and the ink actually drawn — an accent can reach past the first,
      // and the taller of the two is what has to fit.
      var above = Math.max(m.fontBoundingBoxAscent || 0, m.actualBoundingBoxAscent || 0);
      var below = Math.max(m.fontBoundingBoxDescent || 0, m.actualBoundingBoxDescent || 0);
      if (!isFinite(above) || !isFinite(below)) return;

      var spill = Math.ceil((above + below - box) / 2);
      if (spill <= 0) return;

      mask.style.overflowClipMargin = spill + "px";
      mask.dataset.spill = String(spill);
    });
  }

  /**
   * How far a line has to sit below its own mask to be out of sight: the line box plus twice
   * whatever `fitMasks` opened the clip by — once for the room below the box, once for the
   * ascenders that now reach above the line's own top.
   */
  function maskedOffset(line) {
    var mask = line.parentElement;
    if (!(mask instanceof HTMLElement)) return line.offsetHeight * 1.25;
    return mask.clientHeight + 2 * (Number(mask.dataset.spill) || 0);
  }

  /**
   * Split an element into lines, each in its own clipping wrapper, so the line can rise from
   * behind its own baseline. Returns the line elements plus a revert, since a split has to be
   * undone before the element is re-measured.
   *
   * `mask: 'lines'` builds the wrappers; without it the lines slide over their neighbours
   * instead of out from under them, and a line on its way in is readable in the wrong place.
   */
  function splitLines(el) {
    if (!SplitText) return { lines: [], revert: function () {} };

    // Splitting changes what the element asks for. Every line carries `nowrap`, so the
    // element's intrinsic width collapses to its longest line — and where the layout reads
    // that width, the element moves. `offsetWidth`, not the bounding box: a panel mid-scale on
    // its own scrub tween would pin a width 3% short and rewrap the heading.
    var pinned = el.style.width;
    el.style.width = el.offsetWidth + "px";

    var split = new SplitText(el, { type: "lines", mask: "lines", linesClass: "split-line" });
    fitMasks(split.lines);

    return {
      lines: split.lines,
      revert: function () {
        split.revert();
        el.style.width = pinned;
      },
    };
  }

  /** True once the element's top has come up past the entrance line. */
  function isPastEntrance(el) {
    return el.getBoundingClientRect().top < window.innerHeight * 0.88;
  }

  /**
   * Call back while the page finds its feet, and stop once the callback says it is done.
   * Scroll restoration, late images and web fonts all land at times the spec leaves open, so
   * this listens for each of them rather than betting on one.
   */
  function onSettled(check) {
    if (check()) return;

    var timers = [];
    function stop() {
      timers.forEach(window.clearTimeout);
      if (ScrollTrigger) ScrollTrigger.removeEventListener("refresh", tick);
      window.removeEventListener("scroll", tick);
    }
    function tick() {
      if (check()) stop();
    }

    if (ScrollTrigger) ScrollTrigger.addEventListener("refresh", tick);
    window.addEventListener("scroll", tick, { passive: true });
    [250, 700, 1600].forEach(function (delay) {
      timers.push(window.setTimeout(tick, delay));
    });
  }

  /**
   * Run something when its element reaches the entrance line — or straight away if the page
   * has already loaded past it.
   *
   * A ScrollTrigger fires on the way through its start. Reload half way down a page, follow a
   * link to an anchor, or let the browser restore a scroll position, and everything above
   * never gets crossed: those triggers sit at their end state with their callback unspent, and
   * whatever they were holding stays invisible.
   */
  function whenReached(trigger, play, start) {
    var spent = false;

    function run() {
      if (spent) return;
      spent = true;
      play();
    }

    if (ScrollTrigger) {
      ScrollTrigger.create({ trigger: trigger, start: start || START, once: true, onEnter: run });
    }

    onSettled(function () {
      if (!spent && isPastEntrance(trigger)) run();
      return spent;
    });
  }

  /**
   * Re-measure every trigger, once the dust has settled.
   *
   * ScrollTrigger reads each element's position when it is created. Anything that changes the
   * page afterwards — a slider that initialises late, an image that arrives late, a font that
   * reflows a paragraph — leaves those positions describing a page that no longer exists.
   */
  var pendingRefresh;
  function refreshTriggers() {
    window.clearTimeout(pendingRefresh);
    pendingRefresh = window.setTimeout(function () {
      if (ScrollTrigger) ScrollTrigger.refresh();
    }, 120);
  }

  /**
   * Hand an element back to the browser once its entrance has played. GSAP's inline transform
   * is left in place — it costs nothing and clearing it would fight the scrubbed tweens that
   * ride some of the same elements — but the compositor hint has to go, or every revealed
   * element keeps its own layer.
   */
  function release(targets) {
    gsap.set(targets, { willChange: "auto" });
  }

  /* ── entrance engine (reveal.ts) ─────────────────────────────────────────────────── */

  /** The resting state every variant animates towards. */
  function toVars() {
    return {
      rise: { opacity: 1, y: 0, duration: DUR.lg, ease: EASE.settle },
      fade: { opacity: 1, duration: DUR.xl, ease: EASE.out },
      lines: { opacity: 1, duration: DUR.lg, ease: EASE.settle },
      pop: { opacity: 1, scale: 1, duration: DUR.md, ease: EASE.settle },
      slab: { opacity: 1, scale: 1, duration: DUR.xl, ease: EASE.out },
      draw: { opacity: 1, scaleX: 1, duration: DUR.lg, ease: EASE.out },
      hold: { opacity: 1, duration: DUR.md, ease: EASE.out },
    };
  }

  /** Where each variant starts. Applied by GSAP, not by the stylesheet. */
  var FROM = {
    rise: { opacity: 0, y: 40 },
    fade: { opacity: 0 },
    lines: { opacity: 0 },
    pop: { opacity: 0, scale: 0.9 },
    slab: { opacity: 0, scale: 0.97 },
    draw: { opacity: 1, scaleX: 0, transformOrigin: "left center" },
    hold: { opacity: 0 },
  };

  function variantOf(el) {
    var value = (el.dataset.anim || "").trim();
    return value.length ? value : "rise";
  }

  /**
   * Line-split elements are prepared up front: the wrapper becomes visible and the lines take
   * its place below their own masks. Returns a play function, so the trigger created later
   * drives lines rather than the wrapper.
   */
  function prepareLines(el) {
    // A split must not change the shape of the page. If it does — a line rewraps inside its
    // own mask, a heading grows a row — the split is put back and the element takes the plain
    // entrance instead. Better a simpler animation than a page that changes height.
    var before = el.getBoundingClientRect().height;
    var split = splitLines(el);
    if (!split.lines.length) return null;

    if (Math.abs(el.getBoundingClientRect().height - before) > 1) {
      split.revert();
      return null;
    }

    gsap.set(el, { opacity: 1 });
    gsap.set(split.lines, {
      y: function (_i, target) {
        return maskedOffset(target);
      },
    });

    return function () {
      return gsap.to(split.lines, {
        y: 0,
        duration: DUR.lg,
        ease: EASE.out,
        stagger: STAGGER.base,
        onComplete: function () {
          // Undo the split once it has played. The wrappers clip, so a viewport that narrows
          // afterwards would cut any line that has to rewrap.
          split.revert();
          gsap.set(el, { opacity: 1, clearProps: "willChange" });
        },
      });
    };
  }

  function play(el, position, timeline) {
    var variant = variantOf(el);
    var TO = toVars();

    if (variant === "lines" && el._lines) {
      timeline.add(el._lines(), position);
      return;
    }

    var vars = TO[variant] || TO.rise;
    timeline.to(
      el,
      Object.assign({}, vars, {
        onComplete: function () {
          release(el);
        },
      }),
      position,
    );
  }

  /** Everything visible, nothing moving. */
  function showAll() {
    gsap.set(document.querySelectorAll("[data-anim]"), {
      opacity: 1,
      y: 0,
      scale: 1,
      scaleX: 1,
      clearProps: "willChange",
    });
  }

  function initReveals() {
    var root = document.documentElement;
    if (!root.classList.contains("reveal-ready")) return Promise.resolve();

    if (reduced()) {
      showAll();
      return Promise.resolve();
    }

    // A section can opt out and choreograph itself — the hero does. Its pieces still carry
    // data-anim so the stylesheet hides them before first paint; only the generic ladder
    // steps aside.
    var all = Array.prototype.slice
      .call(document.querySelectorAll("[data-anim]"))
      .filter(function (el) {
        return variantOf(el) !== "hold" && !el.closest("[data-anim-manual]");
      });
    if (!all.length) return Promise.resolve();

    // Hidden state moves from the stylesheet to GSAP before anything can fire, so the two
    // never disagree about where an element starts.
    all.forEach(function (el) {
      if (variantOf(el) === "lines") return;
      gsap.set(el, Object.assign({}, FROM[variantOf(el)] || FROM.rise, { willChange: "opacity, transform" }));
    });

    var lineTargets = all.filter(function (el) {
      return variantOf(el) === "lines";
    });

    var ready = lineTargets.length
      ? fontsReady().then(function () {
          lineTargets.forEach(function (el) {
            var player = prepareLines(el);
            if (player) {
              el._lines = player;
              return;
            }
            // The split was refused. Fall back to the plain entrance, which means giving the
            // element the starting state the loop above skipped.
            el.dataset.anim = "rise";
            gsap.set(el, Object.assign({}, FROM.rise, { willChange: "opacity, transform" }));
          });
        })
      : Promise.resolve();

    return ready.then(function () {
      var grouped = [];

      // A group is one arrival: the container is the trigger and its members follow each
      // other, whatever their nesting depth.
      Array.prototype.forEach.call(document.querySelectorAll("[data-anim-group]"), function (group) {
        var members = Array.prototype.slice.call(group.querySelectorAll("[data-anim]")).filter(function (el) {
          return variantOf(el) !== "hold";
        });
        if (!members.length) return;
        members.forEach(function (el) {
          grouped.push(el);
        });

        whenReached(group, function () {
          var timeline = gsap.timeline();
          members.forEach(function (el, i) {
            play(el, spread(i, members.length, 0.6), timeline);
          });
        });
      });

      // Anything left over travels on its own, but neighbours that come into view in the same
      // frame still arrive as a ladder rather than all at once.
      var loose = all.filter(function (el) {
        return grouped.indexOf(el) === -1;
      });
      var played = [];

      function arrive(els) {
        var fresh = els.filter(function (el) {
          return played.indexOf(el) === -1;
        });
        if (!fresh.length) return;
        var timeline = gsap.timeline();
        fresh.forEach(function (el, i) {
          played.push(el);
          play(el, spread(i, fresh.length), timeline);
        });
      }

      // Whatever is already up past the line — the first viewport on a cold load, everything
      // above the restored position on a reload — arrives now. Only what is still below gets a
      // trigger, because only that can be scrolled into.
      arrive(loose.filter(isPastEntrance));

      var later = loose.filter(function (el) {
        return played.indexOf(el) === -1;
      });
      if (later.length && ScrollTrigger) {
        ScrollTrigger.batch(later, {
          start: START,
          once: true,
          onEnter: function (batch) {
            arrive(batch);
          },
        });

        // A reload lands at its restored position after the partition above was drawn.
        // Whatever ended up behind the line by then never gets crossed, so it is swept up here
        // instead of staying hidden for the rest of the visit.
        onSettled(function () {
          arrive(
            later.filter(function (el) {
              return played.indexOf(el) === -1 && isPastEntrance(el);
            }),
          );
          return later.every(function (el) {
            return played.indexOf(el) !== -1;
          });
        });
      } else if (later.length) {
        arrive(later);
      }

      // Splitting the headlines above reflowed them, and the images have not landed yet —
      // both move every start position just measured.
      refreshTriggers();
      window.addEventListener("load", refreshTriggers, { once: true });
    });
  }

  /* ── figures (sections.ts) ───────────────────────────────────────────────────────── */

  /**
   * Read a printed figure back into its parts so it can be counted up and printed again
   * exactly as the design wrote it — `$2’259.56` keeps its curly separator and its two
   * decimals, `5.0` keeps the zero it would otherwise lose, `205+` keeps the plus.
   */
  function parseFigure(text) {
    var match = text.trim().match(/^([^\d]*)([\d][\d.,'’  ]*?)([^\d]*)$/);
    if (!match) return null;

    var prefix = match[1];
    var body = match[2];
    var suffix = match[3];

    // The last separator is the decimal point only if what follows is a short run of digits
    // that ends the number. Anything else is grouping.
    var decimalMatch = body.match(/[.,](\d{1,2})$/);
    var decimals = decimalMatch ? decimalMatch[1].length : 0;

    var groupMatch = body.slice(0, decimalMatch ? -decimalMatch[0].length : undefined).match(/[.,'’  ]/);
    var group = groupMatch ? groupMatch[0] : "";

    var digits = decimalMatch
      ? body.slice(0, -decimalMatch[0].length).replace(/\D/g, "") + "." + decimalMatch[1]
      : body.replace(/\D/g, "");

    var value = parseFloat(digits);
    if (!isFinite(value)) return null;

    return { prefix: prefix, suffix: suffix, value: value, decimals: decimals, group: group };
  }

  function formatFigure(figure, value) {
    var fixed = value.toFixed(figure.decimals);
    var parts = fixed.split(".");
    var whole = parts[0];
    var fraction = parts[1];
    var grouped = figure.group ? whole.replace(/\B(?=(\d{3})+(?!\d))/g, figure.group) : whole;
    return figure.prefix + grouped + (fraction ? "." + fraction : "") + figure.suffix;
  }

  /**
   * Count a printed figure up to itself. The element keeps its final text in the markup —
   * this only replaces it while the tween runs, so a failure here leaves the right number on
   * screen rather than a zero.
   */
  function countUp(el, duration) {
    if (duration === undefined) duration = 1.6;
    var figure = parseFigure(el.textContent || "");
    if (!figure) return null;

    var counter = { value: 0 };
    // Whole numbers land on whole numbers; a rate keeps its decimals throughout.
    var snap = figure.decimals ? 1 / Math.pow(10, figure.decimals) : 1;

    return gsap.to(counter, {
      value: figure.value,
      duration: duration,
      ease: "power2.out",
      snap: { value: snap },
      onUpdate: function () {
        el.textContent = formatFigure(figure, counter.value);
      },
      onComplete: function () {
        el.textContent = formatFigure(figure, figure.value);
      },
    });
  }

  /* ── Results — the figures calculate ─────────────────────────────────────────────── */

  function initResults() {
    var cards = Array.prototype.slice.call(document.querySelectorAll(".results_card"));
    if (!cards.length) return;

    cards.forEach(function (card, i) {
      var rule = card.querySelector(".space-divider");
      var value = card.querySelector(".is-results-value");
      if (!rule && !value) return;

      var at = i * STAGGER.loose;

      if (rule) gsap.set(rule, { scaleX: 0, transformOrigin: "left center" });
      if (value) gsap.set(value, { opacity: 0 });

      whenReached(card, function () {
        var timeline = gsap.timeline();

        // The rule is struck first and the figure runs in behind it — the value reads as the
        // result of the line, not as another thing that faded in.
        if (rule) timeline.to(rule, { scaleX: 1, duration: DUR.lg, ease: EASE.out }, at);
        if (value) {
          timeline.to(value, { opacity: 1, duration: DUR.sm, ease: "none" }, at + 0.2);
          var count = countUp(value);
          if (count) timeline.add(count, at + 0.2);
        }
      });
    });
  }

  /* ── Framed artwork — the frame opens ────────────────────────────────────────────── */

  /**
   * Two places use the same idea — artwork sitting in a pale blue frame — so they get the same
   * gesture. The focus rack is the difference: the home rows are read one at a time down a
   * long column, while the solutions cards are a grid you take in at once.
   */
  var FRAMED = [
    { frame: ".features_image-wrap", art: ".features_image", rack: true },
    { frame: ".solutions_card-visual-wrap", art: ".solutions_card-visual", rack: false },
  ];

  function initFeatures() {
    FRAMED.forEach(function (kind) {
      openFrames(kind.frame, kind.art, kind.rack);
    });
  }

  function openFrames(frameSelector, artSelector, rack) {
    var frames = Array.prototype.slice.call(document.querySelectorAll(frameSelector));
    if (!frames.length) return;

    frames.forEach(function (frame) {
      var art = frame.querySelector(artSelector);

      // The frame is struck open from the bottom edge; `round` keeps the panel's own 2rem
      // corners through the wipe instead of squaring them off mid-tween. Opacity goes back to
      // 1 straight away: the stylesheet hid it before the first paint, and from here the clip
      // is what conceals it.
      gsap.set(frame, { opacity: 1, clipPath: "inset(100% 0% 0% 0% round 2rem)" });
      if (art) gsap.set(art, { y: 40, opacity: 0 });

      whenReached(frame, function () {
        var timeline = gsap.timeline();

        timeline.to(frame, {
          clipPath: "inset(0% 0% 0% 0% round 2rem)",
          duration: DUR.xl,
          ease: EASE.out,
          onComplete: function () {
            gsap.set(frame, { clearProps: "clipPath" });
          },
        });

        if (art) {
          timeline.to(art, { y: 0, opacity: 1, duration: DUR.lg, ease: EASE.settle }, 0.25);
        }

        // The focus rack only starts once the frame has finished opening, so the two never
        // write `opacity` to the same element in the same frame.
        if (rack) {
          timeline.call(function () {
            focusRack(frame);
          });
        }
      });
    });
  }

  /**
   * A frame recedes as it leaves the middle of the screen and comes forward as it arrives, so
   * the row you are level with is the one in focus.
   *
   * Only the artwork dims. Dimming the row would take the description with it, and that copy
   * is `--brand--neutral` on the page background — already the weakest contrast in the design.
   */
  function focusRack(frame) {
    var DIM = 0.55;
    var wide = window.matchMedia(BP.desktop);

    function setFocus() {
      // Below 992px the rows stack full-width and there is only ever one on screen — there is
      // nothing to rack focus between, so everything stays lit.
      if (!wide.matches) {
        gsap.set(frame, { opacity: 1 });
        return;
      }

      var box = frame.getBoundingClientRect();
      var middle = window.innerHeight / 2;
      var offset = Math.abs(box.top + box.height / 2 - middle);
      // Fully lit within two thirds of a half-viewport of centre, fully dim beyond.
      var away = gsap.utils.clamp(0, 1, (offset - middle * 0.66) / (middle * 0.9));
      gsap.set(frame, { opacity: 1 - away * (1 - DIM) });
    }

    if (ScrollTrigger) {
      ScrollTrigger.create({
        trigger: frame,
        start: "top bottom",
        end: "bottom top",
        onUpdate: setFocus,
        onRefresh: setFocus,
      });
    }

    wide.addEventListener("change", setFocus);
    setFocus();
  }

  /* ── Expenses — the stack is dealt, the phone is lifted ──────────────────────────── */

  /** Deepest layer first, so the stack builds up towards the one on top. */
  var STACK = [
    { selector: ".back-image", y: 56, rotate: -2.5 },
    { selector: ".middle-image", y: 40, rotate: 1.8 },
    { selector: ".front-image", y: 24, rotate: -1.2 },
  ];

  function initExpenses() {
    var stack = document.querySelector(".expenses_card-visual");

    if (stack) {
      var layers = STACK.map(function (layer) {
        return { y: layer.y, rotate: layer.rotate, el: stack.querySelector(layer.selector) };
      }).filter(function (l) {
        return Boolean(l.el);
      });

      if (layers.length) {
        // Three receipts fanned down the card. They come up into the fan rather than fading in
        // place — the same hand that deals the hero's cards.
        layers.forEach(function (layer) {
          gsap.set(layer.el, { y: layer.y, rotate: layer.rotate, opacity: 0 });
        });

        whenReached(stack, function () {
          var els = layers.map(function (l) {
            return l.el;
          });
          gsap.to(els, {
            y: 0,
            rotate: 0,
            opacity: 1,
            duration: DUR.xl,
            ease: EASE.settle,
            stagger: STAGGER.loose,
            onComplete: function () {
              release(els);
            },
          });
        });
      }
    }

    var phone = document.querySelector(".phone-image");
    if (phone) {
      gsap.set(phone, { y: 60, scale: 0.94, opacity: 0, transformOrigin: "center bottom" });
      whenReached(phone, function () {
        gsap.to(phone, {
          y: 0,
          scale: 1,
          opacity: 1,
          duration: DUR.xl,
          ease: EASE.settle,
          onComplete: function () {
            release(phone);
          },
        });
      });
    }
  }

  /* ── Platform grid — the art settles into its card ───────────────────────────────── */

  function initPlatform() {
    var cards = Array.prototype.slice.call(document.querySelectorAll(".platform_card"));
    if (!cards.length) return;

    var grid = cards[0].parentElement || cards[0];

    cards.forEach(function (card) {
      gsap.set(card, { y: 44, opacity: 0 });
      var art = card.querySelector("img");
      // The image arrives a touch oversized and shrinks to fit, so it reads as settling into
      // the card rather than appearing on top of it.
      if (art) gsap.set(art, { scale: 1.06, transformOrigin: "center center" });
    });

    whenReached(grid, function () {
      var timeline = gsap.timeline();
      cards.forEach(function (card, i) {
        var at = spread(i, cards.length, 0.4);
        timeline.to(
          card,
          {
            y: 0,
            opacity: 1,
            duration: DUR.xl,
            ease: EASE.settle,
            onComplete: function () {
              release(card);
            },
          },
          at,
        );
        var art = card.querySelector("img");
        if (art) timeline.to(art, { scale: 1, duration: DUR.xl, ease: EASE.out }, at);
      });
    });
  }

  /* ── Steps — the cards lean in ───────────────────────────────────────────────────── */

  function initSteps() {
    var cards = Array.prototype.slice.call(document.querySelectorAll(".steps_card"));
    if (!cards.length) return;

    // WebKit does not paint a parent's `perspective` onto a transformed child, so the depth
    // has to travel in the child's own transform or the lean reads flat in Safari and deep
    // everywhere else.
    // ReadyYet: the home page's shared rise (lib/motion/reveal.ts), not the template's 48px.
    gsap.set(cards, { transformPerspective: 900, rotateX: 8, y: 24, opacity: 0 });

    // The row is the trigger, not each card: below 992px they stack, and one trigger per card
    // would turn the lean into three separate arrivals.
    var row = cards[0].parentElement || cards[0];

    whenReached(row, function () {
      gsap.to(cards, {
        rotateX: 0,
        y: 0,
        opacity: 1,
        duration: DUR.xl,
        ease: "reveal",
        stagger: STAGGER.base,
        onComplete: function () {
          release(cards);
        },
      });
    });
  }

  /* ── Pricing — the plans stack, the featured one lands last ──────────────────────── */

  function initPricing() {
    var row = document.querySelector(".pricing_content");
    if (!row) return;

    var cards = Array.prototype.slice.call(row.children);
    if (!cards.length) return;

    var featured = row.querySelector(".pricing_standard-wrap");

    cards.forEach(function (card) {
      gsap.set(card, { opacity: 0, y: card === featured ? 64 : 44 });
    });

    whenReached(row, function () {
      var timeline = gsap.timeline();

      // The plain plans go up first and the lime one arrives after them, from further down —
      // it overtakes the row, which is where the eye ends up.
      cards
        .filter(function (card) {
          return card !== featured;
        })
        .forEach(function (card, i) {
          timeline.to(
            card,
            {
              opacity: 1,
              y: 0,
              duration: DUR.xl,
              ease: EASE.settle,
              onComplete: function () {
                release(card);
              },
            },
            i * STAGGER.loose,
          );
        });

      if (featured) {
        timeline.to(
          featured,
          {
            opacity: 1,
            y: 0,
            duration: DUR.xl,
            ease: EASE.settle,
            onComplete: function () {
              release(featured);
            },
          },
          STAGGER.loose * 2,
        );
      }

      // Every price counts up, the featured one included.
      Array.prototype.forEach.call(row.querySelectorAll(".card-price"), function (price, i) {
        var count = countUp(price, 1.1);
        if (count) timeline.add(count, 0.35 + i * STAGGER.loose);
      });
    });
  }

  /* ── Banner — the product assembles ──────────────────────────────────────────────── */

  function initBanner() {
    var visual = document.querySelector(".banner_visual");
    if (!visual) return;

    var phone = visual.querySelector(":scope > .img");
    var back = visual.querySelector(".banner_visual-back");
    var front = visual.querySelector(".banner_visual-front");
    var right = visual.querySelector(".banner_visual-right");

    // The cluster itself is only a frame; what the stylesheet hid is handed back and each
    // layer inside takes over its own entrance.
    gsap.set(visual, { opacity: 1 });

    // The card is the one thing here with a face — it turns to meet you. The perspective rides
    // each element's own transform for WebKit's sake.
    if (phone) gsap.set(phone, { y: 56, opacity: 0 });
    if (right) gsap.set(right, { transformPerspective: 800, rotateY: -18, x: 40, opacity: 0 });
    if (back) gsap.set(back, { x: -28, opacity: 0 });
    if (front) gsap.set(front, { y: 36, opacity: 0 });

    whenReached(visual, function () {
      var timeline = gsap.timeline({ defaults: { duration: DUR.xl, ease: EASE.settle } });

      if (phone) timeline.to(phone, { y: 0, opacity: 1 }, 0);
      if (right) timeline.to(right, { rotateY: 0, x: 0, opacity: 1 }, 0.12);
      if (back) timeline.to(back, { x: 0, opacity: 1 }, 0.2);
      if (front) timeline.to(front, { y: 0, opacity: 1 }, 0.28);
    });
  }

  /* ── Slabs — every dark panel on the cream page settles into place ───────────────── */

  function initSlabs() {
    var slabs = Array.prototype.slice.call(document.querySelectorAll("[data-slab]"));
    if (!slabs.length || !ScrollTrigger) return;

    slabs.forEach(function (slab) {
      gsap.fromTo(
        slab,
        { scale: 0.97 },
        {
          scale: 1,
          ease: EASE.none,
          scrollTrigger: { trigger: slab, start: "top bottom", end: "top 55%", scrub: 0.5 },
        },
      );
    });
  }

  /* ── Artwork drift ───────────────────────────────────────────────────────────────── */

  /**
   * A container carries data-parallax; each moving layer declares where it starts and ends as
   * a percentage of its own box: data-parallax-from|to="x,y". Desktop only — on a phone the
   * travel is a few pixels and costs a repaint.
   */
  function pair(value) {
    var parts = (value || "").split(",");
    return { x: parseFloat(parts[0]) || 0, y: parseFloat(parts[1]) || 0 };
  }

  function initDrift() {
    if (!ScrollTrigger) return;
    Array.prototype.forEach.call(document.querySelectorAll("[data-parallax]"), function (container) {
      var layers = container.querySelectorAll("[data-parallax-from]");
      if (!layers.length) return;

      var timeline = gsap.timeline({
        scrollTrigger: { trigger: container, start: "top bottom", end: "bottom top", scrub: 0.5 },
      });

      Array.prototype.forEach.call(layers, function (layer) {
        var from = pair(layer.dataset.parallaxFrom);
        var to = pair(layer.dataset.parallaxTo);
        timeline.fromTo(
          layer,
          { xPercent: from.x, yPercent: from.y },
          { xPercent: to.x, yPercent: to.y, ease: EASE.none },
          0,
        );
      });
    });
  }

  function initSections() {
    if (reduced()) return;

    initResults();
    initFeatures();
    initExpenses();
    initPlatform();
    initSteps();
    initPricing();
    initBanner();
    initSlabs();

    if (mm) {
      mm.add(BP.desktop, function () {
        initDrift();
      });
    } else if (window.matchMedia(BP.desktop).matches) {
      initDrift();
    }
  }

  /* ── FAQ accordion (accordion.ts) ────────────────────────────────────────────────── */

  /**
   * One question is open at a time — the first one to start with, and opening another folds
   * it. GSAP animates the panel to `auto`, so nothing here has to add up the contents by hand
   * or unpick a transform that a child is mid-way through.
   */
  function initAccordions() {
    var items = Array.prototype.slice.call(document.querySelectorAll(".accordion"));
    if (!items.length) return;

    var soft = !reduced();
    var panels = [];

    items.forEach(function (item) {
      var toggle = item.querySelector(".accordion-toggle");
      var panel = item.querySelector(".accordion-content");
      var content = panel ? panel.querySelector(".content-wrap") : null;
      if (!toggle || !panel) return;

      // One tween owns the panel. Without this a question toggled mid-open keeps the old tween
      // alive and the panel reopens by itself a moment later.
      var current = null;

      function setOpen(open, animate) {
        if (animate === undefined) animate = true;
        if (current) current.kill();

        item.classList.toggle("is-open", open);
        toggle.setAttribute("aria-expanded", String(open));

        if (!animate || !soft) {
          gsap.set(panel, { height: open ? "auto" : 0 });
          if (content) gsap.set(content, { opacity: open ? 1 : 0, y: 0 });
          return;
        }

        current = gsap.timeline();
        current.to(panel, { height: open ? "auto" : 0, duration: DUR.md, ease: EASE.inOut });

        if (content) {
          current.to(
            content,
            {
              opacity: open ? 1 : 0,
              y: open ? 0 : 16,
              duration: open ? DUR.md : DUR.sm,
              ease: open ? EASE.settle : EASE.quick,
            },
            open ? 0.12 : 0,
          );
        }
      }

      // The panel's resting state has to be written before anything can be clicked: the markup
      // ships the first question open and every other closed.
      var startsOpen = item.classList.contains("is-open");
      gsap.set(panel, { height: startsOpen ? "auto" : 0, overflow: "hidden" });
      if (content) gsap.set(content, { opacity: startsOpen ? 1 : 0, y: startsOpen ? 0 : 16 });

      panels.push({ item: item, setOpen: setOpen });

      toggle.addEventListener("click", function () {
        var open = !item.classList.contains("is-open");
        if (open) {
          panels.forEach(function (other) {
            if (other.item !== item && other.item.classList.contains("is-open")) other.setOpen(false);
          });
        }
        setOpen(open);
      });
    });

    // An open panel sitting at a measured height would keep it through a reflow. `auto` is
    // re-applied so it follows its content when the viewport changes.
    var settle;
    window.addEventListener("resize", function () {
      window.clearTimeout(settle);
      settle = window.setTimeout(function () {
        panels.forEach(function (entry) {
          if (!entry.item.classList.contains("is-open")) return;
          var panel = entry.item.querySelector(".accordion-content");
          if (panel) gsap.set(panel, { height: "auto" });
        });
      }, 150);
    });
  }

  /* ── Forms (form.ts) ─────────────────────────────────────────────────────────────── */

  /**
   * The template ships without a backend, so no form has anywhere to post — but a reader who
   * presses Send or Subscribe is owed an answer either way, and a form with no `action` posts
   * to the page it is on and reloads it, which reads as the site losing what they typed.
   *
   * This runs ONLY while a form has no `action`. Point one at a service and the browser's own
   * submission takes over with nothing here in the way.
   */
  function wireForm(panel) {
    // The panel and its form are the two halves of one `.form_component`.
    var scope = panel.closest(".form_component") || panel.parentElement;
    var form = scope ? scope.querySelector("form") : null;
    if (!form) return;

    // A real endpoint owns the submission; intercepting it would swallow the post.
    if (form.getAttribute("action")) return;

    var title = panel.querySelector("[data-form-success-title]");
    var again = panel.querySelector("[data-form-again]");

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      // `submit` only fires once the browser's own validation has passed, so the required
      // fields and the email format have already been checked.
      form.hidden = true;
      panel.hidden = false;
      // Focus carries the announcement. A live region that was hidden a moment ago is read
      // inconsistently; moving focus to the message is not.
      if (title) title.focus();
    });

    // Only the contact form offers a way back — there is nothing to do twice about a
    // subscription.
    if (again) {
      again.addEventListener("click", function () {
        form.reset();
        panel.hidden = true;
        form.hidden = false;
        var first = form.querySelector("input");
        if (first) first.focus();
      });
    }
  }

  function initForms() {
    Array.prototype.forEach.call(document.querySelectorAll("[data-form-success]"), wireForm);
  }

  /* ── boot ────────────────────────────────────────────────────────────────────────── */

  function init() {
    if (!libs()) {
      // No GSAP at all: drop the hidden state so the section reads, and stop.
      document.documentElement.classList.remove("reveal-ready");
      initForms();
      return;
    }

    // Tells the failsafe in the <head> that this file arrived (not in the template: there,
    // the layout always loads).
    document.documentElement.classList.add("reveal-live");

    initReveals();
    initAccordions();
    initSections();
    initForms();
  }

  // Inline cannot defer, so a file inlined into the preview runs before the DOM exists.
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  // Shared with hero.js and sliders.js, which the template imported from this same core.
  window.__payable = {
    EASE: EASE,
    DUR: DUR,
    STAGGER: STAGGER,
    START: START,
    BP: BP,
    libs: libs,
    spread: spread,
    reduced: reduced,
    finePointer: finePointer,
    fontsReady: fontsReady,
    splitLines: splitLines,
    maskedOffset: maskedOffset,
    release: release,
    refreshTriggers: refreshTriggers,
    whenReached: whenReached,
    isPastEntrance: isPastEntrance,
    onSettled: onSettled,
  };
})();

}).call(this, window.temlisScope ? window.temlisScope("payable-626") : document);
