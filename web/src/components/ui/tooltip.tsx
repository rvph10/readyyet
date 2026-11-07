"use client";

import { useEffect, useRef, type ReactNode } from "react";

const GAP = 8;

// A dark hint for its parent, the nearest button or link, shown on hover or
// keyboard focus. It's a popover, so the browser's top layer holds it: nothing
// on the page can cover or clip it, whatever is scrolling or stacked around its
// trigger. Placed through the CSSOM, which the CSP allows (ADR 0048). It stays
// over its trigger's own hover, and Escape hides it, as WCAG 1.4.13 asks (ADR
// 0057). A closed popover isn't read out, so its words are kept for the trigger's
// accessible name. A wide one wraps, for a sentence rather than a label.
export function Tooltip({ wide, children }: { wide?: boolean; children: ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const hint = ref.current!;
    const trigger = hint.parentElement!;
    const isOpen = () => hint.matches(":popover-open");

    function show() {
      if (!isOpen()) hint.showPopover();
      const box = trigger.getBoundingClientRect();
      const middle = box.left + box.width / 2;
      const room = document.documentElement.clientWidth - hint.offsetWidth - GAP;
      const left = Math.max(GAP, Math.min(middle - hint.offsetWidth / 2, room));
      const below = window.innerHeight - box.bottom >= hint.offsetHeight + GAP * 2;
      hint.dataset.side = below ? "below" : "above";
      hint.style.left = `${left}px`;
      hint.style.top = `${below ? box.bottom + GAP : box.top - hint.offsetHeight - GAP}px`;
      hint.style.setProperty("--arrow", `${middle - left}px`);
    }
    function hide() {
      if (isOpen()) hint.hidePopover();
    }
    function focused() {
      if (trigger.matches(":focus-visible")) show();
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") hide();
    }

    trigger.addEventListener("pointerenter", show);
    trigger.addEventListener("pointerleave", hide);
    trigger.addEventListener("focusin", focused);
    trigger.addEventListener("focusout", hide);
    document.addEventListener("keydown", escape);
    // It's fixed to the window, and would stay behind as its trigger scrolls.
    window.addEventListener("scroll", hide, { capture: true, passive: true });
    return () => {
      trigger.removeEventListener("pointerenter", show);
      trigger.removeEventListener("pointerleave", hide);
      trigger.removeEventListener("focusin", focused);
      trigger.removeEventListener("focusout", hide);
      document.removeEventListener("keydown", escape);
      window.removeEventListener("scroll", hide, { capture: true });
    };
  }, []);

  return (
    <>
      <span className="sr-only">{children}</span>
      <span
        ref={ref}
        popover="manual"
        aria-hidden="true"
        className={`pointer-events-none fixed inset-auto m-0 overflow-visible rounded-lg border-0 bg-ink px-2.5 py-1.5 text-surface after:absolute after:left-(--arrow) after:-translate-x-1/2 after:border-4 after:border-transparent data-[side=above]:after:top-full data-[side=above]:after:border-t-ink data-[side=below]:after:bottom-full data-[side=below]:after:border-b-ink ${wide ? "w-64 text-left text-p-xs" : "text-label-xs whitespace-nowrap"}`}
      >
        {children}
      </span>
    </>
  );
}
