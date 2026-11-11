/*! Temlis · Two Column Accordion FAQ · licensed to tmfp_mknnhtwkzzko32vs · temlis.com/license */
// Temlis: this script only sees its own section (see temlis-scope.js).
(function (document) {
// Strivo — shared behaviour, ported from src/lib/offer.ts + reveal.ts.
// Plain global script (no `export`): it self-initialises on DOM ready, because the catalog
// preview inlines it and an inline script cannot defer.
(function () {
  function offer() {
    // Carries the visitor's ad parameters onto every [data-offer] link and reports
    // [data-track] clicks to whichever of GTM, Meta Pixel and GA4 is loaded.
    const CARRIED = /^(utm_[a-z]+|fbclid|gclid|gbraid|wbraid|ttclid|msclkid|twclid|li_fat_id)$/
    const w = window

    const carried = [...new URLSearchParams(location.search)].filter(([key]) => CARRIED.test(key))
    if (carried.length) {
      document.querySelectorAll("a[data-offer]").forEach((link) => {
        const url = new URL(link.href, location.href)
        for (const [key, value] of carried) {
          if (!url.searchParams.has(key)) url.searchParams.set(key, value)
        }
        link.href = url.toString()
      })
    }

    document.addEventListener("click", (event) => {
      const cta = event.target?.closest?.("[data-track]")?.dataset.track
      if (!cta) return
      if (Array.isArray(w.dataLayer)) w.dataLayer.push({ event: "cta_click", cta })
      w.fbq?.("trackCustom", "CTAClick", { cta })
      w.gtag?.("event", "cta_click", { cta })
    })
  }

  // Headings, labels and paragraphs marked `data-reveal` come in the first time they scroll into
  // view. A heading marked `data-reveal="lines"` rises line by line from behind its own baseline;
  // everything else lifts in, one after the other. Only content still below the fold is armed.
  function splitLines(el) {
    const text = el.textContent?.trim() ?? ""
    el.dataset.text = text
    el.textContent = ""
    // Split on ordinary spaces only: a no-break space keeps its two words
    // together here too, so the lines match the text once it is restored.
    const words = text.split(/[ \t\r\n]+/).map((word, i, all) => {
      const span = document.createElement("span")
      span.textContent = word
      el.append(span)
      if (i < all.length - 1) el.append(" ")
      return span
    })

    const lines = []
    let top = Number.NaN
    for (const word of words) {
      if (!(Math.abs(word.offsetTop - top) < 3)) {
        lines.push([])
        top = word.offsetTop
      }
      lines[lines.length - 1].push(word.textContent ?? "")
    }

    el.textContent = ""
    lines.forEach((line, i) => {
      const mask = document.createElement("span")
      mask.className = "reveal-line"
      const inner = document.createElement("span")
      inner.className = "reveal-line__text"
      inner.style.setProperty("--line", String(i))
      inner.textContent = line.join(" ")
      mask.append(inner)
      el.append(mask)
    })
    return lines.length
  }

  function restore(el) {
    el.textContent = el.dataset.text ?? el.textContent
    delete el.dataset.text
    el.removeAttribute("data-armed")
    el.classList.remove("is-in")
  }

  function reveal() {
    const wantsMotion = matchMedia("(prefers-reduced-motion: no-preference)").matches
    if (!wantsMotion || !("IntersectionObserver" in window)) return

    const items = [...document.querySelectorAll("[data-reveal]")].filter((el) => el.getBoundingClientRect().top > innerHeight)

    const io = new IntersectionObserver(
      (entries) => {
        let order = 0
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const el = entry.target
          io.unobserve(el)
          const delay = order++ * 120
          el.style.setProperty("--reveal-delay", `${delay}ms`)
          if (el.dataset.reveal === "lines") {
            const count = splitLines(el)
            setTimeout(() => restore(el), delay + 1100 + count * 90)
          }
          requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("is-in")))
        }
      },
      { rootMargin: "0px 0px -12% 0px" },
    )

    items.forEach((el) => {
      el.setAttribute("data-armed", "")
      io.observe(el)
    })
  }

  function init() {
    offer()
    reveal()
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init)
  else init()
})()

}).call(this, window.temlisScope ? window.temlisScope("strivo-833") : document);
