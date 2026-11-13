"use client";

import { ERASED_CUSTOMER_NAME, ERASED_TICKET_TITLE } from "@readyyet/shared";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Dialog } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { SearchField } from "@/components/ui/search-field";
import type { components } from "@/lib/api/schema";
import { parseSort } from "@/lib/sort";
import { statusLabel } from "@/lib/status-label";
import { searchTickets } from "./actions";
import { LIST_SORTS, ticketsHref } from "./tickets/ticket-views";

type Ticket = components["schemas"]["TicketListItemDto"];

const DEBOUNCE_MS = 250;

// One search, on every page. It jumps straight to a Ticket, the results page
// being one Enter away, and / reaches it from anywhere (ADR 0087). On a phone it
// opens a screen of its own, as the bar has no room for it beside the rest.
export function HeaderSearch({ locationId, compact }: { locationId: string; compact?: boolean }) {
  const t = useTranslations("tickets");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const box = useRef<HTMLDivElement>(null);
  const [q, setQ] = useState("");
  // Null Tickets when the search failed.
  const [found, setFound] = useState<{ query: string; tickets: Ticket[] | null } | null>(null);
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [active, setActive] = useState(0);
  // The newest Tickets, shown before anything is typed, fetched on first use.
  const [recent, setRecent] = useState<Ticket[] | null>(null);
  const query = q.trim();
  const searching = query !== "" && found?.query !== query;
  const answer = found?.query === query ? found.tickets : undefined;
  const results = query ? (answer ?? []) : (recent ?? []);

  function fetchRecent() {
    if (recent) return;
    setRecent([]);
    // Only a shortcut, an empty list just shows nothing.
    void searchTickets(locationId, "").then(setRecent, () => undefined);
  }

  useEffect(() => {
    if (!query) return;
    let current = true;
    const timer = setTimeout(() => {
      void searchTickets(locationId, query).then(
        (tickets) => {
          if (current) setFound({ query, tickets });
        },
        // Only a shortcut, Enter still opens the Tickets page.
        () => {
          if (current) setFound({ query, tickets: null });
        },
      );
    }, DEBOUNCE_MS);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [query, locationId]);

  // Compact, the search is a Dialog rendered outside the box, which closes
  // itself: a tap inside it would count as outside and shut it.
  useEffect(() => {
    if (compact) return;
    function outside(event: PointerEvent) {
      if (box.current?.contains(event.target as Node)) return;
      setOpen(false);
    }
    function shortcut(event: KeyboardEvent) {
      const typing = (event.target as HTMLElement).closest("input, textarea, select");
      if (event.key !== "/" || typing) return;
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

  // Only the Tickets page's own: Today sorts its table with the same parameter.
  const seeAll = () => {
    const onTickets = pathname === ticketsHref(locationId, { view: "open" });
    const sort = onTickets ? parseSort(Object.fromEntries(search), LIST_SORTS) : null;
    leave(ticketsHref(locationId, { view: "all", q: query, sort }));
  };
  const name = (ticket: Ticket) =>
    ticket.customer.fullName === ERASED_CUSTOMER_NAME ? t("erasedCustomer") : ticket.customer.fullName;
  const title = (ticket: Ticket) => (ticket.title === ERASED_TICKET_TITLE ? t("erasedTicket") : ticket.title);

  const keys = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowDown") setActive((value) => Math.min(value + 1, results.length - 1));
    if (event.key === "ArrowUp") setActive((value) => Math.max(value - 1, 0));
    if (event.key === "Enter" && (query || results[active])) {
      event.preventDefault();
      if (results[active]) leave(`/locations/${locationId}/tickets/${results[active].id}`);
      else seeAll();
    }
  };

  const field = (
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
  );

  const list = searching ? (
    <div aria-busy className="flex flex-col gap-1 p-1">
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="flex items-center gap-3 px-1.5 py-2">
          <Skeleton className="size-8 shrink-0 rounded-full!" />
          <span className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-3 w-2/5" />
            <Skeleton className="h-2.5 w-3/5" />
          </span>
        </div>
      ))}
    </div>
  ) : query && results.length === 0 ? (
    <div className="flex flex-col items-center px-4 py-6 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-brand">
        <Icon name="search" className="size-4" />
      </span>
      <p className="mt-3 text-label-md wrap-anywhere">{t("noMatch", { query })}</p>
      <p className="mt-1 max-w-xs text-p-sm text-muted">{t("noMatchHint")}</p>
    </div>
  ) : (
    <>
      {!query && <p className="px-2.5 pt-1 pb-1.5 text-label-xs text-muted">{t("recent")}</p>}
      {results.map((ticket, index) => (
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
            <span className="block truncate text-p-xs text-muted">{title(ticket)}</span>
          </span>
          <span className="hidden shrink-0 text-p-xs text-muted sm:block">
            {statusLabel(ticket.currentStatus, locale)}
          </span>
        </button>
      ))}
      {query && results.length > 0 && (
        <button
          type="button"
          onClick={seeAll}
          className="mt-1 flex min-h-11 w-full cursor-pointer items-center justify-center rounded-xl text-label-sm hover:bg-subtle"
        >
          {t("seeAll")}
        </button>
      )}
    </>
  );
  const showsList = query ? answer !== null : results.length > 0;

  if (compact) {
    return (
      <>
        <button
          type="button"
          aria-label={t("search")}
          onClick={() => {
            setExpanded(true);
            fetchRecent();
          }}
          className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-subtle"
        >
          <Icon name="search" className="size-4" />
        </button>
        <Dialog open={expanded} onClose={() => setExpanded(false)} title={t("search")} variant="panel">
          {expanded && (
            <div className="flex min-h-0 flex-1 flex-col gap-2 px-4 pb-4" onKeyDown={keys}>
              {field}
              <div className="min-h-0 flex-1 overflow-y-auto">{showsList && list}</div>
            </div>
          )}
        </Dialog>
      </>
    );
  }

  return (
    <div
      ref={box}
      className="relative w-full min-w-0"
      onFocus={() => {
        setOpen(true);
        fetchRecent();
      }}
      onKeyDown={keys}
    >
      {field}
      {open && showsList && (
        <div className="absolute inset-x-0 top-full z-30 mt-2 rounded-card border border-border-strong bg-surface p-2">
          {list}
        </div>
      )}
    </div>
  );
}
