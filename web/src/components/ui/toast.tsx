"use client";

import { useTranslations } from "next-intl";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Icon, type IconName } from "./icon";

type Tone = "success" | "info" | "error";

interface ToastOptions {
  message: string;
  tone?: Tone;
  // One thing to do about it, like Undo, which also keeps it up longer.
  action?: { label: string; onClick: () => void };
}

interface ShownToast extends ToastOptions {
  id: number;
}

const icons: Record<Tone, { name: IconName; className: string }> = {
  success: { name: "check", className: "text-surface" },
  info: { name: "info", className: "text-surface/70" },
  error: { name: "info-triangle", className: "text-red-300" },
};

// Long enough to read a line, twice that to reach for its action.
const SHOWN_FOR_MS = 5000;
const SHOWN_WITH_ACTION_FOR_MS = 10000;
const MOST_SHOWN = 3;

const ToastContext = createContext<((options: ToastOptions) => void) | null>(null);

// Shows a toast from anywhere under ToastProvider.
export function useToast() {
  return useContext(ToastContext)!;
}

// ADR 0059: short confirmations of what just happened, at the bottom centre,
// near the thumb on a tablet. The list is a manual popover, so toasts show in
// the top layer, above an open dialog. A hidden popover isn't rendered, so
// screen readers hear the message from live regions that never leave the page.
export function ToastProvider({ children }: { children: ReactNode }) {
  const t = useTranslations("common");
  const region = useRef<HTMLElement>(null);
  const nextId = useRef(0);
  const [toasts, setToasts] = useState<ShownToast[]>([]);
  const latest = toasts.at(-1);

  const show = useCallback((options: ToastOptions) => {
    const id = nextId.current++;
    setToasts((shown) => [...shown, { ...options, id }].slice(-MOST_SHOWN));
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((shown) => shown.filter((toast) => toast.id !== id));
  }, []);

  // Shown again after each change, so a toast raised while a dialog is open
  // goes above it in the top layer.
  useEffect(() => {
    const popover = region.current!;
    if (popover.matches(":popover-open")) popover.hidePopover();
    if (toasts.length > 0) popover.showPopover();
  }, [toasts]);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <p aria-live="polite" className="sr-only">
        {latest && latest.tone !== "error" ? latest.message : ""}
      </p>
      <p aria-live="assertive" className="sr-only">
        {latest?.tone === "error" ? latest.message : ""}
      </p>
      <section
        ref={region}
        popover="manual"
        aria-label={t("notifications")}
        className="inset-x-0 top-auto bottom-4 m-0 mx-auto w-fit max-w-[calc(100%-2rem)] overflow-visible border-0 bg-transparent p-0"
      >
        <ol className="flex flex-col gap-2">
          {toasts.map((toast) => (
            <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} closeLabel={t("close")} />
          ))}
        </ol>
      </section>
    </ToastContext.Provider>
  );
}

function ToastItem({
  toast,
  onDismiss,
  closeLabel,
}: {
  toast: ShownToast;
  onDismiss: (id: number) => void;
  closeLabel: string;
}) {
  const [paused, setPaused] = useState(false);
  const icon = icons[toast.tone ?? "success"];

  // Held while the pointer or focus is on it, restarted in full after, so
  // nobody loses a toast they're reading or about to act on.
  useEffect(() => {
    if (paused) return;
    const timer = setTimeout(() => onDismiss(toast.id), toast.action ? SHOWN_WITH_ACTION_FOR_MS : SHOWN_FOR_MS);
    return () => clearTimeout(timer);
  }, [paused, toast, onDismiss]);

  return (
    <li
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="flex min-h-12 items-center gap-3 rounded-2xl bg-ink py-2 pr-2 pl-4 text-label-sm text-surface shadow-float motion-safe:transition motion-safe:starting:translate-y-2 motion-safe:starting:opacity-0"
    >
      <Icon name={icon.name} className={`size-3.5 shrink-0 ${icon.className}`} />
      <span className="min-w-0 flex-1 py-1">{toast.message}</span>
      {toast.action && (
        <button
          type="button"
          onClick={() => {
            toast.action!.onClick();
            onDismiss(toast.id);
          }}
          className="h-8 shrink-0 cursor-pointer rounded-full px-3 text-label-sm text-surface underline underline-offset-4 transition-colors hover:bg-surface/10"
        >
          {toast.action.label}
        </button>
      )}
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label={closeLabel}
        className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-surface/70 transition-colors hover:bg-surface/10 hover:text-surface"
      >
        <Icon name="close" className="size-3" />
      </button>
    </li>
  );
}
