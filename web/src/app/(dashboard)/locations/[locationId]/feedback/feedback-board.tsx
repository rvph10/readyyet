"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useRef, useTransition, type ReactNode } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button, buttonClass } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Panel } from "@/components/ui/panel";
import { useToast } from "@/components/ui/toast";
import { orFailure } from "@/lib/api/or-failure";
import type { components } from "@/lib/api/schema";
import { markFeedbackHandled } from "../actions";

type Item = components["schemas"]["FeedbackDto"] & {
  receivedShown: string;
  handledShown: string | null;
  // Null once handled.
  waitingDays: number | null;
};

// A Customer who took the time to write shouldn't wait longer than this.
const LATE_REPLY_DAYS = 2;

function WaitingPill({ days }: { days: number }) {
  const t = useTranslations("feedback");
  return (
    <span
      className={`inline-flex h-6 shrink-0 items-center rounded-full px-2.5 text-label-xs font-semibold ${
        days >= LATE_REPLY_DAYS ? "bg-danger text-surface" : "bg-subtle text-ink"
      }`}
    >
      {t("waitingFor", { days })}
    </span>
  );
}

function Reader({ item, locationId, shopName }: { item: Item; locationId: string; shopName: string }) {
  const t = useTranslations("feedback");
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const { customer, ticket } = item;
  const contact = buttonClass({ variant: "secondary" });

  function markHandled() {
    startTransition(async () => {
      const result = await orFailure(markFeedbackHandled(locationId, item.id));
      toast(result.ok ? { message: t("moved") } : { tone: "error", message: t("failed") });
    });
  }

  return (
    <>
      <div className="flex items-center gap-4">
        <Avatar id={customer.fullName} name={customer.fullName} src={null} size="lg" />
        <div className="min-w-0 flex-1">
          <h2 title={customer.fullName} className="truncate text-title-h6 md:text-title-h5">
            {customer.fullName}
          </h2>
          <p className="text-p-sm text-muted">
            <time dateTime={item.createdAt}>{item.receivedShown}</time>
          </p>
        </div>
        {item.waitingDays !== null && <WaitingPill days={item.waitingDays} />}
      </div>
      <blockquote className="mt-5 rounded-2xl rounded-tl-sm bg-subtle p-5 text-p-lg wrap-anywhere whitespace-pre-line lg:p-6">
        {item.message}
      </blockquote>
      <Link
        href={`/locations/${locationId}/tickets/${ticket.id}`}
        title={ticket.title}
        className="mt-3 flex min-h-11 w-fit max-w-full items-center gap-2 text-label-sm underline-offset-4 hover:underline"
      >
        <Icon name="tag" className="size-3.5 shrink-0 text-muted" />
        <span className="min-w-0 truncate">{ticket.title}</span>
        <Icon name="arrow-right" className="size-2.5 shrink-0 text-muted" />
      </Link>

      <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-border pt-4">
        {customer.email && (
          <a
            href={`mailto:${customer.email}?subject=${encodeURIComponent(t("replySubject", { shop: shopName, ticket: ticket.title }))}`}
            className={contact}
          >
            <Icon name="message" className="size-3.5" />
            {t("replyEmail")}
          </a>
        )}
        {customer.phone && (
          <a href={`tel:${customer.phone}`} className={contact}>
            <Icon name="phone" className="size-3.5" />
            {t("replyCall")}
          </a>
        )}
        {!customer.email && !customer.phone && <p className="text-p-sm text-muted">{t("noContact")}</p>}
        {item.handledAt ? (
          <p className="ml-auto flex items-center gap-3 text-label-sm">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand">
              <Icon name="check" className="size-3.5" />
            </span>
            <span className="min-w-0">
              <span className="block truncate">
                {item.handledBy ? t("handledBy", { name: item.handledBy.name }) : t("handled")}
              </span>
              <time dateTime={item.handledAt} className="block text-p-xs text-muted">
                {item.handledShown}
              </time>
            </span>
          </p>
        ) : (
          <Button pending={pending} pendingLabel={t("marking")} onClick={markHandled} className="ml-auto shrink-0">
            <Icon name="check" className="size-3.5 text-brand" />
            {t("markHandled")}
          </Button>
        )}
      </div>
    </>
  );
}

interface Props {
  locationId: string;
  shopName: string;
  items: Item[];
  tabs: ReactNode;
  pager: ReactNode;
}

// ADR 0096: an inbox, the open message taking most of the page. Choosing one
// stays in the browser, so messages open at once. The URL holds it, so the bell's
// links open a message on this page too. One that isn't here, handled or on
// another page, falls back to the first row.
export function FeedbackBoard({ locationId, shopName, items, tabs, pager }: Props) {
  const t = useTranslations("feedback");
  const search = useSearchParams();
  const readerTop = useRef<HTMLSpanElement>(null);
  const open = items.find(({ id }) => id === search.get("message")) ?? items[0];
  function choose(id: string) {
    const next = new URLSearchParams(search);
    next.set("message", id);
    window.history.replaceState(null, "", `?${next}`);
    // On a phone the message sits above the list, out of sight.
    readerTop.current!.scrollIntoView({ block: "nearest" });
  }

  return (
    <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(20rem,1fr)] lg:gap-5">
      <Panel
        as="section"
        aria-live="polite"
        padding="none"
        className="flex min-h-0 flex-col overflow-y-auto p-5 lg:p-7"
      >
        <span ref={readerTop} className="scroll-mt-9" />
        <Reader key={open.id} item={open} locationId={locationId} shopName={shopName} />
      </Panel>

      <Panel as="section" className="flex min-h-0 flex-col">
        <h2 className="sr-only">{t("messagesTitle")}</h2>
        {tabs}
        <ul className="-mx-2 mt-3 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-2">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                aria-pressed={item.id === open.id}
                onClick={() => choose(item.id)}
                className={`flex w-full cursor-pointer items-center gap-3 rounded-2xl p-3 text-left transition-colors ${
                  item.id === open.id ? "bg-pine-subtle" : "hover:bg-subtle"
                }`}
              >
                <Avatar id={item.customer.fullName} name={item.customer.fullName} src={null} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-3">
                    <span title={item.customer.fullName} className="truncate text-label-sm">
                      {item.customer.fullName}
                    </span>
                    <span className="shrink-0 text-p-xs text-muted">{item.receivedShown}</span>
                  </span>
                  <span title={item.ticket.title} className="block truncate text-p-xs text-muted">
                    {item.ticket.title}
                  </span>
                  <span className="mt-0.5 line-clamp-2 block text-p-sm">{item.message}</span>
                  {item.waitingDays !== null && item.waitingDays >= LATE_REPLY_DAYS && (
                    <span className="mt-1.5 block">
                      <WaitingPill days={item.waitingDays} />
                    </span>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
        {pager}
      </Panel>
    </div>
  );
}
