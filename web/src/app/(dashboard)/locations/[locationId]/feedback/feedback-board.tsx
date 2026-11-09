"use client";

import { NEGATIVE_FEEDBACK_TAGS, REPLY_MAX_LENGTH, type FeedbackTag } from "@readyyet/shared";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useRef, useState, useTransition, type FormEvent, type ReactNode } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button, buttonClass } from "@/components/ui/button";
import { TextareaField } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { Panel } from "@/components/ui/panel";
import { useToast } from "@/components/ui/toast";
import { orFailure } from "@/lib/api/or-failure";
import type { components } from "@/lib/api/schema";
import { markFeedbackHandled, replyToFeedback } from "../actions";
import { Stars } from "./stars";

type Item = components["schemas"]["FeedbackDto"] & {
  receivedShown: string;
  handledShown: string | null;
  // Null unless it still needs a follow-up.
  waitingDays: number | null;
};

// A Customer who took the time to answer shouldn't wait longer than this.
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

function TagPills({ tags }: { tags: FeedbackTag[] }) {
  const t = useTranslations("feedbackTags");
  return (
    <ul className="flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <li
          key={tag}
          className={`inline-flex h-7 items-center rounded-full px-2.5 text-label-xs font-semibold ${
            NEGATIVE_FEEDBACK_TAGS.includes(tag) ? "bg-danger-subtle text-danger" : "bg-pine-subtle text-ink"
          }`}
        >
          {t(tag)}
        </li>
      ))}
    </ul>
  );
}

// What the shop does with it: a reply by email, or a call and closing it.
function Answer({ item, locationId }: { item: Item; locationId: string }) {
  const t = useTranslations("feedback");
  const toast = useToast();
  const [reply, setReply] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, startSending] = useTransition();
  const [closing, startClosing] = useTransition();
  const { customer } = item;

  function send(event: FormEvent) {
    event.preventDefault();
    const text = reply.trim();
    setError(
      !text ? t("replyMissing") : text.length > REPLY_MAX_LENGTH ? t("replyTooLong", { max: REPLY_MAX_LENGTH }) : null,
    );
    if (!text || text.length > REPLY_MAX_LENGTH) return;
    startSending(async () => {
      const result = await orFailure(replyToFeedback(locationId, item.id, text));
      toast(
        result.ok ? { message: t("replied", { name: customer.fullName }) } : { tone: "error", message: t("failed") },
      );
    });
  }

  function close() {
    startClosing(async () => {
      const result = await orFailure(markFeedbackHandled(locationId, item.id));
      toast(result.ok ? { message: t("closed") } : { tone: "error", message: t("failed") });
    });
  }

  if (item.reply !== null) {
    return (
      <div className="mt-auto border-t border-border pt-4">
        <p className="text-label-sm">
          {item.handledBy ? t("repliedBy", { name: item.handledBy.name }) : t("repliedTitle")}
          <span className="ml-2 text-p-xs text-muted">{item.handledShown}</span>
        </p>
        <p className="mt-2 ml-auto rounded-2xl rounded-tr-sm bg-pine p-4 text-p-md wrap-anywhere whitespace-pre-line text-surface">
          {item.reply}
        </p>
      </div>
    );
  }

  if (item.handledAt !== null) {
    return (
      <p className="mt-auto flex items-center gap-3 border-t border-border pt-4 text-label-sm">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand">
          <Icon name="check" className="size-3.5" />
        </span>
        <span className="min-w-0">
          <span className="block truncate">
            {item.handledBy ? t("closedBy", { name: item.handledBy.name }) : t("handled")}
          </span>
          <span className="block text-p-xs text-muted">{item.handledShown}</span>
        </span>
      </p>
    );
  }

  const call = customer.phone && (
    <a href={`tel:${customer.phone}`} className={buttonClass({ variant: "secondary" })}>
      <Icon name="phone" className="size-3.5" />
      {t("replyCall")}
    </a>
  );
  const closeButton = (
    <Button variant="secondary" pending={closing} pendingLabel={t("marking")} onClick={close}>
      {t(customer.email ? "closeWithoutReply" : "close")}
    </Button>
  );

  return customer.email ? (
    <form noValidate onSubmit={send} className="mt-auto flex flex-col gap-3 border-t border-border pt-4">
      <TextareaField
        label={t("replyLabel", { name: customer.fullName })}
        placeholder={t("replyPlaceholder")}
        hint={t("replyHint", { email: customer.email })}
        value={reply}
        maxLength={REPLY_MAX_LENGTH}
        error={error}
        onChange={(event) => setReply(event.target.value)}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" pending={sending} pendingLabel={t("replying")}>
          <Icon name="message" className="size-3.5 text-brand" />
          {t("sendReply")}
        </Button>
        {call}
        <span className="ml-auto">{closeButton}</span>
      </div>
    </form>
  ) : (
    <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-border pt-4">
      {call ?? <p className="text-p-sm text-muted">{t("noContact")}</p>}
      <span className="ml-auto">{closeButton}</span>
    </div>
  );
}

