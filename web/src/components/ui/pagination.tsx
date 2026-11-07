import { useTranslations } from "next-intl";
import Link from "next/link";
import { lastPage, pageNumbers } from "@/lib/pagination";
import { Icon, type IconName } from "./icon";

const STEP = "flex size-11 shrink-0 items-center justify-center rounded-full border lg:size-10";

function Step({ href, icon, label }: { href: string | null; icon: IconName; label: string }) {
  if (!href) {
    return (
      <span aria-hidden="true" className={`${STEP} border-border text-border-strong`}>
        <Icon name={icon} className="size-3" />
      </span>
    );
  }
  return (
    <Link
      href={href}
      aria-label={label}
      className={`${STEP} border-border-strong transition-[background-color,scale] hover:bg-subtle active:scale-[0.97]`}
    >
      <Icon name={icon} className="size-3" />
    </Link>
  );
}

interface Props {
  page: number;
  pageSize: number;
  total: number;
  // A plain function, so this stays rendered on the server, in a page.
  href: (page: number) => string;
  className?: string;
}

// ADR 0098: how many there are, then the pages. Each page is a link, so it's in
// the URL and survives a reload. The numbers need more room than a phone or a
// narrow tile has, which get "Page 2 of 9" between the arrows, decided by the
// room here rather than the screen's width.
export function Pagination({ page, pageSize, total, href, className }: Props) {
  const t = useTranslations("common.pagination");
  const last = lastPage(total, pageSize);
  return (
    <div className={`@container ${className ?? ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="text-p-sm text-muted">
          {t("range", {
            from: (page - 1) * pageSize + 1,
            to: Math.min(page * pageSize, total),
            total,
          })}
        </p>
        {last > 1 && (
          <nav aria-label={t("label")} className="flex items-center gap-1">
            <Step href={page > 1 ? href(page - 1) : null} icon="arrow-left-1" label={t("previous")} />
            <p className="px-3 text-label-sm whitespace-nowrap @xl:hidden">{t("page", { page, last })}</p>
            <ul className="hidden items-center gap-1 @xl:flex">
              {pageNumbers(page, last).map((number, index) => (
                <li key={number === "gap" ? `gap-${index}` : number}>
                  {number === "gap" ? (
                    <span className="flex size-10 items-center justify-center text-label-sm text-muted">…</span>
                  ) : (
                    <Link
                      href={href(number)}
                      aria-current={number === page ? "page" : undefined}
                      className={`flex h-10 min-w-10 items-center justify-center rounded-full px-2 text-label-sm transition-colors ${
                        number === page ? "bg-pine text-surface" : "hover:bg-subtle"
                      }`}
                    >
                      {number}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
            <Step href={page < last ? href(page + 1) : null} icon="arrow-right" label={t("next")} />
          </nav>
        )}
      </div>
    </div>
  );
}
