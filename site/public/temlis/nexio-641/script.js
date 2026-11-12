/*! Temlis · Monthly Yearly Pricing Switch · licensed to tmfp_6ulmvpkrno4sleyj · temlis.com/license */
// Temlis: this script only sees its own section (see temlis-scope.js).
(function (document) {
/* Nexio — the monthly / yearly switch, ported by hand from src/scripts/tabs.ts and odometer.ts.
 *
 * Two buttons and two panels, wired as a tablist: arrow keys move between the tabs, and the panel
 * that is not showing is hidden from assistive technology as well as from view.
 *
 * The switch also carries the one piece of motion here that is not scroll-driven, and it is built
 * around a fact about the content: between the two panels almost nothing changes. The plan names,
 * the summaries, the five features and the button are identical. Two things differ — the price and
 * the period.
 *
 * So the panels do not cross-fade. Fading them would move some forty elements to report that six
 * characters changed, and it would re-run the entry of everything inside a panel each time it came
 * back, because `display: none` restarts a CSS animation from the top. Instead the change travels:
 * the lozenge slides and stretches, then the cards take it one after another, each price turning
 * to its new figure on reels the way a hand tally counter does, and the period — which has no
 * magnitude to report — simply leaves upward behind a mask while the new one arrives from below.
 *
 * An IIFE that self-inits on DOM ready and resolves `window.gsap` INSIDE that init, with no
 * top-level `export`: the catalog preview inlines the scripts of the package, an inline script
 * cannot defer, and a top-level `export` in a classic script is a silent parse error.
 */
(function () {
  function init() {
    var gsap = window.gsap;
    if (!gsap) return;

    /* ─────────────────────────────── the odometer ─────────────────────────────── */

    /* A figure built out of rolling reels, the way a hand tally counter is. Each digit is its own
       reel: a strip of 0–9 behind a one-line window, moved vertically so that exactly one digit
       shows. Three things make it read as one mechanism instead of several digits that happen to
       change together: every reel turns FORWARD (a counter has no reverse, so 9 to 1 passes 0);
       the lower reels turn further, so with a fixed duration the units cover three revolutions in
       the time the hundreds cover one, which is the gearing; and a reel whose digit does not
       change still turns a full revolution, because on a real counter it would have.
       The strip carries eleven cells, 0–9 then 0 again: the repeat is what makes the wrap
       invisible, because the modulo that snaps it back lands on an identical glyph. */

    var CELLS = 11;
    var SPAN = 100 / CELLS;
    var ROLL = 0.75;
    var FIGURE = /^(\D*)([\d.]+)(.*)$/;
    var WHOLE = /^(\D*)(\d+)(.*)$/;

    /* `digits` is how many the element will ever need to show, which is not always how many its
       own figure has — a card reading `$9` needs two if it will later roll to `$99`. Anything with
       a decimal point returns null and the caller keeps the plain text, which is the honest
       fallback: a fractional reel would need a fixed decimal column this design has no room for. */
    function createOdometer(el, digits) {
      var parts = WHOLE.exec((el.dataset.base || el.textContent || '').trim());
      if (!parts) return null;

      var prefix = parts[1];
      var figure = parts[2];
      var suffix = parts[3];
      var value = Number(figure);
      if (!isFinite(value) || digits < 1) return null;

      var wrap = document.createElement('span');
      wrap.className = 'odo';

      function label(text) {
        var span = document.createElement('span');
        span.textContent = text;
        return span;
      }

      if (prefix) wrap.append(label(prefix));

      /* Most significant first, so `reels[digits - 1]` is the units. */
      var strips = [];
      var reels = [];

      for (var i = 0; i < digits; i += 1) {
        var reel = document.createElement('span');
        reel.className = 'odo_reel';

        var strip = document.createElement('span');
        strip.className = 'odo_strip';
        for (var cell = 0; cell < CELLS; cell += 1) strip.append(label(String(cell % 10)));

        reel.append(strip);
        wrap.append(reel);
        reels.push(reel);
        strips.push(strip);
      }

      if (suffix) wrap.append(label(suffix));

      /* The whole figure is read out for assistive technology, which would otherwise be handed
         eleven digits per column. The reels are decoration of a number, not eleven numbers. */
      wrap.setAttribute('aria-hidden', 'true');
      var spoken = document.createElement('span');
      spoken.className = 'u-sr-only';
      spoken.textContent = prefix + figure + suffix;

      el.replaceChildren(wrap, spoken);

      /** Units are place 0. Returns the reel index for a place. */
      function at(place) { return digits - 1 - place; }
      /** A leading reel is blank until the figure is large enough to reach it. */
      function lit(v, place) { return place === 0 || v >= Math.pow(10, place); }

      function show(v) {
        for (var place = 0; place < digits; place += 1) {
          var i = at(place);
          gsap.set(strips[i], { yPercent: -(Math.floor(v / Math.pow(10, place)) % 10) * SPAN });
          var on = lit(v, place);
          gsap.set(reels[i], { opacity: on ? 1 : 0, width: on ? '1ch' : 0 });
        }
        spoken.textContent = prefix + String(v) + suffix;
      }

      function roll(from, to, tl, when) {
        if (from === to) return;

        for (var place = 0; place < digits; place += 1) {
          var i = at(place);
          var fromDigit = Math.floor(from / Math.pow(10, place)) % 10;
          var toDigit = Math.floor(to / Math.pow(10, place)) % 10;

          /* Forward to the target digit, plus whole revolutions on top. The units take the most
             and the leading reel the least, so with a fixed duration the reels move at the speeds
             a geared counter would give them. */
          var turns = digits - place;
          var distance = ((toDigit - fromDigit + 10) % 10) + 10 * turns;

          (function (strip, fromDigit, distance) {
            var spin = { at: fromDigit };
            tl.to(
              spin,
              {
                at: fromDigit + distance,
                duration: ROLL,
                /* Out, not inOut. A counter is a spring being released: it is at its fastest the
                   instant the button goes down, and what takes time is the settling. An ease-in
                   put the acceleration at the front, where it covered about a fortieth of the turn
                   in its first 100ms — the tween had started, but nothing looked like it had. */
                ease: 'power2.out',
                onUpdate: function () {
                  gsap.set(strip, { yPercent: -(spin.at % 10) * SPAN });
                },
              },
              when
            );
          })(strips[i], fromDigit, distance);

          /* A reel arriving or leaving takes the width with it, so the figure opens and closes
             around the digit it gains rather than having one appear in space that was already
             reserved. It arrives early in the turn and leaves late in it — in both directions,
             while the reels are moving fast enough that the width change is not what the eye is
             on. */
          var on = lit(to, place);
          if (on !== lit(from, place)) {
            tl.to(
              reels[i],
              { opacity: on ? 1 : 0, width: on ? '1ch' : 0, duration: ROLL * 0.4, ease: 'power2.out' },
              when + (on ? ROLL * 0.15 : ROLL * 0.45)
            );
          }
        }

        tl.call(function () {
          spoken.textContent = prefix + String(to) + suffix;
        }, undefined, when + ROLL);
      }

      show(value);

      return { value: value, show: show, roll: roll };
    }

    /* ───────────────────────────────── the switch ───────────────────────────────── */

    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

    /* The lozenge's journey, and the window the label's colour changes inside. */
    var SLIDE = 0.32;
    /* How long a single card takes once the change reaches it — the reels set it. */
    var COUNT = ROLL;
    /* How far into that turn the unit under the figure swaps. */
    var UNIT_AT = 0.6;
    /* Before the first card takes it. Just enough to put the lozenge first in the order — any
       longer and the wait stops reading as cause and effect and starts reading as the page being
       slow to answer. */
    var LEAD = 0.04;
    /* Between one card and the next. */
    var STEP = 0.06;
    /* Half the period's swap: out, then in. */
    var SWAP = 0.09;

    var groups = document.querySelectorAll('[data-tabs]');
    for (var g = 0; g < groups.length; g += 1) {
      wire(groups[g]);
    }

    function wire(group) {
      var tabs = Array.prototype.slice.call(group.querySelectorAll('[data-tab]'));
      var panels = Array.prototype.slice.call(group.querySelectorAll('[data-tab-panel]'));
      if (tabs.length < 2) return;

      var pill = group.querySelector('[data-tab-pill]');
      function pricesOf(panel) { return Array.prototype.slice.call(panel.querySelectorAll('[data-price]')); }
      function periodsOf(panel) { return Array.prototype.slice.call(panel.querySelectorAll('[data-period]')); }

      /* Each figure remembers the text it was authored with, so a panel can always be put back —
         including when a second click interrupts a count halfway. */
      for (var p = 0; p < panels.length; p += 1) {
        var cells = pricesOf(panels[p]).concat(periodsOf(panels[p]));
        for (var c = 0; c < cells.length; c += 1) {
          cells[c].dataset.base = (cells[c].textContent || '').trim();
        }
      }

      /* Every price becomes a column of reels. A card is built with as many as the largest figure
         it will ever show rather than as many as its own has: the one reading `$9` needs two,
         because it rolls to `$99`. */
      var odometers = new Map();

      for (var i = 0; i < pricesOf(panels[0]).length; i += 1) {
        var column = [];
        for (var q = 0; q < panels.length; q += 1) {
          var cell = pricesOf(panels[q])[i];
          if (cell) column.push(cell);
        }
        var digits = 0;
        for (var d = 0; d < column.length; d += 1) {
          var parts = FIGURE.exec(column[d].dataset.base || '');
          /* A fractional price would need a fixed decimal column, which this design has no room
             for — those keep the plain text and count. */
          if (parts && parts[2].indexOf('.') < 0) digits = Math.max(digits, parts[2].length);
        }
        if (!digits) continue;
        for (var e = 0; e < column.length; e += 1) {
          var odometer = createOdometer(column[e], digits);
          if (odometer) odometers.set(column[e], odometer);
        }
      }

      function reset(panel) {
        var prices = pricesOf(panel);
        for (var i = 0; i < prices.length; i += 1) {
          var odometer = odometers.get(prices[i]);
          if (odometer) odometer.show(odometer.value);
          else if (prices[i].dataset.base !== undefined) prices[i].textContent = prices[i].dataset.base;
        }
        var periods = periodsOf(panel);
        for (var j = 0; j < periods.length; j += 1) {
          if (periods[j].dataset.base !== undefined) periods[j].textContent = periods[j].dataset.base;
        }
        /* Named rather than `all`: `clearProps: 'all'` takes the whole style attribute, and with
           it any custom property set on the element. */
        gsap.set(periods, { clearProps: 'transform,opacity' });
      }

      var current = Math.max(0, tabs.findIndex(function (tab) { return tab.classList.contains('w--current'); }));
      var running = null;

      function markTabs(index, focus) {
        tabs.forEach(function (tab, i) {
          var on = i === index;
          tab.classList.toggle('w--current', on);
          tab.setAttribute('aria-selected', String(on));
          if (on) tab.removeAttribute('tabindex');
          else tab.setAttribute('tabindex', '-1');
          if (on && focus) tab.focus();
        });
      }

      function showPanel(index) {
        panels.forEach(function (panel, i) {
          var on = i === index;
          panel.classList.toggle('w--tab-active', on);
          panel.toggleAttribute('hidden', !on);
        });
      }

      function placePill(index) {
        if (!pill) return;
        var tab = tabs[index];
        gsap.set(pill, { x: tab.offsetLeft, width: tab.offsetWidth, scaleX: 1 });
      }

      if (pill) {
        placePill(current);
        /* Only now does the lozenge take over from the button's own background. */
        group.setAttribute('data-pill-ready', '');

        /* Re-measured whenever the buttons change size, which covers both a resize and the moment
           Inter arrives and the labels stop being measured in the fallback face. Skipped
           mid-flight, or it would drag the lozenge back. */
        if (window.ResizeObserver) {
          var observer = new ResizeObserver(function () {
            if (!running) placePill(current);
          });
          var menu = group.querySelector('.tabs_menu');
          if (menu) observer.observe(menu);
          for (var t = 0; t < tabs.length; t += 1) observer.observe(tabs[t]);
        }
      }

      function stop() {
        if (!running) return;
        running.kill();
        running = null;
        for (var i = 0; i < panels.length; i += 1) reset(panels[i]);
      }

      function select(index, focus) {
        if (index === current) return;

        stop();
        var outgoing = panels[current];
        var incoming = panels[index];

        current = index;
        markTabs(index, focus);
        showPanel(index);

        if (reduced.matches) {
          placePill(index);
          return;
        }

        var tl = gsap.timeline({
          onComplete: function () {
            running = null;
            reset(incoming);
          },
        });
        running = tl;

        if (pill) {
          var tab = tabs[index];
          tl.to(pill, { x: tab.offsetLeft, width: tab.offsetWidth, duration: SLIDE, ease: 'power3.inOut' }, 0)
            /* The stretch peaks mid-journey and is gone by the time it lands. */
            .to(pill, { scaleX: 1.06, duration: SLIDE / 2, ease: 'power2.out' }, 0)
            .to(pill, { scaleX: 1, duration: SLIDE / 2, ease: 'power2.in' }, SLIDE / 2);
        }

        var fromPrices = pricesOf(outgoing);
        pricesOf(incoming).forEach(function (el, i) {
          var odometer = odometers.get(el);
          var start = FIGURE.exec((fromPrices[i] && fromPrices[i].dataset.base) || '');
          if (!odometer || !start) return;

          var from = Number(start[2]);
          if (!isFinite(from)) return;

          /* Shown before the browser paints, so the panel opens on the outgoing figure rather than
             flashing its own and then rolling to it. */
          odometer.show(from);
          odometer.roll(from, odometer.value, tl, LEAD + i * STEP);
        });

        var fromPeriods = periodsOf(outgoing);
        periodsOf(incoming).forEach(function (el, i) {
          var base = el.dataset.base;
          var previous = (fromPeriods[i] && fromPeriods[i].dataset.base) || base;
          if (previous === base) return;

          el.textContent = previous;
          /* Late in the card's own turn, so the reels have nearly settled by the time the unit
             under them changes. */
          var out = LEAD + i * STEP + COUNT * UNIT_AT;
          tl.to(el, { yPercent: -100, opacity: 0, duration: SWAP, ease: 'power2.in' }, out)
            .set(el, { yPercent: 100, onComplete: function () { el.textContent = base; } }, out + SWAP)
            .to(el, { yPercent: 0, opacity: 1, duration: SWAP, ease: 'power3.out' }, out + SWAP);
        });
      }

      tabs.forEach(function (tab, i) {
        tab.addEventListener('click', function () { select(i, false); });
        tab.addEventListener('keydown', function (event) {
          var step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
          if (!step) return;
          event.preventDefault();
          select((i + step + tabs.length) % tabs.length, true);
        });
      });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

}).call(this, window.temlisScope ? window.temlisScope("nexio-641") : document);
