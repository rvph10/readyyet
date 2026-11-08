import { getTranslations } from "next-intl/server";
import { getMe } from "@/lib/me";
import { ProfileSheet } from "../../../_profile/profile-sheet";
import { PageHeader } from "../page-header";

// ADR 0118: the User's own page, in the frame of the shop they came from.
export default async function ProfilePage({ params, searchParams }: PageProps<"/locations/[locationId]/profile">) {
  const [{ locationId }, search, me, t] = await Promise.all([
    params,
    searchParams,
    getMe(),
    getTranslations("profile"),
  ]);
  return (
    <div className="fit-screen flex flex-col gap-4 lg:gap-5">
      <PageHeader title={t("title")} crumb={t("title")} />
      <ProfileSheet me={me} here={`/locations/${locationId}/profile`} section={search.section} />
    </div>
  );
}
