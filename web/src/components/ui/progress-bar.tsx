// The browser's own <progress>, restyled: a width set per render would need
// an inline style, which the CSP refuses (ADR 0048).
export function ProgressBar({ value, max = 100, label }: { value: number; max?: number; label: string }) {
  return (
    <progress
      value={value}
      max={max}
      aria-label={label}
      className="block h-2 w-full appearance-none overflow-hidden rounded-full bg-border [&::-moz-progress-bar]:rounded-full [&::-moz-progress-bar]:bg-ink [&::-webkit-progress-bar]:bg-border [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-ink [&::-webkit-progress-value]:transition-[width]"
    />
  );
}
