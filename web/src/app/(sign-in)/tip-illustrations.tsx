import { Check } from "lucide-react";
import Image, { type StaticImageData } from "next/image";
import logo from "../icon.svg";

// Next.js types *.svg imports as any, see layout.tsx.
const logoImage = logo as StaticImageData;

// Small drawings of the product for the tips on the sign-in picture, built
// from its own pieces so they stay sharp at any size and follow the page's
// language. Each fills a column taller than its card, so it rises above the
// card's top edge. Decorative: each tip's title and text already say it all.

const QR_SIZE = 21;
const QR_CORNERS = [
  [0, 0],
  [QR_SIZE - 7, 0],
  [0, QR_SIZE - 7],
];

// A made-up QR code: a real one's three corner squares, each with its blank
// border, and a fixed scatter of dots between them.
function isQrDot(x: number, y: number) {
  const corner = QR_CORNERS.find(([cx, cy]) => x >= cx - 1 && x <= cx + 7 && y >= cy - 1 && y <= cy + 7);
  if (corner) {
    const dx = x - corner[0];
    const dy = y - corner[1];
    if (dx < 0 || dy < 0 || dx > 6 || dy > 6) {
      return false;
    }
    return Math.max(Math.abs(dx - 3), Math.abs(dy - 3)) !== 2;
  }
  let hash = Math.imul(x, 374761393) + Math.imul(y, 668265263);
  hash = Math.imul(hash ^ (hash >>> 13), 1274126177);
  return ((hash ^ (hash >>> 16)) >>> 0) % 100 < 45;
}

const QR_PATH = Array.from({ length: QR_SIZE * QR_SIZE }, (_, index) => [index % QR_SIZE, Math.floor(index / QR_SIZE)])
  .filter(([x, y]) => isQrDot(x, y))
  .map(([x, y]) => `M${x} ${y}h1v1h-1z`)
  .join("");

function Tag({ number, className }: { number: string; className: string }) {
  return (
    <div
      className={`col-start-1 row-start-1 flex h-36 w-20 origin-bottom flex-col items-center gap-3 rounded-xl px-2.5 pt-2.5 pb-3 shadow-float ${className}`}
    >
      {/* The hole a tag's string goes through. */}
      <div className="size-2 rounded-full bg-canvas ring-1 ring-border" />
      <svg viewBox={`0 0 ${QR_SIZE} ${QR_SIZE}`} shapeRendering="crispEdges" className="size-15">
        <path d={QR_PATH} className="fill-ink" />
      </svg>
      <span className="mt-auto font-mono text-[0.625rem] leading-none text-ink">#{number}</span>
    </div>
  );
}

export function TagsIllustration() {
  return (
    <div aria-hidden="true" className="grid size-full items-end justify-items-center">
      <Tag number="1041" className="-translate-x-6 -rotate-10 bg-subtle" />
      <Tag number="1043" className="translate-x-6 rotate-10 bg-subtle" />
      <Tag number="1042" className="relative z-10 bg-surface" />
    </div>
  );
}

export function EmailIllustration({ title, ready }: { title: string; ready: string }) {
  return (
    <div aria-hidden="true" className="grid size-full items-end justify-items-center">
      {/* The letter, half out of its envelope. */}
      <div className="col-start-1 row-start-1 mb-3 flex h-36 w-28 flex-col gap-2 rounded-xl bg-surface p-3 text-ink shadow-float">
        <Image src={logoImage} alt="" className="size-5" />
        <span className="text-[0.6875rem] leading-tight font-semibold">{title}</span>
        <span className="self-start rounded-full bg-brand px-1.5 py-0.5 text-[0.5625rem] font-medium">{ready}</span>
        <div className="h-1 w-full rounded-full bg-subtle" />
        <div className="h-1 w-2/3 rounded-full bg-subtle" />
      </div>
      <svg viewBox="0 0 136 64" className="z-10 col-start-1 row-start-1 w-34 drop-shadow-lg">
        <path d="M0 12 L68 44 L136 12 V56 a8 8 0 0 1 -8 8 H8 a8 8 0 0 1 -8 -8 Z" className="fill-surface" />
        <path d="M0 12 L68 44 L136 12" fill="none" strokeWidth="1.5" className="stroke-border" />
      </svg>
    </div>
  );
}

interface Statuses {
  received: string;
  working: string;
  ready: string;
}

export function WorkflowIllustration({ received, working, ready }: Statuses) {
  const steps = [
    { label: received, tone: "bg-subtle text-olive-700" },
    { label: working, tone: "bg-blue-50 text-blue-700" },
  ];
  return (
    <div aria-hidden="true" className="flex size-full flex-col-reverse items-center justify-start">
      {steps.map((step) => (
        <div key={step.label} className="flex flex-col-reverse items-center">
          <div className="flex h-9 w-28 items-center gap-2 rounded-full bg-surface px-3 shadow-float">
            <Check strokeWidth={2.5} className="size-3.5 text-muted" />
            <span className={`rounded-full px-2 py-0.5 text-[0.625rem] font-medium ${step.tone}`}>{step.label}</span>
          </div>
          <div className="h-4 w-px border-l border-dashed border-surface/60" />
        </div>
      ))}
      <div className="flex h-12 w-32 items-center gap-2 rounded-full bg-brand px-3 text-ink shadow-float">
        <span className="flex size-6 items-center justify-center rounded-full bg-ink">
          <Check strokeWidth={3} className="size-3.5 text-brand" />
        </span>
        <span className="text-label-sm">{ready}</span>
      </div>
    </div>
  );
}

// Initials stand in for profile pictures, each on a tone of ADR 0042.
const TEAM = [
  { initials: "ML", className: "size-16 bg-brand text-ink left-1 bottom-0" },
  { initials: "TD", className: "size-12 bg-surface text-ink left-15 bottom-2" },
  { initials: "AE", className: "size-14 bg-blue-50 text-blue-700 left-7 bottom-13" },
  { initials: "LP", className: "size-10 bg-amber-50 text-amber-800 left-20 bottom-15" },
  { initials: "SL", className: "size-11 bg-subtle text-olive-700 left-2 bottom-26" },
  { initials: "CM", className: "size-9 bg-surface text-ink left-14 bottom-29" },
];

export function TeamIllustration() {
  return (
    <div aria-hidden="true" className="relative size-full">
      {TEAM.map((member) => (
        <span
          key={member.initials}
          className={`absolute flex items-center justify-center rounded-full text-label-xs shadow-float ring-3 ring-ink ${member.className}`}
        >
          {member.initials}
        </span>
      ))}
    </div>
  );
}
