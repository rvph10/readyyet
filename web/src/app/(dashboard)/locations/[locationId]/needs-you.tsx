"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useTransition, type ReactNode } from "react";
import { Illustration } from "@/components/illustration";
import { Popover } from "@/components/sidebar";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Icon, type IconName } from "@/components/ui/icon";
import { useToast } from "@/components/ui/toast";
import { orFailure } from "@/lib/api/or-failure";
import { useLocationActions } from "./location-actions";
import { changeStatus, dismissCollected } from "./tickets/[ticketId]/actions";

const MOST_SHOWN_ON_THE_BELL = 9;

const tones = {
  lime: "bg-brand text-ink",
  late: "bg-danger text-surface",
  wait: "bg-pine text-brand",
};

interface Item {
  id: string;
  name: string;
  // What it's about, the Ticket's title or the message.
  detail: string;
  // When it happened, where that's known.
  shown?: string;
}

export interface NeedsYouItems {
  // Set when it's close enough to act on, 0 once over.
  trialDaysLeft: number | null;
  // The latest few, out of feedbackCount.
  feedback: Item[];
  feedbackCount: number;
  // Each of these the first few, out of its count.
  collected: Item[];
  collectedCount: number;
  failing: Item[];
  failingCount: number;
  longWaits: (Item & { days: number })[];
  longWaitsCount: number;
}

// One thing to deal with, like a row of any inbox: who, with a badge for what
// kind of thing it is, what happened, and when. The whole row is the link, its
// buttons sitting above it.
function Row({
  href,
  name,
  icon,
  tone,
  line,
  detail,
  shown,
  actions,
}: Omit<Item, "id" | "detail"> & {
  href: string;
  icon: IconName;
  tone: keyof typeof tones;
  line: string;
  detail?: string;
  actions?: ReactNode;
}) {
  return (
    <li className="relative flex gap-3 rounded-xl p-2.5 transition-colors hover:bg-subtle">
      <span className="relative flex h-fit shrink-0">
        <Avatar id={name} name={name} src={null} />
        <span
          className={`absolute -right-1.5 -bottom-1.5 flex size-5 items-center justify-center rounded-full ring-2 ring-surface ${tones[tone]}`}
        >
          <Icon name={icon} className="size-2.5" />
        </span>
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-baseline justify-between gap-3">
          <Link href={href} className="min-w-0 truncate text-label-sm after:absolute after:inset-0 after:rounded-xl">
            {name}
          </Link>
          {shown && <span className="shrink-0 text-p-xs text-muted">{shown}</span>}
        </p>
        <p className="line-clamp-2 text-p-sm">{line}</p>
        {detail && (
          <p title={detail} className="truncate text-p-xs text-muted">
            {detail}
          </p>
        )}
        {actions && <div className="relative mt-2 flex gap-2">{actions}</div>}
      </div>
    </li>
  );
}

function SeeAll({ href, count }: { href: string; count: number }) {
  const t = useTranslations("today");
  return (
    <Link href={href} className="text-label-xs font-semibold underline underline-offset-4">
      {t("seeAll", { count })}
    </Link>
  );
}

function Group({ title, link, children }: { title: string; link?: ReactNode; children: ReactNode }) {
  return (
    <section className="not-first:mt-2">
      <div className="flex min-h-8 items-center justify-between gap-3 px-2.5">
        <h3 className="text-label-xs font-semibold text-muted">{title}</h3>
        {link}
      </div>
      <ul className="flex flex-col gap-0.5">{children}</ul>
    </section>
  );
}

