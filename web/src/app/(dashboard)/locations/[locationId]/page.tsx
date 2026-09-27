import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
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
      <h1 className="text-2xl font-semibold">{location.name}</h1>
      <p className="text-muted">{t("comingSoon", { business: location.business.name })}</p>
    </>
  );
}
