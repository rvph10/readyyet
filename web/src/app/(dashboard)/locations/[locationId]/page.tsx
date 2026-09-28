import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/ui/empty-state";
import { Panel } from "@/components/ui/panel";
import { getMe } from "@/lib/me";

export default async function LocationPage({ params }: PageProps<"/locations/[locationId]">) {
  const { locationId } = await params;
  const [me, t] = await Promise.all([getMe(), getTranslations("dashboard")]);
  const membership = me.memberships.find(({ location }) => location.id === locationId);
  if (!membership) {
    notFound();
  }
  const { location } = membership;
  return (
    <>
      <div>
        <h1 className="font-display text-title-h4">{location.name}</h1>
        <p className="text-p-md text-muted">{location.business.name}</p>
      </div>
      <Panel padding="none">
        <EmptyState icon="inbox" title={t("comingSoonTitle")} description={t("comingSoon")} />
      </Panel>
    </>
  );
}
