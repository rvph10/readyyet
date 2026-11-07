// ADR 0087: a number next to a filter, lime on the pine of the current one.
export function Count({ value, current = false }: { value: number; current?: boolean }) {
  return <span className={`text-label-xs font-semibold ${current ? "text-brand" : "text-muted"}`}>{value}</span>;
}
