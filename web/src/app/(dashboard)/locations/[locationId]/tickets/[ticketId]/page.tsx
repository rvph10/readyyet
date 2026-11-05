import { getTranslations } from "next-intl/server";
import { ComingSoon } from "@/components/coming-soon";

export default async function TicketPage() {
  const t = await getTranslations("tickets");
  return <ComingSoon title={t("detail")} />;
}
