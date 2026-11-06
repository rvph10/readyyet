import { Icon, type IconName } from "./ui/icon";

// The six tones of ADR 0042. Every operational Status not named here is work
// happening, so that's the fallback.
const RECEIVED = ["RECEIVED", "INSPECTING", "DIAGNOSING", "QUOTE_PREPARED"];
const WAITING = [
  "AWAITING_APPROVAL",
  "AWAITING_PARTS",
  "PARTS_ORDERED",
  "BACKORDERED",
  "AWAITING_CLIENT_INFO",
  "ON_HOLD",
];

export type StatusTone = "received" | "working" | "waiting" | "ready" | "completed" | "stopped";

export function statusTone(code: string): StatusTone {
  if (RECEIVED.includes(code)) return "received";
  if (WAITING.includes(code)) return "waiting";
  if (code === "READY") return "ready";
  if (code === "COMPLETED") return "completed";
  if (code === "CANCELLED" || code === "REJECTED") return "stopped";
  return "working";
}

export const toneIcons: Record<StatusTone, IconName> = {
  received: "inbox",
  working: "settings",
  waiting: "time",
  ready: "check",
  completed: "check",
  stopped: "ban",
};

// ADR 0087: a tint and an icon for the kind of state, so it reads at a glance
// and without colour. READY is the only lime.
const tints: Record<StatusTone, string> = {
  received: "bg-info-subtle text-info",
  working: "bg-pine-subtle text-pine",
  waiting: "bg-warning-subtle text-warning",
  ready: "bg-brand text-ink",
  completed: "bg-subtle text-muted",
  stopped: "bg-danger-subtle text-danger",
};

const dots: Record<StatusTone, string> = {
  received: "bg-status-received",
  working: "bg-status-working",
  waiting: "bg-status-waiting",
  ready: "bg-ink",
  completed: "bg-muted",
  stopped: "bg-status-stopped",
};

// The tracking page's marker beside its big Status.
export function statusDotClass(code: string) {
  return dots[statusTone(code)];
}

// A Ticket's Status, by its code for the colour and its translated label.
export function StatusPill({ code, label }: { code: string; label: string }) {
  const tone = statusTone(code);
  return (
    <span
      className={`inline-flex min-h-8 max-w-full items-center gap-1.5 rounded-xl px-2.5 py-1 text-label-xs font-semibold ${tints[tone]}`}
    >
      <Icon name={toneIcons[tone]} className="size-3 shrink-0" />
      <span title={label} className="min-w-0 truncate">
        {label}
      </span>
    </span>
  );
}
