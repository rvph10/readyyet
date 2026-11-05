// The six tones of ADR 0042, coloured by ADR 0061. Every operational Status
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

// ADR 0061: white pills whose dot carries the tone, so a list stays calm and
// READY, the only lime fill, is what stands out. COMPLETED is greyed, done.
const pills: Record<StatusTone, { pill: string; dot: string }> = {
  received: { pill: "border border-border bg-surface text-ink", dot: "bg-status-received" },
  working: { pill: "border border-border bg-surface text-ink", dot: "bg-status-working" },
  waiting: { pill: "border border-border bg-surface text-ink", dot: "bg-status-waiting" },
  ready: { pill: "border border-brand bg-brand text-ink", dot: "bg-ink" },
  completed: { pill: "border border-border bg-subtle text-muted", dot: "bg-muted" },
  stopped: { pill: "border border-border bg-surface text-ink", dot: "bg-status-stopped" },
};

export function statusDotClass(code: string) {
  return pills[statusTone(code)].dot;
}

// A Ticket's Status, by its code for the colour and its translated label.
export function StatusPill({ code, label }: { code: string; label: string }) {
  const { pill, dot } = pills[statusTone(code)];
  return (
    <span
      className={`inline-flex min-h-6 max-w-full items-center gap-1.5 rounded-xl py-0.5 pr-2.5 pl-2 text-label-xs ${pill}`}
    >
      <span aria-hidden="true" className={`size-1.5 shrink-0 rounded-full ${dot}`} />
      <span className="min-w-0 wrap-anywhere">{label}</span>
    </span>
  );
}
