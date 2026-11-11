# 0133: Sales site built on the Ledger template

Date: 2026-11-11

Replaces ADR 0044's choice of fonts for the site, and the site's use of ADR 0049's type scale. The rest of ADR 0044 stands.

## Decision

The sales site's home is built on **Ledger**, a paid landing page template (Astro and GSAP) bought through Temlis. Its hero is kept as the template has it: a phone on a gridded mat that the camera zooms and pans over as the visitor scrolls, the screen playing a short story, cards floating out of it, and the call to action bursting into a full-screen panel. The sections Ledger lacks come from other Temlis templates, installed with their real code: how it works (Payable), trades (Lumoras), pricing (Miros) and FAQ (Strivo). Ledger's own about, features and call to action sections come the same way.

**Ported, not rewritten.** Each section keeps the template's markup, class names and CSS, and its script runs unchanged from a React effect. Each Temlis section keeps its `data-temlis` wrapper, and is brought to Ledger's look by overriding its variables and rules on that wrapper, in one place, never by editing its own rules. The page then reads as one site: Ledger's fonts, buttons, radii and spacing everywhere.

**ReadyYet's colours, Ledger's fonts.** Lime `#d6ff53` takes the place of Ledger's yellow and pine `#17423a` of its black. Headings and the ReadyYet wordmark are Momo Trust Display, the rest Inter, all self-hosted by `next/font` at build time, so no page asks a font server for anything. The site no longer uses Figtree and Geist.

**New dependencies**, pinned: `gsap` (with its ScrollTrigger, SplitText and CustomEase plugins, all free to use), which every animated section uses; `lenis`, Ledger's smooth scroll, which its scroll-driven timelines are tuned against; `swiper` for the trades slider, added with it.

**Links to the app** go to `NEXT_PUBLIC_APP_URL`, set per environment on Railway and read at build time.

## Why

The first home page, built from scratch on the dashboard's style, was flat and read like a dashboard: the user had it deleted. A sales page has to show the product moving before anyone reads a line, which is exactly what Ledger's phone does, and drawing and timing that again from nothing would take far longer for a worse result.

Keeping each template's code as it is keeps what was paid for: the timings, easings and responsive states are the template's work, and rewriting them into Tailwind or new components is where they would be lost. Scoping each section to its wrapper is what lets five families share one page without their rules colliding, and overriding in one place keeps the unification readable and undoable.

Lenis is a second scroll system on top of the browser's, which is usually worth avoiding. Ledger's hero is scrubbed by the scroll, and without the smoothing it judders on wheel ticks; the template was tuned with it, and reduced motion turns it off.

The hero's props (bank cards and coins) and its phone screen are the template's for now. They are replaced by ReadyYet's own artwork and the Customer's tracking page as it becomes available.
