import type { ReactNode } from "react";

const tones = {
  plain: { tile: "border border-border bg-surface", note: "bg-subtle" },
  // Lit when there's something to act on (ADR 0092's rule for the picker).
  brand: { tile: "bg-brand", note: "bg-ink/8" },
  danger: { tile: "bg-danger-subtle text-danger", note: "bg-danger/10" },
};

// A figure, and under it the one thing it can't say by itself, on an inset
// sharing the tile's corners.
export function StatTile({
  label,
  value,
  note,
  tone = "plain",
}: {
  label: string;
  value: ReactNode;
  note: string;
  tone?: keyof typeof tones;
}) {
  return (
    <div className={`flex min-w-0 flex-col justify-between gap-3 rounded-sheet p-2 ${tones[tone].tile}`}>
      <div className="min-w-0 px-3 pt-3">
        <p className="text-label-sm">{label}</p>
        <p className="mt-1 text-title-h4 wrap-break-word tabular-nums">{value}</p>
      </div>
      <p title={note} className={`truncate rounded-card px-3 py-2 text-p-xs ${tones[tone].note}`}>
        {note}
      </p>
    </div>
  );
}
