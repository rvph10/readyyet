import Image from "next/image";

// ADR 0053: soft tints with a deep text of the same hue, kept away from the
// brand's lime and from violet so an avatar never reads as a Status or an
// accent.
const colors = [
  "bg-sky-200 text-sky-900",
  "bg-blue-200 text-blue-900",
  "bg-teal-200 text-teal-900",
  "bg-emerald-200 text-emerald-900",
  "bg-amber-200 text-amber-900",
  "bg-orange-200 text-orange-900",
  "bg-rose-200 text-rose-900",
  "bg-pink-200 text-pink-900",
];

// Font size about 40% of the circle, tighter as it grows.
const sizes = {
  xs: "size-6 text-[0.625rem]",
  sm: "size-8 text-xs",
  md: "size-10 text-[0.9375rem]",
  lg: "size-14 text-xl tracking-tight",
  xl: "size-20 text-[1.75rem] tracking-tight",
};

export type AvatarSize = keyof typeof sizes;

// The first letters of the first and last words, so "Lucas Van den Berg"
// is LB. Array.from keeps a letter outside the BMP whole.
export function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters = words.length > 1 ? [words[0], words[words.length - 1]] : words;
  return letters.map((word) => Array.from(word)[0].toLocaleUpperCase()).join("");
}

// FNV-1a over the User's id: the same colour on every screen and device, and
// it doesn't change when they rename themselves.
export function avatarColor(id: string) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    hash = Math.imul(hash ^ id.charCodeAt(i), 0x01000193);
  }
  return colors[(hash >>> 0) % colors.length];
}

interface Props {
  id: string;
  name: string;
  src: string | null;
  size?: AvatarSize;
  // For placing it, like a ring or overlap in a stack, not resizing it.
  className?: string;
}

// A User's picture, or their initials without one. Decorative: their name
// is always written next to it or in the text around it.
export function Avatar({ id, name, src, size = "md", className }: Props) {
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full leading-none font-semibold select-none ${sizes[size]} ${src ? "bg-subtle" : avatarColor(id)} ${className ?? ""}`}
    >
      {src ? (
        // Served by the API, already resized when uploaded (ADR 0026).
        <Image src={src} alt="" width={80} height={80} unoptimized className="size-full object-cover" />
      ) : (
        initials(name)
      )}
    </span>
  );
}