function Reader({ item, locationId }: { item: Item; locationId: string }) {
  const t = useTranslations("feedback");
  const { customer, ticket } = item;

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

      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
        {item.stars !== null && <Stars value={item.stars} className="text-3xl" />}
        {item.googleClickedAt && (
          <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-brand px-2.5 text-label-xs font-semibold">
            <Icon name="check" className="size-2.5" />
            {t("wentToGoogle")}
          </span>
        )}
      </div>
      {item.tags.length > 0 && (
        <div className="mt-3">
          <TagPills tags={item.tags} />
        </div>
      )}
      {item.message === null ? (
        <p className="mt-4 text-p-sm text-muted">{t("noMessage")}</p>
      ) : (
        <blockquote className="mt-4 rounded-2xl rounded-tl-sm bg-subtle p-5 text-p-lg wrap-anywhere whitespace-pre-line lg:p-6">
          {item.message}
        </blockquote>
      )}
      <Link
        href={`/locations/${locationId}/tickets/${ticket.id}`}
        title={ticket.title}
        className="mt-3 mb-5 flex min-h-11 w-fit max-w-full items-center gap-2 text-label-sm underline-offset-4 hover:underline"
      >
        <Icon name="tag" className="size-3.5 shrink-0 text-muted" />
        <span className="min-w-0 truncate">{ticket.title}</span>
        <Icon name="arrow-right" className="size-2.5 shrink-0 text-muted" />
      </Link>

      <Answer item={item} locationId={locationId} />
    </>
  );
}

interface Props {
  locationId: string;
  items: Item[];
  tabs: ReactNode;
  pager: ReactNode;
}

// ADR 0096: an inbox, the open answer taking most of the page. Choosing one
// stays in the browser, so answers open at once. The URL holds it, so the
// bell's links open one on this page too. One that isn't here, handled or on
// another page, falls back to the first row.
export function FeedbackBoard({ locationId, items, tabs, pager }: Props) {
  const t = useTranslations("feedback");
  const search = useSearchParams();
  const readerTop = useRef<HTMLSpanElement>(null);
  const open = items.find(({ id }) => id === search.get("message")) ?? items[0];
  function choose(id: string) {
    const next = new URLSearchParams(search);
    next.set("message", id);
    window.history.replaceState(null, "", `?${next}`);
    // On a phone the answer sits above the list, out of sight.
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
        <Reader key={open.id} item={open} locationId={locationId} />
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
                  <span className="flex items-center gap-2">
                    {item.stars !== null && (
                      <Stars value={item.stars} className={`text-sm ${item.stars <= 2 ? "text-danger" : ""}`} />
                    )}
                    <span title={item.ticket.title} className="truncate text-p-xs text-muted">
                      {item.ticket.title}
                    </span>
                  </span>
                  {item.message !== null && <span className="mt-0.5 line-clamp-2 block text-p-sm">{item.message}</span>}
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
