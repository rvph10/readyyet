"use client";

import { useState } from "react";

// ADR 0053 and 0058: soft tints with a deep text of the same hue, and
// deep fills with white text, kept away from the lime and from the cyan,
// violet, orange and pink of the Status tones, so an avatar next to a Status
// pill never reads as one.
const colors = [
  "bg-blue-200 text-blue-900",
  "bg-indigo-200 text-indigo-900",
  "bg-teal-200 text-teal-900",
  "bg-emerald-200 text-emerald-900",
  "bg-green-200 text-green-900",
  "bg-amber-200 text-amber-900",
  "bg-slate-300 text-slate-900",
  "bg-blue-700 text-surface",
  "bg-indigo-700 text-surface",
  "bg-teal-700 text-surface",
  "bg-emerald-700 text-surface",
  "bg-slate-600 text-surface",
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

// FNV-1a over the id of the User or Business: the same colour on every
// screen and device, and it doesn't change when they're renamed.
export function avatarColor(id: string) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    hash = Math.imul(hash ^ id.charCodeAt(i), 0x01000193);
  }
  return colors[(hash >>> 0) % colors.length];
}

// ADR 0065: a circle for a User, a rounded square for a Business, so the two
// can't be taken for each other where both show, like on an invitation. The
// corners follow the size, about a quarter of its side.
const squares: Record<AvatarSize, string> = {
  xs: "rounded-md",
  sm: "rounded-lg",
  md: "rounded-xl",
  lg: "rounded-2xl",
  xl: "rounded-3xl",
};

interface Props {
  id: string;
  name: string;
  src: string | null;
  size?: AvatarSize;
  shape?: "circle" | "square";
  // For placing it, like a ring or overlap in a stack, not resizing it.
  className?: string;
}

// A User's picture or a Business's logo, or their initials in a colour of
// their own without one, or when it can't be loaded. Decorative: the name is
// always written next to it or in the text around it. A photo fills its
// circle, a logo sits whole inside its square, since logos have their own
// shapes and margins.
export function Avatar({ id, name, src, size = "md", shape = "circle", className }: Props) {
  const [failed, setFailed] = useState(false);
  const picture = src && !failed;
  const square = shape === "square";
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center overflow-hidden leading-none font-semibold select-none ${sizes[size]} ${square ? squares[size] : "rounded-full"} ${picture ? (square ? "border border-border bg-surface" : "bg-subtle") : avatarColor(id)} ${className ?? ""}`}
    >
      {picture ? (
        // Served by the API, already resized when uploaded (ADR 0026), so
        // next/image has nothing to add, and its style attribute is refused
        // by the Content-Security-Policy.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          width={80}
          height={80}
          onError={() => setFailed(true)}
          className={square ? "size-full object-contain p-[12%]" : "size-full object-cover"}
        />
      ) : (
        initials(name)
      )}
    </span>
  );
}
