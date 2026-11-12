/*! Temlis · Three Steps With Layered Art · licensed to tmfp_4lwqw7vuod4ix5k5 · temlis.com/license */
/* Temlis — temlis-scope.js
 *
 * Lets each section's scripts see only their own section, so sections from
 * different Temlis families can share a page without animating, hiding or
 * resetting each other. Include it ONCE per page, before any section script.
 *
 * Every section script is wrapped like this:
 *   (function (document) { …the section's code… })
 *     .call(this, window.temlisScope ? window.temlisScope("healis-715") : document);
 * Inside, document.querySelector / querySelectorAll / getElementById /
 * getElementsByClassName / getElementsByTagName only search the section's
 * <div data-temlis="healis-715"> box. Everything else — events,
 * document.body, documentElement, fonts — is the real document.
 */
(function () {
  if (window.temlisScope) return;
  var scopes = {};
  var warned = false;
  var PAGE = /^\s*(html|body|:root)\s*$/i;

  window.temlisScope = function (scope) {
    if (scopes[scope]) return scopes[scope];
    var selector = '[data-temlis="' + scope + '"]';
    var boxes = function () { return document.querySelectorAll(selector); };
    // No box once the page has loaded: the markup lost its wrapper. Searching
    // the whole page beats a section whose scripts find nothing.
    var lost = function (list) {
      if (list.length || document.readyState === "loading") return false;
      if (!warned) { warned = true; console.warn('[temlis] no data-temlis="' + scope + '" box on the page: its scripts search the whole page.'); }
      return true;
    };
    var all = function (method, arg) {
      var list = boxes();
      if (lost(list)) return document[method](arg);
      if (list.length === 1) return list[0][method](arg);
      var out = [];
      for (var i = 0; i < list.length; i++) out.push.apply(out, list[i][method](arg));
      return out;
    };
    var own = {
      querySelectorAll: function (q) { return PAGE.test(q) ? document.querySelectorAll(q) : all("querySelectorAll", q); },
      querySelector: function (q) {
        if (PAGE.test(q)) return document.querySelector(q);
        var list = boxes();
        if (lost(list)) return document.querySelector(q);
        for (var i = 0; i < list.length; i++) { var hit = list[i].querySelector(q); if (hit) return hit; }
        return null;
      },
      getElementById: function (id) { return own.querySelector("#" + CSS.escape(id)); },
      getElementsByClassName: function (c) {
        var list = boxes();
        if (lost(list)) return document.getElementsByClassName(c);
        if (list.length === 1) return list[0].getElementsByClassName(c);
        return all("querySelectorAll", "." + String(c).trim().split(/\s+/).map(CSS.escape).join("."));
      },
      getElementsByTagName: function (t) { return PAGE.test(t) ? document.getElementsByTagName(t) : all("getElementsByTagName", t); },
      contains: function (node) {
        var list = boxes();
        if (lost(list)) return document.contains(node);
        for (var i = 0; i < list.length; i++) if (list[i].contains(node)) return true;
        return false;
      },
    };
    Object.defineProperty(own, "temlisRoot", { get: function () { return boxes()[0] || document.body; } });

    scopes[scope] = new Proxy(document, {
      get: function (target, key) {
        if (key in own) return own[key];
        var value = Reflect.get(target, key, target);
        return typeof value === "function" ? value.bind(target) : value;
      },
      set: function (target, key, value) { return Reflect.set(target, key, value, target); },
    });
    return scopes[scope];
  };
})();
