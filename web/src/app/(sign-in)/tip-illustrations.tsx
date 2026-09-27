import { Check } from "lucide-react";
import Image, { type StaticImageData } from "next/image";
import logo from "../icon.svg";

// Next.js types *.svg imports as any, see layout.tsx.
const logoImage = logo as StaticImageData;

// Small drawings of the product for the tips on the sign-in picture, built
// from its own pieces so they stay sharp at any size and follow the page's
// language. They sit at the bottom of their area and may rise above the card.
// Decorative: each tip's title and text already say it all.

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
      className={`col-start-1 row-start-1 flex h-32 w-19 flex-col items-center justify-between rounded-xl bg-surface p-2.5 shadow-float ${className}`}
    >
      <div className="h-1.5 w-full rounded-full bg-brand" />
      <svg viewBox={`0 0 ${QR_SIZE} ${QR_SIZE}`} shapeRendering="crispEdges" className="size-14">
        <path d={QR_PATH} className="fill-ink" />
      </svg>
      <span className="font-mono text-[0.5625rem] leading-none text-ink">#{number}</span>
    </div>
  );
}

export function TagsIllustration() {
  return (
    <div aria-hidden="true" className="grid size-full items-end justify-items-center">
      <Tag number="1041" className="-translate-x-9 -rotate-12 opacity-70" />
      <Tag number="1043" className="translate-x-9 rotate-12 opacity-70" />
      <Tag number="1042" className="z-10 -translate-y-1" />
    </div>
  );
}

export function EmailIllustration({ now, title }: { now: string; title: string }) {
  return (
    <div aria-hidden="true" className="grid size-full items-end justify-items-center">
      <div className="col-start-1 row-start-1 h-14 w-28 -translate-y-12 rounded-xl bg-surface/25" />
      <div className="col-start-1 row-start-1 h-14 w-32 -translate-y-6 rounded-xl bg-surface/50" />
      <div className="z-10 col-start-1 row-start-1 flex w-36 flex-col gap-1.5 rounded-xl bg-surface p-2.5 text-ink shadow-float">
        <div className="flex items-center gap-1">
          <Image src={logoImage} alt="" className="size-4" />
          <span className="text-[0.5625rem] font-semibold">ReadyYet</span>
          <span className="ml-auto text-[0.5rem] text-muted">{now}</span>
        </div>
        <span className="text-[0.6875rem] leading-tight font-semibold">{title}</span>
        <div className="h-1 w-full rounded-full bg-subtle" />
        <div className="h-1 w-2/3 rounded-full bg-subtle" />
      </div>
    </div>
  );
}

interface StatusNames {
  received: string;
  working: string;
  ready: string;
}

export function WorkflowIllustration({ received, working, ready }: StatusNames) {
  return (
    <div aria-hidden="true" className="flex size-full items-end justify-center">
      <div className="relative flex flex-col gap-3">
        <div className="absolute top-2 bottom-3 left-[0.1875rem] w-px bg-surface/30" />
        <div className="flex items-center gap-2">
          <span className="z-10 size-2 rounded-full bg-surface/70" />
          <span className="rounded-full bg-subtle px-2 py-0.5 text-[0.625rem] font-medium text-olive-700">
            {received}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="z-10 size-2 rounded-full bg-surface/70" />
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[0.625rem] font-medium text-blue-700">
            {working}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="z-10 size-2 rounded-full bg-brand ring-2 ring-brand/30" />
          <span className="flex items-center gap-1 rounded-full bg-brand px-3 py-1.5 text-label-sm font-semibold text-ink shadow-float">
            <Check aria-hidden="true" strokeWidth={2.5} className="size-3.5" />
            {ready}
          </span>
        </div>
      </div>
    </div>
  );
}

const MEMBERS = [
  { initials: "ML", className: "bg-brand text-ink" },
  { initials: "TD", className: "bg-blue-50 text-blue-700" },
  { initials: "AE", className: "bg-amber-50 text-amber-800" },
];

// One list of Tickets, and the team sharing it.
export function TeamIllustration({ received, working, ready }: StatusNames) {
  const rows = [
    { item: "Trek FX 3", status: ready, className: "bg-brand text-ink" },
    { item: "Brompton", status: working, className: "bg-blue-50 text-blue-700" },
    { item: "Gazelle", status: received, className: "bg-subtle text-olive-700" },
  ];
  return (
    <div aria-hidden="true" className="flex size-full items-end justify-center">
      <div className="relative flex w-36 flex-col gap-2 rounded-xl bg-surface p-2.5 pt-4 text-ink shadow-float">
        <div className="absolute -top-3.5 right-2.5 flex -space-x-1.5">
          {MEMBERS.map(({ initials, className }) => (
            <span
              key={initials}
              className={`flex size-7 items-center justify-center rounded-full text-[0.5625rem] font-semibold ring-2 ring-surface ${className}`}
            >
              {initials}
            </span>
          ))}
          <span className="flex size-7 items-center justify-center rounded-full bg-ink text-[0.5625rem] font-semibold text-surface ring-2 ring-surface">
            +2
          </span>
        </div>
        {rows.map(({ item, status, className }) => (
          <div key={item} className="flex items-center justify-between gap-2">
            <span className="text-[0.625rem] font-medium">{item}</span>
            <span className={`rounded-full px-1.5 py-0.5 text-[0.5rem] font-medium ${className}`}>{status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
