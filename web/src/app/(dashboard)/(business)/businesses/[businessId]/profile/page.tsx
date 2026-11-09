import { getTranslations } from "next-intl/server";
import { getMe } from "@/lib/me";
import { ProfileSheet } from "../../../../_profile/profile-sheet";
import { BusinessHeader } from "../business-header";

// ADR 0118: the User's own page, in the frame of the Business they came from.
export default async function ProfilePage({ params, searchParams }: PageProps<"/businesses/[businessId]/profile">) {
  const [{ businessId }, search, me, t] = await Promise.all([
    params,
    searchParams,
    getMe(),
    getTranslations("profile"),
  ]);
  return (
    <div className="fit-screen flex flex-col gap-4 lg:gap-5">
      <BusinessHeader title={t("title")} />
      <ProfileSheet me={me} here={`/businesses/${businessId}/profile`} section={search.section} />
    </div>
  );
}
