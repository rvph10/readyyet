"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState, useTransition, type ReactNode } from "react";
import { Popover } from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Icon, type IconName } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { orFailure } from "@/lib/api/or-failure";
import type { components } from "@/lib/api/schema";
import { markFeedbackHandled } from "./actions";
import { useLocationActions } from "./location-actions";
import { changeStatus, dismissCollected } from "./tickets/[ticketId]/actions";

type Feedback = components["schemas"]["FeedbackDto"];

const tones = {
  lime: "bg-brand text-ink",
  late: "bg-danger-subtle text-danger",
  wait: "bg-warning-subtle text-warning",
};

function Row({
  icon,
  tone,
  title,
  children,
  highlight,
  actions,
}: {
  icon: IconName;
  tone: keyof typeof tones;
  title: string;
  children?: ReactNode;
  highlight?: boolean;
  actions?: ReactNode;
}) {
  return (
    <li
      className={
        highlight ? "-mx-2.5 rounded-card bg-brand/25 p-2.5" : "border-t border-border py-2.5 first:border-t-0"
      }
    >
      <div className="flex items-center gap-3">
        <span className={`flex size-9 shrink-0 items-center justify-center rounded-full ${tones[tone]}`}>
          <Icon name={icon} className="size-3.5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-label-sm">{title}</span>
          {children}
        </span>
      </div>
      {actions && <div className="mt-2 flex flex-wrap justify-end gap-1">{actions}</div>}
    </li>
  );
}

// With one thing to do, the whole row is the link.
function LinkRow({
  href,
  ...props
}: {
  href: string;
  icon: IconName;
  tone: keyof typeof tones;
  title: string;
  line: string;
}) {
  return (
    <li className="border-t border-border first:border-t-0">
      <Link href={href} className="flex items-center gap-3 rounded-xl py-2.5 transition-colors hover:bg-subtle">
        <span className={`flex size-9 shrink-0 items-center justify-center rounded-full ${tones[props.tone]}`}>
          <Icon name={props.icon} className="size-3.5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-label-sm">{props.title}</span>
          <span className="block truncate text-p-sm text-muted">{props.line}</span>
        </span>
        <Icon name="arrow-right" className="size-2.5 shrink-0 text-muted" />
      </Link>
    </li>
  );
}

export interface NeedsYouItems {
  // Set when it's close enough to act on, 0 once over.
  trialDaysLeft: number | null;
  feedback: Feedback | null;
  feedbackCount: number;
  collected: { id: string; name: string }[];
  failing: { id: string; name: string }[];
  longWaits: { id: string; name: string; days: number }[];
}

