// The drawings in public/illustrations, in the palette of ADR 0087 (ADR 0093):
// line icons for empty states, scenes with people for the bigger moments. The
// -on-pine and -on-lime scenes are for those tiles, where others would disappear.
export type IllustrationName =
  | "box"
  | "chill"
  | "clock"
  | "coffee"
  | "done"
  | "images"
  | "inbox"
  | "messages"
  | "search"
  | "star"
  | "tag"
  | "user"
  | "analysing"
  | "balancing"
  | "carrying"
  | "chasing"
  | "chasing-on-pine"
  | "daily"
  | "figuring"
  | "helping"
  | "hurry"
  | "lost"
  | "overcoming"
  | "progress"
  | "progress-on-pine"
  | "talking"
  | "tired"
  | "trophy"
  | "trophy-on-lime"
  | "trophy-on-pine";

// Decorative, the words around it say the same. A plain img, as next/image's
// style attribute is refused by the Content-Security-Policy. className sizes it.
export function Illustration({ name, className }: { name: IllustrationName; className: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`/illustrations/${name}.svg`} alt="" aria-hidden="true" className={`select-none ${className}`} />
  );
}
