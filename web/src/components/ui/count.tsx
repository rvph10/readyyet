// ADR 0049: a small outlined chip for a count next to a heading or tab.
export function Count({ value }: { value: number }) {
  return (
    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-border-strong px-1.5 text-label-xs text-muted tabular-nums">
      {value}
    </span>
  );
}
