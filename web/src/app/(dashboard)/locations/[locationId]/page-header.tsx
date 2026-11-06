"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { HeaderSearch } from "./header-search";
import { useLocationActions } from "./location-actions";

interface Props {
  locationId: string;
  title: string;
  subtitle?: string;
  backHref?: string;
}

// Every page of a Location opens with this: its title, and from a tablet up
// the search and New Ticket, which a phone keeps in its bars.
export function PageHeader({ locationId, title, subtitle, backHref }: Props) {
  const t = useTranslations("tickets");
  const tDetail = useTranslations("ticketDetail");
  const { newTicket } = useLocationActions();
  return (
    <header className="flex items-center justify-between gap-6">
      <div className="flex min-w-0 items-center gap-3 md:gap-4">
        {backHref && (
          <Link
            href={backHref}
            aria-label={tDetail("back")}
            className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border-strong bg-surface transition-[background-color,scale] hover:bg-subtle active:scale-[0.97] md:size-12"
          >
            <Icon name="arrow-left-1" className="size-3.5" />
          </Link>
        )}
        <div className="min-w-0">
          <h1 className="text-title-h5 wrap-anywhere md:line-clamp-1 md:text-title-h4">{title}</h1>
          {subtitle && <p className="text-p-sm text-muted md:truncate">{subtitle}</p>}
        </div>
      </div>
      <div className="hidden min-w-0 flex-1 items-center justify-end gap-3 md:flex">
        <HeaderSearch locationId={locationId} />
        <Button onClick={newTicket} className="shrink-0">
          <Icon name="add" className="size-3.5 text-brand" />
          {t("new")}
        </Button>
      </div>
    </header>
  );
}
