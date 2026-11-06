import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { EmptyState } from "./ui/empty-state";
import { Panel } from "./ui/panel";

// Where a page of the dashboard isn't built yet, so the navigation around it
// can be used, and an email's link leads somewhere, until it is.
export function ComingSoon({ title, children }: { title?: string; children?: ReactNode }) {
  const t = useTranslations("dashboard");
  return (
    <>
      {title && <h1 className="text-title-h5 wrap-anywhere md:text-title-h4">{title}</h1>}
      <Panel padding="none" className="flex flex-1 flex-col">
        <EmptyState illustration="daily" title={t("comingSoonTitle")} description={t("comingSoon")} action={children} />
      </Panel>
    </>
  );
}
