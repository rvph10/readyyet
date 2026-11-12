/*! Temlis · Monthly Yearly Pricing Switch · licensed to tmfp_6ulmvpkrno4sleyj · temlis.com/license */
// Temlis: this script only sees its own section (see temlis-scope.js).
(function (document) {
/* Nexio — scroll motion, ported from src/scripts/motion.ts of the Nexio template.
 *
 * One gesture per block. A section announces itself once and a grid of cards arrives as a set —
 * nothing INSIDE a card carries a hook of its own. Four motions and no more, so the page speaks
 * with one accent:
 *
 *   rise    a text block lifts 48px into place
 *   set     each child of a grid arrives on reaching the line, staggered
 *   bloom   a visual settles out of an 8% over-scale
 *   drift   a strip lifts up out of a blur, already in motion
 *
 * GSAP runs the tweens; an IntersectionObserver decides when. ScrollTrigger is deliberately
 * absent: a trigger whose start you have already scrolled past never fires, so a section opened
 * halfway down would stay invisible.
 *
 * Ported by hand rather than reused from the landing's own bundle, which ships GSAP inside it.
 * The preview window lends gsap and its plugins, SplitText among them.
 *
 * Two departures from the module it came from, both forced by where this file now runs:
 *
 *  - It is an IIFE that self-inits on DOM ready and resolves `window.gsap` INSIDE that init. The
 *    catalog preview inlines the scripts of the package, and an inline script cannot defer: an
 *    IIFE that runs immediately finds neither the DOM nor gsap and dies silently.
 *  - No top-level `export`. In a classic `<script src>` that is a parse error that kills the
 *    whole file without a word.
 */
(function () {
  function init() {
    var gsap = window.gsap;
    if (!gsap) return;

    var SplitText = window.SplitText;
    if (SplitText && gsap.registerPlugin) gsap.registerPlugin(SplitText);

    var root = document.documentElement;

    /* Marks the boot as successful, which cancels the head script's failsafe. */
    root.setAttribute('data-reveal-booted', '');

    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    var EASE = 'power3.out';

    /* A block starts moving when its top has risen past 90% of the viewport — a tenth of the way
       in, rather than the moment its first pixel appears. */
    var TRIGGER = 0.9;

    /* A `set` is watched card by card, not as one box: these grids are far taller than the
       screen, so firing the whole grid at its top edge would finish the last card two screens
       before the reader arrived. */
    var pending = new Set();
    var setChildren = new WeakSet();

    var hooks = document.querySelectorAll('[data-reveal], [data-sweep]');
    for (var h = 0; h < hooks.length; h += 1) {
      var el = hooks[h];
      if (el.dataset.reveal === 'set') {
        var kids = Array.prototype.slice.call(el.children);
        for (var k = 0; k < kids.length; k += 1) {
          setChildren.add(kids[k]);
          pending.add(kids[k]);
        }
      } else {
        pending.add(el);
      }
    }

    /* ------------------------------------------------------------------- counters */

    /* A statistic counts up to the figure already written in the markup, so the number on screen
       without scripting is the real one. `95%` counts; the `%` stays put. */
    function runCounters(scope, instant) {
      var cells = scope.querySelectorAll('[data-count]');
      for (var i = 0; i < cells.length; i += 1) {
        var cell = cells[i];
        if (cell.dataset.counted !== undefined) continue;
        cell.dataset.counted = '';

        var parts = /^(\D*)([\d.]+)(.*)$/.exec((cell.textContent || '').trim());
        if (!parts) continue;

        var prefix = parts[1];
        var figure = parts[2];
        var suffix = parts[3];
        var target = Number(figure);
        if (!isFinite(target) || instant) continue;

        var decimals = figure.indexOf('.') >= 0 ? figure.split('.')[1].length : 0;
        (function (el, prefix, figure, suffix, target, decimals) {
          var counter = { value: 0 };
          gsap.to(counter, {
            value: target,
            duration: 1.6,
            ease: 'power2.out',
            onUpdate: function () {
              el.textContent = prefix + counter.value.toFixed(decimals) + suffix;
            },
            onComplete: function () {
              el.textContent = prefix + figure + suffix;
            },
          });
        })(cell, prefix, figure, suffix, target, decimals);
      }
    }

    /* ----------------------------------------------------------------- line masks */

    /* A heading arrives line by line, each one rising out of a mask. Two hazards, both handled
       here rather than discovered later: splitting relayouts the heading, so the box is pinned to
       the height it had and released once the original markup is back; and lines can only be
       measured once the real face is in use, so with a fallback face still showing the heading
       simply rises as one piece instead. */
    var fontsReady = false;
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(function () { fontsReady = true; });
    } else {
      fontsReady = true;
    }

    function splitLines(el) {
      if (!fontsReady || !SplitText) return null;

      var height = el.offsetHeight;
      el.style.height = height + 'px';

      var split;
      try {
        split = new SplitText(el, { type: 'lines', linesClass: 'split-line', mask: 'lines' });
      } catch (e) {
        el.style.height = '';
        return null;
      }

      if (!split.lines.length) {
        split.revert();
        el.style.height = '';
        return null;
      }

      var settle = function () {
        split.revert();
        el.style.height = '';
      };

      return gsap.fromTo(
        split.lines,
        { yPercent: 115 },
        {
          yPercent: 0,
          duration: 1,
          ease: EASE,
          stagger: 0.1,
          /* Both endings, for the same reason the entrances carry both: the revert is what puts
             the real markup back and releases the pinned height, so a tween that dies without it
             leaves the heading split into masked lines that never rise. */
          onComplete: settle,
          onInterrupt: settle,
        }
      );
    }

    /* ------------------------------------------------------------------ entrances */

    /* The inline transform and opacity are handed back once an element has arrived. The named
       list matters: clearing everything would also take the custom properties the glow writes. */
    function release(targets) {
      return function () {
        gsap.set(targets, { clearProps: 'transform,opacity,filter,willChange' });
      };
    }

    /* The same hand-back, wired to `onInterrupt` as well as `onComplete`. An entrance owns
       `opacity`, so a tween of it that dies partway leaves its element stranded at a fraction —
       and stranded for good, because nothing else ever writes that property again. */
    function landed(targets) {
      return { onComplete: release(targets), onInterrupt: release(targets) };
    }

    var FROM = { opacity: 0, y: 44, scale: 0.97 };

    /* Cards that reach the line in the same frame are tweened as one sequence. Collecting them
       costs a frame and buys the difference between a grid that arrives in order and four cards
       that happen to start together. */
    var batch = [];
    var batchQueued = false;

    function queueCard(el) {
      /* The from-state goes on before the class comes off, or the card shows itself at full
         strength for the frame in between. */
      gsap.set(el, FROM);
      el.classList.add('is-revealed');
      batch.push(el);

      if (batchQueued) return;
      batchQueued = true;
      requestAnimationFrame(function () {
        batchQueued = false;
        var cards = batch;
        batch = [];
        gsap.to(
          cards,
          Object.assign(
            {
              opacity: 1,
              y: 0,
              scale: 1,
              duration: 0.9,
              ease: EASE,
              /* The ladder is capped rather than paid per card: at 0.12s each, a nine-item list
                 would still be arriving a second after the reader got there, which stops reading
                 as a sequence and starts reading as a wait. */
              stagger: { amount: Math.min(cards.length * 0.12, 0.55) },
            },
            landed(cards)
          )
        );
      });
    }

    var observer = null;

    function play(el) {
      if (!pending.delete(el)) return;
      if (observer) observer.unobserve(el);

      if (reduced.matches) {
        el.classList.add('is-revealed');
        runCounters(el, true);
        return;
      }

      if (setChildren.has(el)) {
        queueCard(el);
        runCounters(el, false);
        return;
      }

      /* Releases the hidden state the head set, before anything is animated. */
      el.classList.add('is-revealed');

      var kind = el.dataset.reveal;

      if (kind === 'bloom') {
        gsap.fromTo(
          el,
          { opacity: 0, scale: 1.08 },
          Object.assign({ opacity: 1, scale: 1, duration: 1.3, ease: 'power2.out' }, landed(el))
        );
      } else if (kind === 'drift') {
        gsap.fromTo(
          el,
          { opacity: 0, filter: 'blur(14px)', y: 24 },
          Object.assign({ opacity: 1, filter: 'blur(0px)', y: 0, duration: 1.2, ease: 'power2.out' }, landed(el))
        );
      } else if (kind !== undefined) {
        /* A heading inside the block carries the travel on its own lines, so the block around it
           only fades — otherwise the two rises compound and the heading arrives from twice as far
           as everything beside it. */
        var heading = el.matches('[data-split]') ? el : el.querySelector('[data-split]');
        var lines = heading ? splitLines(heading) : null;

        if (lines) {
          gsap.fromTo(el, { opacity: 0 }, Object.assign({ opacity: 1, duration: 0.6 }, landed(el)));
        } else {
          gsap.fromTo(
            el,
            { opacity: 0, y: 48 },
            Object.assign({ opacity: 1, y: 0, duration: 0.9, ease: EASE }, landed(el))
          );
        }
      }

      runCounters(el, false);
    }

    function playAll() {
      var all = Array.prototype.slice.call(pending);
      for (var i = 0; i < all.length; i += 1) play(all[i]);
    }

    /* -------------------------------------------------------------- when it fires */

    /* Nothing is observed until the faces are in use: a heading split against a fallback face
       freezes the wrong line breaks, and the guard inside `splitLines` would quietly drop the
       mask on exactly the sections nearest the top. The wait is capped — a font that never
       arrives must not hold the page. */
    function whenFontsSettle() {
      if (!document.fonts || !document.fonts.ready) return Promise.resolve();
      return Promise.race([
        document.fonts.ready,
        new Promise(function (resolve) { window.setTimeout(resolve, 1200); }),
      ]);
    }

    function watch() {
      observer = new IntersectionObserver(
        function (entries) {
          for (var i = 0; i < entries.length; i += 1) {
            if (entries[i].isIntersecting) play(entries[i].target);
          }
        },
        { rootMargin: '0px 0px -' + Math.round((1 - TRIGGER) * 100) + '% 0px' }
      );

      pending.forEach(function (el) { observer.observe(el); });

      /* The sweep behind the observer is not paranoia. The page wrapper is `overflow: clip`, so a
         block sitting just past the last scrollable pixel can never intersect and would stay
         invisible for good; and a preview that opens partway down leaves everything above the
         viewport unobserved, because it is not intersecting and never will be again. */
      var queued = false;
      function sweep() {
        queued = false;
        if (!pending.size) return;
        var height = window.innerHeight;
        var atBottom = window.scrollY + height >= root.scrollHeight - 2;
        var all = Array.prototype.slice.call(pending);
        for (var i = 0; i < all.length; i += 1) {
          var box = all[i].getBoundingClientRect();
          if (atBottom || box.top < height * TRIGGER) play(all[i]);
        }
      }

      function onScroll() {
        if (queued) return;
        queued = true;
        requestAnimationFrame(sweep);
      }

      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll, { passive: true });
      window.addEventListener('load', onScroll);
      onScroll();

      reduced.addEventListener('change', function (event) {
        if (event.matches) playAll();
      });
    }

    if (reduced.matches) playAll();
    else whenFontsSettle().then(watch);

    /* ---------------------------------------------------------------- the glow */

    /* A card lights up under the cursor. Nexio already carries this light — every card ships an
       inset white bloom in its box shadow — so the pointer is only moving a highlight the design
       had already placed. The overlay lives in a pseudo-element, which GSAP cannot address, so
       what is animated are the three custom properties the pseudo-element reads. */
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches && !reduced.matches) {
      var cards = document.querySelectorAll('[data-glow]');
      for (var c = 0; c < cards.length; c += 1) {
        (function (card) {
          var queuedMove = false;
          var point = null;

          card.addEventListener(
            'pointermove',
            function (event) {
              point = event;
              if (queuedMove) return;
              queuedMove = true;
              requestAnimationFrame(function () {
                queuedMove = false;
                if (!point) return;
                var box = card.getBoundingClientRect();
                card.style.setProperty('--glow-x', point.clientX - box.left + 'px');
                card.style.setProperty('--glow-y', point.clientY - box.top + 'px');
              });
            },
            { passive: true }
          );

          /* `overwrite: 'auto'`, never `true`. A card carrying `data-glow` is usually also a child
             of a `data-reveal="set"` grid, so the same element is the target of both this fade and
             its entrance tween. `true` kills every tween on the target regardless of what it
             animates, so a pointer arriving mid-entrance killed the entrance — and since the
             entrance owns `opacity`, the card stayed at whatever opacity it had reached. The
             entrance itself is what puts the pointer there: it travels the card 44px upward,
             sliding it under a cursor that never moved. */
          var fade = function (to) {
            return gsap.to(card, { '--glow-opacity': to, duration: 0.45, ease: 'power2.out', overwrite: 'auto' });
          };

          card.addEventListener('pointerenter', function () { fade(1); }, { passive: true });
          card.addEventListener('pointerleave', function () { fade(0); }, { passive: true });
        })(cards[c]);
      }
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

}).call(this, window.temlisScope ? window.temlisScope("nexio-641") : document);
