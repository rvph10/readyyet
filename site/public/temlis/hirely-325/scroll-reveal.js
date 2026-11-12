/*! Temlis · Hirely Call to Action · licensed to tmfp_abvkdjg4m5jh437s · temlis.com/license */
// Temlis: this script only sees its own section (see temlis-scope.js).
(function (document) {
/* Hirely — shared scroll-reveal engine. Port of scroll-reveal.ts to a plain
   global (no `export`, self-init — Rule 1). Expects window.gsap + window.ScrollTrigger
   from CDN. The `.scroll-animation` grow-in workhorse (opacity 0 + scale .85 -> 1,
   .8s power3.out, start top 88%, once) + the Solutions feature assets pop, CTA
   width-grow images, and Services feature-card per-card reveal. Start-states set
   in JS (never inline) so a missing/failed script leaves content visible.
   Owns clearing the `html.has-js` first-paint guard. Honors prefers-reduced-motion. */
(function () {
  if (typeof gsap === 'undefined') return; // fail-safe: no JS -> content stays visible
  if (typeof ScrollTrigger !== 'undefined') gsap.registerPlugin(ScrollTrigger);

  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Clear the inline first-paint guard so nothing is ever stuck at opacity:0.
  function clearGuard() {
    document.documentElement.classList.remove('has-js');
  }

  function initReveals() {
    var els = document.querySelectorAll('.scroll-animation');

    if (REDUCED) {
      gsap.set(els, { clearProps: 'opacity,transform' });
      clearGuard();
      return;
    }

    els.forEach(function (el) {
      gsap.set(el, { opacity: 0, scale: 0.85, transformOrigin: 'center center' });
    });

    clearGuard();

    var growIn = function (el) {
      gsap.to(el, {
        opacity: 1,
        scale: 1,
        duration: 0.8,
        ease: 'power3.out',
        onComplete: function () { gsap.set(el, { clearProps: 'transform' }); },
      });
    };

    // Max reachable scroll position for this page. In a standalone card the page
    // is often barely taller than the viewport, so an element near the bottom can
    // NEVER cross its `top 88%` start line by scrolling — it would stay stuck at
    // opacity:0. Reveal immediately any element that is already in view OR that
    // would become visible at maximum scroll; ScrollTrigger handles the rest.
    var maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

    els.forEach(function (el) {
      var topAtMaxScroll = el.getBoundingClientRect().top - maxScroll;
      if (topAtMaxScroll < window.innerHeight * 0.95) {
        growIn(el);
        return;
      }
      ScrollTrigger.create({
        trigger: el,
        start: 'top 88%',
        once: true,
        onEnter: function () { growIn(el); },
      });
    });

    if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
  }

  // Solutions feature svg assets — `.thumb-img` / `.picture-img` scale-pop 0->1,
  // .5s inOutCubic, when `.features_description` enters view.
  function initFeatureAssets() {
    document.querySelectorAll('.features_description').forEach(function (block) {
      var assets = block.querySelectorAll('.thumb-img, .picture-img');
      if (!assets.length) return;

      if (REDUCED) { gsap.set(assets, { clearProps: 'transform' }); return; }

      gsap.set(assets, { scale: 0, transformOrigin: 'center center' });
      ScrollTrigger.create({
        trigger: block,
        start: 'top 88%',
        once: true,
        onEnter: function () { gsap.to(assets, { scale: 1, duration: 0.5, ease: 'power2.inOut' }); },
      });
    });
  }

  // CTA heading images — `.cta_img` SVGs grow width 0->natural, .7s inOutCubic.
  function initCtaImages() {
    document.querySelectorAll('.cta_header').forEach(function (block) {
      var imgs = block.querySelectorAll('.cta_img');
      if (!imgs.length) return;

      if (REDUCED) { gsap.set(imgs, { clearProps: 'width' }); return; }

      imgs.forEach(function (img) {
        var natural = getComputedStyle(img).width;
        gsap.set(img, { width: 0 });
        // ReadyYet: opens once its row has risen (lib/motion/reveal.ts), on the
        // home page's shared curve.
        ScrollTrigger.create({
          trigger: block,
          start: 'top 85%',
          once: true,
          onEnter: function () {
            gsap.to(img, {
              width: natural,
              duration: 0.9,
              delay: 0.35,
              ease: 'reveal',
              onComplete: function () { gsap.set(img, { clearProps: 'width' }); },
            });
          },
        });
      });
    });
  }

  // Services feature cards — per-card reveal: `.feature_content` scale 0->1 +
  // `.feature_img` opacity 0->1 from yPercent 100, both .4s power3.out.
  function initFeatureCards() {
    document.querySelectorAll('.feature_card').forEach(function (card) {
      var content = card.querySelector('.feature_content');
      var img = card.querySelector('.feature_img');
      if (!content && !img) return;
      if (REDUCED) return;

      if (content) gsap.set(content, { scale: 0, transformOrigin: 'center center' });
      if (img) gsap.set(img, { opacity: 0, yPercent: 100 });

      ScrollTrigger.create({
        trigger: card,
        start: 'top 85%',
        once: true,
        onEnter: function () {
          if (content)
            gsap.to(content, {
              scale: 1, duration: 0.4, ease: 'power3.out',
              onComplete: function () { gsap.set(content, { clearProps: 'all' }); },
            });
          if (img)
            gsap.to(img, {
              opacity: 1, yPercent: 0, duration: 0.4, ease: 'power3.out',
              onComplete: function () { gsap.set(img, { clearProps: 'all' }); },
            });
        },
      });
    });
  }

  function init() {
    initReveals();
    initFeatureAssets();
    initCtaImages();
    initFeatureCards();
    if (typeof ScrollTrigger !== 'undefined') {
      window.addEventListener('load', function () { ScrollTrigger.refresh(); });
    }
  }

  if (document.readyState !== 'loading') init();
  else document.addEventListener('DOMContentLoaded', init);
})();

}).call(this, window.temlisScope ? window.temlisScope("hirely-325") : document);
