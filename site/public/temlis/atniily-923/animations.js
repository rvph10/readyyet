/*! Temlis · Dark Footer with Giant Wordmark · licensed to tmfp_tpbvab43o3bhnmtl · temlis.com/license */
// Temlis: this script only sees its own section (see temlis-scope.js).
(function (document) {
/* Atniily — shared motion. Ported by hand from the <script> of the landing's Motion.astro (the
   entrance gestures read from `data-anim`, `data-anim-children`, `data-anim-group` and
   `data-anim-scene`). Same logic, no TypeScript and no module syntax: the catalog preview inlines
   the scripts of the package and strips module syntax, so everything has to exist as a global.
   GSAP and its plugins (ScrollTrigger, SplitText, CustomEase) are provided by the window — never
   linked to a CDN.

   Left out on purpose:
   - Lenis. A section pasted into another site would take over that site's scroll. The entrances
     run on ScrollTrigger over native scroll.

   The <head> flag adds `html.motion` (which hides every [data-anim] until it enters) and removes
   it after 2.5 s unless this file marks `data-motion-ready`. Without GSAP this file marks nothing
   and hands the content back at once.

   The component-scoped <script> of each section (the features wheel, the stories slider, the FAQ
   fallback) lives in the script.js of its own section. */
(function () {
  "use strict";

  function start(gsap, ScrollTrigger, SplitText, CustomEase) {
    const root = document.documentElement;

    root.dataset.motionReady = '';

    if (root.classList.contains('motion')) {
      gsap.registerPlugin(ScrollTrigger, SplitText, CustomEase);

      const EASE_ROLL = CustomEase.create('atnRoll', 'M0,0 C0.22,1 0.36,1 1,1');
      const EASE_SOFT = CustomEase.create('atnSoft', 'M0,0 C0.4,0.15 0.2,1 1,1');

      ScrollTrigger.config({ ignoreMobileResize: true });

      const num = (el, key, fallback) => {
        const parsed = parseFloat(el.dataset[key] ?? '');
        return Number.isFinite(parsed) ? parsed : fallback;
      };

      const spread = (o) => o.offsets ?? { each: o.stagger, from: o.from };

      const uncover = (targets) => {
        targets.forEach((t) => t.removeAttribute('data-anim'));
      };

      const tidy = (el) => {
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        const nodes = [];
        while (walker.nextNode()) nodes.push(walker.currentNode);
        if (!nodes.length) return;
        nodes.forEach((n) => {
          n.textContent = (n.textContent || '').replace(/[^\S\u00A0]+/g, ' ');
        });
        nodes[0].textContent = (nodes[0].textContent || '').replace(/^ /, '');
        const last = nodes[nodes.length - 1];
        last.textContent = (last.textContent || '').replace(/ $/, '');
      };

      const CLEAR =
        'opacity,transform,transformOrigin,translate,rotate,scale,clipPath,maskImage,maskSize,webkitMaskImage,webkitMaskSize,willChange,transition';

      const settle = (targets) => () => {
        gsap.set(targets, { clearProps: CLEAR });
        targets.forEach((t) => {
          t.style.removeProperty('transform-origin');
          if (t.getAttribute('style') === '') t.removeAttribute('style');
        });
      };

      /* Gestures */
      const GESTURES = {
        lines: (els, o) => {
          const tl = gsap.timeline({ delay: o.delay });
          els.forEach((el, i) => {
            tidy(el);
            const split = SplitText.create(el, {
              type: 'lines',
              mask: 'lines',
              linesClass: 'atn-line',
              reduceWhiteSpace: false,
            });
            tl.from(
              split.lines,
              {
                yPercent: 105,
                duration: 0.9,
                ease: EASE_ROLL,
                stagger: 0.09,
                onComplete: () => split.revert(),
              },
              i * o.stagger,
            );
          });
          return tl;
        },

        rise: (els, o) =>
          gsap.timeline({ delay: o.delay }).from(els, {
            y: (_, target) => num(target, 'animY', 24),
            opacity: 0,
            duration: 0.7,
            ease: EASE_ROLL,
            stagger: spread(o),
          }),

        words: (els, o) => {
          const tl = gsap.timeline({ delay: o.delay });
          els.forEach((el, i) => {
            tidy(el);
            const split = SplitText.create(el, {
              type: 'words',
              mask: 'words',
              wordsClass: 'atn-word',
              reduceWhiteSpace: false,
              wordDelimiter: ' ',
            });
            tl.from(
              split.words,
              {
                yPercent: 108,
                duration: 0.8,
                ease: EASE_ROLL,
                stagger: 0.07,
                onComplete: () => split.revert(),
              },
              i * o.stagger,
            );
          });
          return tl;
        },

        pop: (els, o) =>
          gsap.timeline({ delay: o.delay }).from(els, {
            scale: 0.72,
            opacity: 0,
            duration: 0.5,
            ease: 'back.out(1.8)',
            stagger: spread(o),
          }),

        deal: (els, o) => {
          const LIFT = 24;
          const TILT = [30, 16, 6];
          const CTRL_X = 0.95;
          const CTRL_Y = 0.3;
          const DUR = 0.68;

          const boxW = Math.max(...els.map((el) => el.offsetLeft + el.offsetWidth));
          const boxH = Math.max(...els.map((el) => el.offsetTop + el.offsetHeight));
          const sx = 0.28 * boxW;

          const tl = gsap.timeline({ delay: o.delay });

          els.forEach((el, i) => {
            const sy = boxH - el.offsetTop + LIFT;
            const tilt = TILT[Math.min(i, TILT.length - 1)];
            const put = (t) => {
              const u = 1 - t;
              gsap.set(el, {
                x: u * u * sx + 2 * u * t * (sx * CTRL_X),
                y: u * u * sy + 2 * u * t * (sy * CTRL_Y),
                rotation: tilt * u,
              });
            };
            const p = { t: 0 };
            put(0);

            tl.to(p, { t: 1, duration: DUR, ease: EASE_SOFT, onUpdate: () => put(p.t) }, i * o.stagger);

            tl.from(el, { opacity: 0, duration: DUR * 0.2, ease: 'none' }, i * o.stagger);
          });

          return tl;
        },

        bounce: (els, o) =>
          gsap
            .timeline({ delay: o.delay })
            .set(els, { transition: 'none' })
            .from(els, {
              scale: 0.94,
              opacity: 0,
              duration: 0.65,
              ease: 'back.out(1.5)',
              stagger: spread(o),
            }),

        dial: (els, o) =>
          gsap.timeline({ delay: o.delay }).from(els, {
            scale: 0.94,
            opacity: 0,
            duration: 1.1,
            ease: EASE_SOFT,
            stagger: spread(o),
          }),

        count: (els, o) => {
          const tl = gsap.timeline({ delay: o.delay });
          tl.from(
            els,
            {
              y: (_, t) => num(t, 'animY', 0),
              opacity: 0,
              duration: 0.7,
              ease: EASE_ROLL,
              stagger: spread(o),
            },
            0,
          );
          els.forEach((el, i) => {
            const raw = el.textContent ?? '';
            const digits = /-?\d+(?:[.,]\d+)?/.exec(raw);
            if (!digits) return;
            const target = parseFloat(digits[0].replace(',', '.'));
            const decimals = (digits[0].split(/[.,]/)[1] ?? '').length;
            const head = raw.slice(0, digits.index);
            const tail = raw.slice(digits.index + digits[0].length);
            const value = { n: 0 };
            const draw = () =>
              head + value.n.toFixed(decimals).padStart(digits[0].length, '\u00A0') + tail;
            tl.to(
              value,
              {
                n: target,
                duration: 0.9,
                ease: 'power2.out',
                onUpdate: () => {
                  el.textContent = draw();
                },
                onComplete: () => {
                  el.textContent = raw;
                },
              },
              o.offsets ? o.offsets(i, el) : i * o.stagger,
            );
          });
          return tl;
        },

        fill: (els, o) =>
          gsap.timeline({ delay: o.delay }).fromTo(
            els,
            {
              clipPath: (_i, t) =>
                t.dataset.animDir === 'down' ? 'inset(0% 0% 100% 0%)' : 'inset(100% 0% 0% 0%)',
            },
            {
              clipPath: 'inset(0% 0% 0% 0%)',
              duration: 0.75,
              ease: EASE_SOFT,
              stagger: spread(o),
            },
          ),
      };

      /* Scene builder */
      function scene(trigger, els, gesture, reveal) {
        const build = GESTURES[gesture];
        if (!build || !els.length) return;

        const o = {
          stagger: num(trigger, 'animStagger', 0.09),
          delay: num(trigger, 'animDelay', 0),
          from: (trigger.dataset.animFrom) ?? 'start',
        };

        ScrollTrigger.create({
          trigger,
          start: trigger.dataset.animStart ?? 'top 88%',
          once: true,
          onEnter: () => {
            reveal();
            build(els, o).eventCallback('onComplete', settle(els));
          },
        });
      }

      /* Boot */
      const boot = () => {
        const claimed = new Set();

        document.querySelectorAll('[data-anim-children]').forEach((group) => {
          const els = Array.from(group.children).filter(
            (c) => c instanceof HTMLElement && !claimed.has(c),
          );
          if (!els.length) return;
          els.forEach((el) => claimed.add(el));
          scene(group, els, group.dataset.animChildren || 'rise', () => {
            group.removeAttribute('data-anim-children');
            uncover(els);
          });
        });

        document.querySelectorAll('[data-anim-group]').forEach((group) => {
          const gesture = group.dataset.animGroup || '';
          const els = Array.from(
            group.querySelectorAll(gesture ? `[data-anim="${gesture}"]` : '[data-anim]'),
          ).filter((el) => !claimed.has(el));
          if (!els.length) return;
          els.forEach((el) => claimed.add(el));
          scene(group, els, gesture || els[0].dataset.anim || 'rise', () => {
            group.removeAttribute('data-anim-group');
            uncover(els);
          });
        });

        document.querySelectorAll('[data-anim-scene]').forEach((group) => {
          const els = Array.from(group.querySelectorAll('[data-anim]')).filter(
            (el) => !claimed.has(el),
          );
          if (!els.length) return;
          els.forEach((el) => claimed.add(el));

          const buckets = new Map();
          els.forEach((el) => {
            const key = el.dataset.anim || 'rise';
            const bucket = buckets.get(key);
            if (bucket) bucket.push(el);
            else buckets.set(key, [el]);
          });

          ScrollTrigger.create({
            trigger: group,
            start: group.dataset.animStart ?? 'top 88%',
            once: true,
            onEnter: () => {
              group.removeAttribute('data-anim-scene');
              uncover(els);
              const done = settle(els);
              let pending = buckets.size;
              const tick = () => {
                if (--pending === 0) done();
              };
              buckets.forEach((bucket, gesture) => {
                const build = GESTURES[gesture];
                if (!build) return tick();
                build(bucket, {
                  stagger: num(group, 'animStagger', 0.09),
                  delay: 0,
                  from: 'start',
                  offsets: (_i, t) => num(t, 'animDelay', 0),
                }).eventCallback('onComplete', tick);
              });
            },
          });
        });

        document.querySelectorAll('[data-anim]').forEach((el) => {
          if (claimed.has(el)) return;
          scene(el, [el], el.dataset.anim ?? 'rise', () => uncover([el]));
        });

        ScrollTrigger.refresh();
      };

      const fontsReady = document.fonts
        ? Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))])
        : Promise.resolve(undefined);

      fontsReady.then(() => {
        if (root.classList.contains('motion')) boot();
      });
    }
  }

  function init() {
    const gsap = window.gsap;
    const ScrollTrigger = window.ScrollTrigger;
    const SplitText = window.SplitText;
    const CustomEase = window.CustomEase;
    if (!gsap || !ScrollTrigger || !SplitText || !CustomEase) {
      document.documentElement.classList.remove("motion");
      return;
    }
    start(gsap, ScrollTrigger, SplitText, CustomEase);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();

}).call(this, window.temlisScope ? window.temlisScope("atniily-923") : document);
