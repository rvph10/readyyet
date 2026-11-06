import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { buttonClass } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { getMe } from "@/lib/me";
import { groupByBusiness } from "@/lib/memberships";

// ADR 0077: only someone with a choice to make sees this. It asks every time
// rather than reopening the last Location, so a Ticket isn't created in the
// wrong Location by a counter that remembered yesterday.
export default async function ChooseLocationPage() {
  const [{ memberships }, t] = await Promise.all([getMe(), getTranslations("dashboard")]);
  if (memberships.length === 0) {
    redirect("/businesses/new");
  }
  if (memberships.length === 1) {
    redirect(`/locations/${memberships[0].location.id}`);
  }

  return (
    <>
      <h1 className="text-label-xl md:text-title-h4">{t("chooseLocation")}</h1>
      {groupByBusiness(memberships).map(({ business, memberships: group, owned }) => (
        <section key={business.id} aria-labelledby={`business-${business.id}`}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <h2 id={`business-${business.id}`} className="min-w-0 text-label-md wrap-anywhere">
              {business.name}
            </h2>
            {owned && (
              <Link href={`/businesses/${business.id}`} className={buttonClass({ variant: "link" })}>
                {t("businessSettings")}
              </Link>
            )}
          </div>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {group.map(({ role, location }) => (
              <li key={location.id}>
                <Link
                  href={`/locations/${location.id}`}
                  className="flex h-full items-center gap-3 rounded-card border border-border bg-surface p-4 transition-colors hover:bg-subtle"
                >
                  <Avatar id={business.id} name={business.name} src={business.logoUrl} shape="square" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-label-sm wrap-anywhere">{location.name}</span>
                    <span className="mt-1 block">
                      <Badge>{t(`roles.${role}`)}</Badge>
                    </span>
                  </span>
                </Link>
              </li>
            ))}
            {owned && (
              <li>
                <Link
                  href={`/businesses/${business.id}/locations/new`}
                  className="flex h-full min-h-20 items-center justify-center gap-2 rounded-2xl border border-dashed border-border-strong p-4 text-label-sm text-muted transition-colors hover:border-ink hover:text-ink"
                >
                  <Icon name="add" className="size-3.5" />
                  {t("addLocation")}
                </Link>
              </li>
            )}
          </ul>
        </section>
      ))}
    </>
  );
}
