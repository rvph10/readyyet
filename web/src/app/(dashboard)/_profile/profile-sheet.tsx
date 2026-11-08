import { getTranslations } from "next-intl/server";
import { SheetShell } from "@/components/sheet-shell";
import type { IconName } from "@/components/ui/icon";
import type { components } from "@/lib/api/schema";
import { DeleteAccountSection, LanguageSection, ProfileDetails, ShopsSection } from "./profile-sections";

type Me = components["schemas"]["MeWithMembershipsDto"];

const SECTIONS = [
  ["details", "user"],
  ["language", "globe"],
  ["shops", "home"],
  ["delete", "info-triangle"],
] as const satisfies readonly (readonly [string, IconName])[];

// ADR 0118: the User's own sheet, laid out like Settings (ADR 0100), in the
// frame of the shop or Business they came from.
export async function ProfileSheet({ me, here, section }: { me: Me; here: string; section: unknown }) {
  const t = await getTranslations("profile");
  const content = {
    details: <ProfileDetails me={me} />,
    language: <LanguageSection locale={me.locale} />,
    shops: <ShopsSection memberships={me.memberships} />,
    delete: <DeleteAccountSection here={here} />,
  };
  return (
    <SheetShell
      label={t("navLabel")}
      start={SECTIONS.find(([name]) => name === section)?.[0] ?? "details"}
      sections={SECTIONS.map(([name, icon]) => ({
        name,
        icon,
        label: t(`nav.${name}`),
        badge: name === "shops" ? String(me.memberships.length) : undefined,
        danger: name === "delete",
        content: content[name],
      }))}
    />
  );
}
