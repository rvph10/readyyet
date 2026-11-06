"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRef, useState, useTransition, type ReactNode } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Panel } from "@/components/ui/panel";
import { useToast } from "@/components/ui/toast";
import { orFailure } from "@/lib/api/or-failure";
import type { components } from "@/lib/api/schema";
import { markFeedbackHandled } from "../actions";
import type { View } from "./feedback-views";

type Item = components["schemas"]["FeedbackDto"] & { receivedShown: string; handledShown: string | null };

function Reader({ item, locationId }: { item: Item; locationId: string }) {
  const t = useTranslations("feedback");
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const { customer, ticket } = item;

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
        <div className="min-w-0">
          <h2 title={customer.fullName} className="truncate text-title-h6 md:text-title-h5">
            {customer.fullName}
          </h2>
          <p className="text-p-sm text-muted">
            <time dateTime={item.createdAt}>{item.receivedShown}</time>
          </p>
        </div>
      </div>
      <div className="mt-6">
        <h3 className="text-label-sm">{t("messageTitle")}</h3>
        <blockquote className="mt-2 max-w-3xl rounded-2xl bg-subtle p-5 text-p-lg wrap-anywhere whitespace-pre-line lg:p-7">
          {item.message}
        </blockquote>
      </div>
      <Link
        href={`/locations/${locationId}/tickets/${ticket.id}`}
        className="mt-5 flex min-h-16 items-center gap-3 rounded-2xl border border-border p-3 transition-colors hover:bg-subtle"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-subtle">
          <Icon name="tag" className="size-3.5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-p-sm text-muted">{t("ticketFollowUp")}</span>
          <span title={ticket.title} className="block truncate text-label-sm">
            {ticket.title}
          </span>
        </span>
        <span className="shrink-0 text-label-sm">{t("openTicket")}</span>
        <Icon name="arrow-right" className="mr-1 size-2.5 shrink-0 text-muted" />
      </Link>
      {item.handledAt ? (
        <p className="mt-5 flex items-center gap-3 text-label-sm">
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
        <div className="mt-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <p className="max-w-md text-p-sm text-muted">{t("handleHint")}</p>
          <Button pending={pending} pendingLabel={t("marking")} onClick={markHandled} className="shrink-0">
            <Icon name="check" className="size-3.5 text-brand" />
            {t("markHandled")}
          </Button>
        </div>
      )}
    </>
  );
}

interface Props {
  locationId: string;
  waiting: number;
  view: View;
  items: Item[];
  tabs: ReactNode;
  pager: ReactNode;
}

// ADR 0096: an inbox, the open message taking most of the page. Choosing one
// stays in the browser, so messages open at once. Once one is handled and leaves
// the list, the fallback to the first row opens the next.
export function FeedbackBoard({ locationId, waiting, view, items, tabs, pager }: Props) {
  const t = useTranslations("feedback");
  const [openId, setOpenId] = useState<string | null>(null);
  const readerTop = useRef<HTMLSpanElement>(null);
  const open = items.find(({ id }) => id === openId) ?? items[0];
  function choose(id: string) {
    setOpenId(id);
    // On a phone the message sits above the list, out of sight.
    readerTop.current!.scrollIntoView({ block: "nearest" });
  }

  return (
    <div className="grid flex-1 grid-cols-[minmax(0,1fr)] items-start gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(20rem,1fr)] lg:gap-5">
      <Panel as="section" aria-live="polite" padding="none" className="flex flex-col p-5 lg:p-7">
        <span ref={readerTop} className="scroll-mt-9" />
        <Reader key={open.id} item={open} locationId={locationId} />
      </Panel>

      <Panel as="section" className="flex flex-col">
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <h2 className="text-title-h6">{t("messagesTitle")}</h2>
          <p className="text-p-sm text-muted">
            {view === "waiting" ? t("waitingSummary", { count: waiting }) : t("handledSummary")}
          </p>
        </div>
        <div className="mt-3">{tabs}</div>
        <ul className="-mx-2 mt-3 flex flex-col gap-1 px-2">
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
