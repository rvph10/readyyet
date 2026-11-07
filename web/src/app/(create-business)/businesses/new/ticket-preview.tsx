"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { formatPhoneNumberIntl } from "react-phone-number-input";
import { Avatar } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icon";
import { WorkflowSteps, type WorkflowStep } from "@/components/workflow-steps";

const STEP_MS = 1200;
const HOLD_MS = 2000;
const FADE_MS = 400;

// Stands in for what a real Ticket or the owner hasn't given yet: still,
// since nothing is loading, and the size of the text it replaces, so the
// page keeps its shape.
function Blank({ className }: { className: string }) {
  return <span className={`block h-3 rounded-full bg-ink/10 ${className}`} />;
}

// One step at a time to the end, a pause, then a fade back to the start,
// paused while hovered and still with reduced motion.
function usePlayback(length: number, paused: boolean) {
  const [index, setIndex] = useState(0);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (paused || length === 0 || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const atEnd = index === length - 1;
    // Faded out, the steps go back to the start unseen, then fade back in.
    const [delay, next] = fading
      ? atEnd
        ? [FADE_MS, () => setIndex(0)]
        : [FADE_MS, () => setFading(false)]
      : atEnd
        ? [HOLD_MS, () => setFading(true)]
        : [STEP_MS, () => setIndex(index + 1)];
    const timer = setTimeout(next, delay);
    return () => clearTimeout(timer);
  }, [index, fading, paused, length]);

  return { index, fading };
}

function Workflow({ steps }: { steps: WorkflowStep[] }) {
  const [paused, setPaused] = useState(false);
  const { index, fading } = usePlayback(steps.length, paused);
  return (
    <div onPointerEnter={() => setPaused(true)} onPointerLeave={() => setPaused(false)}>
      <h3 className="text-title-h4">{steps[index].label}</h3>
      <Blank className="mt-3 w-44" />
      <div className={`mt-6 transition-opacity duration-400 ${fading ? "opacity-0" : ""}`}>
        <WorkflowSteps steps={steps} currentCode={steps[index].code} />
      </div>
    </div>
  );
}

// Shrinks its content to the height it's given, never grows it, so a long
// Workflow stays on screen. The scale is set through the CSSOM, which the
// CSP allows where a style attribute would be refused (ADR 0048).
export function FitToHeight({ className, children }: { className: string; children: ReactNode }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const box = outer.current!;
    const content = inner.current!;
    const fit = () => content.style.setProperty("scale", String(Math.min(1, box.clientHeight / content.offsetHeight)));
    const observer = new ResizeObserver(fit);
    observer.observe(box);
    observer.observe(content);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={outer} className={`overflow-hidden ${className}`}>
      <div ref={inner} className="origin-top">
        {children}
      </div>
    </div>
  );
}

interface Props {
  // Stable while the name is typed, so the avatar keeps its colour.
  avatarId: string;
  businessName: string;
  // The Location's name once given, the Business's until then.
  shopName: string;
  businessType?: { code: string; label: string; steps: WorkflowStep[] };
  // Said in place of "Other" when given.
  businessTypeDetail: string;
  phone: string;
  email: string;
}

// ADR 0070 and 0072: the Customer's tracking page as the form fills it in,
// on its grey page. It repeats what's typed, so it's hidden from screen
// readers and can't be focused.
export function TicketPreview({
  avatarId,
  businessName,
  shopName,
  businessType,
  businessTypeDetail,
  phone,
  email,
}: Props) {
  const t = useTranslations("createBusiness");
  return (
    <div aria-hidden="true" inert className="space-y-3 rounded-[1.75rem] bg-canvas p-4">
      <header className="flex items-center gap-3">
        {businessName ? (
          <Avatar id={avatarId} name={businessName} src={null} shape="square" />
        ) : (
          <span className="size-10 shrink-0 rounded-xl bg-ink/10" />
        )}
        <div className="min-w-0 flex-1">
          {shopName ? <p className="truncate text-label-sm">{shopName}</p> : <Blank className="w-32" />}
          {businessType ? (
            <p className="truncate text-p-xs text-muted">{businessTypeDetail || businessType.label}</p>
          ) : (
            <Blank className="mt-2 w-20" />
          )}
        </div>
      </header>
      <section className="rounded-sheet border border-border bg-surface p-6">
        <Blank className="mb-4 w-28" />
        {businessType ? (
          // Keyed by type, so a new choice starts from the first step.
          <Workflow key={businessType.code} steps={businessType.steps} />
        ) : (
          <>
            <Blank className="h-6 w-40" />
            <Blank className="mt-3 w-44" />
            <div className="mt-6 space-y-5">
              {[1, 2, 3, 4].map((row) => (
                <div key={row} className="flex items-center gap-3">
                  <span className="size-6 shrink-0 rounded-full border-2 border-border bg-surface" />
                  <Blank className="w-24" />
                </div>
              ))}
            </div>
          </>
        )}
      </section>
      <section className="space-y-3 rounded-sheet border border-border bg-surface p-6">
        <h3 className="text-label-md">{t("previewContact")}</h3>
        <p className="flex items-center gap-3 text-p-sm">
          <Icon name="phone" className="size-3.5 shrink-0 text-muted" />
          {formatPhoneNumberIntl(phone) || <Blank className="w-32" />}
        </p>
        <p className="flex items-center gap-3 text-p-sm">
          <Icon name="message" className="size-3.5 shrink-0 text-muted" />
          {email ? <span className="truncate">{email}</span> : <Blank className="w-40" />}
        </p>
      </section>
    </div>
  );
}
