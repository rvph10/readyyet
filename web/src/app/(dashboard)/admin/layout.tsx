import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { StandaloneFrame } from "@/components/standalone-frame";
import { getMe } from "@/lib/me";
import { SIDEBAR_COOKIE } from "@/lib/sidebar";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("admin"))("title") };
}

// ADR 0120: the back office of ADR 0032, for the platform admin alone.
export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const [me, cookieStore, t] = await Promise.all([getMe(), cookies(), getTranslations("admin")]);
  // Not found rather than refused, so nobody else learns there's a page here.
  if (!me.platformAdmin) {
    notFound();
  }
  return (
    <div className="flex min-h-dvh flex-col">
      <StandaloneFrame
        me={me}
        collapsed={cookieStore.get(SIDEBAR_COOKIE)?.value === "collapsed"}
        title={t("title")}
        icon="layers"
        detail={t("platformAdmin")}
        nav={[{ href: "/admin", icon: "user", label: t("nav.salesPartners") }]}
        exit={{ href: "/", label: t("backToShops"), icon: "arrow-left-1" }}
      >
        {children}
      </StandaloneFrame>
    </div>
  );
}