// ADR 0111: what needs someone, wherever they are in the shop, behind a bell
// with a solid count. It opens wide, as a busy shop's list has actions in it.
export function NeedsYou({ locationId, items }: { locationId: string; items: NeedsYouItems }) {
  const { feedback, feedbackCount, collected, failing, longWaits, trialDaysLeft } = items;
  const t = useTranslations("today");
  const tDetail = useTranslations("ticketDetail");
  const { choosePlan } = useLocationActions();
  const toast = useToast();
  const [reading, setReading] = useState(false);
  const [pending, startTransition] = useTransition();
  const total = feedbackCount + collected.length + failing.length + longWaits.length + (trialDaysLeft === null ? 0 : 1);

  function run(action: () => Promise<{ ok: boolean }>) {
    startTransition(async () => {
      const result = await orFailure(action());
      if (!result.ok) toast({ tone: "error", message: tDetail("statusErrors.unexpected") });
    });
  }

  const handled = () => {
    setReading(false);
    run(() => markFeedbackHandled(locationId, feedback!.id));
  };

  return (
    <>
      <Popover
        label={`${t("needsYou")}: ${total}`}
        popoverClass="needs-popover"
        triggerClass="relative flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-subtle transition-colors hover:bg-border has-[+:popover-open]:bg-pine has-[+:popover-open]:text-brand"
        trigger={
          <>
            <Icon name="notification" className="size-4.5" />
            {total > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5.5 min-w-5.5 items-center justify-center rounded-full bg-danger px-1 text-xs leading-none font-bold text-surface ring-2 ring-surface">
                {total}
              </span>
            )}
          </>
        }
      >
        <div className="p-2">
          <h2 className="flex items-center gap-2.5 text-title-h6">
            {t("needsYou")}
            {total > 0 && (
              <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-danger px-2 text-label-xs font-bold text-surface">
                {total}
              </span>
            )}
          </h2>
          {total === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-brand text-ink">
                <Icon name="check" className="size-4" />
              </span>
              <p className="mt-3 text-label-md">{t("caughtUp")}</p>
              <p className="mt-0.5 max-w-60 text-p-sm text-muted">{t("caughtUpHint")}</p>
            </div>
          ) : (
            <ul className="mt-2">
              {trialDaysLeft !== null && (
                <li className="border-t border-border first:border-t-0">
                  <button
                    type="button"
                    onClick={choosePlan}
                    className="flex w-full cursor-pointer items-center gap-3 rounded-xl py-2.5 text-left transition-colors hover:bg-subtle"
                  >
                    <span className={`flex size-9 shrink-0 items-center justify-center rounded-full ${tones.late}`}>
                      <Icon name="receipt" className="size-3.5" />
                    </span>
                    <span className="min-w-0 flex-1 text-label-sm">
                      {trialDaysLeft === 0 ? t("trialEnded") : t("trialEnds", { days: trialDaysLeft })}
                    </span>
                    <Icon name="arrow-right" className="size-2.5 shrink-0 text-muted" />
                  </button>
                </li>
              )}
              {feedback && (
                <Row
                  icon="comment"
                  tone="lime"
                  highlight
                  title={feedback.customer.fullName}
                  actions={
                    <>
                      <Button variant="secondary" size="sm" disabled={pending} onClick={handled}>
                        {t("markHandled")}
                      </Button>
                      <Button size="sm" onClick={() => setReading(true)}>
                        {t("read")}
                      </Button>
                    </>
                  }
                >
                  <span className="block truncate text-p-sm text-muted">{t("privateFeedback")}</span>
                  <span className="mt-0.5 line-clamp-2 text-p-sm text-muted">{feedback.message}</span>
                </Row>
              )}
              {collected.map(({ id, name }) => (
                <Row
                  key={id}
                  icon="check"
                  tone="wait"
                  title={name}
                  actions={
                    <>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={pending}
                        onClick={() => run(() => dismissCollected(locationId, id))}
                      >
                        {t("notYet")}
                      </Button>
                      <Button
                        size="sm"
                        disabled={pending}
                        onClick={() => run(() => changeStatus(locationId, id, "COMPLETED"))}
                      >
                        {t("confirm")}
                      </Button>
                    </>
                  }
                >
                  <span className="block truncate text-p-sm text-muted">{t("saysCollected")}</span>
                </Row>
              ))}
              {failing.map(({ id, name }) => (
                <LinkRow
                  key={id}
                  href={`/locations/${locationId}/tickets/${id}`}
                  icon="info-triangle"
                  tone="late"
                  title={name}
                  line={t("emailFailed")}
                />
              ))}
              {longWaits.map(({ id, name, days }) => (
                <LinkRow
                  key={id}
                  href={`/locations/${locationId}/tickets/${id}`}
                  icon="time"
                  tone="wait"
                  title={name}
                  line={t("waiting", { days })}
                />
              ))}
            </ul>
          )}
        </div>
      </Popover>
      <Dialog open={reading} onClose={() => setReading(false)} title={feedback?.customer.fullName ?? ""}>
        {feedback && (
          <>
            <p className="text-p-xs text-muted">{feedback.ticket.title}</p>
            <p className="mt-3 text-p-md wrap-anywhere whitespace-pre-line">{feedback.message}</p>
            <div className="mt-5 flex justify-end gap-2">
              <Button pending={pending} onClick={handled}>
                {t("markHandled")}
              </Button>
            </div>
          </>
        )}
      </Dialog>
    </>
  );
}
