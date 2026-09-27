import { Check } from "lucide-react";
import Image, { type StaticImageData } from "next/image";
import logo from "../icon.svg";

// Next.js types *.svg imports as any, see layout.tsx.
const logoImage = logo as StaticImageData;

// Small drawings of the product for the tips on the sign-in picture, built
// from its own pieces so they stay sharp at any size and follow the page's
// language. Decorative: each tip's title and text already say it all.

// Bar widths of a made-up barcode, in px.
const BARS = [2, 1, 1, 3, 1, 2, 1, 1, 2, 3, 1, 1, 2];
const barWidth: Record<number, string> = { 1: "w-px", 2: "w-0.5", 3: "w-[3px]" };

function Tag({ number, className }: { number: string; className: string }) {
  return (
    <div
      className={`col-start-1 row-start-1 flex h-20 w-13 flex-col items-center gap-2 rounded-lg bg-surface px-1.5 py-2 shadow-float ${className}`}
    >
      <div className="h-1 w-full rounded-full bg-brand" />
      <div className="flex h-7 gap-px">
        {BARS.map((width, index) => (
          <span key={index} className={`${barWidth[width]} bg-ink`} />
        ))}
      </div>
      <span className="font-mono text-[0.5rem] leading-none text-ink">#{number}</span>
    </div>
  );
}

export function TagsIllustration() {
  return (
    <div aria-hidden="true" className="grid size-full place-items-center">
      <Tag number="1041" className="-translate-x-7 translate-y-1 -rotate-12 opacity-70" />
      <Tag number="1043" className="translate-x-7 translate-y-1 rotate-12 opacity-70" />
      <Tag number="1042" className="z-10" />
    </div>
  );
}

export function EmailIllustration({ now, title }: { now: string; title: string }) {
  return (
    <div aria-hidden="true" className="grid size-full place-items-center">
      <div className="col-start-1 row-start-1 h-12 w-28 translate-y-4 rounded-xl bg-surface/50" />
      <div className="z-10 col-start-1 row-start-1 flex w-32 flex-col gap-1 rounded-xl bg-surface p-2 text-ink shadow-float">
        <div className="flex items-center gap-1">
          <Image src={logoImage} alt="" className="size-3.5" />
          <span className="text-[0.5rem] font-semibold">ReadyYet</span>
          <span className="ml-auto text-[0.5rem] text-muted">{now}</span>
        </div>
        <span className="text-[0.625rem] leading-tight font-semibold">{title}</span>
        <div className="h-1 w-full rounded-full bg-subtle" />
        <div className="h-1 w-2/3 rounded-full bg-subtle" />
      </div>
    </div>
  );
}

export function WorkflowIllustration({ steps }: { steps: [string, string, string] }) {
  const [received, working, ready] = steps;
  return (
    <div aria-hidden="true" className="grid size-full place-items-center">
      <div className="relative flex flex-col gap-2">
        <div className="absolute top-2 bottom-3 left-[0.1875rem] w-px bg-surface/30" />
        <div className="flex items-center gap-2">
          <span className="z-10 size-2 rounded-full bg-surface/70" />
          <span className="rounded-full bg-subtle px-2 py-0.5 text-[0.5625rem] font-medium text-olive-700">
            {received}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="z-10 size-2 rounded-full bg-surface/70" />
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[0.5625rem] font-medium text-blue-700">
            {working}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="z-10 size-2 rounded-full bg-brand ring-2 ring-brand/30" />
          <span className="flex items-center gap-1 rounded-full bg-brand px-2.5 py-1 text-[0.6875rem] font-semibold text-ink shadow-float">
            <Check aria-hidden="true" strokeWidth={2.5} className="size-3" />
            {ready}
          </span>
        </div>
      </div>
    </div>
  );
}

// Where each avatar sits in the collage, largest first.
const AVATARS = [
  { initials: "ML", className: "top-1/2 left-1/2 z-10 size-12 -translate-1/2 bg-brand text-ink text-[0.75rem]" },
  { initials: "TD", className: "top-2 left-3 size-9 bg-blue-50 text-blue-700 text-[0.625rem]" },
  { initials: "AE", className: "right-3 bottom-2 size-9 bg-amber-50 text-amber-800 text-[0.625rem]" },
  { initials: "SL", className: "top-3 right-5 size-7 bg-surface text-ink text-[0.5625rem]" },
  { initials: "CM", className: "bottom-3 left-6 size-7 bg-subtle text-olive-700 text-[0.5625rem]" },
];

export function TeamIllustration() {
  return (
    <div aria-hidden="true" className="relative size-full">
      {AVATARS.map(({ initials, className }) => (
        <span
          key={initials}
          className={`absolute flex items-center justify-center rounded-full font-semibold ring-2 ring-ink/40 ${className}`}
        >
          {initials}
        </span>
      ))}
      <span className="absolute right-1.5 bottom-10 flex size-6 items-center justify-center rounded-full bg-ink text-[0.5rem] font-semibold text-surface ring-2 ring-surface/30">
        +3
      </span>
    </div>
  );
}
