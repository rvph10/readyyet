// A grey block where content is loading, sized by className. The loading
// region around it carries aria-busy, so screen readers skip these.
export function Skeleton({ className }: { className: string }) {
  return <div aria-hidden="true" className={`rounded-lg bg-ink/10 motion-safe:animate-pulse ${className}`} />;
}
