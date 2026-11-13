import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/ui/avatar";
import { Panel } from "@/components/ui/panel";
import { api } from "@/lib/api/client";
import { getMe } from "@/lib/me";
import { getLocation } from "../../location-data";
import { PageHeader } from "../../page-header";
import { intlLocale } from "../../tickets/ticket-views";

const COUNTS = ["created", "ready", "completed"] as const;

// ADR 0142: what a colleague did at this shop, open to the whole team, for the
// pride of it rather than to watch anyone. Only this shop's work counts.
export default async function MemberPage({ params }: PageProps<"/locations/[locationId]/members/[userId]">) {
  const [{ locationId, userId }, me, client, t, tDashboard, locale] = await Promise.all([
    params,
    getMe(),
    api(),
    getTranslations("member"),
    getTranslations("dashboard"),
    getLocale(),
  ]);
  if (!me.memberships.some(({ location }) => location.id === locationId)) notFound();
  const [{ data: member }, location] = await Promise.all([
    client.GET("/locations/{locationId}/insights/members/{userId}", { params: { path: { locationId, userId } } }),
    getLocation(locationId),
  ]);
  if (!member) notFound();

  const since = new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: "long", timeZone: location.timeZone }).format(
    new Date(member.memberSince),
  );

  return (
    <div className="flex flex-col gap-4 lg:gap-5">
      <PageHeader title={member.name} crumb={member.name} />
      {/* The name is the page's title, so the card holds what the title
          doesn't. Each count shows this month, with the total since joining
          under it, rather than a second panel of the same four. */}
      <div className="grid gap-3 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] lg:gap-4">
        <section
          className="on-pine flex flex-col items-start rounded-sheet bg-pine p-6 text-surface"
          aria-label={member.name}
        >
          <span className="rounded-full ring-4 ring-brand">
            <Avatar id={member.userId} name={member.name} src={member.avatarUrl} size="xl" />
          </span>
          <span className="mt-4 rounded-full bg-brand px-3 py-1 text-label-xs text-ink">
            {tDashboard(`roles.${member.role}`)}
          </span>
          <p className="mt-auto pt-6 text-p-sm">{t("since", { date: since })}</p>
        </section>

        <Panel as="section" padding="lg" aria-labelledby="member-month">
          <h2 id="member-month" className="text-title-h6">
            {t("thisMonth")}
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))]">
            <div className="col-span-2 flex flex-col rounded-card bg-brand p-5 md:col-span-1">
              <span className="text-label-sm">{t("counts.moved")}</span>
              <span className="mt-2 text-[4rem] leading-none font-bold tracking-tight tabular-nums">
                {member.month.moved}
              </span>
              <span className="mt-2 text-p-sm">{t("movedHint")}</span>
              <span className="mt-auto pt-3 text-p-sm font-medium">
                {t("sinceJoining", { count: member.total.moved })}
              </span>
            </div>
            {COUNTS.map((count) => (
              <div key={count} className="flex flex-col rounded-card bg-subtle p-4 last:col-span-2 md:last:col-span-1">
                <span className="text-label-sm">{t(`counts.${count}`)}</span>
                <span className="mt-2 text-[2.75rem] leading-none font-bold tracking-tight tabular-nums">
                  {member.month[count]}
                </span>
                <span className="mt-auto pt-3 text-p-sm text-muted">
                  {t("sinceJoining", { count: member.total[count] })}
                </span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
