"use client";

import { useTranslations } from "next-intl";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Button } from "./button";
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
  leaving: boolean;
}

const icons: Record<Tone, { name: IconName; className: string }> = {
  success: { name: "check", className: "bg-success-subtle text-success" },
  info: { name: "info", className: "bg-info-subtle text-info" },
  error: { name: "info-triangle", className: "bg-danger-subtle text-danger" },
};

// A confirmation is read at a glance, an error needs longer, and an action
// needs time to reach for.
const durations: Record<Tone, number> = { success: 4000, info: 4000, error: 7000 };
const WITH_ACTION_MS = 10000;
const MOST_SHOWN = 3;
// How the stack fans out behind the newest toast, and how far apart the
// toasts sit when it opens.
const PEEK_PX = 10;
const SCALE_STEP = 0.05;
const GAP_PX = 8;
const LEAVE_MS = 200;

const ToastContext = createContext<((options: ToastOptions) => void) | null>(null);

// Shows a toast from anywhere under ToastProvider.
export function useToast() {
  return useContext(ToastContext)!;
}

// ADR 0060: Sonner's stack, built here because Sonner places each toast
// with a style attribute, which the CSP refuses (ADR 0048). Positions are
// set through the CSSOM instead. The newest toast is in front with the older
// ones peeking above it, and the stack opens while the pointer or focus is on
// it, which also holds every timer. The list is a manual popover, so toasts
// show in the top layer, above an open dialog. Screen readers hear the
// message from live regions outside it, which re-showing the popover can't
// interrupt.
export function ToastProvider({ children }: { children: ReactNode }) {
  const t = useTranslations("common");
  const region = useRef<HTMLElement>(null);
  const list = useRef<HTMLOListElement>(null);
  const nextId = useRef(0);
  const [toasts, setToasts] = useState<ShownToast[]>([]);
  const [heights, setHeights] = useState<Record<number, number>>({});
  const [expanded, setExpanded] = useState(false);

  const show = useCallback((options: ToastOptions) => {
    const id = nextId.current++;
    // Closing the last toast hides the region without a pointerleave, so
    // whether the stack is open is read again from where the pointer and
    // focus really are.
    const popover = region.current!;
    setExpanded(popover.matches(":hover") || popover.contains(document.activeElement));
    setToasts((shown) => [...shown, { ...options, id, leaving: false }].slice(-MOST_SHOWN));
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((shown) => shown.map((toast) => (toast.id === id ? { ...toast, leaving: true } : toast)));
    setTimeout(() => setToasts((shown) => shown.filter((toast) => toast.id !== id)), LEAVE_MS);
  }, []);

  const measure = useCallback((id: number, height: number) => {
    setHeights((known) => (known[id] === height ? known : { ...known, [id]: height }));
  }, []);

  // Always open, empty and without size when there's nothing to show, so a
  // toast is measured in place as it arrives. Shown again on each change so
  // a toast raised while a dialog is open goes above it in the top layer.
  const count = toasts.length;
  useEffect(() => {
    const popover = region.current!;
    if (popover.matches(":popover-open")) popover.hidePopover();
    popover.showPopover();
  }, [count]);

  // Newest first, each placed by what's in front of it.
  const stack = toasts.filter((toast) => !toast.leaving).reverse();
  const frontHeight = heights[stack[0]?.id] ?? 0;
  const openHeight = stack.reduce((sum, toast) => sum + (heights[toast.id] ?? 0), 0) + GAP_PX * (stack.length - 1);

  useLayoutEffect(() => {
    list.current!.style.height = `${expanded ? openHeight : frontHeight}px`;
  }, [expanded, openHeight, frontHeight]);

  const latest = toasts.at(-1);
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
        onPointerEnter={() => setExpanded(true)}
        onPointerLeave={() => setExpanded(false)}
        onFocus={() => setExpanded(true)}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setExpanded(false);
        }}
        className="inset-x-0 top-auto bottom-4 m-0 mx-auto w-[min(24rem,calc(100vw-2rem))] overflow-visible border-0 bg-transparent p-0"
      >
        <ol ref={list} className="relative motion-safe:transition-[height] motion-safe:duration-300">
          {toasts.map((toast) => {
            const index = stack.indexOf(toast);
            const offset = stack.slice(0, index).reduce((sum, ahead) => sum + (heights[ahead.id] ?? 0) + GAP_PX, 0);
            return (
              <ToastItem
                key={toast.id}
                toast={toast}
                index={index}
                offset={offset}
                frontHeight={frontHeight}
                expanded={expanded}
                onDismiss={dismiss}
                onMeasure={measure}
                closeLabel={t("close")}
              />
            );
          })}
        </ol>
      </section>
    </ToastContext.Provider>
  );
}