// ADR 0112: nothing here is a notification to dismiss. Each row is work that
// leaves the list once it's done, so there's no read state and no "mark all as
// read", and the count is what's left to do. The most urgent kinds come first.
export function NeedsYou({ locationId, items }: { locationId: string; items: NeedsYouItems }) {
  const {
    feedback,
    feedbackCount,
    collected,
    collectedCount,
    failing,
    failingCount,
    longWaits,
    longWaitsCount,
    trialDaysLeft,
  } = items;
  const t = useTranslations("today");
  const tDetail = useTranslations("ticketDetail");
  const { choosePlan } = useLocationActions();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const total = feedbackCount + collectedCount + failingCount + longWaitsCount + (trialDaysLeft === null ? 0 : 1);
  const ticket = (id: string) => `/locations/${locationId}/tickets/${id}`;

  function run(action: () => Promise<{ ok: boolean }>) {
    startTransition(async () => {
      const result = await orFailure(action());
      if (!result.ok) toast({ tone: "error", message: tDetail("statusErrors.unexpected") });
    });
  }

  return (
    <Popover
      label={t("needsYouCount", { count: total })}
      popoverClass="needs-popover overflow-hidden! p-0!"
      triggerClass="relative flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-subtle transition-colors hover:bg-border has-[+:popover-open]:bg-pine has-[+:popover-open]:text-brand"
      trigger={
        <>
          <Icon name="notification" className="size-4.5" />
          {total > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5.5 min-w-5.5 items-center justify-center rounded-full bg-danger px-1 text-xs leading-none font-bold text-surface ring-2 ring-surface">
              {total > MOST_SHOWN_ON_THE_BELL ? `${MOST_SHOWN_ON_THE_BELL}+` : total}
            </span>
          )}
        </>
      }
    >
      <div className="flex max-h-[min(38rem,80dvh)] flex-col">
        <header className="flex items-center gap-2.5 border-b border-border px-4 py-3.5">
          <h2 className="text-title-h6">{t("needsYou")}</h2>
          {total > 0 && (
            <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-danger px-1.5 text-label-xs font-bold text-surface">
              {total}
            </span>
          )}
        </header>

        {total === 0 ? (
          <div className="flex flex-col items-center px-6 py-8 text-center">
            <Illustration name="chill" className="h-32 w-auto" />
            <p className="mt-4 text-label-md">{t("caughtUp")}</p>
            <p className="mt-0.5 max-w-64 text-p-sm text-muted">{t("caughtUpHint")}</p>
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {trialDaysLeft !== null && (
              <button
                type="button"
                data-closes-popover
                onClick={choosePlan}
                className="mb-1 flex w-full cursor-pointer items-center gap-3 rounded-xl bg-danger-subtle p-2.5 text-left text-danger transition-colors hover:bg-danger/15"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-danger text-surface">
                  <Icon name="receipt" className="size-4" />
                </span>
                <span className="min-w-0 flex-1 text-label-sm">
                  {trialDaysLeft === 0 ? t("trialEnded") : t("trialEnds", { days: trialDaysLeft })}
                </span>
                <Icon name="arrow-right" className="size-2.5 shrink-0" />
              </button>
            )}
            {failing.length > 0 && (
              <Group title={t("groups.failing")}>
                {failing.map(({ id, ...item }) => (
                  <Row key={id} {...item} href={ticket(id)} icon="info-triangle" tone="late" line={t("emailFailed")} />
                ))}
              </Group>
            )}
            {collected.length > 0 && (
              <Group
                title={t("groups.collected")}
                link={
                  collectedCount > collected.length && (
                    <SeeAll href={`/locations/${locationId}/tickets?view=collected`} count={collectedCount} />
                  )
                }
              >
                {collected.map(({ id, ...item }) => (
                  <Row
                    key={id}
                    {...item}
                    href={ticket(id)}
                    icon="check"
                    tone="lime"
                    line={t("saysCollected")}
                    actions={
                      <>
                        <Button
                          size="sm"
                          disabled={pending}
                          onClick={() => run(() => changeStatus(locationId, id, "COMPLETED"))}
                        >
                          {t("confirm")}
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={pending}
                          onClick={() => run(() => dismissCollected(locationId, id))}
                        >
                          {t("notYet")}
                        </Button>
                      </>
                    }
                  />
                ))}
              </Group>
            )}
            {feedbackCount > 0 && (
              <Group
                title={t("groups.feedback")}
                link={
                  feedbackCount > feedback.length && (
                    <SeeAll href={`/locations/${locationId}/feedback`} count={feedbackCount} />
                  )
                }
              >
                {feedback.map(({ id, name, detail, shown }) => (
                  <Row
                    key={id}
                    name={name}
                    shown={shown}
                    href={`/locations/${locationId}/feedback?message=${id}`}
                    icon="comment"
                    tone="wait"
                    line={detail}
                  />
                ))}
              </Group>
            )}
            {longWaits.length > 0 && (
              <Group
                title={t("groups.waiting")}
                link={
                  longWaitsCount > longWaits.length && (
                    <SeeAll href={`/locations/${locationId}/tickets?view=ready`} count={longWaitsCount} />
                  )
                }
              >
                {longWaits.map(({ id, days, ...item }) => (
                  <Row key={id} {...item} href={ticket(id)} icon="time" tone="wait" line={t("waiting", { days })} />
                ))}
              </Group>
            )}
          </div>
        )}

        <footer className="border-t border-border p-2">
          <Link
            href={`/locations/${locationId}/tickets?view=all`}
            className="flex h-11 items-center justify-center gap-2 rounded-xl text-label-sm transition-colors hover:bg-subtle"
          >
            {t("allTickets")}
            <Icon name="arrow-right" className="size-2.5" />
          </Link>
        </footer>
      </div>
    </Popover>
  );
}
