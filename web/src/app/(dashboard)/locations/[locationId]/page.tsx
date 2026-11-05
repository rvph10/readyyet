import { getTranslations } from "next-intl/server";
import { ComingSoon } from "@/components/coming-soon";

export default async function TicketsPage() {
  const t = await getTranslations("dashboard");
  return <ComingSoon title={t("sections.tickets")} />;
}
