import type { ReactNode } from "react";

// A figure, and on an inset sharing the tile's corners, the one thing it can't
// say by itself and what can be done about it.
export function StatTile({
  label,
  value,
  note,
  action,
}: {
  label: string;
  value: ReactNode;
  note: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col justify-between gap-3 rounded-sheet border border-border bg-surface p-2">
      <div className="min-w-0 px-3 pt-3">
        <p className="text-label-sm">{label}</p>
        <p className="mt-1 text-title-h4 wrap-break-word tabular-nums">{value}</p>
      </div>
      <div className="flex flex-col gap-2.5 rounded-card bg-subtle p-3">
        <p title={note} className="truncate text-p-sm">
          {note}
        </p>
        {action}
      </div>
    </div>
  );
}
