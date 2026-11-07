import { useTranslations } from "next-intl";
import Link from "next/link";
import type { Sort } from "@/lib/sort";
import { Icon } from "./icon";

interface Props<Column extends string> {
  label: string;
  column: Column;
  // What the list is sorted by now.
  sort: Sort<Column> | null;
  href: (sort: Sort<Column>) => string;
  // The way that reads best on the first click, like newest first for a date.
  first?: Sort<Column>["dir"];
}

// A link, so the server sorts: the longer lists are paged.
export function SortHeader<Column extends string>({ label, column, sort, href, first = "asc" }: Props<Column>) {
  const t = useTranslations("common");
  const active = sort?.column === column;
  const dir = active ? (sort.dir === "asc" ? "desc" : "asc") : first;
  return (
    <Link
      href={href({ column, dir })}
      scroll={false}
      aria-label={t("sortBy", { column: label })}
      className={`inline-flex max-w-full items-center gap-1.5 transition-colors hover:text-ink ${active ? "font-semibold text-ink" : ""}`}
    >
      <span className="truncate">{label}</span>
      <Icon
        name={active ? (sort.dir === "asc" ? "arrow-up-1" : "arrow-down-1") : "sort-vertical"}
        className={`size-2.5 shrink-0 ${active ? "" : "opacity-50"}`}
      />
    </Link>
  );
}
