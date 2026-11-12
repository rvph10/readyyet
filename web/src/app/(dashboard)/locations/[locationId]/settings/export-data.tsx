import { getTranslations } from "next-intl/server";
import { Banner } from "@/components/ui/banner";
import { buttonClass } from "@/components/ui/button";
import { Icon, type IconName } from "@/components/ui/icon";
import { SectionHeading } from "./section-form";

// What the archive holds, in the order of its files.
const CONTENTS: { key: "customers" | "tickets" | "history" | "feedback" | "photos" | "team"; icon: IconName }[] = [
  { key: "customers", icon: "user" },
  { key: "tickets", icon: "tag" },
  { key: "history", icon: "time" },
  { key: "feedback", icon: "comment" },
  { key: "photos", icon: "camera" },
  { key: "team", icon: "id-card" },
];

// ADR 0129: the Owner's data, theirs to keep or take elsewhere, listed before
// it's downloaded as the terms promise (Data Act art. 26).
export async function ExportData({ locationId, failed }: { locationId: string; failed: boolean }) {
  const t = await getTranslations("settings.export");
  return (
    <section className="max-w-3xl pb-8">
      <SectionHeading title={t("title")} hint={t("hint")} />
      {failed && (
        <div className="mb-4">
          <Banner tone="error">{t("failed")}</Banner>
        </div>
      )}
      <div className="overflow-clip rounded-3xl border border-border">
        <ul className="grid gap-x-6 gap-y-4 p-5 sm:grid-cols-2 lg:p-6">
          {CONTENTS.map(({ key, icon }) => (
            <li key={key} className="flex gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-pine-subtle text-pine">
                <Icon name={icon} className="size-3.5" />
              </span>
              <span className="min-w-0">
                <span className="block text-label-sm">{t(`contents.${key}.title`)}</span>
                <span className="block text-p-xs text-muted">{t(`contents.${key}.detail`)}</span>
              </span>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-subtle px-5 py-4 lg:px-6">
          <p className="min-w-0 flex-1 basis-56 text-p-sm">{t("format")}</p>
          {/* A download, not a page: a plain link, never prefetched. */}
          <a href={`/locations/${locationId}/export`} className={buttonClass()}>
            {t("download")}
          </a>
        </div>
      </div>
    </section>
  );
}
