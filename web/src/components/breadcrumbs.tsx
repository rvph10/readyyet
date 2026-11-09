import { useTranslations } from "next-intl";
import Link from "next/link";
import { Icon } from "./ui/icon";

export interface Crumb {
  label: string;
  // Left out on the page you're on.
  href?: string;
}

// Everything under a shop or a Business, which the top bar names. A phone has
// no top bar, so this is also its way back up.
export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  const t = useTranslations("dashboard");
  return (
    <nav aria-label={t("breadcrumbs")} className="min-w-0">
      <ol className="flex min-w-0 items-center gap-1.5 text-label-sm">
        {crumbs.map(({ label, href }, index) => (
          <li key={label} className="flex min-w-0 items-center gap-1.5 last:shrink-[2]">
            {index > 0 && <Icon name="arrow-right" className="size-2 shrink-0 text-muted" />}
            {href ? (
              <Link
                href={href}
                className="flex min-h-8 min-w-0 items-center text-muted underline-offset-4 hover:text-ink hover:underline"
              >
                <span className="truncate">{label}</span>
              </Link>
            ) : (
              <span aria-current="page" className="truncate">
                {label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
