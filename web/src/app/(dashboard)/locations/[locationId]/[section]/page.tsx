import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { ComingSoon } from "@/components/coming-soon";
import { getMe } from "@/lib/me";
import { PageHeader } from "../page-header";
import { findSection } from "../sections";

// Each section's own page takes over from this one as it's built, a static
// route wins over this dynamic one. A section the Role can't see is a 404, like
// the API's answer for it, not a page that fails once it loads data.
export default async function SectionPage({ params }: PageProps<"/locations/[locationId]/[section]">) {
  const [{ locationId, section: slug }, { memberships }, t] = await Promise.all([
    params,
    getMe(),
    getTranslations("dashboard"),
  ]);
  const role = memberships.find(({ location }) => location.id === locationId)?.role;
  const section = role && slug && findSection(slug, role);
  if (!section) {
    notFound();
  }
  return (
    <>
      <PageHeader locationId={locationId} title={t(`sections.${section.key}`)} />
      <ComingSoon />
    </>
  );
}
