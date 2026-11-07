import { useTranslations } from "next-intl";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";

interface Props {
  title: string;
  subtitle?: string;
  backHref?: string;
}

// Every page of a Location opens with this. Search and New Ticket are in the
// top bar (ADR 0103).
export function PageHeader({ title, subtitle, backHref }: Props) {
  const tDetail = useTranslations("ticketDetail");
  return (
    <header className="flex items-center justify-between gap-6">
      <div className="flex min-w-0 flex-1 items-center gap-3 md:gap-4">
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
          <h1 title={title} className="text-title-h5 wrap-anywhere md:line-clamp-1 md:text-title-h4">
            {title}
          </h1>
          {subtitle && <p className="text-p-sm text-muted md:truncate">{subtitle}</p>}
        </div>
      </div>
    </header>
  );
}