interface ItemProps {
  toast: ShownToast;
  // 0 for the newest, -1 while it leaves.
  index: number;
  offset: number;
  frontHeight: number;
  expanded: boolean;
  onDismiss: (id: number) => void;
  onMeasure: (id: number, height: number) => void;
  closeLabel: string;
}

function ToastItem({ toast, index, offset, frontHeight, expanded, onDismiss, onMeasure, closeLabel }: ItemProps) {
  const item = useRef<HTMLLIElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const entered = useRef(false);
  const tone = toast.tone ?? "success";
  const icon = icons[tone];
  const front = index === 0;

  // Measured once at once, then again whenever the text rewraps.
  useLayoutEffect(() => {
    const report = () => onMeasure(toast.id, content.current!.offsetHeight);
    report();
    const observer = new ResizeObserver(report);
    observer.observe(content.current!);
    return () => observer.disconnect();
  }, [toast.id, onMeasure]);

  // Counts down only while the stack is closed, keeping what's left of its
  // time when it opens.
  const remaining = useRef(toast.action ? WITH_ACTION_MS : durations[tone]);
  useEffect(() => {
    if (expanded || toast.leaving) return;
    const started = Date.now();
    const timer = setTimeout(() => onDismiss(toast.id), remaining.current);
    return () => {
      clearTimeout(timer);
      remaining.current -= Date.now() - started;
    };
  }, [expanded, toast.leaving, toast.id, onDismiss]);

  useLayoutEffect(() => {
    const style = item.current!.style;
    // Placed below and faded out first, with a reflow in between, so it
    // slides in from there rather than appearing in place.
    if (!entered.current) {
      style.transform = "translateY(24px)";
      style.opacity = "0";
      void item.current!.offsetHeight;
      entered.current = true;
    }
    const hidden = toast.leaving || index >= MOST_SHOWN;
    const y = toast.leaving ? 16 : expanded ? -offset : -index * PEEK_PX;
    const scale = expanded ? 1 : 1 - Math.max(index, 0) * SCALE_STEP;
    style.transform = `translateY(${y}px) scale(${scale})`;
    style.opacity = hidden ? "0" : "1";
    style.zIndex = String(MOST_SHOWN - index);
    style.height = expanded || front || !frontHeight ? "" : `${frontHeight}px`;
  }, [toast.leaving, index, offset, expanded, front, frontHeight]);

  return (
    <li
      ref={item}
      className="absolute inset-x-0 bottom-0 origin-bottom overflow-hidden rounded-2xl border border-border bg-surface text-ink shadow-float motion-safe:transition-[transform,opacity,height] motion-safe:duration-300 motion-safe:ease-out"
    >
      <div
        ref={content}
        className={`flex items-start gap-3 p-3 transition-opacity ${expanded || front ? "opacity-100" : "opacity-0"}`}
      >
        <span className={`flex size-6 shrink-0 items-center justify-center rounded-full ${icon.className}`}>
          <Icon name={icon.name} className="size-3" />
        </span>
        <p className="min-w-0 flex-1 pt-0.5 text-label-sm">{toast.message}</p>
        {toast.action && (
          <Button
            size="sm"
            onClick={() => {
              toast.action!.onClick();
              onDismiss(toast.id);
            }}
          >
            {toast.action.label}
          </Button>
        )}
        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          aria-label={closeLabel}
          className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted transition-colors hover:bg-subtle hover:text-ink"
        >
          <Icon name="close" className="size-3" />
        </button>
      </div>
    </li>
  );
}
