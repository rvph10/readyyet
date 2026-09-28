// The six tones of ADR 0042, coloured by ADR 0054. Every operational Status
// not named here is work happening, so that's the fallback.
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

const fills: Record<StatusTone, string> = {
  received: "bg-status-received text-ink",
  working: "bg-status-working text-ink",
  waiting: "bg-status-waiting text-ink",
  ready: "bg-brand text-ink",
  completed: "border border-border-strong bg-surface text-muted",
  stopped: "bg-status-stopped text-ink",
};

// A Ticket's Status, by its code for the colour and its translated label.
export function StatusPill({ code, label }: { code: string; label: string }) {
  return (
    <span
      className={`inline-flex h-6 items-center gap-1.5 rounded-full pr-2.5 pl-2 text-label-xs whitespace-nowrap ${fills[statusTone(code)]}`}
    >
      <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-current" />
      {label}
    </span>
  );
}
