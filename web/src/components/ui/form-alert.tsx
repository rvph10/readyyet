import type { ReactNode } from "react";
import { Icon, type IconName } from "./icon";

type Tone = "error" | "success" | "info";

// ADR 0057: only an error is coloured. Success and info stay neutral, so red
// and the Status tones are the only colours that ask for attention.
const tones: Record<Tone, { className: string; icon: IconName }> = {
  error: { className: "bg-danger-subtle text-danger", icon: "info-triangle" },
  success: { className: "bg-subtle text-ink", icon: "check" },
  info: { className: "bg-subtle text-muted", icon: "info" },
};

// A message about the whole form rather than one field (the API unreachable,
// too many attempts, a code sent), shown at the top of its fields (ADR 0049).
// An error interrupts a screen reader, the others wait their turn.
export function FormAlert({ tone = "error", children }: { tone?: Tone; children: ReactNode }) {
  const { className, icon } = tones[tone];
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={`flex gap-2 rounded-xl px-3.5 py-3 text-p-sm ${className}`}
    >
      <Icon name={icon} className="mt-1 size-3.5 shrink-0" />
      {children}
    </p>
  );
}
