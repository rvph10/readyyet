import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { StandaloneFrame } from "@/components/standalone-frame";
import { getMe } from "@/lib/me";
import { SIDEBAR_COOKIE } from "@/lib/sidebar";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("salesPartner"))("title") };
}

// ADR 0121: the sales partner's page of ADR 0032, kept once the status is
// removed for what they're still owed (ADR 0040).
export default async function PartnerLayout({ children }: LayoutProps<"/partner">) {
  const [me, cookieStore, t] = await Promise.all([getMe(), cookies(), getTranslations("salesPartner")]);
  if (!me.salesPartnerPage) {
    notFound();
  }
  // Selling ReadyYet doesn't take a shop, so one is offered, never required.
  const hasShops = me.memberships.length > 0 || me.ownedBusinessIds.length > 0;
  return (
    <div className="flex min-h-dvh flex-col">
      <StandaloneFrame
        me={me}
        collapsed={cookieStore.get(SIDEBAR_COOKIE)?.value === "collapsed"}
        title={t("title")}
        icon="link"
        detail={t(me.salesPartner ? "role" : "formerRole")}
        nav={[{ href: "/partner", icon: "dashboard", label: t("nav") }]}
        exit={
          hasShops
            ? { href: "/", label: t("backToShops"), icon: "arrow-left-1" }
            : { href: "/businesses/new", label: t("openShop"), icon: "add" }
        }
      >
        {children}
      </StandaloneFrame>
    </div>
  );
}
