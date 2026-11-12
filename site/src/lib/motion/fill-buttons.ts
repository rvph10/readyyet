export function startFillButtons() {
  const hover = window.matchMedia("(min-width: 992px) and (hover: hover) and (pointer: fine)");

  document.querySelectorAll<HTMLElement>(".btn--fill").forEach((button) => {
    const overlay = button.querySelector<HTMLElement>(".btn__overlay");
    if (!overlay) return;

    const point = (event: PointerEvent) => {
      const width = button.offsetWidth;
      const height = button.offsetHeight;
      const x = Math.min(Math.max(event.offsetX, 0), width);
      const y = Math.min(Math.max(event.offsetY, 0), height);
      return { x, y, r: Math.hypot(Math.max(x, width - x), Math.max(y, height - y)) + 1 };
    };

    const place = ({ x, y }: { x: number; y: number }) => {
      overlay.style.setProperty("--fill-x", `${x}px`);
      overlay.style.setProperty("--fill-y", `${y}px`);
    };

    button.addEventListener("pointerenter", (event) => {
      if (!hover.matches) return;
      const target = point(event);
      place(target);
      overlay.style.setProperty("--fill-r", `${target.r}px`);
    });

    button.addEventListener("pointerleave", (event) => {
      if (!hover.matches) return;
      const exit = point(event);
      const current = parseFloat(getComputedStyle(overlay).getPropertyValue("--fill-r")) || 0;
      const full = parseFloat(overlay.style.getPropertyValue("--fill-r")) || 0;

      if (full > 0 && current >= full - 0.5) {
        overlay.style.transition = "none";
        place(exit);
        overlay.style.setProperty("--fill-r", `${exit.r}px`);
        overlay.getBoundingClientRect();
        overlay.style.removeProperty("transition");
      }

      overlay.style.setProperty("--fill-r", "0px");
    });
  });
}
