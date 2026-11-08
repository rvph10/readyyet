import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/skeleton";

// ADR 0119: the rows of a list while it loads, inside the list's own tile. Each
// is a row's height, an avatar and its two lines, then what the list shows to
// the right from 1024px.
export function RowsPlaceholder({ rows, columns = 2 }: { rows: number; columns?: number }) {
  const t = useTranslations("dashboard");
  return (
    <div aria-busy="true">
      <p className="sr-only" role="status">
        {t("loading")}
      </p>
      <ul aria-hidden="true">
        {Array.from({ length: rows }, (_, row) => (
          <li
            key={row}
            className="flex items-center gap-3 border-t border-border px-5 py-4 first:border-t-0 lg:min-h-18 lg:gap-5 lg:px-7 lg:py-3"
          >
            <Skeleton className="size-10 shrink-0 rounded-full! lg:size-12" />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-40 max-w-full" />
              <Skeleton className="h-3 w-56 max-w-full" />
            </div>
            {Array.from({ length: columns }, (_, column) => (
              <Skeleton
                key={column}
                className={`hidden lg:block ${column === 0 ? "h-8 w-28 rounded-xl!" : "h-4 w-20"}`}
              />
            ))}
          </li>
        ))}
      </ul>
    </div>
  );
}
