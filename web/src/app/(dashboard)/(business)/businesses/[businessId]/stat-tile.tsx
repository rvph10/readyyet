import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";

// A figure, and on an inset sharing the tile's corners, the one thing it can't
// say by itself and what can be done about it.
export function StatTile({
  label,
  value,
  note,
  action,
}: {
  label: string;
  // Both null while they load (ADR 0119).
  value: ReactNode | null;
  note: string | null;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col justify-between gap-3 rounded-sheet border border-border bg-surface p-2">
      <div className="min-w-0 px-3 pt-3">
        <p className="text-label-sm">{label}</p>
        {value === null ? (
          <Skeleton className="mt-2 mb-1 h-8 w-48 max-w-full" />
        ) : (
          <p className="mt-1 text-title-h4 wrap-break-word tabular-nums">{value}</p>
        )}
      </div>
      <div className="flex flex-col gap-2.5 rounded-card bg-subtle p-3">
        {note === null ? (
          <Skeleton className="my-0.5 h-4 w-40 max-w-full" />
        ) : (
          <p title={note} className="truncate text-p-sm">
            {note}
          </p>
        )}
        {action}
      </div>
    </div>
  );
}
