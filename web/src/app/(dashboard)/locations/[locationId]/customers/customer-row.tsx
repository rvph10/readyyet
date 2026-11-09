import { useTranslations } from "next-intl";
import Link from "next/link";
import { PhoneNumber } from "@/components/phone-number";
import { Avatar } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icon";
import { SortHeader } from "@/components/ui/sort-header";
import type { components } from "@/lib/api/schema";
import type { Sort } from "@/lib/sort";
import { emailFails, type CustomerSort } from "./customer-views";

const GRID = "lg:grid-cols-[minmax(14rem,1fr)_minmax(0,1.2fr)_11rem_8rem] lg:gap-x-5";

export function CustomerListHeader({
  sort,
  href,
}: {
  sort: Sort<CustomerSort>;
  href: (sort: Sort<CustomerSort>) => string;
}) {
  const t = useTranslations("customers.columns");
  const header = { sort, href };
  return (
    <div className={`hidden px-7 pb-3 text-p-xs text-muted lg:grid ${GRID}`}>
      <span>
        <SortHeader {...header} column="name" label={t("customer")} />
      </span>
      <span>
        <SortHeader {...header} column="email" label={t("email")} />
      </span>
      <span>
        <SortHeader {...header} column="phone" label={t("phone")} />
      </span>
      <span>
        <SortHeader {...header} column="since" label={t("since")} first="desc" />
      </span>
    </div>
  );
}

interface Props {
  customer: components["schemas"]["CustomerDto"];
  href: string;
  // Already formatted.
  since: string;
}

// A table from 1024px, a card of the same cells under that. The whole row is
// the link, like a Ticket's.
export function CustomerRow({ customer, href, since }: Props) {
  const t = useTranslations("customers");
  const fails = emailFails(customer);
  return (
    <li
      className={`group relative grid grid-cols-[minmax(0,1fr)] gap-x-3 gap-y-1 border-t border-border px-5 py-4 transition-colors first:border-t-0 hover:bg-subtle has-focus-visible:bg-subtle lg:min-h-20 lg:items-center lg:px-7 lg:py-3 ${GRID}`}
    >
      <Link
        href={href}
        aria-label={customer.fullName}
        className="absolute inset-0 outline-ink -outline-offset-2 focus-visible:outline-2"
      />
      <div className="flex min-w-0 items-center gap-3">
        <Avatar id={customer.fullName} name={customer.fullName} src={null} className="lg:size-12! lg:text-base!" />
        <span className="min-w-0">
          <span title={customer.fullName} className="block truncate text-label-md">
            {customer.fullName}
          </span>
          <span className="block truncate text-p-xs text-muted lg:hidden">
            {customer.phone ? <PhoneNumber value={customer.phone} /> : (customer.email ?? t("noContact"))}
          </span>
        </span>
      </div>
      {customer.email ? (
        <span
          title={fails ? t("emailFailsShort") : customer.email}
          className={`min-w-0 items-center gap-2 text-p-sm ${fails ? "flex text-danger" : "hidden lg:flex"}`}
        >
          {fails && <Icon name="info-triangle" className="size-3.5 shrink-0" />}
          <span className="truncate max-lg:hidden">{customer.email}</span>
          {fails && <span className="truncate lg:hidden">{t("emailFailsShort")}</span>}
        </span>
      ) : (
        <span className="hidden text-p-sm text-muted lg:block">{t("none")}</span>
      )}
      <span className="hidden truncate text-p-sm lg:block">
        {customer.phone ? <PhoneNumber value={customer.phone} /> : <span className="text-muted">{t("none")}</span>}
      </span>
      <span className="hidden text-p-sm text-muted lg:block">{since}</span>
    </li>
  );
}
