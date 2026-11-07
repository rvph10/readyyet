"use client";

import { ERASED_CUSTOMER_NAME } from "@readyyet/shared";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icon";
import { SearchField } from "@/components/ui/search-field";
import type { components } from "@/lib/api/schema";
import { statusLabel } from "@/lib/status-label";
import { searchTickets } from "./actions";
import { ticketsHref } from "./tickets/ticket-views";

type Ticket = components["schemas"]["TicketListItemDto"];

const DEBOUNCE_MS = 250;

// One search, on every page. It jumps straight to a Ticket, the results page
// being one Enter away, and / reaches it from anywhere (ADR 0087). A phone
// shows a button until it's needed.
export function HeaderSearch({ locationId, compact }: { locationId: string; compact?: boolean }) {
  const t = useTranslations("tickets");
  const locale = useLocale();
  const router = useRouter();
  const box = useRef<HTMLDivElement>(null);
  const [q, setQ] = useState("");
  const [found, setFound] = useState<{ query: string; tickets: Ticket[] } | null>(null);
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [active, setActive] = useState(0);
  const query = q.trim();
  const results = found?.query === query ? found.tickets : [];

  useEffect(() => {
    if (!query) return;
    let current = true;
    const timer = setTimeout(() => {
      void searchTickets(locationId, query).then(
        (tickets) => {
          if (current) setFound({ query, tickets });
        },
        // Only a shortcut, Enter still opens the Tickets page.
        () => undefined,
      );
    }, DEBOUNCE_MS);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [query, locationId]);

  useEffect(() => {
    function outside(event: PointerEvent) {
      if (box.current?.contains(event.target as Node)) return;
      setOpen(false);
      setExpanded(false);
    }
    function shortcut(event: KeyboardEvent) {
      const typing = (event.target as HTMLElement).closest("input, textarea, select");
      if (event.key !== "/" || typing || compact) return;
      event.preventDefault();
      box.current?.querySelector("input")?.focus();
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", shortcut);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", shortcut);
    };
  }, [compact]);

  function leave(href: string) {
    setOpen(false);
    setExpanded(false);
    setQ("");
    router.push(href);
  }

  const seeAll = () => leave(ticketsHref(locationId, { view: "all", q: query }));
  const name = (ticket: Ticket) =>
    ticket.customer.fullName === ERASED_CUSTOMER_NAME ? t("erasedCustomer") : ticket.customer.fullName;

  if (compact && !expanded) {
    return (
      <button
        type="button"
        aria-label={t("search")}
        onClick={() => setExpanded(true)}
        className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border-strong bg-surface"
      >
        <Icon name="search" className="size-4" />
      </button>
    );
  }

  return (
    <div
      ref={box}
      className={compact ? "absolute inset-x-4 top-3 z-30" : "relative w-full max-w-[22rem] min-w-0"}
      onFocus={() => setOpen(true)}
      onKeyDown={(event) => {
        if (event.key === "ArrowDown") setActive((value) => Math.min(value + 1, results.length - 1));
        if (event.key === "ArrowUp") setActive((value) => Math.max(value - 1, 0));
        if (event.key === "Enter" && query) {
          event.preventDefault();
          if (results[active]) leave(`/locations/${locationId}/tickets/${results[active].id}`);
          else seeAll();
        }
      }}
    >
      <SearchField
        className="[&_input]:border-transparent [&_input]:bg-subtle"
        label={t("search")}
        placeholder={t("searchPlaceholder")}
        maxLength={100}
        autoFocus={compact}
        value={q}
        onChange={(value) => {
          setQ(value);
          setActive(0);
          setOpen(true);
        }}
      />
      {open && query && (
        <div className="absolute inset-x-0 top-full z-30 mt-2 rounded-card border border-border-strong bg-surface p-2">
          {found?.query === query && results.length === 0 ? (
            <div className="px-3 py-4">
              <p className="text-label-sm wrap-anywhere">{t("noMatch", { query })}</p>
              <p className="mt-0.5 text-p-sm text-muted">{t("noMatchHint")}</p>
            </div>
          ) : (
            results.map((ticket, index) => (
              <button
                key={ticket.id}
                type="button"
                onClick={() => leave(`/locations/${locationId}/tickets/${ticket.id}`)}
                onPointerEnter={() => setActive(index)}
                className={`flex w-full cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2 text-left ${
                  index === active ? "bg-subtle" : ""
                }`}
              >
                <Avatar id={ticket.customer.fullName} name={name(ticket)} src={null} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-label-sm">{name(ticket)}</span>
                  <span className="block truncate text-p-xs text-muted">{ticket.title}</span>
                </span>
                <span className="hidden shrink-0 text-p-xs text-muted sm:block">
                  {statusLabel(ticket.currentStatus, locale)}
                </span>
              </button>
            ))
          )}
          {results.length > 0 && (
            <button
              type="button"
              onClick={seeAll}
              className="mt-1 flex min-h-11 w-full cursor-pointer items-center justify-center rounded-xl text-label-sm hover:bg-subtle"
            >
              {t("seeAll")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
