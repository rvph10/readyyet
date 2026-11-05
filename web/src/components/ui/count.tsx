// ADR 0063: a small count next to a heading or tab, soft grey, and lime on
// the current tab so the number of what's shown stands out.
export function Count({ value, current = false }: { value: number; current?: boolean }) {
  return (
    <span
      className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-label-xs tabular-nums ${
        current ? "bg-brand text-ink" : "bg-ink/8 text-muted"
      }`}
    >
      {value}
    </span>
  );
}
